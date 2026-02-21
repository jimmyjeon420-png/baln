/**
 * pushNotificationService.ts - 푸시 알림 토큰 관리 서비스
 *
 * 역할: "알림 발송 부서"
 * - Expo Push Token 획득 및 DB 저장
 * - 서버에서 푸시 알림을 보낼 때 토큰이 필요
 * - 토큰은 Supabase profiles 테이블에 저장
 * - 아침 맥락 카드 알림 예약 (매일 07:30)
 * - 위기 알림 즉시 발송 (로컬)
 *
 * [기존 서비스와의 관계]
 * - notifications.ts: 알림 스케줄링 & 설정 관리 (토글 UI 연동)
 * - crisisDetection.ts: 위기 감지 엔진 (판정 로직)
 * - useCrisisAlert.ts: 위기 감지 + 클라이언트 알림 (앱 열려있을 때)
 * - pushNotificationService.ts (이 파일): 서버사이드 토큰 관리 + 아침 알림 예약
 *
 * [흐름]
 * 1. 앱 시작 → registerForPushNotifications() → 토큰 획득
 * 2. savePushToken() → Supabase profiles에 저장 (서버 알림용)
 * 3. scheduleMorningBriefingNotification() → 매일 07:30 로컬 알림 예약
 * 4. sendCrisisNotification() → 위기 감지 시 즉시 로컬 알림 발송
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabase';
import { getStreakData } from './streakService';

// ============================================================================
// Expo Push Token 획득
// ============================================================================

/**
 * 푸시 알림 토큰 획득
 *
 * [동작]
 * 1. 실제 디바이스인지 확인 (웹에서는 푸시 불가)
 * 2. 기존 권한 확인 → 없으면 권한 요청
 * 3. Expo Push Token 발급
 * 4. Android 전용 알림 채널 설정
 *
 * @returns Expo Push Token 문자열 (실패 시 null)
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // 웹에서는 푸시 알림 불가 (expo-device 미설치이므로 Platform으로 대체)
  if (Platform.OS === 'web') {
    if (__DEV__) console.log('[Push] 웹에서는 푸시 알림을 사용할 수 없습니다');
    return null;
  }

  try {
    // 기존 권한 확인
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 권한 없으면 요청
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (__DEV__) console.log('[Push] 알림 권한이 거부되었습니다');
      return null;
    }

    // Expo Push Token 획득 (간헐적 실패 대비 재시도)
    let token: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '0d967ba4-ad89-4a20-87fc-8d4cd28a5658',
        });
        token = tokenData.data;
        break;
      } catch (tokenError) {
        if (attempt < 2) {
          if (__DEV__) console.warn(`[Push] 토큰 획득 ${attempt + 1}차 실패, 재시도...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        } else {
          console.warn('[Push] 토큰 획득 3회 실패 (기능 영향 없음):', tokenError);
          return null;
        }
      }
    }

    if (!token) return null;
    if (__DEV__) console.log('[Push] 토큰 획득:', token);

    // Android 채널 설정
    if (Platform.OS === 'android') {
      // 기본 알림 채널 (맥락 카드, 일반 알림)
      await Notifications.setNotificationChannelAsync('default', {
        name: 'baln 알림',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });

      // 위기 알림 전용 채널 (높은 우선순위)
      await Notifications.setNotificationChannelAsync('crisis', {
        name: '위기 알림',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#CF6679',
      });
    }

    return token;
  } catch (error) {
    console.warn('[Push] 토큰 획득 실패 (기능 영향 없음):', error);
    return null;
  }
}

// ============================================================================
// 토큰 DB 저장
// ============================================================================

/**
 * 푸시 토큰을 Supabase profiles 테이블에 저장
 *
 * [목적]
 * - 서버(Edge Function)에서 특정 유저에게 푸시 알림을 보낼 때 토큰이 필요
 * - profiles 테이블에 push_token 컬럼이 없을 수 있음 → 에러 무시 (graceful)
 *
 * @param userId - Supabase Auth 유저 ID
 * @param token - Expo Push Token 문자열
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        push_token: token,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      // push_token 컬럼이 아직 DB에 없을 수 있음 → 경고만 출력
      console.warn('[Push] 토큰 저장 실패 (컬럼 미존재 가능):', error.message);
    } else {
      if (__DEV__) console.log('[Push] 토큰 DB 저장 완료');
    }
  } catch (e) {
    console.warn('[Push] 토큰 저장 에러:', e);
  }
}

// ============================================================================
// 아침 맥락 카드 알림 예약
// ============================================================================

/**
 * 매일 아침 7:30 맥락 카드 알림 예약
 *
 * [목적]
 * - 습관 루프의 시작점: "아침에 맥락 카드 읽기"를 유도
 * - 매일 반복되는 로컬 알림으로 MAU 리텐션 향상
 *
 * [동작]
 * 1. 기존 'morning-briefing' 알림 취소 (중복 방지)
 * 2. 매일 07:30에 로컬 알림 예약
 */
export async function scheduleMorningBriefingNotification(): Promise<void> {
  try {
    // 기존 아침 알림 취소 (중복 예약 방지)
    await Notifications.cancelScheduledNotificationAsync('morning-briefing').catch(() => {});

    // 매일 아침 7:30 알림 예약
    await Notifications.scheduleNotificationAsync({
      identifier: 'morning-briefing',
      content: {
        title: '오늘의 시장 맥락',
        body: '어제 시장에서 무슨 일이 있었는지 확인하세요. 5분이면 충분합니다!',
        data: { type: 'morning-briefing' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 30,
      },
    });

    if (__DEV__) console.log('[Push] 아침 맥락 카드 알림 예약 완료 (07:30)');
  } catch (e) {
    console.warn('[Push] 아침 알림 예약 실패:', e);
  }
}

// ============================================================================
// 위기 알림 즉시 발송 (로컬)
// ============================================================================

/**
 * 위기 알림 즉시 발송
 *
 * [기존 useCrisisAlert.ts와의 관계]
 * - useCrisisAlert: 앱이 열려있을 때 클라이언트에서 감지 + 알림
 * - 이 함수: 서버사이드 또는 백그라운드에서 호출할 수 있는 독립 함수
 *
 * [메시지 전략 — CLAUDE.md 준수]
 * - "안심을 판다, 불안을 팔지 않는다" (버핏)
 * - moderate: 맥락 제공으로 유도
 * - severe: 기관 행동 궁금증 유발 → Premium 전환
 * - extreme: 역사적 비교 → 안심 제공
 *
 * @param level - 위기 등급
 * @param headline - 사용자에게 표시할 메시지
 */
export async function sendCrisisNotification(
  level: 'moderate' | 'severe' | 'extreme',
  headline: string
): Promise<void> {
  const levelInfo = {
    moderate: { emoji: '⚠️', title: '시장 변동성 증가' },
    severe: { emoji: '🔶', title: '시장 급변 감지' },
    extreme: { emoji: '🔴', title: '긴급: 시장 위기 경고' },
  };

  const info = levelInfo[level];

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${info.emoji} ${info.title}`,
        body: headline,
        data: { type: 'crisis', level },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // 즉시 발송
    });

    if (__DEV__) console.log(`[Push] 위기 알림 발송 완료: ${level} — ${headline}`);
  } catch (e) {
    console.warn('[Push] 위기 알림 발송 실패:', e);
  }
}

// ============================================================================
// 스트릭 만료 경고 알림 (P2.1)
// ============================================================================

// AsyncStorage 키: 오늘 앱 방문 여부 (스트릭 경고 취소 용도)
const STREAK_WARNING_VISITED_KEY = '@baln:streak_warning_visited_date';

/**
 * 스트릭 만료 경고 알림 예약 (매일 21:00 KST)
 *
 * [목적]
 * - 이탈 방지: "오늘 아직 방문 안 하셨네요! N일 연속 기록이 끊어지기 3시간 전입니다"
 * - 손실 회피 심리 활용 (버핏 전략: 기록 보존 욕구)
 *
 * [동작 로직]
 * 1. 오늘 이미 방문한 경우 → 스트릭 경고 알림 취소 (방문했으니 필요 없음)
 * 2. 아직 미방문인 경우 → 매일 21:00 KST(= 12:00 UTC) 에 알림 예약
 * 3. 스트릭이 0이면 예약 안 함 (기록 없으면 경고할 것도 없음)
 *
 * [KST 21:00 = UTC 12:00]
 * - iOS/Android 로컬 알림 트리거는 기기 로컬 타임존 기준
 * - 한국 사용자는 기기가 KST이므로 hour: 21 로 설정하면 됨
 *
 * @param userId - 현재 로그인 유저 ID (로깅용)
 */
export async function scheduleStreakWarningNotification(userId: string): Promise<void> {
  try {
    // 1. 오늘 날짜 확인
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const visitedDate = await AsyncStorage.getItem(STREAK_WARNING_VISITED_KEY);

    if (visitedDate === today) {
      // 오늘 이미 방문 기록이 있으면 스트릭 경고 알림 취소
      await Notifications.cancelScheduledNotificationAsync('streak-warning').catch(() => {});
      if (__DEV__) console.log('[Push] 오늘 방문 완료 → 스트릭 경고 알림 취소');
      return;
    }

    // 2. 현재 스트릭 데이터 조회
    const streakData = await getStreakData();
    const { currentStreak, lastVisitDate } = streakData;

    // 스트릭이 0이거나 기록이 없으면 경고 불필요
    if (currentStreak <= 0 || !lastVisitDate) {
      if (__DEV__) console.log('[Push] 스트릭 없음 → 경고 알림 건너뜀');
      return;
    }

    // 3. 오늘 이미 스트릭이 업데이트 됐는지 확인 (오늘 방문한 경우)
    if (lastVisitDate === today) {
      // 오늘 방문했으므로 경고 알림 취소
      await Notifications.cancelScheduledNotificationAsync('streak-warning').catch(() => {});
      // 방문 날짜 기록 (다음 usePushSetup 호출 시 취소 유지)
      await AsyncStorage.setItem(STREAK_WARNING_VISITED_KEY, today);
      if (__DEV__) console.log('[Push] 오늘 스트릭 업데이트됨 → 스트릭 경고 알림 취소');
      return;
    }

    // 4. 기존 스트릭 경고 알림 취소 후 재예약 (중복 방지)
    await Notifications.cancelScheduledNotificationAsync('streak-warning').catch(() => {});

    // 5. 매일 21:00(기기 로컬 타임존 기준)에 알림 예약
    //    한국 사용자 기기는 KST이므로 21:00 = 오후 9시
    await Notifications.scheduleNotificationAsync({
      identifier: 'streak-warning',
      content: {
        title: '오늘 아직 방문 안 하셨네요!',
        body: `🔥 ${currentStreak}일 연속 기록이 끊어지기 3시간 전입니다. 오늘 맥락 카드를 확인해보세요!`,
        data: { type: 'streak-warning', streak: currentStreak, userId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });

    if (__DEV__) console.log(`[Push] 스트릭 경고 알림 예약 완료 (21:00, 현재 스트릭: ${currentStreak}일)`);
  } catch (e) {
    console.warn('[Push] 스트릭 경고 알림 예약 실패:', e);
  }
}

/**
 * 오늘 방문 완료 표시 (스트릭 경고 알림 취소)
 *
 * [호출 시점]
 * - 스트릭이 오늘로 업데이트된 직후 (checkAndUpdateStreak 성공 시)
 * - 예: useStreak 훅에서 isNewDay === true 감지 시
 *
 * 이 함수를 호출하면:
 * 1. 오늘 날짜를 AsyncStorage에 기록
 * 2. 예약된 스트릭 경고 알림 즉시 취소
 */
export async function cancelStreakWarningForToday(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(STREAK_WARNING_VISITED_KEY, today);
    await Notifications.cancelScheduledNotificationAsync('streak-warning').catch(() => {});
    if (__DEV__) console.log('[Push] 오늘 방문 완료 → 스트릭 경고 알림 취소');
  } catch (e) {
    console.warn('[Push] 스트릭 경고 취소 실패:', e);
  }
}
