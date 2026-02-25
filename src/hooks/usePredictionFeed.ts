/**
 * usePredictionFeed — Polymarket 예측 시장 피드 훅
 *
 * 역할: 예측 시장 데이터 수집 부서
 * - ops_pm_predictions 테이블에서 카테고리별 예측 데이터 조회
 * - 거래량 기준 정렬 (높은 순)
 * - 카테고리 필터링 (stock/crypto/macro)
 * - 무한 스크롤 지원
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import supabase from '../services/supabase';

// ============================================================================
// 타입 정의
// ============================================================================

export type PredictionCategory = 'stock' | 'crypto' | 'macro';

export interface AiConsensus {
  direction: 'YES' | 'NO';
  confidence: number; // 0~100
  reasoning_ko: string;
}

export interface WhaleSignal {
  score: number;           // 0~100
  direction: 'YES' | 'NO' | 'MIXED';
  top_trades: Array<{
    side: string;
    outcome: string;
    size: number;
    price: number;
  }>;
  total_whale_volume: number;
}

export interface ImpactDetail {
  direction: 'up' | 'down' | 'neutral';
  magnitude: string;       // "+8~12%"
  reason_ko: string;
}

export interface PredictionItem {
  id: string;
  polymarket_id: string;
  question_ko: string;
  question_en: string;
  category: PredictionCategory;
  probability: number;           // 0~1
  probability_change_24h: number | null;
  volume_usd: number | null;
  volume_24h_usd: number | null;
  whale_signal: WhaleSignal | null;
  related_tickers: string[];
  impact_analysis: Record<string, ImpactDetail> | null;
  yes_label: string;
  no_label: string;
  summary_ko: string | null;
  end_date: string | null;
  slug: string | null;
  ai_consensus?: AiConsensus | null;
  updated_at: string;
  created_at: string;
}

// ============================================================================
// 상수
// ============================================================================

const PREDICTION_PAGE_SIZE = 20;

// ============================================================================
// 메인 훅: usePredictionFeed
// ============================================================================

export const usePredictionFeed = (category: PredictionCategory = 'stock') => {
  return useInfiniteQuery({
    queryKey: ['predictions', category],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('ops_pm_predictions')
        .select('*')
        .eq('category', category)
        .order('volume_24h_usd', { ascending: false, nullsFirst: false })
        .range(pageParam, pageParam + PREDICTION_PAGE_SIZE - 1);

      if (error) {
        throw new Error(error.message || '예측 데이터 조회에 실패했습니다.');
      }

      return (data || []) as PredictionItem[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PREDICTION_PAGE_SIZE) return undefined;
      return allPages.length * PREDICTION_PAGE_SIZE;
    },
    staleTime: 600000, // 10분 캐시 (3시간 갱신 주기에 맞게)
    refetchOnMount: true, // 탭 전환 시 최신 데이터 확인
  });
};

// ============================================================================
// 단일 예측 조회 (상세 화면용)
// ============================================================================

export const usePredictionDetail = (predictionId: string | null) => {
  return useQuery({
    queryKey: ['prediction', predictionId],
    queryFn: async () => {
      if (!predictionId) return null;
      const { data, error } = await supabase
        .from('ops_pm_predictions')
        .select('*')
        .eq('id', predictionId)
        .single();

      if (error) throw new Error(error.message);
      return data as PredictionItem;
    },
    enabled: !!predictionId,
    staleTime: 600000, // 10분 캐시
  });
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/** 확률을 퍼센트 문자열로 변환 */
export function formatProbability(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/** 확률 변동을 표시 문자열로 변환 (▲+5%, ▼-3%) */
export function formatProbabilityChange(change: number | null): string {
  if (change === null || change === undefined) return '';
  const pct = Math.round(change * 100);
  if (pct === 0) return '';
  const arrow = pct > 0 ? '▲' : '▼';
  const sign = pct > 0 ? '+' : '';
  return `${arrow}${sign}${pct}%`;
}

/** 거래량을 축약 표시 ($12.4M, $500K) */
export function formatVolume(volume: number | null): string {
  if (!volume || volume <= 0) return '$0';
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${Math.round(volume)}`;
}

/** 마감일까지 남은 시간 표시 */
export function getTimeUntilEnd(endDate: string | null): string {
  if (!endDate) return '';
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return '마감됨';

  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)}개월 후 마감`;
  if (days > 0) return `${days}일 후 마감`;
  if (hours > 0) return `${hours}시간 후 마감`;
  return '곧 마감';
}
