/**
 * useStreakRecovery.ts - 스트릭 복구 훅
 *
 * 역할: "스트릭 복구 관리 창구" -- 끊긴 스트릭을 크레딧으로 복구하는 로직
 *
 * 비즈니스 로직:
 * - 마지막 활동일과 오늘을 비교하여 놓친 일수 계산
 * - 1~3일: 크레딧으로 복구 가능 (비용 증가)
 * - 4일+: 복구 불가, 새로 시작
 * - 크레딧 차감: Supabase spend_credits RPC
 *
 * 저장소: AsyncStorage '@baln_streak_last_active' + '@baln:streak_data'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { getCurrentUser } from '../services/supabase';
import { getStreakData } from '../services/streakService';

// ============================================================================
// 타입 정의
// ============================================================================

export interface UseStreakRecoveryReturn {
  /** 복구 가능 여부 (1~3일 경과) */
  canRecover: boolean;
  /** 놓친 일수 (0이면 스트릭 정상) */
  daysMissed: number;
  /** 복구 비용 (크레딧) */
  recoveryCost: number;
  /** 끊기기 전 스트릭 일수 */
  previousStreak: number;
  /** 복구 실행 함수 */
  recoverStreak: () => Promise<RecoverResult>;
  /** 복구 처리 중 여부 */
  isRecovering: boolean;
  /** 복구 모달 표시 여부 */
  showRecoveryModal: boolean;
  /** 복구 모달 닫기 */
  dismissRecoveryModal: () => void;
  /** 데이터 새로고침 */
  refresh: () => Promise<void>;
}

export interface RecoverResult {
  success: boolean;
  errorMessage?: string;
  newBalance?: number;
}

// ============================================================================
// 상수
// ============================================================================

/** AsyncStorage 키: 마지막 활동일 */
const LAST_ACTIVE_KEY = '@baln_streak_last_active';

/** AsyncStorage 키: 복구 모달 해제 날짜 (같은 날 두 번 안 보이게) */
const RECOVERY_DISMISSED_KEY = '@baln_streak_recovery_dismissed';

/** 스트릭 데이터 키 (streakService.ts와 동일) */
const STREAK_KEY = '@baln:streak_data';

/** 복구 비용 티어 */
const RECOVERY_COSTS: Record<number, number> = {
  1: 3,  // 1일 경과 = 3크레딧
  2: 5,  // 2일 경과 = 5크레딧
  3: 8,  // 3일 경과 = 8크레딧
};

/** 최대 복구 가능 일수 */
const MAX_RECOVERY_DAYS = 3;

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 오늘 날짜 (YYYY-MM-DD)
 *
 * 주의: streakService.ts의 getTodayString()과 동일한 방식(UTC 기준)을 사용해야 합니다.
 * streakService가 lastVisitDate를 UTC 기준으로 저장하므로,
 * 여기서도 UTC를 사용해야 daysMissed 계산이 정확합니다.
 */
function getTodayKST(): string {
  return new Date().toISOString().split('T')[0];
}

/** 두 날짜 사이의 일수 차이 계산 */
function getDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// 훅
// ============================================================================

export function useStreakRecovery(): UseStreakRecoveryReturn {
  const [daysMissed, setDaysMissed] = useState(0);
  const [previousStreak, setPreviousStreak] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // 동시 복구 방지 가드
  const recoverInProgress = useRef(false);

  // ─── 스트릭 상태 확인 ───
  const checkRecoveryStatus = useCallback(async () => {
    try {
      const streakData = await getStreakData();
      const lastVisitDate = streakData.lastVisitDate;

      // 방문 기록이 없으면 복구할 것도 없음
      if (!lastVisitDate) {
        setDaysMissed(0);
        setPreviousStreak(0);
        return;
      }

      const today = getTodayKST();

      // 오늘 이미 방문했으면 정상
      if (lastVisitDate === today) {
        setDaysMissed(0);
        setPreviousStreak(0);
        return;
      }

      const missed = getDaysDiff(lastVisitDate, today);

      // 어제 방문 = 1일 차이 = 스트릭 연속 가능 (끊긴 게 아님)
      if (missed <= 1) {
        setDaysMissed(0);
        setPreviousStreak(0);
        return;
      }

      // 2일 이상 차이 = 스트릭 끊김 (missed - 1이 실제 놓친 일수)
      // 예: 어제 방문, 오늘 미방문, 내일 방문 = 2일 차이 = 1일 놓침
      const actualMissed = missed - 1;
      setDaysMissed(actualMissed);
      setPreviousStreak(streakData.currentStreak);

      // 마지막 활동일 기록 (아직 없으면)
      const storedLastActive = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
      if (!storedLastActive) {
        await AsyncStorage.setItem(LAST_ACTIVE_KEY, lastVisitDate);
      }

      // 같은 날 이미 모달을 해제했으면 다시 안 보여줌
      const dismissedDate = await AsyncStorage.getItem(RECOVERY_DISMISSED_KEY);
      if (dismissedDate === today) {
        setShowRecoveryModal(false);
        return;
      }

      // 복구 가능하면 모달 표시
      if (actualMissed >= 1 && actualMissed <= MAX_RECOVERY_DAYS) {
        setShowRecoveryModal(true);
      } else if (actualMissed > MAX_RECOVERY_DAYS) {
        // 복구 불가해도 한 번은 안내 모달 표시
        setShowRecoveryModal(true);
      }
    } catch (error) {
      console.warn('[useStreakRecovery] checkRecoveryStatus 에러:', error);
    }
  }, []);

  // 마운트 시 자동 체크
  useEffect(() => {
    checkRecoveryStatus();
  }, [checkRecoveryStatus]);

  // ─── 복구 비용 계산 ───
  const canRecover = daysMissed >= 1 && daysMissed <= MAX_RECOVERY_DAYS;
  const recoveryCost = RECOVERY_COSTS[daysMissed] ?? 0;

  // ─── 스트릭 복구 실행 ───
  const recoverStreak = useCallback(async (): Promise<RecoverResult> => {
    // 동시 실행 방지
    if (recoverInProgress.current) {
      return { success: false, errorMessage: '복구 처리 중입니다.' };
    }
    recoverInProgress.current = true;
    setIsRecovering(true);

    try {
      // 1. 복구 가능 여부 재확인
      if (!canRecover) {
        return { success: false, errorMessage: '복구 기간이 지났습니다.' };
      }

      // 2. 로그인 확인
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, errorMessage: '로그인이 필요합니다.' };
      }

      // 3. 크레딧 차감 (spend_credits RPC)
      const { data: rpcData, error: rpcError } = await supabase.rpc('spend_credits', {
        p_user_id: user.id,
        p_amount: recoveryCost,
        p_feature_type: 'deep_dive', // 범용 타입 사용 (useStreakFreeze.ts 패턴 준용)
        p_feature_ref_id: `streak_recovery_${getTodayKST()}_${daysMissed}d`,
      });

      if (rpcError) {
        console.warn('[useStreakRecovery] spend_credits RPC 실패:', rpcError.message);
        return { success: false, errorMessage: rpcError.message };
      }

      const row = rpcData?.[0];
      if (!row || !row.success) {
        return {
          success: false,
          errorMessage: row?.error_message || '크레딧이 부족합니다.',
          newBalance: row?.new_balance ?? 0,
        };
      }

      // 4. 스트릭 데이터 복원 (AsyncStorage)
      const today = getTodayKST();
      const restoredStreak = {
        currentStreak: previousStreak + 1, // 끊기기 전 기록 + 오늘
        lastVisitDate: today,
        longestStreak: Math.max(previousStreak + 1, (await getStreakData()).longestStreak),
      };
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(restoredStreak));

      // 5. 마지막 활동일 업데이트
      await AsyncStorage.setItem(LAST_ACTIVE_KEY, today);

      // 6. 상태 초기화
      setDaysMissed(0);
      setPreviousStreak(0);
      setShowRecoveryModal(false);

      return { success: true, newBalance: row.new_balance };
    } catch (error) {
      console.warn('[useStreakRecovery] recoverStreak 예외:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      };
    } finally {
      setIsRecovering(false);
      recoverInProgress.current = false;
    }
  }, [canRecover, recoveryCost, daysMissed, previousStreak]);

  // ─── 복구 모달 해제 ───
  const dismissRecoveryModal = useCallback(async () => {
    setShowRecoveryModal(false);
    try {
      // 오늘 날짜를 저장하여 같은 날 다시 안 보이게
      await AsyncStorage.setItem(RECOVERY_DISMISSED_KEY, getTodayKST());
    } catch (error) {
      console.warn('[useStreakRecovery] dismissRecoveryModal 에러:', error);
    }
  }, []);

  return {
    canRecover,
    daysMissed,
    recoveryCost,
    previousStreak,
    recoverStreak,
    isRecovering,
    showRecoveryModal,
    dismissRecoveryModal,
    refresh: checkRecoveryStatus,
  };
}
