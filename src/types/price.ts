/**
 * Real-Time Price & Market Data Type Definitions
 * Supports stocks, ETFs, and cryptocurrencies
 */

export enum AssetClass {
  STOCK = 'stock',
  CRYPTO = 'crypto',
  ETF = 'etf',
  REAL_ESTATE = 'real_estate'
}

export interface PriceData {
  ticker: string;
  assetClass: AssetClass;
  currentPrice: number;
  previousPrice?: number;
  priceChange24h?: number;      // dollar amount change
  percentChange24h?: number;    // percentage change
  currency: string;             // e.g., 'USD', 'KRW'
  marketCap?: number;
  volume24h?: number;
  lastUpdated: number;          // unix timestamp
  source: 'coingecko' | 'stock-api' | 'manual';
}

export interface PriceServiceOptions {
  currency?: string;
  cacheDurationMs?: number;     // default: 5 minutes
  timeout?: number;             // default: 8 seconds
}

export interface PriceServiceError {
  code: 'NETWORK_ERROR' | 'NOT_FOUND' | 'INVALID_TICKER' | 'RATE_LIMITED' | 'TIMEOUT';
  message: string;
  ticker: string;
  timestamp: number;
}

export interface PriceCache {
  ticker: string;
  data: PriceData;
  expiresAt: number;
}

export interface PriceChange {
  change: string;               // formatted price change
  percent: string;              // formatted percentage
  direction: 'up' | 'down' | 'neutral';
}
