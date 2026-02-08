/**
 * useMarketTicker - 글로벌 시장 지표 실시간 수집 훅
 *
 * 역할: KOSPI, NASDAQ, BTC 등 주요 시장 지표를 Yahoo Finance에서 가져와
 *       전광판 위젯에 공급하는 "시장 데이터 수집 직원"
 *
 * 지표 목록:
 * - 한국: KOSPI, KOSDAQ
 * - 미국: S&P 500, NASDAQ
 * - 암호화폐: BTC, ETH
 * - 원자재: 금(Gold)
 * - 환율: USD/KRW
 *
 * 갱신 주기: 5분 (Yahoo Finance 무료 사용 예의)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface MarketTickerItem {
  symbol: string;       // Yahoo Finance 심볼 (^KS11 등)
  label: string;        // 화면 표시 이름 (KOSPI 등)
  price: number;        // 현재가
  changePercent: number; // 전일 대비 등락률 (%)
}

// 전광판에 표시할 글로벌 시장 지표
const MARKET_SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: '^KS11',   label: 'KOSPI' },
  { symbol: '^KQ11',   label: 'KOSDAQ' },
  { symbol: '^GSPC',   label: 'S&P500' },
  { symbol: '^IXIC',   label: 'NASDAQ' },
  { symbol: 'BTC-USD', label: 'BTC' },
  { symbol: 'ETH-USD', label: 'ETH' },
  { symbol: 'GC=F',    label: 'GOLD' },
  { symbol: 'KRW=X',   label: 'USD/KRW' },
];

/**
 * Yahoo Finance v8 Chart API로 단일 지표 가격 조회
 * 인증 불필요, React Native에서 직접 호출 가능
 */
async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  changePercent: number;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartRebalancer/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) return null;

    const json = await resp.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const changePercent = prevClose > 0
      ? ((price - prevClose) / prevClose) * 100
      : 0;

    return { price, changePercent };
  } catch {
    return null;
  }
}

/**
 * 글로벌 시장 전광판 데이터 훅
 * @param refreshMs 자동 갱신 주기 (기본 5분)
 */
export function useMarketTicker(refreshMs = 300000) {
  const [items, setItems] = useState<MarketTickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    // 각 지표를 병렬 조회 (실패해도 나머지는 표시)
    const results = await Promise.allSettled(
      MARKET_SYMBOLS.map(async ({ symbol, label }) => {
        // 요청 간 100ms 간격 (rate limit 방지)
        await new Promise(r => setTimeout(r, Math.random() * 200));

        const data = await fetchYahooQuote(symbol);
        if (!data) throw new Error(`Failed: ${symbol}`);

        return { symbol, label, price: data.price, changePercent: data.changePercent };
      })
    );

    if (!mountedRef.current) return;

    const successful = results
      .filter((r): r is PromiseFulfilledResult<MarketTickerItem> => r.status === 'fulfilled')
      .map(r => r.value);

    if (successful.length > 0) {
      setItems(successful);
      setLastUpdated(Date.now());
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();

    const interval = setInterval(fetchAll, refreshMs);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAll, refreshMs]);

  return { items, isLoading, lastUpdated, refresh: fetchAll };
}
