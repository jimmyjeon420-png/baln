/**
 * useExecutions - 리밸런싱 실행 기록 훅
 *
 * 비유: "매매 일지 관리자" — AI 제안을 실행했을 때 기록하고 조회
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
import type { RebalanceExecution, ExecutionInput } from '../types/rebalanceExecution';

export const EXECUTIONS_KEY = ['rebalance-executions'];

// ── 내 실행 기록 조회 (최근 30일) ──

async function fetchMyExecutions(days = 30): Promise<RebalanceExecution[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('rebalance_executions')
    .select('*')
    .eq('user_id', user.id)
    .gte('prescription_date', cutoffStr)
    .order('executed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function useMyExecutions(days = 30) {
  return useQuery({
    queryKey: [...EXECUTIONS_KEY, days],
    queryFn: () => fetchMyExecutions(days),
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 15,
    retry: 1,
  });
}

// ── 특정 날짜 + 티커 실행 기록 조회 ──

async function fetchExecution(date: string, ticker: string): Promise<RebalanceExecution | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('rebalance_executions')
    .select('*')
    .eq('user_id', user.id)
    .eq('prescription_date', date)
    .eq('action_ticker', ticker)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useExecution(date: string, ticker: string) {
  return useQuery({
    queryKey: [...EXECUTIONS_KEY, date, ticker],
    queryFn: () => fetchExecution(date, ticker),
    enabled: !!date && !!ticker,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

// ── 실행 기록 저장 (RPC) ──

async function saveExecution(input: ExecutionInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_rebalance_execution', {
    p_prescription_date: input.prescription_date,
    p_action_ticker: input.action_ticker,
    p_action_name: input.action_name,
    p_action_type: input.action_type,
    p_suggested_price: input.suggested_price,
    p_suggested_qty: input.suggested_qty,
    p_executed_at: input.executed_at.toISOString(),
    p_executed_price: input.executed_price,
    p_executed_qty: input.executed_qty,
    p_execution_note: input.execution_note || null,
  });

  if (error) throw error;
  return data; // UUID
}

export function useSaveExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveExecution,
    onSuccess: () => {
      // 캐시 무효화 → 히스토리 화면 자동 갱신
      queryClient.invalidateQueries({ queryKey: EXECUTIONS_KEY });
    },
  });
}

// ── 실행 통계 (요약) ──

export interface ExecutionStats {
  total: number;
  buy: number;
  sell: number;
  gainers: number; // 수익 난 건수
  losers: number;  // 손실 난 건수
}

export function useExecutionStats(): ExecutionStats {
  const { data: executions } = useMyExecutions(90); // 최근 90일

  if (!executions || executions.length === 0) {
    return { total: 0, buy: 0, sell: 0, gainers: 0, losers: 0 };
  }

  const stats = executions.reduce((acc, ex) => {
    acc.total++;
    if (ex.action_type === 'BUY') acc.buy++;
    if (ex.action_type === 'SELL') acc.sell++;
    if (ex.result_gain_pct && ex.result_gain_pct > 0) acc.gainers++;
    if (ex.result_gain_pct && ex.result_gain_pct < 0) acc.losers++;
    return acc;
  }, { total: 0, buy: 0, sell: 0, gainers: 0, losers: 0 });

  return stats;
}
