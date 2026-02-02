/**
 * i18n Setup and Initialization
 * Central hub for all localization functionality
 */

import { I18n } from 'i18n-js';
import { Language } from '../types/i18n';

// 모든 번역 파일 임포트
import enTranslations from './en.json';
import koTranslations from './ko.json';

/**
 * Create i18n instance
 */
const i18n = new I18n();

/**
 * i18n 설정
 * 현재 구현된 언어: English, Korean
 * 기타 언어는 영어로 자동 폴백됨
 *
 * TODO: 프로덕션을 위해 다음 언어 번역 파일 추가:
 * - zh.json (Chinese)
 * - ja.json (Japanese)
 * - de.json (German)
 * - fr.json (French)
 * - it.json (Italian)
 * - es.json (Spanish)
 * - hi.json (Hindi)
 * - pt.json (Portuguese)
 * - en-CA.json (Canadian English)
 */
i18n.translations = {
  [Language.ENGLISH]: enTranslations,
  [Language.KOREAN]: koTranslations,

  // Temporary: Use English translations for unsupported languages
  // This ensures app doesn't crash when user selects these languages
  [Language.CHINESE]: enTranslations,
  [Language.JAPANESE]: enTranslations,
  [Language.GERMAN]: enTranslations,
  [Language.FRENCH]: enTranslations,
  [Language.ITALIAN]: enTranslations,
  [Language.SPANISH]: enTranslations,
  [Language.HINDI]: enTranslations,
  [Language.PORTUGUESE]: enTranslations,
  [Language.CANADIAN_ENGLISH]: enTranslations,
};

// Set default configuration
i18n.defaultLocale = Language.ENGLISH;
i18n.locale = Language.ENGLISH;

// Enable fallback to English for missing translations
i18n.enableFallback = true;

/**
 * Initialize i18n with specific language
 * @param language - Language to initialize
 */
export const initializeLocalization = (language: Language): void => {
  i18n.locale = language;
};

/**
 * Get translation string
 * @param key - Translation key (e.g., "assets.name")
 * @param options - Optional parameters for interpolation
 * @returns Translated string
 */
export const t = (key: string, options?: any): string => {
  return i18n.t(key, options);
};

/**
 * Set active language
 * @param language - Language to set
 */
export const setLanguage = (language: Language): void => {
  i18n.locale = language;
};

/**
 * Get current active language
 * @returns Current language code
 */
export const getCurrentLanguage = (): Language => {
  return i18n.locale as Language;
};

/**
 * Batch translate multiple keys
 * @param keys - Array of translation keys
 * @returns Object with translated strings
 */
export const tBatch = (keys: string[]): Record<string, string> => {
  return keys.reduce((acc, key) => {
    acc[key] = t(key);
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Translate with count-based plural forms
 * @param key - Base translation key
 * @param count - Count for pluralization
 * @param options - Additional options
 * @returns Translated string
 */
export const tPlural = (key: string, count: number, options?: any): string => {
  return t(key, { count, ...options });
};

export default i18n;
