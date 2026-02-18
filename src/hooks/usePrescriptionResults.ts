/**
 * usePrescriptionResults — 처방전 월별 결과 추적 훅 (P1-1)
 *
 * [역할]
 * - 이번 달 처방전 기록 생성 (없을 때 자동 초기화)
 * - 실행 완료 수 업데이트
 * - 지난달 결과 카드 표시용 데이터 반환
 *
 * [설계]
 * - month 키: "YYYY-MM" 형식
 * - health_score_start: 월 첫 저장 시 기록
 * - health_score_end: 매 조회 시 현재 점수로 업데이트
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
import type { KostolalyPhase } from '../services/rebalanceScore';

// ── 타입 ──

export interface PrescriptionResult {
  month: string;                  // "2026-02"
  phase: KostolalyPhase | null;
  actions_recommended: number;
  actions_completed: number;
  health_score_start: number | null;
  health_score_end: number | null;
}

// ── 유틸 ──

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getLastMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── 쿼리 키 ──

export const PRESCRIPTION_RESULTS_KEY = ['prescriptionResults'] as const;

// ── 이력 조회 ──

async function fetchPrescriptionResults(): Promise<PrescriptionResult[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const lastMonth = getLastMonth();
  const { data, error } = await supabase
    .from('prescription_results')
    .select('month, phase, actions_recommended, actions_completed, health_score_start, health_score_end')
    .eq('user_id', user.id)
    .gte('month', lastMonth)
    .order('month', { ascending: false })
    .limit(3);

  if (error) {
    console.warn('[usePrescriptionResults] 조회 실패:', error.message);
    return [];
  }

  return (data || []) as PrescriptionResult[];
}

// ── 이번 달 초기화 ──

async function initCurrentMonth(
  phase: KostolalyPhase | null,
  actionsCount: number,
  currentScore: number,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const month = getCurrentMonth();

  // 기존 레코드 확인
  const { data: existing } = await supabase
    .from('prescription_results')
    .select('id, health_score_start')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle();

  if (existing) {
    // 이미 있으면 health_score_end + actions_recommended 업데이트만
    await supabase
      .from('prescription_results')
      .update({
        actions_recommended: actionsCount,
        health_score_end: currentScore,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('month', month);
  } else {
    // 없으면 새로 생성
    await supabase
      .from('prescription_results')
      .insert({
        user_id: user.id,
        month,
        phase: phase || null,
        actions_recommended: actionsCount,
        actions_completed: 0,
        health_score_start: currentScore,
        health_score_end: currentScore,
      });
  }
}

// ── 실행 완료 수 동기화 ──

async function syncCompletedCount(completedCount: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const month = getCurrentMonth();
  await supabase
    .from('prescription_results')
    .update({ actions_completed: completedCount, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('month', month);
}

// ── 훅 ──

interface UsePrescriptionResultsOptions {
  currentPhase: KostolalyPhase | null;
  actionsCount: number;       // 이번 달 처방전 건 수
  completedCount: number;     // 현재까지 완료한 건 수
  currentScore: number;       // 현재 건강 점수
}

export function usePrescriptionResults({
  currentPhase,
  actionsCount,
  completedCount,
  currentScore,
}: UsePrescriptionResultsOptions) {
  const queryClient = useQueryClient();

  // 이력 조회
  const { data: results = [] } = useQuery<PrescriptionResult[]>({
    queryKey: PRESCRIPTION_RESULTS_KEY,
    queryFn: fetchPrescriptionResults,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  // 초기화 뮤테이션
  const { mutate: initMonth } = useMutation({
    mutationFn: () => initCurrentMonth(currentPhase, actionsCount, currentScore),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRESCRIPTION_RESULTS_KEY }),
  });

  // 완료 수 동기화 뮤테이션
  const { mutate: syncCompleted } = useMutation({
    mutationFn: () => syncCompletedCount(completedCount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRESCRIPTION_RESULTS_KEY }),
  });

  // 마운트 시 이번 달 초기화
  useEffect(() => {
    if (actionsCount > 0 && currentScore > 0) {
      initMonth();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 완료 수 변경 시 동기화
  const syncCompletedCallback = useCallback(() => {
    if (completedCount >= 0) syncCompleted();
  }, [completedCount, syncCompleted]);

  // 지난달 결과
  const lastMonth = getLastMonth();
  const lastMonthResult = results.find(r => r.month === lastMonth) ?? null;

  // 이번 달 결과
  const currentMonth = getCurrentMonth();
  const currentMonthResult = results.find(r => r.month === currentMonth) ?? null;

  // 적중률 (지난달)
  const lastMonthRate = lastMonthResult && lastMonthResult.actions_recommended > 0
    ? Math.round((lastMonthResult.actions_completed / lastMonthResult.actions_recommended) * 100)
    : null;

  // 건강 점수 변화 (지난달)
  const lastMonthScoreChange = lastMonthResult
    && lastMonthResult.health_score_start != null
    && lastMonthResult.health_score_end != null
    ? lastMonthResult.health_score_end - lastMonthResult.health_score_start
    : null;

  return {
    results,
    lastMonthResult,
    currentMonthResult,
    lastMonthRate,
    lastMonthScoreChange,
    syncCompleted: syncCompletedCallback,
  };
}
