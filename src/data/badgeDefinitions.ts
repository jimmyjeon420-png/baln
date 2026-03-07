/**
 * badgeDefinitions.ts - 뱃지 정의
 *
 * 역할: "업적 시스템 데이터베이스"
 * 사용자가 획득할 수 있는 모든 뱃지의 조건, 디자인, 희귀도를 정의합니다.
 *
 * 철학 (3인 합의):
 * - 이승건: "뱃지는 돈으로 살 수 없다. 노력의 증거다."
 * - 달리오: "검증은 일관성이다. 365일 출석 > ₩100만원"
 * - 버핏: "뱃지는 신뢰의 시그널이다. 프로필에 표시되어야 한다."
 */

export interface Badge {
  id: string;
  name: string;            // 뱃지 이름 (한국어)
  nameEn: string;          // 뱃지 이름 (영어)
  nameJa?: string;         // 뱃지 이름 (일본어)
  icon: string;
  description: string;     // 뱃지 설명 (한국어)
  descriptionEn?: string;  // 뱃지 설명 (영어)
  descriptionJa?: string;  // 뱃지 설명 (일본어)
  category: 'activity' | 'skill' | 'contribution' | 'special';
  condition: {
    type: 'streak' | 'prediction' | 'community' | 'manual';
    threshold?: number; // 예: 365 (일), 60 (적중률 %)
    metadata?: Record<string, unknown>;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string; // 뱃지 배경색
  enabled: boolean; // 출시 후 단계적 오픈
}

/** 언어별 뱃지 이름 가져오기 */
export function getBadgeName(badge: Badge, lang: string): string {
  if (lang === 'ja') return badge.nameJa || badge.nameEn;
  if (lang === 'en') return badge.nameEn;
  return badge.name;
}

/** 언어별 뱃지 설명 가져오기 */
export function getBadgeDescription(badge: Badge, lang: string): string {
  if (lang === 'ja') return badge.descriptionJa || badge.descriptionEn || badge.description;
  if (lang === 'en') return badge.descriptionEn || badge.description;
  return badge.description;
}

// ============================================================================
// 활동 뱃지 (출석 기반)
// ============================================================================

const ACTIVITY_BADGES: Badge[] = [
  {
    id: 'legend_365',
    name: '레전드',
    nameEn: 'Legend',
    nameJa: 'レジェンド',
    icon: '🏆',
    description: '365일 연속 출석 — 진정한 투자자의 증명',
    descriptionEn: '365-day streak — Proof of a true investor',
    descriptionJa: '365日連続ログイン — 真の投資家の証',
    category: 'activity',
    condition: { type: 'streak', threshold: 365 },
    rarity: 'legendary',
    color: '#FFD700',
    enabled: true,
  },
  {
    id: 'consistent_90',
    name: '철인',
    nameEn: 'Iron Will',
    nameJa: '鉄人',
    icon: '💪',
    description: '90일 연속 출석 — 습관이 체화된 사람',
    descriptionEn: '90-day streak — Someone who has made it a habit',
    descriptionJa: '90日連続ログイン — 習慣が身についた人',
    category: 'activity',
    condition: { type: 'streak', threshold: 90 },
    rarity: 'epic',
    color: '#C0C0C0',
    enabled: true,
  },
  {
    id: 'month_master_30',
    name: '한 달 마스터',
    nameEn: 'Month Master',
    nameJa: 'マンスリーマスター',
    icon: '💪',
    description: '30일 연속 출석 — 투자 습관이 자리잡은 사람',
    descriptionEn: '30-day streak — Someone who has built an investment habit',
    descriptionJa: '30日連続ログイン — 投資習慣が定着した人',
    category: 'activity',
    condition: { type: 'streak', threshold: 30 },
    rarity: 'rare',
    color: '#4A90E2',
    enabled: true,
  },
  {
    id: 'week_warrior',
    name: '일주일 전사',
    nameEn: 'Week Warrior',
    nameJa: 'ウィークウォリアー',
    icon: '🔥',
    description: '7일 연속 출석 — 습관의 시작',
    descriptionEn: '7-day streak — The beginning of a habit',
    descriptionJa: '7日連続ログイン — 習慣の始まり',
    category: 'activity',
    condition: { type: 'streak', threshold: 7 },
    rarity: 'common',
    color: '#FF6B6B',
    enabled: true,
  },
];

// ============================================================================
// 실력 뱃지 (예측 적중 기반)
// ============================================================================

const SKILL_BADGES: Badge[] = [
  {
    id: 'analyst_top10',
    name: '분석가',
    nameEn: 'Analyst',
    nameJa: 'アナリスト',
    icon: '📊',
    description: '예측 적중률 60% 이상 (최소 10회 참여)',
    descriptionEn: 'Prediction accuracy 60%+ (minimum 10 predictions)',
    descriptionJa: '予測的中率60%以上（最低10回参加）',
    category: 'skill',
    condition: {
      type: 'prediction',
      threshold: 60,
      metadata: { minPredictions: 10 }
    },
    rarity: 'rare',
    color: '#4A90E2',
    enabled: true,
  },
  {
    id: 'sniper_5streak',
    name: '스나이퍼',
    nameEn: 'Sniper',
    nameJa: 'スナイパー',
    icon: '🎯',
    description: '5연속 예측 적중 — 날카로운 시장 감각',
    descriptionEn: '5 consecutive correct predictions — Sharp market instinct',
    descriptionJa: '5連続予測的中 — 鋭い市場感覚',
    category: 'skill',
    condition: {
      type: 'prediction',
      threshold: 5,
      metadata: { consecutive: true }
    },
    rarity: 'rare',
    color: '#E74C3C',
    enabled: true,
  },
];

// ============================================================================
// 기여 뱃지 (커뮤니티 활동 기반)
// ============================================================================

const CONTRIBUTION_BADGES: Badge[] = [
  {
    id: 'mentor_community',
    name: '멘토',
    nameEn: 'Mentor',
    nameJa: 'メンター',
    icon: '📚',
    description: '커뮤니티 글 10개 이상 + 평균 좋아요 5개 이상',
    descriptionEn: '10+ community posts with an average of 5+ likes each',
    descriptionJa: 'コミュニティ投稿10件以上 + 平均いいね5件以上',
    category: 'contribution',
    condition: {
      type: 'community',
      threshold: 10,
      metadata: { avgLikes: 5 }
    },
    rarity: 'epic',
    color: '#9B59B6',
    enabled: false, // 출시 후 커뮤니티 활성화 시 오픈
  },
];

// ============================================================================
// 특수 뱃지 (수동 지급)
// ============================================================================

const SPECIAL_BADGES: Badge[] = [
  {
    id: 'verified_investor',
    name: '인증 투자자',
    nameEn: 'Verified',
    nameJa: '認証投資家',
    icon: '🔐',
    description: '계좌 연동 완료 — 실제 투자자 인증',
    descriptionEn: 'Brokerage account linked — Verified real investor',
    descriptionJa: '証券口座連携完了 — 実際の投資家認証',
    category: 'special',
    condition: { type: 'manual' },
    rarity: 'common',
    color: '#27AE60',
    enabled: false, // 계좌 연동 기능 출시 후 오픈
  },
  {
    id: 'founder_2026',
    name: '창립 멤버',
    nameEn: 'Founder',
    nameJa: '創立メンバー',
    icon: '⭐',
    description: '2026년 초기 사용자 (선착순 100명 한정)',
    descriptionEn: '2026 early adopter (limited to first 100 users)',
    descriptionJa: '2026年初期ユーザー（先着100名限定）',
    category: 'special',
    condition: { type: 'manual' },
    rarity: 'legendary',
    color: '#F39C12',
    enabled: false, // 출시 3개월 후 마켓플레이스 오픈
  },
];

// ============================================================================
// 전체 뱃지 목록
// ============================================================================

export const BADGE_DEFINITIONS: Badge[] = [
  ...ACTIVITY_BADGES,
  ...SKILL_BADGES,
  ...CONTRIBUTION_BADGES,
  ...SPECIAL_BADGES,
];

/**
 * 카테고리별 뱃지 조회
 */
export function getBadgesByCategory(category: Badge['category']): Badge[] {
  return BADGE_DEFINITIONS.filter((b) => b.category === category && b.enabled);
}

/**
 * 희귀도별 뱃지 조회
 */
export function getBadgesByRarity(rarity: Badge['rarity']): Badge[] {
  return BADGE_DEFINITIONS.filter((b) => b.rarity === rarity && b.enabled);
}

/**
 * 뱃지 ID로 조회
 */
export function getBadgeById(id: string): Badge | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}

/**
 * 활성화된 뱃지만 조회
 */
export function getEnabledBadges(): Badge[] {
  return BADGE_DEFINITIONS.filter((b) => b.enabled);
}
