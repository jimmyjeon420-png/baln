/**
 * 6팩터 리밸런싱 건강 점수 엔진
 * ─────────────────────────────────
 * 브릿지워터 Risk Parity + 로보어드바이저 실무 기반
 * AI 의존 없이 앱 내 즉시 계산 (순수 함수)
 *
 * 6팩터: 배분 이탈도 / 자산 집중도 / 상관관계 / 변동성 / 하방리스크 / 세금효율
 */

import { Asset, AssetType } from '../types/asset';

// ============================================================================
// 타입 정의
// ============================================================================

/** 자산 분류 카테고리 */
export type AssetCategory = 'cash' | 'bond' | 'large_cap' | 'realestate' | 'bitcoin' | 'altcoin';

/** 건강 등급 */
export type HealthGrade = 'S' | 'A' | 'B' | 'C' | 'D';

/** 개별 팩터 결과 */
export interface FactorResult {
  label: string;       // 팩터 이름
  icon: string;        // 이모지 아이콘
  rawPenalty: number;  // 원시 패널티 (0~100)
  weight: number;      // 가중치 (0~1)
  weightedPenalty: number; // 가중 패널티
  score: number;       // 개별 점수 (100 - rawPenalty)
  comment: string;     // 한 줄 코멘트
}

/** 부동산 요약 정보 */
export interface RealEstateSummary {
  totalValue: number;      // 부동산 총 평가금액
  totalDebt: number;       // 부동산 총 대출
  netValue: number;        // 순자산 (평가 - 대출)
  ratioOfTotal: number;    // 전체 자산 대비 비율 (%)
  message: string;         // 긍정적 메시지
}

/** 종합 건강 점수 결과 */
export interface HealthScoreResult {
  totalScore: number;      // 종합 점수 (0~100)
  grade: HealthGrade;      // 등급 (S/A/B/C/D)
  gradeColor: string;      // 등급 색상
  gradeBgColor: string;    // 등급 배경색
  gradeLabel: string;      // 한국어 라벨 ("최적"/"양호"/...)
  factors: FactorResult[]; // 7개 팩터 상세
  summary: string;         // 가장 취약 팩터 중심 한 줄 요약
  driftStatus: {           // 기존 배너 호환용
    label: string;
    color: string;
    bgColor: string;
  };
  realEstateSummary?: RealEstateSummary; // 부동산 별도 요약 (비유동 자산이 있을 때만)
}

// ============================================================================
// 상수 테이블
// ============================================================================

/** 크립토 티커 목록 (CoinGeckoProvider 기반) */
const CRYPTO_TICKERS = new Set([
  'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE', 'MATIC',
  'LTC', 'BCH', 'XLM', 'LINK', 'DOT', 'AVAX', 'ATOM', 'UNI', 'AAVE', 'SUSHI',
  // 추가 알트코인 (확장용)
  'SHIB', 'APE', 'SAND', 'MANA', 'FTM', 'NEAR', 'ALGO', 'VET', 'EOS', 'TRX',
]);

/** 스테이블코인 (현금 등가) */
const STABLECOIN_TICKERS = new Set(['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD']);

/** 채권 ETF 티커 */
const BOND_TICKERS = new Set([
  'AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'TIP', 'VCIT', 'GOVT',
  'VGSH', 'SCHO', 'MUB', 'BNDX', 'EMB',
]);

/** 자산군별 연간 변동성 (학술 데이터 기반, %) */
const VOLATILITY_MAP: Record<AssetCategory, number> = {
  cash: 1,
  bond: 6,
  large_cap: 18,
  realestate: 15,
  bitcoin: 70,
  altcoin: 100,
};

/**
 * 상관계수 매트릭스 (7×7, 학술 데이터 기반)
 * 순서: cash, bond, large_cap, realestate, bitcoin, altcoin
 */
const CORRELATION_MATRIX: Record<AssetCategory, Record<AssetCategory, number>> = {
  cash:      { cash: 1.00, bond: 0.10, large_cap: -0.05, realestate: 0.05, bitcoin: 0.00, altcoin: 0.00 },
  bond:      { cash: 0.10, bond: 1.00, large_cap: -0.20, realestate: 0.15, bitcoin: 0.05, altcoin: 0.05 },
  large_cap: { cash: -0.05, bond: -0.20, large_cap: 1.00, realestate: 0.55, bitcoin: 0.35, altcoin: 0.45 },
  realestate:{ cash: 0.05, bond: 0.15, large_cap: 0.55, realestate: 1.00, bitcoin: 0.20, altcoin: 0.25 },
  bitcoin:   { cash: 0.00, bond: 0.05, large_cap: 0.35, realestate: 0.20, bitcoin: 1.00, altcoin: 0.80 },
  altcoin:   { cash: 0.00, bond: 0.05, large_cap: 0.45, realestate: 0.25, bitcoin: 0.80, altcoin: 1.00 },
};

/** 등급 설정 */
const GRADE_CONFIG: Record<HealthGrade, { color: string; bgColor: string; label: string }> = {
  S: { color: '#4CAF50', bgColor: 'rgba(76,175,80,0.15)', label: '최적' },
  A: { color: '#66BB6A', bgColor: 'rgba(102,187,106,0.15)', label: '양호' },
  B: { color: '#FFB74D', bgColor: 'rgba(255,183,77,0.15)', label: '보통' },
  C: { color: '#FF8A65', bgColor: 'rgba(255,138,101,0.15)', label: '주의' },
  D: { color: '#CF6679', bgColor: 'rgba(207,102,121,0.15)', label: '개선 필요' },
};

// ============================================================================
// 자산 분류 함수
// ============================================================================

/**
 * 개별 자산을 6개 카테고리로 분류
 * - illiquid → 부동산
 * - BTC → bitcoin
 * - 스테이블코인 → 현금
 * - 채권 ETF → 채권
 * - 기타 크립토 → altcoin
 * - 나머지 → large_cap (주식)
 */
export function classifyAsset(asset: Asset): AssetCategory {
  const ticker = (asset.ticker || '').toUpperCase();

  // 비유동 자산 → 부동산
  if (asset.assetType === AssetType.ILLIQUID) return 'realestate';

  // 스테이블코인 → 현금 등가
  if (STABLECOIN_TICKERS.has(ticker)) return 'cash';

  // 비트코인
  if (ticker === 'BTC') return 'bitcoin';

  // 기타 크립토
  if (CRYPTO_TICKERS.has(ticker)) return 'altcoin';

  // 채권 ETF
  if (BOND_TICKERS.has(ticker)) return 'bond';

  // 나머지 → 주식 (대형주)
  return 'large_cap';
}

// ============================================================================
// 팩터 계산 함수들
// ============================================================================

/** 자산의 현재 평가 금액 (NaN/Infinity 방어) */
function getAssetValue(asset: Asset): number {
  const computed = (asset.quantity != null && asset.quantity > 0 && asset.currentPrice != null && asset.currentPrice > 0)
    ? asset.quantity * asset.currentPrice
    : asset.currentValue;
  return Number.isFinite(computed) ? computed : 0;
}

/**
 * 자산의 순자산 (총자산 - 대출)
 * Phase 1: 부동산 대출만 지원
 */
export function getNetAssetValue(asset: Asset): number {
  const grossValue = getAssetValue(asset);
  const debt = asset.debtAmount || 0;
  return Math.max(0, grossValue - debt);
}

/**
 * LTV (Loan-to-Value) 계산
 * 대출 잔액 / 자산 가치 × 100
 */
export function calculateLTV(asset: Asset): number {
  const grossValue = getAssetValue(asset);
  const debt = asset.debtAmount || 0;
  if (grossValue === 0 || debt === 0) return 0;
  return (debt / grossValue) * 100;
}

/**
 * 팩터 1: 배분 이탈도 (25%) - 가중치 하향 조정
 * Σ|실제% - 목표%| / 2 → ×4 패널티
 */
function calcDriftPenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '배분 이탈도', icon: '🎯', rawPenalty: 0, weight: 0.25, weightedPenalty: 0, score: 100, comment: '자산을 추가해보세요' };
  }

  const drift = assets.reduce((sum, asset) => {
    const actualPct = (getNetAssetValue(asset) / total) * 100; // 순자산 사용
    const targetPct = asset.targetAllocation || 0;
    return sum + Math.abs(actualPct - targetPct);
  }, 0) / 2;

  const penalty = Math.min(100, drift * 4);
  const score = Math.round(100 - penalty);
  const comment = drift < 3
    ? '목표 배분에 잘 맞고 있어요'
    : `목표에서 ${drift.toFixed(1)}% 벗어났어요`;

  return { label: '배분 이탈도', icon: '🎯', rawPenalty: penalty, weight: 0.25, weightedPenalty: penalty * 0.25, score, comment };
}

/**
 * 팩터 2: 위험 집중도 (20%) - 달리오 Risk Parity
 * 금액이 아니라 위험 기여도로 집중도 측정
 * 위험 기여도 = 자산 가치 × 변동성
 */
function calcRiskWeightedConcentration(assets: Asset[], total: number): FactorResult {
  if (total === 0 || assets.length === 0) {
    return { label: '위험 집중도', icon: '⚖️', rawPenalty: 0, weight: 0.20, weightedPenalty: 0, score: 100, comment: '자산을 추가해보세요' };
  }

  // 1. 각 자산의 위험 기여도 계산
  const riskContributions: number[] = [];
  let totalRisk = 0;

  for (const asset of assets) {
    const value = getNetAssetValue(asset); // 순자산 (부동산은 대출 차감)
    const vol = VOLATILITY_MAP[classifyAsset(asset)] / 100;
    const risk = value * vol;
    riskContributions.push(risk);
    totalRisk += risk;
  }

  if (totalRisk === 0) {
    return { label: '위험 집중도', icon: '⚖️', rawPenalty: 0, weight: 0.20, weightedPenalty: 0, score: 100, comment: '위험 측정 불가' };
  }

  // 2. 위험 가중 HHI 계산
  const riskHHI = riskContributions.reduce((sum, risk) => {
    const riskWeight = risk / totalRisk;
    return sum + riskWeight * riskWeight;
  }, 0);

  // 3. 정규화
  const n = assets.length;
  const minHHI = 1 / n;
  const normalizedHHI = n === 1 ? 100 : ((riskHHI - minHHI) / (1 - minHHI)) * 100;
  const penalty = Math.min(100, Math.max(0, normalizedHHI));
  const score = Math.round(100 - penalty);

  // 4. 가장 큰 위험 기여 자산 찾기
  let maxRiskAsset = assets[0];
  let maxRisk = 0;
  for (let i = 0; i < assets.length; i++) {
    if (riskContributions[i] > maxRisk) {
      maxRisk = riskContributions[i];
      maxRiskAsset = assets[i];
    }
  }
  const maxRiskPct = (maxRisk / totalRisk) * 100;

  const comment = penalty < 20
    ? '위험이 잘 분산되어 있어요'
    : `${maxRiskAsset.ticker || maxRiskAsset.name}에 위험 ${maxRiskPct.toFixed(0)}% 집중!`;

  return { label: '위험 집중도', icon: '⚖️', rawPenalty: penalty, weight: 0.20, weightedPenalty: penalty * 0.20, score, comment };
}

/**
 * 팩터 3: 상관관계 리스크 (15%)
 * 카테고리별 비중 × 상관계수 매트릭스 가중 평균
 */
function calcCorrelationPenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '상관관계', icon: '🔗', rawPenalty: 0, weight: 0.15, weightedPenalty: 0, score: 100, comment: '자산을 추가해보세요' };
  }

  // 카테고리별 비중 계산 (순자산 기준)
  const categoryWeights: Record<AssetCategory, number> = {
    cash: 0, bond: 0, large_cap: 0, realestate: 0, bitcoin: 0, altcoin: 0,
  };
  for (const asset of assets) {
    const cat = classifyAsset(asset);
    categoryWeights[cat] += getNetAssetValue(asset) / total;
  }

  // 포트폴리오 가중 평균 상관계수
  let weightedCorr = 0;
  let totalWeight = 0;
  const categories = Object.keys(categoryWeights) as AssetCategory[];

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const wi = categoryWeights[categories[i]];
      const wj = categoryWeights[categories[j]];
      if (wi > 0 && wj > 0) {
        const corr = CORRELATION_MATRIX[categories[i]][categories[j]];
        const pairWeight = wi * wj;
        weightedCorr += corr * pairWeight;
        totalWeight += pairWeight;
      }
    }
  }

  const avgCorr = totalWeight > 0 ? weightedCorr / totalWeight : 0;
  // 상관계수 0.5+ → 위험, -0.2 → 이상적
  // 정규화: (-0.3 ~ 0.8) → (0 ~ 100)
  const penalty = Math.min(100, Math.max(0, ((avgCorr + 0.3) / 1.1) * 100));
  const score = Math.round(100 - penalty);

  const usedCategories = categories.filter(c => categoryWeights[c] > 0.01);
  const comment = usedCategories.length <= 1
    ? '한 종류의 자산만 보유 중이에요'
    : avgCorr > 0.4
    ? '비슷하게 움직이는 자산이 많아요'
    : avgCorr < 0.1
    ? '자산 간 분산이 잘 되어 있어요'
    : '상관관계가 적절해요';

  return { label: '상관관계', icon: '🔗', rawPenalty: penalty, weight: 0.15, weightedPenalty: penalty * 0.15, score, comment };
}

/**
 * 팩터 4: 변동성 리스크 (15%)
 * 가중평균 변동성 vs 벤치마크(18%)
 */
function calcVolatilityPenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '변동성', icon: '📈', rawPenalty: 0, weight: 0.15, weightedPenalty: 0, score: 100, comment: '자산을 추가해보세요' };
  }

  // 가중평균 변동성 계산 (순자산 기준)
  let weightedVol = 0;
  for (const asset of assets) {
    const cat = classifyAsset(asset);
    const weight = getNetAssetValue(asset) / total;
    weightedVol += VOLATILITY_MAP[cat] * weight;
  }

  // 벤치마크 18% 대비 초과 변동성 → 패널티
  const benchmark = 18;
  const excessVol = Math.max(0, weightedVol - benchmark);
  // 초과 1%당 1.5점 패널티, 최대 100
  const penalty = Math.min(100, excessVol * 1.5);
  const score = Math.round(100 - penalty);

  const comment = weightedVol < 15
    ? '변동성이 낮아 안정적이에요'
    : weightedVol <= 25
    ? `변동성 ${weightedVol.toFixed(0)}%로 적정 수준이에요`
    : `변동성 ${weightedVol.toFixed(0)}%로 다소 높아요`;

  return { label: '변동성', icon: '📈', rawPenalty: penalty, weight: 0.15, weightedPenalty: penalty * 0.15, score, comment };
}

/**
 * 팩터 5: 하방 리스크 (10%)
 * 손실 자산의 가중평균 손실률 × 3
 */
function calcDownsidePenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '하방 리스크', icon: '🛡️', rawPenalty: 0, weight: 0.10, weightedPenalty: 0, score: 100, comment: '자산을 추가해보세요' };
  }

  let lossCount = 0;
  let weightedLoss = 0;

  for (const asset of assets) {
    const currentValue = getAssetValue(asset);
    const costBasis = asset.costBasis || asset.currentValue;
    if (costBasis > 0 && currentValue < costBasis) {
      const lossPct = ((costBasis - currentValue) / costBasis) * 100;
      const weight = currentValue / total;
      weightedLoss += lossPct * weight;
      lossCount++;
    }
  }

  const penalty = Math.min(100, weightedLoss * 3);
  const score = Math.round(100 - penalty);

  const comment = lossCount === 0
    ? '모든 종목이 수익 중이에요'
    : `${lossCount}개 종목이 손실 중이에요`;

  return { label: '하방 리스크', icon: '🛡️', rawPenalty: penalty, weight: 0.10, weightedPenalty: penalty * 0.10, score, comment };
}

/**
 * 팩터 6: 세금 효율 (5%)
 * TLH(Tax-Loss Harvesting) 가능 종목 비율 (5%+ 손실)
 */
function calcTaxEfficiencyPenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '세금 효율', icon: '💰', rawPenalty: 0, weight: 0.05, weightedPenalty: 0, score: 100, comment: '자산을 추가해보세요' };
  }

  let tlhCount = 0;
  const liquidAssets = assets.filter(a => a.assetType === AssetType.LIQUID);

  for (const asset of liquidAssets) {
    const currentValue = getAssetValue(asset);
    const costBasis = asset.costBasis || asset.currentValue;
    if (costBasis > 0) {
      const lossPct = ((costBasis - currentValue) / costBasis) * 100;
      // 5% 이상 손실 → TLH 기회
      if (lossPct >= 5) {
        tlhCount++;
      }
    }
  }

  // TLH 기회가 많을수록 "활용 안 하고 있다" → 패널티
  // 전체 유동 자산 중 TLH 가능 비율 × 100
  const tlhRatio = liquidAssets.length > 0 ? (tlhCount / liquidAssets.length) : 0;
  const penalty = Math.min(100, tlhRatio * 100);
  const score = Math.round(100 - penalty);

  const comment = tlhCount === 0
    ? '절세 기회가 없어요 (좋은 신호!)'
    : `${tlhCount}개 종목에서 절세 기회가 있어요`;

  return { label: '세금 효율', icon: '💰', rawPenalty: penalty, weight: 0.05, weightedPenalty: penalty * 0.05, score, comment };
}

/**
 * 팩터 7: 레버리지 건전성 (10%) - 신규 추가
 * 레버리지 위험 = LTV × 변동성 × 자산 가치
 * 달리오: "레버리지는 리스크를 증폭시킨다"
 */
function calcLeveragePenalty(assets: Asset[], total: number): FactorResult {
  if (total === 0) {
    return { label: '레버리지 건전성', icon: '💳', rawPenalty: 0, weight: 0.10, weightedPenalty: 0, score: 100, comment: '자산을 추가해보세요' };
  }

  let totalLeverageRisk = 0;
  let debtCount = 0;

  for (const asset of assets) {
    const value = getAssetValue(asset);
    const debt = asset.debtAmount || 0;

    if (debt > 0 && value > 0) {
      const ltv = debt / value;
      const volatility = VOLATILITY_MAP[classifyAsset(asset)] / 100;

      // 레버리지 위험 = LTV × 변동성 × 자산 가치
      // 예: 부동산 10억, 대출 4억, 변동성 15%
      //    → 0.4 × 0.15 × 10억 = 6,000만
      const leverageRisk = ltv * volatility * value;
      totalLeverageRisk += leverageRisk;
      debtCount++;
    }
  }

  if (debtCount === 0) {
    return { label: '레버리지 건전성', icon: '💳', rawPenalty: 0, weight: 0.10, weightedPenalty: 0, score: 100, comment: '대출이 없어요 (안전!)' };
  }

  // 포트폴리오 전체 대비 레버리지 위험 비율
  const leverageRiskRatio = (totalLeverageRisk / total) * 100;

  // 패널티 계산
  // 0-5%: 안전 (패널티 0-50)
  // 5-10%: 주의 (패널티 50-100)
  // 10%+: 위험 (패널티 100)
  const penalty = Math.min(100, leverageRiskRatio * 10);
  const score = Math.round(100 - penalty);

  const comment = penalty < 20
    ? '대출이 안전하게 관리되고 있어요'
    : penalty < 50
    ? `레버리지 위험도 ${leverageRiskRatio.toFixed(1)}%`
    : `⚠️ 레버리지 위험 높음 (${leverageRiskRatio.toFixed(1)}%)`;

  return { label: '레버리지 건전성', icon: '💳', rawPenalty: penalty, weight: 0.10, weightedPenalty: penalty * 0.10, score, comment };
}

// ============================================================================
// 등급 판정
// ============================================================================

function getGrade(score: number): HealthGrade {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * 포트폴리오 건강 점수 계산 (7팩터 종합 - 달리오 Risk Parity)
 *
 * 부동산(ILLIQUID)은 리밸런싱 대상에서 제외됩니다.
 * 달리오: "비유동 자산은 리밸런싱 대상이 아니라 기준점"
 * 이승건: "행동 불가능한 정보로 불안 유발 금지"
 *
 * @param assets 전체 자산 배열 (부동산 포함)
 * @param totalAssets 총 평가금액 (참고용 — 내부에서 재계산)
 * @returns HealthScoreResult (종합 점수, 등급, 7팩터 상세, 부동산 요약)
 */
export function calculateHealthScore(assets: Asset[], totalAssets: number): HealthScoreResult {
  // ── 부동산(비유동) 자산 분리 ──
  const liquidAssets = assets.filter(a => a.assetType !== AssetType.ILLIQUID);
  const illiquidAssets = assets.filter(a => a.assetType === AssetType.ILLIQUID);

  // 유동 자산의 순자산 합계 (7팩터 계산 기준)
  const liquidNetTotal = liquidAssets.reduce((sum, a) => sum + getNetAssetValue(a), 0);

  // 전체 순자산 (부동산 비율 계산용)
  const totalNetAssets = assets.reduce((sum, a) => sum + getNetAssetValue(a), 0);

  // 7팩터 계산 — 유동 자산만 대상 (달리오 Risk Parity)
  const factors: FactorResult[] = [
    calcDriftPenalty(liquidAssets, liquidNetTotal),
    calcRiskWeightedConcentration(liquidAssets, liquidNetTotal),
    calcCorrelationPenalty(liquidAssets, liquidNetTotal),
    calcVolatilityPenalty(liquidAssets, liquidNetTotal),
    calcDownsidePenalty(liquidAssets, liquidNetTotal),
    calcTaxEfficiencyPenalty(liquidAssets, liquidNetTotal),
    calcLeveragePenalty(liquidAssets, liquidNetTotal),
  ];

  // 종합 점수: 100 - Σ(rawPenalty × weight)
  const totalPenalty = factors.reduce((sum, f) => sum + f.weightedPenalty, 0);
  const totalScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  // 등급 판정
  const grade = getGrade(totalScore);
  const gradeConfig = GRADE_CONFIG[grade];

  // 가장 취약한 팩터 → summary 생성
  const worstFactor = [...factors].sort((a, b) => b.rawPenalty - a.rawPenalty)[0];
  const summary = totalScore >= 85
    ? '포트폴리오가 매우 건강해요!'
    : totalScore >= 70
    ? `대체로 양호해요. ${worstFactor.label}만 개선하면 완벽!`
    : totalScore >= 55
    ? `${worstFactor.label} 개선이 필요해요: ${worstFactor.comment}`
    : `포트폴리오 점검이 필요해요: ${worstFactor.comment}`;

  // driftStatus 호환 (기존 배너용)
  const driftStatus = totalScore >= 75
    ? { label: '균형', color: '#4CAF50', bgColor: 'rgba(76,175,80,0.15)' }
    : totalScore >= 50
    ? { label: '주의', color: '#FFB74D', bgColor: 'rgba(255,183,77,0.15)' }
    : { label: '조정 필요', color: '#CF6679', bgColor: 'rgba(207,102,121,0.15)' };

  // ── 부동산 요약 정보 ──
  const realEstateGrossValue = illiquidAssets.reduce((sum, a) => sum + getAssetValue(a), 0);
  const realEstateDebt = illiquidAssets.reduce((sum, a) => sum + (a.debtAmount || 0), 0);
  const realEstateNetValue = realEstateGrossValue - realEstateDebt;
  const realEstateRatio = totalNetAssets > 0 ? (realEstateNetValue / totalNetAssets) * 100 : 0;

  const realEstateSummary: RealEstateSummary | undefined = illiquidAssets.length > 0
    ? {
        totalValue: realEstateGrossValue,
        totalDebt: realEstateDebt,
        netValue: realEstateNetValue,
        ratioOfTotal: realEstateRatio,
        message: realEstateRatio >= 50
          ? '부동산이 포트폴리오의 안정적 기반이 되고 있어요'
          : '부동산이 장기 자산으로 기반을 잡아주고 있어요',
      }
    : undefined;

  return {
    totalScore,
    grade,
    gradeColor: gradeConfig.color,
    gradeBgColor: gradeConfig.bgColor,
    gradeLabel: gradeConfig.label,
    factors,
    summary,
    driftStatus,
    realEstateSummary,
  };
}
