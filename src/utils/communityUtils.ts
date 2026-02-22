/**
 * communityUtils - 커뮤니티 공유 유틸 함수
 *
 * 4개 파일에서 중복 정의되던 함수들을 한 곳으로 통합.
 * 티어 판정은 community.ts의 TIER_THRESHOLDS를 사용 (Single Source of Truth).
 *
 * 사용처:
 * - CommunityPostCard.tsx
 * - community/[id].tsx (상세 화면)
 * - community/author/[userId].tsx (작성자 프로필)
 * - lounge.tsx (라운지 메인)
 */

import { Ionicons } from '@expo/vector-icons';
import { HoldingSnapshot, TIER_THRESHOLDS } from '../types/community';

/**
 * 자산 금액 → 티어 판정
 * community.ts의 TIER_THRESHOLDS 참조 (GOLD: 1억)
 */
export const getTierFromAssets = (assets: number): string => {
  if (assets >= TIER_THRESHOLDS.DIAMOND) return 'DIAMOND';
  if (assets >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (assets >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  return 'SILVER';
};

/** 티어 → 아이콘 이름 */
export const getTierIcon = (tier: string): keyof typeof Ionicons.glyphMap => {
  switch (tier) {
    case 'DIAMOND': return 'diamond';
    case 'PLATINUM': return 'star';
    case 'GOLD': return 'trophy';
    case 'SILVER': return 'medal';
    default: return 'ribbon';
  }
};

/** 티어별 색상 */
export const TIER_COLORS: Record<string, string> = {
  DIAMOND: '#B9F2FF',
  PLATINUM: '#E5E4E2',
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
};

/** 티어별 라벨 */
export const TIER_LABELS: Record<string, string> = {
  DIAMOND: '다이아몬드',
  PLATINUM: '플래티넘',
  GOLD: '골드',
  SILVER: '실버',
};

/** 보유종목 타입별 색상 맵 */
export const HOLDING_TYPE_COLORS: Record<string, string> = {
  stock: '#4CAF50',
  crypto: '#F7931A',
  realestate: '#2196F3',
  other: '#888888',
};

/** 초보 질문 태그 프리픽스 */
export const BEGINNER_QUESTION_PREFIX = '[초보질문]';

/** 초보 질문 여부 판단 */
export const isBeginnerQuestion = (content: string | null | undefined): boolean => {
  if (!content) return false;
  return content.trim().startsWith(BEGINNER_QUESTION_PREFIX);
};

/** 초보 질문 태그 제거 (화면 표시용) */
export const stripBeginnerQuestionPrefix = (content: string): string => {
  if (!isBeginnerQuestion(content)) return content;
  return content.trim().replace(BEGINNER_QUESTION_PREFIX, '').trim();
};

/** 상대적 시간 표시 ("3분 전", "2시간 전", "3일 전") */
export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
};

/** 금액 포맷 (3단계: 억/만원/원) */
export const formatAssetAmount = (amount: number): string => {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만원`;
  return `${amount.toLocaleString()}원`;
};

const EOK = 100000000;

/**
 * 커뮤니티용 자산 구간 라벨 (프라이버시 보호)
 * 예) 7.9억 -> "3억 이상"
 */
export const formatCommunityAssetBand = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (safeAmount >= 20 * EOK) return '20억 이상';
  if (safeAmount >= 10 * EOK) return '10억 이상';
  if (safeAmount >= 3 * EOK) return '3억 이상';
  if (safeAmount >= 1 * EOK) return '1억 이상';
  return '1억 미만';
};

export const formatCommunityDisplayTag = (totalAssets: number): string => {
  return `[자산: ${formatCommunityAssetBand(totalAssets)}]`;
};

function isRealEstateHolding(holding: Pick<HoldingSnapshot, 'type' | 'ticker'>): boolean {
  return holding.type === 'realestate' || holding.ticker?.startsWith('RE_');
}

const safePositive = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

function getPortfolioRatioDenominator(totalAssets: number, holdings: HoldingSnapshot[]): number {
  const safeTotalAssets = safePositive(totalAssets);
  const holdingsTotal = holdings.reduce((sum, holding) => sum + safePositive(holding.value), 0);
  return Math.max(safeTotalAssets, holdingsTotal, 1);
}

export const getCommunityHoldingLabel = (
  holding: Pick<HoldingSnapshot, 'type' | 'ticker' | 'name'>
): string => {
  if (isRealEstateHolding(holding)) return '부동산';
  return holding.ticker || holding.name || '기타';
};

export const getCommunityHoldingRatio = (
  holdingValue: number,
  totalAssets: number,
  holdings: HoldingSnapshot[]
): number => {
  const denominator = getPortfolioRatioDenominator(totalAssets, holdings);
  const ratio = (safePositive(holdingValue) / denominator) * 100;
  return Math.max(0, Math.min(100, ratio));
};

export const formatPortfolioRatio = (ratio: number): string => {
  const safeRatio = Number.isFinite(ratio) ? Math.max(0, ratio) : 0;
  const rounded = safeRatio >= 10
    ? Math.round(safeRatio)
    : Math.round(safeRatio * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
};

export const buildCommunityAssetMixFromHoldings = (
  holdings: HoldingSnapshot[],
  totalAssets: number
): string => {
  if (!Array.isArray(holdings) || holdings.length === 0) return '';

  let realEstateValue = 0;
  let financialValue = 0;

  for (const holding of holdings) {
    const value = safePositive(holding.value);
    if (value <= 0) continue;
    if (isRealEstateHolding(holding)) {
      realEstateValue += value;
    } else {
      financialValue += value;
    }
  }

  const denominator = getPortfolioRatioDenominator(totalAssets, holdings);
  const parts: string[] = [];

  if (realEstateValue > 0) {
    parts.push(`부동산 ${formatPortfolioRatio((realEstateValue / denominator) * 100)}`);
  }
  if (financialValue > 0) {
    parts.push(`금융자산 ${formatPortfolioRatio((financialValue / denominator) * 100)}`);
  }

  return parts.join(', ');
};
