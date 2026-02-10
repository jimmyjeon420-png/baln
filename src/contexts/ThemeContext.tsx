/**
 * ThemeContext.tsx - 테마 Context + Provider
 *
 * 역할: "테마 관리 본부"
 * - 앱 전체의 테마 상태를 관리 (light/dark/system)
 * - AsyncStorage에 사용자 선택 저장
 * - 시스템 설정 따름 기능 (Appearance API)
 * - 모든 화면에서 useTheme() 훅으로 접근 가능
 *
 * 사용 예시:
 * const { theme, colors, setThemeMode } = useTheme();
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS, ThemeColors } from '../styles/colors';

// =============================================================================
// 타입 정의
// =============================================================================

/** 테마 모드 - 사용자가 선택할 수 있는 3가지 옵션 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 실제 적용되는 테마 (system은 light 또는 dark로 변환됨) */
export type ActiveTheme = 'light' | 'dark';

/** Context에서 제공하는 값들 */
interface ThemeContextValue {
  /** 사용자가 선택한 테마 모드 (light/dark/system) */
  themeMode: ThemeMode;

  /** 실제 적용되는 테마 (light 또는 dark만) */
  theme: ActiveTheme;

  /** 현재 테마의 색상 팔레트 */
  colors: ThemeColors;

  /** 테마 모드 변경 함수 */
  setThemeMode: (mode: ThemeMode) => Promise<void>;

  /** 테마 로딩 중 여부 */
  isLoading: boolean;
}

// =============================================================================
// Context 생성
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// AsyncStorage 키
const THEME_STORAGE_KEY = '@baln:theme_mode';

// =============================================================================
// ThemeProvider - 앱 전체를 감싸는 Provider
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // 사용자가 선택한 테마 모드 (light/dark/system)
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark'); // 기본값: 다크 모드

  // 시스템 테마 (iOS/Android 시스템 설정)
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // 실제 적용되는 테마 계산
  // ---------------------------------------------------------------------------
  const theme: ActiveTheme = React.useMemo(() => {
    if (themeMode === 'system') {
      // 시스템 설정 따름
      return systemTheme === 'light' ? 'light' : 'dark';
    }
    return themeMode;
  }, [themeMode, systemTheme]);

  // ---------------------------------------------------------------------------
  // 현재 테마의 색상 팔레트
  // ---------------------------------------------------------------------------
  const colors: ThemeColors = React.useMemo(() => {
    return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
  }, [theme]);

  // ---------------------------------------------------------------------------
  // 초기화: AsyncStorage에서 저장된 테마 불러오기
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (error) {
        console.error('[ThemeContext] 테마 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // ---------------------------------------------------------------------------
  // 시스템 테마 변경 감지 (iOS/Android 설정 변경 시)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  // ---------------------------------------------------------------------------
  // 테마 모드 변경 함수
  // ---------------------------------------------------------------------------
  const setThemeMode = React.useCallback(async (mode: ThemeMode) => {
    try {
      // 상태 업데이트
      setThemeModeState(mode);

      // AsyncStorage에 저장
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);

      console.log('[ThemeContext] 테마 변경:', mode);
    } catch (error) {
      console.error('[ThemeContext] 테마 저장 실패:', error);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Context 값 제공
  // ---------------------------------------------------------------------------
  const value: ThemeContextValue = React.useMemo(() => ({
    themeMode,
    theme,
    colors,
    setThemeMode,
    isLoading,
  }), [themeMode, theme, colors, setThemeMode, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// useTheme 훅 - 컴포넌트에서 테마 사용
// =============================================================================

/**
 * 테마 정보를 가져오는 훅
 *
 * 사용 예시:
 * ```tsx
 * const { theme, colors, setThemeMode } = useTheme();
 *
 * // 배경색 적용
 * <View style={{ backgroundColor: colors.background }}>
 *
 * // 테마 변경
 * setThemeMode('light');
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
