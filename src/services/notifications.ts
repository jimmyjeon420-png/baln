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
import supabase, { getCurrentUser } from './supabase';
import { getCurrentLanguage } from '../locales';

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
  /** 가격 변동 기준(%) - 예: 5 => ±5% 이상 */
  priceAlertThreshold: number;
  /** 주간 최대 알림 수 (피로도 제어) */
  weeklyNotificationCap: number;
}

/** 기본 알림 설정 (최초 설치 시) */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  rebalanceAlert: true,
  priceAlert: false,   // 기본 꺼짐 (사용자가 명시적으로 활성화)
  marketNews: true,
  priceAlertThreshold: 5,
  weeklyNotificationCap: 5,
};

const DEFAULT_WEEKDAYS = [2, 3, 4, 5, 6, 7, 1]; // 월~일 순서

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pickDistributedWeekdays(slots: number): number[] {
  const count = clamp(Math.floor(slots), 0, 7);
  if (count <= 0) return [];
  if (count >= 7) return [...DEFAULT_WEEKDAYS];

  const picked = new Set<number>();
  const step = DEFAULT_WEEKDAYS.length / count;
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(i * step);
    picked.add(DEFAULT_WEEKDAYS[idx]);
  }
  return DEFAULT_WEEKDAYS.filter((day) => picked.has(day));
}

async function getTopHoldingName(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('portfolios')
      .select('name, current_value')
      .eq('user_id', user.id)
      .order('current_value', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.name) return null;
    return data.name;
  } catch {
    return null;
  }
}

async function scheduleWeeklyNotifications(params: {
  type: string;
  title: string;
  body: string;
  screen: string;
  weekdays: number[];
  hour: number;
  minute: number;
  channelId?: string;
}): Promise<string[]> {
  const ids: string[] = [];
  for (const weekday of params.weekdays) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: { type: params.type, screen: params.screen, weekday },
        sound: 'default',
        ...(Platform.OS === 'android' && params.channelId ? { channelId: params.channelId } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: params.hour,
        minute: params.minute,
      },
    });
    ids.push(id);
  }
  return ids;
}

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

/** Morning Briefing 알림 (기본: 매일 08:00, cap에 따라 요일 축소) */
export async function scheduleMorningBriefing(
  weekdays: number[] = DEFAULT_WEEKDAYS,
  topHoldingName?: string | null
): Promise<string | null> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return null;

    await cancelScheduledNotifications('morning-briefing');
    if (weekdays.length === 0) return null;

    const lang = getCurrentLanguage();
    const isKorean = lang === 'ko';
    const title = isKorean ? '☀️ 오늘의 시장 브리핑 준비 완료' : '☀️ Today\'s Market Briefing Ready';
    const body = isKorean
      ? (topHoldingName
        ? `${topHoldingName} 포함 보유 자산 기준으로 오늘의 시장 동향을 확인하세요.`
        : 'AI가 분석한 오늘의 시장 동향과 포트폴리오 처방전을 확인하세요.')
      : (topHoldingName
        ? `Check today's market trends based on your holdings including ${topHoldingName}.`
        : 'Check today\'s AI-analyzed market trends and portfolio prescription.');

    const ids = await scheduleWeeklyNotifications({
      type: 'morning-briefing',
      title,
      body,
      screen: '/(tabs)/rebalance',
      weekdays,
      hour: 8,
      minute: 0,
      channelId: 'morning-briefing',
    });

    return ids[0] ?? null;
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

    const inactivityLang = getCurrentLanguage();
    const inactivityTitle = inactivityLang === 'ko' ? '⏰ 포트폴리오 점검 필요' : '⏰ Portfolio Check Needed';
    const inactivityBody = inactivityLang === 'ko'
      ? '3일간 포트폴리오를 확인하지 않았습니다. 시장 변화를 점검해보세요.'
      : 'You haven\'t checked your portfolio in 3 days. Review recent market changes.';

    if (diffMs <= 0) {
      // 이미 3일 지남 → 즉시 알림
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: inactivityTitle,
          body: inactivityBody,
          data: { type: 'inactivity-reminder', screen: '/(tabs)/rebalance' },
          ...(Platform.OS === 'android' && { channelId: 'rebalancing' }),
        },
        trigger: null,
      });
      return id;
    }

    // 3일 후 알림 예약
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: inactivityTitle,
        body: inactivityBody,
        data: { type: 'inactivity-reminder', screen: '/(tabs)/rebalance' },
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

    const rebalanceLang = getCurrentLanguage();
    const rebalanceTitle = rebalanceLang === 'ko' ? '⚖️ 주간 리밸런싱 점검' : '⚖️ Weekly Rebalancing Check';
    const rebalanceBody = rebalanceLang === 'ko'
      ? '포트폴리오 배분이 목표와 벗어났는지 확인해보세요. 작은 조정이 큰 차이를 만듭니다.'
      : 'Check if your portfolio allocation has drifted from your target. Small adjustments make a big difference.';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: rebalanceTitle,
        body: rebalanceBody,
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
export async function schedulePriceChangeReminder(options?: {
  weekdays?: number[];
  thresholdPercent?: number;
  topHoldingName?: string | null;
}): Promise<string | null> {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) return null;

    await cancelScheduledNotifications('price-alert');
    const weekdays = options?.weekdays ?? DEFAULT_WEEKDAYS;
    if (weekdays.length === 0) return null;

    const threshold = clamp(Math.round(options?.thresholdPercent ?? 5), 1, 20);
    const priceLang = getCurrentLanguage();
    const priceTitle = priceLang === 'ko' ? '📊 보유 종목 가격 변동 확인' : '📊 Check Holding Price Changes';
    const priceBody = priceLang === 'ko'
      ? (options?.topHoldingName
        ? `${options.topHoldingName} 포함 보유 종목에서 ±${threshold}% 이상 변동 가능성을 점검해보세요.`
        : `보유 종목의 전일 대비 ±${threshold}% 이상 변동 가능성을 점검해보세요.`)
      : (options?.topHoldingName
        ? `Check for potential ±${threshold}% moves in your holdings including ${options.topHoldingName}.`
        : `Check your holdings for potential ±${threshold}% moves vs. prior close.`);

    const ids = await scheduleWeeklyNotifications({
      type: 'price-alert',
      title: priceTitle,
      body: priceBody,
      screen: '/(tabs)/rebalance',
      weekdays,
      hour: 7,
      minute: 30,
      channelId: 'market-alert',
    });

    return ids[0] ?? null;
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

    const weeklyCap = clamp(settings.weeklyNotificationCap || 5, 1, 14);
    const priceThreshold = clamp(settings.priceAlertThreshold || 5, 1, 20);
    const reservedRebalanceSlot = settings.rebalanceAlert ? 1 : 0;
    const dailySlots = Math.max(0, weeklyCap - reservedRebalanceSlot);

    let marketNewsSlots = 0;
    let priceAlertSlots = 0;
    if (dailySlots > 0) {
      if (settings.marketNews && settings.priceAlert) {
        const priceRatio = priceThreshold <= 3 ? 0.65 : priceThreshold <= 5 ? 0.5 : 0.35;
        priceAlertSlots = Math.max(1, Math.round(dailySlots * priceRatio));
        if (dailySlots > 1) {
          priceAlertSlots = Math.min(priceAlertSlots, dailySlots - 1);
          marketNewsSlots = dailySlots - priceAlertSlots;
        } else {
          marketNewsSlots = 0;
          priceAlertSlots = 1;
        }
      } else if (settings.marketNews) {
        marketNewsSlots = dailySlots;
      } else if (settings.priceAlert) {
        priceAlertSlots = dailySlots;
      }
    }

    const marketNewsDays = pickDistributedWeekdays(marketNewsSlots);
    const priceAlertDays = pickDistributedWeekdays(priceAlertSlots);
    const topHoldingName = settings.marketNews || settings.priceAlert
      ? await getTopHoldingName()
      : null;

    // 1. 시장 뉴스 (= 아침 브리핑)
    if (settings.marketNews && marketNewsDays.length > 0) {
      await scheduleMorningBriefing(marketNewsDays, topHoldingName);
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
    if (settings.priceAlert && priceAlertDays.length > 0) {
      await schedulePriceChangeReminder({
        weekdays: priceAlertDays,
        thresholdPercent: priceThreshold,
        topHoldingName,
      });
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
