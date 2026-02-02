/**
 * Currency Formatting Utilities
 * Formats numbers and prices according to locale and currency settings
 */

import { LocalizationSettings } from '../types/i18n';
import { PriceChange } from '../types/price';

/**
 * Format number as currency with symbol
 * @param value - Numeric value to format
 * @param localization - Localization settings with currency info
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  localization: LocalizationSettings | null
): string => {
  if (!localization) {
    // Fallback to USD
    return `$${value.toFixed(2)}`;
  }

  try {
    const formatter = new Intl.NumberFormat(localization.locale, {
      style: 'currency',
      currency: localization.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(value);
  } catch (error) {
    // Fallback formatting if Intl fails
    console.warn('Currency formatting failed, using fallback:', error);
    return `${localization.currencySymbol}${value.toFixed(2)}`;
  }
};

/**
 * Format number with locale-specific separators
 * @param value - Numeric value to format
 * @param localization - Localization settings
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  localization: LocalizationSettings | null,
  decimals: number = 2
): string => {
  if (!localization) {
    return value.toFixed(decimals);
  }

  try {
    const formatter = new Intl.NumberFormat(localization.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return formatter.format(value);
  } catch (error) {
    console.warn('Number formatting failed, using fallback:', error);
    return value.toFixed(decimals);
  }
};

/**
 * Format price with currency symbol
 * @param price - Price value
 * @param currencySymbol - Currency symbol to display
 * @param localization - Localization settings
 * @returns Formatted price string
 */
export const formatPrice = (
  price: number,
  currencySymbol: string,
  localization: LocalizationSettings | null
): string => {
  const formatted = formatNumber(price, localization, 2);
  return `${currencySymbol}${formatted}`;
};

/**
 * Format percentage value
 * @param value - Percentage value
 * @param decimals - Decimal places
 * @param includeSymbol - Include % symbol
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  decimals: number = 2,
  includeSymbol: boolean = true
): string => {
  const formatted = value.toFixed(decimals);
  return includeSymbol ? `${formatted}%` : formatted;
};

/**
 * Format price change (positive/negative) with directional indicator
 * @param change - Dollar amount change
 * @param changePercent - Percentage change
 * @param localization - Localization settings
 * @param currencySymbol - Currency symbol
 * @returns Formatted price change object
 */
export const formatPriceChange = (
  change: number,
  changePercent: number,
  localization: LocalizationSettings | null,
  currencySymbol: string
): PriceChange => {
  const direction: PriceChange['direction'] =
    change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

  const sign = change > 0 ? '+' : '';
  const absChange = Math.abs(change);
  const absPercent = Math.abs(changePercent);

  return {
    change: `${sign}${formatPrice(absChange, currencySymbol, localization)}`,
    percent: `${sign}${formatPercentage(absPercent)}`,
    direction,
  };
};

/**
 * Get directional arrow/symbol for price change
 * @param change - Dollar amount change
 * @returns Arrow symbol or dash
 */
export const getPriceChangeIndicator = (change: number): string => {
  if (change > 0) return '↑'; // Up arrow
  if (change < 0) return '↓'; // Down arrow
  return '→'; // Right arrow
};

/**
 * Get color for price change (for UI display)
 * @param change - Dollar amount change
 * @returns Color code or name
 */
export const getPriceChangeColor = (
  change: number
): 'green' | 'red' | 'gray' => {
  if (change > 0) return 'green';
  if (change < 0) return 'red';
  return 'gray';
};

/**
 * Format large numbers with suffix (K, M, B)
 * Useful for market cap display
 * @param value - Numeric value
 * @param decimals - Decimal places for suffix
 * @returns Formatted string with suffix
 */
export const formatLargeNumber = (value: number, decimals: number = 1): string => {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
};

/**
 * Format time delta for "last updated" displays
 * @param timestamp - Unix timestamp of last update
 * @returns Human-readable time delta
 */
export const formatTimeDelta = (timestamp: number): string => {
  const now = Date.now();
  const delta = Math.floor((now - timestamp) / 1000); // seconds

  if (delta < 60) {
    return `${delta}s ago`;
  }

  const minutes = Math.floor(delta / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * Format portfolio allocation percentage
 * @param percentage - Allocation percentage
 * @param localization - Localization settings
 * @returns Formatted percentage
 */
export const formatAllocation = (
  percentage: number,
  localization: LocalizationSettings | null
): string => {
  const formatted = formatNumber(percentage, localization, 1);
  return `${formatted}%`;
};

/**
 * Create a currency formatter function bound to specific localization
 * Useful for passing to child components
 * @param localization - Localization settings
 * @returns Formatter function
 */
export const createCurrencyFormatter = (localization: LocalizationSettings | null) => {
  return (value: number) => formatCurrency(value, localization);
};

/**
 * Parse currency string back to number
 * Handles different currency formats
 * @param currencyString - Formatted currency string
 * @returns Numeric value or null if parsing fails
 */
export const parseCurrency = (currencyString: string): number | null => {
  try {
    // Remove common currency symbols and spaces
    let cleaned = currencyString
      .replace(/[\$€£¥₩₹R\s]/g, '') // Remove common symbols and spaces
      .replace(/,/g, ''); // Remove comma thousands separator

    // Handle period as thousands separator (European format)
    // If there are multiple periods, last one is decimal
    const periodCount = (cleaned.match(/\./g) || []).length;
    if (periodCount > 1) {
      // Multiple periods - last is decimal
      const parts = cleaned.split('.');
      cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  } catch (error) {
    console.warn('Failed to parse currency:', currencyString);
    return null;
  }
};
