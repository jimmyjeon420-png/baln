/**
 * useHabitLoopTracking.ts - 습관 루프 완료 추적 훅
 *
 * 역할: "습관 형성 분석 부서 - 일일 습관 루프 진행률 추적기"
 * 사용자가 매일의 습관 루프(맥락 카드 → 예측 투표 → 복기)를
 * 얼마나 완료했는지 추적합니다.
 *
 * 습관 루프 3단계:
 * 1. context_card_read  — 맥락 카드 읽기 (교육)
 * 2. prediction_vote    — 예측 투표 (참여)
 * 3. review_completed   — 복기 완료 (학습)
 *
 * AsyncStorage에 날짜별로 저장하여 오늘 진행률을 유지합니다.
 * 3단계 모두 완료 시 'habit_loop_completed' 이벤트를 발생시킵니다.
 *
 * 사용법:
 * const { trackStep, todayProgress } = useHabitLoopTracking();
 * trackStep('context_card_read'); // 맥락 카드 읽었을 때
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../services/analyticsService';

/** 습관 루프 단계 타입 */
export type HabitStep = 'context_card_read' | 'prediction_vote' | 'review_completed';

/** 오늘의 습관 루프 진행 상태 */
export interface TodayProgress {
  cardRead: boolean;
  voted: boolean;
  reviewed: boolean;
}

/** AsyncStorage 키 프리픽스 */
const STORAGE_KEY_PREFIX = '@baln:habit_loop:';

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (KST 기준) */
function getTodayKST(): string {
  const now = new Date();
  // KST (UTC+9) 기준으로 날짜 계산 — UTC 자정 문제 방지
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

/** 기본 진행 상태 */
const DEFAULT_PROGRESS: TodayProgress = {
  cardRead: false,
  voted: false,
  reviewed: false,
};

/**
 * 습관 루프 추적 훅
 *
 * @returns trackStep - 단계 완료 기록 함수
 * @returns todayProgress - 오늘의 진행 상태
 * @returns getCompletionRate - 완료율 (0, 33, 67, 100)
 */
export function useHabitLoopTracking() {
  const { user } = useAuth();
  const [todayProgress, setTodayProgress] = useState<TodayProgress>(DEFAULT_PROGRESS);

  // 현재 날짜 키를 ref로 관리하여 날짜 변경 감지 가능
  const todayKeyRef = useRef<string>(getTodayKST());

  /** 현재 날짜에 해당하는 AsyncStorage 키 반환 */
  const getStorageKey = useCallback(() => {
    const today = getTodayKST();
    // 날짜가 바뀌었으면 ref 업데이트 + 진행 상태 리셋
    if (today !== todayKeyRef.current) {
      todayKeyRef.current = today;
      setTodayProgress(DEFAULT_PROGRESS);
    }
    return `${STORAGE_KEY_PREFIX}${today}`;
  }, []);

  // 앱 시작 시 오늘 진행 상태 복원
  useEffect(() => {
    (async () => {
      try {
        const key = getStorageKey();
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored) as TodayProgress;
          setTodayProgress(parsed);
        }
      } catch {
        // 파싱 에러 → 무시 (새로 시작)
      }
    })();
  }, [getStorageKey]);

  /**
   * 습관 루프 단계 완료 기록
   * 이미 완료된 단계는 중복 기록하지 않습니다.
   */
  const trackStep = useCallback(
    async (step: HabitStep) => {
      const storageKey = getStorageKey();
      const today = getTodayKST();

      setTodayProgress((prev) => {
        // 이미 완료된 단계면 스킵
        if (
          (step === 'context_card_read' && prev.cardRead) ||
          (step === 'prediction_vote' && prev.voted) ||
          (step === 'review_completed' && prev.reviewed)
        ) {
          return prev;
        }

        const updated: TodayProgress = { ...prev };

        switch (step) {
          case 'context_card_read':
            updated.cardRead = true;
            break;
          case 'prediction_vote':
            updated.voted = true;
            break;
          case 'review_completed':
            updated.reviewed = true;
            break;
        }

        return updated;
      });

      // Side effects 를 setState 밖으로 이동 (React 18 Strict Mode 안전)
      // 현재 상태를 AsyncStorage에서 직접 읽어 중복 체크
      try {
        const storedRaw = await AsyncStorage.getItem(storageKey);
        const current: TodayProgress = storedRaw ? JSON.parse(storedRaw) : DEFAULT_PROGRESS;

        // 이미 완료된 단계면 side effect 스킵
        if (
          (step === 'context_card_read' && current.cardRead) ||
          (step === 'prediction_vote' && current.voted) ||
          (step === 'review_completed' && current.reviewed)
        ) {
          return;
        }

        const updated: TodayProgress = { ...current };
        switch (step) {
          case 'context_card_read':
            updated.cardRead = true;
            break;
          case 'prediction_vote':
            updated.voted = true;
            break;
          case 'review_completed':
            updated.reviewed = true;
            break;
        }

        // AsyncStorage에 저장
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

        // Analytics 이벤트 기록
        trackEvent('habit_loop_step', { step, date: today }, user?.id);

        // 3단계 모두 완료 시 완료 이벤트
        if (updated.cardRead && updated.voted && updated.reviewed) {
          trackEvent('habit_loop_completed', { date: today }, user?.id);
        }
      } catch {
        // AsyncStorage 에러 → 앱 안정성 우선, 이벤트는 무시
      }
    },
    [getStorageKey, user?.id],
  );

  /**
   * 오늘의 완료율 (0 / 33 / 67 / 100)
   */
  const getCompletionRate = useCallback((): number => {
    const steps = [todayProgress.cardRead, todayProgress.voted, todayProgress.reviewed];
    const completed = steps.filter(Boolean).length;
    return Math.round((completed / 3) * 100);
  }, [todayProgress]);

  return { trackStep, todayProgress, getCompletionRate };
}
