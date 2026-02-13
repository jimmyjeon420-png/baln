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
  supabase,
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
 * - cfoWeather: 투자 날씨 이모티콘
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

  const prompt = `당신은 baln(발른) 앱의 글로벌 매크로 전략 AI입니다.
오늘(${dateStr}) 시장 상황을 한국 개인투자자에게 설명합니다.

[핵심 원칙]
- "안심을 판다, 불안을 팔지 않는다" — 공포 표현 대신 맥락으로 이해를 돕는다.
- 수치와 출처를 반드시 포함한다. 감정적 표현(급락, 폭등, 공포, 패닉)을 지양하고 사실 기반으로 서술한다.
- 한국어로 자연스럽게 작성한다.

[Google Search 검색 키워드]
1. "S&P 500 today", "NASDAQ today", "Dow Jones today"
2. "VIX index today", "CME FedWatch tool"
3. "Bitcoin price today", "Bitcoin ETF inflows", "Bitcoin hash rate"
4. "Fed interest rate decision", "CPI latest", "PCE core inflation latest"
5. "Treasury yield curve 10Y-2Y spread", "unemployment rate US latest"
6. "Global M2 money supply"

[응답 형식 — 반드시 아래 JSON 구조만 출력하세요. 설명문, 마크다운, 코드블록 금지.]
{
  "macroSummary": {
    "title": "오늘의 시장 핵심 한 줄 (15자 이내)",
    "highlights": [
      "구체적 이슈 1 — 수치와 출처 포함",
      "구체적 이슈 2 — 수치와 출처 포함",
      "구체적 이슈 3 — 수치와 출처 포함"
    ],
    "interestRateProbability": "동결 ??% / 인하 ??% / 인상 ??%",
    "marketSentiment": "BULLISH 또는 BEARISH 또는 NEUTRAL 중 하나"
  },
  "bitcoinAnalysis": {
    "score": 50,
    "whaleAlerts": ["고래 동향 요약 1", "고래 동향 요약 2"],
    "etfInflows": "BTC ETF 순유입/유출 요약",
    "politicsImpact": "규제/정치 뉴스 요약",
    "priceTarget": "단기 예상 가격대",
    "hashRate": "해시레이트 현황",
    "subScores": {
      "vixFear": 50,
      "hashRateHealth": 50,
      "whaleActivity": 50,
      "etfFlows": 50,
      "macroEnvironment": 50
    }
  },
  "cfoWeather": {
    "emoji": "☀️ 또는 ⛅ 또는 🌧️ 또는 ⛈️ 중 하나",
    "status": "맑음: 시장 안정 등 간결한 상태",
    "message": "투자자에게 전하는 한 마디 (안심 톤)"
  },
  "vixLevel": 15.5,
  "globalLiquidity": "글로벌 M2 유동성 현황 요약 (한국어 1~2문장)",
  "rateCycleEvidence": {
    "keyEvidence": [
      {"headline": "뉴스 제목", "source": "출처", "date": "${dateStr}", "stance": "hawkish 또는 dovish 또는 neutral", "impact": "high 또는 medium 또는 low"},
      {"headline": "뉴스 제목", "source": "출처", "date": "${dateStr}", "stance": "dovish", "impact": "medium"}
    ],
    "economicIndicators": {
      "fedRate": {"name": "Fed 기준금리", "value": "현재값", "previous": "이전값", "trend": "stable 또는 rising 또는 falling", "nextRelease": "다음 FOMC 날짜"},
      "cpi": {"name": "CPI (전년 대비)", "value": "현재값", "previous": "이전값", "trend": "stable"},
      "unemployment": {"name": "실업률", "value": "현재값", "previous": "이전값", "trend": "stable"},
      "yieldCurveSpread": {"name": "10Y-2Y 스프레드", "value": "현재값(bp)", "previous": "이전값", "trend": "stable"},
      "pceCore": {"name": "PCE 코어", "value": "현재값", "previous": "이전값", "trend": "stable"}
    },
    "expertPerspectives": {
      "ratio": 55,
      "hawkishArgs": ["매파적 근거 1", "매파적 근거 2"],
      "dovishArgs": ["비둘기파 근거 1", "비둘기파 근거 2"],
      "hawkishFigures": ["인물명 (직함)"],
      "dovishFigures": ["인물명 (직함)"]
    },
    "confidenceFactors": {
      "overall": 70,
      "factors": [
        {"factor": "근거 설명", "type": "supporting 또는 opposing", "weight": "strong 또는 medium 또는 weak"}
      ]
    },
    "generatedAt": "${today.toISOString()}"
  }
}

[예시 — highlights 작성법]
- "S&P 500 +0.3% 마감(5,230pt) — 고용지표 호조에 매수세 유입 (Bloomberg)"
- "VIX 14.2로 안정권 유지 — 투자자 심리 개선 지속 (CBOE)"
- "BTC ETF 순유입 $120M — 기관 매수세 이틀째 지속 (CoinDesk)"
`;

  try {
    console.log('[Task A] 거시경제 & 비트코인 분석 시작...');
    let parsed: Record<string, unknown>;
    try {
      const responseText = await callGeminiWithSearch(prompt);
      const cleanJson = cleanJsonResponse(responseText);
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[Task A] Gemini 응답 파싱 실패 — 기본값 사용:', parseErr);
      parsed = {
        macroSummary: {
          title: '시장 데이터 수집 중',
          highlights: ['최신 시장 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.'],
          interestRateProbability: '데이터 없음',
          marketSentiment: 'NEUTRAL',
        },
        bitcoinAnalysis: {
          score: 50,
          whaleAlerts: [],
          etfInflows: '데이터 없음',
          politicsImpact: '데이터 없음',
          priceTarget: '데이터 없음',
          hashRate: '데이터 없음',
          subScores: { vixFear: 50, hashRateHealth: 50, whaleActivity: 50, etfFlows: 50, macroEnvironment: 50 },
        },
        cfoWeather: { emoji: '⛅', status: '데이터 수집 중', message: '시장 분석이 잠시 후 업데이트됩니다.' },
        vixLevel: null,
        globalLiquidity: '데이터를 불러오지 못했습니다.',
        rateCycleEvidence: null,
      };
    }

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

    // ── DB 저장: daily_market_insights UPSERT ──
    const todayDate = today.toISOString().split('T')[0];
    const { error: upsertError } = await supabase
      .from('daily_market_insights')
      .upsert({
        date: todayDate,
        macro_summary: parsed.macroSummary || {},
        bitcoin_analysis: parsed.bitcoinAnalysis || {},
        cfo_weather: parsed.cfoWeather || {},
        market_sentiment: parsed.macroSummary?.marketSentiment || 'NEUTRAL',
        vix_level: parsed.vixLevel ?? null,
        global_liquidity: parsed.globalLiquidity || '',
        rate_cycle_evidence: rateCycleEvidence,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'date' });

    if (upsertError) {
      console.error('[Task A] daily_market_insights UPSERT 실패:', upsertError);
    } else {
      console.log(`[Task A] daily_market_insights UPSERT 성공 (${todayDate})`);
    }

    // ── 섹터별 센티먼트 저장 (macroSummary에서 추출 가능하면) ──
    try {
      const sectors = [
        { sector: 'technology', name: '기술' },
        { sector: 'finance', name: '금융' },
        { sector: 'energy', name: '에너지' },
        { sector: 'healthcare', name: '헬스케어' },
        { sector: 'consumer', name: '소비재' },
      ];
      const baseSentiment = parsed.macroSummary?.marketSentiment || 'NEUTRAL';
      const sectorRows = sectors.map(s => ({
        date: todayDate,
        sector: s.sector,
        sentiment: baseSentiment,
        score: parsed.bitcoinAnalysis?.score ? Math.round(parsed.bitcoinAnalysis.score) : 50,
        reasoning: `${s.name} 섹터 — ${dateStr} 기준 시장 전반 센티먼트 반영`,
      }));

      const { error: sectorError } = await supabase
        .from('sector_sentiments')
        .upsert(sectorRows, { onConflict: 'date,sector' });

      if (sectorError) {
        console.warn('[Task A] sector_sentiments UPSERT 실패 (무시):', sectorError);
      } else {
        console.log(`[Task A] sector_sentiments ${sectorRows.length}개 섹터 저장`);
      }
    } catch (sectorErr) {
      console.warn('[Task A] 섹터 센티먼트 저장 실패 (무시):', sectorErr);
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
