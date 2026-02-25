/**
 * useVillageEvents — 마을 이벤트 상태 관리 훅
 *
 * 역할: "마을 축제 기획자" — 30분마다 새 이벤트가 발생할지 판단하고,
 *       현재 진행 중인 이벤트를 추적하며, 이벤트가 끝나면 자동으로 종료 처리
 *
 * 비유: 동물의숲의 K.K. 슬라이더 콘서트 알림 — 주기적으로 마을에 특별한 일이 생기는 느낌
 *
 * 이벤트 선택 규칙:
 * 1. 30분마다 새 이벤트 발생 여부 체크
 * 2. 번영도 레벨이 높을수록 하루 최대 이벤트 수 증가 (Lv1: 1개, Lv5: 3개, Lv10: 5개)
 * 3. 같은 날 같은 이벤트 중복 발생 없음
 * 4. 계절 이벤트는 해당 달에만 발생 (봄/여름/가을/겨울 구분)
 * 5. emergency 이벤트는 triggerEvent()로 외부에서 강제 발동
 * 6. 이벤트가 duration 시간 경과 후 자동 종료
 *
 * 사용처:
 * - useVillageWorld: prosperityLevel 전달
 * - Village 탭: 이벤트 배너/알림 표시
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VillageEvent } from '../types/village';
import { VILLAGE_EVENTS, getEventsByType } from '../data/villageEvents';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

/** 이벤트 발생 여부 체크 주기: 30분 (ms) */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** AsyncStorage 키: 오늘 활성화된 이벤트 ID 목록 */
const EVENTS_KEY = 'village_active_events';

/** AsyncStorage 키: 오늘 발생한 이벤트 히스토리 */
const EVENT_HISTORY_KEY = 'village_event_history';

/** 이벤트 발생 기본 확률 (0~1) — 번영도에 따라 조정됨 */
const BASE_EVENT_CHANCE = 0.3;

/**
 * 번영도 레벨별 하루 최대 이벤트 수
 * Lv1~4: 1개, Lv5~7: 3개, Lv8~9: 4개, Lv10: 5개
 */
function getMaxEventsPerDay(prosperityLevel: number): number {
  if (prosperityLevel >= 10) return 5;
  if (prosperityLevel >= 8) return 4;
  if (prosperityLevel >= 5) return 3;
  return 1;
}

/**
 * 현재 달(1~12) → 계절 이벤트 허용 여부
 * 계절 이벤트 ID 패턴과 현재 달 매핑
 */
const SEASONAL_EVENT_MONTHS: Record<string, number[]> = {
  seasonal_rainy_reading: [6, 7],        // 장마철 (6~7월)
  seasonal_snow_day: [12, 1, 2],         // 겨울 (12~2월)
  seasonal_autumn_leaves: [10, 11],      // 가을 (10~11월)
  seasonal_spring_garden: [3, 4, 5],     // 봄 (3~5월)
  seasonal_starry_night: [7, 8],         // 여름밤 (7~8월)
};

/**
 * 축제 이벤트 허용 달 — 특정 달에만 발생
 */
const FESTIVAL_EVENT_MONTHS: Record<string, number[]> = {
  festival_cherry_blossom: [3, 4],       // 봄 (3~4월)
  festival_harvest: [9, 10, 11],         // 추수 (9~11월)
  festival_christmas_market: [12],       // 크리스마스 (12월)
  festival_new_year: [1],               // 신년 (1월)
  festival_summer_splash: [7, 8],        // 여름 (7~8월)
};

// ---------------------------------------------------------------------------
// 퍼시스턴스 타입
// ---------------------------------------------------------------------------

interface EventHistory {
  date: string;                 // YYYY-MM-DD
  triggeredIds: string[];       // 오늘 이미 발생한 이벤트 ID 목록
  activeEventId?: string;       // 현재 진행 중인 이벤트 ID
  activeEventStartTime?: number; // 이벤트 시작 시각 (Unix ms)
}

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

/** 오늘 날짜 문자열 (YYYY-MM-DD) */
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/** 현재 달 (1~12) */
function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

/** 이벤트가 현재 달에 허용되는지 확인 */
function isEventAllowedThisMonth(event: VillageEvent): boolean {
  if (event.type === 'seasonal') {
    const allowed = SEASONAL_EVENT_MONTHS[event.id];
    if (!allowed) return false;
    return allowed.includes(getCurrentMonth());
  }
  if (event.type === 'festival') {
    const allowed = FESTIVAL_EVENT_MONTHS[event.id];
    if (!allowed) return true; // 달 제한 없는 축제는 허용
    return allowed.includes(getCurrentMonth());
  }
  return true; // market, competition, celebration, emergency는 항상 허용
}

/** 이벤트가 아직 duration 내에 있는지 확인 */
function isEventStillActive(startTime: number, durationMinutes: number): boolean {
  const elapsed = Date.now() - startTime;
  return elapsed < durationMinutes * 60 * 1000;
}

/** AsyncStorage에서 히스토리 로드 */
async function loadHistory(): Promise<EventHistory> {
  try {
    const stored = await AsyncStorage.getItem(EVENT_HISTORY_KEY);
    if (stored) {
      const parsed: EventHistory = JSON.parse(stored);
      if (parsed.date === getTodayKey()) return parsed;
    }
  } catch {
    // 무시
  }
  return { date: getTodayKey(), triggeredIds: [] };
}

/** AsyncStorage에 히스토리 저장 */
async function saveHistory(history: EventHistory): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENT_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // 무시
  }
}

// ---------------------------------------------------------------------------
// 반환 타입
// ---------------------------------------------------------------------------

export interface UseVillageEventsReturn {
  /** 현재 진행 중인 이벤트 (없으면 null) */
  activeEvent: VillageEvent | null;
  /** 오늘 발생했던 이벤트 목록 (히스토리) */
  eventHistory: VillageEvent[];
  /** 오늘 발생한 이벤트 수 */
  todayEventCount: number;
  /**
   * 이벤트 강제 발동 (emergency 이벤트 또는 외부 트리거용)
   * @param eventId — VILLAGE_EVENTS에서 정의된 이벤트 ID
   */
  triggerEvent: (eventId: string) => Promise<void>;
  /** 현재 이벤트 조기 종료 */
  dismissEvent: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// 훅
// ---------------------------------------------------------------------------

/**
 * @param prosperityLevel — useVillageProsperity().level (1~10)
 */
export function useVillageEvents(prosperityLevel: number): UseVillageEventsReturn {
  const [activeEvent, setActiveEvent] = useState<VillageEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<VillageEvent[]>([]);
  const [todayEventCount, setTodayEventCount] = useState(0);

  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ── 초기 로드: 오늘 히스토리 + 이전에 시작된 이벤트 복원 ────────────────

  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      const history = await loadHistory();

      // 히스토리에서 이벤트 객체 복원
      const historyEvents: VillageEvent[] = history.triggeredIds
        .map(id => VILLAGE_EVENTS.find(e => e.id === id))
        .filter((e): e is VillageEvent => e !== undefined);

      if (isMountedRef.current) {
        setEventHistory(historyEvents);
        setTodayEventCount(history.triggeredIds.length);
      }

      // 이전에 시작된 이벤트가 아직 유효하면 복원
      if (history.activeEventId && history.activeEventStartTime) {
        const event = VILLAGE_EVENTS.find(e => e.id === history.activeEventId);
        if (event && isEventStillActive(history.activeEventStartTime, event.duration)) {
          if (isMountedRef.current) {
            setActiveEvent(event);
            if (__DEV__) {
              console.log(`[useVillageEvents] 이벤트 복원: ${event.title}`);
            }
          }
        } else {
          // 만료된 이벤트 — 히스토리 정리
          history.activeEventId = undefined;
          history.activeEventStartTime = undefined;
          await saveHistory(history);
        }
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── 주기적 이벤트 체크 (30분) ──────────────────────────────────────────

  /**
   * 새 이벤트 발생 가능 여부 판단 + 랜덤 선택
   *
   * 선택 알고리즘:
   * 1. 이미 이벤트 진행 중이면 스킵
   * 2. 하루 최대 이벤트 수 초과 시 스킵
   * 3. 오늘 이미 발생한 이벤트 제외
   * 4. 계절/달 제한 통과한 이벤트만
   * 5. emergency 타입 제외 (외부 트리거 전용)
   * 6. BASE_EVENT_CHANCE * (1 + prosperityLevel * 0.05) 확률로 발동
   */
  const checkAndTriggerEvent = useCallback(async () => {
    if (activeEvent) return; // 이미 이벤트 진행 중

    const history = await loadHistory();
    const maxEvents = getMaxEventsPerDay(prosperityLevel);

    if (history.triggeredIds.length >= maxEvents) {
      if (__DEV__) {
        console.log(`[useVillageEvents] 오늘 최대 이벤트 수 도달 (${maxEvents}개)`);
      }
      return;
    }

    // 번영도에 따라 발생 확률 증가
    const chance = BASE_EVENT_CHANCE * (1 + prosperityLevel * 0.04);
    if (Math.random() > chance) return;

    // 후보 이벤트 필터링
    const candidates = VILLAGE_EVENTS.filter(
      event =>
        event.type !== 'emergency' &&                          // emergency 제외
        !history.triggeredIds.includes(event.id) &&           // 오늘 이미 발생 제외
        isEventAllowedThisMonth(event),                       // 달 제한 통과
    );

    if (candidates.length === 0) {
      if (__DEV__) console.log('[useVillageEvents] 발생 가능한 이벤트 없음');
      return;
    }

    // 랜덤 선택
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    const now = Date.now();

    // 히스토리 업데이트
    history.triggeredIds = [...history.triggeredIds, selected.id];
    history.activeEventId = selected.id;
    history.activeEventStartTime = now;
    await saveHistory(history);

    // 상태 업데이트
    const updatedHistory = [...eventHistory, selected];

    if (isMountedRef.current) {
      setActiveEvent(selected);
      setEventHistory(updatedHistory);
      setTodayEventCount(history.triggeredIds.length);
    }

    if (__DEV__) {
      console.log(`[useVillageEvents] 새 이벤트 발생: ${selected.title} (${selected.duration}분)`);
    }

    // duration 후 자동 종료
    setTimeout(() => {
      if (isMountedRef.current) {
        setActiveEvent(current => (current?.id === selected.id ? null : current));
        if (__DEV__) console.log(`[useVillageEvents] 이벤트 종료: ${selected.title}`);
      }
    }, selected.duration * 60 * 1000);
  }, [activeEvent, prosperityLevel, eventHistory]);

  // 30분 간격 체크 루프
  useEffect(() => {
    // 마운트 직후 첫 체크 (약간 딜레이 — 데이터 로드 완료 후)
    const firstCheckTimeout = setTimeout(() => {
      checkAndTriggerEvent();
    }, 5000);

    checkTimerRef.current = setInterval(() => {
      checkAndTriggerEvent();
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(firstCheckTimeout);
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
      }
    };
  }, [checkAndTriggerEvent]);

  // ── 외부 트리거: 특정 이벤트 강제 발동 ────────────────────────────────

  /**
   * triggerEvent — 이벤트 ID로 강제 발동
   * emergency 이벤트(시장 급락 등)를 외부에서 트리거할 때 사용
   */
  const triggerEvent = useCallback(async (eventId: string) => {
    const event = VILLAGE_EVENTS.find(e => e.id === eventId);
    if (!event) {
      if (__DEV__) console.warn(`[useVillageEvents] triggerEvent: 이벤트를 찾을 수 없음 — ${eventId}`);
      return;
    }

    const now = Date.now();
    const history = await loadHistory();

    // 이미 오늘 발생한 이벤트도 강제 발동 가능 (emergency 특성상)
    if (!history.triggeredIds.includes(eventId)) {
      history.triggeredIds = [...history.triggeredIds, eventId];
    }
    history.activeEventId = eventId;
    history.activeEventStartTime = now;
    await saveHistory(history);

    if (isMountedRef.current) {
      setActiveEvent(event);
      setEventHistory(prev => {
        const alreadyIn = prev.some(e => e.id === eventId);
        return alreadyIn ? prev : [...prev, event];
      });
      setTodayEventCount(history.triggeredIds.length);
    }

    if (__DEV__) {
      console.log(`[useVillageEvents] 강제 이벤트 발동: ${event.title}`);
    }

    // duration 후 자동 종료
    setTimeout(() => {
      if (isMountedRef.current) {
        setActiveEvent(current => (current?.id === eventId ? null : current));
        if (__DEV__) console.log(`[useVillageEvents] 강제 이벤트 종료: ${event.title}`);
      }
    }, event.duration * 60 * 1000);
  }, []);

  // ── 이벤트 조기 종료 ───────────────────────────────────────────────────

  const dismissEvent = useCallback(async () => {
    if (!activeEvent) return;

    const history = await loadHistory();
    history.activeEventId = undefined;
    history.activeEventStartTime = undefined;
    await saveHistory(history);

    if (isMountedRef.current) {
      setActiveEvent(null);
    }

    if (__DEV__) {
      console.log(`[useVillageEvents] 이벤트 조기 종료: ${activeEvent.title}`);
    }
  }, [activeEvent]);

  // ── 반환 ─────────────────────────────────────────────────────────────────

  return {
    activeEvent,
    eventHistory,
    todayEventCount,
    triggerEvent,
    dismissEvent,
  };
}
