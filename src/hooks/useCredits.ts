/**
 * useCredits - 크레딧 시스템 TanStack Query 훅
 * 화면에서 잔액/차감/충전/내역을 편하게 사용하는 "리모컨"
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyCredits,
  spendCredits,
  purchaseCredits,
  getCreditHistory,
  checkAndGrantSubscriptionBonus,
} from '../services/creditService';
import type { AIFeatureType } from '../types/marketplace';

// 쿼리 키 상수
const CREDITS_KEY = ['credits', 'balance'];
const CREDIT_HISTORY_KEY = ['credits', 'history'];

/** 내 크레딧 잔액 조회 */
export function useMyCredits() {
  return useQuery({
    queryKey: CREDITS_KEY,
    queryFn: getMyCredits,
    staleTime: 1000 * 60 * 5, // 5분 (충전/차감 시 invalidate로 즉시 갱신)
    retry: 1,                  // 크레딧 잔액은 중요 데이터 — 1회 재시도
    retryDelay: 2000,          // 2초 후 재시도
  });
}

/** 크레딧 차감 뮤테이션 */
export function useSpendCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      amount,
      featureType,
      featureRefId,
    }: {
      amount: number;
      featureType: AIFeatureType;
      featureRefId?: string;
    }) => spendCredits(amount, featureType, featureRefId),
    onSuccess: () => {
      // 잔액 & 내역 캐시 무효화
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      queryClient.invalidateQueries({ queryKey: CREDIT_HISTORY_KEY });
    },
  });
}

/** 크레딧 충전 뮤테이션 */
export function usePurchaseCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      packageId,
      iapReceiptId,
    }: {
      packageId: string;
      iapReceiptId?: string;
    }) => purchaseCredits(packageId, iapReceiptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      queryClient.invalidateQueries({ queryKey: CREDIT_HISTORY_KEY });
    },
  });
}

/** 크레딧 거래 내역 조회 */
export function useCreditHistory(limit: number = 20) {
  return useQuery({
    queryKey: [...CREDIT_HISTORY_KEY, limit],
    queryFn: () => getCreditHistory(limit),
    staleTime: 1000 * 60 * 10, // 10분 (거래 내역은 자주 바뀌지 않음)
    retry: 1,
  });
}

/** 구독 보너스 체크 (앱 시작 시 1회) */
export function useSubscriptionBonus() {
  return useQuery({
    queryKey: ['credits', 'subscription-bonus'],
    queryFn: checkAndGrantSubscriptionBonus,
    staleTime: 1000 * 60 * 60, // 1시간 (한 번 체크하면 충분)
    retry: false, // 실패해도 재시도 안 함 (non-critical)
  });
}
