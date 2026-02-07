/**
 * useSubscription.ts - 구독 상태 + 매일 무료 진단 훅
 *
 * 역할: "구독 관리 접수 창구"
 * - TanStack Query로 구독 상태 캐시 (5분)
 * - 무료 체험 활성화 mutation
 * - 매일 무료 진단 횟수 조회/사용
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSubscriptionStatus,
  activateFreeTrial,
  getDailyFreeStatus,
  useDailyFreeAnalysis as consumeDailyFree,
  SubscriptionStatus,
} from '../services/subscriptionService';
import supabase from '../services/supabase';

// 캐시 키
const SUBSCRIPTION_KEY = 'subscription';
const DAILY_FREE_KEY = 'daily-free-analysis';

/**
 * 구독 상태 조회 훅
 * - staleTime 5분: 탭 전환 시 0ms (캐시 히트)
 */
export function useSubscriptionStatus() {
  const query = useQuery<SubscriptionStatus>({
    queryKey: [SUBSCRIPTION_KEY],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          isPremium: false,
          isTrialActive: false,
          isTrialExpired: false,
          trialDaysLeft: 0,
          expiresAt: null,
          planType: 'free' as const,
        };
      }
      return getSubscriptionStatus(user.id);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    isPremium: query.data?.isPremium ?? false,
    isTrialActive: query.data?.isTrialActive ?? false,
    isTrialExpired: query.data?.isTrialExpired ?? false,
    trialDaysLeft: query.data?.trialDaysLeft ?? 0,
    expiresAt: query.data?.expiresAt ?? null,
    planType: query.data?.planType ?? 'free',
  };
}

/**
 * 무료 체험 활성화 mutation
 */
export function useActivateTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다');
      return activateFreeTrial(user.id);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_KEY] });
      }
    },
  });
}

/**
 * 매일 무료 진단 현황 훅
 * - 오늘 남은 무료 횟수, 사용 횟수, 한도 제공
 * - staleTime 1분 (자주 갱신)
 */
export function useDailyFreeAnalysis() {
  const { isPremium } = useSubscriptionStatus();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [DAILY_FREE_KEY, isPremium],
    queryFn: () => getDailyFreeStatus(isPremium),
    staleTime: 60 * 1000, // 1분 캐시
  });

  // 무료 진단 1회 사용
  const consume = useMutation({
    mutationFn: () => consumeDailyFree(isPremium),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DAILY_FREE_KEY] });
    },
  });

  return {
    used: query.data?.used ?? 0,
    limit: query.data?.limit ?? 1,
    remaining: query.data?.remaining ?? 0,
    isLoading: query.isLoading,
    consumeFree: consume.mutateAsync,
  };
}
