/**
 * Community Types - VIP 라운지 커뮤니티 타입 정의
 */

// 커뮤니티 게시물 타입
export interface CommunityPost {
  id: string;
  user_id: string;
  display_tag: string;       // "[자산: 1.2억 / 수익: 0.3억]"
  asset_mix: string;         // "Tech 70%, Crypto 30%"
  content: string;
  likes_count: number;
  total_assets_at_post: number;
  created_at: string;
}

// 게시물 작성용 입력 타입
export interface CreatePostInput {
  content: string;
}

// 자산 믹스 아이템
export interface AssetMixItem {
  category: string;
  percentage: number;
}

// 라운지 자격 상태
export interface LoungeEligibility {
  isEligible: boolean;          // 최종 입장 가능 여부
  totalAssets: number;          // 총 자산
  requiredAssets: number;       // 필요 자산 (1억)
  shortfall: number;            // 부족 금액

  // 검증 상태 (CRITICAL: 라운지 입장 필수 조건)
  hasVerifiedAssets: boolean;   // OCR 검증된 자산 보유 여부
  verifiedAssetsTotal: number;  // 검증된 자산 총액
  isVerificationRequired: boolean; // 검증 필요 여부 (자산 1억 이상이지만 미검증)
}

// 사용자 프로필 표시 정보
// CRITICAL: 4단계 티어 시스템 (BRONZE 제거됨)
export interface UserDisplayInfo {
  displayTag: string;
  assetMix: string;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  tierLabel: string;
}

// 전략적 4단계 티어 정의 (자산 기준 - KRW)
// TIER_1 (Silver): < 1억
// TIER_2 (Gold): 1억 ~ 5억
// TIER_3 (Platinum): 5억 ~ 10억
// TIER_4 (Diamond): 10억+
export const TIER_THRESHOLDS = {
  SILVER: 0,              // 1억 미만 (기본 티어)
  GOLD: 100000000,        // 1억 이상
  PLATINUM: 500000000,    // 5억 이상
  DIAMOND: 1000000000,    // 10억 이상
};

// 티어 숫자 레벨 (접근 제어용)
export const TIER_LEVELS: { [key: string]: number } = {
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
  DIAMOND: 4,
};

// 티어 라벨
export const TIER_LABELS: { [key: string]: string } = {
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  DIAMOND: '다이아몬드',
};

// 티어별 설명
export const TIER_DESCRIPTIONS: { [key: string]: string } = {
  SILVER: '1억 미만',
  GOLD: '1억 ~ 5억',
  PLATINUM: '5억 ~ 10억',
  DIAMOND: '10억 이상',
};

// 티어 색상
export const TIER_COLORS: { [key: string]: string } = {
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
};

// 티어 아이콘
export const TIER_ICONS: { [key: string]: string } = {
  SILVER: 'medal',
  GOLD: 'trophy',
  PLATINUM: 'star',
  DIAMOND: 'diamond',
};
