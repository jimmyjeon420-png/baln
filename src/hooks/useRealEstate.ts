/**
 * useRealEstate - 부동산 자산 검색/시세/저장 훅
 *
 * 비유: "부동산 중개 데스크"
 * - useRealEstateSearch: 아파트 단지 검색 (디바운스 300ms)
 * - useRealEstatePrice: 실거래가 조회 + 면적별 시세 계산
 * - useMyRealEstate: 내 부동산 자산 목록
 * - useSaveRealEstate: 부동산 자산 포트폴리오에 저장
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchApartments,
  getRecentTransactions,
  calculateEstimatedPrice,
} from '../services/realEstateApi';
import { makeRealEstateTicker } from '../types/realestate';
import type { RealEstatePortfolioInput } from '../types/realestate';
import supabase, { getCurrentUser } from '../services/supabase';
import { SHARED_PORTFOLIO_KEY } from './useSharedPortfolio';

// ============================================================================
// 디바운스 훅 (검색어 입력 시 300ms 대기)
// ============================================================================
function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ============================================================================
// 1. 아파트 검색 훅
// ============================================================================

/**
 * 아파트 단지 검색 (디바운스 300ms, 2자 이상)
 * @param rawQuery - 검색어 입력값
 */
export function useRealEstateSearch(rawQuery: string) {
  const debouncedQuery = useDebounce(rawQuery, 300);

  return useQuery({
    queryKey: ['realestate-search', debouncedQuery],
    queryFn: () => searchApartments(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// ============================================================================
// 2. 실거래가 + 시세 계산 훅
// ============================================================================

/**
 * 특정 단지의 실거래가 조회 + 면적별 시세 요약
 * @param lawdCd - 법정동코드
 * @param complexName - 단지명
 */
export function useRealEstatePrice(
  lawdCd: string | null,
  complexName: string | null,
) {
  return useQuery({
    queryKey: ['realestate-price', lawdCd, complexName],
    queryFn: async () => {
      if (!lawdCd || !complexName) return null;

      const transactions = await getRecentTransactions(lawdCd, complexName);
      const priceSummary = calculateEstimatedPrice(transactions);

      return { transactions, priceSummary };
    },
    enabled: !!lawdCd && !!complexName,
    staleTime: 1000 * 60 * 10, // 10분
  });
}

// ============================================================================
// 3. 내 부동산 자산 목록
// ============================================================================

/**
 * portfolios 테이블에서 ticker LIKE 'RE_%' 인 자산만 조회
 */
export function useMyRealEstate() {
  return useQuery({
    queryKey: ['my-realestate'],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .like('ticker', 'RE_%')
        .order('current_value', { ascending: false });

      if (error) {
        console.warn('[부동산] 목록 조회 실패:', error.message);
        return [];
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 3, // 3분
  });
}

// ============================================================================
// 4. 부동산 자산 저장 mutation
// ============================================================================

/**
 * 부동산 자산을 portfolios 테이블에 저장
 * 성공 시 포트폴리오 캐시 + 부동산 목록 캐시 자동 무효화
 */
export function useSaveRealEstate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RealEstatePortfolioInput) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const ticker = makeRealEstateTicker(
        input.lawdCd,
        input.complexName,
        input.unitArea,
      );

      const { data, error } = await supabase
        .from('portfolios')
        .upsert(
          {
            user_id: user.id,
            ticker,
            name: `${input.complexName} ${Math.round(input.unitArea)}㎡`,
            quantity: 1,
            avg_price: input.purchasePrice,
            current_price: input.currentPrice,
            current_value: input.currentPrice,
            target_allocation: 0,
            asset_type: 'illiquid',
            currency: 'KRW',
            input_type: 'self_declared',
            // 부동산 메타데이터
            lawd_cd: input.lawdCd,
            complex_name: input.complexName,
            unit_area: input.unitArea,
            unit_detail: input.unitDetail || null,
            purchase_price_krw: input.purchasePrice,
            last_price_updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,ticker' },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // 캐시 무효화: 포트폴리오 + 부동산 목록 동시 갱신
      queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
      queryClient.invalidateQueries({ queryKey: ['my-realestate'] });
    },
  });
}
