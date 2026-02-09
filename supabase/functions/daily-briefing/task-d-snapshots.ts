// @ts-nocheck
// ============================================================================
// Task D: 포트폴리오 일별 스냅샷 (Portfolio Daily Snapshots)
// Gemini 미사용 — DB 읽기/쓰기만 (비용 0원, ~2-5초)
//
// [3층 구조]
// 1층: 유저별 스냅샷 → portfolio_snapshots 테이블
// 2층: 구간별 집계 → bracket_performance 테이블
// 3층: 등급별 배분 통계 → tier_allocation_stats 테이블
//
// [자산 구간 (Bracket)]
// - bracket_0: 1억 미만
// - bracket_1: 1~3억
// - bracket_2: 3~5억
// - bracket_3: 5~10억
// - bracket_4: 10~30억
// - bracket_5: 30억 이상
//
// [티어 (Tier)]
// - SILVER: 1억 미만
// - GOLD: 1~5억
// - PLATINUM: 5~10억
// - DIAMOND: 10억 이상
//
// [보정 수익률 계산]
// - (오늘 자산 - 어제 자산 - 순입금) / 어제 자산 × 100
// - 비정상 수익률 클램프: -50% ~ +50%
// ============================================================================

import {
  supabase,
  getAssetBracket,
  getTier,
} from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface SnapshotResult {
  totalUsers: number;
  snapshotsCreated: number;
  bracketsUpdated: number;
}

// ============================================================================
// Task D: 포트폴리오 스냅샷 기록
// ============================================================================

/**
 * Task D: 모든 유저의 포트폴리오 스냅샷 기록
 *
 * [처리 흐름]
 * 1. 유저별 포트폴리오 집계 (total_assets, holdings_count, breakdown)
 * 2. 전일 스냅샷 조회 → 입출금 보정 수익률 계산
 * 3. portfolio_snapshots UPSERT (배치 50개씩)
 * 4. bracket_performance 집계 (구간별 평균/중위수 수익률, panic score)
 * 5. tier_allocation_stats 집계 (등급별 자산 배분 비중)
 *
 * [보정 수익률 계산]
 * - 순수 투자 수익만 측정 (입출금 영향 제거)
 * - dailyReturn = (오늘 - 어제 - 순입금) / 어제 × 100
 * - 클램프: -50% ~ +50% (비정상 값 방지)
 *
 * [에러 처리]
 * - 포트폴리오 없으면 스킵 (0명)
 * - 개별 배치 실패해도 다음 배치 계속 진행
 *
 * @returns { totalUsers, snapshotsCreated, bracketsUpdated }
 */
export async function takePortfolioSnapshots(): Promise<SnapshotResult> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  console.log('[Task D] 포트폴리오 스냅샷 시작...');

  // 1. 모든 포트폴리오 데이터 조회 (Service Role로 RLS 우회)
  const { data: allPortfolios, error: portError } = await supabase
    .from('portfolios')
    .select('user_id, ticker, quantity, current_price, current_value, asset_type');

  if (portError) {
    console.error('[Task D] 포트폴리오 조회 실패:', portError);
    throw portError;
  }

  if (!allPortfolios || allPortfolios.length === 0) {
    console.log('[Task D] 포트폴리오 데이터 없음 — 스킵');
    return { totalUsers: 0, snapshotsCreated: 0, bracketsUpdated: 0 };
  }

  // 2. 유저별 집계
  const userMap = new Map<string, {
    totalAssets: number;
    holdingsCount: number;
    breakdown: Record<string, number>;
    topHoldings: { ticker: string; value: number }[];
  }>();

  for (const item of allPortfolios) {
    const value = (item.quantity && item.current_price)
      ? item.quantity * item.current_price
      : (item.current_value || 0);

    if (!userMap.has(item.user_id)) {
      userMap.set(item.user_id, {
        totalAssets: 0,
        holdingsCount: 0,
        breakdown: {},
        topHoldings: [],
      });
    }

    const user = userMap.get(item.user_id)!;
    user.totalAssets += value;
    user.holdingsCount += 1;

    // 자산 유형별 집계
    const assetType = item.asset_type || 'other';
    user.breakdown[assetType] = (user.breakdown[assetType] || 0) + value;

    // 상위 종목 기록
    user.topHoldings.push({ ticker: item.ticker || 'unknown', value });
  }

  // 3. 어제 스냅샷 조회 (수익률 계산용)
  const userIds = Array.from(userMap.keys());
  const { data: yesterdaySnapshots } = await supabase
    .from('portfolio_snapshots')
    .select('user_id, total_assets')
    .eq('snapshot_date', yesterday)
    .in('user_id', userIds);

  const yesterdayMap = new Map<string, number>();
  (yesterdaySnapshots || []).forEach((s: { user_id: string; total_assets: number }) => {
    yesterdayMap.set(s.user_id, s.total_assets);
  });

  // 4. 오늘 입출금 이벤트 집계
  const { data: todayDeposits } = await supabase
    .from('deposit_events')
    .select('user_id, event_type, amount')
    .eq('event_date', today)
    .in('user_id', userIds);

  const netDepositMap = new Map<string, number>();
  (todayDeposits || []).forEach((d: { user_id: string; event_type: string; amount: number }) => {
    const current = netDepositMap.get(d.user_id) || 0;
    const delta = d.event_type === 'deposit' ? d.amount : -d.amount;
    netDepositMap.set(d.user_id, current + delta);
  });

  // 5. 스냅샷 행 생성
  const snapshotRows = [];
  for (const [userId, data] of userMap) {
    const total = data.totalAssets;
    const yesterdayTotal = yesterdayMap.get(userId) || 0;
    const netDeposit = netDepositMap.get(userId) || 0;

    // 보정 수익률 = (오늘 - 어제 - 순입금) / 어제 × 100
    let dailyReturn = 0;
    if (yesterdayTotal > 0) {
      dailyReturn = ((total - yesterdayTotal - netDeposit) / yesterdayTotal) * 100;
      // 비정상 수익률 클램프 (-50% ~ +50%)
      dailyReturn = Math.max(-50, Math.min(50, dailyReturn));
    }

    // 상위 5개 종목 (비율 포함)
    const topHoldings = data.topHoldings
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(h => ({
        ticker: h.ticker,
        value: h.value,
        weight: total > 0 ? Math.round((h.value / total) * 1000) / 10 : 0,
      }));

    snapshotRows.push({
      user_id: userId,
      snapshot_date: today,
      total_assets: total,
      tier: getTier(total),
      bracket: getAssetBracket(total),
      asset_breakdown: { ...data.breakdown, top_holdings: topHoldings },
      net_deposit_since_last: netDeposit,
      daily_return_rate: Math.round(dailyReturn * 10000) / 10000,
      holdings_count: data.holdingsCount,
    });
  }

  // 6. UPSERT (배치)
  const BATCH_SIZE = 50;
  let snapshotsCreated = 0;

  for (let i = 0; i < snapshotRows.length; i += BATCH_SIZE) {
    const batch = snapshotRows.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from('portfolio_snapshots')
      .upsert(batch, { onConflict: 'user_id,snapshot_date' });

    if (upsertError) {
      console.error(`[Task D] 스냅샷 UPSERT 실패 (batch ${i}):`, upsertError);
    } else {
      snapshotsCreated += batch.length;
    }
  }

  console.log(`[Task D] 스냅샷 ${snapshotsCreated}/${userMap.size}명 저장 완료`);

  // 7. 구간별 통계 집계 (bracket_performance)
  const bracketStats = new Map<string, number[]>();

  for (const row of snapshotRows) {
    if (!bracketStats.has(row.bracket)) {
      bracketStats.set(row.bracket, []);
    }
    bracketStats.get(row.bracket)!.push(row.daily_return_rate);
  }

  // 7-1. 어제 스냅샷에서 panic_shield_score 조회 (유저가 앱에서 저장한 값)
  const { data: yesterdayPanicScores } = await supabase
    .from('portfolio_snapshots')
    .select('bracket, panic_shield_score')
    .eq('snapshot_date', yesterday)
    .not('panic_shield_score', 'is', null);

  // bracket별 panic score 배열 구성
  const bracketPanicScores = new Map<string, number[]>();
  (yesterdayPanicScores || []).forEach((row: { bracket: string; panic_shield_score: number }) => {
    if (!bracketPanicScores.has(row.bracket)) {
      bracketPanicScores.set(row.bracket, []);
    }
    bracketPanicScores.get(row.bracket)!.push(row.panic_shield_score);
  });

  const bracketRows = [];
  for (const [bracket, returns] of bracketStats) {
    if (returns.length === 0) continue;

    const sorted = [...returns].sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const top10Idx = Math.max(0, Math.floor(sorted.length * 0.9));
    const bottom10Idx = Math.floor(sorted.length * 0.1);

    // Panic score 집계 (어제 데이터 기반)
    const panicScores = bracketPanicScores.get(bracket) || [];
    const panicSorted = [...panicScores].sort((a, b) => a - b);
    const avgPanic = panicSorted.length > 0
      ? Math.round((panicSorted.reduce((s, v) => s + v, 0) / panicSorted.length) * 100) / 100
      : null;
    const medianPanic = panicSorted.length > 0
      ? panicSorted[Math.floor(panicSorted.length / 2)]
      : null;

    bracketRows.push({
      stat_date: today,
      bracket,
      user_count: sorted.length,
      avg_return_rate: Math.round(avg * 10000) / 10000,
      median_return_rate: Math.round(median * 10000) / 10000,
      top_10_return_rate: Math.round((sorted[top10Idx] || 0) * 10000) / 10000,
      bottom_10_return_rate: Math.round((sorted[bottom10Idx] || 0) * 10000) / 10000,
      avg_panic_score: avgPanic,
      median_panic_score: medianPanic,
      panic_sample_count: panicSorted.length,
    });
  }

  if (bracketRows.length > 0) {
    const { error: bracketError } = await supabase
      .from('bracket_performance')
      .upsert(bracketRows, { onConflict: 'stat_date,bracket' });

    if (bracketError) {
      console.error('[Task D] bracket_performance UPSERT 실패:', bracketError);
    }
  }

  console.log(`[Task D] 구간별 통계 ${bracketRows.length}개 구간 저장 완료`);

  // 8. 등급별 자산 배분 통계 (tier_allocation_stats)
  // 자산 유형을 표준 카테고리로 매핑
  const normalizeAssetType = (type: string): string => {
    const t = (type || '').toLowerCase();
    if (['stock', 'stocks', '주식', 'us_stock', 'kr_stock', 'etf'].includes(t)) return 'stock';
    if (['crypto', 'cryptocurrency', '암호화폐', '코인'].includes(t)) return 'crypto';
    if (['realestate', 'real_estate', '부동산'].includes(t)) return 'realestate';
    if (['cash', '현금', 'deposit', '예금'].includes(t)) return 'cash';
    return 'other';
  };

  // 등급별 유저 배분 데이터 수집
  const tierAllocMap = new Map<string, {
    users: { stockW: number; cryptoW: number; realestateW: number; cashW: number; otherW: number; btcW: number }[];
    tickerCounts: Map<string, { count: number; totalWeight: number }>;
  }>();

  for (const [userId, data] of userMap) {
    const total = data.totalAssets;
    if (total <= 0) continue;

    const tier = getTier(total);

    if (!tierAllocMap.has(tier)) {
      tierAllocMap.set(tier, { users: [], tickerCounts: new Map() });
    }
    const tierData = tierAllocMap.get(tier)!;

    // 표준 카테고리별 합계 계산
    const catSums: Record<string, number> = { stock: 0, crypto: 0, realestate: 0, cash: 0, other: 0 };
    for (const [assetType, amount] of Object.entries(data.breakdown)) {
      const cat = normalizeAssetType(assetType);
      catSums[cat] = (catSums[cat] || 0) + (amount as number);
    }

    // 비중 (%) 계산
    tierData.users.push({
      stockW: (catSums.stock / total) * 100,
      cryptoW: (catSums.crypto / total) * 100,
      realestateW: (catSums.realestate / total) * 100,
      cashW: (catSums.cash / total) * 100,
      otherW: (catSums.other / total) * 100,
      btcW: 0, // 아래에서 BTC 별도 계산
    });

    // BTC 비중 별도 계산
    const btcItem = data.topHoldings.find(h =>
      h.ticker && ['BTC', 'BTC-USD', 'bitcoin'].includes(h.ticker.toUpperCase())
    );
    if (btcItem) {
      tierData.users[tierData.users.length - 1].btcW = (btcItem.value / total) * 100;
    }

    // 인기 종목 카운트
    for (const holding of data.topHoldings) {
      if (!holding.ticker) continue;
      const existing = tierData.tickerCounts.get(holding.ticker) || { count: 0, totalWeight: 0 };
      existing.count += 1;
      existing.totalWeight += total > 0 ? (holding.value / total) * 100 : 0;
      tierData.tickerCounts.set(holding.ticker, existing);
    }
  }

  // 등급별 평균 계산 및 UPSERT
  const tierAllocRows = [];
  for (const [tier, data] of tierAllocMap) {
    const n = data.users.length;
    if (n === 0) continue;

    const avg = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100;

    // 인기 종목 TOP 5
    const topHoldings = Array.from(data.tickerCounts.entries())
      .map(([ticker, stats]) => ({
        ticker,
        holders: stats.count,
        avg_weight: Math.round((stats.totalWeight / stats.count) * 100) / 100,
      }))
      .sort((a, b) => b.holders - a.holders)
      .slice(0, 5);

    tierAllocRows.push({
      stat_date: today,
      tier,
      avg_stock_weight: avg(data.users.map(u => u.stockW)),
      avg_crypto_weight: avg(data.users.map(u => u.cryptoW)),
      avg_realestate_weight: avg(data.users.map(u => u.realestateW)),
      avg_cash_weight: avg(data.users.map(u => u.cashW)),
      avg_other_weight: avg(data.users.map(u => u.otherW)),
      avg_btc_weight: avg(data.users.map(u => u.btcW)),
      top_holdings: topHoldings,
      user_count: n,
    });
  }

  if (tierAllocRows.length > 0) {
    const { error: allocError } = await supabase
      .from('tier_allocation_stats')
      .upsert(tierAllocRows, { onConflict: 'stat_date,tier' });

    if (allocError) {
      console.error('[Task D] tier_allocation_stats UPSERT 실패:', allocError);
    }
  }

  console.log(`[Task D] 등급별 배분 통계 ${tierAllocRows.length}개 등급 저장 완료`);

  return {
    totalUsers: userMap.size,
    snapshotsCreated,
    bracketsUpdated: bracketRows.length,
  };
}
