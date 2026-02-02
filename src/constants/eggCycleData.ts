/**
 * Egg 사이클 단계별 메타데이터
 * 각 단계의 특징, 역사적 성공률, 비유 등
 */

import { EggPhase } from '../types/kostolany';

export interface EggPhaseMetadata {
  phase: EggPhase;
  title: string;                    // 영문 제목
  titleKorean: string;              // 한국어 제목
  subtitle: string;                 // 부제목/설명
  color: string;                    // 색상 (16진수)
  historicalSuccessRate: number;    // 과거 성공률 (0-100)
  description: string;              // 상세 설명
  investorSentiment: string;        // 투자자 심리
  priceTrend: string;               // 가격 추세
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedAction: string;        // 권장 액션 한국어
  emoji: string;
}

/**
 * Egg 사이클 6단계 메타데이터
 */
export const EGG_CYCLE_PHASES: Record<EggPhase, EggPhaseMetadata> = {
  // A 단계: 금리 하락 → 시장 상승
  [EggPhase.A1_CORRECTION]: {
    phase: EggPhase.A1_CORRECTION,
    title: 'Correction',
    titleKorean: '조정 단계',
    subtitle: '금리 고점 - 매수 신호',
    color: '#4CAF50', // 초록색
    historicalSuccessRate: 85,
    description:
      '금리가 고점에 도달한 상황. 경제 전망이 부정적일 때가 많으나, 역사적으로 이 시점부터의 매수가 장기적으로 가장 높은 수익률을 기록했습니다.',
    investorSentiment: '극도의 공포, 회피 심리',
    priceTrend: '바닥권 형성, 상승 신호 준비',
    riskLevel: 'LOW',
    recommendedAction: '매수 (적립식 추천)',
    emoji: '🌱',
  },

  [EggPhase.A2_ACCOMPANIMENT]: {
    phase: EggPhase.A2_ACCOMPANIMENT,
    title: 'Accompaniment',
    titleKorean: '파도타기 단계',
    subtitle: '금리 하락 중 - 상승 추진력',
    color: '#66BB6A', // 밝은 초록
    historicalSuccessRate: 88,
    description:
      '금리가 하락하는 가운데 시장이 상승합니다. 투자자들의 신뢰도 회복되고, 기업 실적도 개선됩니다. 가장 안정적인 상승장 구간입니다.',
    investorSentiment: '낙관적, 참여 심리 확대',
    priceTrend: '지속적 상승, 강한 모멘텀',
    riskLevel: 'LOW',
    recommendedAction: '보유 (파도타기)',
    emoji: '🏄',
  },

  [EggPhase.A3_EXAGGERATION]: {
    phase: EggPhase.A3_EXAGGERATION,
    title: 'Exaggeration',
    titleKorean: '과열 단계',
    subtitle: '금리 저점 - 거품 경고',
    color: '#FFC107', // 노란색 (경고)
    historicalSuccessRate: 72,
    description:
      '금리가 저점에 도달했으나, 시장은 계속 상승합니다. 투자자 심리가 과도하게 낙관적이 되어 자산 가격이 내재 가치를 초과합니다. 이익 실현 신호.',
    investorSentiment: '탐욕, 과신, 거품 형성',
    priceTrend: '과도한 상승, 거품 위험',
    riskLevel: 'HIGH',
    recommendedAction: '매도 (이익 실현)',
    emoji: '🎈',
  },

  // B 단계: 금리 상승 → 시장 조정
  [EggPhase.B1_CORRECTION]: {
    phase: EggPhase.B1_CORRECTION,
    title: 'Correction',
    titleKorean: '조정 단계',
    subtitle: '시장 조정 - 수익 실현',
    color: '#CF6679', // 빨간색 (위험)
    historicalSuccessRate: 65,
    description:
      '시장이 조정되고 있습니다. 금리는 아직 상승 초기 단계지만, 시장 심리가 악화되면서 자산 가격이 하락합니다. 조기 매도자들의 시점입니다.',
    investorSentiment: '불안감, 포지션 정리',
    priceTrend: '하락 추세, 변동성 증가',
    riskLevel: 'MEDIUM',
    recommendedAction: '일부 매도 (수익 실현)',
    emoji: '📉',
  },

  [EggPhase.B2_ACCOMPANIMENT]: {
    phase: EggPhase.B2_ACCOMPANIMENT,
    title: 'Accompaniment',
    titleKorean: '하강 파도 단계',
    subtitle: '금리 상승 중 - 방어 국면',
    color: '#EF5350', // 더 진한 빨강
    historicalSuccessRate: 45,
    description:
      '금리가 계속 상승하고 시장도 계속 하락합니다. 비즈니스 심리가 악화되고, 기업 실적도 둔화됩니다. 방어적 포지션 권장.',
    investorSentiment: '공포, 손절매 가능',
    priceTrend: '지속적 하락, 약한 모멘텀',
    riskLevel: 'HIGH',
    recommendedAction: '보유 또는 점진적 감소',
    emoji: '⬇️',
  },

  [EggPhase.B3_EXAGGERATION]: {
    phase: EggPhase.B3_EXAGGERATION,
    title: 'Exaggeration',
    titleKorean: '과도 하락 단계',
    subtitle: '금리 고점 재진입 - 매도 신호',
    color: '#C62828', // 진한 빨강
    historicalSuccessRate: 62,
    description:
      '금리가 고점으로 돌아갔으며, 시장도 극도로 약세입니다. 투자자들의 공포가 극에 달하고, 자산 가격은 내재 가치 이하로 내려갑니다. 다음 상승장의 시작점입니다.',
    investorSentiment: '극도의 공포, 절망',
    priceTrend: '극저점 형성, 역전 신호',
    riskLevel: 'HIGH',
    recommendedAction: '매도 (최종 정리) 또는 준비 단계',
    emoji: '☠️',
  },
};

/**
 * Egg 단계 간의 전환 규칙
 * 금리 추세에 따른 자동 진행
 */
export const PHASE_TRANSITIONS: Record<
  EggPhase,
  { next: EggPhase; condition: string }
> = {
  [EggPhase.A1_CORRECTION]: {
    next: EggPhase.A2_ACCOMPANIMENT,
    condition: 'When interest rates start falling',
  },
  [EggPhase.A2_ACCOMPANIMENT]: {
    next: EggPhase.A3_EXAGGERATION,
    condition: 'When interest rates reach bottom',
  },
  [EggPhase.A3_EXAGGERATION]: {
    next: EggPhase.B1_CORRECTION,
    condition: 'When interest rates start rising',
  },
  [EggPhase.B1_CORRECTION]: {
    next: EggPhase.B2_ACCOMPANIMENT,
    condition: 'When stock market continues declining',
  },
  [EggPhase.B2_ACCOMPANIMENT]: {
    next: EggPhase.B3_EXAGGERATION,
    condition: 'When market reaches bottom',
  },
  [EggPhase.B3_EXAGGERATION]: {
    next: EggPhase.A1_CORRECTION,
    condition: 'When interest rates peak again (new cycle)',
  },
};

/**
 * 단계 그룹화 (A vs B)
 */
export const EGG_PHASES_BY_CYCLE = {
  /** 상승장 (금리 하락) */
  BULL_MARKET: [
    EggPhase.A1_CORRECTION,
    EggPhase.A2_ACCOMPANIMENT,
    EggPhase.A3_EXAGGERATION,
  ],

  /** 조정장 (금리 상승) */
  BEAR_MARKET: [
    EggPhase.B1_CORRECTION,
    EggPhase.B2_ACCOMPANIMENT,
    EggPhase.B3_EXAGGERATION,
  ],
};

/**
 * 액션별 단계 그룹화
 */
export const PHASES_BY_ACTION = {
  BUY: [EggPhase.A1_CORRECTION],
  HOLD: [EggPhase.A2_ACCOMPANIMENT, EggPhase.B1_CORRECTION],
  SELL: [EggPhase.A3_EXAGGERATION, EggPhase.B3_EXAGGERATION],
};

/**
 * 위험도별 단계 그룹화
 */
export const PHASES_BY_RISK = {
  LOW: [EggPhase.A1_CORRECTION, EggPhase.A2_ACCOMPANIMENT],
  MEDIUM: [EggPhase.A3_EXAGGERATION, EggPhase.B1_CORRECTION],
  HIGH: [EggPhase.B2_ACCOMPANIMENT, EggPhase.B3_EXAGGERATION],
};

/**
 * 특정 단계의 메타데이터 조회
 */
export const getPhaseMetadata = (phase: EggPhase): EggPhaseMetadata => {
  return EGG_CYCLE_PHASES[phase];
};

/**
 * 모든 단계의 메타데이터 조회
 */
export const getAllPhaseMetadata = (): EggPhaseMetadata[] => {
  return Object.values(EGG_CYCLE_PHASES);
};
