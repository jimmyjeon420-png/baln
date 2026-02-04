/**
 * useWhaleData Hook - 고래 데이터 React Query 훅
 * Whale Benchmark 데이터 fetching + 캐싱
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchWhaleAllocation,
  calculateUserAllocation,
  compareWithWhale,
  WhaleAllocation,
  AllocationComparison,
  PortfolioItem,
  WHALE_BENCHMARK_FALLBACK,
} from '../services/whaleApi';

// 훅 반환 타입
interface UseWhaleDataResult {
  whaleAllocation: WhaleAllocation | undefined;
  userAllocation: WhaleAllocation | undefined;
  comparison: AllocationComparison[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * 고래 배분 데이터 가져오기 (React Query)
 */
export const useWhaleAllocation = () => {
  return useQuery({
    queryKey: ['whaleAllocation'],
    queryFn: fetchWhaleAllocation,
    staleTime: 24 * 60 * 60 * 1000, // 24시간 캐시
    gcTime: 48 * 60 * 60 * 1000, // 48시간 후 가비지 컬렉션
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * 사용자 포트폴리오와 고래 배분 비교 훅
 */
export const useWhaleComparison = (portfolio: PortfolioItem[]): UseWhaleDataResult => {
  // 고래 배분 데이터 가져오기
  const {
    data: whaleAllocation,
    isLoading: isWhaleLoading,
    isError: isWhaleError,
    error: whaleError,
    refetch,
  } = useWhaleAllocation();

  // 사용자 배분 계산
  const userAllocation = portfolio.length > 0
    ? calculateUserAllocation(portfolio)
    : undefined;

  // 비교 데이터 생성
  const comparison = userAllocation && whaleAllocation
    ? compareWithWhale(userAllocation, whaleAllocation)
    : undefined;

  return {
    whaleAllocation: whaleAllocation || WHALE_BENCHMARK_FALLBACK,
    userAllocation,
    comparison,
    isLoading: isWhaleLoading,
    isError: isWhaleError,
    error: whaleError,
    refetch,
  };
};

export default useWhaleComparison;
