/**
 * Price Service Orchestrator
 * Manages price providers, caching, and error handling
 * Supports both stocks and cryptocurrencies
 */

import { PriceData, AssetClass, PriceServiceError } from '../types/price';
import { priceCache } from './priceCache';
import { coinGeckoProvider } from './priceProviders/CoinGeckoProvider';
import { getPrice as getMockPrice } from './mockMarketData';

/**
 * Central service for fetching and caching asset prices
 * Auto-detects asset class and routes to appropriate provider
 */
export class PriceService {
  private errorLog: PriceServiceError[] = [];
  private readonly maxErrorLogSize = 100;

  /**
   * Fetch price for a single asset
   * Checks cache first, then fetches from appropriate provider
   * @param ticker - Asset ticker symbol
   * @param assetClass - Type of asset (crypto, stock, etf)
   * @param currency - Target currency code (default: USD)
   */
  async fetchPrice(
    ticker: string,
    assetClass: AssetClass,
    currency: string = 'USD'
  ): Promise<PriceData> {
    // Check cache first
    const cached = priceCache.get(ticker);
    if (cached && cached.currency === currency) {
      return cached;
    }

    // Crypto prices from CoinGecko
    if (assetClass === AssetClass.CRYPTO) {
      try {
        const price = await coinGeckoProvider.fetchPrice(ticker, currency);
        priceCache.set(ticker, price, 300); // 5-minute cache
        return price;
      } catch (error) {
        this.logError(error, ticker);
        throw error;
      }
    }

    // Stocks/ETFs: Use mock market data or manual input
    if (assetClass === AssetClass.STOCK || assetClass === AssetClass.ETF) {
      try {
        // Try to get mock price data
        const mockPrice = getMockPrice(ticker);
        if (mockPrice) {
          const priceData: PriceData = {
            ticker,
            assetClass,
            currentPrice: mockPrice,
            currency,
            lastUpdated: Date.now(),
            source: 'stock-api',
          };
          priceCache.set(ticker, priceData, 3600); // 1-hour cache for mock data
          return priceData;
        }
      } catch (error) {
        console.warn(`[PriceService] Mock data not available for ${ticker}:`, error);
      }
      throw new Error(
        `UNSUPPORTED: ${ticker} price not found. Please enter the price manually or check the ticker symbol.`
      );
    }

    // Real estate requires manual input
    if (assetClass === AssetClass.REAL_ESTATE) {
      throw new Error(
        'INVALID_ASSET_CLASS: Real estate prices must be entered manually'
      );
    }

    throw new Error(
      `UNSUPPORTED: Unknown asset class ${assetClass}`
    );
  }

  /**
   * Fetch prices for multiple assets
   * Efficiently handles caching and batch requests
   * @param tickers - Array of ticker symbols
   * @param assetClass - Type of assets
   * @param currency - Target currency
   */
  async fetchPrices(
    tickers: string[],
    assetClass: AssetClass,
    currency: string = 'USD'
  ): Promise<PriceData[]> {
    // Separate cached from uncached
    const cached: PriceData[] = [];
    const uncached: string[] = [];

    tickers.forEach((ticker) => {
      const cachedPrice = priceCache.get(ticker);
      if (cachedPrice && cachedPrice.currency === currency) {
        cached.push(cachedPrice);
      } else {
        uncached.push(ticker);
      }
    });

    // Fetch uncached prices
    let fetched: PriceData[] = [];

    if (uncached.length > 0) {
      if (assetClass === AssetClass.CRYPTO) {
        try {
          fetched = await coinGeckoProvider.fetchPrices(uncached, currency);
          fetched.forEach((price) => {
            priceCache.set(price.ticker, price, 300);
          });
        } catch (error) {
          console.warn('[PriceService] Batch fetch failed:', error);
          // Fallback to individual fetches
          const individualResults = await Promise.allSettled(
            uncached.map((ticker) =>
              this.fetchPrice(ticker, assetClass, currency)
            )
          );

          fetched = individualResults
            .filter((result) => result.status === 'fulfilled')
            .map((result) => (result as PromiseFulfilledResult<PriceData>).value);
        }
      } else if (assetClass === AssetClass.STOCK || assetClass === AssetClass.ETF) {
        // Try mock data for stocks/ETFs
        try {
          for (const ticker of uncached) {
            const mockPrice = getMockPrice(ticker);
            if (mockPrice) {
              const priceData: PriceData = {
                ticker,
                assetClass,
                currentPrice: mockPrice,
                currency,
                lastUpdated: Date.now(),
                source: 'stock-api',
              };
              fetched.push(priceData);
              priceCache.set(ticker, priceData, 3600);
            }
          }
        } catch (error) {
          console.warn('[PriceService] Mock data fetch failed:', error);
        }
      } else {
        throw new Error(
          `Cannot fetch ${assetClass} prices without API key`
        );
      }
    }

    return [...cached, ...fetched];
  }

  /**
   * Clear cache for specific ticker
   */
  clearCache(ticker?: string): void {
    if (ticker) {
      priceCache.remove(ticker);
    } else {
      priceCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return priceCache.getStats();
  }

  /**
   * Get price cache age (seconds)
   * Useful for showing "last updated" timestamps
   */
  getCacheAge(ticker: string): number | null {
    return priceCache.getAge(ticker);
  }

  /**
   * Get error log (last 50 errors)
   */
  getErrorLog(): PriceServiceError[] {
    return this.errorLog.slice(-50);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get provider status
   */
  async getProviderStatus(): Promise<{
    coingecko: boolean;
  }> {
    return {
      coingecko: await coinGeckoProvider.isAvailable(),
    };
  }

  /**
   * Log error for debugging/monitoring
   */
  private logError(error: any, ticker: string): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const code = this.extractErrorCode(errorMsg);

    this.errorLog.push({
      code,
      message: errorMsg,
      ticker,
      timestamp: Date.now(),
    });

    // Keep error log bounded
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxErrorLogSize);
    }
  }

  /**
   * Extract error code from error message
   */
  private extractErrorCode(message: string): PriceServiceError['code'] {
    if (message.includes('TIMEOUT')) return 'TIMEOUT';
    if (message.includes('RATE_LIMITED')) return 'RATE_LIMITED';
    if (message.includes('NOT_FOUND')) return 'NOT_FOUND';
    if (message.includes('INVALID_TICKER')) return 'INVALID_TICKER';
    return 'NETWORK_ERROR';
  }
}

/**
 * Global price service instance (singleton)
 */
export const priceService = new PriceService();
