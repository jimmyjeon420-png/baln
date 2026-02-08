/**
 * Custom Hook: Real-Time Price Fetching
 * Manages price data fetching, caching, and auto-refresh
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { PriceData, AssetClass } from '../types/price';
import { Asset } from '../types/asset';
import { priceService } from '../services/PriceService';

/**
 * 티커 심볼에서 자산 클래스 자동 추론
 *
 * 판별 순서:
 * 1. 한국 주식: 6자리 숫자 또는 .KS/.KQ 접미사 → STOCK
 * 2. 암호화폐: BTC, ETH 등 키워드 → CRYPTO
 * 3. ETF: VTI, VOO 등 키워드 → ETF
 * 4. 기본값: STOCK (미국 주식 등)
 */
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

  // 기본값: 주식 (미국 등)
  return AssetClass.STOCK;
};

interface UsePricesOptions {
  currency?: string;          // Target currency (e.g., 'USD')
  autoRefreshMs?: number;     // Auto-refresh interval in ms (0 to disable)
  enableCache?: boolean;      // Use cached prices
  onError?: (error: Error) => void; // Error callback
}

interface UsePricesReturn {
  prices: Record<string, PriceData>;   // Map of ticker -> price data
  isLoading: boolean;                   // Loading state
  error: string | null;                 // Error message if any
  refresh: (ticker?: string) => Promise<void>; // Manual refresh function
  lastRefreshTime: number | null;       // Timestamp of last successful refresh
  isRefreshing: boolean;                // Currently refreshing
}

/**
 * Hook for fetching and managing real-time asset prices
 * Automatically detects asset class (crypto, stock, etf)
 * Handles caching and auto-refresh intervals
 */
export const usePrices = (
  assets: Asset[],
  options: UsePricesOptions = {}
): UsePricesReturn => {
  const {
    currency = 'USD',
    autoRefreshMs = 300000, // 5 minutes default
    enableCache = true,
    onError,
  } = options;

  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);

  // Keep track of in-flight requests to avoid duplicates
  const requestsInFlightRef = useRef<Set<string>>(new Set());
  // Keep track of auto-refresh interval
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Main function to fetch prices
   * Separates assets by class and fetches from appropriate providers
   */
  const fetchPrices = useCallback(
    async (tickerOverride?: string) => {
      // Validate inputs
      const assetsToFetch = assets.filter(
        (a) => a.ticker && (tickerOverride ? a.ticker === tickerOverride : true)
      );

      if (assetsToFetch.length === 0) {
        setIsLoading(false);
        return;
      }

      if (!tickerOverride) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsRefreshing(true);
      }

      try {
        // Get all assets with tickers (both liquid and illiquid)
        const assetsWithTickers = assetsToFetch.filter((a) => a.ticker);
        const allPrices: PriceData[] = [];

        // Fetch prices for each asset (grouped by inferred asset class)
        if (assetsWithTickers.length > 0) {
          // Try to fetch prices for all assets
          // Asset class is inferred from ticker patterns
          const priceResults = await Promise.allSettled(
            assetsWithTickers.map(async (asset) => {
              try {
                // Infer asset class from ticker or use CRYPTO as default
                // TODO: Enhance ticker analysis to detect stocks/ETFs
                const assetClass = inferAssetClass(asset.ticker!);

                const price = await priceService.fetchPrice(
                  asset.ticker!,
                  assetClass,
                  currency
                );
                return price;
              } catch (err) {
                console.warn(
                  `[usePrices] Price fetch failed for ${asset.ticker}:`,
                  err instanceof Error ? err.message : String(err)
                );
                return null;
              }
            })
          );

          // Collect successful results
          priceResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              allPrices.push(result.value);
            }
          });
        }

        // Create price map
        const priceMap = allPrices.reduce(
          (acc, priceData) => {
            acc[priceData.ticker] = priceData;
            return acc;
          },
          {} as Record<string, PriceData>
        );

        setPrices(priceMap);
        setLastRefreshTime(Date.now());
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        if (onError && err instanceof Error) {
          onError(err);
        }
        console.error('[usePrices] Fetch error:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [assets, currency, onError]
  );

  /**
   * Initial fetch on component mount
   */
  useEffect(() => {
    if (assets.length > 0) {
      fetchPrices();
    }
    // fetchPrices is memoized with useCallback, but we exclude it from dependencies
    // to avoid unnecessary re-triggers when fetchPrices identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length, currency]);

  /**
   * Set up auto-refresh interval
   */
  useEffect(() => {
    if (autoRefreshMs <= 0 || assets.length === 0) {
      return;
    }

    // Clear existing interval
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    // Set new interval
    autoRefreshIntervalRef.current = setInterval(() => {
      fetchPrices();
    }, autoRefreshMs);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefreshMs, assets, fetchPrices]);

  /**
   * Wrapped refresh function for manual refreshing
   */
  const refresh = useCallback(
    async (ticker?: string) => {
      // Avoid duplicate requests
      if (ticker && requestsInFlightRef.current.has(ticker)) {
        return;
      }

      if (ticker) {
        requestsInFlightRef.current.add(ticker);
      }

      try {
        // Clear cache for this ticker before refetching
        if (ticker) {
          priceService.clearCache(ticker);
        } else {
          priceService.clearCache(); // Clear all cache
        }

        await fetchPrices(ticker);
      } finally {
        if (ticker) {
          requestsInFlightRef.current.delete(ticker);
        }
      }
    },
    [fetchPrices]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  return {
    prices,
    isLoading,
    isRefreshing,
    error,
    refresh,
    lastRefreshTime,
  };
};
