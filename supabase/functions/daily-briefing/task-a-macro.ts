// @ts-nocheck
// ============================================================================
// Task A: 거시경제 & 비트코인 분석 (Macro & Bitcoin Analysis)
// Google Search로 실시간 경제 지표 수집 + Gemini 분석
//
// [수집 데이터]
// - 미국 주요 지수 (S&P 500, 나스닥, 다우존스)
// - VIX 공포지수, 금리 인상 확률
// - 비트코인 분석 (고래 동향, ETF 유입, 해시레이트)
// - 금리 사이클 증거 (Fed 발언, 경제지표)
//
// [저장]
// - daily_market_insights 테이블 UPSERT
// ============================================================================

import {
  callGeminiWithSearch,
  cleanJsonResponse,
  logTaskResult,
} from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface MacroAnalysisResult {
  macroSummary: Record<string, unknown>;
  bitcoinAnalysis: Record<string, unknown>;
  marketSentiment: string;
  cfoWeather: Record<string, unknown>;
  vixLevel: number | null;
  globalLiquidity: string;
  rateCycleEvidence: Record<string, unknown> | null;
}

// ============================================================================
// Task A: 거시경제 & 비트코인 분석
// ============================================================================

/**
 * Task A: 거시경제 & 비트코인 분석
 *
 * [Gemini Prompt]
 * - Google Search로 실시간 데이터 검색
 * - 나스닥, S&P 500, 다우존스 종가
 * - VIX 지수, Fed 금리 인상 확률
 * - 비트코인 고래 동향, ETF 유입, 해시레이트
 * - 금리 사이클 증거 (Fed 발언, CPI, PCE, 실업률, 국채 스프레드)
 *
 * [출력]
 * - macroSummary: 글로벌 시장 핵심 요약
 * - bitcoinAnalysis: BTC 분석 (0-100 점수 + 세부 요인)
 * - cfoWeather: CFO용 날씨 이모티콘
 * - vixLevel: VIX 지수
 * - globalLiquidity: M2 유동성 설명
 * - rateCycleEvidence: 금리 사이클 판단 근거
 *
 * @returns MacroAnalysisResult
 */
export async function analyzeMacroAndBitcoin(): Promise<MacroAnalysisResult> {
  const startTime = Date.now();
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const prompt = `
당신은 골드만삭스 수석 매크로 전략가입니다. 오늘(${dateStr}) 글로벌 시장 분석을 작성하세요.

**[중요] Google Search로 반드시 실시간 데이터를 검색하세요:**
1. "나스닥 종가 today", "S&P 500 today", "다우존스 today"
2. "Trump tariff crypto news today"
3. "Bitcoin whale alerts ETF inflows ${today.getMonth() + 1}월", "Bitcoin hash rate today"
4. "Fed interest rate probability CME FedWatch"
5. "VIX index today", "Global M2 liquidity"
6. "Fed governor speech today", "CPI latest data", "PCE core inflation"
7. "Treasury yield curve spread 10Y-2Y", "unemployment rate latest"

**출력 형식 (JSON만, 마크다운 금지):**
{
  "macroSummary": {
    "title": "오늘의 글로벌 시장 핵심",
    "highlights": [
      "[검색결과] 구체적 이슈 1 (수치 포함)",
      "[검색결과] 구체적 이슈 2",
      "[검색결과] 구체적 이슈 3"
    ],
    "interestRateProbability": "동결 65% / 인하 30% / 인상 5%",
    "marketSentiment": "BULLISH" | "BEARISH" | "NEUTRAL"
  },
  "bitcoinAnalysis": {
    "score": 0-100,
    "whaleAlerts": ["고래 동향 1", "고래 동향 2"],
    "etfInflows": "BTC ETF 순유입/유출 정보",
    "politicsImpact": "트럼프/규제 뉴스 영향",
    "priceTarget": "단기 목표가 범위",
    "hashRate": "해시레이트 수치 및 추세 설명",
    "subScores": {
      "vixFear": 0-100,
      "hashRateHealth": 0-100,
      "whaleActivity": 0-100,
      "etfFlows": 0-100,
      "macroEnvironment": 0-100
    }
  },
  "cfoWeather": {
    "emoji": "☀️ 또는 ⛅ 또는 🌧️ 또는 ⛈️",
    "status": "맑음: 시장 긍정적",
    "message": "오늘의 핵심 한 마디"
  },
  "vixLevel": 15.5,
  "globalLiquidity": "M2 증감 설명 (한글)",
  "rateCycleEvidence": {
    "keyEvidence": [
      {
        "headline": "Fed 파월 의장, 추가 인하 신중론 재확인",
        "source": "Reuters",
        "date": "${dateStr}",
        "stance": "hawkish",
        "impact": "high"
      },
      {
        "headline": "1월 CPI 3.0% — 시장 예상 상회",
        "source": "Bloomberg",
        "date": "${dateStr}",
        "stance": "hawkish",
        "impact": "high"
      },
      {
        "headline": "고용시장 둔화 조짐, 실업수당 청구 증가",
        "source": "CNBC",
        "date": "${dateStr}",
        "stance": "dovish",
        "impact": "medium"
      }
    ],
    "economicIndicators": {
      "fedRate": { "name": "Fed 기준금리", "value": "현재 값", "previous": "이전 값", "trend": "stable", "nextRelease": "다음 FOMC 날짜" },
      "cpi": { "name": "CPI (전년 대비)", "value": "현재 값", "previous": "이전 값", "trend": "rising 또는 falling 또는 stable" },
      "unemployment": { "name": "실업률", "value": "현재 값", "previous": "이전 값", "trend": "rising 또는 falling 또는 stable" },
      "yieldCurveSpread": { "name": "10Y-2Y 스프레드", "value": "현재 값 (bp)", "previous": "이전 값", "trend": "rising 또는 falling 또는 stable" },
      "pceCore": { "name": "PCE 코어", "value": "현재 값", "previous": "이전 값", "trend": "rising 또는 falling 또는 stable" }
    },
    "expertPerspectives": {
      "ratio": 55,
      "hawkishArgs": ["인플레이션이 목표치 2%에 도달하지 못함", "고용시장 여전히 견고"],
      "dovishArgs": ["경기 둔화 신호 확산", "글로벌 수요 위축"],
      "hawkishFigures": ["크리스토퍼 월러 (Fed 이사)", "닐 카시카리 (미니애폴리스 연은 총재)"],
      "dovishFigures": ["오스탄 굴스비 (시카고 연은 총재)", "라파엘 보스틱 (애틀랜타 연은 총재)"]
    },
    "confidenceFactors": {
      "overall": 72,
      "factors": [
        { "factor": "CME FedWatch 금리 동결 확률 80%+", "type": "supporting", "weight": "strong" },
        { "factor": "CPI 하락 추세 유지", "type": "supporting", "weight": "medium" },
        { "factor": "관세 정책 불확실성", "type": "opposing", "weight": "medium" },
        { "factor": "고용 지표 혼조", "type": "opposing", "weight": "weak" }
      ]
    },
    "generatedAt": "${today.toISOString()}"
  }
}
`;

  try {
    console.log('[Task A] 거시경제 & 비트코인 분석 시작...');
    const responseText = await callGeminiWithSearch(prompt);
    const cleanJson = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanJson);

    // 금리 사이클 증거 파싱 (실패 시 null — 기존 데이터에 영향 없음)
    let rateCycleEvidence: Record<string, unknown> | null = null;
    try {
      if (parsed.rateCycleEvidence && parsed.rateCycleEvidence.keyEvidence) {
        rateCycleEvidence = parsed.rateCycleEvidence;
        console.log(`[Task A] 금리 사이클 증거 파싱 성공 (증거 ${parsed.rateCycleEvidence.keyEvidence?.length || 0}건)`);
      }
    } catch (evidenceError) {
      console.warn('[Task A] 금리 사이클 증거 파싱 실패 (무시):', evidenceError);
    }

    const elapsed = Date.now() - startTime;
    await logTaskResult('macro', 'SUCCESS', elapsed, {
      vixLevel: parsed.vixLevel,
      sentiment: parsed.macroSummary?.marketSentiment,
      btcScore: parsed.bitcoinAnalysis?.score,
    });

    return {
      macroSummary: parsed.macroSummary || {},
      bitcoinAnalysis: parsed.bitcoinAnalysis || {},
      marketSentiment: parsed.macroSummary?.marketSentiment || 'NEUTRAL',
      cfoWeather: parsed.cfoWeather || {},
      vixLevel: parsed.vixLevel ?? null,
      globalLiquidity: parsed.globalLiquidity || '',
      rateCycleEvidence,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('macro', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
