/**
 * usePushSetup.ts - 앱 시작 시 푸시 알림 초기화 훅
 *
 * 역할: "알림 시스템 부팅 담당"
 * - 앱 시작 시 Expo Push Token 획득 → Supabase에 저장
 * - 아침 맥락 카드 알림 예약 (매일 07:30)
 * - 스트릭 만료 경고 알림 예약 (매일 21:00 KST) — Task P2.1
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
 * [P1.1 알림 권한 요청 타이밍 조정]
 * - 신규 유저는 맥락 카드를 한 번이라도 읽기 전까지 권한 팝업 표시 안 함
 * - 맥락 카드를 읽으면 다른 코드에서 @baln:push_permission_eligible = 'true' 저장
 * - 이후 앱 재실행 시 이 훅이 해당 키를 확인하고 정상 권한 요청 진행
 *
 * [흐름도]
 * 1. user 로그인 감지
 * 2. @baln:push_permission_eligible 키 확인 → 없으면 권한 요청 건너뜀
 * 3. registerForPushNotifications() → 토큰 획득
 * 4. savePushToken(user.id, token) → DB 저장
 * 5. scheduleMorningBriefingNotification() → 아침 알림 예약
 * 6. scheduleStreakWarningNotification() → 스트릭 경고 알림 예약 (21:00 KST)
 */

import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import {
  registerForPushNotifications,
  savePushToken,
  scheduleMorningBriefingNotification,
  scheduleStreakWarningNotification,
} from '../services/pushNotificationService';

// AsyncStorage 키: 맥락 카드를 읽으면 다른 곳에서 이 키를 'true'로 설정
export const PUSH_PERMISSION_ELIGIBLE_KEY = '@baln:push_permission_eligible';

/**
 * 푸시 알림 초기화 훅
 *
 * [동작 순서]
 * 1. 유저가 로그인 상태인지 확인
 * 2. @baln:push_permission_eligible 키가 있는지 확인
 *    → 없으면 권한 요청/토큰 획득을 건너뜀 (신규 유저 배려)
 *    → 있으면 정상 진행
 * 3. Push Token 획득 (권한 요청 포함)
 * 4. 토큰을 Supabase profiles 테이블에 저장 (서버 알림용)
 * 5. 아침 맥락 카드 알림 예약 (매일 07:30)
 * 6. 스트릭 만료 경고 알림 예약 (매일 21:00 KST)
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
        // P1.1: 맥락 카드를 한 번이라도 읽었는지 확인
        // 읽기 전이면 권한 팝업을 띄우지 않음 (첫 방문 경험 보호)
        const eligible = await AsyncStorage.getItem(PUSH_PERMISSION_ELIGIBLE_KEY);
        if (eligible !== 'true') {
          if (__DEV__) console.log('[PushSetup] 맥락 카드 미읽음 → 권한 요청 건너뜀');
          // 권한 요청은 건너뛰지만, 스트릭 경고 알림은 예약해둠
          // (권한이 이미 granted 상태일 수 있으므로 예약만 시도)
          await scheduleStreakWarningNotification(user.id);
          return;
        }

        // 1. Push Token 획득 및 저장 (권한 요청 포함)
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(user.id, token);
        }

        // 2. 아침 맥락 카드 알림 예약 (매일 07:30)
        await scheduleMorningBriefingNotification();

        // 3. 스트릭 만료 경고 알림 예약 (매일 21:00 KST) — P2.1
        await scheduleStreakWarningNotification(user.id);

        console.log('[PushSetup] 초기화 완료');
      } catch (error) {
        // 푸시 초기화 실패해도 앱은 정상 동작해야 함
        console.warn('[PushSetup] 초기화 실패 (앱 사용에 영향 없음):', error);
      }
    };

    setup();
  }, [user?.id]); // user.id가 변경될 때만 재실행
}
