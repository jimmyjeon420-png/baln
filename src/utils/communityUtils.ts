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
import { TIER_THRESHOLDS } from '../types/community';

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
