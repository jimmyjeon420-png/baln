/**
 * useRewards.ts - 보상 시스템 TanStack Query 훅
 *
 * 역할: "보상 시스템 리모컨"
 * - 매일 출석 체크 상태 조회 + 실행
 * - 공유 보상 지급
 * - 웰컴 보너스 자동 지급
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDailyCheckInStatus,
  performDailyCheckIn,
  getShareRewardStatus,
  grantShareReward,
  getWelcomeBonusStatus,
  grantWelcomeBonus,
} from '../services/rewardService';

// 쿼리 키
const CHECKIN_KEY = ['rewards', 'daily-checkin'];
const SHARE_KEY = ['rewards', 'share'];
const WELCOME_KEY = ['rewards', 'welcome'];
const CREDITS_KEY = ['credits', 'balance'];

/**
 * 매일 출석 체크 훅
 * - status: 오늘 체크인 했는지, 연속 일수
 * - checkIn: 체크인 실행 mutation
 */
export function useDailyCheckIn() {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: CHECKIN_KEY,
    queryFn: getDailyCheckInStatus,
    staleTime: 60 * 1000, // 1분
  });

  const checkIn = useMutation({
    mutationFn: performDailyCheckIn,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: CHECKIN_KEY });
        queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      }
    },
  });

  return {
    checkedIn: status.data?.checkedIn ?? false,
    streak: status.data?.streak ?? 0,
    isLoading: status.isLoading,
    checkIn: checkIn.mutateAsync,
    isCheckingIn: checkIn.isPending,
  };
}

/**
 * 인스타 공유 보상 훅
 * - rewarded: 오늘 보상 받았는지
 * - claimReward: 보상 지급 mutation
 */
export function useShareReward() {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: SHARE_KEY,
    queryFn: getShareRewardStatus,
    staleTime: 60 * 1000,
  });

  const claim = useMutation({
    mutationFn: grantShareReward,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: SHARE_KEY });
        queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      }
    },
  });

  return {
    rewarded: status.data?.rewarded ?? false,
    isLoading: status.isLoading,
    claimReward: claim.mutateAsync,
    isClaiming: claim.isPending,
  };
}

/**
 * 웰컴 보너스 자동 지급 훅
 * - 앱 시작 시 1회 자동 실행 (queryFn 안에서 지급)
 * - 이미 받았으면 무시
 */
export function useWelcomeBonus(enabled: boolean = true) {
  return useQuery({
    queryKey: WELCOME_KEY,
    queryFn: async () => {
      const { received } = await getWelcomeBonusStatus();
      if (received) return { granted: false, alreadyReceived: true };

      const result = await grantWelcomeBonus();
      return {
        granted: result.success,
        creditsEarned: result.creditsEarned,
        alreadyReceived: result.alreadyReceived,
      };
    },
    staleTime: Infinity, // 한 번 실행 후 다시 안 함
    retry: false,
    enabled, // 인증 완료 전에는 실행하지 않음
  });
}
