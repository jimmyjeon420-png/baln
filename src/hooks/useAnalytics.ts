/**
 * useAnalytics.ts - 화면 진입 시 자동 추적 훅
 *
 * 역할: 컴포넌트에서 쉽게 Analytics를 사용할 수 있도록
 *       React 훅으로 감싼 인터페이스입니다.
 *
 * 사용법:
 * 1) useScreenTracking('home') → 화면 진입 시 자동으로 screen_view 기록
 * 2) useTrackEvent() → 반환된 함수로 커스텀 이벤트 기록
 * 3) useAnalyticsInit() → 앱 시작 시 1회 호출 (로컬 백업 재전송)
 */

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  trackScreenView,
  trackEvent,
  retryLocalEvents,
} from '../services/analyticsService';

/**
 * 화면 조회 자동 추적 훅
 * 컴포넌트 마운트 시 screen_view 이벤트를 기록합니다.
 *
 * @param screenName - 화면 이름 (예: 'home', 'checkup', 'profile')
 *
 * @example
 * function HomeScreen() {
 *   useScreenTracking('home');
 *   return <View>...</View>;
 * }
 */
export function useScreenTracking(screenName: string): void {
  const { user } = useAuth();

  useEffect(() => {
    trackScreenView(screenName, user?.id);
  }, [screenName, user?.id]);
}

/**
 * 이벤트 추적 함수 반환 훅
 * 컴포넌트 내에서 사용자 액션(투표, 공유 등)을 기록할 때 사용합니다.
 *
 * @returns trackEvent 래퍼 함수 (userId 자동 주입)
 *
 * @example
 * function PollCard() {
 *   const track = useTrackEvent();
 *
 *   const handleVote = () => {
 *     track('prediction_vote', { pollId: '123', choice: 'YES' });
 *   };
 * }
 */
export function useTrackEvent(): (
  event: string,
  properties?: Record<string, any>
) => void {
  const { user } = useAuth();

  return (event: string, properties?: Record<string, any>) => {
    trackEvent(event, properties, user?.id);
  };
}

/**
 * Analytics 초기화 훅
 * 앱 루트(_layout.tsx)에서 1회 호출합니다.
 * → 이전에 전송 실패하여 로컬 저장된 이벤트를 재전송 시도
 *
 * @example
 * function RootLayout() {
 *   useAnalyticsInit();
 *   return <Slot />;
 * }
 */
export function useAnalyticsInit(): void {
  useEffect(() => {
    retryLocalEvents();
  }, []);
}
