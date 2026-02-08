/**
 * useContextCard - 맥락 카드 전용 훅
 *
 * [역할]
 * 오늘의 맥락 카드를 조회하고, 유저별 포트폴리오 영향도를 병합
 * Central Kitchen 패턴: DB only (< 100ms), 라이브 폴백 없음
 *
 * [캐시 전략]
 * - staleTime: 5분 → 자주 갱신할 필요 없음 (하루 1회 Edge Function 생성)
 * - Pull-to-refresh 시에만 강제 갱신
 *
 * [사용처]
 * - 홈 탭 (오늘 탭): 맥락 카드 중심 UI
 * - 예측 게임: 복기 시 어제/그저께 맥락 카드 표시
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
import {
  getTodayContextCard,
  getRecentContextCards,
  getQuickContextSentiment,
  type ContextCardWithImpact,
  type ContextCardSentiment,
} from '../services/contextCardService';

// ============================================================================
// 쿼리 키 (외부에서 invalidate 할 때 사용)
// ============================================================================

export const CONTEXT_CARD_TODAY_KEY = ['contextCard', 'today'];
export const CONTEXT_CARDS_RECENT_KEY = (days: number) => ['contextCards', 'recent', days];
export const CONTEXT_SENTIMENT_KEY = ['contextCard', 'sentiment'];

// ============================================================================
// 훅: 오늘의 맥락 카드
// ============================================================================

/**
 * 오늘의 맥락 카드 + 유저 영향도 조회
 *
 * @returns {
 *   data: ContextCardWithImpact | null,
 *   isLoading: boolean,
 *   isError: boolean,
 *   error: Error | null,
 *   refetch: () => void
 * }
 */
export function useContextCard() {
  return useQuery<ContextCardWithImpact | null>({
    queryKey: CONTEXT_CARD_TODAY_KEY,
    queryFn: async () => {
      // 1. 현재 로그인 유저 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[맥락 카드 훅] 로그인 필요');
        return null;
      }

      // 2. 오늘의 맥락 카드 조회
      const result = await getTodayContextCard(user.id);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5분 (Edge Function이 매일 07:00에 1회 생성하므로 자주 갱신 불필요)
    gcTime: 30 * 60 * 1000,   // 30분 동안 메모리 유지
    retry: 1,                 // 실패 시 1번만 재시도 (DB 조회 실패는 빠르게 포기)
  });
}

// ============================================================================
// 훅: 최근 N일 맥락 카드 목록
// ============================================================================

/**
 * 최근 N일 맥락 카드 목록 조회 (유저 영향도 포함)
 *
 * 사용처:
 *   - 예측 복기: 어제/그저께 카드와 내 예측 비교
 *   - 트렌드 분석: 최근 7일 맥락 히스토리
 *
 * @param days - 조회할 일수 (기본 7일)
 * @returns {
 *   data: ContextCardWithImpact[],
 *   isLoading: boolean,
 *   isError: boolean,
 *   error: Error | null,
 *   refetch: () => void
 * }
 */
export function useRecentContextCards(days: number = 7) {
  return useQuery<ContextCardWithImpact[]>({
    queryKey: CONTEXT_CARDS_RECENT_KEY(days),
    queryFn: async () => {
      // 1. 현재 로그인 유저 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[맥락 카드 훅] 로그인 필요 (최근 카드)');
        return [];
      }

      // 2. 최근 N일 카드 조회
      const results = await getRecentContextCards(user.id, days);
      return results;
    },
    staleTime: 10 * 60 * 1000, // 10분 (과거 데이터는 변하지 않으므로 긴 캐시)
    gcTime: 60 * 60 * 1000,    // 1시간 동안 메모리 유지
    retry: 1,
    enabled: days > 0,         // days가 0 이하면 비활성화
  });
}

// ============================================================================
// 훅: 빠른 심리 상태 조회 (위젯/배지용)
// ============================================================================

/**
 * 오늘의 심리 상태만 빠르게 조회 (< 50ms)
 *
 * 사용처:
 *   - 탭바 배지: calm(초록), caution(오렌지), alert(빨강)
 *   - 위젯: 심리 상태 이모티콘 표시
 *
 * @returns {
 *   data: { sentiment, headline } | null,
 *   isLoading: boolean,
 *   isError: boolean
 * }
 */
export function useQuickContextSentiment() {
  return useQuery<{ sentiment: ContextCardSentiment; headline: string } | null>({
    queryKey: CONTEXT_SENTIMENT_KEY,
    queryFn: getQuickContextSentiment,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000,   // 30분
    retry: 1,
  });
}

// ============================================================================
// 유틸: 맥락 카드 캐시 무효화
// ============================================================================

/**
 * 맥락 카드 캐시 무효화 (Pull-to-refresh용)
 *
 * 사용 예:
 * ```ts
 * const queryClient = useQueryClient();
 * const handleRefresh = async () => {
 *   await invalidateContextCardCache(queryClient);
 * };
 * ```
 */
export function invalidateContextCardCache(queryClient: any) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: CONTEXT_CARD_TODAY_KEY }),
    queryClient.invalidateQueries({ queryKey: ['contextCards'] }), // recent 포함
    queryClient.invalidateQueries({ queryKey: CONTEXT_SENTIMENT_KEY }),
  ]);
}
