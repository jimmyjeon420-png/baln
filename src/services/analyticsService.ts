/**
 * analyticsService.ts - 자체 분석 서비스 (데이터 분석 부서)
 *
 * 역할: 외부 Analytics SDK(Firebase, Amplitude 등) 없이
 *       Supabase에 직접 사용자 행동 이벤트를 기록합니다.
 *
 * 동작 방식:
 * 1) 이벤트 발생 → 메모리 버퍼에 쌓음
 * 2) 버퍼가 5개 차면 → Supabase analytics_events 테이블에 배치 INSERT
 * 3) 네트워크 실패 시 → AsyncStorage에 백업 (최대 100개)
 * 4) 앱 재시작 시 → 로컬 백업 데이터 재전송 시도
 *
 * 추적 이벤트:
 * - screen_view: 화면 조회
 * - context_card_read: 맥락 카드 읽기
 * - prediction_vote: 예측 투표
 * - review_completed: 복기 완료
 * - share_card: 카드 공유
 * - crisis_banner_shown: 위기 배너 표시
 * - achievement_earned: 업적 획득
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabase';

// ─── 타입 정의 ─────────────────────────────────────────────

/** 분석 이벤트 구조 */
type AnalyticsEvent = {
  /** 이벤트 이름 (예: 'screen_view', 'prediction_vote') */
  event: string;
  /** 이벤트 부가 정보 (JSON) */
  properties?: Record<string, unknown>;
  /** ISO 문자열 타임스탬프 */
  timestamp: string;
  /** Supabase auth.users.id */
  userId?: string;
};

// ─── 상수 ───────────────────────────────────────────────────

/** 메모리 버퍼가 이 크기에 도달하면 DB로 전송 */
const BUFFER_SIZE = 5;

/** AsyncStorage 키 (오프라인 백업용) */
const STORAGE_KEY = '@baln:analytics_buffer';

/** 로컬 백업 최대 보관 수 */
const MAX_LOCAL_EVENTS = 100;

// ─── 메모리 버퍼 ────────────────────────────────────────────

let eventBuffer: AnalyticsEvent[] = [];

// ─── 공개 API ───────────────────────────────────────────────

/**
 * 이벤트 기록 (메모리 버퍼에 추가)
 * 버퍼가 BUFFER_SIZE에 도달하면 자동으로 DB 전송
 *
 * @param event - 이벤트 이름
 * @param properties - 부가 정보 (선택)
 * @param userId - 사용자 ID (선택, 비로그인 이벤트도 가능)
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
  userId?: string
): void {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
    userId,
  };

  eventBuffer.push(analyticsEvent);

  // 버퍼가 차면 DB로 전송
  if (eventBuffer.length >= BUFFER_SIZE) {
    flushEvents();
  }
}

/**
 * 화면 조회 추적 (간편 함수)
 * 각 탭/스크린 진입 시 호출
 *
 * @param screenName - 화면 이름 (예: 'home', 'checkup', 'profile')
 * @param userId - 사용자 ID (선택)
 */
export function trackScreenView(screenName: string, userId?: string): void {
  trackEvent('screen_view', { screen: screenName }, userId);
}

/**
 * 앱 시작 시 로컬에 백업된 이벤트 재전송
 * _layout.tsx 등에서 앱 초기화 시 1회 호출
 */
export async function retryLocalEvents(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const events: AnalyticsEvent[] = JSON.parse(stored);
    if (events.length === 0) return;

    // 로컬 버퍼를 메모리 버퍼에 합침
    eventBuffer.push(...events);
    await AsyncStorage.removeItem(STORAGE_KEY);

    // 즉시 전송 시도
    await flushEvents();
  } catch {
    // 파싱 에러 등 → 무시 (앱 크래시 방지)
  }
}

/**
 * 앱 종료/백그라운드 전환 시 남은 이벤트 강제 전송
 * AppState 'background' 이벤트에서 호출
 */
export function flushRemainingEvents(): void {
  if (eventBuffer.length > 0) {
    flushEvents();
  }
}

// ─── 내부 함수 ──────────────────────────────────────────────

/**
 * 메모리 버퍼의 이벤트를 Supabase에 배치 INSERT
 * 실패 시 AsyncStorage에 로컬 백업
 */
async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;

  // 현재 버퍼 복사 후 즉시 초기화 (중복 전송 방지)
  const eventsToSend = [...eventBuffer];
  eventBuffer = [];

  try {
    // Supabase analytics_events 테이블에 배치 INSERT
    const rows = eventsToSend.map((e) => ({
      event_name: e.event,
      properties: e.properties || {},
      user_id: e.userId || null,
      created_at: e.timestamp,
    }));

    const { error } = await supabase.from('analytics_events').insert(rows);

    if (error) {
      // 테이블 미생성, 권한 에러 등 → 로컬 백업
      console.warn('[Analytics] DB 전송 실패, 로컬 저장:', error.message);
      await saveToLocal(eventsToSend);
    }
  } catch {
    // 네트워크 에러 등 → 로컬 백업
    await saveToLocal(eventsToSend);
  }
}

/**
 * 전송 실패한 이벤트를 AsyncStorage에 로컬 저장
 * 최대 MAX_LOCAL_EVENTS(100)개까지만 보관 (오래된 것부터 삭제)
 */
async function saveToLocal(events: AnalyticsEvent[]): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const buffer: AnalyticsEvent[] = existing ? JSON.parse(existing) : [];
    buffer.push(...events);

    // 최대 개수 초과 시 오래된 이벤트 삭제
    const trimmed = buffer.slice(-MAX_LOCAL_EVENTS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // AsyncStorage 에러 → 무시 (데이터 유실 감수, 앱 안정성 우선)
  }
}
