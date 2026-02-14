/**
 * usePredictionNotification.ts - 예측 결과 푸시 알림 훅
 *
 * 역할: "예측 결과 알림 부서"
 * - 매일 08:00에 "어제 예측 결과가 나왔어요!" 로컬 푸시 알림 예약
 * - expo-notifications의 scheduleNotificationAsync 사용
 * - 알림 탭하면 오늘 탭(index.tsx)으로 이동
 * - 하루 1회만 (AsyncStorage로 날짜 추적, 중복 예약 방지)
 *
 * [사용처]
 * - 오늘 탭 또는 _layout.tsx에서 useEffect로 한 번 호출
 */

import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// 스토리지 키
// ============================================================================

const PREDICTION_NOTIFICATION_KEY = '@baln:prediction_notification_date';

// 알림 식별자 (취소/재예약용)
const NOTIFICATION_ID = 'prediction-daily-result';

// ============================================================================
// 훅
// ============================================================================

/**
 * 예측 결과 알림 훅
 *
 * [흐름]
 * 1. 마운트 시 오늘 이미 예약했는지 AsyncStorage 확인
 * 2. 아직이면 → 기존 예약 취소 후 새 알림 예약 (매일 08:00)
 * 3. 예약 완료 → AsyncStorage에 오늘 날짜 저장
 */
export function usePredictionNotification() {
  useEffect(() => {
    schedulePredictionResultNotification().catch((err) => {
      console.warn('[예측 알림] 예약 실패:', err);
    });
  }, []);
}

// ============================================================================
// 알림 예약 로직
// ============================================================================

/**
 * 매일 08:00 예측 결과 알림 예약
 * - 하루 1회만 예약 (중복 방지)
 * - 기존 예약이 있으면 취소 후 재예약
 */
async function schedulePredictionResultNotification(): Promise<void> {
  try {
    // 1) 오늘 이미 예약했는지 확인
    const lastScheduledDate = await AsyncStorage.getItem(PREDICTION_NOTIFICATION_KEY);
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    if (lastScheduledDate === today) {
      // 오늘 이미 예약함 → skip
      return;
    }

    // 2) 알림 권한 확인
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      if (__DEV__) console.log('[예측 알림] 권한 없음, skip');
      return;
    }

    // 3) 기존 예약된 알림 취소 (동일 ID)
    try {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    } catch {
      // 기존 예약이 없으면 에러 발생 가능 → 무시
    }

    // 4) 매일 08:00 알림 예약
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: '📊 어제 예측 결과 발표!',
        body: '투표한 질문들의 결과를 확인하세요. 적중하면 크레딧 보상!',
        data: { screen: '/(tabs)' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });

    // 5) 오늘 날짜 저장 (중복 방지)
    await AsyncStorage.setItem(PREDICTION_NOTIFICATION_KEY, today);

    if (__DEV__) console.log('[예측 알림] 매일 08:00 알림 예약 완료');
  } catch (err) {
    console.warn('[예측 알림] 예약 에러:', err);
    throw err;
  }
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 예측 알림 예약 초기화 (테스트용)
 */
export async function resetPredictionNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    await AsyncStorage.removeItem(PREDICTION_NOTIFICATION_KEY);
    if (__DEV__) console.log('[예측 알림] 예약 초기화 완료');
  } catch (err) {
    console.error('[예측 알림] 초기화 에러:', err);
  }
}
