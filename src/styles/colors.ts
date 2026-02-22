/**
 * colors.ts - 다크/라이트 모드 색상 팔레트
 *
 * 역할: "색상 자료실"
 * - 다크 모드와 라이트 모드의 모든 색상을 한 곳에 정의
 * - 앱 전체에서 일관된 색상 사용
 * - 테마 전환 시 자동으로 색상이 바뀜
 */

export interface ThemeColors {
  // 배경 (3단계 레이어)
  background: string;        // 전체 화면 배경색 (최하단)
  surface: string;           // 카드 배경색 (중간)
  surfaceElevated: string;   // 강조 카드 배경색 (최상단)
  surfaceLight: string;      // 약간 밝은 카드 배경색 (하위 호환)

  // 인버스 섹션 (라이트 모드에서 검정 대신 사용)
  inverseSurface: string;    // 인버스 배경 (라이트: 연한 회색, 다크: 약간 밝은 회색)
  inverseText: string;       // 인버스 섹션의 텍스트

  // 기본 액션 - Green 강조
  primary: string;           // 메인 브랜드 컬러 (그린)
  primaryLight: string;      // 밝은 그린
  primaryDark?: string;      // WCAG AA 준수 텍스트용 그린 (라이트 모드에서 대비 확보)

  // 매매 액션
  buy: string;               // 매수/상승 (그린)
  sell: string;              // 매도/하락 (레드)
  neutral: string;           // 중립 (회색)
  hold: string;              // 보유 (그린)

  // 텍스트 (4단계 계층)
  textPrimary: string;       // 주요 텍스트 (최고 대비)
  textSecondary: string;     // 보조 텍스트
  textTertiary: string;      // 힌트/비활성 텍스트
  textQuaternary: string;    // 매우 연한 텍스트

  // 상태
  success: string;           // 성공 (그린)
  error: string;             // 에러 (레드)
  warning: string;           // 경고 (오렌지)
  info: string;              // 정보 (블루)

  // 테두리 (3단계)
  border: string;            // 기본 테두리
  borderLight: string;       // 밝은 테두리
  borderStrong: string;      // 강한 테두리

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
// 다크 모드 색상 (프리미엄 다크 스타일)
// =============================================================================

export const DARK_COLORS: ThemeColors = {
  // ========================================
  // 배경 레이어 (모두 어두운색 - 다크 모드 핵심 원칙)
  // ========================================
  background: '#0A0A0A',        // 페이지 배경 (매우 어두운 검정)
  surface: '#1A1A1A',           // 카드 배경 (어두운 회색)
  surfaceElevated: '#252525',   // 강조 카드 (약간 밝은 회색)
  surfaceLight: '#1F1F1F',      // 하위 호환

  // 인버스 섹션 (다크 모드에서도 어두운 배경 유지)
  inverseSurface: '#1F1F1F',    // 어두운 회색 배경
  inverseText: '#FAFAFA',       // 밝은 텍스트 (다크 모드 = 밝은 텍스트)

  primary: '#4CAF50',
  primaryLight: '#66BB6A',
  primaryDark: '#4CAF50',       // 다크 모드에서는 primary와 동일

  buy: '#4CAF50',
  sell: '#CF6679',
  neutral: '#9E9E9E',
  hold: '#4CAF50',

  // ========================================
  // 텍스트 계층 (모두 밝은색 - 다크 모드 핵심 원칙)
  // ========================================
  textPrimary: '#FAFAFA',       // 주요 텍스트 (거의 흰색)
  textSecondary: '#B8B8B8',     // 보조 텍스트 (밝은 회색)
  textTertiary: '#8A8A8A',      // 비활성 텍스트 (중간 회색)
  textQuaternary: '#5C5C5C',    // 매우 어두운 텍스트

  success: '#4CAF50',
  error: '#CF6679',
  warning: '#FFB74D',
  info: '#29B6F6',

  // ========================================
  // 구분선 & 테두리 (어두운 회색 - 배경과 조화)
  // ========================================
  border: '#2A2A2A',            // 일반 구분선 (어두운 회색)
  borderLight: '#222222',       // 매우 어두운 구분선
  borderStrong: '#3A3A3A',      // 강한 구분선 (밝은 회색)

  disabled: '#2A2A2A',          // 비활성 배경
  disabledText: '#5C5C5C',      // 비활성 텍스트

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
// 라이트 모드 색상 (Apple/Stripe 프리미엄 스타일)
// =============================================================================

export const LIGHT_COLORS: ThemeColors = {
  // ========================================
  // 배경 레이어 (모두 밝은색 - 라이트 모드 핵심 원칙)
  // ========================================
  background: '#F4F6F8',        // 페이지 배경 (눈부심 완화)
  surface: '#FFFFFF',           // 카드 배경 (순백)
  surfaceElevated: '#F1F4F7',   // 강조/중첩 카드
  surfaceLight: '#EEF2F5',      // 하위 호환 (칩/태그 배경)

  // 인버스 섹션 (라이트 모드에서도 밝은 배경 유지)
  inverseSurface: '#EAF0F4',    // 연한 회색 배경 (대비 강화)
  inverseText: '#111827',       // 어두운 텍스트 (라이트 모드 = 어두운 텍스트)

  primary: '#4CAF50',
  primaryLight: '#66BB6A',
  primaryDark: '#1F6A25',       // 라이트 모드 텍스트용 (흰 배경 대비 강화)

  buy: '#2E7D32',
  sell: '#E53935',
  neutral: '#6B7280',
  hold: '#2E7D32',

  // ========================================
  // 텍스트 계층 (모두 어두운색 - 라이트 모드 핵심 원칙)
  // ========================================
  textPrimary: '#111827',       // 주요 텍스트 (거의 검정)
  textSecondary: '#2F3A46',     // 보조 텍스트 (가독성 강화)
  textTertiary: '#51606F',      // 힌트 텍스트 (기존보다 진하게)
  textQuaternary: '#7A8694',    // 매우 연한 텍스트

  success: '#2E7D32',
  error: '#C62828',
  warning: '#B56A00',
  info: '#0066CC',

  // ========================================
  // 구분선 & 테두리 (밝은 회색 - 배경과 조화)
  // ========================================
  border: '#DDE3E8',            // 일반 구분선
  borderLight: '#E7ECF0',       // 연한 구분선
  borderStrong: '#C4CED7',      // 강한 구분선

  disabled: '#E3E8EE',          // 비활성 배경
  disabledText: '#8B96A3',      // 비활성 텍스트

  sentiment: {
    calm: '#2E7D32',
    caution: '#B56A00',
    alert: '#C62828',
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
