/**
 * LocaleContext — 앱 전체 언어 상태 관리 ("통역 본부")
 *
 * 역할:
 *   - 현재 표시 언어를 React state로 보유
 *   - setAppLanguage() 호출 시 i18n.locale 동기화 + 모든 화면 자동 리렌더
 *   - t() 함수를 context로 제공 (언어 변경 시 자동 반영)
 *   - AsyncStorage에 선택 언어 저장 (앱 재시작 시 유지)
 *
 * 비유: 공항 안내 방송 시스템 — 언어 스위치를 누르면 모든 안내판이 동시에 바뀌는 것
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
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
  /** 언어 변경 함수 — i18n.locale 동기화 + state 업데이트 + AsyncStorage 저장 */
  setAppLanguage: (lang: DisplayLanguage) => void;
  /** 번역 함수 — 현재 언어에 맞는 문자열 반환 */
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
        if (stored === 'en' || stored === 'ko') {
          setLanguage(stored);
          i18n.locale = stored;
        } else {
          // 기기 언어 감지
          const deviceLang = getLocales()[0]?.languageCode || 'en';
          const detected: DisplayLanguage = deviceLang.startsWith('ko') ? 'ko' : 'en';
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

  const setAppLanguage = useCallback((lang: DisplayLanguage) => {
    i18n.locale = lang;
    setLanguage(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {
      /* 저장 실패는 무시 — 다음 실행 시 기기 언어로 폴백 */
    });
  }, []);

  // t()를 language에 의존시켜 리렌더 트리거
  const t = useCallback(
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
  return (i18n.locale === 'ko' ? 'ko' : 'en') as DisplayLanguage;
}
