/**
 * useBracketPerformance — 또래 비교 훅 (P2-B)
 *
 * [역할]
 * bracket_performance 테이블에서 내 자산 구간의 평균 수익률을 조회
 * HealthScoreSection에 "같은 구간 평균: +X.X%" 카드로 표시
 *
 * [bracket 매핑]
 * bracket_0: 1억 미만 / bracket_1: 1~3억 / bracket_2: 3~5억
 * bracket_3: 5~10억 / bracket_4: 10~30억 / bracket_5: 30억+
 */

import { useQuery } from '@tanstack/react-query';
import supabase from '../services/supabase';

// ── 타입 ──

export interface BracketPerformanceData {
  bracket: string;
  bracketLabel: string;      // "1억~3억 구간"
  avgReturnRate: number;     // 평균 수익률 (%)
  medianReturnRate: number;
  top10ReturnRate: number;
  userCount: number;
  statDate: string;
}

// ── 자산 구간 판별 ──

export function getBracketFromTotal(totalAssets: number): string {
  const 억 = 100_000_000;
  if (totalAssets < 억)         return 'bracket_0';
  if (totalAssets < 3 * 억)     return 'bracket_1';
  if (totalAssets < 5 * 억)     return 'bracket_2';
  if (totalAssets < 10 * 억)    return 'bracket_3';
  if (totalAssets < 30 * 억)    return 'bracket_4';
  return 'bracket_5';
}

export function getBracketLabel(bracket: string): string {
  const labels: Record<string, string> = {
    bracket_0: '1억 미만',
    bracket_1: '1억~3억',
    bracket_2: '3억~5억',
    bracket_3: '5억~10억',
    bracket_4: '10억~30억',
    bracket_5: '30억 이상',
  };
  return labels[bracket] ?? '해당 구간';
}

// ── 조회 함수 ──

async function fetchBracketPerformance(bracket: string): Promise<BracketPerformanceData | null> {
  const { data, error } = await supabase
    .from('bracket_performance')
    .select('bracket, stat_date, avg_return_rate, median_return_rate, top_10_return_rate, user_count')
    .eq('bracket', bracket)
    .order('stat_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.warn('[useBracketPerformance] 조회 실패:', error?.message);
    return null;
  }

  return {
    bracket: data.bracket,
    bracketLabel: getBracketLabel(data.bracket),
    avgReturnRate: data.avg_return_rate ?? 0,
    medianReturnRate: data.median_return_rate ?? 0,
    top10ReturnRate: data.top_10_return_rate ?? 0,
    userCount: data.user_count ?? 0,
    statDate: data.stat_date,
  };
}

// ── 훅 ──

export function useBracketPerformance(totalAssets: number) {
  const bracket = getBracketFromTotal(totalAssets);

  const { data, isLoading } = useQuery<BracketPerformanceData | null>({
    queryKey: ['bracketPerformance', bracket],
    queryFn: () => fetchBracketPerformance(bracket),
    staleTime: 60 * 60 * 1000,  // 1시간 (일일 집계 데이터)
    gcTime: 2 * 60 * 60 * 1000,
    enabled: totalAssets > 0,
    retry: 1,
  });

  return {
    peerData: data ?? null,
    bracket,
    bracketLabel: getBracketLabel(bracket),
    isLoading,
  };
}
