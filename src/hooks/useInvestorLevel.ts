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
import type { UserInvestorLevel, XPEvent, CheckInResult } from '../types/level';

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

export function useMyLevel() {
  const { user } = useAuth();

  return useQuery<UserInvestorLevel | null>({
    queryKey: LEVEL_KEYS.myLevel(user?.id || ''),
    queryFn: () => getMyLevel(user!.id),
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
    queryFn: () => getXPHistory(user!.id, limit),
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
    queryFn: () => getCheckinHeatmap(user!.id),
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
      if (!user?.id) throw new Error('로그인 필요');
      return performCheckIn(user.id);
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
      if (!user?.id) throw new Error('로그인 필요');
      return grantXP(user.id, amount, source);
    },
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: LEVEL_KEYS.myLevel(user.id) });
      queryClient.invalidateQueries({ queryKey: LEVEL_KEYS.xpHistory(user.id) });
    },
  });
}
