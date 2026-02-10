/**
 * useInvestorLevel.ts - 투자 레벨 TanStack Query 훅
 *
 * 역할: "레벨 관리 부서의 접수 창구"
 * - useMyLevel: 내 레벨/XP/스트릭 조회 (staleTime 1분)
 * - useXPHistory: XP 이벤트 타임라인
 * - useCheckinHeatmap: 30일 출석 히트맵
 * - useCheckIn: 출석 체크 뮤테이션
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getMyLevel, getXPHistory, getCheckinHeatmap, performCheckIn, grantXP } from '../services/levelService';
import type { UserInvestorLevel, XPEvent, CheckInResult, GrantXPResult } from '../types/level';

// ============================================================================
// Query Keys
// ============================================================================

const LEVEL_KEYS = {
  myLevel: (userId: string) => ['investor-level', userId],
  xpHistory: (userId: string) => ['xp-history', userId],
  heatmap: (userId: string) => ['checkin-heatmap', userId],
};

// ============================================================================
// 내 레벨 조회
// ============================================================================

/** 테이블 미존재 / 네트워크 오류 시 반환하는 기본 레벨 데이터 */
const DEFAULT_LEVEL: UserInvestorLevel = {
  user_id: '',
  total_xp: 0,
  level: 1,
  current_streak: 0,
  longest_streak: 0,
  last_checkin_date: null,
  total_checkins: 0,
  total_quizzes_correct: 0,
  total_quizzes_attempted: 0,
  quiz_streak: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function useMyLevel() {
  const { user } = useAuth();

  return useQuery<UserInvestorLevel | null>({
    queryKey: LEVEL_KEYS.myLevel(user?.id || ''),
    queryFn: async () => {
      try {
        return await getMyLevel(user!.id);
      } catch (err) {
        console.warn('[useMyLevel] 레벨 조회 실패 (기본값 사용):', err);
        return { ...DEFAULT_LEVEL, user_id: user!.id };
      }
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000,  // 1분
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// XP 히스토리
// ============================================================================

export function useXPHistory(limit: number = 20) {
  const { user } = useAuth();

  return useQuery<XPEvent[]>({
    queryKey: [...LEVEL_KEYS.xpHistory(user?.id || ''), limit],
    queryFn: async () => {
      try {
        return await getXPHistory(user!.id, limit);
      } catch (err) {
        console.warn('[useXPHistory] XP 히스토리 조회 실패 (빈 배열 반환):', err);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000,
  });
}

// ============================================================================
// 30일 출석 히트맵
// ============================================================================

export function useCheckinHeatmap() {
  const { user } = useAuth();

  return useQuery<string[]>({
    queryKey: LEVEL_KEYS.heatmap(user?.id || ''),
    queryFn: async () => {
      try {
        return await getCheckinHeatmap(user!.id);
      } catch (err) {
        console.warn('[useCheckinHeatmap] 히트맵 조회 실패 (빈 배열 반환):', err);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,  // 5분
  });
}

// ============================================================================
// 출석 체크 뮤테이션
// ============================================================================

export function useCheckIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<CheckInResult, Error>({
    mutationFn: async () => {
      if (!user?.id) {
        console.warn('[useCheckIn] 로그인 필요 — 기본 실패 반환');
        return { success: false, reason: '로그인 필요' } as CheckInResult;
      }
      try {
        return await performCheckIn(user.id);
      } catch (err) {
        console.warn('[useCheckIn] performCheckIn 예외 (기본값 반환):', err);
        return { success: false, reason: 'RPC 실패' } as CheckInResult;
      }
    },
    onSuccess: () => {
      if (!user?.id) return;
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: LEVEL_KEYS.myLevel(user.id) });
      queryClient.invalidateQueries({ queryKey: LEVEL_KEYS.xpHistory(user.id) });
      queryClient.invalidateQueries({ queryKey: LEVEL_KEYS.heatmap(user.id) });
    },
  });
}

// ============================================================================
// XP 부여 뮤테이션
// ============================================================================

export function useGrantXP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, source }: { amount: number; source: string }) => {
      if (!user?.id) {
        console.warn('[useGrantXP] 로그인 필요 — 기본값 반환');
        return { success: false, new_xp: 0, new_level: 1, level_up: false } as GrantXPResult;
      }
      try {
        return await grantXP(user.id, amount, source);
      } catch (err) {
        console.warn('[useGrantXP] grant_xp RPC 예외 (기본값 반환):', err);
        return { success: false, new_xp: 0, new_level: 1, level_up: false } as GrantXPResult;
      }
    },
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: LEVEL_KEYS.myLevel(user.id) });
      queryClient.invalidateQueries({ queryKey: LEVEL_KEYS.xpHistory(user.id) });
    },
  });
}
