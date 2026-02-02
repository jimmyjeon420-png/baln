/**
 * Theme and color definitions - Dark Mode (Premium Fintech)
 */

export const COLORS = {
  // 다크 모드 배경
  background: '#121212', // 매우 다크 배경
  surface: '#1E1E1E', // 카드 배경
  surfaceLight: '#2C2C2C', // 약간 밝은 서피스

  // 기본 액션 - Green 강조
  primary: '#4CAF50', // 그린 (액션/긍정)
  primaryLight: '#66BB6A', // 밝은 그린

  // 심정 색상
  buy: '#4CAF50', // 그린 (매수/상승)
  sell: '#CF6679', // 레드 (매도/하락)
  neutral: '#9E9E9E', // 회색 (중립)
  hold: '#4CAF50', // 그린 (보유)

  // 텍스트
  textPrimary: '#FFFFFF', // 흰색 (주요 텍스트)
  textSecondary: '#B0B0B0', // 라이트 그레이 (보조 텍스트)
  textTertiary: '#757575', // 다크 그레이 (힌트)

  // 상태
  success: '#4CAF50', // 그린
  error: '#CF6679', // 레드
  warning: '#FFB74D', // 오렌지
  info: '#29B6F6', // 라이트 블루

  // 테두리
  border: '#3A3A3A', // 다크 그레이 테두리
  borderLight: '#2A2A2A', // 아주 다크 테두리

  // 비활성화
  disabled: '#424242',
  disabledText: '#757575',
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
    lineHeight: 32,
  },
  headingMedium: {
    fontSize: SIZES.fXxl,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  headingSmall: {
    fontSize: SIZES.fLg,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: SIZES.fBase,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: SIZES.fSm,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: SIZES.fXs,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  labelLarge: {
    fontSize: SIZES.fBase,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  labelMedium: {
    fontSize: SIZES.fSm,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: SIZES.fXs,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
};
