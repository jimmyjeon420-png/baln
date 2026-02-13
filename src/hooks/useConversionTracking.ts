/**
 * useConversionTracking.ts - 전환 퍼널 추적 훅
 *
 * 역할: "마케팅 분석 부서 - 전환 퍼널 추적기"
 * 사용자가 온보딩 → 첫 참여 → 유료 전환까지의 경로를 추적합니다.
 *
 * 퍼널 단계:
 * 1. onboarding_start     — 온보딩 시작
 * 2. onboarding_complete   — 온보딩 완료
 * 3. first_prediction      — 첫 번째 예측 투표
 * 4. first_context_read    — 첫 번째 맥락 카드 열람
 * 5. first_share           — 첫 번째 공유
 * 6. premium_view          — 프리미엄 페이월 조회
 * 7. premium_purchase      — 프리미엄 구독 완료
 *
 * 핵심: 각 단계는 사용자 생애 1회만 기록됩니다.
 * AsyncStorage에 완료된 단계를 저장하여 중복 전송을 방지합니다.
 *
 * 사용법:
 * const { trackFunnelStep } = useConversionTracking();
 * trackFunnelStep('first_prediction', { pollId: '123' });
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../services/analyticsService';

/** 전환 퍼널 단계 타입 */
export type FunnelStep =
  | 'onboarding_start'
  | 'onboarding_complete'
  | 'first_prediction'
  | 'first_context_read'
  | 'first_share'
  | 'premium_view'
  | 'premium_purchase';

/** AsyncStorage 키 — 완료된 퍼널 단계 목록 저장 */
const STORAGE_KEY = '@baln:conversion_funnel_completed';

/**
 * 전환 퍼널 추적 훅
 *
 * 핵심 사용자 전환 경로의 각 단계를 기록합니다.
 * 각 단계는 사용자 생애 1회만 기록됩니다 (AsyncStorage로 중복 방지).
 * analyticsService의 trackEvent를 내부적으로 사용하므로
 * 별도의 Analytics 시스템을 만들지 않습니다.
 *
 * @returns trackFunnelStep - 퍼널 단계 기록 함수 (이미 완료된 단계는 자동 스킵)
 * @returns completedSteps - 현재까지 완료된 퍼널 단계 목록
 */
export function useConversionTracking() {
  const { user } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<Set<FunnelStep>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // 앱 시작 시 완료된 단계 복원
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as FunnelStep[];
          setCompletedSteps(new Set(parsed));
        }
      } catch {
        // 파싱 에러 → 무시 (빈 Set으로 시작)
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const trackFunnelStep = useCallback(
    async (step: FunnelStep, metadata?: Record<string, any>) => {
      // 아직 로딩 중이면 AsyncStorage에서 직접 확인 (안전 폴백)
      try {
        let alreadyCompleted: FunnelStep[];
        if (loaded) {
          // 메모리 캐시에서 확인
          if (completedSteps.has(step)) return;
          alreadyCompleted = Array.from(completedSteps);
        } else {
          // 아직 로드되지 않았으면 AsyncStorage에서 직접 확인
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          alreadyCompleted = stored ? JSON.parse(stored) : [];
          if (alreadyCompleted.includes(step)) return;
        }

        // 단계를 완료 목록에 추가
        const updated = [...alreadyCompleted, step];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setCompletedSteps(new Set(updated));

        // Analytics 이벤트 기록 (1회만)
        trackEvent(
          'conversion_funnel',
          {
            step,
            ...metadata,
          },
          user?.id,
        );
      } catch {
        // AsyncStorage 에러 → 앱 안정성 우선
      }
    },
    [user?.id, completedSteps, loaded],
  );

  return { trackFunnelStep, completedSteps };
}
