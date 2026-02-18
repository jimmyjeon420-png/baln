/**
 * useHealthScoreHistory — 건강 점수 이력 훅 (P1-2)
 *
 * [역할]
 * - 오늘 건강 점수를 Supabase에 upsert (일 1회)
 * - 최근 14일간 이력 조회 → 스파크라인 데이터 반환
 *
 * [설계]
 * - 하루에 한 번만 저장 (UNIQUE: user_id + snapshot_date)
 * - staleTime 30분: 앱 재시작 시 재저장 방지
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';

// ── 타입 ──

export interface HealthScoreRecord {
  snapshot_date: string; // "2026-02-19"
  score: number;
  grade: string | null;
}

// ── 쿼리 키 ──

export const HEALTH_HISTORY_KEY = ['healthScoreHistory'] as const;

// ── 저장 함수 ──

async function saveHealthScoreToSupabase(score: number, grade: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  const { error } = await supabase
    .from('health_score_history')
    .upsert(
      { user_id: user.id, score, grade, snapshot_date: today },
      { onConflict: 'user_id,snapshot_date' }
    );

  if (error) {
    console.warn('[useHealthScoreHistory] 저장 실패:', error.message);
  }
}

// ── 이력 조회 함수 ──

async function fetchHealthScoreHistory(days: number = 14): Promise<HealthScoreRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('health_score_history')
    .select('snapshot_date, score, grade')
    .eq('user_id', user.id)
    .gte('snapshot_date', fromStr)
    .order('snapshot_date', { ascending: true });

  if (error) {
    console.warn('[useHealthScoreHistory] 조회 실패:', error.message);
    return [];
  }

  return (data || []) as HealthScoreRecord[];
}

// ── 훅 ──

/**
 * @param currentScore - 현재 건강 점수 (저장 트리거용)
 * @param currentGrade - 현재 등급
 */
export function useHealthScoreHistory(currentScore: number, currentGrade: string) {
  const queryClient = useQueryClient();

  // 이력 조회
  const { data: history = [] } = useQuery<HealthScoreRecord[]>({
    queryKey: HEALTH_HISTORY_KEY,
    queryFn: () => fetchHealthScoreHistory(14),
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000,    // 1시간
    retry: 1,
  });

  // 오늘 점수 저장 (upsert)
  const { mutate: saveScore } = useMutation({
    mutationFn: () => saveHealthScoreToSupabase(currentScore, currentGrade),
    onSuccess: () => {
      // 저장 후 이력 새로고침
      queryClient.invalidateQueries({ queryKey: HEALTH_HISTORY_KEY });
    },
  });

  // 마운트 시 한 번 저장 (유효한 점수일 때만)
  useEffect(() => {
    if (currentScore > 0) {
      saveScore();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 스파크라인용 데이터 가공
  const sparklineData = history.map(r => r.score);
  const sparklineLabels = history.map(r => {
    const d = new Date(r.snapshot_date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  // 추이 방향 (최근 7일 기준)
  const recent = history.slice(-7);
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (recent.length >= 2) {
    const first = recent[0].score;
    const last = recent[recent.length - 1].score;
    if (last - first >= 3) trend = 'up';
    else if (first - last >= 3) trend = 'down';
  }

  return {
    history,
    sparklineData,
    sparklineLabels,
    trend,
    hasHistory: sparklineData.length >= 2,
  };
}
