/**
 * 캐릭터 시스템 타입 정의
 *
 * 역할: 투자 거장 캐릭터의 표정, 크기, 설정 등을 정의
 * 비유: "캐릭터 설계도" — 각 거장이 어떻게 생겼고 어떤 표정을 짓는지 규격화
 */

/** 센티먼트 연동 표정 (GuruInsight.sentiment → CharacterExpression) */
export type CharacterExpression = 'bullish' | 'bearish' | 'cautious' | 'neutral';

/** 아바타 렌더링 크기 */
export type CharacterSize = 'sm' | 'md' | 'lg';

/** 크기별 픽셀 매핑 */
export const CHARACTER_SIZE_MAP: Record<CharacterSize, number> = {
  sm: 44,  // 구루 목록 카드
  md: 64,  // 중간 크기
  lg: 88,  // 구루 상세 히어로
};

/** 각 구루 캐릭터 설정 */
export interface GuruCharacterConfig {
  guruId: string;
  guruName: string;
  guruNameEn: string;
  emoji: string;                   // SVG 폴백용
  accentColor: string;             // 주 색상
  characterConcept: string;        // 캐릭터 컨셉 설명 (한국어)
  characterConceptEn?: string;     // 캐릭터 컨셉 설명 (영어)
  accessory: string;               // 특징적 소품 (한국어)
  accessoryEn?: string;            // 특징적 소품 (영어)
  hasSvg: boolean;                 // SVG 캐릭터 구현 여부
}

/** SVG 캐릭터 컴포넌트에 전달되는 props */
export interface CharacterRenderProps {
  size: number;
  expression: CharacterExpression;
  accentColor: string;
  /** 눈 깜빡임 단계 (0=열림, 1=감김). 라운드테이블 idle 애니메이션용 */
  blinkPhase?: number;
}
