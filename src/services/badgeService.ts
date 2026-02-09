/**
 * badgeService.ts - 투자 예측 배지 시스템
 *
 * 역할: "배지 관리 부서"
 * - 배지 종류: 초보자/중수/고수/전문가/달인
 * - 조건: 적중률 + 투표 횟수
 * - 배지 획득 시 축하 이벤트
 * - AsyncStorage 저장
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BADGE_STORAGE_KEY = '@baln:prediction_badges';

// ============================================================================
// 배지 타입 정의
// ============================================================================

export type BadgeLevel = 'novice' | 'intermediate' | 'advanced' | 'expert' | 'master';

export interface Badge {
  id: BadgeLevel;
  name: string;
  emoji: string;
  description: string;
  requirement: {
    minVotes: number;
    minAccuracy: number; // 퍼센트 (0-100)
  };
}

export interface UserBadge {
  badgeId: BadgeLevel;
  earnedAt: string; // ISO 8601
  isNew: boolean; // 아직 확인하지 않은 새 배지
}

// ============================================================================
// 배지 정의
// ============================================================================

export const BADGES: Record<BadgeLevel, Badge> = {
  novice: {
    id: 'novice',
    name: '초보자',
    emoji: '🌱',
    description: '예측 게임에 입문했습니다',
    requirement: {
      minVotes: 5,
      minAccuracy: 0,
    },
  },
  intermediate: {
    id: 'intermediate',
    name: '중수',
    emoji: '⚡',
    description: '10회 투표 + 적중률 50% 달성',
    requirement: {
      minVotes: 10,
      minAccuracy: 50,
    },
  },
  advanced: {
    id: 'advanced',
    name: '고수',
    emoji: '🎯',
    description: '30회 투표 + 적중률 60% 달성',
    requirement: {
      minVotes: 30,
      minAccuracy: 60,
    },
  },
  expert: {
    id: 'expert',
    name: '전문가',
    emoji: '🏆',
    description: '50회 투표 + 적중률 70% 달성',
    requirement: {
      minVotes: 50,
      minAccuracy: 70,
    },
  },
  master: {
    id: 'master',
    name: '달인',
    emoji: '👑',
    description: '100회 투표 + 적중률 75% 달성',
    requirement: {
      minVotes: 100,
      minAccuracy: 75,
    },
  },
};

// ============================================================================
// 배지 조건 체크
// ============================================================================

/**
 * 유저의 통계를 기반으로 획득 가능한 배지 확인
 */
export function checkEarnedBadges(totalVotes: number, accuracyRate: number): BadgeLevel[] {
  const earnedBadges: BadgeLevel[] = [];

  for (const [key, badge] of Object.entries(BADGES)) {
    const { minVotes, minAccuracy } = badge.requirement;
    if (totalVotes >= minVotes && accuracyRate >= minAccuracy) {
      earnedBadges.push(key as BadgeLevel);
    }
  }

  return earnedBadges;
}

/**
 * 가장 높은 배지 레벨 가져오기
 */
export function getHighestBadge(totalVotes: number, accuracyRate: number): Badge | null {
  const earnedBadges = checkEarnedBadges(totalVotes, accuracyRate);
  if (earnedBadges.length === 0) return null;

  // 배지 순서: novice < intermediate < advanced < expert < master
  const badgeOrder: BadgeLevel[] = ['novice', 'intermediate', 'advanced', 'expert', 'master'];
  const highestBadgeId = earnedBadges.sort((a, b) => badgeOrder.indexOf(b) - badgeOrder.indexOf(a))[0];

  return BADGES[highestBadgeId];
}

// ============================================================================
// AsyncStorage 저장/로드
// ============================================================================

/**
 * 유저의 배지 목록 로드
 */
export async function loadUserBadges(): Promise<UserBadge[]> {
  try {
    const json = await AsyncStorage.getItem(BADGE_STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json) as UserBadge[];
  } catch (error) {
    console.error('[badgeService] loadUserBadges 실패:', error);
    return [];
  }
}

/**
 * 유저의 배지 목록 저장
 */
export async function saveUserBadges(badges: UserBadge[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BADGE_STORAGE_KEY, JSON.stringify(badges));
  } catch (error) {
    console.error('[badgeService] saveUserBadges 실패:', error);
  }
}

/**
 * 새로운 배지 획득 체크 & 저장
 * @returns 새로 획득한 배지 목록
 */
export async function checkAndAwardNewBadges(
  totalVotes: number,
  accuracyRate: number,
): Promise<UserBadge[]> {
  const existingBadges = await loadUserBadges();
  const existingBadgeIds = existingBadges.map(b => b.badgeId);

  const earnedBadgeIds = checkEarnedBadges(totalVotes, accuracyRate);
  const newBadgeIds = earnedBadgeIds.filter(id => !existingBadgeIds.includes(id));

  if (newBadgeIds.length === 0) {
    return [];
  }

  // 새 배지 추가
  const newBadges: UserBadge[] = newBadgeIds.map(badgeId => ({
    badgeId,
    earnedAt: new Date().toISOString(),
    isNew: true,
  }));

  const updatedBadges = [...existingBadges, ...newBadges];
  await saveUserBadges(updatedBadges);

  return newBadges;
}

/**
 * 새 배지를 "확인함"으로 마킹
 */
export async function markBadgesAsViewed(badgeIds: BadgeLevel[]): Promise<void> {
  const badges = await loadUserBadges();
  const updatedBadges = badges.map(badge => {
    if (badgeIds.includes(badge.badgeId)) {
      return { ...badge, isNew: false };
    }
    return badge;
  });
  await saveUserBadges(updatedBadges);
}

/**
 * 특정 배지 획득 여부 확인
 */
export async function hasBadge(badgeId: BadgeLevel): Promise<boolean> {
  const badges = await loadUserBadges();
  return badges.some(b => b.badgeId === badgeId);
}

/**
 * 다음 목표 배지 정보 가져오기
 */
export function getNextBadge(currentHighest: BadgeLevel | null): Badge | null {
  const badgeOrder: BadgeLevel[] = ['novice', 'intermediate', 'advanced', 'expert', 'master'];

  if (!currentHighest) {
    return BADGES.novice;
  }

  const currentIndex = badgeOrder.indexOf(currentHighest);
  if (currentIndex === badgeOrder.length - 1) {
    return null; // 이미 최고 배지
  }

  return BADGES[badgeOrder[currentIndex + 1]];
}
