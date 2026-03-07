/**
 * predictionNotifications.ts - 투자 예측 게임 푸시 알림
 *
 * 역할: "예측 게임 알림 부서"
 * - 오늘의 질문 알림 (09:00)
 * - 정답 판정 알림 (익일 08:00)
 * - 연속 적중 축하 알림
 * - 권한 요청 graceful handling
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '../locales';

// ============================================================================
// 알림 채널 설정 (Android)
// ============================================================================

const PREDICTION_CHANNEL_ID = 'baln_prediction_game';

export async function setupPredictionNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(PREDICTION_CHANNEL_ID, {
      name: '투자 예측 알림',
      description: '매일 예측 질문과 결과 알림을 받습니다',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });
  }
}

// ============================================================================
// 권한 요청 (Graceful Handling)
// ============================================================================

/**
 * 푸시 알림 권한 요청 (거부 시에도 앱 동작 유지)
 * @returns 권한 허용 여부
 */
export async function requestPredictionNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // 아직 권한을 묻지 않았으면 요청
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // 권한 거부 시 조용히 실패 (앱 동작은 계속)
    if (finalStatus !== 'granted') {
      if (__DEV__) console.log('[predictionNotifications] 알림 권한 거부됨 (앱 동작 유지)');
      return false;
    }

    // 채널 설정
    await setupPredictionNotificationChannel();

    return true;
  } catch (error) {
    console.error('[predictionNotifications] 권한 요청 실패:', error);
    return false;
  }
}

// ============================================================================
// 알림 스케줄링
// ============================================================================

/**
 * 오늘의 예측 질문 알림 (매일 09:00)
 */
export async function scheduleDailyPredictionNotification(): Promise<void> {
  try {
    const hasPermission = await requestPredictionNotificationPermission();
    if (!hasPermission) return;

    // 기존 알림 취소
    await Notifications.cancelScheduledNotificationAsync('daily_prediction');

    // 매일 09:00에 알림
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily_prediction',
      content: {
        title: t('notifications.dailyPredictionTitle'),
        body: t('notifications.dailyPredictionBody'),
        data: { type: 'daily_prediction', route: '/games/predictions' },
        sound: true,
        ...Platform.select({
          android: {
            channelId: PREDICTION_CHANNEL_ID,
          },
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 9,
        minute: 0,
        repeats: true,
      } as Notifications.CalendarTriggerInput,
    });

    if (__DEV__) console.log('[predictionNotifications] 매일 09:00 알림 스케줄 완료');
  } catch (error) {
    console.error('[predictionNotifications] 매일 알림 스케줄 실패:', error);
  }
}

/**
 * 정답 판정 알림 (익일 08:00)
 */
export async function scheduleResultNotification(): Promise<void> {
  try {
    const hasPermission = await requestPredictionNotificationPermission();
    if (!hasPermission) return;

    // 기존 알림 취소
    await Notifications.cancelScheduledNotificationAsync('prediction_result');

    // 매일 08:00에 알림
    await Notifications.scheduleNotificationAsync({
      identifier: 'prediction_result',
      content: {
        title: t('notifications.predictionResultTitle'),
        body: t('notifications.predictionResultBody'),
        data: { type: 'prediction_result', route: '/games/predictions' },
        sound: true,
        ...Platform.select({
          android: {
            channelId: PREDICTION_CHANNEL_ID,
          },
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 8,
        minute: 0,
        repeats: true,
      } as Notifications.CalendarTriggerInput,
    });

    if (__DEV__) console.log('[predictionNotifications] 매일 08:00 결과 알림 스케줄 완료');
  } catch (error) {
    console.error('[predictionNotifications] 결과 알림 스케줄 실패:', error);
  }
}

/**
 * 연속 적중 축하 알림 (즉시)
 */
export async function sendStreakCelebrationNotification(streakCount: number, bonusCredits: number): Promise<void> {
  try {
    const hasPermission = await requestPredictionNotificationPermission();
    if (!hasPermission) return;

    let emoji = '🔥';
    if (streakCount >= 10) emoji = '🔥🔥🔥';
    else if (streakCount >= 5) emoji = '🔥🔥';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} ${streakCount}연속 적중 달성!`,
        body: `대단합니다! 보너스 ${bonusCredits} 크레딧을 획득했습니다.`,
        data: { type: 'streak_celebration', route: '/games/predictions' },
        sound: true,
        ...Platform.select({
          android: {
            channelId: PREDICTION_CHANNEL_ID,
          },
        }),
      },
      trigger: null, // 즉시
    });

    if (__DEV__) console.log(`[predictionNotifications] ${streakCount}연속 적중 축하 알림 전송`);
  } catch (error) {
    console.error('[predictionNotifications] 축하 알림 전송 실패:', error);
  }
}

/**
 * 배지 획득 축하 알림 (즉시)
 */
export async function sendBadgeEarnedNotification(badgeName: string, badgeEmoji: string): Promise<void> {
  try {
    const hasPermission = await requestPredictionNotificationPermission();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${badgeEmoji} 새 배지 획득!`,
        body: `축하합니다! "${badgeName}" 배지를 획득했습니다.`,
        data: { type: 'badge_earned', route: '/games/predictions' },
        sound: true,
        ...Platform.select({
          android: {
            channelId: PREDICTION_CHANNEL_ID,
          },
        }),
      },
      trigger: null, // 즉시
    });

    if (__DEV__) console.log(`[predictionNotifications] 배지 획득 알림 전송: ${badgeName}`);
  } catch (error) {
    console.error('[predictionNotifications] 배지 알림 전송 실패:', error);
  }
}

/**
 * 모든 예측 게임 알림 취소
 */
export async function cancelAllPredictionNotifications(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily_prediction');
    await Notifications.cancelScheduledNotificationAsync('prediction_result');
    if (__DEV__) console.log('[predictionNotifications] 모든 알림 취소 완료');
  } catch (error) {
    console.error('[predictionNotifications] 알림 취소 실패:', error);
  }
}

// ============================================================================
// 앱 시작 시 초기화
// ============================================================================

/**
 * 예측 게임 알림 초기화 (앱 시작 시 호출)
 */
export async function initializePredictionNotifications(): Promise<void> {
  try {
    // 권한 체크 (요청은 하지 않음)
    const { status } = await Notifications.getPermissionsAsync();

    if (status === 'granted') {
      // 권한이 이미 허용되어 있으면 알림 스케줄링
      await scheduleDailyPredictionNotification();
      await scheduleResultNotification();
      if (__DEV__) console.log('[predictionNotifications] 초기화 완료');
    } else {
      if (__DEV__) console.log('[predictionNotifications] 알림 권한 없음 (사용자가 수동 활성화 가능)');
    }
  } catch (error) {
    console.error('[predictionNotifications] 초기화 실패:', error);
  }
}
