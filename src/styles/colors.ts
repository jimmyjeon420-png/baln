/**
 * colors.ts - 다크/라이트 모드 색상 팔레트
 *
 * 역할: "색상 자료실"
 * - 다크 모드와 라이트 모드의 모든 색상을 한 곳에 정의
 * - 앱 전체에서 일관된 색상 사용
 * - 테마 전환 시 자동으로 색상이 바뀜
 */

export interface ThemeColors {
  // 배경
  background: string;        // 전체 화면 배경색
  surface: string;           // 카드 배경색
  surfaceLight: string;      // 약간 밝은 카드 배경색

  // 기본 액션 - Green 강조
  primary: string;           // 메인 브랜드 컬러 (그린)
  primaryLight: string;      // 밝은 그린

  // 매매 액션
  buy: string;               // 매수/상승 (그린)
  sell: string;              // 매도/하락 (레드)
  neutral: string;           // 중립 (회색)
  hold: string;              // 보유 (그린)

  // 텍스트
  textPrimary: string;       // 주요 텍스트
  textSecondary: string;     // 보조 텍스트
  textTertiary: string;      // 힌트/비활성 텍스트

  // 상태
  success: string;           // 성공 (그린)
  error: string;             // 에러 (레드)
  warning: string;           // 경고 (오렌지)
  info: string;              // 정보 (블루)

  // 테두리
  border: string;            // 기본 테두리
  borderLight: string;       // 밝은 테두리

  // 비활성화
  disabled: string;          // 비활성 배경
  disabledText: string;      // 비활성 텍스트

  // 센티먼트 (맥락 카드용)
  sentiment: {
    calm: string;            // 안정적 (그린)
    caution: string;         // 주의 (오렌지)
    alert: string;           // 경고 (레드)
  };

  // 스트릭 (연속 기록)
  streak: {
    active: string;          // 활성 그린
    glow: string;            // 그라데이션용
    background: string;      // 배경
  };

  // 프리미엄
  premium: {
    gold: string;            // 프리미엄 골드
    purple: string;          // 프리미엄 퍼플
    gradient: string[];      // 그라데이션
  };
}

// =============================================================================
// 다크 모드 색상 (기존 디자인 유지)
// =============================================================================

export const DARK_COLORS: ThemeColors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2C2C2C',

  primary: '#4CAF50',
  primaryLight: '#66BB6A',

  buy: '#4CAF50',
  sell: '#CF6679',
  neutral: '#9E9E9E',
  hold: '#4CAF50',

  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#757575',

  success: '#4CAF50',
  error: '#CF6679',
  warning: '#FFB74D',
  info: '#29B6F6',

  border: '#3A3A3A',
  borderLight: '#2A2A2A',

  disabled: '#424242',
  disabledText: '#757575',

  sentiment: {
    calm: '#4CAF50',
    caution: '#FFB74D',
    alert: '#CF6679',
  },

  streak: {
    active: '#4CAF50',
    glow: '#66BB6A',
    background: '#1E3A1E',
  },

  premium: {
    gold: '#FFC107',
    purple: '#7C4DFF',
    gradient: ['#FFC107', '#7C4DFF'],
  },
};

// =============================================================================
// 라이트 모드 색상 (새로 추가)
// =============================================================================

export const LIGHT_COLORS: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceLight: '#FAFAFA',

  primary: '#4CAF50',
  primaryLight: '#66BB6A',

  buy: '#4CAF50',
  sell: '#E53935',
  neutral: '#9E9E9E',
  hold: '#4CAF50',

  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#9E9E9E',

  success: '#4CAF50',
  error: '#E53935',
  warning: '#FF9800',
  info: '#2196F3',

  border: '#E0E0E0',
  borderLight: '#F0F0F0',

  disabled: '#E0E0E0',
  disabledText: '#9E9E9E',

  sentiment: {
    calm: '#4CAF50',
    caution: '#FF9800',
    alert: '#E53935',
  },

  streak: {
    active: '#4CAF50',
    glow: '#66BB6A',
    background: '#E8F5E9',
  },

  premium: {
    gold: '#FFC107',
    purple: '#7C4DFF',
    gradient: ['#FFC107', '#7C4DFF'],
  },
};
