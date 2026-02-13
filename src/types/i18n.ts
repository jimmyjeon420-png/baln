/**
 * Internationalization (i18n) Type Definitions
 * Defines language, currency, and localization settings across 11 countries
 */

import { Country } from './tax';

export enum Language {
  ENGLISH = 'en',
  KOREAN = 'ko',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  GERMAN = 'de',
  FRENCH = 'fr',
  ITALIAN = 'it',
  SPANISH = 'es',
  HINDI = 'hi',
  PORTUGUESE = 'pt',
  CANADIAN_ENGLISH = 'en-CA'
}

export interface LocalizationSettings {
  language: Language;
  currency: string;           // e.g., 'USD', 'KRW', 'CNY'
  currencySymbol: string;     // e.g., '$', '₩', '¥'
  locale: string;             // e.g., 'en-US', 'ko-KR'
  numberFormat: 'dot' | 'comma'; // decimal separator
  thousandsSeparator: string; // e.g., ',' or '.'
}

export interface LanguageMapping {
  country: Country;
  language: Language;
  currency: string;
  currencySymbol: string;
  locale: string;
  numberFormat: 'dot' | 'comma';
  thousandsSeparator: string;
}

export interface CurrencyFormatOptions {
  symbol?: string;
  decimals?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
}

// ──────────────────────────────────────────────
// 글로벌 시장 지역 설정 (2026-02-13 추가)
// ──────────────────────────────────────────────

/**
 * 글로벌 시장 지역 설정
 *
 * display_language: UI에 표시되는 언어 (기기 locale 기반)
 * market_region: 콘텐츠 기준 시장 (벤치마크, 맥락 카드, 예측 질문 등)
 * primary_currency: 기본 통화 표시
 */

export type MarketRegion = 'KR' | 'US';

export type DisplayLanguage = 'ko' | 'en';

export type PrimaryCurrency = 'KRW' | 'USD';

export interface UserLocaleSettings {
  /** UI 표시 언어 */
  displayLanguage: DisplayLanguage;
  /** 콘텐츠 기준 시장 */
  marketRegion: MarketRegion;
  /** 기본 통화 */
  primaryCurrency: PrimaryCurrency;
}

/** 시장별 기본 설정 */
export const MARKET_DEFAULTS: Record<MarketRegion, UserLocaleSettings> = {
  KR: {
    displayLanguage: 'ko',
    marketRegion: 'KR',
    primaryCurrency: 'KRW',
  },
  US: {
    displayLanguage: 'en',
    marketRegion: 'US',
    primaryCurrency: 'USD',
  },
};

/** 시장별 벤치마크 */
export const MARKET_BENCHMARKS: Record<MarketRegion, { primary: string; secondary: string }> = {
  KR: { primary: 'KOSPI', secondary: 'S&P 500' },
  US: { primary: 'S&P 500', secondary: 'NASDAQ' },
};

/** 시장별 기본 주식 카테고리 우선순위 */
export const MARKET_STOCK_PRIORITY: Record<MarketRegion, string[]> = {
  KR: ['kr_stock', 'us_stock', 'etf', 'crypto'],
  US: ['us_stock', 'etf', 'crypto', 'kr_stock'],
};
