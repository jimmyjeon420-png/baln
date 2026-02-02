/**
 * CoinGecko Price Provider
 * Fetches real-time cryptocurrency prices via CoinGecko API (no authentication required)
 */

import axios, { AxiosError } from 'axios';
import { PriceData, AssetClass } from '../../types/price';

interface CoinGeckoQuote {
  [key: string]: any;
}

interface CoinGeckoResponse {
  [coinId: string]: CoinGeckoQuote;
}

export class CoinGeckoProvider {
  readonly name = 'CoinGecko';
  private readonly baseURL = 'https://api.coingecko.com/api/v3';
  private readonly timeout = 8000; // 8 seconds
  private requestCount = 0;
  private lastRequestTime = 0;

  /**
   * Check if provider supports cryptocurrency assets
   */
  supportsAssetClass(assetClass: string): boolean {
    return assetClass === 'crypto';
  }

  /**
   * Check if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/ping`, {
        timeout: this.timeout,
      });
      return response.status === 200;
    } catch (error) {
      console.warn('[CoinGecko] API unavailable:', error);
      return false;
    }
  }

  /**
   * Fetch price for single cryptocurrency
   * @param ticker - Crypto ticker (e.g., 'BTC', 'ETH')
   * @param currency - Target currency (e.g., 'USD', 'EUR')
   */
  async fetchPrice(ticker: string, currency: string = 'usd'): Promise<PriceData> {
    await this.rateLimit();

    const coinId = this.mapTickerToCoinGeckoId(ticker);
    const currencyLower = currency.toLowerCase();

    try {
      const response = await axios.get<CoinGeckoResponse>(
        `${this.baseURL}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: currencyLower,
            include_market_cap: true,
            include_24hr_vol: true,
            include_24hr_change: true,
          },
          timeout: this.timeout,
          headers: {
            'User-Agent': 'PortfolioRebalancer/1.0',
          },
        }
      );

      const data = response.data[coinId];
      if (!data || !data[currencyLower]) {
        throw new Error(`NOT_FOUND: ${ticker}`);
      }

      const price = data[currencyLower];
      const marketCap = data[`${currencyLower}_market_cap`];
      const volume = data[`${currencyLower}_24h_vol`];
      const change = data[`${currencyLower}_24h_change`];

      return {
        ticker,
        assetClass: AssetClass.CRYPTO,
        currentPrice: price,
        percentChange24h: change,
        currency,
        marketCap,
        volume24h: volume,
        lastUpdated: Date.now(),
        source: 'coingecko',
      };
    } catch (error) {
      throw this.formatError(error as AxiosError, ticker);
    }
  }

  /**
   * Fetch prices for multiple cryptocurrencies
   * @param tickers - Array of crypto tickers
   * @param currency - Target currency
   */
  async fetchPrices(tickers: string[], currency: string = 'usd'): Promise<PriceData[]> {
    await this.rateLimit();

    const coinIds = tickers
      .map(t => this.mapTickerToCoinGeckoId(t))
      .join(',');

    const currencyLower = currency.toLowerCase();

    try {
      const response = await axios.get<CoinGeckoResponse>(
        `${this.baseURL}/simple/price`,
        {
          params: {
            ids: coinIds,
            vs_currencies: currencyLower,
            include_market_cap: true,
            include_24hr_vol: true,
            include_24hr_change: true,
          },
          timeout: this.timeout,
          headers: {
            'User-Agent': 'PortfolioRebalancer/1.0',
          },
        }
      );

      return tickers
        .map((ticker) => {
          const coinId = this.mapTickerToCoinGeckoId(ticker);
          const data = response.data[coinId];

          if (!data) {
            console.warn(`[CoinGecko] No data for ${ticker}`);
            return null;
          }

          const price = data[currencyLower];
          const marketCap = data[`${currencyLower}_market_cap`];
          const volume = data[`${currencyLower}_24h_vol`];
          const change = data[`${currencyLower}_24h_change`];

          return {
            ticker,
            assetClass: AssetClass.CRYPTO,
            currentPrice: price,
            percentChange24h: change,
            currency,
            marketCap,
            volume24h: volume,
            lastUpdated: Date.now(),
            source: 'coingecko' as const,
          };
        })
        .filter((item) => item !== null) as PriceData[];
    } catch (error) {
      throw this.formatError(error as AxiosError, tickers[0]);
    }
  }

  /**
   * Map ticker symbol to CoinGecko coin ID
   * Supports common cryptocurrencies
   */
  private mapTickerToCoinGeckoId(ticker: string): string {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'SOL': 'solana',
      'DOGE': 'dogecoin',
      'MATIC': 'matic-network',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
      'XLM': 'stellar',
      'LINK': 'chainlink',
      'DOT': 'polkadot',
      'AVAX': 'avalanche-2',
      'ATOM': 'cosmos',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'SUSHI': 'sushi',
    };

    return mapping[ticker.toUpperCase()] || ticker.toLowerCase();
  }

  /**
   * Format API errors into readable messages
   */
  private formatError(error: AxiosError, ticker: string): Error {
    const message = `[CoinGecko] ${ticker}`;

    if (error.code === 'ECONNABORTED') {
      return new Error(`TIMEOUT: ${message}`);
    }

    if (error.response?.status === 429) {
      return new Error(`RATE_LIMITED: ${message} - Too many requests`);
    }

    if (error.response?.status === 404) {
      return new Error(`NOT_FOUND: ${message}`);
    }

    if (error.code === 'ECONNREFUSED') {
      return new Error(`NETWORK_ERROR: ${message} - Connection refused`);
    }

    return new Error(`NETWORK_ERROR: ${message}`);
  }

  /**
   * Simple rate limiting (no auth required, but respectful)
   * CoinGecko free tier: ~10-50 calls/minute
   */
  private async rateLimit(): Promise<void> {
    const minInterval = 100; // 100ms between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Get provider stats
   */
  getStats() {
    return {
      name: this.name,
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }
}

/**
 * Export singleton instance
 */
export const coinGeckoProvider = new CoinGeckoProvider();
