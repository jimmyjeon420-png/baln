// @ts-nocheck
// ============================================================================
// Task G: 맥락 카드 생성 (Context Card Generation)
// baln의 킬링 피처 — "오늘 내 자산이 왜 이렇게 움직였는지" 5분 안에 이해
//
// G-1: Gemini로 4겹 맥락 분석 (역사/거시경제/기관행동/시장분위기)
// G-2: 사용자별 포트폴리오 영향도 계산 (DB only, 비용 0원)
//
// [4겹 레이어]
// 1. 역사적 맥락: "2008년 금융위기 때도 이런 패턴이 있었고..."
// 2. 거시경제 체인: ["CPI 발표", "금리 인상 우려", "기술주 하락"]
// 3. 기관 행동: "외국인 3일 연속 순매도 (리밸런싱 시즌)" [Premium]
// 4. 포트폴리오 영향: "당신의 포트폴리오는 -1.2% 영향" [Premium]
// ============================================================================

import {
  supabase,
  callGeminiWithSearch,
  cleanJsonResponse,
  logTaskResult,
} from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ContextCardData {
  headline: string;
  historical_context: string;
  macro_chain: string[];
  institutional_behavior: string;
  sentiment: 'calm' | 'caution' | 'alert';
}

export interface ContextCardResult {
  contextCardId: string;
  sentiment: string;
  usersCalculated: number;
  avgImpact: number;
}

// ============================================================================
// G-1: 맥락 카드 생성 (Gemini + Google Search)
// ============================================================================

/**
 * Task G-1: 오늘의 맥락 카드 생성
 * Gemini + Google Search로 시장 맥락 4겹 분석
 *
 * [흐름]
 * 1. Gemini에게 4겹 분석 요청 (역사/거시경제/기관행동/심리)
 * 2. Google Search로 최신 데이터 검색 (VIX, 외국인 매매, 국채 금리 등)
 * 3. context_cards 테이블에 UPSERT (date가 Primary Key)
 *
 * @returns { contextCardId, cardData }
 */
async function generateContextCard(): Promise<{
  contextCardId: string;
  cardData: ContextCardData;
}> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const todayDate = today.toISOString().split('T')[0];

  // Task A 결과 참조 (이미 실행 완료 → DB에 저장됨)
  let macroContext = '';
  try {
    const { data: macroData } = await supabase
      .from('daily_market_insights')
      .select('macro_summary, bitcoin_analysis, cfo_weather, vix_level, market_sentiment')
      .eq('date', todayDate)
      .single();

    if (macroData) {
      const highlights = macroData.macro_summary?.highlights || [];
      const vix = macroData.vix_level;
      const btcScore = macroData.bitcoin_analysis?.score;
      macroContext = `
**[참고: Task A 거시경제 분석 결과 (이미 수집된 데이터)]**
- 시장 센티먼트: ${macroData.market_sentiment || 'N/A'}
- VIX: ${vix || 'N/A'}
- 비트코인 점수: ${btcScore || 'N/A'}/100
- 주요 이슈: ${highlights.slice(0, 3).join(' / ') || '없음'}
→ 이 데이터를 참고하여 더 정확한 맥락 카드를 작성하세요.
`;
      console.log(`[Task G-1] Task A 결과 참조 성공 (VIX: ${vix}, Sentiment: ${macroData.market_sentiment})`);
    }
  } catch (e) {
    console.log('[Task G-1] Task A 결과 참조 실패 (무시) — Google Search로 직접 검색');
  }

  const prompt = `당신은 baln(발른) 앱의 맥락 카드 AI입니다.
오늘(${dateStr}) 시장 상황을 4가지 관점으로 분석하여, 한국 개인투자자가 "오늘 내 자산이 왜 이렇게 움직였는지" 5분 안에 이해할 수 있도록 설명하세요.
${macroContext}
[핵심 원칙]
- "안심을 판다, 불안을 팔지 않는다" — 하락장에서도 공포가 아닌 맥락을 제공한다.
- 쉬운 한국어로 작성한다. 전문 용어 사용 시 괄호 안에 간단한 설명을 추가한다.
- 과거 사례를 들 때는 "그때도 회복했다"는 안심 메시지를 포함한다.

[Google Search 검색]
- "S&P 500 today", "KOSPI today", "VIX today"
- "외국인 순매수 순매도", "기관 투자자 동향"
- "미국 경제지표 발표", "한국 경제 뉴스 오늘"

[4겹 분석 레이어]
1. 역사적 맥락: 과거 유사한 패턴과 이후 흐름 (구체적 시기와 회복 기간 포함, 2~3문장)
2. 거시경제 체인: 오늘 시장을 움직인 이벤트의 인과관계 (배열, 4~6단계)
3. 기관 행동: 외국인/기관 투자자 동향과 그 의미 (2~3문장)
4. 시장 분위기: calm(VIX 15 이하) / caution(VIX 15~25) / alert(VIX 25+)

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운, 코드블록 금지.]
{
  "headline": "시장 핵심 한 줄 (20자 이내)",
  "historical_context": "2020년 3월 코로나 급락 때도 S&P 500이 한 달 만에 34% 하락했지만, 5개월 만에 전고점을 회복했습니다. 단기 조정은 장기 투자자에게 오히려 매수 기회가 되는 경우가 많습니다.",
  "macro_chain": ["미국 CPI 예상 상회", "금리 인하 기대 후퇴", "기술주 차익 실현", "코스피 연동 하락"],
  "institutional_behavior": "외국인이 3거래일 연속 순매도 중이지만, 이는 분기말 리밸런싱(자산 비율 재조정)의 일환으로 보입니다. 패닉 매도가 아니라 정기적인 포트폴리오 조정입니다.",
  "sentiment": "caution"
}
`;

  console.log('[Task G-1] 맥락 카드 생성 시작...');
  let parsed: ContextCardData;
  try {
    const responseText = await callGeminiWithSearch(prompt);
    const cleanJson = cleanJsonResponse(responseText);
    parsed = JSON.parse(cleanJson);
  } catch (parseErr) {
    console.error('[Task G-1] Gemini 응답 파싱 실패 — 기본값 사용:', parseErr);
    parsed = {
      headline: '시장 분석 업데이트 중',
      historical_context: '시장 데이터를 불러오는 중입니다. 잠시 후 다시 확인해주세요. 장기적 관점에서 일시적 데이터 지연은 투자 판단에 영향을 주지 않습니다.',
      macro_chain: ['데이터 수집 중'],
      institutional_behavior: '기관 투자자 동향 데이터를 수집하고 있습니다.',
      sentiment: 'calm' as const,
    };
  }

  // 필수 필드 검증 및 기본값 보장
  if (!parsed.headline || typeof parsed.headline !== 'string') {
    parsed.headline = '오늘의 시장 분석';
  }
  if (!Array.isArray(parsed.macro_chain) || parsed.macro_chain.length === 0) {
    parsed.macro_chain = ['시장 데이터 수집 중'];
  }
  if (!['calm', 'caution', 'alert'].includes(parsed.sentiment)) {
    parsed.sentiment = 'calm';
  }

  // context_cards 테이블에 UPSERT (date가 Primary Key)
  // todayDate는 line 63에서 이미 선언됨 — 중복 선언 제거 (BOOT_ERROR 원인)

  const { data: insertedCard, error: upsertError } = await supabase
    .from('context_cards')
    .upsert(
      {
        date: todayDate,
        headline: parsed.headline || '오늘의 시장 분석',
        historical_context: parsed.historical_context || '',
        macro_chain: parsed.macro_chain || [],
        institutional_behavior: parsed.institutional_behavior || '',
        sentiment: parsed.sentiment || 'calm',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    )
    .select('id')
    .single();

  if (upsertError) {
    console.error('[Task G-1] context_cards UPSERT 실패:', upsertError);
    throw upsertError;
  }

  const contextCardId = insertedCard?.id || '';
  console.log(`[Task G-1] 맥락 카드 생성 완료 (ID: ${contextCardId})`);

  return {
    contextCardId,
    cardData: parsed,
  };
}

// ============================================================================
// G-2: 사용자별 포트폴리오 영향도 계산 (DB only)
// ============================================================================

/**
 * Task G-2: 사용자별 포트폴리오 영향도 계산
 * Gemini 미사용 — DB 읽기/쓰기만 (비용 0원)
 *
 * [로직]
 * 1. 모든 유저의 portfolios 조회
 * 2. stock_quant_reports에서 오늘 종목별 변동 데이터 참조
 * 3. 유저별 가중평균 영향도 계산 (-10% ~ +10%)
 * 4. user_context_impacts 테이블에 UPSERT
 *
 * [계산 방식]
 * - valuation_score (0~100) → 영향도 (-10 ~ +10)
 * - score 50 (중립) → 0%
 * - score 0 (최악) → -10%
 * - score 100 (최고) → +10%
 * - 포트폴리오 가중평균으로 유저별 영향도 계산
 *
 * @param contextCardId - 맥락 카드 ID (G-1에서 생성)
 * @returns { usersCalculated, avgImpact }
 */
async function calculateUserImpacts(contextCardId: string): Promise<{
  usersCalculated: number;
  avgImpact: number;
}> {
  console.log('[Task G-2] 사용자별 영향도 계산 시작...');
  const today = new Date().toISOString().split('T')[0];

  // 1. 모든 포트폴리오 조회
  const { data: allPortfolios, error: portError } = await supabase
    .from('portfolios')
    .select('user_id, ticker, quantity, current_value, asset_type');

  if (portError || !allPortfolios || allPortfolios.length === 0) {
    console.log('[Task G-2] 포트폴리오 데이터 없음 — 스킵');
    return { usersCalculated: 0, avgImpact: 0 };
  }

  // 2. 오늘의 종목별 변동 데이터 조회 (stock_quant_reports)
  // Task B가 병렬 실행 중이므로 데이터가 없을 수 있음 → 없으면 0% 영향도로 처리
  const { data: stockReports } = await supabase
    .from('stock_quant_reports')
    .select('ticker, valuation_score, signal')
    .eq('date', today);

  const tickerImpactMap = new Map<string, number>();

  if (stockReports && stockReports.length > 0) {
    // valuation_score 기반 영향도 계산
    // score 0~100 → 영향도 -10% ~ +10%
    // score 50(중립) → 0%, score 0(최악) → -10%, score 100(최고) → +10%
    for (const report of stockReports) {
      const score = report.valuation_score ?? 50;
      const impact = ((score - 50) / 50) * 10; // -10 ~ +10
      tickerImpactMap.set(report.ticker, impact);
    }
    console.log(`[Task G-2] 종목 변동 데이터 ${stockReports.length}건 참조`);
  } else {
    console.log('[Task G-2] stock_quant_reports 데이터 없음 → 영향도 0%로 계산');
  }

  // 3. 유저별 가중평균 영향도 계산
  const userImpactMap = new Map<string, { totalValue: number; weightedImpact: number }>();

  for (const item of allPortfolios) {
    const value = item.current_value || 0;
    if (value <= 0) continue;

    // 부동산 등 RE_ 자산은 제외 (주식/ETF만 영향도 계산)
    if (item.ticker?.startsWith('RE_')) continue;

    const impact = tickerImpactMap.get(item.ticker) || 0;

    if (!userImpactMap.has(item.user_id)) {
      userImpactMap.set(item.user_id, { totalValue: 0, weightedImpact: 0 });
    }

    const userData = userImpactMap.get(item.user_id)!;
    userData.totalValue += value;
    userData.weightedImpact += value * impact;
  }

  // 4. user_context_impacts UPSERT (배치)
  const impactRows = [];
  let totalImpact = 0;

  for (const [userId, data] of userImpactMap) {
    const avgImpact = data.totalValue > 0 ? data.weightedImpact / data.totalValue : 0;
    // 영향도 클램프 (-10 ~ +10)
    const clampedImpact = Math.max(-10, Math.min(10, avgImpact));

    impactRows.push({
      user_id: userId,
      context_card_id: contextCardId,
      portfolio_impact_pct: Math.round(clampedImpact * 100) / 100,
      calculated_at: new Date().toISOString(),
    });

    totalImpact += clampedImpact;
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < impactRows.length; i += BATCH_SIZE) {
    const batch = impactRows.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from('user_context_impacts')
      .upsert(batch, { onConflict: 'user_id,context_card_id' });

    if (upsertError) {
      console.error(`[Task G-2] user_context_impacts UPSERT 실패 (batch ${i}):`, upsertError);
    }
  }

  const avgImpact = impactRows.length > 0
    ? Math.round((totalImpact / impactRows.length) * 100) / 100
    : 0;

  console.log(`[Task G-2] 영향도 계산 완료: ${impactRows.length}명, 평균 ${avgImpact}%`);

  return {
    usersCalculated: impactRows.length,
    avgImpact,
  };
}

// ============================================================================
// Task G 통합 실행
// ============================================================================

/**
 * Task G 메인 함수: G-1(맥락 카드) → G-2(영향도 계산) 순차 실행
 *
 * [사용처]
 * - index.ts의 Promise.allSettled()에서 호출
 * - 매일 07:00 자동 실행 (cron)
 *
 * @returns { contextCardId, sentiment, usersCalculated, avgImpact }
 */
export async function runContextCardGeneration(): Promise<ContextCardResult> {
  const startTime = Date.now();

  try {
    console.log('[Task G] 맥락 카드 생성 배치 시작...');

    // G-1: 맥락 카드 생성
    const cardResult = await generateContextCard();

    // G-2: 사용자별 영향도 계산
    const impactResult = await calculateUserImpacts(cardResult.contextCardId);

    const elapsed = Date.now() - startTime;
    await logTaskResult('context_card', 'SUCCESS', elapsed, {
      sentiment: cardResult.cardData.sentiment,
      users: impactResult.usersCalculated,
      avgImpact: impactResult.avgImpact,
    });

    return {
      contextCardId: cardResult.contextCardId,
      sentiment: cardResult.cardData.sentiment,
      usersCalculated: impactResult.usersCalculated,
      avgImpact: impactResult.avgImpact,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('context_card', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
