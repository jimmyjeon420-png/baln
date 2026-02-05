/**
 * 알림 엔진 - 푸시 알림 스케줄링 & 권한 관리
 * Daily Morning Briefing (08:00 AM)
 * Market Volatility Alert (3일 미스캔 시)
 * 권한 거부 시 graceful fallback (크래시 방지)
 */

import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 알림 스토리지 키
const NOTIFICATION_PERMISSION_KEY = '@smart_rebalancer:notification_permission';
const LAST_SCAN_DATE_KEY = '@smart_rebalancer:last_scan_date';

/** 알림 핸들러 설정 (포그라운드에서도 알림 표시) */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** 알림 권한 요청 (거부 시 크래시 방지) */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // 웹 환경에서는 스킵
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, status);

    if (status !== 'granted') {
      // 권한 거부 시 Alert으로 안내 (크래시 안 함)
      Alert.alert(
        '알림 권한 안내',
        '아침 브리핑 알림을 받으려면 설정에서 알림을 허용해주세요.\n\n설정 > 앱 > Smart Rebalancer > 알림',
        [{ text: '확인' }]
      );
      return false;
    }

    // Android 채널 설정
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('morning-briefing', {
        name: '아침 브리핑',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('market-alert', {
        name: '시장 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#FFD700',
      });
    }

    return true;
  } catch (err) {
    console.error('Notification permission error:', err);
    return false;
  }
}

/** 매일 오전 8시 Morning Briefing 알림 스케줄링 */
export async function scheduleMorningBriefing(): Promise<string | null> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return null;

    // 기존 Morning Briefing 알림 취소
    await cancelScheduledNotifications('morning-briefing');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '오늘의 CFO 브리핑 준비 완료',
        body: '포트폴리오 처방전이 업데이트되었습니다. 확인해보세요.',
        data: { type: 'morning-briefing', screen: '/(tabs)/diagnosis' },
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'morning-briefing' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });

    return id;
  } catch (err) {
    console.error('Schedule morning briefing error:', err);
    return null;
  }
}

/** 3일간 미스캔 시 리마인더 알림 스케줄링 */
export async function scheduleInactivityReminder(): Promise<string | null> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return null;

    // 기존 리마인더 취소
    await cancelScheduledNotifications('inactivity-reminder');

    // 마지막 스캔 날짜 확인
    const lastScan = await AsyncStorage.getItem(LAST_SCAN_DATE_KEY);
    if (!lastScan) return null;

    const lastScanDate = new Date(lastScan);
    const threeDaysLater = new Date(lastScanDate);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    // 이미 3일 지났으면 즉시 알림, 아니면 스케줄링
    const now = new Date();
    const diffMs = threeDaysLater.getTime() - now.getTime();

    if (diffMs <= 0) {
      // 즉시 알림
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '시장 변동성 알림',
          body: '3일간 포트폴리오를 확인하지 않았습니다. 시장 변화를 점검해보세요.',
          data: { type: 'inactivity-reminder', screen: '/(tabs)/diagnosis' },
          ...(Platform.OS === 'android' && { channelId: 'market-alert' }),
        },
        trigger: null, // 즉시
      });
      return id;
    }

    // 3일 후 알림
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '시장 변동성 알림',
        body: '3일간 포트폴리오를 확인하지 않았습니다. 시장 변화를 점검해보세요.',
        data: { type: 'inactivity-reminder', screen: '/(tabs)/diagnosis' },
        ...(Platform.OS === 'android' && { channelId: 'market-alert' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, Math.floor(diffMs / 1000)),
      },
    });

    return id;
  } catch (err) {
    console.error('Schedule inactivity reminder error:', err);
    return null;
  }
}

/** 특정 타입의 예약 알림 취소 */
async function cancelScheduledNotifications(type: string) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (err) {
    console.error('Cancel notifications error:', err);
  }
}

/** 알림 권한 확인 (캐시 우선) */
async function checkNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;

    const cached = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    if (cached === 'granted') return true;

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** 모든 예약 알림 초기화 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.error('Cancel all notifications error:', err);
  }
}
