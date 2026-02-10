/**
 * shadows.ts - 그림자 시스템
 *
 * 역할: "입체감 자료실"
 * - 라이트 모드에서 카드에 깊이감 부여
 * - 다크 모드에서는 테두리로 대체
 * - 3단계 그림자 (small/medium/large)
 *
 * 사용 예시:
 * ```tsx
 * const { shadows } = useTheme();
 * <View style={[styles.card, shadows.md]}>
 * ```
 */

import { ViewStyle } from 'react-native';

export interface ShadowStyles {
  sm: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
}

// =============================================================================
// 라이트 모드 그림자 - iOS/Android 네이티브 그림자
// =============================================================================

export const LIGHT_SHADOWS: ShadowStyles = {
  // Small - 작은 카드, 버튼 등
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1, // Android
  },

  // Medium - 일반 카드, 모달 등
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2, // Android
  },

  // Large - 플로팅 버튼, 중요 카드 등
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4, // Android
  },
};

// =============================================================================
// 다크 모드 그림자 - 테두리로 대체 (그림자가 보이지 않음)
// =============================================================================

export const DARK_SHADOWS: ShadowStyles = {
  // Small - 얇은 테두리
  sm: {
    borderWidth: 1,
    borderColor: '#2D3748',
  },

  // Medium - 중간 테두리
  md: {
    borderWidth: 1,
    borderColor: '#374151',
  },

  // Large - 강한 테두리
  lg: {
    borderWidth: 1,
    borderColor: '#4B5563',
  },
};
