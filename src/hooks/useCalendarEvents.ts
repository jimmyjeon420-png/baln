/**
 * useCalendarEvents — 현재 활성 캘린더 이벤트 감지 훅
 *
 * 역할: "마을 달력 확인관" — 오늘 날짜에 해당하는 이벤트를 반환
 * 비유: 동물의숲에서 시계를 보고 "오늘은 벚꽃 축제!" 알려주는 시스템
 *
 * 사용처:
 * - 마을 탭: 이벤트 배너 표시
 * - 마을 배경: 데코레이션 테마 변경
 */

import { useMemo } from 'react';
import { CALENDAR_EVENTS } from '../data/calendarEventsConfig';
import type { CalendarEvent } from '../data/calendarEventsConfig';

// ============================================================================
// Hook
// ============================================================================

export interface UseCalendarEventsReturn {
  /** 현재 활성 이벤트 목록 */
  activeEvents: CalendarEvent[];
  /** 활성 이벤트가 있는지 */
  hasActiveEvent: boolean;
  /** 메인 이벤트 (첫 번째 활성 이벤트) */
  mainEvent: CalendarEvent | null;
}

export function useCalendarEvents(): UseCalendarEventsReturn {
  const activeEvents = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    return CALENDAR_EVENTS.filter(event => isDateInRange(month, day, event));
  }, []);

  return {
    activeEvents,
    hasActiveEvent: activeEvents.length > 0,
    mainEvent: activeEvents[0] || null,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function isDateInRange(month: number, day: number, event: CalendarEvent): boolean {
  const currentValue = month * 100 + day;
  const startValue = event.startMonth * 100 + event.startDay;
  const endValue = event.endMonth * 100 + event.endDay;

  // Handle year-wrapping events (e.g., Dec 20 - Jan 3)
  if (startValue > endValue) {
    return currentValue >= startValue || currentValue <= endValue;
  }

  return currentValue >= startValue && currentValue <= endValue;
}
