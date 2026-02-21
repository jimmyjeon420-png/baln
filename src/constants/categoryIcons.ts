/**
 * 카테고리별 아이콘 + 색상 공통 상수
 *
 * 3개 파일(TodayActionsSection, AllocationDriftSection, WhatIfSimulator)에서
 * 동일한 CAT_ICON 매핑을 사용하므로 1곳에서 관리.
 *
 * bitcoin ₿ 이모지는 골든 옐로우(#F5A623) 색상을 적용.
 */

import type { AssetCategory } from '../services/rebalanceScore';

export interface CategoryIconConfig {
  icon: string;
  color?: string;
}

export const CAT_ICONS: Record<AssetCategory, CategoryIconConfig> = {
  large_cap: { icon: '📈' },
  bond: { icon: '🏛️' },
  bitcoin: { icon: '₿', color: '#F5A623' },
  gold: { icon: '🥇' },
  commodity: { icon: '🛢️' },
  altcoin: { icon: '🪙' },
  cash: { icon: '💵' },
  realestate: { icon: '🏠' },
};
