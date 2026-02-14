/**
 * trafficLightScore.ts - 건강 점수 → 신호등 변환 서비스
 *
 * 역할: "신호등 변환기 부서"
 * - 기존 rebalanceScore.ts의 6팩터 건강 점수를 3색 신호등으로 변환
 * - 숫자를 색상으로 극단 단순화 (🟢🟡🔴)
 * - 무료(색상) vs 프리미엄(상세 사유) 경계선 제공
 *
 * Anti-Toss 원칙:
 * - Gateway: 점수를 3색으로 극한 단순화
 * - One Page One Card: 숫자 대신 색상으로 즉각 인지
 * - 보험 BM: 색상은 무료, "왜 이 색인지"는 프리미엄
 */

import type { HealthScoreResult, FactorResult } from './rebalanceScore';

// ============================================================================
// 타입 정의
// ============================================================================

/** 신호등 색상 */
export type TrafficLight = 'green' | 'yellow' | 'red';

/** 신호등 결과 */
export interface TrafficLightResult {
  /** 신호등 색상 */
  light: TrafficLight;

  /** 색상 hex 코드 */
  color: string; // '#4CAF50' | '#FFB74D' | '#CF6679'

  /** 배경 색상 (10% 투명도) */
  bgColor: string;

  /** 한국어 라벨 */
  label: string; // '양호' | '주의' | '위험'

  /** 이모지 */
  emoji: string; // '🟢' | '🟡' | '🔴'

  /** 건강 점수 (0~100) */
  score: number;

  /** 등급 (S/A/B/C/D) */
  grade: string;

  /** 한 줄 요약 (무료) */
  summary: string; // "자산 집중도가 높아요. 분산을 고려해보세요."

  /** 상세 사유 (프리미엄) */
  detailReason?: string;

  /** 가장 취약한 팩터 */
  weakestFactor?: {
    label: string;
    score: number;
    comment: string;
  };
}

/** 개별 자산 신호등 */
export interface AssetSignal {
  name: string;
  ticker: string;
  signal: TrafficLight;
  color: string;
}

/** 맥락 브리핑 변환 결과 (ContextBriefCard용) */
export interface ContextBriefing {
  fact: string;
  mechanism: string;
  impact: string;
  sentiment: 'calm' | 'caution' | 'alert';
  sentimentLabel: string;
}

// ============================================================================
// 색상 상수
// ============================================================================

export const TRAFFIC_COLORS = {
  green: {
    main: '#4CAF50',
    bg: 'rgba(76, 175, 80, 0.1)',
    emoji: '🟢',
    label: '양호'
  },
  yellow: {
    main: '#FFB74D',
    bg: 'rgba(255, 183, 77, 0.1)',
    emoji: '🟡',
    label: '주의'
  },
  red: {
    main: '#CF6679',
    bg: 'rgba(207, 102, 121, 0.1)',
    emoji: '🔴',
    label: '위험'
  },
} as const;

// ============================================================================
// 1. 건강 점수 → 신호등 변환
// ============================================================================

/**
 * 건강 점수를 3색 신호등으로 변환
 *
 * @param healthScore - rebalanceScore.ts의 HealthScoreResult
 * @returns TrafficLightResult
 *
 * [변환 규칙]
 * - 75-100: 🟢 green "양호"
 * - 50-74:  🟡 yellow "주의"
 * - 0-49:   🔴 red "위험"
 *
 * [summary 생성]
 * - 가장 취약한 팩터(factors 중 score 최저)의 comment 사용
 */
export function getTrafficLight(healthScore: HealthScoreResult): TrafficLightResult {
  const score = healthScore.totalScore;

  // 신호등 색상 결정
  let light: TrafficLight;
  if (score >= 75) {
    light = 'green';
  } else if (score >= 50) {
    light = 'yellow';
  } else {
    light = 'red';
  }

  const colors = TRAFFIC_COLORS[light];

  // 가장 취약한 팩터 찾기 (score 최저)
  const weakestFactor = healthScore.factors.reduce((min, factor) =>
    factor.score < min.score ? factor : min
  );

  return {
    light,
    color: colors.main,
    bgColor: colors.bg,
    label: colors.label,
    emoji: colors.emoji,
    score,
    grade: healthScore.grade,
    summary: weakestFactor.comment,
    weakestFactor: {
      label: weakestFactor.label,
      score: weakestFactor.score,
      comment: weakestFactor.comment,
    },
  };
}

// ============================================================================
// 2. 개별 자산 신호등 매핑
// ============================================================================

/**
 * 개별 자산별 신호등 매핑
 *
 * @param assets - 자산 배열 (name, ticker, currentValue 필수)
 * @param totalAssets - 총 자산 금액
 * @param overallLight - 전체 신호등 색상
 * @returns AssetSignal[] - 자산별 신호등 배열
 *
 * [매핑 규칙]
 * - overallLight === 'green': 모든 자산 green
 * - overallLight === 'yellow': 비중 30%+ 자산 yellow, 나머지 green
 * - overallLight === 'red': 비중 30%+ 자산 red, 15%+ yellow, 나머지 green
 */
export function getAssetSignals(
  assets: { name: string; ticker: string; currentValue: number }[],
  totalAssets: number,
  overallLight: TrafficLight
): AssetSignal[] {
  if (totalAssets === 0 || assets.length === 0) {
    return [];
  }

  return assets.map(asset => {
    const weight = asset.currentValue / totalAssets;

    let signal: TrafficLight;

    if (overallLight === 'green') {
      signal = 'green';
    } else if (overallLight === 'yellow') {
      signal = weight >= 0.3 ? 'yellow' : 'green';
    } else { // red
      if (weight >= 0.3) {
        signal = 'red';
      } else if (weight >= 0.15) {
        signal = 'yellow';
      } else {
        signal = 'green';
      }
    }

    return {
      name: asset.name,
      ticker: asset.ticker,
      signal,
      color: TRAFFIC_COLORS[signal].main,
    };
  });
}

// ============================================================================
// 3. 4겹 맥락카드 → 3줄 브리핑 변환
// ============================================================================

/**
 * 기존 ContextCardData (4겹) → 3줄 브리핑 변환
 *
 * @param contextData - 기존 맥락카드 데이터 (일부 필드만 사용)
 * @returns ContextBriefing
 *
 * [변환 규칙]
 * - fact = headline || '시장 데이터 준비 중'
 * - mechanism = macroChain 첫 3개를 ' → '로 연결 || '분석 중...'
 * - impact = portfolioImpact.message || '영향도 계산 중'
 *   → 가격 관련 텍스트 제거: ₩, 원, %, 만원 등 치환
 *   → 건강 점수 변동만 남김
 */
export function convertContextToBriefing(contextData: {
  headline?: string;
  macroChain?: string[];
  portfolioImpact?: { message?: string };
  sentiment?: 'calm' | 'caution' | 'alert';
}): ContextBriefing {
  // FACT: 헤드라인
  const fact = contextData.headline || '시장 데이터 준비 중';

  // MECHANISM: 거시경제 체인 (첫 3개만)
  let mechanism = '분석 중...';
  if (contextData.macroChain && contextData.macroChain.length > 0) {
    mechanism = contextData.macroChain.slice(0, 3).join(' → ');
  }

  // IMPACT: 포트폴리오 영향 (가격 텍스트 제거)
  let impact = '오늘의 시장이 내 포트폴리오에 미치는 영향을 확인하세요';
  if (contextData.portfolioImpact?.message) {
    impact = contextData.portfolioImpact.message
      // 가격 관련 문자 제거
      .replace(/₩/g, '')
      .replace(/원/g, '')
      .replace(/\d+,?\d*만/g, '') // "300만원" → ""
      .replace(/-?\d+\.\d+%/g, '') // "-1.2%" → ""
      .trim();
  }

  // SENTIMENT
  const sentiment = contextData.sentiment || 'calm';
  const sentimentLabels = { calm: '안정', caution: '주의', alert: '경계' };
  const sentimentLabel = sentimentLabels[sentiment];

  return {
    fact,
    mechanism,
    impact,
    sentiment,
    sentimentLabel,
  };
}

// ============================================================================
// 4. Empty 상태 (자산 미등록 시 기본값)
// ============================================================================

/**
 * 자산 미등록 시 기본 신호등
 *
 * @returns TrafficLightResult
 *
 * [용도]
 * - 하트 자산이 0개일 때
 * - 포트폴리오가 비어있을 때
 * - "관심 자산을 하트해주세요" 안내용
 */
export function getEmptyTrafficLight(): TrafficLightResult {
  return {
    light: 'green',
    color: TRAFFIC_COLORS.green.main,
    bgColor: TRAFFIC_COLORS.green.bg,
    label: '시작하기',
    emoji: '🟢',
    score: 0,
    grade: '-',
    summary: '관심 자산을 하트하면 건강 점수를 알려드려요',
  };
}
