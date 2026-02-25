/**
 * useStreak.ts - 연속 기록(Streak) 훅
 *
 * 역할: "출석부 조회 창구" — 스트릭 데이터를 React 컴포넌트에서 쉽게 사용할 수 있게 해줌
 *
 * 사용처:
 * - StreakBanner: 연속 기록 배너 표시
 * - paywall.tsx: 해지 방지 메시지 ("127일 기록 사라짐")
 * - 홈 탭: 축하 토스트 표시
 */

import { useState, useEffect } from 'react';
import {
  getStreakData,
  checkAndUpdateStreak,
  getStreakMessage,
  StreakData,
  StreakMessage,
} from '../services/streakService';
import { cancelStreakWarningForToday } from '../services/pushNotificationService';
import {
  addStreakProsperityPoints,
  handleStreakBreak,
} from '../services/streakProsperityBridge';

export interface UseStreakReturn {
  currentStreak: number;       // 현재 연속 일수
  longestStreak: number;       // 역대 최장 연속 일수
  streakMessage: StreakMessage; // 표시할 메시지
  isNewDay: boolean;           // 오늘 첫 방문인가?
  isNewStreak: boolean;        // 연속 리셋 후 새 시작인가?
  isLoading: boolean;          // 로딩 중
  refresh: () => Promise<void>; // 수동 새로고침
}

/**
 * 스트릭 훅 (자동 업데이트 + 조회)
 */
export function useStreak(): UseStreakReturn {
  const [data, setData] = useState<StreakData>({
    currentStreak: 0,
    lastVisitDate: '',
    longestStreak: 0,
  });
  const [isNewDay, setIsNewDay] = useState(false);
  const [isNewStreak, setIsNewStreak] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 스트릭 체크 & 업데이트 함수
  const checkStreak = async () => {
    try {
      setIsLoading(true);

      // 이전 스트릭 데이터 먼저 읽기 (checkAndUpdateStreak가 덮어쓰기 전)
      const prevStreakData = await getStreakData();

      const result = await checkAndUpdateStreak();
      setData(result.data);
      setIsNewDay(result.updated);
      setIsNewStreak(result.isNewStreak);

      // P2.1: 오늘 처음 방문한 경우 스트릭 경고 알림 취소
      if (result.updated) {
        cancelStreakWarningForToday().catch(() => {});

        // P2.2: 스트릭 ↔ 마을 번영도 연동
        if (!result.isNewStreak && result.data.currentStreak > 1) {
          // 스트릭 유지 → 번영도 +5 포인트
          addStreakProsperityPoints().catch(() => {});
        } else if (result.isNewStreak && prevStreakData.lastVisitDate) {
          // 스트릭 리셋 → 이전 방문일 기준으로 빠진 일수 계산 → 번영도 감소 + 구루 편지
          const lastDate = new Date(prevStreakData.lastVisitDate);
          const today = new Date();
          const daysMissed = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          handleStreakBreak(daysMissed).catch(() => {});
        }
      }
    } catch (error) {
      console.warn('[useStreak] checkStreak 에러:', error);
      // 에러 시 기존 데이터 조회
      const fallbackData = await getStreakData();
      setData(fallbackData);
    } finally {
      setIsLoading(false);
    }
  };

  // 마운트 시 자동 체크
  useEffect(() => {
    checkStreak();
  }, []);

  // 메시지 생성
  const streakMessage = getStreakMessage(data.currentStreak);

  return {
    currentStreak: data.currentStreak,
    longestStreak: data.longestStreak,
    streakMessage,
    isNewDay,
    isNewStreak,
    isLoading,
    refresh: checkStreak,
  };
}

/**
 * 스트릭 데이터만 조회 (업데이트 없이)
 * - paywall.tsx에서 해지 방지 메시지용으로 사용
 */
export function useStreakData(): {
  currentStreak: number;
  longestStreak: number;
  isLoading: boolean;
} {
  const [data, setData] = useState<StreakData>({
    currentStreak: 0,
    lastVisitDate: '',
    longestStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const streakData = await getStreakData();
        if (isMounted) {
          setData(streakData);
        }
      } catch (error) {
        console.warn('[useStreakData] 에러:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    currentStreak: data.currentStreak,
    longestStreak: data.longestStreak,
    isLoading,
  };
}
