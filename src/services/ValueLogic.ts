/**
 * Value Logic - Berkshire Hathaway 철학 기반 안전도 분석
 * 자산의 기본적 가치와 안전마진(Safety Margin)을 평가합니다
 */

import { Asset, AssetType } from '../types/asset';

/**
 * 자산의 안전도 점수
 */
export enum AssetSafetyTier {
  /** 극도로 위험함 (암호화폐) */
  EXTREME_RISK = 20,

  /** 높은 위험 (성장주, 기술주) */
  HIGH_RISK = 40,

  /** 중간 (배당주, 혼합 펀드) */
  MEDIUM = 60,

  /** 낮은 위험 (채권, ETF) */
  LOW_RISK = 80,

  /** 최대 안전 (현금, 안정자산) */
  MAXIMUM_SAFETY = 100,
}

/**
 * 자산별 안전도 점수 매핑
 */
const ASSET_SAFETY_SCORES: Record<string, number> = {
  // 암호화폐 (극도의 위험)
  bitcoin: AssetSafetyTier.EXTREME_RISK,
  ethereum: AssetSafetyTier.EXTREME_RISK,
  crypto: AssetSafetyTier.EXTREME_RISK,

  // 성장/기술주 (높은 위험)
  aapl: AssetSafetyTier.HIGH_RISK,
  nvidia: AssetSafetyTier.HIGH_RISK,
  tesla: AssetSafetyTier.HIGH_RISK,
  tech: AssetSafetyTier.HIGH_RISK,
  growth: AssetSafetyTier.HIGH_RISK,
  nasdaq: AssetSafetyTier.HIGH_RISK,
  qqq: AssetSafetyTier.HIGH_RISK,

  // 배당주 (중간)
  dividend: AssetSafetyTier.MEDIUM,
  stock: AssetSafetyTier.MEDIUM,
  equity: AssetSafetyTier.MEDIUM,

  // 채권/안정자산 (낮은 위험)
  bond: AssetSafetyTier.LOW_RISK,
  etf: AssetSafetyTier.LOW_RISK,
  treasury: AssetSafetyTier.LOW_RISK,

  // 현금 (최대 안전)
  cash: AssetSafetyTier.MAXIMUM_SAFETY,
  usd: AssetSafetyTier.MAXIMUM_SAFETY,
  stable: AssetSafetyTier.MAXIMUM_SAFETY,
  usdt: AssetSafetyTier.MAXIMUM_SAFETY,
  usdc: AssetSafetyTier.MAXIMUM_SAFETY,

  // 부동산 (중간)
  real: AssetSafetyTier.MEDIUM,
  estate: AssetSafetyTier.MEDIUM,
  property: AssetSafetyTier.MEDIUM,
};

/**
 * 자산의 공격성 분류
 * "Offense (성장)" vs "Defense (가치/현금)"
 */
export enum AssetPersonality {
  /** 공격형: 고성장, 고변동성 */
  OFFENSE = 'OFFENSE',

  /** 방어형: 안정적, 현금흐름 기반 */
  DEFENSE = 'DEFENSE',
}

/**
 * 자산별 공격성 분류
 */
const ASSET_PERSONALITIES: Record<string, AssetPersonality> = {
  // 공격형
  bitcoin: AssetPersonality.OFFENSE,
  ethereum: AssetPersonality.OFFENSE,
  crypto: AssetPersonality.OFFENSE,
  aapl: AssetPersonality.OFFENSE,
  nvidia: AssetPersonality.OFFENSE,
  tesla: AssetPersonality.OFFENSE,
  tech: AssetPersonality.OFFENSE,
  growth: AssetPersonality.OFFENSE,
  nasdaq: AssetPersonality.OFFENSE,
  qqq: AssetPersonality.OFFENSE,

  // 방어형
  cash: AssetPersonality.DEFENSE,
  usd: AssetPersonality.DEFENSE,
  stable: AssetPersonality.DEFENSE,
  usdt: AssetPersonality.DEFENSE,
  usdc: AssetPersonality.DEFENSE,
  bond: AssetPersonality.DEFENSE,
  treasury: AssetPersonality.DEFENSE,
  dividend: AssetPersonality.DEFENSE,

  // 중립 (자산유형으로 판단)
  stock: AssetPersonality.OFFENSE,
  equity: AssetPersonality.OFFENSE,
  etf: AssetPersonality.DEFENSE,
  real: AssetPersonality.DEFENSE,
  estate: AssetPersonality.DEFENSE,
  property: AssetPersonality.DEFENSE,
};

/**
 * 개별 자산의 안전도 점수 계산
 */
export const getAssetSafetyScore = (asset: Asset): number => {
  const nameLower = asset.name.toLowerCase();
  const tickerLower = asset.ticker?.toLowerCase() || '';

  // 이름 매칭
  for (const [key, score] of Object.entries(ASSET_SAFETY_SCORES)) {
    if (nameLower.includes(key)) {
      return score;
    }
  }

  // 티커 매칭
  for (const [key, score] of Object.entries(ASSET_SAFETY_SCORES)) {
    if (tickerLower.includes(key)) {
      return score;
    }
  }

  // 자산 유형으로 판단
  if (asset.assetType === AssetType.ILLIQUID) {
    return AssetSafetyTier.MEDIUM; // 부동산, 미술품 등
  }

  // 기본값: 중간 위험
  return AssetSafetyTier.MEDIUM;
};

/**
 * 개별 자산의 공격성 분류
 */
export const getAssetPersonality = (asset: Asset): AssetPersonality => {
  const nameLower = asset.name.toLowerCase();
  const tickerLower = asset.ticker?.toLowerCase() || '';

  // 이름 매칭
  for (const [key, personality] of Object.entries(ASSET_PERSONALITIES)) {
    if (nameLower.includes(key)) {
      return personality;
    }
  }

  // 티커 매칭
  for (const [key, personality] of Object.entries(ASSET_PERSONALITIES)) {
    if (tickerLower.includes(key)) {
      return personality;
    }
  }

  // 기본값: 공격형
  return AssetPersonality.OFFENSE;
};

/**
 * 포트폴리오 전체의 안전도 점수 (가중 평균)
 * 0-100 (100 = 최고 안전)
 */
export const calculatePortfolioSafetyScore = (assets: Asset[]): number => {
  if (!assets || assets.length === 0) return 0;

  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);

  if (totalValue <= 0) return 0;

  const weightedScore = assets.reduce((sum, asset) => {
    const weight = asset.currentValue / totalValue;
    const score = getAssetSafetyScore(asset);
    return sum + weight * score;
  }, 0);

  return Math.round(weightedScore);
};

/**
 * 포트폴리오 공격형/방어형 비율
 */
export const calculateOffenseDefenseRatio = (
  assets: Asset[]
): {
  offenseValue: number;
  defenseValue: number;
  offensePercent: number;
  defensePercent: number;
} => {
  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);

  if (totalValue <= 0) {
    return {
      offenseValue: 0,
      defenseValue: 0,
      offensePercent: 0,
      defensePercent: 0,
    };
  }

  const offenseValue = assets
    .filter((a) => getAssetPersonality(a) === AssetPersonality.OFFENSE)
    .reduce((sum, a) => sum + a.currentValue, 0);

  const defenseValue = totalValue - offenseValue;

  return {
    offenseValue,
    defenseValue,
    offensePercent: (offenseValue / totalValue) * 100,
    defensePercent: (defenseValue / totalValue) * 100,
  };
};

/**
 * 안전 마진 점수 (Warren Buffett의 개념)
 * 현재 포트폴리오가 시장 충격에 견딜 수 있는 정도
 *
 * Safety Margin = (현재 안전도) - (시장 변동성 대비 필요 안전도)
 */
export const calculateSafetyMargin = (
  assets: Asset[],
  userRiskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' = 'MODERATE'
): {
  safetyMarginScore: number; // -50 ~ +50
  isHealthy: boolean;
  recommendation: string;
  emoji: string;
} => {
  const currentSafetyScore = calculatePortfolioSafetyScore(assets);

  // 사용자의 위험 허용도에 따른 목표 안전도
  const requiredSafetyScores: Record<string, number> = {
    CONSERVATIVE: 70, // 보수적: 70 이상 필요
    MODERATE: 55,     // 중도: 55 이상 필요
    AGGRESSIVE: 40,   // 공격적: 40 이상 필요
  };

  const requiredScore = requiredSafetyScores[userRiskTolerance];
  const marginScore = currentSafetyScore - requiredScore;

  let recommendation = '';
  let emoji = '';

  if (marginScore >= 20) {
    recommendation = '매우 안전함. 현재 포지션 유지 권장';
    emoji = '🛡️';
  } else if (marginScore >= 10) {
    recommendation = '안전함. 필요시 점진적 조정 가능';
    emoji = '✅';
  } else if (marginScore >= 0) {
    recommendation = '적절함. 목표 유지';
    emoji = '📊';
  } else if (marginScore >= -10) {
    recommendation = '주의. 점진적으로 방어 자산 증가 권장';
    emoji = '⚠️';
  } else {
    recommendation = '위험. 즉시 리밸런싱 필요';
    emoji = '🚨';
  }

  return {
    safetyMarginScore: marginScore,
    isHealthy: marginScore >= 0,
    recommendation,
    emoji,
  };
};

/**
 * Value Logic 분석 결과
 */
export interface ValueAnalysis {
  /** 현재 안전도 점수 (0-100) */
  safetyScore: number;

  /** 공격형/방어형 비율 */
  offenseDefenseRatio: {
    offensePercent: number;
    defensePercent: number;
  };

  /** 안전 마진 분석 */
  safetyMargin: {
    score: number; // -50 ~ +50
    isHealthy: boolean;
    recommendation: string;
  };

  /** 자산별 분류 */
  assetBreakdown: {
    assetId: string;
    assetName: string;
    currentValue: number;
    safetyScore: number;
    personality: AssetPersonality;
  }[];

  /** 종합 판단 */
  verdict: 'VERY_SAFE' | 'SAFE' | 'MODERATE' | 'RISKY' | 'VERY_RISKY';

  /** 즉시 액션 필요 여부 */
  requiresAction: boolean;
}

/**
 * 완전한 Value 분석 수행
 */
export const analyzePortfolioValue = (
  assets: Asset[],
  userRiskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' = 'MODERATE'
): ValueAnalysis => {
  const safetyScore = calculatePortfolioSafetyScore(assets);
  const offenseDefenseRatio = calculateOffenseDefenseRatio(assets);
  const safetyMargin = calculateSafetyMargin(assets, userRiskTolerance);

  // 자산별 분류
  const assetBreakdown = assets.map((asset) => ({
    assetId: asset.id,
    assetName: asset.name,
    currentValue: asset.currentValue,
    safetyScore: getAssetSafetyScore(asset),
    personality: getAssetPersonality(asset),
  }));

  // 종합 판단
  let verdict: ValueAnalysis['verdict'];
  if (safetyScore >= 80) {
    verdict = 'VERY_SAFE';
  } else if (safetyScore >= 65) {
    verdict = 'SAFE';
  } else if (safetyScore >= 50) {
    verdict = 'MODERATE';
  } else if (safetyScore >= 35) {
    verdict = 'RISKY';
  } else {
    verdict = 'VERY_RISKY';
  }

  // 즉시 액션 필요 여부
  const requiresAction = safetyMargin.safetyMarginScore < -10;

  return {
    safetyScore,
    offenseDefenseRatio,
    safetyMargin: {
      score: safetyMargin.safetyMarginScore,
      isHealthy: safetyMargin.isHealthy,
      recommendation: safetyMargin.recommendation,
    },
    assetBreakdown,
    verdict,
    requiresAction,
  };
};

/**
 * Timing (KostolanyLogic) + Value (ValueLogic) 통합 판단
 */
export interface HybridInvestmentSignal {
  /** 타이밍 신호 (매수/보유/매도) */
  timingAction: string;

  /** 가치 신호 (안전/위험) */
  valueCaution: string;

  /** 최종 액션 (통합 판단) */
  finalAction: string;

  /** 상세 설명 */
  explanation: string;

  /** 아이콘/감정 표현 */
  emoji: string;

  /** 우선순위 */
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Timing + Value 하이브리드 신호 생성
 */
export const generateHybridSignal = (
  timingAction: 'BUY' | 'HOLD' | 'SELL',
  valueSafetyScore: number,
  offensePercent: number,
  isConservativeUser: boolean
): HybridInvestmentSignal => {
  // 케이스 1: 타이밍 "매도" 신호
  if (timingAction === 'SELL') {
    // 그런데 자산이 저평가됨 (안전도 70 이상)
    if (valueSafetyScore >= 70) {
      return {
        timingAction: 'SELL',
        valueCaution: 'UNDERVALUED',
        finalAction: 'HOLD_GOOD_ASSETS',
        explanation:
          '시장이 과열되었지만, 현재 보유 자산은 좋은 가치를 제공합니다. 우량 자산은 보유하세요.',
        emoji: '🟡',
        priority: 'MEDIUM',
      };
    }

    // 타이밍 + 가치 모두 나쁨 (즉시 행동)
    if (valueSafetyScore < 50 && offensePercent > 70) {
      return {
        timingAction: 'SELL',
        valueCaution: 'OVERVALUED',
        finalAction: 'SELL_URGENT',
        explanation:
          '시장 과열 + 포트폴리오 고위험. 즉시 방어 자산 확보 필요합니다.',
        emoji: '🚨',
        priority: 'CRITICAL',
      };
    }

    // 기본 매도 신호
    return {
      timingAction: 'SELL',
      valueCaution: 'NORMAL',
      finalAction: 'SELL_GRADUALLY',
      explanation: '시장이 과열되었습니다. 점진적으로 이익을 실현하세요.',
      emoji: '📉',
      priority: 'HIGH',
    };
  }

  // 케이스 2: 타이밍 "매수" 신호
  if (timingAction === 'BUY') {
    // 보수적 사용자인데 안전도 낮음 (경고)
    if (isConservativeUser && valueSafetyScore < 50) {
      return {
        timingAction: 'BUY',
        valueCaution: 'RISKY',
        finalAction: 'BUY_CAREFULLY',
        explanation:
          '시장이 저평가되었지만, 포트폴리오 위험도가 높습니다. 신중하게 매수하세요.',
        emoji: '🟡',
        priority: 'MEDIUM',
      };
    }

    // 좋은 기회 (현금이 충분하고 자산이 저평가)
    if (valueSafetyScore >= 70) {
      return {
        timingAction: 'BUY',
        valueCaution: 'UNDERVALUED',
        finalAction: 'BUY_AGGRESSIVE',
        explanation:
          '금리 고점 + 좋은 자산 = 최고의 기회. 과감하게 매수하세요.',
        emoji: '💰',
        priority: 'HIGH',
      };
    }

    // 기본 매수 신호
    return {
      timingAction: 'BUY',
      valueCaution: 'NORMAL',
      finalAction: 'BUY_NORMAL',
      explanation: '시장이 저평가되었습니다. 적립식으로 매수하세요.',
      emoji: '📈',
      priority: 'MEDIUM',
    };
  }

  // 케이스 3: 타이밍 "보유" 신호
  if (timingAction === 'HOLD') {
    // 안전도가 나쁘면 조정 권고
    if (valueSafetyScore < 50) {
      return {
        timingAction: 'HOLD',
        valueCaution: 'RISKY',
        finalAction: 'REBALANCE_NOW',
        explanation:
          '시장은 중립이지만, 포트폴리오가 위험합니다. 점진적으로 리밸런싱하세요.',
        emoji: '⚠️',
        priority: 'HIGH',
      };
    }

    // 건강한 보유
    return {
      timingAction: 'HOLD',
      valueCaution: 'NORMAL',
      finalAction: 'HOLD_STEADY',
      explanation:
        '현재 시장 신호는 중립입니다. 포트폴리오를 유지하세요.',
      emoji: '📊',
      priority: 'LOW',
    };
  }

  // 기본값
  return {
    timingAction: 'HOLD',
    valueCaution: 'UNKNOWN',
    finalAction: 'ANALYZE_MORE',
    explanation: '더 많은 정보가 필요합니다.',
    emoji: '❓',
    priority: 'LOW',
  };
};

/**
 * Value Logic 싱글톤 클래스
 */
export class ValueLogic {
  private static instance: ValueLogic;

  private constructor() {}

  public static getInstance(): ValueLogic {
    if (!ValueLogic.instance) {
      ValueLogic.instance = new ValueLogic();
    }
    return ValueLogic.instance;
  }

  /**
   * 포트폴리오 분석
   */
  public analyze(
    assets: Asset[],
    userRiskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' = 'MODERATE'
  ): ValueAnalysis {
    return analyzePortfolioValue(assets, userRiskTolerance);
  }

  /**
   * Timing + Value 하이브리드 신호
   */
  public hybrid(
    timingAction: 'BUY' | 'HOLD' | 'SELL',
    assets: Asset[],
    isConservativeUser: boolean = false
  ): HybridInvestmentSignal {
    const analysis = this.analyze(assets);
    return generateHybridSignal(
      timingAction,
      analysis.safetyScore,
      analysis.offenseDefenseRatio.offensePercent,
      isConservativeUser
    );
  }
}

/**
 * 전역 싱글톤
 */
export const valueLogic = ValueLogic.getInstance();
