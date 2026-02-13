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
}

export interface GuruAnalysisResult {
  insights: GuruInsightResult[];
  marketContext: string;
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
async function analyzeGuruInsight(guru: typeof GURU_LIST[0]): Promise<GuruInsightResult | null> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const prompt = `당신은 baln(발른) 앱의 투자 거장 분석 AI입니다.
오늘(${dateStr}) ${guru.nameEn}(${guru.name})의 최근 투자 동향을 분석하세요.

[핵심 원칙]
- 한국 개인투자자가 거장의 행보를 통해 시장을 이해하도록 돕는다.
- 확인된 사실만 서술한다. 추측은 "~로 추정됩니다"로 표현한다.
- 한국어로 자연스럽게 작성한다.

[Google Search 검색]
- "${guru.nameEn} portfolio 2026", "${guru.nameEn} latest news"

[분석 항목]
1. recentAction: 최근 포트폴리오 변동이나 주목할 행동 (구체적 수치 포함, 한국어)
2. quote: 최근 공개 발언 또는 대표 명언 (한국어 번역)
3. sentiment: BULLISH / BEARISH / NEUTRAL / CAUTIOUS 중 하나
4. reasoning: 왜 이런 입장인지 2~3문장으로 설명 (한국어)
5. relevantAssets: 관련 티커 최대 5개 (문자열 배열)
6. source: 뉴스 출처명

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운 금지.]
{
  "guruName": "${guru.name}",
  "guruNameEn": "${guru.nameEn}",
  "recentAction": "애플 주식 25% 매도, 현금 보유 $334B 도달",
  "quote": "좋은 거래를 찾기 어려운 시기입니다",
  "sentiment": "CAUTIOUS",
  "reasoning": "현재 시장 밸류에이션이 역사적 평균을 크게 상회하고 있어, 새로운 대형 매수보다 현금 확보에 집중하는 모습입니다. 다만 이는 위기 대비가 아니라 더 좋은 기회를 기다리는 전략으로 해석됩니다.",
  "relevantAssets": ["AAPL", "BRK.B", "OXY"],
  "source": "Bloomberg"
}
`;

  try {
    console.log(`[Task C] ${guru.name} 분석 시작...`);
    const responseText = await callGeminiWithSearch(prompt);
    const cleanJson = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanJson);

    return {
      guruName: String(parsed.guruName || guru.name),
      guruNameEn: String(parsed.guruNameEn || guru.nameEn),
      organization: String(parsed.organization || guru.org),
      emoji: String(parsed.emoji || guru.emoji),
      topic: String(parsed.topic || guru.topic),
      recentAction: String(parsed.recentAction || '최신 데이터 없음'),
      quote: String(parsed.quote || ''),
      sentiment: String(parsed.sentiment || 'NEUTRAL'),
      reasoning: String(parsed.reasoning || '분석 데이터를 불러오지 못했습니다.'),
      relevantAssets: Array.isArray(parsed.relevantAssets) ? parsed.relevantAssets.map(String) : [],
      source: String(parsed.source || ''),
    };
  } catch (error) {
    console.error(`[Task C] ${guru.name} 분석 실패:`, error.message);
    // 실패 시 기본값 반환
    return {
      guruName: guru.name,
      guruNameEn: guru.nameEn,
      organization: guru.org,
      emoji: guru.emoji,
      topic: guru.topic,
      recentAction: '최신 데이터를 불러오지 못했습니다.',
      quote: '',
      sentiment: 'NEUTRAL',
      reasoning: '분석 데이터가 아직 준비되지 않았습니다.',
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
async function analyzeGuruInsights(): Promise<GuruAnalysisResult> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  console.log('[Task C] 투자 거장 인사이트 순차 분석 시작...');

  const insights: GuruInsightResult[] = [];

  // 순차 실행 (for loop + await)
  for (const guru of GURU_LIST) {
    const insight = await analyzeGuruInsight(guru);
    if (insight) {
      insights.push(insight);
    }

    // 2초 대기 (Rate Limit 방지)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 시장 맥락은 별도로 생성 (단순 요약)
  const marketContext = `${dateStr} 기준, ${insights.length}명의 투자 거장 인사이트가 분석되었습니다.`;

  console.log(`[Task C] 분석 완료: ${insights.length}/${GURU_LIST.length}명`);

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
async function upsertGuruInsights(data: GuruAnalysisResult): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('guru_insights')
    .upsert(
      {
        date: today,
        insights: data.insights,
        market_context: data.marketContext,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    );

  if (error) {
    console.error('[Task C] guru_insights UPSERT 실패:', error);
    throw error;
  }
  console.log(`[Task C] guru_insights UPSERT 성공 (${today}, ${data.insights.length}명)`);
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
export async function runGuruInsightsAnalysis(): Promise<{
  count: number;
  marketContext: string;
}> {
  const startTime = Date.now();

  try {
    console.log('[Task C] 투자 거장 인사이트 배치 시작...');

    const result = await analyzeGuruInsights();
    await upsertGuruInsights(result);

    const elapsed = Date.now() - startTime;
    await logTaskResult('gurus', 'SUCCESS', elapsed, {
      count: result.insights.length,
      total: GURU_LIST.length,
    });

    return {
      count: result.insights.length,
      marketContext: result.marketContext,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('gurus', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
