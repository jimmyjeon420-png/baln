// @ts-nocheck
// ============================================================================
// Task C: 투자 거장 인사이트 분석 (Guru Investment Insights)
// Gemini + Google Search로 10명의 투자 거장 최근 동향 분석
//
// [거장 리스트]
// - 워렌 버핏 (Warren Buffett) - 미국 대형 가치주
// - 레이 달리오 (Ray Dalio) - 올웨더/매크로
// - 캐시 우드 (Cathie Wood) - 혁신 성장주
// - 마이클 세일러 (Michael Saylor) - 비트코인
// - 제이미 다이먼 (Jamie Dimon) - 은행/금융
// - 래리 핑크 (Larry Fink) - ETF/자산운용
// - 일론 머스크 (Elon Musk) - 테슬라/도지/정치
// - 피터 린치 (Peter Lynch) - 가치투자 교훈
// - 하워드 막스 (Howard Marks) - 채권/신용
// - 짐 로저스 (Jim Rogers) - 원자재(금/은)
//
// [분석 항목]
// - recentAction: 최근 포트폴리오 변동/거래
// - quote: 최근 공개 발언/인용구
// - sentiment: BULLISH/BEARISH/NEUTRAL/CAUTIOUS
// - reasoning: AI 분석 2-3문장
// - relevantAssets: 관련 주요 티커 (최대 5개)
//
// [저장]
// - guru_insights 테이블 UPSERT (date가 Primary Key)
// ============================================================================

import {
  supabase,
  GURU_LIST,
  callGeminiWithSearch,
  cleanJsonResponse,
  logTaskResult,
  getKSTDate,
  getKSTDateStr,
} from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface GuruInsightResult {
  guruName: string;
  guruNameEn: string;
  organization: string;
  emoji: string;
  topic: string;
  recentAction: string;
  quote: string;
  sentiment: string;
  reasoning: string;
  relevantAssets: string[];
  source: string;
  action?: 'BUY' | 'SELL' | 'HOLD';
  target_tickers?: string[];
  sector?: string;
  conviction_level?: number;
}

export interface GuruAnalysisResult {
  insights: GuruInsightResult[];
  marketContext: string;
}

function buildMarketContext(dateStr: string, count: number) {
  return `${dateStr} 기준, ${count}명의 투자 거장 인사이트가 분석되었습니다.`;
}

function mergeGuruInsights(
  existing: GuruInsightResult[],
  incoming: GuruInsightResult[],
): GuruInsightResult[] {
  const merged = new Map<string, GuruInsightResult>();

  for (const item of existing) {
    if (!item?.guruName) continue;
    merged.set(item.guruName, item);
  }

  for (const item of incoming) {
    if (!item?.guruName) continue;
    merged.set(item.guruName, item);
  }

  return GURU_LIST
    .map((guru) => merged.get(guru.name))
    .filter((item): item is GuruInsightResult => Boolean(item));
}

// ============================================================================
// Task C: 투자 거장 인사이트 분석
// ============================================================================

/**
 * 단일 거장 인사이트 분석 (429 에러 방지를 위한 개별 호출)
 *
 * [Gemini Prompt]
 * - Google Search로 해당 거장의 최신 포트폴리오 변동, 발언, 뉴스 검색
 * - 단일 거장만 분석하여 응답 크기 최소화
 *
 * @param guru - GURU_LIST의 단일 거장 정보
 * @returns GuruInsightResult 또는 null (에러 시)
 */
async function analyzeGuruInsight(guru: typeof GURU_LIST[0], langInstruction = '한국어로 자연스럽게 작성한다.'): Promise<GuruInsightResult | null> {
  const dateStr = getKSTDateStr();

  const audienceContext = langInstruction.startsWith('Write')
    ? 'Help retail investors understand the market through this guru\'s moves. Use "~is estimated" for speculation.'
    : '한국 개인투자자가 거장의 행보를 통해 시장을 이해하도록 돕는다. 추측은 "~로 추정됩니다"로 표현한다.';

  const prompt = `당신은 baln(발른) 앱의 투자 거장 분석 AI입니다.
오늘(${dateStr}) ${guru.nameEn}(${guru.name})의 최근 투자 동향을 분석하세요.

[핵심 원칙]
- ${audienceContext}
- 확인된 사실만 서술한다.
- ${langInstruction}

[Google Search 검색]
- "${guru.nameEn} portfolio 2026", "${guru.nameEn} latest news"

[분석 항목]
1. recentAction: 최근 포트폴리오 변동이나 주목할 행동 (구체적 수치 포함, 한국어)
2. quote: 최근 공개 발언 또는 대표 명언 (한국어 번역)
3. sentiment: BULLISH / BEARISH / NEUTRAL / CAUTIOUS 중 하나
4. reasoning: 왜 이런 입장인지 2~3문장으로 설명 (한국어)
5. relevantAssets: 관련 티커 최대 5개 (문자열 배열)
6. source: 뉴스 출처명
7. action: 이 거장의 현재 투자 행동. "BUY", "SELL", "HOLD" 중 하나.
8. target_tickers: 이 거장이 주목하는 종목 코드 최대 3개. 예: ["AAPL", "005930", "TSLA"]
9. sector: 이 거장이 주목하는 섹터. "기술", "금융", "에너지", "헬스케어", "소비재", "산업재" 중 하나.
10. conviction_level: 확신도 1~5 (1=매우 낮음, 5=매우 확신).

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운 금지.]
{
  "guruName": "${guru.name}",
  "guruNameEn": "${guru.nameEn}",
  "recentAction": "애플 주식 25% 매도, 현금 보유 $334B 도달",
  "quote": "좋은 거래를 찾기 어려운 시기입니다",
  "sentiment": "CAUTIOUS",
  "reasoning": "현재 시장 밸류에이션이 역사적 평균을 크게 상회하고 있어, 새로운 대형 매수보다 현금 확보에 집중하는 모습입니다. 다만 이는 위기 대비가 아니라 더 좋은 기회를 기다리는 전략으로 해석됩니다.",
  "relevantAssets": ["AAPL", "BRK.B", "OXY"],
  "source": "Bloomberg",
  "action": "HOLD",
  "target_tickers": ["AAPL", "OXY"],
  "sector": "기술",
  "conviction_level": 3
}
`;

  try {
    console.log(`[Task C] ${guru.name} 분석 시작...`);
    const responseText = await callGeminiWithSearch(prompt);
    const cleanJson = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanJson);

    const validActions = ['BUY', 'SELL', 'HOLD'];
    const validSectors = ['기술', '금융', '에너지', '헬스케어', '소비재', '산업재'];

    return {
      guruName: String(parsed.guruName || guru.name),
      guruNameEn: String(parsed.guruNameEn || guru.nameEn),
      organization: String(parsed.organization || guru.org),
      emoji: String(parsed.emoji || guru.emoji),
      topic: String(parsed.topic || guru.topic),
      recentAction: String(parsed.recentAction || (langInstruction.includes('English') ? 'No recent data available' : '최신 데이터 없음')),
      quote: String(parsed.quote || ''),
      sentiment: String(parsed.sentiment || 'NEUTRAL'),
      reasoning: String(parsed.reasoning || (langInstruction.includes('English') ? 'Analysis data unavailable' : '분석 데이터를 불러오지 못했습니다.')),
      relevantAssets: Array.isArray(parsed.relevantAssets) ? parsed.relevantAssets.map(String) : [],
      source: String(parsed.source || ''),
      action: validActions.includes(parsed.action) ? parsed.action : undefined,
      target_tickers: Array.isArray(parsed.target_tickers) ? parsed.target_tickers.slice(0, 3).map(String) : undefined,
      sector: validSectors.includes(parsed.sector) ? parsed.sector : undefined,
      conviction_level: typeof parsed.conviction_level === 'number' && parsed.conviction_level >= 1 && parsed.conviction_level <= 5 ? parsed.conviction_level : undefined,
    };
  } catch (error) {
    console.error(`[Task C] ${guru.name} 분석 실패:`, error.message);
    // 실패 시 기본값 반환
    const isEn = langInstruction.includes('English');
    return {
      guruName: guru.name,
      guruNameEn: guru.nameEn,
      organization: guru.org,
      emoji: guru.emoji,
      topic: guru.topic,
      recentAction: isEn ? 'Unable to fetch latest data.' : '최신 데이터를 불러오지 못했습니다.',
      quote: '',
      sentiment: 'NEUTRAL',
      reasoning: isEn ? 'Analysis data not yet available.' : '분석 데이터가 아직 준비되지 않았습니다.',
      relevantAssets: [],
      source: '',
    };
  }
}

/**
 * Task C: 10명의 투자 거장 인사이트 순차 분석 (429 에러 방지)
 *
 * [변경사항]
 * - 단일 API 호출 (10명 동시) → 10개 개별 호출 (순차 실행)
 * - 각 호출 후 2초 대기 (Rate Limit 방지)
 * - 개별 에러 처리 (한 명 실패해도 계속 진행)
 *
 * [폴백 로직]
 * - 각 거장 분석 실패 시 기본값으로 대체
 * - 모든 거장이 최소 1개 인사이트를 보장
 *
 * @returns { insights, marketContext }
 */
async function analyzeGuruInsights(
  gurus: typeof GURU_LIST,
  langInstruction = '한국어로 자연스럽게 작성한다.',
): Promise<GuruAnalysisResult> {
  const dateStr = getKSTDateStr();

  console.log('[Task C] 투자 거장 인사이트 순차 분석 시작...');

  const insights: GuruInsightResult[] = [];

  // 순차 실행 (for loop + await)
  for (const guru of gurus) {
    const insight = await analyzeGuruInsight(guru, langInstruction);
    if (insight) {
      insights.push(insight);
    }

    // 2초 대기 (Rate Limit 방지)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 시장 맥락은 별도로 생성 (단순 요약)
  const marketContext = buildMarketContext(dateStr, insights.length);

  console.log(`[Task C] 분석 완료: ${insights.length}/${gurus.length}명`);

  return {
    insights,
    marketContext,
  };
}

/**
 * 거장 인사이트 결과를 guru_insights 테이블에 UPSERT
 *
 * [저장 전략]
 * - date를 Primary Key로 사용 (하루 1건만 존재)
 * - insights는 JSONB 형태로 저장
 * - 재실행 시 동일 날짜 데이터 덮어쓰기
 *
 * @param data - 분석 결과 (insights, marketContext)
 */
async function upsertGuruInsights(
  data: GuruAnalysisResult,
  options?: { mergeWithExisting?: boolean },
): Promise<void> {
  const today = getKSTDate();
  let insights = data.insights;
  let marketContext = data.marketContext;

  if (options?.mergeWithExisting) {
    const { data: existingRow, error: existingError } = await supabase
      .from('guru_insights')
      .select('insights')
      .eq('date', today)
      .maybeSingle();

    if (existingError) {
      console.error('[Task C] 기존 guru_insights 조회 실패:', existingError);
      throw existingError;
    }

    const existingInsights = Array.isArray(existingRow?.insights)
      ? existingRow.insights as GuruInsightResult[]
      : [];

    insights = mergeGuruInsights(existingInsights, data.insights);
    marketContext = buildMarketContext(getKSTDateStr(), insights.length);
  }

  const { error } = await supabase
    .from('guru_insights')
    .upsert(
      {
        date: today,
        insights,
        market_context: marketContext,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    );

  if (error) {
    console.error('[Task C] guru_insights UPSERT 실패:', error);
    throw error;
  }
  console.log(`[Task C] guru_insights UPSERT 성공 (${today}, ${insights.length}명)`);
}

// ============================================================================
// Task C 통합 실행
// ============================================================================

/**
 * Task C 메인 함수: 거장 인사이트 분석 → DB 저장
 *
 * [사용처]
 * - index.ts의 Promise.allSettled()에서 호출
 * - 매일 07:00 자동 실행 (cron)
 *
 * [특징]
 * - 단일 Gemini API 호출로 10명 전부 분석
 * - 누락된 거장은 자동으로 기본값으로 채움
 * - Gemini 미사용 시에도 10명 데이터 보장
 *
 * @returns { count: 10, marketContext }
 */
export async function runGuruInsightsAnalysis(lang = 'ko'): Promise<{
  count: number;
  marketContext: string;
}> {
  return runGuruInsightsAnalysisSubset(0, GURU_LIST.length, lang, false);
}

export async function runGuruInsightsAnalysisSubset(
  startIndex: number,
  endIndex: number,
  lang = 'ko',
  mergeWithExisting = true,
): Promise<{
  count: number;
  marketContext: string;
  range: [number, number];
}> {
  const startTime = Date.now();

  try {
    const selectedGurus = GURU_LIST.slice(startIndex, endIndex);
    console.log(`[Task C] 투자 거장 인사이트 배치 시작... range=${startIndex}-${endIndex} (${selectedGurus.length}명)`);

    const langInstruction = lang === 'ko' ? '한국어로 자연스럽게 작성한다.' : 'Write naturally in English.';
    const result = await analyzeGuruInsights(selectedGurus, langInstruction);
    await upsertGuruInsights(result, { mergeWithExisting });

    const elapsed = Date.now() - startTime;
    await logTaskResult('gurus', 'SUCCESS', elapsed, {
      count: result.insights.length,
      total: selectedGurus.length,
      range: [startIndex, endIndex],
    });

    return {
      count: result.insights.length,
      marketContext: result.marketContext,
      range: [startIndex, endIndex],
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('gurus', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
