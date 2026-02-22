/**
 * Theme and color definitions
 *
 * NOTE: 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새 코드에서는 useTheme() 훅을 사용하여 colors를 가져오세요.
 *
 * 사용 예시:
 * ```tsx
 * import { useTheme } from '@/hooks/useTheme';
 * const { colors } = useTheme();
 * <View style={{ backgroundColor: colors.background }} />
 * ```
 */

export const COLORS = {
  // 라이트 모드 배경 (기본값 - 하위 호환성)
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceLight: '#EEF2F5',

  // 기본 액션 - Green 강조
  primary: '#4CAF50', // 그린 (액션/긍정)
  primaryLight: '#66BB6A', // 밝은 그린

  // 심정 색상
  buy: '#2E7D32',
  sell: '#C62828',
  neutral: '#6B7280',
  hold: '#2E7D32',

  // 텍스트
  textPrimary: '#111827',
  textSecondary: '#2F3A46',
  textTertiary: '#51606F',

  // 상태
  success: '#2E7D32',
  error: '#C62828',
  warning: '#B56A00',
  info: '#0066CC',

  // 테두리
  border: '#DDE3E8',
  borderLight: '#E7ECF0',

  // 비활성화
  disabled: '#E3E8EE',
  disabledText: '#8B96A3',

  // 센티먼트 (맥락 카드용)
  sentiment: {
    calm: '#2E7D32',
    caution: '#B56A00',
    alert: '#C62828',
  },

  // 스트릭 (연속 기록)
  streak: {
    active: '#4CAF50', // 활성 그린
    glow: '#66BB6A', // 그라데이션용 밝은 그린
    background: '#1E3A1E', // 그린 배경
  },

  // 프리미엄
  premium: {
    gold: '#FFC107', // 프리미엄 골드
    purple: '#7C4DFF', // 프리미엄 퍼플
    gradient: ['#FFC107', '#7C4DFF'], // 그라데이션
  },
};

export const SIZES = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // Font sizes (with 'f' prefix to avoid conflicts)
  fTiny: 10,
  fXs: 12,
  fSm: 14,
  fBase: 16,
  fLg: 18,
  fXl: 20,
  fXxl: 24,
  fXxxl: 28,

  // Border radius (with 'r' prefix)
  rNone: 0,
  rXs: 4,
  rSm: 6,
  rMd: 8,
  rLg: 12,
  rXl: 16,
  rFull: 9999,

  // Icon sizes
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,

  // Card (카드 공통 스타일)
  card: {
    borderRadius: 16, // 카드 모서리
    padding: 16, // 카드 내부 여백
  },

  // Banner (배너 공통 스타일)
  banner: {
    height: 40, // 배너 높이
    borderRadius: 8, // 배너 모서리
  },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
};

export const TYPOGRAPHY = {
  headingLarge: {
    fontSize: SIZES.fXxxl,
    fontWeight: '700' as const,
    lineHeight: 33,
  },
  headingMedium: {
    fontSize: SIZES.fXxl,
    fontWeight: '700' as const,
    lineHeight: 29,
  },
  headingSmall: {
    fontSize: SIZES.fLg,
    fontWeight: '600' as const,
    lineHeight: 25,
  },
  bodyLarge: {
    fontSize: SIZES.fBase,
    fontWeight: '400' as const,
    lineHeight: 25,
  },
  bodyMedium: {
    fontSize: SIZES.fSm,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  bodySmall: {
    fontSize: SIZES.fXs,
    fontWeight: '400' as const,
    lineHeight: 17,
  },
  labelLarge: {
    fontSize: SIZES.fBase,
    fontWeight: '600' as const,
    lineHeight: 25,
  },
  labelMedium: {
    fontSize: SIZES.fSm,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  labelSmall: {
    fontSize: SIZES.fXs,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
};
