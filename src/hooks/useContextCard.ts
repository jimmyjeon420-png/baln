/**
 * useContextCard - 맥락 카드 전용 훅
 *
 * [역할]
 * 오늘의 맥락 카드를 조회하고, 유저별 포트폴리오 영향도를 병합
 * Central Kitchen 패턴: DB only (< 100ms), 라이브 폴백 없음
 *
 * [개선 사항 - 2026-02-13]
 * 1. AsyncStorage 캐시: 앱 재시작 시 이전 카드를 즉시 표시 후 백그라운드 갱신
 * 2. 정적 폴백: DB도 캐시도 없으면 투자 원칙 교육 카드 표시
 * 3. 데이터 신선도: isStale(6시간), lastUpdated 타임스탬프 제공
 * 4. 지수 백오프 재시도: 1초, 3초 간격으로 2회 재시도
 * 5. freshnessLabel: "어제의 분석" 등 날짜 라벨 자동 계산
 *
 * [캐시 전략]
 * - React Query staleTime: 5분 (TanStack Query 인메모리 캐시)
 * - AsyncStorage: 앱 종료 후에도 유지 (마지막 성공 카드)
 * - Pull-to-refresh 시에만 강제 갱신
 *
 * [사용처]
 * - 홈 탭 (오늘 탭): 맥락 카드 중심 UI
 * - 예측 게임: 복기 시 어제/그저께 맥락 카드 표시
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import supabase, { getCurrentUser } from '../services/supabase';
import {
  getTodayContextCard,
  getRecentContextCards,
  getQuickContextSentiment,
  getCachedCard,
  setCachedCard,
  getCachedCardTimestamp,
  isCardStale,
  getCardFreshnessLabel,
  formatCardUpdateTime,
  FALLBACK_CONTEXT_CARD,
  type ContextCardWithImpact,
  type ContextCardSentiment,
} from '../services/contextCardService';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

// ============================================================================
// 쿼리 키 (외부에서 invalidate 할 때 사용)
// ============================================================================

export const CONTEXT_CARD_TODAY_KEY = ['contextCard', 'today'];
export const CONTEXT_CARDS_RECENT_KEY = (days: number) => ['contextCards', 'recent', days];
export const CONTEXT_SENTIMENT_KEY = ['contextCard', 'sentiment'];

// ============================================================================
// 설정 상수
// ============================================================================

/** 데이터 신선도 기준: 이 시간(시) 이상 오래되면 stale로 판단 */
const STALE_THRESHOLD_HOURS = 4;

/** 기본 재시도 횟수 */
const DEFAULT_RETRY_COUNT = 2;

// ============================================================================
// 훅: 오늘의 맥락 카드
// ============================================================================

/**
 * 오늘의 맥락 카드 + 유저 영향도 조회
 *
 * 개선된 동작:
 * 1. 앱 실행 시 AsyncStorage 캐시를 먼저 읽어 즉시 표시
 * 2. 백그라운드로 DB에서 최신 데이터 fetch
 * 3. DB 실패 시 캐시 유지, 캐시도 없으면 정적 폴백 카드 표시
 * 4. 데이터 신선도(isStale, freshnessLabel) 정보 제공
 *
 * @param options.retryCount - 재시도 횟수 (기본 2)
 * @returns {
 *   data: ContextCardWithImpact | null,
 *   isLoading: boolean,
 *   isError: boolean,
 *   error: Error | null,
 *   refetch: () => void,
 *   isEmpty: boolean,          // 의미 있는 데이터가 없는 상태 (폴백 표시 중)
 *   isStale: boolean,          // 6시간 이상 오래된 데이터
 *   isFallback: boolean,       // 정적 폴백 카드를 표시 중
 *   lastUpdated: number | null, // 마지막 성공적 fetch 시각 (ms)
 *   freshnessLabel: string | null, // "어제의 분석" 등 날짜 라벨
 *   effectiveData: ContextCardWithImpact, // 항상 non-null (폴백 포함)
 * }
 */
export function useContextCard(options?: { retryCount?: number }) {
  const retryCount = options?.retryCount ?? DEFAULT_RETRY_COUNT;

  // AsyncStorage 캐시 상태
  const [cachedData, setCachedData] = useState<ContextCardWithImpact | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const isCacheLoaded = useRef(false);
  const isCacheLoading = useRef(false);

  // 앱 실행 시 캐시를 한 번만 로드 (race condition 방지: 이중 guard)
  useEffect(() => {
    if (isCacheLoaded.current || isCacheLoading.current) return;
    isCacheLoading.current = true;

    (async () => {
      try {
        const [cached, timestamp] = await Promise.all([
          getCachedCard(),
          getCachedCardTimestamp(),
        ]);
        if (cached) {
          setCachedData(cached);
        }
        if (timestamp) {
          setLastUpdated(timestamp);
        }
      } finally {
        isCacheLoaded.current = true;
        isCacheLoading.current = false;
      }
    })();
  }, []);

  const query = useQuery<ContextCardWithImpact | null>({
    queryKey: CONTEXT_CARD_TODAY_KEY,
    queryFn: async () => {
      // 1. 현재 로그인 유저 확인
      const user = await getCurrentUser();
      if (!user) {
        console.log('[맥락 카드 훅] 로그인 필요');
        return null;
      }

      // 2. 오늘의 맥락 카드 조회
      const result = await getTodayContextCard(user.id);

      // 3. 성공 시 캐시 업데이트
      if (result) {
        setCachedData(result);
        const now = Date.now();
        setLastUpdated(now);
        // AsyncStorage 캐시도 서비스 레이어에서 이미 저장됨
      }

      return result;
    },
    staleTime: 3 * 60 * 1000, // 3분 (하루 3회 업데이트이므로 짧은 캐시)
    gcTime: 30 * 60 * 1000,   // 30분 동안 메모리 유지

    // 지수 백오프 재시도: 1초, 3초 간격
    retry: retryCount,
    retryDelay: (attemptIndex) => {
      // attemptIndex: 0 -> 1000ms, 1 -> 3000ms
      const delays = [1000, 3000, 5000];
      return delays[attemptIndex] ?? 5000;
    },

    // 캐시 데이터가 있으면 placeholder로 사용 (로딩 시 빈 화면 방지)
    placeholderData: cachedData ?? undefined,
  });

  // ── 데이터 상태 계산 ──

  // DB/네트워크에서 가져온 최신 데이터
  const freshData = query.data;

  // 실제로 사용자에게 보여줄 데이터: 최신 > 캐시 > 폴백
  const effectiveData: ContextCardWithImpact =
    freshData ?? cachedData ?? FALLBACK_CONTEXT_CARD;

  // 정적 폴백 카드를 표시 중인지
  const isFallback = !freshData && !cachedData;

  // 로딩 완료했지만 맥락 카드 데이터가 없는 상태 (DB에 카드 미생성, 캐시도 없음)
  const isEmpty = !query.isLoading && !freshData && !cachedData;

  // 데이터 신선도 체크: 카드 날짜 기준 6시간 이상 오래됨
  const isStale = effectiveData
    ? isCardStale(effectiveData.card.created_at, STALE_THRESHOLD_HOURS)
    : false;

  // 날짜 라벨: "어제의 분석" 등
  const freshnessLabel = effectiveData
    ? getCardFreshnessLabel(effectiveData.card.date)
    : null;

  return {
    ...query,
    /** 로딩 완료했지만 맥락 카드 데이터가 없는 상태 (DB에 카드 미생성) */
    isEmpty,
    /** 4시간 이상 오래된 데이터 */
    isStale,
    /** 정적 폴백 카드를 표시 중 (DB도 캐시도 없음) */
    isFallback,
    /** 마지막 성공적 데이터 fetch 시각 (ms timestamp) */
    lastUpdated,
    /** "어제의 분석" 등 날짜 기반 신선도 라벨 (오늘이면 null) */
    freshnessLabel,
    /** 항상 non-null인 데이터 (최신 > 캐시 > 정적 폴백 순) */
    effectiveData,
    /** "오전 6:03 업데이트" 형식의 시점 라벨 */
    updateTimeLabel: effectiveData?.card?.created_at
      ? formatCardUpdateTime(effectiveData.card.created_at)
      : null,
    /** 현재 카드의 시간대 */
    timeSlot: (effectiveData?.card as any)?.time_slot as string | undefined,
  };
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
      const user = await getCurrentUser();
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

// ============================================================================
// 훅: 맥락 카드 공유 (인스타/SNS)
// ============================================================================

/**
 * 맥락 카드 공유 mutation
 *
 * [역할]
 * - 맥락 카드 컴포넌트를 스크린샷으로 캡처
 * - 인스타그램/SNS 공유 다이얼로그 실행
 * - MAU 성장 보상 시스템과 연동
 *
 * [사용법]
 * ```tsx
 * const shareCard = useShareContextCard();
 * const cardRef = useRef(null);
 *
 * <View ref={cardRef}>
 *   <ContextCard ... />
 * </View>
 *
 * <Button onPress={() => shareCard.mutate({ viewRef: cardRef.current })} />
 * ```
 *
 * @returns {
 *   mutate: (params: { viewRef: any }) => void,
 *   isLoading: boolean,
 *   isError: boolean,
 *   error: Error | null
 * }
 */
export function useShareContextCard() {
  return useMutation({
    mutationFn: async ({ viewRef }: { viewRef: any }) => {
      if (!viewRef) throw new Error('뷰 참조가 없습니다');

      // 1. 스크린샷 캡처
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
      });

      // 2. 공유 다이얼로그
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('공유 기능을 사용할 수 없습니다');
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'baln 맥락 카드 공유',
      });

      return { success: true };
    },
  });
}
