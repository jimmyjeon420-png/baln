/**
 * useTierAllocation - 등급별 투자 DNA 조회 훅
 *
 * 역할 (비유): "각 등급 클럽의 투자 성향 보고서"
 * - 무료: 내 등급 1개의 배분 데이터
 * - 과금 (15크레딧): 전체 4개 등급 비교 + 인기종목
 *
 * 토스 PO 전략: "보여주고 → 궁금하게 → 잠궈라"
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
import { spendCredits } from '../services/creditService';
import { FEATURE_COSTS, TIER_DISCOUNTS } from '../types/marketplace';
import type { UserTier } from '../types/database';
import { isFreePeriod } from '../config/freePeriod';

// ============================================================================
// 타입 정의
// ============================================================================

export interface TierAllocationStat {
  stat_date: string;
  tier: string;
  avg_stock_weight: number;
  avg_crypto_weight: number;
  avg_realestate_weight: number;
  avg_cash_weight: number;
  avg_other_weight: number;
  avg_btc_weight: number;
  top_holdings: { ticker: string; holders: number; avg_weight: number }[];
  user_count: number;
}

// ============================================================================
// 훅: 내 등급 배분 데이터 (무료)
// ============================================================================

/**
 * 내 등급의 배분 통계만 조회 (무료 티저용)
 * @param myTier 내 현재 티어
 */
export const useMyTierAllocation = (myTier: string) => {
  return useQuery({
    queryKey: ['tierAllocation', 'my', myTier],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tier_allocation_stats')
        .select('*')
        .eq('tier', myTier)
        .order('stat_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return (data || null) as TierAllocationStat | null;
    },
    enabled: !!myTier,
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
};

// ============================================================================
// 훅: 전체 등급 배분 데이터 (과금 후 조회)
// ============================================================================

/**
 * 전체 등급의 배분 통계 조회 (과금 후 활성화)
 * enabled가 true일 때만 실제 쿼리 실행
 */
export const useAllTierAllocations = (enabled: boolean) => {
  return useQuery({
    queryKey: ['tierAllocation', 'all'],
    queryFn: async () => {
      // 최신 날짜의 모든 등급 데이터 조회
      // 먼저 최신 날짜 파악
      const { data: latest } = await supabase
        .from('tier_allocation_stats')
        .select('stat_date')
        .order('stat_date', { ascending: false })
        .limit(1)
        .single();

      if (!latest) return [];

      const { data, error } = await supabase
        .from('tier_allocation_stats')
        .select('*')
        .eq('stat_date', latest.stat_date)
        .order('tier', { ascending: true });

      if (error) throw error;

      // 등급 순서 보장: SILVER → GOLD → PLATINUM → DIAMOND
      const tierOrder = ['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
      return (data || [])
        .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)) as TierAllocationStat[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// 뮤테이션: 크레딧 차감하여 전체 데이터 잠금 해제
// ============================================================================

/**
 * 투자 DNA 잠금 해제 (15크레딧 차감)
 * 성공 시 전체 등급 데이터 쿼리 활성화
 */
export const useUnlockTierInsights = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userTier: UserTier) => {
      // 무료 기간: 크레딧 차감 없이 즉시 해제
      if (isFreePeriod()) {
        return { cost: 0, newBalance: 0 };
      }

      const discountPercent = TIER_DISCOUNTS[userTier] || 0;
      const originalCost = FEATURE_COSTS.tier_insights;
      const cost = Math.round(originalCost * (1 - discountPercent / 100));

      const result = await spendCredits(cost, 'tier_insights');
      if (!result.success) {
        throw new Error(result.errorMessage || '크레딧이 부족합니다');
      }
      return { cost, newBalance: result.newBalance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['tierAllocation', 'all'] });
    },
  });
};
