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
  getKSTDate,
  getKSTDateStr,
} from './_shared.ts';
import { fetchRealMarketData, buildRealDataContext, type RealMarketData } from './task-real-data.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ContextCardData {
  headline: string;
  historical_context: string;
  macro_chain: string[];
  political_context: string;
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
async function generateContextCard(timeSlot: string = 'morning'): Promise<{
  contextCardId: string;
  cardData: ContextCardData;
  realData: RealMarketData | null;
}> {
  const dateStr = getKSTDateStr();
  const todayDate = getKSTDate();

  // 시간대별 프롬프트 컨텍스트 (3시간 간격, KST 기준)
  const timeSlotContextMap: Record<string, string> = {
    // 3시간 간격 슬롯 (신규)
    h00: '[시간대: 자정 0시] 미국 장이 진행 중입니다. 현재 미국 시장 실시간 흐름과 주요 이슈를 분석하세요.',
    h03: '[시간대: 새벽 3시] 미국 장이 막 마감했습니다. 미국 장 마감 결과와 애프터마켓 흐름을 정리하세요.',
    h06: '[시간대: 아침 6시] 오늘 하루 시장을 미리 전망합니다. 간밤 미국 지수 마감 결과 + 오늘 아시아 장 전망을 분석하세요.',
    h09: '[시간대: 오전 9시] 한국 장이 개장했습니다. 코스피/코스닥 시초가와 외국인/기관 초반 수급을 분석하세요.',
    h12: '[시간대: 낮 12시] 한국 장 중반입니다. 오전장 흐름 정리 + 오후장 전망 + 점심시간 발표된 경제지표를 반영하세요.',
    h15: '[시간대: 오후 3시] 한국 장이 마감했습니다. 코스피/코스닥 종가 + 외국인/기관 최종 수급 + 당일 핵심 이벤트를 정리하세요.',
    h18: '[시간대: 저녁 6시] 저녁 종합 브리핑입니다. 한국 장 마감 결과 + 유럽 장 흐름 + 미국 프리마켓을 반영하세요.',
    h21: '[시간대: 밤 9시] 미국 장 개장 직전/직후입니다. 미국 주요 지표 발표 + 개장 초반 흐름을 분석하세요.',
    // 레거시 호환
    morning: '[시간대: 아침 6시] 오늘 하루 시장을 미리 전망합니다. 아시아 장 개장 전, 미국 장 마감 후 상황을 중심으로 분석하세요.',
    afternoon: '[시간대: 오후 3시] 장중 흐름을 업데이트합니다. 코스피/코스닥 장중 흐름과 오늘 발생한 주요 이벤트를 반영하세요.',
    evening: '[시간대: 저녁 7시] 오늘 시장 마감을 정리합니다. 한국 장 마감 결과와 미국 프리마켓 흐름을 반영하세요.',
  };
  const timeSlotContext = timeSlotContextMap[timeSlot] || timeSlotContextMap['h06'];

  // ── 실시간 시장 데이터 수집 ──
  // Task A가 이미 실행됐으면 DB에서 읽고, 없으면 직접 수집
  let realData: RealMarketData | null = null;
  try {
    const { data: taskAData } = await supabase
      .from('daily_market_insights')
      .select('real_market_data, vix_level')
      .eq('date', todayDate)
      .maybeSingle();

    if (taskAData?.real_market_data) {
      realData = taskAData.real_market_data as RealMarketData;
      console.log('[Task G-1] Task A 실데이터 재사용');
    } else {
      realData = await fetchRealMarketData();
      console.log('[Task G-1] 실데이터 직접 수집');
    }
  } catch (e) {
    console.warn('[Task G-1] 실데이터 수집 실패 (AI 생성으로 대체):', e);
  }
  const realDataContext = realData ? buildRealDataContext(realData) : '';

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
${timeSlotContext}
오늘(${dateStr}) 시장 상황을 5가지 관점으로 분석하여, 한국 개인투자자가 "오늘 내 자산이 왜 이렇게 움직였는지" 5분 안에 이해할 수 있도록 설명하세요.
${realDataContext}
${macroContext}
[핵심 원칙]
- "안심을 판다, 불안을 팔지 않는다" — 하락장에서도 공포가 아닌 맥락을 제공한다.
- 위에 주어진 실데이터(Yahoo Finance)를 반드시 인용한다. 없는 수치를 만들어내지 않는다.
- 수치 인용 시 출처를 괄호로 표기: "(Yahoo Finance)", "(Bloomberg)", "(FRB)" 등
- 역사적 사례는 반드시 "YYYY년 MM월, X% 하락/상승, Y개월 후 회복" 형식으로 구체화한다.
- 기관 행동은 반드시 방향(순매수/순매도)과 금액 또는 거래일수를 포함한다.
- 정치 맥락이 없는 날은 "현재 주요 정치 리스크는 제한적" 이라고 명시한다.

[Google Search 검색 — 실데이터로 보완 안 된 항목만]
- "외국인 기관 순매수 오늘 코스피"
- "한국 경제 정치 뉴스 오늘"
- "미국 경제지표 발표 오늘"

[5겹 분석 레이어]
1. 역사적 맥락: 과거 유사 패턴 + 회복 기간 (반드시 연도/퍼센트 포함, 2~3문장)
2. 거시경제 체인: 오늘 시장을 움직인 인과관계 (배열 4~6단계, 각 단계에 수치 포함)
3. 정치 맥락: 관세/선거/지정학 등 정치 이벤트의 시장 영향 (2~3문장, 없으면 "현재 주요 정치 리스크는 제한적" 명시)
4. 기관 행동: 외국인/기관 방향·규모·의미 (2~3문장, 반드시 방향 포함)
5. 시장 분위기: VIX 실값 기준 calm(<15) / caution(15~25) / alert(>25)

[응답 형식 — JSON만 출력. 설명문·마크다운·코드블록 절대 금지.]
{
  "headline": "시장 핵심 한 줄 (20자 이내, 수치 포함 권장)",
  "historical_context": "2022년 1월 연준 긴축 우려로 나스닥이 고점 대비 -33% 하락했지만, 2023년 1월부터 반등해 13개월 만에 전고점을 회복했습니다. 현재 상황과 유사하며, 장기 투자자에게는 일시적 조정입니다. (출처: Yahoo Finance 기록)",
  "macro_chain": ["미국 CPI 2.4% 발표(예상 하회)", "인플레이션 완화 확인 (FRB)", "금리 인하 기대감 유지", "기술주 중심 매수세 유입 (Yahoo Finance)", "코스피 연동 상승"],
  "political_context": "트럼프 행정부의 대중 관세 25% 부과 발표로 단기 불확실성이 높아졌지만, 역사적으로 무역 분쟁은 1~2분기 변동성 확대 후 안정화 패턴을 보였습니다. (출처: Bloomberg)",
  "institutional_behavior": "외국인이 코스피에서 3거래일 연속 순매수(+2,300억원 추정)를 기록하고 있습니다. 이는 달러 약세와 신흥국 자금 유입 흐름과 일치하며, 패닉이 아닌 전략적 매수입니다.",
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

  const slot = timeSlot || 'morning';
  const { data: insertedCard, error: upsertError } = await supabase
    .from('context_cards')
    .upsert(
      {
        date: todayDate,
        time_slot: slot,
        headline: parsed.headline || '오늘의 시장 분석',
        historical_context: parsed.historical_context || '',
        macro_chain: parsed.macro_chain || [],
        political_context: parsed.political_context || '',
        institutional_behavior: parsed.institutional_behavior || '',
        sentiment: parsed.sentiment || 'calm',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date,time_slot' }
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
    realData,
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
// sentiment → 폴백 기본 영향도 (stock_quant_reports 없을 때)
const SENTIMENT_BASE_IMPACT: Record<string, number> = {
  calm: 1.2,     // 평온: 소폭 긍정
  caution: -0.8, // 주의: 소폭 부정
  alert: -2.0,   // 위기: 부정
};

async function calculateUserImpacts(
  contextCardId: string,
  sentiment: string = 'calm',
  realData: RealMarketData | null = null,
): Promise<{
  usersCalculated: number;
  avgImpact: number;
}> {
  console.log('[Task G-2] 사용자별 영향도 계산 시작...');
  const today = getKSTDate();

  // 1. 모든 포트폴리오 조회
  const { data: allPortfolios, error: portError } = await supabase
    .from('portfolios')
    .select('user_id, ticker, quantity, current_value, asset_type');

  if (portError || !allPortfolios || allPortfolios.length === 0) {
    console.log('[Task G-2] 포트폴리오 데이터 없음 — 스킵');
    return { usersCalculated: 0, avgImpact: 0 };
  }

  // 2. 영향도 소스 결정 (우선순위: 실데이터 > stock_quant_reports > sentiment 폴백)
  let dataSource: 'realdata' | 'stockreports' | 'sentiment' = 'sentiment';

  // 카테고리별 실데이터 변동률 (Yahoo Finance)
  const categoryImpactMap: Record<string, number> = realData?.categoryChanges
    ? { ...realData.categoryChanges }
    : {};

  if (realData?.dataQuality === 'live' || realData?.dataQuality === 'partial') {
    dataSource = 'realdata';
    console.log(`[Task G-2] 실데이터(Yahoo Finance) 기반 영향도 계산 (품질: ${realData.dataQuality})`);
  } else {
    // 실데이터 없으면 stock_quant_reports 시도
    const { data: stockReports } = await supabase
      .from('stock_quant_reports')
      .select('ticker, valuation_score, signal')
      .eq('date', today);

    if (stockReports && stockReports.length > 0) {
      dataSource = 'stockreports';
      console.log(`[Task G-2] stock_quant_reports 기반 영향도 계산 (${stockReports.length}건)`);
      // valuation_score → ticker별 임시 맵 (하위 호환 유지)
      for (const r of stockReports) {
        const score = r.valuation_score ?? 50;
        categoryImpactMap[`__ticker__${r.ticker}`] = ((score - 50) / 50) * 10;
      }
    } else {
      console.log(`[Task G-2] 실데이터 없음 → sentiment(${sentiment}) 폴백 적용`);
    }
  }

  // sentiment 폴백값 (실데이터/stock 없을 때)
  const fallbackImpact = dataSource === 'sentiment'
    ? (SENTIMENT_BASE_IMPACT[sentiment] ?? 0)
    : 0;

  // 3. 유저별 가중평균 영향도 계산
  const userImpactMap = new Map<string, { totalValue: number; weightedImpact: number }>();

  for (const item of allPortfolios) {
    const value = item.current_value || 0;
    if (value <= 0) continue;

    // 부동산 등 RE_ 자산은 제외 (주식/ETF만 영향도 계산)
    if (item.ticker?.startsWith('RE_')) continue;

    // 영향도 결정: 실데이터(category) > stock_quant_reports > sentiment 폴백
    let impact: number;
    if (dataSource === 'realdata' && item.asset_type && categoryImpactMap[item.asset_type] != null) {
      impact = categoryImpactMap[item.asset_type];
    } else if (dataSource === 'stockreports' && categoryImpactMap[`__ticker__${item.ticker}`] != null) {
      impact = categoryImpactMap[`__ticker__${item.ticker}`];
    } else {
      impact = fallbackImpact;
    }

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

    // ★ DB 컬럼명은 percent_change / health_score_change / impact_message
    // (20240209_context_cards.sql 마이그레이션 기준)
    const roundedImpact = Math.round(clampedImpact * 100) / 100;
    const impactMsg = clampedImpact >= 0
      ? `오늘 시장이 회원님 포트폴리오에 +${clampedImpact.toFixed(1)}% 긍정적 영향을 주고 있습니다`
      : `오늘 시장이 회원님 포트폴리오에 ${clampedImpact.toFixed(1)}% 영향을 주고 있지만, 장기적 관점에서는 일시적 조정입니다`;

    impactRows.push({
      user_id: userId,
      context_card_id: contextCardId,
      percent_change: roundedImpact,
      health_score_change: Math.round(clampedImpact * 0.3 * 100) / 100,
      impact_message: impactMsg,
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
/**
 * 현재 KST 시간을 기준으로 3시간 간격 time_slot 자동 결정
 * 예: KST 14:30 → h12 (12:00~14:59 구간)
 */
function autoDetectTimeSlot(): string {
  const now = new Date();
  // UTC → KST (+9시간)
  const kstHour = (now.getUTCHours() + 9) % 24;
  // 3시간 단위로 내림: 0,3,6,9,12,15,18,21
  const slotHour = Math.floor(kstHour / 3) * 3;
  return `h${String(slotHour).padStart(2, '0')}`;
}

export async function runContextCardGeneration(timeSlot?: string): Promise<ContextCardResult> {
  const startTime = Date.now();

  // time_slot이 없으면 현재 KST 시간으로 자동 결정
  const effectiveSlot = timeSlot || autoDetectTimeSlot();
  console.log(`[Task G] time_slot: ${effectiveSlot} (입력: ${timeSlot || 'auto'})`);

  try {
    console.log('[Task G] 맥락 카드 생성 배치 시작...');

    // G-1: 맥락 카드 생성
    const cardResult = await generateContextCard(effectiveSlot);

    // G-2: 사용자별 영향도 계산 (실데이터 + sentiment 전달)
    const impactResult = await calculateUserImpacts(
      cardResult.contextCardId,
      cardResult.cardData.sentiment,
      cardResult.realData,
    );

    const elapsed = Date.now() - startTime;
    await logTaskResult('context_card', 'SUCCESS', elapsed, {
      sentiment: cardResult.cardData.sentiment,
      users: impactResult.usersCalculated,
      avgImpact: impactResult.avgImpact,
      timeSlot: effectiveSlot,
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
