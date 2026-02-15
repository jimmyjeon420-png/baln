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
  getKSTDate,
  getKSTDateStr,
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

  const prompt = `당신은 baln(발른) 앱의 퀀트 분석 AI입니다.
오늘(${dateStr}) 아래 종목들의 퀀트 리포트를 작성하세요.

[분석 대상] ${tickerList}

[핵심 원칙]
- 한국 개인투자자가 이해할 수 있는 쉬운 한국어로 작성한다.
- "안심을 판다, 불안을 팔지 않는다" — 하락 종목도 맥락과 함께 설명한다.
- 분석은 데이터 기반으로 하되, 결론을 단정짓지 않는다.

[Google Search 검색]
- 각 종목의 현재 주가, 최근 실적, 주요 뉴스를 검색하세요.

[각 종목 분석 항목]
1. valuation_score (0~100 정수): 높을수록 저평가. PEG, P/E, P/S 종합 판단
2. signal: STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL 중 하나
3. analysis: 한국어 2~3문장. 최근 뉴스나 실적을 반영한 구체적 분석
4. metrics: pegRatio(숫자), rsi(정수), earningsRevision(문자열), priceToFairValue(숫자), shortInterest(문자열)

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운, 코드블록 절대 금지.]
{
  "reports": [
    {
      "ticker": "NVDA",
      "valuation_score": 45,
      "signal": "HOLD",
      "analysis": "엔비디아는 AI 반도체 수요 호조로 매출이 전년 대비 122% 증가했으나, 현 주가는 이미 실적 기대를 상당 부분 반영한 상태입니다. 단기 과열 신호(RSI 68)가 나타나 관망이 적절합니다.",
      "metrics": {"pegRatio": 1.8, "rsi": 62, "earningsRevision": "+5%", "priceToFairValue": 0.95, "shortInterest": "2.1%"}
    }
  ]
}
`;

  let reports: Record<string, unknown>[] = [];
  try {
    const responseText = await callGeminiWithSearch(prompt);
    const cleanJson = cleanJsonResponse(responseText);

    // 배열 또는 객체 형태 모두 처리
    let parsed: { reports?: Record<string, unknown>[] };
    const cleaned = cleanJson.trim();

    if (cleaned.startsWith('[')) {
      parsed = { reports: JSON.parse(cleaned) };
    } else {
      parsed = JSON.parse(cleaned);
    }

    reports = parsed.reports || [];
  } catch (parseErr) {
    console.error(`[Task B] Gemini 응답 파싱 실패 — 배치 전체 기본값 사용:`, parseErr);
    // 파싱 실패 시 빈 배열 → 아래 로직에서 기본값으로 채움
  }

  // 분석 결과가 부족하면 누락 종목을 기본값으로 보충
  const analyzedTickers = new Set(reports.map(r => String(r.ticker || '')));
  const results: StockQuantResult[] = reports.map((r: Record<string, unknown>) => ({
    ticker: String(r.ticker || ''),
    valuationScore: Number(r.valuation_score ?? r.valuationScore ?? 50),
    signal: String(r.signal || 'HOLD'),
    analysis: String(r.analysis || '분석 데이터를 불러오는 중입니다.'),
    metrics: (r.metrics as Record<string, unknown>) || {},
    sector: stocks.find(s => s.ticker === r.ticker)?.sector || '',
  }));

  // 누락된 종목 기본값 추가
  for (const stock of stocks) {
    if (!analyzedTickers.has(stock.ticker)) {
      results.push({
        ticker: stock.ticker,
        valuationScore: 50,
        signal: 'HOLD',
        analysis: '분석 데이터를 불러오지 못했습니다. 잠시 후 업데이트됩니다.',
        metrics: {},
        sector: stock.sector,
      });
    }
  }

  return results;
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
/**
 * 종목 리스트의 부분 집합만 분석 (B1/B2 분할 실행용)
 * @param startIdx - 시작 인덱스 (inclusive)
 * @param endIdx - 종료 인덱스 (exclusive)
 */
export async function analyzeStockSubset(startIdx: number, endIdx: number): Promise<StockQuantResult[]> {
  const subset = STOCK_LIST.slice(startIdx, endIdx);
  console.log(`[Task B subset] ${startIdx}~${endIdx}: ${subset.length}개 종목 (${subset.map(s => s.ticker).join(', ')})`);

  const startTime = Date.now();
  const BATCH_SIZE = 7;
  const allResults: StockQuantResult[] = [];

  for (let i = 0; i < subset.length; i += BATCH_SIZE) {
    const batch = subset.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(subset.length / BATCH_SIZE);

    console.log(`[Task B subset] 배치 ${batchNum}/${totalBatches}: ${batch.map(s => s.ticker).join(', ')}`);

    try {
      const results = await analyzeStockBatch(batch);
      allResults.push(...results);
    } catch (error) {
      console.error(`[Task B subset] 배치 ${batchNum} 실패:`, error);
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

    if (i + BATCH_SIZE < subset.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // DB 저장
  const todayDate = getKSTDate();
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
      console.warn(`[Task B subset] ${result.ticker} UPSERT 실패:`, upsertError.message);
    } else {
      savedCount++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Task B subset] ${savedCount}/${allResults.length}개 저장 완료 (${elapsed}초)`);

  await logTaskResult({
    functionName: 'daily-briefing',
    taskName: `Task B (subset ${startIdx}-${endIdx})`,
    status: 'SUCCESS',
    elapsedMs: Date.now() - startTime,
    resultSummary: { analyzed: allResults.length, saved: savedCount },
  });

  return allResults;
}

export async function analyzeAllStocks(): Promise<StockQuantResult[]> {
  const startTime = Date.now();
  const BATCH_SIZE = 7;  // 5→7로 증가: 배치 수 7→5로 줄여서 150s 타임아웃 방지
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

      // Rate limit 방지: 배치 간 1초 대기 (타임아웃 방지 위해 단축)
      if (i + BATCH_SIZE < STOCK_LIST.length) {
        console.log(`[Task B] 다음 배치까지 1초 대기...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // ── DB 저장: stock_quant_reports UPSERT ──
    const todayDate = getKSTDate();
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
