/**
 * marketplaceItems.ts - 마켓플레이스 상품 정의
 *
 * 역할: "상품 카탈로그"
 * 크레딧으로 구매 가능한 모든 상품을 정의합니다.
 * 출시 후 사용자 반응에 따라 가격/상품을 조정할 수 있습니다.
 */

export interface MarketplaceItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  price: number; // 크레딧 (출시 후 조정 가능)
  priceKRW: number; // 원화 환산 (1C = ₩100)
  icon: string;
  tier: 'instant' | 'experience' | 'loyalty';
  category: 'analysis' | 'premium' | 'community' | 'badge';
  requiresPremium?: boolean;
  stock?: number; // 한정 상품 (null이면 무제한)
  enabled: boolean; // 출시 전 비활성화 가능
}

// ============================================================================
// Tier 1: 즉시 효용 (무료 사용자 타겟)
// ============================================================================

const TIER_INSTANT: MarketplaceItem[] = [
  {
    id: 'ai_analysis_extra',
    name: 'AI 분석 추가 1회',
    nameEn: 'Extra AI Analysis',
    description: '오늘 AI 분석을 한 번 더 받을 수 있어요 (무료 1회/일 제한 해제)',
    price: 1,
    priceKRW: 100,
    icon: '🤖',
    tier: 'instant',
    category: 'analysis',
    enabled: true,
  },
  {
    id: 'prediction_insight',
    name: '예측 해설 보기',
    nameEn: 'Prediction Insight',
    description: '이번 예측의 AI 해설과 역대 통계를 확인하세요',
    price: 1,
    priceKRW: 100,
    icon: '📊',
    tier: 'instant',
    category: 'analysis',
    enabled: true,
  },
];

// ============================================================================
// Tier 2: 경험 확장 (Premium 전환 유도)
// ============================================================================

const TIER_EXPERIENCE: MarketplaceItem[] = [
  {
    id: 'premium_trial_3d',
    name: 'Premium 3일 체험권',
    nameEn: 'Premium 3-Day Trial',
    description: 'Premium 기능을 3일간 무료로 체험하세요 (AI 분석 무제한, 맥락 카드 전체)',
    price: 5,
    priceKRW: 500,
    icon: '⭐',
    tier: 'experience',
    category: 'premium',
    enabled: true,
  },
  {
    id: 'vip_lounge_1w',
    name: 'VIP 라운지 1주일',
    nameEn: 'VIP Lounge 1 Week',
    description: '커뮤니티 VIP 라운지 1주일 이용권 (고수들의 인사이트)',
    price: 3,
    priceKRW: 300,
    icon: '👑',
    tier: 'experience',
    category: 'community',
    enabled: true,
  },
];

// ============================================================================
// Tier 3: 충성 보상 (장기 유저 타겟)
// ============================================================================

const TIER_LOYALTY: MarketplaceItem[] = [
  {
    id: 'premium_discount_50',
    name: 'Premium 1개월 50% 할인',
    nameEn: 'Premium 50% Off',
    description: '₩2,450 + 25크레딧으로 Premium 1개월 구독 (정상가 ₩4,900)',
    price: 25,
    priceKRW: 2450,
    icon: '💎',
    tier: 'loyalty',
    category: 'premium',
    enabled: false, // 출시 초기 비활성화 (구독 전환 우선)
  },
  {
    id: 'badge_founder',
    name: '창립 멤버 뱃지 (한정)',
    nameEn: 'Founder Badge',
    description: '2026년 초기 사용자만 구매 가능한 영구 뱃지 (프로필 표시)',
    price: 50,
    priceKRW: 5000,
    icon: '🏆',
    tier: 'loyalty',
    category: 'badge',
    stock: 100, // 선착순 100명
    enabled: false, // 출시 3개월 후 오픈 예정
  },
];

// ============================================================================
// 전체 상품 목록
// ============================================================================

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  ...TIER_INSTANT,
  ...TIER_EXPERIENCE,
  ...TIER_LOYALTY,
];

/**
 * Tier별 상품 조회
 */
export function getItemsByTier(tier: MarketplaceItem['tier']): MarketplaceItem[] {
  return MARKETPLACE_ITEMS.filter((item) => item.tier === tier && item.enabled);
}

/**
 * 상품 ID로 조회
 */
export function getItemById(id: string): MarketplaceItem | undefined {
  return MARKETPLACE_ITEMS.find((item) => item.id === id);
}

/**
 * 재고 확인 (한정 상품)
 */
export function hasStock(item: MarketplaceItem): boolean {
  if (!item.stock) return true; // 무제한
  // TODO: DB에서 실제 판매량 조회하여 재고 계산
  return item.stock > 0;
}
