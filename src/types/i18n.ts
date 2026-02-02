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
