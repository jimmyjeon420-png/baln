/**
 * achievementService.ts - 성취 배지 시스템 서비스
 *
 * 역할: "성취 관리 부서"
 * - 10개 핵심 배지 정의 및 해금 조건 관리
 * - AsyncStorage 기반 로컬 저장 (서버 동기화 없이 빠른 응답)
 * - 자동 해금 체크 로직
 *
 * [배지 목록]
 * 1. first_visit - 첫 출석
 * 2. streak_7 - 7일 연속
 * 3. streak_30 - 30일 연속
 * 4. first_correct - 첫 적중
 * 5. streak_correct_5 - 5연속 적중
 * 6. accuracy_80 - 적중률 80%
 * 7. first_diagnosis - 첫 AI 진단
 * 8. assets_100m - 1억 달성
 * 9. first_share - 첫 공유
 * 10. first_post - 첫 게시글
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// 스토리지 키
// ============================================================================

const ACHIEVEMENTS_KEY = '@baln:achievements';

// ============================================================================
// 타입 정의
// ============================================================================

/** 배지 ID */
export type AchievementId =
  | 'first_visit'
  | 'streak_7'
  | 'streak_30'
  | 'first_correct'
  | 'streak_correct_5'
  | 'accuracy_80'
  | 'first_diagnosis'
  | 'assets_100m'
  | 'first_share'
  | 'first_post';

/** 배지 정의 */
export interface AchievementDef {
  id: AchievementId;
  emoji: string;
  title: string;
  description: string;
  /** 해금 조건 카테고리 (자동 체크용) */
  category: 'streak' | 'prediction' | 'portfolio' | 'social';
}

/** 해금 데이터 (AsyncStorage 저장) */
export interface AchievementData {
  /** 해금된 배지 ID → 해금 날짜 매핑 */
  [key: string]: string; // "YYYY-MM-DD"
}

/** UI용 배지 정보 */
export interface AchievementWithStatus extends AchievementDef {
  /** 해금 여부 */
  isUnlocked: boolean;
  /** 해금 날짜 (null이면 미해금) */
  unlockedDate: string | null;
}

// ============================================================================
// 배지 정의 (핵심 10개)
// ============================================================================

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_visit',
    emoji: '🔥',
    title: '첫 출석',
    description: 'baln에 오신 걸 환영합니다',
    category: 'streak',
  },
  {
    id: 'streak_7',
    emoji: '🔥',
    title: '7일 연속',
    description: '일주일 연속 방문! 습관이 시작됐어요',
    category: 'streak',
  },
  {
    id: 'streak_30',
    emoji: '💎',
    title: '30일 연속',
    description: '한 달 연속! 투자 고수의 습관',
    category: 'streak',
  },
  {
    id: 'first_correct',
    emoji: '🎯',
    title: '첫 적중',
    description: '첫 예측 적중! 시작이 좋아요',
    category: 'prediction',
  },
  {
    id: 'streak_correct_5',
    emoji: '🎯',
    title: '5연속 적중',
    description: '5연속! 시장을 읽는 눈이 생겼어요',
    category: 'prediction',
  },
  {
    id: 'accuracy_80',
    emoji: '🏆',
    title: '적중률 80%',
    description: '상위 1%! 시장 분석가 수준',
    category: 'prediction',
  },
  {
    id: 'first_diagnosis',
    emoji: '📊',
    title: '첫 AI 진단',
    description: '첫 포트폴리오 진단 완료',
    category: 'portfolio',
  },
  {
    id: 'assets_100m',
    emoji: '💰',
    title: '1억 달성',
    description: '자산 1억 돌파! 축하합니다',
    category: 'portfolio',
  },
  {
    id: 'first_share',
    emoji: '📤',
    title: '첫 공유',
    description: '맥락 카드를 공유했어요',
    category: 'social',
  },
  {
    id: 'first_post',
    emoji: '✍️',
    title: '첫 게시글',
    description: '커뮤니티 첫 글 작성',
    category: 'social',
  },
];

// ============================================================================
// 데이터 CRUD
// ============================================================================

/**
 * 현재 해금된 배지 데이터 조회
 */
export async function getAchievements(): Promise<AchievementData> {
  try {
    const stored = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as AchievementData;
  } catch (error) {
    console.error('[achievementService] getAchievements 에러:', error);
    return {};
  }
}

/**
 * 배지 해금 (이미 해금됐으면 skip)
 * @returns 새로 해금됐으면 true, 이미 해금이면 false
 */
export async function unlockAchievement(id: AchievementId): Promise<boolean> {
  try {
    const data = await getAchievements();

    // 이미 해금된 배지면 skip
    if (data[id]) {
      return false;
    }

    // 해금 날짜 저장
    data[id] = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data));

    console.log(`[achievementService] 배지 해금: ${id}`);
    return true;
  } catch (error) {
    console.error('[achievementService] unlockAchievement 에러:', error);
    return false;
  }
}

/**
 * 배지 목록 + 해금 상태 반환 (UI 렌더링용)
 */
export async function getAchievementsWithStatus(): Promise<AchievementWithStatus[]> {
  const data = await getAchievements();

  return ACHIEVEMENTS.map((def) => ({
    ...def,
    isUnlocked: !!data[def.id],
    unlockedDate: data[def.id] || null,
  }));
}

/**
 * 해금된 배지 수 반환
 */
export async function getUnlockedCount(): Promise<{ unlocked: number; total: number }> {
  const data = await getAchievements();
  const unlockedCount = Object.keys(data).length;
  return { unlocked: unlockedCount, total: ACHIEVEMENTS.length };
}

// ============================================================================
// 자동 해금 체크 로직
// ============================================================================

/**
 * 자동 해금 체크 인터페이스
 * 각 체크 함수에 현재 데이터를 전달하면 조건 충족 시 자동 해금
 */
export interface AutoCheckParams {
  /** 연속 방문 일수 (streakService) */
  currentStreak?: number;
  /** 예측 적중률 (%) */
  predictionAccuracy?: number;
  /** 예측 연속 적중 */
  predictionStreak?: number;
  /** 예측 적중 횟수 (1회 이상이면 첫 적중) */
  correctVotes?: number;
  /** 총 자산 (원) */
  totalAssets?: number;
  /** AI 진단 사용 여부 */
  hasDiagnosis?: boolean;
  /** 공유 여부 */
  hasShared?: boolean;
  /** 게시글 작성 여부 */
  hasPosted?: boolean;
}

/**
 * 자동 해금 체크 (여러 조건 한번에)
 * @returns 새로 해금된 배지 ID 배열
 */
export async function checkAndUnlockAchievements(
  params: AutoCheckParams
): Promise<AchievementId[]> {
  const newlyUnlocked: AchievementId[] = [];

  // 1. 첫 출석 (streak 1 이상)
  if (params.currentStreak !== undefined && params.currentStreak >= 1) {
    const unlocked = await unlockAchievement('first_visit');
    if (unlocked) newlyUnlocked.push('first_visit');
  }

  // 2. 7일 연속
  if (params.currentStreak !== undefined && params.currentStreak >= 7) {
    const unlocked = await unlockAchievement('streak_7');
    if (unlocked) newlyUnlocked.push('streak_7');
  }

  // 3. 30일 연속
  if (params.currentStreak !== undefined && params.currentStreak >= 30) {
    const unlocked = await unlockAchievement('streak_30');
    if (unlocked) newlyUnlocked.push('streak_30');
  }

  // 4. 첫 적중
  if (params.correctVotes !== undefined && params.correctVotes >= 1) {
    const unlocked = await unlockAchievement('first_correct');
    if (unlocked) newlyUnlocked.push('first_correct');
  }

  // 5. 5연속 적중
  if (params.predictionStreak !== undefined && params.predictionStreak >= 5) {
    const unlocked = await unlockAchievement('streak_correct_5');
    if (unlocked) newlyUnlocked.push('streak_correct_5');
  }

  // 6. 적중률 80% (최소 10회 이상 투표)
  if (params.predictionAccuracy !== undefined && params.predictionAccuracy >= 80) {
    const unlocked = await unlockAchievement('accuracy_80');
    if (unlocked) newlyUnlocked.push('accuracy_80');
  }

  // 7. 첫 AI 진단
  if (params.hasDiagnosis) {
    const unlocked = await unlockAchievement('first_diagnosis');
    if (unlocked) newlyUnlocked.push('first_diagnosis');
  }

  // 8. 1억 달성
  if (params.totalAssets !== undefined && params.totalAssets >= 100000000) {
    const unlocked = await unlockAchievement('assets_100m');
    if (unlocked) newlyUnlocked.push('assets_100m');
  }

  // 9. 첫 공유
  if (params.hasShared) {
    const unlocked = await unlockAchievement('first_share');
    if (unlocked) newlyUnlocked.push('first_share');
  }

  // 10. 첫 게시글
  if (params.hasPosted) {
    const unlocked = await unlockAchievement('first_post');
    if (unlocked) newlyUnlocked.push('first_post');
  }

  return newlyUnlocked;
}

// ============================================================================
// 초기화 (테스트용)
// ============================================================================

/**
 * 모든 배지 초기화 (테스트용)
 */
export async function resetAllAchievements(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACHIEVEMENTS_KEY);
    console.log('[achievementService] 모든 배지 초기화 완료');
  } catch (error) {
    console.error('[achievementService] 초기화 에러:', error);
  }
}
