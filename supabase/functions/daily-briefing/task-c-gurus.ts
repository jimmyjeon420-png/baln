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
 * Task C: 10명의 투자 거장 인사이트 분석
 *
 * [Gemini Prompt]
 * - Google Search로 각 거장의 최신 포트폴리오 변동, 발언, 뉴스 검색
 * - 단일 API 호출로 10명 전부 분석 (배치 분할 불필요)
 * - 시장 맥락 (marketContext) 함께 생성
 *
 * [폴백 로직]
 * - Gemini가 누락한 거장은 GURU_LIST 기반 기본값으로 채움
 * - 모든 거장이 최소 1개 인사이트를 보장
 *
 * @returns { insights, marketContext }
 */
async function analyzeGuruInsights(): Promise<GuruAnalysisResult> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const guruNames = GURU_LIST.map(g => `${g.nameEn}(${g.name})`).join(', ');

  const prompt = `
당신은 Bloomberg 수석 글로벌 투자 전략가입니다.
오늘(${dateStr}) 다음 10명의 투자 거장들의 최근 동향을 분석하세요.

**거장 리스트:** ${guruNames}

**[중요] Google Search로 각 거장의 최신 정보를 검색하세요:**
- "Warren Buffett portfolio changes 2026"
- "Ray Dalio all weather portfolio news"
- "Cathie Wood ARK Invest trades today"
- "Michael Saylor Bitcoin MicroStrategy"
- "Jamie Dimon JPMorgan market outlook"
- "Larry Fink BlackRock ETF news"
- "Elon Musk Tesla stock crypto"
- "Peter Lynch investing principles"
- "Howard Marks Oaktree memo"
- "Jim Rogers commodities gold silver"

**각 거장에 대해:**
1. recentAction: 최근 포트폴리오 변동, 거래, 또는 주목할 행동 (한글, 구체적 수치 포함)
2. quote: 최근 공개 발언이나 유명 인용구 (한글)
3. sentiment: BULLISH / BEARISH / NEUTRAL / CAUTIOUS (현재 시장에 대한 입장)
4. reasoning: AI 분석 2-3문장 (한글, 왜 이런 입장인지)
5. relevantAssets: 관련 주요 티커 (최대 5개)
6. source: 주요 뉴스 출처

**출력 형식 (JSON만, 마크다운 금지):**
{
  "marketContext": "오늘의 시장 상황 요약 1-2문장 (한글)",
  "insights": [
    {
      "guruName": "워렌 버핏",
      "guruNameEn": "Warren Buffett",
      "recentAction": "Apple 주식 25% 매도, 현금 보유고 $334B 도달",
      "quote": "좋은 거래를 찾기 어려운 시기다",
      "sentiment": "CAUTIOUS",
      "reasoning": "버핏은 현재 시장 고평가를 우려하며...",
      "relevantAssets": ["AAPL", "BRK.B", "OXY"],
      "source": "Bloomberg"
    }
  ]
}
`;

  console.log('[Task C] 투자 거장 인사이트 분석 시작...');
  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleanJson);

  // GURU_LIST 기반 폴백 보강 (Gemini가 누락한 거장 채우기)
  const returnedNames = new Set(
    (parsed.insights || []).map((g: { guruNameEn: string }) => g.guruNameEn)
  );

  const insights: GuruInsightResult[] = (parsed.insights || []).map(
    (g: Record<string, unknown>) => {
      const guruMeta = GURU_LIST.find(
        (m) => m.nameEn === g.guruNameEn || m.name === g.guruName
      );
      return {
        guruName: String(g.guruName || guruMeta?.name || ''),
        guruNameEn: String(g.guruNameEn || guruMeta?.nameEn || ''),
        organization: String(g.organization || guruMeta?.org || ''),
        emoji: String(g.emoji || guruMeta?.emoji || '📊'),
        topic: String(g.topic || guruMeta?.topic || ''),
        recentAction: String(g.recentAction || '최신 데이터 없음'),
        quote: String(g.quote || ''),
        sentiment: String(g.sentiment || 'NEUTRAL'),
        reasoning: String(g.reasoning || '분석 데이터를 불러오지 못했습니다.'),
        relevantAssets: Array.isArray(g.relevantAssets) ? g.relevantAssets.map(String) : [],
        source: String(g.source || ''),
      };
    }
  );

  // 누락된 거장 기본값으로 추가
  GURU_LIST.forEach((guru) => {
    if (!returnedNames.has(guru.nameEn)) {
      insights.push({
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
      });
    }
  });

  return {
    insights,
    marketContext: String(parsed.marketContext || ''),
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
