/**
 * useGuruMood — 구루 감정 상태 관리 훅
 *
 * 역할: "마을 감정 기상대" — 10명 구루 각각의 기분을 시장+날씨 기반으로 계산
 * - 시장 센티먼트 + 날씨 → 구루별 개별 감정 계산
 * - 구루 간 감정 전이 (emotional contagion) 적용
 * - 5분 간격으로 감정 업데이트 (급격한 변화 방지)
 *
 * 비유: 동물의숲에서 주민이 날씨나 다른 주민에 따라 기분이 바뀌는 것
 *       버핏은 폭풍에도 침착하고, 세일러는 비트코인에만 반응
 *
 * 사용처:
 * - 마을 탭: 구루 표정 + 활동 결정
 * - 구루 상세: 현재 감정 표시
 * - 대화 시스템: 감정에 따른 대화 톤 조절
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { GuruMood, VillageWeather } from '../types/village';
import {
  calculateGuruMood,
  applyEmotionalContagion,
  moodToExpression,
  getMoodEmoji,
} from '../services/moodEngine';
import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';
import type { CharacterExpression } from '../types/character';

/** 감정 업데이트 주기: 5분 (ms) */
const MOOD_UPDATE_INTERVAL = 5 * 60 * 1000;

/** 10명 구루 ID */
const ALL_GURU_IDS = Object.keys(GURU_CHARACTER_CONFIGS);

/** KST 현재 시각 (0~23) */
function getKSTHour(): number {
  const now = new Date();
  const utcHour = now.getUTCHours();
  return (utcHour + 9) % 24;
}

// ============================================================================
// 훅
// ============================================================================

export interface UseGuruMoodReturn {
  /** 전체 구루 감정 맵 (guruId → GuruMood) */
  moods: Record<string, GuruMood>;
  /** 특정 구루 감정 조회 */
  getMood: (guruId: string) => GuruMood;
  /** 특정 구루 감정 이모지 */
  getMoodEmojiForGuru: (guruId: string) => string;
  /** 특정 구루의 CharacterExpression 변환 */
  getExpression: (guruId: string) => CharacterExpression;
  /** 수동 갱신 */
  refresh: () => void;
}

/** 기본 감정 (데이터 없을 때) */
const DEFAULT_MOOD: GuruMood = 'calm';

export function useGuruMood(
  marketSentiment: number,
  weather: VillageWeather | null,
): UseGuruMoodReturn {
  const [moods, setMoods] = useState<Record<string, GuruMood>>({});
  const updateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSentimentRef = useRef(marketSentiment);
  const prevWeatherCondRef = useRef<string | undefined>(undefined);

  // 전체 구루 감정 계산 함수
  const computeAllMoods = useCallback(() => {
    if (!weather) return;

    const timeOfDay = getKSTHour();

    // 1단계: 각 구루의 개별 감정 계산 (시장 + 날씨 + 시간 기반)
    const individualMoods: Record<string, GuruMood> = {};
    for (const guruId of ALL_GURU_IDS) {
      try {
        individualMoods[guruId] = calculateGuruMood(
          guruId,
          marketSentiment,
          weather,
          timeOfDay,
        );
      } catch {
        individualMoods[guruId] = DEFAULT_MOOD;
      }
    }

    // 2단계: 감정 전이 (nearby 구루끼리 영향)
    // applyEmotionalContagion 은 개별 구루에 적용하므로 루프
    const finalMoods: Record<string, GuruMood> = {};
    for (const guruId of ALL_GURU_IDS) {
      try {
        // 주변 구루 정보 (마을에서는 모든 구루가 비교적 가까움)
        const nearbyGurus = ALL_GURU_IDS
          .filter(id => id !== guruId)
          .map(id => ({
            guruId: id,
            mood: individualMoods[id] || DEFAULT_MOOD,
            distance: 0.15 + Math.random() * 0.1, // 가까운 거리 시뮬레이션
          }));

        finalMoods[guruId] = applyEmotionalContagion(
          guruId,
          individualMoods[guruId],
          nearbyGurus,
        );
      } catch {
        finalMoods[guruId] = individualMoods[guruId] || DEFAULT_MOOD;
      }
    }

    setMoods(finalMoods);

    if (__DEV__) {
      const moodSummary = Object.entries(finalMoods)
        .slice(0, 5) // 로그 줄이기 — 상위 5명만
        .map(([id, m]) => `${id}:${m}`)
        .join(', ');
      console.log(`[useGuruMood] 감정 업데이트 → ${moodSummary}...`);
    }
  }, [marketSentiment, weather]);

  // 초기 계산 + 입력 변경 시 재계산
  useEffect(() => {
    if (!weather) return;

    // 시장 센티먼트나 날씨가 의미 있게 변했을 때만 재계산
    const sentimentChanged = Math.abs(marketSentiment - prevSentimentRef.current) > 0.5;
    const weatherChanged = weather.condition !== prevWeatherCondRef.current;

    if (sentimentChanged || weatherChanged || Object.keys(moods).length === 0) {
      computeAllMoods();
      prevSentimentRef.current = marketSentiment;
      prevWeatherCondRef.current = weather.condition;
    }
  }, [marketSentiment, weather, computeAllMoods]);

  // 5분 간격 자동 업데이트 (미세한 감정 변동)
  useEffect(() => {
    updateTimerRef.current = setInterval(() => {
      computeAllMoods();
    }, MOOD_UPDATE_INTERVAL);

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [computeAllMoods]);

  // 특정 구루 감정 조회
  const getMood = useCallback((guruId: string): GuruMood => {
    return moods[guruId] || DEFAULT_MOOD;
  }, [moods]);

  // 특정 구루 감정 이모지
  const getMoodEmojiForGuru = useCallback((guruId: string): string => {
    const mood = moods[guruId] || DEFAULT_MOOD;
    return getMoodEmoji(mood);
  }, [moods]);

  // CharacterExpression 변환 (기존 4표정 체계와 호환)
  const getExpression = useCallback((guruId: string): CharacterExpression => {
    const mood = moods[guruId] || DEFAULT_MOOD;
    return moodToExpression(mood);
  }, [moods]);

  // 수동 갱신
  const refresh = useCallback(() => {
    computeAllMoods();
  }, [computeAllMoods]);

  return {
    moods,
    getMood,
    getMoodEmojiForGuru,
    getExpression,
    refresh,
  };
}
