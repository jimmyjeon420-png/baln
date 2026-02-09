/**
 * usePushSetup.ts - 앱 시작 시 푸시 알림 초기화 훅
 *
 * 역할: "알림 시스템 부팅 담당"
 * - 앱 시작 시 Expo Push Token 획득 → Supabase에 저장
 * - 아침 맥락 카드 알림 예약 (매일 07:30)
 *
 * [사용 방법]
 * app/_layout.tsx의 AuthGate 안에서 호출하면 됩니다:
 *
 *   import { usePushSetup } from '../src/hooks/usePushSetup';
 *   // ... AuthGate 컴포넌트 안에서
 *   usePushSetup();
 *
 * [주의]
 * - 이 훅은 user가 로그인한 상태에서만 동작합니다
 * - 토큰 획득 실패 시 조용히 무시 (앱 크래시 방지)
 * - user.id가 변경될 때만 재실행 (불필요한 반복 방지)
 *
 * [흐름도]
 * 1. user 로그인 감지
 * 2. registerForPushNotifications() → 토큰 획득
 * 3. savePushToken(user.id, token) → DB 저장
 * 4. scheduleMorningBriefingNotification() → 아침 알림 예약
 */

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  registerForPushNotifications,
  savePushToken,
  scheduleMorningBriefingNotification,
} from '../services/pushNotificationService';

/**
 * 푸시 알림 초기화 훅
 *
 * [동작 순서]
 * 1. 유저가 로그인 상태인지 확인
 * 2. Push Token 획득 (권한 요청 포함)
 * 3. 토큰을 Supabase profiles 테이블에 저장 (서버 알림용)
 * 4. 아침 맥락 카드 알림 예약 (매일 07:30)
 *
 * [에러 처리]
 * - 토큰 획득 실패: 로그만 출력, 앱 정상 동작
 * - DB 저장 실패: 로그만 출력 (push_token 컬럼 미존재 가능)
 * - 알림 예약 실패: 로그만 출력
 */
export function usePushSetup() {
  const { user } = useAuth();

  useEffect(() => {
    // 로그인하지 않은 상태면 아무것도 하지 않음
    if (!user) return;

    const setup = async () => {
      try {
        // 1. Push Token 획득 및 저장
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(user.id, token);
        }

        // 2. 아침 맥락 카드 알림 예약 (매일 07:30)
        await scheduleMorningBriefingNotification();

        console.log('[PushSetup] 초기화 완료');
      } catch (error) {
        // 푸시 초기화 실패해도 앱은 정상 동작해야 함
        console.warn('[PushSetup] 초기화 실패 (앱 사용에 영향 없음):', error);
      }
    };

    setup();
  }, [user?.id]); // user.id가 변경될 때만 재실행
}
