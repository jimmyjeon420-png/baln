/**
 * useMarketTriggerEvents — 시장 상황 기반 마을 이벤트 감지 훅
 *
 * 역할: "마을 기상청" — 시장 상황에 따라 특별 이벤트 발동
 * 비유: 날씨처럼, 시장 상황에 따라 마을 분위기가 변하는 시스템
 *
 * 사용처:
 * - 마을 탭: 시장 이벤트 배너 표시
 * - 마을 배경: 특수 데코레이션 적용
 */

import { useMemo } from 'react';
import { MARKET_TRIGGER_EVENTS } from '../data/marketTriggerConfig';
import type { MarketTriggerEvent } from '../data/marketTriggerConfig';

// ============================================================================
// Types
// ============================================================================

export interface UseMarketTriggerEventsReturn {
  /** 현재 활성 시장 이벤트 목록 */
  activeEvents: MarketTriggerEvent[];
  /** 활성 이벤트가 있는지 */
  hasActiveEvent: boolean;
  /** 메인 이벤트 (우선순위 가장 높은 것) */
  mainEvent: MarketTriggerEvent | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * @param marketChange24h - 24시간 시장 변동률 (%) (예: -5.2)
 */
export function useMarketTriggerEvents(
  marketChange24h: number = 0,
): UseMarketTriggerEventsReturn {
  const activeEvents = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    return MARKET_TRIGGER_EVENTS.filter(event => {
      const schedule = event.schedule;

      if (schedule.type === 'months') {
        return schedule.months.includes(month);
      }

      if (schedule.type === 'month_range') {
        const current = month * 100 + day;
        const start = schedule.startMonth * 100 + schedule.startDay;
        const end = schedule.endMonth * 100 + schedule.endDay;
        if (start > end) {
          return current >= start || current <= end;
        }
        return current >= start && current <= end;
      }

      if (schedule.type === 'condition') {
        if (schedule.condition === 'market_crash') {
          return marketChange24h <= -3;
        }
        if (schedule.condition === 'bull_run') {
          return marketChange24h >= 3;
        }
      }

      return false;
    });
  }, [marketChange24h]);

  return {
    activeEvents,
    hasActiveEvent: activeEvents.length > 0,
    mainEvent: activeEvents[0] || null,
  };
}
