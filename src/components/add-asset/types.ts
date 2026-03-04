/**
 * add-asset/types.ts — Shared types, constants, and utilities for the Add Asset feature
 */

import { StockItem } from '../../data/stockList';

// ── Types ──

export interface RecentAsset {
  ticker: string;
  name: string;
  category: StockItem['category'];
}

export interface ExistingAsset {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avg_price: number;
  current_value: number;
}

// ── Constants ──

export const LAST_SCAN_DATE_KEY = '@baln:last_scan_date';
export const RECENT_ASSETS_KEY = '@baln:recent_assets';
export const INPUT_ACCESSORY_ID = 'baln-number-done';

export const CASH_META: Record<string, { name: string; symbol: string }> = {
  CASH_KRW: { name: '원화 현금', symbol: '₩' },
  CASH_USD: { name: '달러 예금', symbol: '$' },
  CASH_CMA: { name: 'CMA·MMF', symbol: '₩' },
};

// ── Utilities ──

/** Format amount in KRW (Korean Won) with 억/만 units */
export function formatKRW(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (value >= 10000) return `${Math.floor(value / 10000).toLocaleString()}만`;
  return `${value.toLocaleString()}`;
}

/** Infer currency symbol from ticker */
export function getCurrencySymbol(ticker: string): string {
  const upper = ticker.toUpperCase();
  if (/^\d{6}(\.KS|\.KQ)?$/i.test(upper) || upper.endsWith('.KS') || upper.endsWith('.KQ')) {
    return '₩';
  }
  return '$';
}
