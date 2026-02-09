/**
 * Community Types - VIP 라운지 커뮤니티 타입 정의
 *
 * 접근 등급 (3단계):
 *   열람: 100만원+ (자산인증 필수)
 *   댓글: 1,000만원+
 *   글쓰기: 1.5억+
 */

// ================================================================
// 접근제어 상수
// ================================================================

/** 커뮤니티 열람 최소 자산 (100만원) */
export const LOUNGE_VIEW_THRESHOLD = 1000000;

/** 댓글 작성 최소 자산 (1,000만원) */
export const LOUNGE_COMMENT_THRESHOLD = 10000000;

/** 글 작성 최소 자산 (1.5억) */
export const LOUNGE_POST_THRESHOLD = 150000000;

// ================================================================
// 카테고리
// ================================================================

// 커뮤니티 카테고리 타입 (all은 필터 전용, DB에는 저장 안 됨)
export type CommunityCategory = 'stocks' | 'crypto' | 'realestate';
export type CommunityCategoryFilter = CommunityCategory | 'all';

// 카테고리 정보 상수
export const CATEGORY_INFO: Record<CommunityCategoryFilter, {
  label: string;
  icon: string;
  color: string;
}> = {
  all: { label: '전체', icon: 'apps', color: '#4CAF50' },
  stocks: { label: '주식방', icon: 'trending-up', color: '#4CAF50' },
  crypto: { label: '코인방', icon: 'logo-bitcoin', color: '#F7931A' },
  realestate: { label: '부동산방', icon: 'home', color: '#2196F3' },
};

// ================================================================
// 보유종목 스냅샷
// ================================================================

/** 작성 시점의 보유종목 (top N개) */
export interface HoldingSnapshot {
  ticker: string;        // "AAPL"
  name: string;          // "애플"
  type: 'stock' | 'crypto' | 'realestate' | 'other';
  value: number;         // 보유 가치 (KRW)
}

// ================================================================
// 게시물 / 댓글
// ================================================================

// 커뮤니티 게시물 타입
export interface CommunityPost {
  id: string;
  user_id: string;
  display_tag: string;       // "[자산: 1.2억]"
  asset_mix: string;         // "주식 70%, 코인 30%"
  content: string;
  category: CommunityCategory;
  likes_count: number;
  comments_count: number;
  total_assets_at_post: number;
  top_holdings: HoldingSnapshot[];  // 작성자 상위 보유종목
  created_at: string;
}

// 커뮤니티 댓글 타입
export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  display_tag: string;
  total_assets_at_comment: number;
  parent_id: string | null;      // 대댓글: 부모 댓글 ID (NULL = 최상위 댓글)
  likes_count: number;           // 댓글 좋아요 수
  created_at: string;
  updated_at: string | null;     // 수정 시각
}

// 게시물 작성용 입력 타입
export interface CreatePostInput {
  content: string;
  category: CommunityCategory;
}

// 자산 믹스 아이템
export interface AssetMixItem {
  category: string;
  percentage: number;
}

// ================================================================
// 라운지 자격 (3단계 접근)
// ================================================================

export interface LoungeEligibility {
  isEligible: boolean;          // 열람 가능 여부 (100만원+)
  canComment: boolean;          // 댓글 가능 여부 (1,000만원+)
  canPost: boolean;             // 글쓰기 가능 여부 (1.5억+)
  totalAssets: number;          // 총 자산
  requiredAssets: number;       // 열람 최소 자산 (100만원)
  shortfall: number;            // 열람까지 부족 금액

  // 검증 상태
  hasVerifiedAssets: boolean;
  verifiedAssetsTotal: number;
  isVerificationRequired: boolean;
}

// 사용자 프로필 표시 정보
export interface UserDisplayInfo {
  displayTag: string;
  assetMix: string;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  tierLabel: string;
}

// ================================================================
// 티어 시스템
// ================================================================

export const TIER_THRESHOLDS = {
  SILVER: 0,              // 1억 미만 (기본 티어)
  GOLD: 100000000,        // 1억 이상
  PLATINUM: 500000000,    // 5억 이상
  DIAMOND: 1000000000,    // 10억 이상
};

export const TIER_LEVELS: { [key: string]: number } = {
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
  DIAMOND: 4,
};

export const TIER_LABELS: { [key: string]: string } = {
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  DIAMOND: '다이아몬드',
};

export const TIER_DESCRIPTIONS: { [key: string]: string } = {
  SILVER: '1억 미만',
  GOLD: '1억 ~ 5억',
  PLATINUM: '5억 ~ 10억',
  DIAMOND: '10억 이상',
};

export const TIER_COLORS: { [key: string]: string } = {
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
};

export const TIER_ICONS: { [key: string]: string } = {
  SILVER: 'medal',
  GOLD: 'trophy',
  PLATINUM: 'star',
  DIAMOND: 'diamond',
};
