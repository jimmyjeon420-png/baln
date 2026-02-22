/**
 * useKostolalyPhase — 코스톨라니 달걀 모형 현재 국면 조회 훅
 *
 * [역할]
 * Supabase kostolany_phases 테이블에서 is_current=true인 국면을 조회
 * 주 1회 Edge Function이 업데이트하므로 staleTime 1시간으로 설정
 */

import { useQuery } from '@tanstack/react-query';
import supabase from '../services/supabase';
import { KOSTOLANY_TARGETS, type KostolalyPhase, type AssetCategory } from '../services/rebalanceScore';

// ── 타입 ──

export interface KostolalyPhaseData {
  id: string;
  phase: KostolalyPhase;
  confidence: number;
  reasoning: string[];
  dalio_view: string | null;
  buffett_view: string | null;
  suggested_target: Record<AssetCategory, number>;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

// ── 쿼리 키 ──

export const KOSTOLANY_PHASE_KEY = ['kostolalyPhase', 'current'] as const;

// ── 훅 ──

/**
 * 현재 코스톨라니 국면 조회
 */
export function useKostolalyPhase() {
  const query = useQuery<KostolalyPhaseData | null>({
    queryKey: KOSTOLANY_PHASE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kostolany_phases')
        .select('*')
        .eq('is_current', true)
        .maybeSingle();

      if (error) {
        console.warn('[useKostolalyPhase] 조회 실패:', error.message);
        return null;
      }

      if (!data) return null;

      // reasoning이 string인 경우 파싱
      const reasoning: string[] = Array.isArray(data.reasoning)
        ? (data.reasoning as string[])
        : (typeof data.reasoning === 'string')
          ? JSON.parse(data.reasoning as string)
          : [];

      // suggested_target: DB 값 우선, 없으면 KOSTOLANY_TARGETS 기본값
      const phase = data.phase as KostolalyPhase;
      const suggested_target: Record<AssetCategory, number> =
        (data.suggested_target && typeof data.suggested_target === 'object')
          ? (data.suggested_target as Record<AssetCategory, number>)
          : KOSTOLANY_TARGETS[phase];

      return {
        ...data,
        phase,
        reasoning,
        suggested_target,
      } as KostolalyPhaseData;
    },
    staleTime: 60 * 60 * 1000,   // 1시간 (주 1회 업데이트)
    gcTime: 2 * 60 * 60 * 1000,  // 2시간 메모리 유지
    retry: 1,
  });

  const data = query.data ?? null;
  const phase = data?.phase ?? null;
  const target: Record<AssetCategory, number> | null =
    data?.suggested_target ?? (phase ? KOSTOLANY_TARGETS[phase] : null);

  return {
    ...query,
    /** 현재 국면 ('A'~'F' 또는 null) */
    phase,
    /** 추천 배분 목표 */
    target,
  };
}
