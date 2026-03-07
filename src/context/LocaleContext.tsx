/**
 * LocaleContext — 앱 전체 언어 상태 관리 ("통역 본부")
 *
 * 역할:
 *   - 현재 표시 언어를 React state로 보유
 *   - 언어 변경 시 AsyncStorage에 저장 + 앱 리로드 (아이폰 설정 방식)
 *   - t() 함수를 context로 제공
 *   - 앱 시작 시 저장된 언어로 i18n 초기화
 *
 * 비유: 아이폰 설정 앱 — 언어 바꾸면 앱이 재시작되어 모든 화면이 새 언어로 표시
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import type { DisplayLanguage } from '../types/i18n';
import i18n, { t as rawT } from '../locales';

// ============================================================================
// 상수
// ============================================================================

const STORAGE_KEY = '@baln:display_language';

// ============================================================================
// Context 타입
// ============================================================================

interface LocaleContextType {
  /** 현재 표시 언어 ('ko' | 'en') */
  language: DisplayLanguage;
  /** 언어 변경 함수 — AsyncStorage 저장 + 리로드 확인 팝업 */
  setAppLanguage: (lang: DisplayLanguage) => void;
  /** 번역 함수 — 현재 언어에 맞는 문자열 반환 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, options?: Record<string, any>) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<DisplayLanguage>('ko');
  const [isReady, setIsReady] = useState(false);

  // 초기화: AsyncStorage → expo-localization → 기본 ko
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'en' || stored === 'ko' || stored === 'ja') {
          setLanguage(stored);
          i18n.locale = stored;
        } else {
          // 기기 언어 감지
          const deviceLang = getLocales()[0]?.languageCode || 'en';
          const detected: DisplayLanguage = deviceLang.startsWith('ko') ? 'ko' : deviceLang.startsWith('ja') ? 'ja' : 'en';
          setLanguage(detected);
          i18n.locale = detected;
        }
      } catch {
        // 실패 시 기본 한국어
        i18n.locale = 'ko';
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setAppLanguage = useCallback((newLang: DisplayLanguage) => {
    if (newLang === language) return;

    const langLabel = newLang === 'ko' ? '한국어' : newLang === 'ja' ? '日本語' : 'English';
    const uiText = {
      ko: { title: '언어 변경', cancel: '취소', confirm: '재시작', fallback: '앱을 완전히 종료한 후 다시 실행해주세요.' },
      en: { title: 'Change Language', cancel: 'Cancel', confirm: 'Restart', fallback: 'Please close and reopen the app.' },
      ja: { title: '言語変更', cancel: 'キャンセル', confirm: '再起動', fallback: 'アプリを完全に終了してから再起動してください。' },
    }[language] ?? { title: 'Change Language', cancel: 'Cancel', confirm: 'Restart', fallback: 'Please close and reopen the app.' };
    const message = language === 'ko'
      ? `${langLabel}로 변경하려면 앱을 다시 시작해야 합니다.`
      : language === 'ja'
        ? `${langLabel}に変更するにはアプリの再起動が必要です。`
        : `Changing to ${langLabel} requires an app restart.`;
    const cancelText = uiText.cancel;
    const confirmText = uiText.confirm;

    Alert.alert(uiText.title, message, [
      { text: cancelText, style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.setItem(STORAGE_KEY, newLang);
            // expo-updates reloadAsync로 앱 재시작
            await Updates.reloadAsync();
          } catch {
            // Updates.reloadAsync 실패 시 (dev 환경 등) 수동 안내
            const fallbackMsg = uiText.fallback;
            Alert.alert('', fallbackMsg);
            // 저장은 완료했으므로 다음 실행 시 적용됨
          }
        },
      },
    ]);
  }, [language]);

  // t()를 language에 의존시켜 리렌더 트리거
  const t = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string, options?: Record<string, any>): string => {
      // language를 참조해야 React가 변경을 감지함
      void language;
      return rawT(key, options);
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setAppLanguage, t }),
    [language, setAppLanguage, t],
  );

  // 초기화 완료 전에는 children 렌더 (BrandSplash가 덮고 있음)
  if (!isReady) return null;

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useLocale — 컴포넌트에서 언어 상태 + t() 접근
 *
 * 사용법:
 *   const { t, language, setAppLanguage } = useLocale();
 *   <Text>{t('home.health.loading')}</Text>
 */
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within <LocaleProvider>');
  }
  return ctx;
}

// ============================================================================
// 글로벌 유틸 (Context 외부에서 사용)
// ============================================================================

/**
 * getCurrentDisplayLanguage — Context 밖에서 현재 언어를 읽을 때 사용
 * (서비스 레이어, 유틸 함수 등 React 외부)
 *
 * 주의: React 리렌더 트리거 안 됨. 컴포넌트에서는 useLocale() 사용 권장.
 */
export function getCurrentDisplayLanguage(): DisplayLanguage {
  return (i18n.locale === 'ko' ? 'ko' : i18n.locale === 'ja' ? 'ja' : 'en') as DisplayLanguage;
}
