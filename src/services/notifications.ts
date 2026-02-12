/**
 * 알림 엔진 - 푸시 알림 스케줄링 & 권한 관리 & 설정 영속화
 *
 * [알림 종류]
 * 1. 아침 브리핑 (매일 08:00) → '시장 뉴스' 토글
 * 2. 미접속 리마인더 (3일 미스캔) → '리밸런싱 알림' 토글
 * 3. 주간 리밸런싱 점검 (매주 월요일 09:00) → '리밸런싱 알림' 토글
 * 4. 가격 변동 리마인더 (매일 07:30) → '가격 변동 알림' 토글
 *
 * [설정 저장]
 * AsyncStorage에 JSON으로 저장 → 앱 종료 후에도 유지
 * 토글 변경 시 syncNotificationSchedule()로 스케줄 동기화
 */

import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// 스토리지 키
// ============================================================================
const NOTIFICATION_PERMISSION_KEY = '@baln:notification_permission';
const LAST_SCAN_DATE_KEY = '@baln:last_scan_date';
const NOTIFICATION_SETTINGS_KEY = '@baln:notification_settings';

// ============================================================================
// 알림 설정 타입 & 기본값
// ============================================================================

/** 알림 설정 인터페이스 */
export interface NotificationSettings {
  /** 마스터 토글: 모든 알림 on/off */
  pushEnabled: boolean;
  /** 리밸런싱 알림: 주간 점검 + 3일 미접속 리마인더 */
  rebalanceAlert: boolean;
  /** 가격 변동 알림: 매일 아침 변동 확인 리마인더 */
  priceAlert: boolean;
  /** 시장 뉴스: 매일 아침 시장 브리핑 */
  marketNews: boolean;
}

/** 기본 알림 설정 (최초 설치 시) */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  rebalanceAlert: true,
  priceAlert: false,   // 기본 꺼짐 (사용자가 명시적으로 활성화)
  marketNews: true,
};

// ============================================================================
// 알림 설정 저장/로드
// ============================================================================

/** 알림 설정을 AsyncStorage에 저장 */
export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(settings)
    );
  } catch (err) {
    console.error('[알림] 설정 저장 실패:', err);
  }
}

/** AsyncStorage에서 알림 설정 로드 (없으면 기본값 반환) */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 새로 추가된 키가 있을 수 있으므로 기본값과 병합
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('[알림] 설정 로드 실패:', err);
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS };
}

// ============================================================================
// 알림 핸들러 & 권한
// ============================================================================

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
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, status);

    if (status !== 'granted') {
      Alert.alert(
        '알림 권한 안내',
        '아침 브리핑 알림을 받으려면 설정에서 알림을 허용해주세요.\n\n설정 > 앱 > baln > 알림',
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

      await Notifications.setNotificationChannelAsync('rebalancing', {
        name: '리밸런싱 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#4CAF50',
      });
    }

    return true;
  } catch (err) {
    console.error('[알림] 권한 요청 실패:', err);
    return false;
  }
}

// ============================================================================
// 개별 알림 스케줄링 함수
// ============================================================================

/** 매일 오전 8시 Morning Briefing 알림 (시장 뉴스 토글) */
export async function scheduleMorningBriefing(): Promise<string | null> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return null;

    await cancelScheduledNotifications('morning-briefing');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ 오늘의 시장 브리핑 준비 완료',
        body: 'AI가 분석한 오늘의 시장 동향과 포트폴리오 처방전을 확인하세요.',
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
    console.error('[알림] 아침 브리핑 스케줄 실패:', err);
    return null;
  }
}

/** 3일간 미스캔 시 리마인더 (리밸런싱 알림 토글) */
export async function scheduleInactivityReminder(): Promise<string | null> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return null;

    await cancelScheduledNotifications('inactivity-reminder');

    const lastScan = await AsyncStorage.getItem(LAST_SCAN_DATE_KEY);
    if (!lastScan) return null;

    const lastScanDate = new Date(lastScan);
    const threeDaysLater = new Date(lastScanDate);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const now = new Date();
    const diffMs = threeDaysLater.getTime() - now.getTime();

    if (diffMs <= 0) {
      // 이미 3일 지남 → 즉시 알림
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ 포트폴리오 점검 필요',
          body: '3일간 포트폴리오를 확인하지 않았습니다. 시장 변화를 점검해보세요.',
          data: { type: 'inactivity-reminder', screen: '/(tabs)/diagnosis' },
          ...(Platform.OS === 'android' && { channelId: 'rebalancing' }),
        },
        trigger: null,
      });
      return id;
    }

    // 3일 후 알림 예약
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ 포트폴리오 점검 필요',
        body: '3일간 포트폴리오를 확인하지 않았습니다. 시장 변화를 점검해보세요.',
        data: { type: 'inactivity-reminder', screen: '/(tabs)/diagnosis' },
        ...(Platform.OS === 'android' && { channelId: 'rebalancing' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, Math.floor(diffMs / 1000)),
      },
    });

    return id;
  } catch (err) {
    console.error('[알림] 미접속 리마인더 스케줄 실패:', err);
    return null;
  }
}

/**
 * 주간 리밸런싱 점검 리마인더 (매주 월요일 09:00)
 * → 리밸런싱 알림 토글
 */
export async function scheduleRebalancingReminder(): Promise<string | null> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return null;

    await cancelScheduledNotifications('rebalancing-reminder');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚖️ 주간 리밸런싱 점검',
        body: '포트폴리오 배분이 목표와 벗어났는지 확인해보세요. 작은 조정이 큰 차이를 만듭니다.',
        data: { type: 'rebalancing-reminder', screen: '/(tabs)/rebalance' },
        ...(Platform.OS === 'android' && { channelId: 'rebalancing' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2, // 월요일 (1=일, 2=월, ...)
        hour: 9,
        minute: 0,
      },
    });

    return id;
  } catch (err) {
    console.error('[알림] 주간 리밸런싱 스케줄 실패:', err);
    return null;
  }
}

/**
 * 가격 변동 리마인더 (매일 오전 07:30)
 * → 가격 변동 알림 토글
 *
 * [작동 방식]
 * 로컬 알림으로 매일 7:30에 보유 종목 가격 확인을 리마인드합니다.
 * 앱을 열면 Central Kitchen이 전일 대비 ±5% 이상 변동한 종목을
 * 하이라이트하여 보여줍니다.
 */
export async function schedulePriceChangeReminder(): Promise<string | null> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return null;

    await cancelScheduledNotifications('price-alert');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 보유 종목 가격 변동 확인',
        body: '어제 시장에서 주요 변동이 있었을 수 있습니다. 앱에서 포트폴리오를 확인해보세요.',
        data: { type: 'price-alert', screen: '/(tabs)/diagnosis' },
        ...(Platform.OS === 'android' && { channelId: 'market-alert' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 30,
      },
    });

    return id;
  } catch (err) {
    console.error('[알림] 가격 변동 리마인더 스케줄 실패:', err);
    return null;
  }
}

// ============================================================================
// 설정에 따른 전체 스케줄 동기화
// ============================================================================

/**
 * 알림 설정에 맞게 전체 스케줄을 동기화합니다.
 * 토글이 켜진 알림만 스케줄링하고, 꺼진 알림은 취소합니다.
 *
 * @param settings - 사용자 알림 설정
 */
export async function syncNotificationSchedule(
  settings: NotificationSettings
): Promise<void> {
  try {
    // 마스터 토글이 꺼져있으면 모든 알림 취소
    if (!settings.pushEnabled) {
      await cancelAllNotifications();
      return;
    }

    // 1. 시장 뉴스 (= 아침 브리핑)
    if (settings.marketNews) {
      await scheduleMorningBriefing();
    } else {
      await cancelScheduledNotifications('morning-briefing');
    }

    // 2. 리밸런싱 알림 (주간 리마인더 + 미접속 리마인더)
    if (settings.rebalanceAlert) {
      await scheduleRebalancingReminder();
      await scheduleInactivityReminder();
    } else {
      await cancelScheduledNotifications('rebalancing-reminder');
      await cancelScheduledNotifications('inactivity-reminder');
    }

    // 3. 가격 변동 알림
    if (settings.priceAlert) {
      await schedulePriceChangeReminder();
    } else {
      await cancelScheduledNotifications('price-alert');
    }
  } catch (err) {
    console.error('[알림] 스케줄 동기화 실패:', err);
  }
}

// ============================================================================
// 유틸리티
// ============================================================================

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
    console.error('[알림] 예약 취소 실패:', err);
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
    console.error('[알림] 전체 취소 실패:', err);
  }
}
