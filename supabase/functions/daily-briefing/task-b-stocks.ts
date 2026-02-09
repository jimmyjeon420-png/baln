// @ts-nocheck
// ============================================================================
// Task B: 종목별 퀀트 분석 (Stock Quantitative Analysis)
// STOCK_LIST 35개 종목에 대한 퀀트 분석 배치 처리
//
// [배치 전략]
// - 5개씩 묶어서 순차 실행 (API Rate Limit 방지)
// - 배치 간 1.5초 딜레이
// - 개별 실패 시 기본값으로 대체 (전체 중단 방지)
//
// [분석 항목]
// - valuation_score (0-100): 저평가/고평가 점수
// - signal: STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL
// - metrics: PEG Ratio, RSI, 실적 수정, 공매도 비율 등
//
// [저장]
// - stock_quant_reports 테이블 UPSERT
// ============================================================================

import {
  supabase,
  STOCK_LIST,
  callGeminiWithSearch,
  cleanJsonResponse,
  logTaskResult,
} from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface StockQuantResult {
  ticker: string;
  valuationScore: number;
  signal: string;
  analysis: string;
  metrics: Record<string, unknown>;
  sector: string;
}

// ============================================================================
// Task B-1: 단일 배치 (5종목) 퀀트 분석
// ============================================================================

/**
 * 단일 배치(5종목) 퀀트 분석
 *
 * [Gemini Prompt]
 * - Google Search로 각 종목의 최신 데이터 검색
 * - 주가, 실적, 뉴스, 애널리스트 의견
 * - 퀀트 지표 계산 (PEG Ratio, RSI, P/E, P/S 등)
 *
 * [출력]
 * - ticker, valuation_score, signal, analysis, metrics
 *
 * @param stocks - 분석할 종목 배열 (최대 5개)
 * @returns StockQuantResult[]
 */
async function analyzeStockBatch(
  stocks: typeof STOCK_LIST
): Promise<StockQuantResult[]> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const tickerList = stocks.map(s => `${s.ticker}(${s.name})`).join(', ');

  const prompt = `
당신은 퀀트 분석가입니다. 오늘(${dateStr}) 다음 종목들의 퀀트 리포트를 작성하세요.

**분석 대상:** ${tickerList}

**[중요] Google Search로 각 종목의 최신 데이터를 검색하세요:**
- "${stocks.map(s => s.ticker).join(' stock price today')}"
- 각 종목의 최근 실적, 뉴스, 애널리스트 의견
- RSI, PEG Ratio 관련 최신 데이터

**각 종목별 분석:**
1. valuation_score (0-100): 높을수록 저평가 (PEG, P/E, P/S 종합)
2. signal: STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL
3. analysis: 한글 2-3문장 분석 (최신 뉴스 반영)
4. metrics: { pegRatio, rsi, earningsRevision, priceToFairValue, shortInterest }

**출력 형식 (CRITICAL: RAW JSON ONLY):**
- ❌ 사족 금지: "알겠습니다", "분석 결과입니다" 같은 설명 절대 금지
- ❌ 마크다운 금지: \`\`\`json 같은 코드 블록 금지
- ✅ 순수 JSON만 출력: { 부터 } 까지만

{
  "reports": [
    {
      "ticker": "NVDA",
      "valuation_score": 45,
      "signal": "HOLD",
      "analysis": "[실시간] 구체적 분석...",
      "metrics": {
        "pegRatio": 1.8,
        "rsi": 62,
        "earningsRevision": "+5%",
        "priceToFairValue": 0.95,
        "shortInterest": "2.1%"
      }
    }
  ]
}
`;

  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);

  // 배열 또는 객체 형태 모두 처리
  let parsed: { reports?: StockQuantResult[] };
  const cleaned = cleanJson.trim();

  if (cleaned.startsWith('[')) {
    parsed = { reports: JSON.parse(cleaned) };
  } else {
    parsed = JSON.parse(cleaned);
  }

  const reports = parsed.reports || [];

  return reports.map((r: Record<string, unknown>) => ({
    ticker: String(r.ticker || ''),
    valuationScore: Number(r.valuation_score ?? r.valuationScore ?? 50),
    signal: String(r.signal || 'HOLD'),
    analysis: String(r.analysis || '분석 데이터 없음'),
    metrics: (r.metrics as Record<string, unknown>) || {},
    sector: stocks.find(s => s.ticker === r.ticker)?.sector || '',
  }));
}

// ============================================================================
// Task B: 전체 종목 배치 처리
// ============================================================================

/**
 * 전체 종목 배치 처리 (5개씩 나누어 순차 실행)
 *
 * [배치 전략]
 * - STOCK_LIST 35개 종목을 5개씩 묶어 7개 배치 실행
 * - 배치 간 1.5초 딜레이 (API Rate Limit 방지)
 * - 개별 배치 실패 시 해당 종목만 기본값으로 대체
 *
 * [에러 처리]
 * - 배치 실패 → 해당 종목들을 기본값 (HOLD, score 50)으로 채움
 * - 전체 배치 중단하지 않음
 *
 * @returns StockQuantResult[] (전체 35개 종목)
 */
export async function analyzeAllStocks(): Promise<StockQuantResult[]> {
  const startTime = Date.now();
  const BATCH_SIZE = 5;
  const allResults: StockQuantResult[] = [];

  try {
    for (let i = 0; i < STOCK_LIST.length; i += BATCH_SIZE) {
      const batch = STOCK_LIST.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(STOCK_LIST.length / BATCH_SIZE);

      console.log(`[Task B] 배치 ${batchNum}/${totalBatches}: ${batch.map(s => s.ticker).join(', ')}`);

      try {
        const results = await analyzeStockBatch(batch);
        allResults.push(...results);
      } catch (error) {
        console.error(`[Task B] 배치 ${batchNum} 실패:`, error);
        // 실패한 종목은 기본값으로 채움
        batch.forEach(stock => {
          allResults.push({
            ticker: stock.ticker,
            valuationScore: 50,
            signal: 'HOLD',
            analysis: '분석 데이터를 불러오지 못했습니다.',
            metrics: {},
            sector: stock.sector,
          });
        });
      }

      // Rate limit 방지: 배치 간 2.5초 대기 (429 에러 방지)
      if (i + BATCH_SIZE < STOCK_LIST.length) {
        console.log(`[Task B] 다음 배치까지 2.5초 대기...`);
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }

    // ── DB 저장: stock_quant_reports UPSERT ──
    const todayDate = new Date().toISOString().split('T')[0];
    let savedCount = 0;

    for (const result of allResults) {
      const { error: upsertError } = await supabase
        .from('stock_quant_reports')
        .upsert({
          date: todayDate,
          ticker: result.ticker,
          valuation_score: result.valuationScore,
          signal: result.signal,
          analysis: result.analysis,
          metrics: result.metrics,
          sector: result.sector,
        }, { onConflict: 'date,ticker' });

      if (upsertError) {
        console.warn(`[Task B] ${result.ticker} UPSERT 실패:`, upsertError.message);
      } else {
        savedCount++;
      }
    }

    console.log(`[Task B] stock_quant_reports ${savedCount}/${allResults.length}개 저장 완료 (${todayDate})`);

    const elapsed = Date.now() - startTime;
    await logTaskResult('stocks', 'SUCCESS', elapsed, {
      count: allResults.length,
      saved: savedCount,
      total: STOCK_LIST.length,
    });

    return allResults;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('stocks', 'FAILED', elapsed, { count: allResults.length }, error.message);
    throw error;
  }
}
