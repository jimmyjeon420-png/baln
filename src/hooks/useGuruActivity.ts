/**
 * useGuruActivity — 구루 활동 상태 관리 훅
 *
 * 역할: "마을 활동 코디네이터" — 각 구루가 지금 무엇을 하고 있는지 결정하고 추적
 * - 시간표(guruScheduleConfig)에서 현재 시간대 기본 활동 가져오기
 * - 기분(mood)과 날씨(weather)로 가중치 보정 후 selectActivity() 선택
 * - 활동 지속 시간 추적, 만료 시 자동 전환
 * - 너무 빠른 전환 방지 (최소 2분 간격)
 * - 30초마다 만료 여부 체크
 *
 * 비유: "구루 스케줄 매니저" — 버핏은 아침에 독서, 낮에 체스, 하지만
 *       기분이 너무 좋으면 갑자기 춤을 추기도 하는 살아있는 느낌
 *
 * 사용처:
 * - 마을 탭: 구루 머리 위 활동 말풍선 표시
 * - 구루 상세: "지금 뭐 하고 있어요" 상태 표시
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GuruActivity, GuruMood, VillageWeather } from '../types/village';
import {
  selectActivity,
  getActivityEmoji,
  getActivityDescription,
  getActivityDuration,
} from '../services/activityService';
import { getGuruScheduleAt } from '../data/guruScheduleConfig';
import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';

// ============================================================================
// 타입
// ============================================================================

export interface GuruActivityState {
  guruId: string;
  /** 현재 진행 중인 활동 */
  activity: GuruActivity;
  /** 활동 시작 시각 (Unix timestamp ms) */
  startedAt: number;
  /** 활동 예정 지속 시간 (분) */
  duration: number;
  /** 활동 이모지 (예: "📖", "🚶") */
  emoji: string;
  /** 활동 설명 텍스트 */
  description: { ko: string; en: string };
}

// ============================================================================
// 상수
// ============================================================================

/** 활동 만료 체크 주기: 30초 */
const CHECK_INTERVAL_MS = 30 * 1000;

/** 최소 활동 유지 시간: 2분 (너무 잦은 전환 방지) */
const MIN_ACTIVITY_DURATION_MS = 2 * 60 * 1000;

/** 사용자 로컬 시간 반환 (0~23) */
function getKSTHour(): number {
  return new Date().getHours();
}

/** 구루 전체 ID 목록 */
const ALL_GURU_IDS = Object.keys(GURU_CHARACTER_CONFIGS);

// ============================================================================
// 반환 타입
// ============================================================================

export interface UseGuruActivityReturn {
  /** 전체 구루 활동 맵 (guruId → GuruActivityState) */
  activities: Map<string, GuruActivityState>;
  /** 특정 구루 활동 조회 */
  getActivity: (guruId: string) => GuruActivityState | null;
  /** 수동 갱신 (강제로 모든 구루 활동 재결정) */
  refresh: () => void;
}

// ============================================================================
// 훅
// ============================================================================

export function useGuruActivity(
  moods: Map<string, GuruMood> | null,
  weather: VillageWeather | null,
): UseGuruActivityReturn {
  const [activities, setActivities] = useState<Map<string, GuruActivityState>>(new Map());
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * 단일 구루의 새 활동 결정
   *
   * 우선순위:
   * 1. 현재 활동이 아직 유효하면 유지 (최소 2분 + duration 내)
   * 2. 시간표(schedule)의 기본 활동을 preference로 활용
   * 3. mood/weather 보정 후 selectActivity() 로 최종 결정
   */
  const computeActivityForGuru = useCallback(
    (
      guruId: string,
      current: GuruActivityState | undefined,
      now: number,
    ): GuruActivityState => {
      const kstHour = getKSTHour();
      const mood = moods?.get(guruId) ?? 'calm';

      // 현재 활동이 아직 유효한지 확인
      if (current) {
        const elapsed = now - current.startedAt;
        const durationMs = current.duration * 60 * 1000;

        // 최소 유지 시간 & duration 내라면 유지
        if (elapsed < MIN_ACTIVITY_DURATION_MS || elapsed < durationMs) {
          return current;
        }
      }

      // 날씨 없으면 기본 폴백
      if (!weather) {
        const fallbackActivity: GuruActivity = 'walking';
        return {
          guruId,
          activity: fallbackActivity,
          startedAt: now,
          duration: getActivityDuration(fallbackActivity),
          emoji: getActivityEmoji(fallbackActivity),
          description: getActivityDescription(fallbackActivity),
        };
      }

      // 시간표에서 이 시간대의 "기본 선호 활동" 조회
      const scheduleEntry = getGuruScheduleAt(guruId, kstHour);
      const preferredActivity = scheduleEntry?.activity;

      // selectActivity()로 최종 활동 결정
      // preferredActivity를 currentActivity 자리에 넘겨서 "이걸 우선하되 변화 가능"하게 함
      const selected = selectActivity(
        guruId,
        mood,
        weather,
        kstHour,
        // 이전 활동이 있으면 그것을 "연속 방지" 대상으로 전달
        // 스케줄 활동과 이전 활동이 같으면 연속 방지가 자연스럽게 동작
        current?.activity ?? preferredActivity,
      );

      return {
        guruId,
        activity: selected,
        startedAt: now,
        duration: getActivityDuration(selected),
        emoji: getActivityEmoji(selected),
        description: getActivityDescription(selected),
      };
    },
    [moods, weather],
  );

  /**
   * 모든 구루 활동 한꺼번에 갱신
   * expired된 활동만 새로 결정하고, 유효한 활동은 그대로 유지
   */
  const updateActivities = useCallback(
    (forceAll = false) => {
      const now = Date.now();

      setActivities(prev => {
        const next = new Map(prev);
        let changed = false;

        for (const guruId of ALL_GURU_IDS) {
          const current = prev.get(guruId);

          // forceAll = true 이면 current를 undefined로 넘겨 강제 재결정
          const newState = computeActivityForGuru(
            guruId,
            forceAll ? undefined : current,
            now,
          );

          // 실제로 활동이 바뀌었을 때만 Map 업데이트
          if (!current || current.activity !== newState.activity || current.startedAt !== newState.startedAt) {
            next.set(guruId, newState);
            changed = true;

            if (__DEV__ && forceAll === false) {
              console.log(
                `[useGuruActivity] ${guruId}: ${current?.activity ?? 'none'} → ${newState.activity} (${newState.description.ko})`,
              );
            }
          }
        }

        return changed ? next : prev;
      });
    },
    [computeActivityForGuru],
  );

  // 초기 로드 (mood와 weather가 준비되면 즉시 결정)
  useEffect(() => {
    if (!weather || !moods) return;
    updateActivities(true);
  }, [weather, moods, updateActivities]);

  // 30초 간격으로 만료된 활동 교체
  useEffect(() => {
    checkTimerRef.current = setInterval(() => {
      updateActivities(false);
    }, CHECK_INTERVAL_MS);

    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
      }
    };
  }, [updateActivities]);

  // 특정 구루 활동 조회
  const getActivity = useCallback(
    (guruId: string): GuruActivityState | null => {
      return activities.get(guruId) ?? null;
    },
    [activities],
  );

  // 수동 강제 갱신
  const refresh = useCallback(() => {
    updateActivities(true);
  }, [updateActivities]);

  return {
    activities,
    getActivity,
    refresh,
  };
}
