/**
 * usePrices — 실시간 가격 조회 훅 (TanStack Query 기반)
 *
 * [개선 이력]
 * 이전: useState + setInterval → 탭 간 캐시 미공유, 장외시간 불필요 API 호출
 * 현재: TanStack Query → 캐시 공유, 시장 개장 시간 인식, 선택적 리렌더링
 *
 * [시장 시간 인식] (로케일 기반)
 * - 한국어 로케일: 한국 주식 개장(KST 09:00~15:30 = UTC 00:00~06:30) 우선
 * - 영어 로케일: 미국 주식 개장(EST 09:30~16:00 = UTC 14:30~21:00) 우선
 * - 혼합 포트폴리오: 어느 쪽 시장이든 개장 중이면 2분 갱신 적용
 * - 암호화폐: 로케일 무관 24시간 → 항상 2분마다
 * - 주말/장외: 주식은 10분, 암호화폐는 2분
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { PriceData, AssetClass } from '../types/price';
import { Asset } from '../types/asset';
import { priceService } from '../services/PriceService';
import { isKoreanLocale } from '../utils/formatters';

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

/** UTC 기준 분(minutes) 반환 — KST/EST 오프셋 계산에 사용 */
function getUTCMinutes(): number {
  const now = new Date();
  return now.getUTCDay() * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes();
}

/**
 * 자산 유형별 갱신 주기 계산 (ms)
 *
 * 로케일 기반 주요 시장 판별:
 * - 한국어 로케일: 한국 주식 개장(KST 09:00~15:30) → 2분 갱신
 * - 영어 로케일: 미국 주식 개장(EST 09:30~16:00 = UTC 14:30~21:00) → 2분 갱신
 * - 양쪽 로케일 모두: 상대 시장도 개장 중이면 2분 적용 (포트폴리오 혼합 대비)
 * - 암호화폐: 로케일 무관 24시간 → 2분 갱신
 */
function getRefreshInterval(tickers: string[]): number {
  if (tickers.length === 0) return 0;

  const hasCrypto = tickers.some(t => inferAssetClass(t) === AssetClass.CRYPTO);
  const hasStock = tickers.some(t => {
    const cls = inferAssetClass(t);
    return cls === AssetClass.STOCK || cls === AssetClass.ETF;
  });

  // UTC 기반 요일+시각으로 각 시장 개장 여부 판단
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=일, 6=토
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcTimeInMinutes = utcHour * 60 + utcMinute;
  const isWeekday = utcDay >= 1 && utcDay <= 5;

  // 한국 주식 개장: KST 09:00~15:30 = UTC 00:00~06:30 (0~390분)
  const krMarketOpen = isWeekday && utcTimeInMinutes >= 0 && utcTimeInMinutes <= 390;

  // 미국 주식 개장: EST 09:30~16:00 = UTC 14:30~21:00 (870~1260분)
  // 서머타임 적용 시 UTC 13:30~20:00이지만 보수적으로 14:30~21:00 사용
  const usMarketOpen = isWeekday && utcTimeInMinutes >= 870 && utcTimeInMinutes <= 1260;

  // 로케일 기반 주요 시장 우선 결정
  const isKorean = isKoreanLocale();
  const primaryMarketOpen = isKorean ? krMarketOpen : usMarketOpen;
  const secondaryMarketOpen = isKorean ? usMarketOpen : krMarketOpen;

  // 주요 또는 보조 시장 개장 중이면 빠른 갱신 (혼합 포트폴리오 지원)
  const stockMarketOpen = primaryMarketOpen || secondaryMarketOpen;

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
