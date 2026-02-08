/**
 * crisisDetection.ts - 시장 위기 감지 엔진
 *
 * 역할: "시장 붕괴 조기 경보 시스템"
 * - 시장 급락 자동 감지 (KOSPI/NASDAQ/BTC)
 * - 3단계 위기 등급 판정
 * - 단계별 사용자 메시지 생성
 *
 * [위기 등급]
 * - moderate: -3% 이상 급락 → "시장이 흔들리고 있어요"
 * - severe: -5% 이상 급락 → "큰 변동이 감지됐습니다"
 * - extreme: -7% 이상 급락 → "역사적 급락입니다"
 *
 * [확장 계획]
 * TODO: KOSPI/NASDAQ 실시간 API 통합 (현재는 BTC + sentiment 기반)
 * TODO: VIX 공포지수 연동
 * TODO: 외국인/기관 매도 감지
 */

// ============================================================================
// 타입 정의
// ============================================================================

/** 위기 등급 */
export type CrisisLevel = 'none' | 'moderate' | 'severe' | 'extreme';

/** 시장 변동률 데이터 */
export interface MarketChangeData {
  /** KOSPI 변동률 (%) */
  kospiChange?: number;
  /** NASDAQ 변동률 (%) */
  nasdaqChange?: number;
  /** BTC 24시간 변동률 (%) */
  btcChange?: number;
  /** 시장 센티먼트 (AI 분석) */
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  /** VIX 공포지수 (향후 확장) */
  vixLevel?: number;
}

/** 위기 감지 결과 */
export interface CrisisDetectionResult {
  /** 위기 등급 */
  level: CrisisLevel;
  /** 사용자에게 표시할 메시지 */
  message: string;
  /** 위기 상황 여부 */
  isInCrisis: boolean;
  /** 가장 큰 하락을 기록한 시장 */
  primaryMarket: string | null;
  /** 해당 시장의 변동률 */
  primaryChange: number | null;
}

// ============================================================================
// 위기 감지 로직
// ============================================================================

/**
 * 시장 위기 감지
 * @param data - 시장 변동률 데이터
 * @returns 위기 등급 및 메시지
 *
 * [판정 기준]
 * 1. 주요 지수(KOSPI/NASDAQ/BTC) 중 하나라도 -3% 이상 하락 시 위기 감지
 * 2. sentiment가 'BEARISH'이면 위기 등급 1단계 상향
 * 3. 여러 지수가 동시 하락 시 위기 등급 가중
 */
export function detectCrisis(data: MarketChangeData): CrisisDetectionResult {
  const { kospiChange, nasdaqChange, btcChange, sentiment } = data;

  // 1) 가장 큰 하락폭 찾기
  const changes = [
    { market: 'KOSPI', change: kospiChange },
    { market: 'NASDAQ', change: nasdaqChange },
    { market: 'BTC', change: btcChange },
  ].filter((item) => item.change !== undefined) as { market: string; change: number }[];

  if (changes.length === 0) {
    return {
      level: 'none',
      message: '',
      isInCrisis: false,
      primaryMarket: null,
      primaryChange: null,
    };
  }

  // 가장 큰 하락폭 (절댓값 기준)
  const sorted = changes.sort((a, b) => a.change - b.change);
  const worst = sorted[0];
  const worstChange = worst.change;

  // 2) 동시 하락 개수 (모두 -2% 이상 하락)
  const multiCrashCount = changes.filter((item) => item.change < -2).length;

  // 3) 기본 위기 등급 판정
  let baseLevel: CrisisLevel = 'none';

  if (worstChange <= -7) {
    baseLevel = 'extreme';
  } else if (worstChange <= -5) {
    baseLevel = 'severe';
  } else if (worstChange <= -3) {
    baseLevel = 'moderate';
  }

  // 4) 센티먼트 가중치 (BEARISH이면 1단계 상향)
  let finalLevel = baseLevel;
  if (sentiment === 'BEARISH' && baseLevel === 'moderate') {
    finalLevel = 'severe';
  }

  // 5) 동시 하락 가중치 (3개 지수 모두 -2% 이상 하락 시 1단계 상향)
  if (multiCrashCount >= 3 && finalLevel === 'moderate') {
    finalLevel = 'severe';
  }

  // 6) 메시지 생성
  const message = getCrisisMessage(finalLevel, worst.market);

  return {
    level: finalLevel,
    message,
    isInCrisis: finalLevel !== 'none',
    primaryMarket: worst.market,
    primaryChange: worstChange,
  };
}

// ============================================================================
// 위기 등급별 메시지
// ============================================================================

/**
 * 위기 등급에 따른 사용자 메시지 생성
 * @param level - 위기 등급
 * @param market - 주요 하락 시장
 * @returns 푸시 알림 + 배너 메시지
 *
 * [메시지 전략]
 * - moderate: 불안감 자극 X, 맥락 제공으로 유도
 * - severe: 기관 행동 궁금증 유발 → Premium 전환
 * - extreme: 역사적 비교 → 안심 제공
 */
function getCrisisMessage(level: CrisisLevel, market: string): string {
  switch (level) {
    case 'moderate':
      return `${market}가 흔들리고 있어요. 맥락 카드에서 이유를 확인하세요`;

    case 'severe':
      return `${market}에 큰 변동이 감지됐습니다. 기관들은 지금 어떻게 하고 있을까요?`;

    case 'extreme':
      return `${market} 역사적 급락입니다. 과거 비슷한 상황을 맥락 카드에서 확인하세요`;

    default:
      return '';
  }
}

// ============================================================================
// 배너 스타일 설정
// ============================================================================

/**
 * 위기 등급에 따른 배너 색상 및 아이콘
 */
export function getCrisisBannerStyle(level: CrisisLevel): {
  backgroundColor: string;
  borderColor: string;
  iconName: 'warning-outline' | 'alert-circle-outline';
  iconColor: string;
  textColor: string;
} {
  switch (level) {
    case 'moderate':
      return {
        backgroundColor: '#2A1A0A', // 주황 어두운 배경
        borderColor: '#FF9800',
        iconName: 'warning-outline',
        iconColor: '#FF9800',
        textColor: '#FF9800',
      };

    case 'severe':
    case 'extreme':
      return {
        backgroundColor: '#2A0A0A', // 빨강 어두운 배경
        borderColor: '#CF6679',
        iconName: 'alert-circle-outline',
        iconColor: '#CF6679',
        textColor: '#CF6679',
      };

    default:
      return {
        backgroundColor: '#1E1E1E',
        borderColor: '#333333',
        iconName: 'warning-outline',
        iconColor: '#888888',
        textColor: '#888888',
      };
  }
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 위기 등급 우선순위 (높을수록 심각)
 */
export function getCrisisPriority(level: CrisisLevel): number {
  switch (level) {
    case 'extreme':
      return 3;
    case 'severe':
      return 2;
    case 'moderate':
      return 1;
    default:
      return 0;
  }
}
