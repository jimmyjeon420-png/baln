/**
 * Kostolany의 The Egg 이론 타입 정의
 * 시장 사이클 분석을 위한 핵심 인터페이스
 */

/**
 * Egg 사이클의 6단계
 * A 단계: 시장 상승 (금리 하락기)
 *   A1_CORRECTION: 금리 고점, 매수 신호
 *   A2_ACCOMPANIMENT: 금리 하락 중, 파도타기
 *   A3_EXAGGERATION: 금리 저점, 거품 경고
 *
 * B 단계: 시장 조정 (금리 상승기)
 *   B1_CORRECTION: 시장 조정, 재진입 기회
 *   B2_ACCOMPANIMENT: 금리 상승 중, 방어
 *   B3_EXAGGERATION: 금리 고점 재진입, 매도 신호
 */
export enum EggPhase {
  // A 단계 (금리 하락, 시장 상승)
  A1_CORRECTION = 'A1_CORRECTION',           // 금리 고점 - 매수 신호
  A2_ACCOMPANIMENT = 'A2_ACCOMPANIMENT',     // 금리 하락 - 파도타기
  A3_EXAGGERATION = 'A3_EXAGGERATION',       // 금리 저점 - 거품 경고

  // B 단계 (금리 상승, 시장 조정)
  B1_CORRECTION = 'B1_CORRECTION',           // 시장 조정 - 수익 실현
  B2_ACCOMPANIMENT = 'B2_ACCOMPANIMENT',     // 금리 상승 - 방어
  B3_EXAGGERATION = 'B3_EXAGGERATION',       // 금리 고점 재진입 - 매도
}

/**
 * 금리 추세 입력값
 */
export enum InterestRateTrend {
  PEAK = 'PEAK',                   // 금리 고점 (매수 신호)
  FALLING = 'FALLING',             // 금리 하락 중
  BOTTOM = 'BOTTOM',               // 금리 저점 (매도 신호)
  RISING = 'RISING',               // 금리 상승 중
  UNKNOWN = 'UNKNOWN',             // 미정의
}

/**
 * 시장 심리 입력값
 */
export enum MarketSentiment {
  FEAR = 'FEAR',                   // 극도의 공포 (기회)
  CAUTIOUS = 'CAUTIOUS',           // 조심스러움
  NEUTRAL = 'NEUTRAL',             // 중립
  OPTIMISTIC = 'OPTIMISTIC',       // 낙관적
  GREED = 'GREED',                 // 탐욕 (위험)
  UNKNOWN = 'UNKNOWN',             // 미정의
}

/**
 * 거래량 추세
 */
export enum VolumeCondition {
  LOW = 'LOW',                     // 저거래량
  MEDIUM = 'MEDIUM',               // 중간
  HIGH = 'HIGH',                   // 고거래량
  UNKNOWN = 'UNKNOWN',             // 미정의
}

/**
 * Egg 사이클 분석 입력값
 */
export interface MarketInputs {
  /** 사용자가 설정한 금리 추세 */
  interestRateTrend: InterestRateTrend;

  /** Mock: 시장 심리 */
  sentiment?: MarketSentiment;

  /** Mock: 거래량 */
  volume?: VolumeCondition;
}

/**
 * 투자 액션 타입
 */
export enum InvestmentAction {
  BUY = 'BUY',                     // 매수
  HOLD = 'HOLD',                   // 보유
  SELL = 'SELL',                   // 매도
}

/**
 * Egg 사이클 분석 결과
 */
export interface EggCycleAnalysis {
  /** 현재 Egg 단계 */
  currentPhase: EggPhase;

  /** 추천 액션 */
  action: InvestmentAction;

  /** 한국어 액션 (UI 표시용) */
  actionKorean: string;

  /** 신뢰도 (0-100) */
  confidence: number;

  /** 상세 설명 */
  description: string;

  /** 다음 예상 단계 */
  nextPhase: EggPhase;

  /** Egg 단계의 부제목 */
  phaseTitle: string;

  /** 과거 데이터 기준 진입/이탈 신호 강도 */
  historicalSuccess: number; // 0-100
}

/**
 * 사용자 진단 설문 답변
 */
export interface DiagnosisAnswers {
  /** 금리 추세 (필수) */
  interestRateTrend: InterestRateTrend;

  /** 거시 전망 (설문) */
  macroOutlook?: string;

  /** 선호 투자 테마 (설문) */
  investmentTheme?: string;

  /** 믿는 투자 구루 (설문) */
  favoriteGuru?: string;

  /** 설문 완료 타임스탐프 */
  timestamp?: number;
}

/**
 * 시장 뉴스 피드 (Mock용)
 */
export interface MarketFeedItem {
  /** 자산명 (Bitcoin, Nasdaq 등) */
  asset: string;

  /** 가격 변동 방향 */
  movement: 'Up' | 'Down' | 'Stable';

  /** 변동 이유 */
  reason: string;

  /** 뉴스 출처 */
  source: string;

  /** 발생 시각 */
  timestamp: number;

  /** 영향도 */
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * 시장을 움직이는 Top 3 요인
 */
export interface MarketDriver {
  /** 순위 */
  rank: number;

  /** 제목 */
  title: string;

  /** 설명 */
  description: string;

  /** 영향받는 자산 */
  affectedAssets: string[];

  /** 영향도 */
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  /** 아이콘/이모지 */
  emoji: string;
}
