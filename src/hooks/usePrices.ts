/**
 * usePrices — 실시간 가격 조회 훅 (TanStack Query 기반)
 *
 * [개선 이력]
 * 이전: useState + setInterval → 탭 간 캐시 미공유, 장외시간 불필요 API 호출
 * 현재: TanStack Query → 캐시 공유, 시장 개장 시간 인식, 선택적 리렌더링
 *
 * [시장 시간 인식]
 * - 한국 주식: 평일 09:00~15:30 KST → 개장 중 2분마다, 장외 10분
 * - 미국 주식: 평일 23:30~06:00 KST → 개장 중 2분마다, 장외 10분
 * - 암호화폐: 24시간 → 항상 5분마다
 * - 주말: 주식은 10분, 암호화폐는 5분
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { PriceData, AssetClass } from '../types/price';
import { Asset } from '../types/asset';
import { priceService } from '../services/PriceService';

// ── 쿼리 키 (외부에서 invalidate 할 때 사용) ──
export const LIVE_PRICES_KEY = ['live-prices'];

// ── 티커 → 자산 클래스 추론 ──

const inferAssetClass = (ticker: string): AssetClass => {
  const upperTicker = ticker.toUpperCase();

  // 한국 주식: 005930.KS, 035720.KQ, 또는 순수 6자리 숫자
  if (/^\d{6}(\.KS|\.KQ)?$/i.test(upperTicker) || upperTicker.endsWith('.KS') || upperTicker.endsWith('.KQ')) {
    return AssetClass.STOCK;
  }

  // 암호화폐 키워드
  const cryptoKeywords = [
    'BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'XRP',
    'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK',
    'BNB', 'MATIC', 'LTC', 'BCH', 'XLM',
    'ATOM', 'UNI', 'AAVE', 'SUSHI',
  ];
  if (cryptoKeywords.some((kw) => upperTicker.includes(kw))) {
    return AssetClass.CRYPTO;
  }

  // ETF 키워드
  const etfKeywords = ['VTI', 'VOO', 'QQQ', 'AGG', 'SPY', 'IVV', 'ARKK'];
  if (etfKeywords.some((kw) => upperTicker === kw)) {
    return AssetClass.ETF;
  }

  return AssetClass.STOCK;
};

// ── 시장 개장 시간 판별 ──

/** 한국 시간(KST) 기준 현재 시각 반환 */
function getKSTDate(): Date {
  const now = new Date();
  // UTC + 9시간
  return new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60 * 1000);
}

/** 자산 유형별 갱신 주기 계산 (ms) */
function getRefreshInterval(tickers: string[]): number {
  if (tickers.length === 0) return 0;

  const hasCrypto = tickers.some(t => inferAssetClass(t) === AssetClass.CRYPTO);
  const hasStock = tickers.some(t => {
    const cls = inferAssetClass(t);
    return cls === AssetClass.STOCK || cls === AssetClass.ETF;
  });

  const kst = getKSTDate();
  const day = kst.getDay(); // 0=일, 6=토
  const hour = kst.getHours();
  const minute = kst.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  const isWeekday = day >= 1 && day <= 5;

  // 한국 주식 개장: 평일 09:00~15:30 (540~930분)
  const krMarketOpen = isWeekday && timeInMinutes >= 540 && timeInMinutes <= 930;
  // 미국 주식 개장: 평일 23:30~06:00 KST 다음날 (1410~360분, 자정 걸침)
  const usMarketOpen = isWeekday && (timeInMinutes >= 1410 || timeInMinutes <= 360);

  const stockMarketOpen = krMarketOpen || usMarketOpen;

  if (hasStock && stockMarketOpen) {
    // 장중: 2분마다 (빠른 갱신)
    return 2 * 60 * 1000;
  }

  if (hasCrypto) {
    // 암호화폐: 24시간 시장이므로 주식 장중과 동일하게 2분
    return 2 * 60 * 1000;
  }

  // 장외/주말: 10분
  return 10 * 60 * 1000;
}

// ── 가격 일괄 조회 함수 ──

async function fetchPricesForTickers(
  tickers: string[],
  currency: string,
): Promise<Record<string, PriceData>> {
  if (tickers.length === 0) return {};

  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      try {
        const assetClass = inferAssetClass(ticker);
        return await priceService.fetchPrice(ticker, assetClass, currency);
      } catch (err) {
        console.warn(`[usePrices] 가격 조회 실패 ${ticker}:`, err instanceof Error ? err.message : String(err));
        return null;
      }
    })
  );

  const priceMap: Record<string, PriceData> = {};
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      priceMap[result.value.ticker] = result.value;
    }
  });

  return priceMap;
}

// ── 훅 인터페이스 (기존 호환) ──

interface UsePricesOptions {
  currency?: string;
  autoRefreshMs?: number;  // 사용하지 않음 (시장 시간 자동 감지로 대체)
  enableCache?: boolean;
  onError?: (error: Error) => void;
}

interface UsePricesReturn {
  prices: Record<string, PriceData>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastRefreshTime: number | null;
  isRefreshing: boolean;
}

/**
 * 실시간 가격 조회 훅 (TanStack Query 기반)
 *
 * 기존 인터페이스 호환: { prices, isLoading, error, refresh, lastRefreshTime, isRefreshing }
 * 개선: 탭 간 캐시 공유, 시장 개장 시간 인식, 불필요한 리렌더링 방지
 */
export const usePrices = (
  assets: Asset[],
  options: UsePricesOptions = {}
): UsePricesReturn => {
  const { currency = 'USD' } = options;
  const queryClient = useQueryClient();

  // 티커 목록을 안정적 키로 변환 (배열 참조 변경에 무관하게 동작)
  const tickers = useMemo(() =>
    assets.filter(a => a.ticker).map(a => a.ticker!).sort(),
  [assets]);

  const tickerKey = tickers.join(',');

  // 시장 시간 기반 갱신 주기
  const refetchInterval = useMemo(() => getRefreshInterval(tickers), [tickerKey]);

  const query = useQuery({
    queryKey: [...LIVE_PRICES_KEY, tickerKey, currency],
    queryFn: () => fetchPricesForTickers(tickers, currency),
    enabled: tickers.length > 0,
    staleTime: 60 * 1000,           // 1분: 최소 신선도
    gcTime: 10 * 60 * 1000,         // 10분: 가비지 컬렉션
    refetchInterval,                 // 시장 시간에 따라 2분/5분/10분
    refetchIntervalInBackground: false, // 백그라운드에서는 갱신 안 함
    retry: 1,
  });

  const refresh = async () => {
    priceService.clearCache();
    await queryClient.invalidateQueries({ queryKey: LIVE_PRICES_KEY });
  };

  return {
    prices: query.data ?? {},
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Unknown error') : null,
    refresh,
    lastRefreshTime: query.dataUpdatedAt || null,
  };
};
