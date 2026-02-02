/**
 * Custom Hook: Localization Management
 * Handles language/currency switching, storage, and auto-detection
 */

import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Country } from '../types/tax';
import { LocalizationSettings, Language } from '../types/i18n';
import { setLanguage, t, initializeLocalization } from '../locales';
import { getLanguageMappingForCountry } from '../locales/languages';

const LOCALIZATION_STORAGE_KEY = '@smart_rebalancer_localization';

interface UseLocalizationReturn {
  settings: LocalizationSettings | null;
  isLoading: boolean;
  updateLocalizationForCountry: (country: Country) => Promise<LocalizationSettings>;
  translate: (key: string, options?: any) => string;
  setLocalization: (settings: LocalizationSettings) => Promise<void>;
}

/**
 * Hook for managing localization settings
 * Auto-switches language and currency when country changes
 * Persists settings to AsyncStorage
 */
export const useLocalization = (): UseLocalizationReturn => {
  const [settings, setSettings] = useState<LocalizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 마운트 시 저장된 로컬라이제이션 설정 로드
  useEffect(() => {
    const loadLocalization = async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCALIZATION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as LocalizationSettings;
          setSettings(parsed);
          initializeLocalization(parsed.language);
        } else {
          // 기기 언어 감지
          const deviceLocale = Localization.getLocales()[0];
          let defaultLanguage = Language.ENGLISH;
          let defaultCurrency = 'USD';
          let defaultCurrencySymbol = '$';
          let defaultLocale = 'en-US';

          // 기기 언어에 따라 설정
          const lang = deviceLocale?.languageCode || 'en';

          switch (lang) {
            case 'ko':
              defaultLanguage = Language.KOREAN;
              defaultCurrency = 'KRW';
              defaultCurrencySymbol = '₩';
              defaultLocale = 'ko-KR';
              break;
            case 'zh':
              defaultLanguage = Language.CHINESE;
              defaultCurrency = 'CNY';
              defaultCurrencySymbol = '¥';
              defaultLocale = 'zh-CN';
              break;
            case 'ja':
              defaultLanguage = Language.JAPANESE;
              defaultCurrency = 'JPY';
              defaultCurrencySymbol = '¥';
              defaultLocale = 'ja-JP';
              break;
            case 'de':
              defaultLanguage = Language.GERMAN;
              defaultCurrency = 'EUR';
              defaultCurrencySymbol = '€';
              defaultLocale = 'de-DE';
              break;
            case 'fr':
              defaultLanguage = Language.FRENCH;
              defaultCurrency = 'EUR';
              defaultCurrencySymbol = '€';
              defaultLocale = 'fr-FR';
              break;
            case 'es':
              defaultLanguage = Language.SPANISH;
              defaultCurrency = 'EUR';
              defaultCurrencySymbol = '€';
              defaultLocale = 'es-ES';
              break;
            case 'pt':
              defaultLanguage = Language.PORTUGUESE;
              defaultCurrency = 'BRL';
              defaultCurrencySymbol = 'R$';
              defaultLocale = 'pt-BR';
              break;
            case 'hi':
              defaultLanguage = Language.HINDI;
              defaultCurrency = 'INR';
              defaultCurrencySymbol = '₹';
              defaultLocale = 'hi-IN';
              break;
            case 'it':
              defaultLanguage = Language.ITALIAN;
              defaultCurrency = 'EUR';
              defaultCurrencySymbol = '€';
              defaultLocale = 'it-IT';
              break;
            case 'en':
            default:
              defaultLanguage = Language.ENGLISH;
              defaultCurrency = 'USD';
              defaultCurrencySymbol = '$';
              defaultLocale = 'en-US';
          }

          const defaultSettings: LocalizationSettings = {
            language: defaultLanguage,
            currency: defaultCurrency,
            currencySymbol: defaultCurrencySymbol,
            locale: defaultLocale,
            numberFormat: 'dot',
            thousandsSeparator: ',',
          };
          setSettings(defaultSettings);
          initializeLocalization(defaultLanguage);
        }
      } catch (error) {
        console.error('로컬라이제이션 로드 실패:', error);
        setSettings(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadLocalization();
  }, []);

  /**
   * Update localization when country changes
   * Maps country to language, currency, and number formatting
   */
  const updateLocalizationForCountry = useCallback(
    async (country: Country): Promise<LocalizationSettings> => {
      const mapping = getLanguageMappingForCountry(country);

      const newSettings: LocalizationSettings = {
        language: mapping.language,
        currency: mapping.currency,
        currencySymbol: mapping.currencySymbol,
        locale: mapping.locale,
        numberFormat: mapping.numberFormat,
        thousandsSeparator: mapping.thousandsSeparator,
      };

      try {
        // Persist to storage
        await AsyncStorage.setItem(
          LOCALIZATION_STORAGE_KEY,
          JSON.stringify(newSettings)
        );

        // Update i18n
        setLanguage(newSettings.language);
        initializeLocalization(newSettings.language);

        // Update state
        setSettings(newSettings);

        return newSettings;
      } catch (error) {
        console.error('Failed to update localization:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Manually set localization settings
   */
  const setLocalization = useCallback(
    async (newSettings: LocalizationSettings): Promise<void> => {
      try {
        await AsyncStorage.setItem(
          LOCALIZATION_STORAGE_KEY,
          JSON.stringify(newSettings)
        );
        setLanguage(newSettings.language);
        setSettings(newSettings);
      } catch (error) {
        console.error('Failed to set localization:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Get translation string with optional parameters
   */
  const translate = useCallback(
    (key: string, options?: any): string => {
      return t(key, options);
    },
    []
  );

  return {
    settings,
    isLoading,
    updateLocalizationForCountry,
    translate,
    setLocalization,
  };
};
