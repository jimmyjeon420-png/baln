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
  getKSTDate,
  getKSTDateStr,
} from './_shared.ts';
import { fetchRealMarketData, buildRealDataContext, type RealMarketData } from './task-real-data.ts';

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
export async function analyzeMacroAndBitcoin(lang = 'ko'): Promise<MacroAnalysisResult> {
  const langInstruction = lang === 'ko' ? '한국어로 자연스럽게 작성한다.' : 'Write naturally in English.';
  const startTime = Date.now();
  const dateStr = getKSTDateStr();

  // ── 실시간 시장 데이터 수집 (Yahoo Finance) ──
  let realData: RealMarketData | null = null;
  try {
    realData = await fetchRealMarketData();
  } catch (e) {
    console.warn('[Task A] 실데이터 수집 실패 (Gemini Search로 대체):', e);
  }
  const realDataContext = realData ? buildRealDataContext(realData) : '';

  const audienceContext = lang === 'ko'
    ? '시장 상황을 한국 개인투자자에게 설명합니다. KOSPI와 코스닥 동향을 우선 언급하세요.'
    : 'Explain the market situation to a US retail investor. Prioritize S&P 500 and NASDAQ commentary.';

  const prompt = `당신은 baln(발른) 앱의 글로벌 매크로 전략 AI입니다.
오늘(${dateStr}) ${audienceContext}
${realDataContext}

[핵심 원칙]
- "안심을 판다, 불안을 팔지 않는다" — 공포 표현 대신 맥락으로 이해를 돕는다.
- 수치와 출처를 반드시 포함한다. 감정적 표현(급락, 폭등, 공포, 패닉)을 지양하고 사실 기반으로 서술한다.
- ${langInstruction}

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
    "generatedAt": "${new Date().toISOString()}"
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

    // 최대 2회 시도 (첫 실패 시 1회 재시도)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const responseText = await callGeminiWithSearch(prompt);
        // cleanJsonResponse가 이미 _shared에서 호출됨 — 추가 정제 시도
        let jsonText = responseText;
        try {
          jsonText = cleanJsonResponse(responseText);
        } catch {
          // 이미 clean된 JSON이거나 raw text → 그대로 파싱 시도
        }
        parsed = JSON.parse(jsonText);

        // 파싱 성공 시 실제 데이터인지 검증
        if (parsed.macroSummary?.title && parsed.macroSummary.title !== '시장 데이터 수집 중') {
          console.log(`[Task A] Gemini 파싱 성공 (시도 ${attempt}/2): ${parsed.macroSummary.title}`);
          break;
        }
        throw new Error('Gemini가 플레이스홀더 데이터를 반환함');
      } catch (parseErr) {
        console.error(`[Task A] Gemini 파싱 실패 (시도 ${attempt}/2):`, parseErr);
        if (attempt < 2) {
          console.log('[Task A] 3초 후 재시도...');
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
      }
    }

    // 2회 모두 실패 시 기본값
    if (!parsed! || !parsed.macroSummary?.title || parsed.macroSummary.title === '시장 데이터 수집 중') {
      console.error('[Task A] 2회 시도 모두 실패 — 기본값 사용');
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
    const todayDate = getKSTDate();
    const { error: upsertError } = await supabase
      .from('daily_market_insights')
      .upsert({
        date: todayDate,
        macro_summary: parsed.macroSummary || {},
        bitcoin_analysis: parsed.bitcoinAnalysis || {},
        cfo_weather: parsed.cfoWeather || {},
        market_sentiment: parsed.macroSummary?.marketSentiment || 'NEUTRAL',
        vix_level: realData?.vix ?? parsed.vixLevel ?? null,  // 실데이터 우선
        global_liquidity: parsed.globalLiquidity || '',
        rate_cycle_evidence: rateCycleEvidence,
        real_market_data: realData ?? null,  // Yahoo Finance 실데이터 저장
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
      const baseScore = parsed.bitcoinAnalysis?.score ? Math.round(parsed.bitcoinAnalysis.score) : 50;
      // 섹터별 가중치: 비트코인 상관관계에 따라 차등 적용
      const sectorWeights: Record<string, number> = {
        technology: 1.0,   // 기술주: 비트코인과 높은 상관관계
        finance: 0.7,      // 금융: 중간 상관관계
        energy: 0.5,       // 에너지: 낮은 상관관계
        healthcare: 0.3,   // 헬스케어: 방어적 섹터
        consumer: 0.6,     // 소비재: 중간 상관관계
      };
      const sectorRows = sectors.map(s => {
        const weight = sectorWeights[s.sector] ?? 0.5;
        // 가중치 적용: 50(중립)에서 baseScore까지의 편차를 가중치로 조절
        const adjustedScore = Math.round(50 + (baseScore - 50) * weight);
        return {
          date: todayDate,
          sector: s.sector,
          sentiment: baseSentiment,
          score: Math.max(0, Math.min(100, adjustedScore)),
          reasoning: `${s.name} 섹터 — ${dateStr} 기준 시장 센티먼트 반영 (가중치 ${(weight * 100).toFixed(0)}%)`,
        };
      });

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
