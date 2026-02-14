/**
 * streakService.ts - 연속 기록(Streak) 관리 서비스
 *
 * 역할: "출석부 관리 부서" — 매일 앱 방문 시 연속일수를 추적하고 업데이트
 *
 * 비즈니스 로직:
 * - 어제 방문 → currentStreak + 1
 * - 어제 미방문 → currentStreak = 1 (리셋)
 * - 오늘 이미 방문 → 변동 없음
 *
 * 이탈 방지 전략:
 * - "127일 연속 기록이 사라집니다" → 손실 회피 심리 활용
 * - 7일 마일스톤마다 특별 메시지 → 성취감 강화
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 스트릭 데이터 타입
export interface StreakData {
  currentStreak: number;      // 현재 연속 일수
  lastVisitDate: string;      // 마지막 방문 날짜 (YYYY-MM-DD)
  longestStreak: number;      // 역대 최장 연속 일수
}

// 스트릭 메시지 타입
export interface StreakMessage {
  message: string;            // 표시할 메시지
  emoji: string;              // 표시할 이모지
  isMilestone: boolean;       // 마일스톤 여부 (7, 30, 100일 등)
}

// AsyncStorage 키
const STREAK_KEY = '@baln:streak_data';

// 기본값
const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  lastVisitDate: '',
  longestStreak: 0,
};

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * 두 날짜 사이의 일수 차이 계산
 */
function getDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 스트릭 데이터 조회
 */
export async function getStreakData(): Promise<StreakData> {
  try {
    const json = await AsyncStorage.getItem(STREAK_KEY);
    if (!json) {
      return DEFAULT_STREAK;
    }
    return JSON.parse(json) as StreakData;
  } catch (error) {
    console.warn('[streakService] getStreakData 에러:', error);
    return DEFAULT_STREAK;
  }
}

/**
 * 스트릭 데이터 저장
 */
async function saveStreakData(data: StreakData): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[streakService] saveStreakData 에러:', error);
  }
}

/**
 * 스트릭 체크 & 업데이트 (핵심 로직)
 *
 * 반환값:
 * - updated: true면 스트릭이 증가했거나 리셋됨 (신규 방문)
 * - isNewStreak: true면 어제 미방문으로 인한 리셋
 * - data: 업데이트된 스트릭 데이터
 */
export async function checkAndUpdateStreak(): Promise<{
  updated: boolean;
  isNewStreak: boolean;
  data: StreakData;
}> {
  const today = getTodayString();
  const prevData = await getStreakData();

  // 케이스 1: 첫 방문
  if (!prevData.lastVisitDate) {
    const newData: StreakData = {
      currentStreak: 1,
      lastVisitDate: today,
      longestStreak: 1,
    };
    await saveStreakData(newData);
    return { updated: true, isNewStreak: true, data: newData };
  }

  // 케이스 2: 오늘 이미 방문함 (변동 없음)
  if (prevData.lastVisitDate === today) {
    return { updated: false, isNewStreak: false, data: prevData };
  }

  // 케이스 3: 어제 방문 → 연속 +1
  const daysSinceLastVisit = getDaysDiff(prevData.lastVisitDate, today);
  if (daysSinceLastVisit === 1) {
    const newStreak = prevData.currentStreak + 1;
    const newData: StreakData = {
      currentStreak: newStreak,
      lastVisitDate: today,
      longestStreak: Math.max(newStreak, prevData.longestStreak),
    };
    await saveStreakData(newData);
    return { updated: true, isNewStreak: false, data: newData };
  }

  // 케이스 4: 어제 미방문 → 연속 리셋
  const newData: StreakData = {
    currentStreak: 1,
    lastVisitDate: today,
    longestStreak: prevData.longestStreak, // 역대 최장 기록은 유지
  };
  await saveStreakData(newData);
  return { updated: true, isNewStreak: true, data: newData };
}

/**
 * 연속일수에 따른 메시지 생성
 */
export function getStreakMessage(streak: number): StreakMessage {
  // 100일 이상
  if (streak >= 100) {
    return {
      emoji: '🏆',
      message: `${streak}일 연속! 당신은 진정한 투자자입니다`,
      isMilestone: streak % 10 === 0, // 110, 120, 130...
    };
  }

  // 30일 이상
  if (streak >= 30) {
    return {
      emoji: '💎',
      message: `${streak}일 연속! 투자 내공이 쌓이고 있어요`,
      isMilestone: streak === 30 || streak === 50 || streak === 75,
    };
  }

  // 7일 이상
  if (streak >= 7) {
    return {
      emoji: '🔥',
      message: `${streak}일 연속! 투자 습관이 자리잡고 있어요`,
      isMilestone: streak % 7 === 0, // 7, 14, 21...
    };
  }

  // 3일 이상
  if (streak >= 3) {
    return {
      emoji: '✨',
      message: `${streak}일 연속! 잘하고 있어요`,
      isMilestone: false,
    };
  }

  // 1-2일
  return {
    emoji: '🌱',
    message: `${streak}일 연속! 좋은 시작이에요`,
    isMilestone: false,
  };
}

/**
 * 스트릭 리셋 (테스트용 또는 사용자 요청 시)
 */
export async function resetStreak(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STREAK_KEY);
  } catch (error) {
    console.warn('[streakService] resetStreak 에러:', error);
  }
}
