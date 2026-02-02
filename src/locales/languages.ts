/**
 * Country to Language/Currency Mapping
 * Maps each country to its language, currency, and localization settings
 */

import { Country } from '../types/tax';
import { Language, LanguageMapping } from '../types/i18n';

export const LANGUAGE_MAPPINGS: Record<Country, LanguageMapping> = {
  [Country.USA]: {
    country: Country.USA,
    language: Language.ENGLISH,
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    numberFormat: 'dot',
    thousandsSeparator: ','
  },

  [Country.SOUTH_KOREA]: {
    country: Country.SOUTH_KOREA,
    language: Language.KOREAN,
    currency: 'KRW',
    currencySymbol: '₩',
    locale: 'ko-KR',
    numberFormat: 'dot',
    thousandsSeparator: ','
  },

  [Country.CHINA]: {
    country: Country.CHINA,
    language: Language.CHINESE,
    currency: 'CNY',
    currencySymbol: '¥',
    locale: 'zh-CN',
    numberFormat: 'dot',
    thousandsSeparator: ','
  },

  [Country.JAPAN]: {
    country: Country.JAPAN,
    language: Language.JAPANESE,
    currency: 'JPY',
    currencySymbol: '¥',
    locale: 'ja-JP',
    numberFormat: 'dot',
    thousandsSeparator: ','
  },

  [Country.GERMANY]: {
    country: Country.GERMANY,
    language: Language.GERMAN,
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'de-DE',
    numberFormat: 'comma',
    thousandsSeparator: '.'
  },

  [Country.FRANCE]: {
    country: Country.FRANCE,
    language: Language.FRENCH,
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'fr-FR',
    numberFormat: 'comma',
    thousandsSeparator: ' '
  },

  [Country.ITALY]: {
    country: Country.ITALY,
    language: Language.ITALIAN,
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'it-IT',
    numberFormat: 'comma',
    thousandsSeparator: '.'
  },

  [Country.UK]: {
    country: Country.UK,
    language: Language.ENGLISH,
    currency: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    numberFormat: 'dot',
    thousandsSeparator: ','
  },

  [Country.INDIA]: {
    country: Country.INDIA,
    language: Language.HINDI,
    currency: 'INR',
    currencySymbol: '₹',
    locale: 'hi-IN',
    numberFormat: 'dot',
    thousandsSeparator: ','
  },

  [Country.BRAZIL]: {
    country: Country.BRAZIL,
    language: Language.PORTUGUESE,
    currency: 'BRL',
    currencySymbol: 'R$',
    locale: 'pt-BR',
    numberFormat: 'comma',
    thousandsSeparator: '.'
  },

  [Country.CANADA]: {
    country: Country.CANADA,
    language: Language.CANADIAN_ENGLISH,
    currency: 'CAD',
    currencySymbol: '$',
    locale: 'en-CA',
    numberFormat: 'dot',
    thousandsSeparator: ','
  }
};

/**
 * Get language mapping for a specific country
 */
export const getLanguageMappingForCountry = (country: Country): LanguageMapping => {
  return LANGUAGE_MAPPINGS[country] || LANGUAGE_MAPPINGS[Country.USA];
};

/**
 * Get all supported countries with their mappings
 */
export const getAllLanguageMappings = (): LanguageMapping[] => {
  return Object.values(LANGUAGE_MAPPINGS);
};

/**
 * Get currency symbol for a country
 */
export const getCurrencySymbolForCountry = (country: Country): string => {
  return LANGUAGE_MAPPINGS[country]?.currencySymbol || '$';
};

/**
 * Get language for a country
 */
export const getLanguageForCountry = (country: Country): Language => {
  return LANGUAGE_MAPPINGS[country]?.language || Language.ENGLISH;
};

/**
 * Get currency code for a country
 */
export const getCurrencyForCountry = (country: Country): string => {
  return LANGUAGE_MAPPINGS[country]?.currency || 'USD';
};
