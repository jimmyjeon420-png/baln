/**
 * Price Cache Layer
 * In-memory caching for price data with TTL support
 */

import { PriceData, PriceCache as ICacheEntry } from '../types/price';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL (Time-To-Live) support
 * Automatically removes expired entries
 */
export class PriceCache {
  private cache = new Map<string, CacheEntry<PriceData>>();
  private defaultTTL: number; // seconds
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ttlSeconds: number = 300) { // 5 minutes default
    this.defaultTTL = ttlSeconds;
    // Clean up expired entries every minute
    this.startCleanup();
  }

  /**
   * Get cached price data
   * @param ticker - Asset ticker symbol
   * @returns Cached price data or undefined if expired/not found
   */
  get(ticker: string): PriceData | undefined {
    const key = this.normalizeKey(ticker);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Set cached price data with optional TTL
   * @param ticker - Asset ticker symbol
   * @param data - Price data to cache
   * @param ttl - Time-to-live in seconds (optional)
   */
  set(ticker: string, data: PriceData, ttl?: number): void {
    const key = this.normalizeKey(ticker);
    const expiresAt = Date.now() + ((ttl || this.defaultTTL) * 1000);

    this.cache.set(key, {
      data,
      expiresAt,
    });
  }

  /**
   * Check if ticker is cached and not expired
   * @param ticker - Asset ticker symbol
   * @returns True if cached and valid
   */
  has(ticker: string): boolean {
    return this.get(ticker) !== undefined;
  }

  /**
   * Remove specific cached entry
   * @param ticker - Asset ticker symbol
   */
  remove(ticker: string): void {
    const key = this.normalizeKey(ticker);
    this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        ticker: key,
        expiresIn: Math.round((entry.expiresAt - Date.now()) / 1000),
      })),
    };
  }

  /**
   * Get multiple cached prices
   * @param tickers - Array of ticker symbols
   * @returns Object mapping ticker to cached price (only valid entries)
   */
  getBatch(tickers: string[]): Record<string, PriceData> {
    return tickers.reduce((acc, ticker) => {
      const data = this.get(ticker);
      if (data) {
        acc[ticker] = data;
      }
      return acc;
    }, {} as Record<string, PriceData>);
  }

  /**
   * Get age of cached entry in seconds
   * @param ticker - Asset ticker symbol
   * @returns Age in seconds or null if not cached
   */
  getAge(ticker: string): number | null {
    const key = this.normalizeKey(ticker);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const expiresIn = entry.expiresAt - Date.now();
    if (expiresIn <= 0) {
      this.cache.delete(key);
      return null;
    }

    const ttl = this.defaultTTL * 1000;
    return Math.round((ttl - expiresIn) / 1000);
  }

  /**
   * Normalize ticker key (uppercase)
   */
  private normalizeKey(ticker: string): string {
    return ticker.toUpperCase();
  }

  /**
   * Start automatic cleanup of expired entries
   * Runs every 60 seconds
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let removed = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        if (__DEV__) console.log(`[PriceCache] Cleaned up ${removed} expired entries`);
      }
    }, 60000); // 1 minute
  }

  /**
   * Stop cleanup interval and release resources
   * Call this when cleaning up the cache
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Global price cache instance
 * Singleton pattern for app-wide use
 */
export const priceCache = new PriceCache(300); // 5-minute default TTL
