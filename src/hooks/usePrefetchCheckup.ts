/**
 * usePrefetchCheckup — 분석 탭 데이터를 미리 불러오는 훅
 *
 * [이승건 원칙] "보기 전에 준비"
 * 홈 탭이 로드될 때 분석 탭에서 쓸 AI 데이터를 백그라운드로 prefetch.
 * 사용자가 분석 탭을 탭하는 시점에는 이미 캐시에 데이터가 있다.
 *
 * 호출 위치: AuthGate (_layout.tsx) — 로그인 확인 후 즉시 실행
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSharedPortfolio, SHARED_PORTFOLIO_KEY } from './useSharedPortfolio';
import { AI_ANALYSIS_KEY, fetchAIAnalysis } from './useSharedAnalysis';
import { computePortfolioHash } from '../services/centralKitchen';

export function usePrefetchCheckup() {
  const queryClient = useQueryClient();
  const { portfolioAssets, hasAssets } = useSharedPortfolio();

  // useSharedAnalysis와 동일한 해시 기반 키 사용
  const portfolioHash = hasAssets ? computePortfolioHash(portfolioAssets) : '';

  useEffect(() => {
    if (!hasAssets || portfolioAssets.length === 0) return;

    // AI 분석 캐시가 없을 때만 prefetch (이미 있으면 스킵)
    const existing = queryClient.getQueryData([...AI_ANALYSIS_KEY, portfolioHash]);
    if (existing) return;

    queryClient.prefetchQuery({
      queryKey: [...AI_ANALYSIS_KEY, portfolioHash],
      queryFn: () => fetchAIAnalysis(portfolioAssets),
      staleTime: 1000 * 60 * 5,
    });
  }, [hasAssets, portfolioHash]);
}
