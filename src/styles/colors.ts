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
// 다크 모드 색상 (기존 디자인 유지)
// =============================================================================

export const DARK_COLORS: ThemeColors = {
  // 배경 레이어 (3단계) - 더 세련된 다크 블루 그레이
  background: '#0F1419',        // 페이지 배경 (매우 어두운 블루 그레이)
  surface: '#1A1F29',           // 카드 배경
  surfaceElevated: '#242B36',   // 강조 카드
  surfaceLight: '#2C2C2C',      // 하위 호환

  // 인버스 섹션
  inverseSurface: '#1E2530',    // 약간 밝은 회색 섹션
  inverseText: '#E5E7EB',       // 인버스 섹션의 텍스트

  primary: '#4CAF50',
  primaryLight: '#66BB6A',

  buy: '#4CAF50',
  sell: '#CF6679',
  neutral: '#9E9E9E',
  hold: '#4CAF50',

  // 텍스트 (4단계)
  textPrimary: '#F9FAFB',       // 거의 순백
  textSecondary: '#9FA6B2',     // 중간 회색
  textTertiary: '#6B7684',      // 연한 회색
  textQuaternary: '#4B5563',    // 매우 연한 회색

  success: '#4CAF50',
  error: '#CF6679',
  warning: '#FFB74D',
  info: '#29B6F6',

  // 테두리 (3단계)
  border: '#2D3748',            // 기본
  borderLight: '#252D37',       // 연한
  borderStrong: '#374151',      // 강한

  disabled: '#424242',
  disabledText: '#6B7684',

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
  // 배경 레이어 (3단계) - 프리미엄 라이트 모드
  background: '#F8F9FA',        // 페이지 배경 (아주 연한 회색, 따뜻한 톤)
  surface: '#FFFFFF',           // 카드 배경 (순백)
  surfaceElevated: '#FFFFFF',   // 강조 카드 (순백 + 그림자로 구분)
  surfaceLight: '#FAFAFA',      // 하위 호환

  // 인버스 섹션 (검정 대신 사용)
  inverseSurface: '#F3F4F6',    // 연한 회색 (검정 섹션 대체용)
  inverseText: '#1F2937',       // 인버스 섹션의 텍스트 (진한 회색)

  primary: '#4CAF50',
  primaryLight: '#66BB6A',

  buy: '#4CAF50',
  sell: '#E53935',
  neutral: '#9E9E9E',
  hold: '#4CAF50',

  // 텍스트 계층 (4단계) - WCAG AA 이상
  textPrimary: '#111827',       // 주요 텍스트 (거의 검정)
  textSecondary: '#6B7280',     // 보조 텍스트
  textTertiary: '#9CA3AF',      // 비활성 텍스트
  textQuaternary: '#D1D5DB',    // 매우 연한 텍스트

  success: '#4CAF50',
  error: '#E53935',
  warning: '#FF9800',
  info: '#2196F3',

  // 구분선 & 테두리 (3단계)
  border: '#E5E7EB',            // 일반 구분선
  borderLight: '#F3F4F6',       // 연한 구분선
  borderStrong: '#D1D5DB',      // 강한 구분선

  disabled: '#E0E0E0',
  disabledText: '#9CA3AF',

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
