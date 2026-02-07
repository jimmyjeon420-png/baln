/**
 * usePortfolioSnapshots - 포트폴리오 스냅샷 조회 훅
 *
 * 역할 (비유): "건강 기록부"를 열어보는 도구
 * - 내 자산 추이 조회 (일별/주별/월별)
 * - 같은 자산 구간 평균 수익률 비교
 * - 향후 "내 수익률 vs 동급" UI에서 사용
 */

import { useQuery } from '@tanstack/react-query';
import supabase from '../services/supabase';

// ============================================================================
// 타입 정의
// ============================================================================

// 일별 스냅샷 (내 기록)
export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_assets: number;
  tier: string;
  bracket: string;
  asset_breakdown: {
    top_holdings?: { ticker: string; value: number; weight: number }[];
    [key: string]: unknown;
  };
  net_deposit_since_last: number;
  daily_return_rate: number;
  holdings_count: number;
  panic_shield_score: number | null;
}

// 구간별 통계
export interface BracketPerformance {
  stat_date: string;
  bracket: string;
  user_count: number;
  avg_return_rate: number;
  median_return_rate: number;
  top_10_return_rate: number;
  bottom_10_return_rate: number;
  avg_panic_score: number | null;
  median_panic_score: number | null;
  panic_sample_count: number;
}

// 자산 구간 정보
export const BRACKET_INFO: Record<string, { label: string; range: string }> = {
  bracket_0: { label: '1억 미만', range: '< 1억' },
  bracket_1: { label: '1~3억', range: '1억 ~ 3억' },
  bracket_2: { label: '3~5억', range: '3억 ~ 5억' },
  bracket_3: { label: '5~10억', range: '5억 ~ 10억' },
  bracket_4: { label: '10~30억', range: '10억 ~ 30억' },
  bracket_5: { label: '30억+', range: '30억 이상' },
};

// ============================================================================
// 훅: 내 스냅샷 히스토리 조회
// ============================================================================

/**
 * 내 포트폴리오 스냅샷 히스토리 (최근 N일)
 * @param days 조회할 일수 (기본 30일)
 */
export const useMySnapshots = (days: number = 30) => {
  return useQuery({
    queryKey: ['mySnapshots', days],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // N일 전 날짜 계산
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromDateStr = fromDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .gte('snapshot_date', fromDateStr)
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return (data || []) as PortfolioSnapshot[];
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
};

// ============================================================================
// 훅: 같은 구간 평균 수익률 비교
// ============================================================================

/**
 * 내 구간의 통계와 비교
 * @param bracket 자산 구간 코드 (bracket_0 ~ bracket_5)
 * @param days 조회할 일수 (기본 30일)
 */
export const useBracketComparison = (bracket: string, days: number = 30) => {
  return useQuery({
    queryKey: ['bracketComparison', bracket, days],
    queryFn: async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromDateStr = fromDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('bracket_performance')
        .select('*')
        .eq('bracket', bracket)
        .gte('stat_date', fromDateStr)
        .order('stat_date', { ascending: true });

      if (error) throw error;
      return (data || []) as BracketPerformance[];
    },
    enabled: !!bracket,
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// 유틸: 수익률 요약 계산
// ============================================================================

/**
 * 스냅샷 배열에서 기간 수익률 계산
 * (마지막 자산 - 첫 자산 - 순입금 합계) / 첫 자산 × 100
 */
export function calculatePeriodReturn(snapshots: PortfolioSnapshot[]): {
  returnRate: number;        // 기간 수익률 (%)
  totalGain: number;         // 절대 수익 금액
  startAssets: number;       // 시작 자산
  endAssets: number;         // 끝 자산
  totalNetDeposit: number;   // 기간 순입금 합계
} {
  if (snapshots.length < 2) {
    return { returnRate: 0, totalGain: 0, startAssets: 0, endAssets: 0, totalNetDeposit: 0 };
  }

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];

  // 기간 중 순입금 합계 (첫 날 제외 — 시작점은 기준이므로)
  const totalNetDeposit = snapshots
    .slice(1)
    .reduce((sum, s) => sum + (s.net_deposit_since_last || 0), 0);

  const startAssets = first.total_assets;
  const endAssets = last.total_assets;

  // 보정 수익률
  const returnRate = startAssets > 0
    ? ((endAssets - startAssets - totalNetDeposit) / startAssets) * 100
    : 0;

  return {
    returnRate: Math.round(returnRate * 100) / 100,
    totalGain: endAssets - startAssets - totalNetDeposit,
    startAssets,
    endAssets,
    totalNetDeposit,
  };
}

/**
 * 구간 통계에서 내 수익률의 백분위 추정
 * @returns 0~100 (100이면 1등)
 */
export function estimatePercentile(
  myReturnRate: number,
  bracketStats: BracketPerformance | null
): number {
  if (!bracketStats || bracketStats.user_count < 2) return 50;

  const { bottom_10_return_rate, avg_return_rate, top_10_return_rate } = bracketStats;

  // 선형 보간으로 백분위 추정
  if (myReturnRate <= bottom_10_return_rate) return 10;
  if (myReturnRate >= top_10_return_rate) return 90;

  if (myReturnRate <= avg_return_rate) {
    // 하위 10% ~ 평균 (10~50 구간)
    const ratio = (myReturnRate - bottom_10_return_rate) / (avg_return_rate - bottom_10_return_rate || 1);
    return Math.round(10 + ratio * 40);
  } else {
    // 평균 ~ 상위 10% (50~90 구간)
    const ratio = (myReturnRate - avg_return_rate) / (top_10_return_rate - avg_return_rate || 1);
    return Math.round(50 + ratio * 40);
  }
}

// ============================================================================
// 유틸: 자산 구간 결정 (클라이언트용)
// ============================================================================

/**
 * 총 자산 금액으로 자산 구간 코드 결정
 * Edge Function의 getAssetBracket과 동일 로직
 */
export function getAssetBracket(totalAssets: number): string {
  if (totalAssets < 100000000) return 'bracket_0';    // 1억 미만
  if (totalAssets < 300000000) return 'bracket_1';    // 1~3억
  if (totalAssets < 500000000) return 'bracket_2';    // 3~5억
  if (totalAssets < 1000000000) return 'bracket_3';   // 5~10억
  if (totalAssets < 3000000000) return 'bracket_4';   // 10~30억
  return 'bracket_5';                                  // 30억+
}

// ============================================================================
// 훅: 같은 구간 Panic Shield 점수 비교
// ============================================================================

/** 또래 비교 결과 */
export interface PeerPanicComparison {
  bracketLabel: string;
  avgScore: number;
  sampleCount: number;
}

/**
 * 같은 자산 구간의 Panic Shield 평균 점수 조회
 * bracket_performance 테이블에서 가장 최근 데이터 사용
 * @param bracket 자산 구간 코드 (bracket_0 ~ bracket_5)
 */
export const usePeerPanicScore = (bracket: string) => {
  return useQuery({
    queryKey: ['peerPanicScore', bracket],
    queryFn: async (): Promise<PeerPanicComparison | null> => {
      if (!bracket) return null;

      // 가장 최근 bracket_performance 조회 (panic_sample_count > 0)
      const { data, error } = await supabase
        .from('bracket_performance')
        .select('avg_panic_score, median_panic_score, panic_sample_count')
        .eq('bracket', bracket)
        .gt('panic_sample_count', 0)
        .order('stat_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data || data.panic_sample_count < 3) {
        // 통계적 유의성이 없으면 null
        return null;
      }

      const label = BRACKET_INFO[bracket]?.label || bracket;

      return {
        bracketLabel: label,
        avgScore: Math.round(data.avg_panic_score),
        sampleCount: data.panic_sample_count,
      };
    },
    enabled: !!bracket,
    staleTime: 10 * 60 * 1000, // 10분 캐시
  });
};
