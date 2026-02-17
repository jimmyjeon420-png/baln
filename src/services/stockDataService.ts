/**
 * Stock Data Service - Yahoo Finance v10 API 재무 데이터 조회
 *
 * 역할: 딥다이브 분석 시 실제 재무 팩트 데이터를 API에서 가져옴
 * Gemini가 추측하던 시가총액, PER, PBR 등을 실제 값으로 대체
 *
 * [핵심] 미국 주식은 실시간 환율로 원화 자동환산
 * - 시가총액, 분기별 매출/순이익 등 금액 데이터를 ₩로 표시
 * - 환율은 Yahoo Finance USDKRW=X 실시간 조회 (30분 캐시)
 *
 * API: Yahoo Finance v10 quoteSummary (인증 불필요)
 * 기존 패턴: YahooFinanceProvider.ts의 toYahooSymbol(), rateLimit() 재사용
 */

import axios from 'axios';

// ============================================================================
// 타입 정의 (marketplace.ts와 동일 — re-export)
// ============================================================================

export type { StockFundamentals } from '../types/marketplace';
import type { StockFundamentals } from '../types/marketplace';

// ============================================================================
// Yahoo Finance 심볼 변환 (YahooFinanceProvider.ts와 동일 로직)
// ============================================================================

function toYahooSymbol(ticker: string): string {
  if (/\.(KS|KQ|T|L|HK)$/i.test(ticker)) {
    return ticker.toUpperCase();
  }
  if (/^\d{6}$/.test(ticker)) {
    return `${ticker}.KS`;
  }
  return ticker.toUpperCase().replace(/\./g, '-');
}

/** 한국 주식인지 판별 */
function isKoreanStock(ticker: string): boolean {
  return /^\d{6}(\.KS|\.KQ)?$/i.test(ticker);
}

// ============================================================================
// Rate Limiting
// ============================================================================

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const minInterval = 300;
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
  }
  lastRequestTime = Date.now();
}

// ============================================================================
// 실시간 환율 조회 (USD/KRW) — 10분 캐시, 3중 백업
// ============================================================================

let cachedRate: number | null = null;
let cachedRateTime = 0;
const RATE_CACHE_TTL = 10 * 60 * 1000; // 10분 (기존 30분 → 더 자주 갱신)

/** Yahoo Finance (1순위) */
async function fetchRateYahoo(): Promise<number> {
  const res = await axios.get(
    'https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X',
    {
      params: { interval: '1d', range: '1d' },
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Baln/1.0)' },
    }
  );
  const rate = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (rate && rate > 1000) return rate;
  throw new Error('Yahoo: invalid rate');
}

/** ExchangeRate-API (2순위, 인증 불필요) */
async function fetchRateExchangeRateApi(): Promise<number> {
  const res = await axios.get(
    'https://open.er-api.com/v6/latest/USD',
    { timeout: 8000 }
  );
  const rate = res.data?.rates?.KRW;
  if (rate && rate > 1000) return rate;
  throw new Error('ExchangeRateAPI: invalid rate');
}

/** Frankfurter (3순위, ECB 데이터 기반) */
async function fetchRateFrankfurter(): Promise<number> {
  const res = await axios.get(
    'https://api.frankfurter.app/latest?from=USD&to=KRW',
    { timeout: 8000 }
  );
  const rate = res.data?.rates?.KRW;
  if (rate && rate > 1000) return rate;
  throw new Error('Frankfurter: invalid rate');
}

/**
 * USD/KRW 실시간 환율 조회 — 3중 백업 구조
 * 1순위: Yahoo Finance, 2순위: ExchangeRate-API, 3순위: Frankfurter
 * 캐시: 10분 (앱 실행 중 자동 갱신)
 */
export async function fetchExchangeRate(): Promise<number> {
  // 캐시 유효하면 그대로 반환
  if (cachedRate && (Date.now() - cachedRateTime) < RATE_CACHE_TTL) {
    return cachedRate;
  }

  const fetchers = [
    { name: 'Yahoo Finance', fn: fetchRateYahoo },
    { name: 'ExchangeRate-API', fn: fetchRateExchangeRateApi },
    { name: 'Frankfurter', fn: fetchRateFrankfurter },
  ];

  for (const { name, fn } of fetchers) {
    try {
      const rate = await fn();
      cachedRate = rate;
      cachedRateTime = Date.now();
      if (__DEV__) {
        console.log(`[ExchangeRate] USD/KRW = ${rate.toFixed(2)} (${name})`);
      }
      return rate;
    } catch (err: any) {
      console.warn(`[ExchangeRate] ${name} 실패:`, err.message);
    }
  }

  // 3곳 모두 실패 시 캐시 or 최후 폴백
  const fallback = cachedRate ?? 1450;
  console.warn(`[ExchangeRate] 모든 API 실패, 폴백 ${fallback}원 사용`);
  return fallback;
}

// ============================================================================
// 핵심 함수: Yahoo Finance v10 quoteSummary API 호출
// ============================================================================

/**
 * Yahoo Finance v10 quoteSummary API로 재무 데이터 조회
 * 미국 주식은 실시간 환율로 원화 자동환산
 *
 * @param ticker - 종목 티커 (예: TSLA, 005930, 005930.KS)
 * @param name - 종목 한국어 이름 (예: 테슬라)
 * @returns StockFundamentals 또는 null (조회 실패 시)
 */
export async function fetchStockFundamentals(
  ticker: string,
  name: string
): Promise<StockFundamentals | null> {
  const symbol = toYahooSymbol(ticker);
  const isKR = isKoreanStock(ticker);

  // [Step 0] 미국 주식이면 실시간 환율 먼저 조회
  let exchangeRate = 1; // 한국 주식은 환산 불필요
  if (!isKR) {
    exchangeRate = await fetchExchangeRate();
  }

  // 요청할 모듈 목록
  const modules = [
    'price',
    'summaryDetail',
    'defaultKeyStatistics',
    'financialData',
    'earningsHistory',
    'incomeStatementHistoryQuarterly',
  ].join(',');

  try {
    await rateLimit();

    if (__DEV__) {
      console.log(`[StockData] Fetching fundamentals for ${symbol}...` +
        (!isKR ? ` (환율 ${exchangeRate.toFixed(2)}원 적용)` : ''));
    }

    const response = await axios.get(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`,
      {
        params: { modules },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Baln/1.0)',
        },
      }
    );

    const result = response.data?.quoteSummary?.result?.[0];
    if (!result) {
      console.warn(`[StockData] No data for ${symbol}`);
      return null;
    }

    // 각 모듈에서 데이터 추출
    const price = result.price || {};
    const summaryDetail = result.summaryDetail || {};
    const keyStats = result.defaultKeyStatistics || {};
    const financialData = result.financialData || {};
    const incomeQuarterly = result.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];

    // Yahoo Finance는 값을 { raw: number, fmt: string } 형태로 반환
    const raw = (obj: any): number | undefined => {
      if (obj == null) return undefined;
      if (typeof obj === 'number') return obj;
      if (obj.raw != null) return obj.raw;
      return undefined;
    };

    // 시가총액
    const marketCapRaw = raw(price.marketCap);
    const currentPriceVal = raw(price.regularMarketPrice);
    const currencyVal = price.currency || (isKR ? 'KRW' : 'USD');

    // 환산 계수: 한국 주식은 1, 미국 주식은 실시간 환율
    const toKRW = currencyVal === 'KRW' ? 1 : exchangeRate;

    // 분기별 실적 파싱 + KRW 환산
    const quarterlyEarnings = incomeQuarterly.slice(0, 4).map((q: any) => {
      const endDate = q.endDate?.fmt || '';
      const dateObj = new Date(endDate);
      const year = dateObj.getFullYear();
      const qNum = Math.ceil((dateObj.getMonth() + 1) / 3);
      const revenue = raw(q.totalRevenue);
      const earnings = raw(q.netIncome);

      return {
        quarter: `${year}Q${qNum}`,
        date: endDate,
        revenue,
        earnings,
        revenueKRW: revenue != null ? Math.round(revenue * toKRW) : undefined,
        earningsKRW: earnings != null ? Math.round(earnings * toKRW) : undefined,
      };
    });

    const fundamentals: StockFundamentals = {
      ticker,
      name,

      // 밸류에이션
      marketCap: marketCapRaw,
      marketCapKRW: marketCapRaw != null ? Math.round(marketCapRaw * toKRW) : undefined,
      trailingPE: raw(summaryDetail.trailingPE),
      forwardPE: raw(summaryDetail.forwardPE),
      priceToBook: raw(keyStats.priceToBook),

      // 수익성
      returnOnEquity: raw(financialData.returnOnEquity),
      operatingMargins: raw(financialData.operatingMargins),
      profitMargins: raw(financialData.profitMargins),

      // 성장성
      revenueGrowth: raw(financialData.revenueGrowth),
      earningsGrowth: raw(financialData.earningsGrowth),

      // 재무 안정성
      debtToEquity: raw(financialData.debtToEquity),

      // 현재가
      currentPrice: currentPriceVal,
      currency: currencyVal,

      // 분기별 실적
      quarterlyEarnings: quarterlyEarnings.length > 0 ? quarterlyEarnings : undefined,

      // 환율
      exchangeRate: currencyVal !== 'KRW' ? exchangeRate : undefined,

      // 메타데이터
      fetchedAt: new Date().toISOString(),
      dataSource: 'yahoo_finance_v10',
    };

    if (__DEV__) {
      console.log(`[StockData] ${symbol} fundamentals:`, {
        marketCap: fundamentals.marketCap,
        marketCapKRW: fundamentals.marketCapKRW,
        PE: fundamentals.trailingPE,
        PB: fundamentals.priceToBook,
        ROE: fundamentals.returnOnEquity,
        exchangeRate: fundamentals.exchangeRate,
        quarters: fundamentals.quarterlyEarnings?.length || 0,
      });
    }

    return fundamentals;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.warn(`[StockData] TIMEOUT: ${symbol}`);
    } else if (error.response?.status === 429) {
      console.warn(`[StockData] RATE_LIMITED: ${symbol}`);
    } else if (error.response?.status === 404) {
      console.warn(`[StockData] NOT_FOUND: ${symbol}`);
    } else {
      console.warn(`[StockData] ERROR: ${symbol} -`, error.message);
    }

    return null;
  }
}

// ============================================================================
// 헬퍼: 금액 포맷 (조/억/만원 단위)
// ============================================================================

function formatKRW(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) {
    // 조 단위
    const jo = abs / 1_000_000_000_000;
    return `${sign}약 ${jo.toFixed(1)}조원`;
  }
  if (abs >= 100_000_000) {
    // 억 단위
    const eok = abs / 100_000_000;
    return `${sign}약 ${eok.toFixed(0)}억원`;
  }
  if (abs >= 10_000) {
    // 만 단위
    const man = abs / 10_000;
    return `${sign}약 ${man.toFixed(0)}만원`;
  }
  return `${sign}₩${abs.toLocaleString()}`;
}

// ============================================================================
// 헬퍼: 재무 데이터를 프롬프트용 텍스트로 변환
// ============================================================================

/**
 * StockFundamentals를 Gemini 프롬프트에 주입할 텍스트로 변환
 * 미국 주식은 원화(₩)로 환산된 값을 표시
 */
export function fundamentalsToPromptText(data: StockFundamentals): string {
  const lines: string[] = [];
  const isUSD = data.currency !== 'KRW';
  const rate = data.exchangeRate;

  lines.push(`=== ${data.name} (${data.ticker}) 실제 재무 데이터 ===`);
  lines.push(`[데이터 출처: Yahoo Finance API, 조회 시각: ${data.fetchedAt}]`);
  if (isUSD && rate) {
    lines.push(`[적용 환율: 1 USD = ${rate.toFixed(2)} KRW (실시간)]`);
  }
  lines.push('');

  // 시가총액
  if (data.marketCapKRW != null) {
    lines.push(`시가총액: ${formatKRW(data.marketCapKRW)}`);
    if (isUSD && data.marketCap != null) {
      lines.push(`  (원래 $${(data.marketCap / 1e9).toFixed(1)}B USD)`);
    }
  }

  // 현재가
  if (data.currentPrice != null) {
    if (isUSD && rate) {
      const priceKRW = Math.round(data.currentPrice * rate);
      lines.push(`현재 주가: ₩${priceKRW.toLocaleString()} ($${data.currentPrice.toLocaleString()})`);
    } else {
      lines.push(`현재 주가: ₩${data.currentPrice.toLocaleString()}`);
    }
  }

  // PER/PBR (비율이므로 환산 불필요)
  if (data.trailingPE != null) lines.push(`PER (Trailing): ${data.trailingPE.toFixed(2)}`);
  if (data.forwardPE != null) lines.push(`PER (Forward): ${data.forwardPE.toFixed(2)}`);
  if (data.priceToBook != null) lines.push(`PBR: ${data.priceToBook.toFixed(2)}`);

  // 수익성 (비율이므로 환산 불필요)
  if (data.returnOnEquity != null) lines.push(`ROE: ${(data.returnOnEquity * 100).toFixed(2)}%`);
  if (data.operatingMargins != null) lines.push(`영업이익률: ${(data.operatingMargins * 100).toFixed(2)}%`);
  if (data.profitMargins != null) lines.push(`순이익률: ${(data.profitMargins * 100).toFixed(2)}%`);

  // 성장성
  if (data.revenueGrowth != null) lines.push(`매출성장률(YoY): ${(data.revenueGrowth * 100).toFixed(2)}%`);
  if (data.earningsGrowth != null) lines.push(`이익성장률: ${(data.earningsGrowth * 100).toFixed(2)}%`);

  // 재무 안정성
  if (data.debtToEquity != null) lines.push(`부채비율: ${data.debtToEquity.toFixed(2)}%`);

  // 분기별 실적 — 원화 표기
  if (data.quarterlyEarnings && data.quarterlyEarnings.length > 0) {
    lines.push('');
    lines.push('--- 분기별 실적 (최근 4분기, 원화 환산) ---');
    for (const q of data.quarterlyEarnings) {
      const revKRW = q.revenueKRW != null ? formatKRW(q.revenueKRW) : 'N/A';
      const earnKRW = q.earningsKRW != null ? formatKRW(q.earningsKRW) : 'N/A';
      lines.push(`${q.quarter} (${q.date}): 매출 ${revKRW}, 순이익 ${earnKRW}`);
    }
  }

  return lines.join('\n');
}
