/**
 * streakNotificationService.ts — 스트릭 경고 + 리인게이지먼트 알림
 *
 * 역할: "마을 우체부" — 사용자가 마을을 떠나면 편지를 보내는 서비스
 * - 매일 20:00 KST 스트릭 경고 (출석 안 했으면)
 * - 출석 완료 시 경고 취소
 * - 3일/7일 미접속 시 리인게이지먼트 알림
 * - 앱 진입 시 리인게이지먼트 알림 리셋
 */

import * as Notifications from 'expo-notifications';
import { getStreakData } from './streakService';
import { getCurrentLanguage } from '../locales';

// Notification identifiers
const STREAK_WARNING_ID = 'streak-warning-daily';
const REENGAGEMENT_D3_ID = 'reengagement-d3';
const REENGAGEMENT_D7_ID = 'reengagement-d7';

/**
 * Schedule the daily streak warning at 20:00 KST (11:00 UTC)
 * Called on app open — cancels previous and reschedules with latest streak count
 */
export async function scheduleStreakWarning(): Promise<void> {
  try {
    // Cancel existing to avoid duplicates
    await cancelStreakWarning();

    const streakData = await getStreakData();
    const isKo = getCurrentLanguage() === 'ko';
    const streak = streakData.currentStreak;

    // Only schedule if user has an active streak worth protecting
    if (streak <= 0) return;

    const title = isKo ? '🔥 스트릭 위험!' : '🔥 Streak at risk!';
    const body = isKo
      ? `오늘 발른 마을에 아직 안 오셨어요! 연속 ${streak}일 기록이 사라질 수 있어요`
      : `You haven't visited baln village today! Your ${streak}-day streak might be lost`;

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_WARNING_ID,
      content: {
        title,
        body,
        sound: 'default',
        data: { type: 'streak_warning', deepLink: 'baln://today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 11, // 20:00 KST = 11:00 UTC
        minute: 0,
      },
    });
  } catch (err) {
    if (__DEV__) console.warn('[streakNotification] scheduleStreakWarning error:', err);
  }
}

/**
 * Cancel the daily streak warning (called after successful check-in)
 */
export async function cancelStreakWarning(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID);
  } catch {
    // Ignore — notification may not exist
  }
}

/**
 * Schedule D3 and D7 re-engagement notifications
 * Called on every app open — cancels previous and reschedules from now
 */
export async function scheduleReengagementNotifications(): Promise<void> {
  try {
    // Cancel existing
    await cancelReengagementNotifications();

    const isKo = getCurrentLanguage() === 'ko';

    // D3: 3 days from now
    await Notifications.scheduleNotificationAsync({
      identifier: REENGAGEMENT_D3_ID,
      content: {
        title: isKo ? '🏘️ 구루들이 기다려요!' : '🏘️ Gurus are waiting!',
        body: isKo
          ? '구루들이 기다리고 있어요! 마을에 다시 놀러 오세요'
          : 'The gurus are waiting! Come back to the village',
        sound: 'default',
        data: { type: 'reengagement', deepLink: 'baln://village' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3 * 24 * 60 * 60, // 3 days
        repeats: false,
      },
    });

    // D7: 7 days from now
    await Notifications.scheduleNotificationAsync({
      identifier: REENGAGEMENT_D7_ID,
      content: {
        title: isKo ? '🏚️ 마을이 조용해요...' : '🏚️ Village is quiet...',
        body: isKo
          ? '발른 마을이 조용해요... 7일째 비어있는 집이 걱정돼요'
          : 'baln village is quiet... Your house has been empty for 7 days',
        sound: 'default',
        data: { type: 'reengagement', deepLink: 'baln://village' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 7 * 24 * 60 * 60, // 7 days
        repeats: false,
      },
    });
  } catch (err) {
    if (__DEV__) console.warn('[streakNotification] scheduleReengagement error:', err);
  }
}

/**
 * Cancel all re-engagement notifications
 */
export async function cancelReengagementNotifications(): Promise<void> {
  try {
    await Promise.all([
      Notifications.cancelScheduledNotificationAsync(REENGAGEMENT_D3_ID),
      Notifications.cancelScheduledNotificationAsync(REENGAGEMENT_D7_ID),
    ]);
  } catch {
    // Ignore
  }
}

/**
 * Initialize streak notifications on app start
 * - Schedule streak warning (will fire at 20:00 if no check-in)
 * - Reset re-engagement timers (user is active now)
 */
export async function initStreakNotifications(): Promise<void> {
  await scheduleStreakWarning();
  await scheduleReengagementNotifications();
}

/**
 * Call after successful daily check-in
 * - Cancels today's streak warning (no longer needed)
 * - Resets re-engagement timers
 */
export async function onCheckInComplete(): Promise<void> {
  await cancelStreakWarning();
  await scheduleReengagementNotifications();
}
