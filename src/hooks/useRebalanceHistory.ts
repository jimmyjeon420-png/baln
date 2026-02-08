/**
 * useRebalanceHistory - 처방전 히스토리 훅
 *
 * 비유: "진료 기록부" — 과거 AI 제안 vs 실제 실행 vs 결과 비교
 */

import { useQuery } from '@tanstack/react-query';
import supabase from '../services/supabase';
import type { MorningBriefingResult, RiskAnalysisResult } from '../services/gemini';
import type { RebalanceExecution } from '../types/rebalanceExecution';

export const HISTORY_KEY = ['rebalance-history'];

export interface PrescriptionHistoryItem {
  date: string; // YYYY-MM-DD
  prescription: {
    morningBriefing: MorningBriefingResult | null;
    riskAnalysis: RiskAnalysisResult | null;
    source: string;
  };
  executions: RebalanceExecution[];
  // 통계
  stats: {
    totalActions: number;     // AI가 제안한 액션 수
    executedActions: number;  // 실제 실행한 액션 수
    executionRate: number;    // 실행률 (%)
  };
}

/**
 * 처방전 히스토리 조회 (최근 N일)
 */
async function fetchHistory(days = 30): Promise<PrescriptionHistoryItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // 1) 처방전 조회
  const { data: prescriptions, error: prescError } = await supabase
    .from('user_daily_prescriptions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', cutoffStr)
    .order('date', { ascending: false });

  if (prescError) throw prescError;

  // 2) 실행 기록 조회
  const { data: executions, error: execError } = await supabase
    .from('rebalance_executions')
    .select('*')
    .eq('user_id', user.id)
    .gte('prescription_date', cutoffStr)
    .order('executed_at', { ascending: false });

  if (execError) throw execError;

  // 3) 날짜별로 그룹화
  const grouped: Record<string, PrescriptionHistoryItem> = {};

  // 처방전 먼저
  for (const presc of prescriptions || []) {
    grouped[presc.date] = {
      date: presc.date,
      prescription: {
        morningBriefing: presc.morning_briefing,
        riskAnalysis: presc.risk_analysis,
        source: presc.source || 'unknown',
      },
      executions: [],
      stats: {
        totalActions: presc.morning_briefing?.portfolioActions?.length || 0,
        executedActions: 0,
        executionRate: 0,
      },
    };
  }

  // 실행 기록 추가
  for (const exec of executions || []) {
    const dateKey = exec.prescription_date;
    if (!grouped[dateKey]) {
      // 처방전 없이 실행만 있는 경우 (드물지만 가능)
      grouped[dateKey] = {
        date: dateKey,
        prescription: {
          morningBriefing: null,
          riskAnalysis: null,
          source: 'no-prescription',
        },
        executions: [],
        stats: { totalActions: 0, executedActions: 0, executionRate: 0 },
      };
    }
    grouped[dateKey].executions.push(exec);
    grouped[dateKey].stats.executedActions++;
  }

  // 실행률 계산
  for (const item of Object.values(grouped)) {
    if (item.stats.totalActions > 0) {
      item.stats.executionRate = (item.stats.executedActions / item.stats.totalActions) * 100;
    }
  }

  // 날짜순 정렬 (최신 → 과거)
  return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
}

export function useRebalanceHistory(days = 30) {
  return useQuery({
    queryKey: [...HISTORY_KEY, days],
    queryFn: () => fetchHistory(days),
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });
}

/**
 * 전체 통계 (요약)
 */
export interface OverallStats {
  totalDays: number;          // 처방전 받은 일수
  totalActions: number;       // 총 제안 액션 수
  totalExecutions: number;    // 총 실행 수
  overallExecutionRate: number; // 전체 실행률 (%)
  profitableCount: number;    // 수익 난 실행 수
  lossMakingCount: number;    // 손실 난 실행 수
}

export function useOverallStats(days = 90): OverallStats {
  const { data: history } = useRebalanceHistory(days);

  if (!history || history.length === 0) {
    return {
      totalDays: 0,
      totalActions: 0,
      totalExecutions: 0,
      overallExecutionRate: 0,
      profitableCount: 0,
      lossMakingCount: 0,
    };
  }

  const stats = history.reduce((acc, item) => {
    acc.totalDays++;
    acc.totalActions += item.stats.totalActions;
    acc.totalExecutions += item.stats.executedActions;
    for (const exec of item.executions) {
      if (exec.result_gain_pct && exec.result_gain_pct > 0) acc.profitableCount++;
      if (exec.result_gain_pct && exec.result_gain_pct < 0) acc.lossMakingCount++;
    }
    return acc;
  }, {
    totalDays: 0,
    totalActions: 0,
    totalExecutions: 0,
    profitableCount: 0,
    lossMakingCount: 0,
  });

  const overallExecutionRate = stats.totalActions > 0
    ? (stats.totalExecutions / stats.totalActions) * 100
    : 0;

  return { ...stats, overallExecutionRate };
}
