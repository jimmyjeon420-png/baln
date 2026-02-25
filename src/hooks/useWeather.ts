/**
 * useWeather — 마을 날씨 상태 관리 훅
 *
 * 역할: "기상 관측소" — 실제 날씨 + 시장 무드를 블렌딩한 마을 날씨 제공
 * - 실제 날씨 API 호출 (30분 캐시)
 * - API 실패 시 시뮬레이션 날씨 폴백
 * - 기온에 따른 구루 의상 레벨 자동 계산
 *
 * 사용처:
 * - 마을 탭: 배경 날씨 렌더링 + 구루 의상
 * - 오늘 탭: WeatherBadge 표시
 * - useGuruMood: 날씨 → 구루 감정 입력
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VillageWeather, ClothingLevel } from '../types/village';
import {
  fetchWeather,
  getCachedWeather,
  getSimulatedWeather,
  getClothingLevel,
} from '../services/weatherService';

/** 자동 갱신 주기: 30분 (ms) */
const REFRESH_INTERVAL = 30 * 60 * 1000;

export interface UseWeatherReturn {
  /** 현재 마을 날씨 (null = 아직 로딩 안 됨) */
  weather: VillageWeather | null;
  /** 구루 의상 레벨 (기온 기반) */
  clothingLevel: ClothingLevel;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 메시지 (있다면) */
  error: string | null;
  /** 수동 새로고침 */
  refresh: () => Promise<void>;
}

export function useWeather(): UseWeatherReturn {
  const [weather, setWeather] = useState<VillageWeather | null>(null);
  const [clothingLevel, setClothingLevel] = useState<ClothingLevel>('normal'); // 기본: 쾌적
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  /**
   * 날씨 데이터로부터 의상 레벨 추출
   * weatherService가 clothingLevel을 포함할 수도 있고 아닐 수도 있으므로
   * 없으면 temperature로부터 계산
   */
  const extractClothingLevel = useCallback((w: VillageWeather): ClothingLevel => {
    // weatherService가 확장 필드를 포함할 수 있음 (타입에 없어도 런타임에 존재)
    const extended = w as VillageWeather & { clothingLevel?: ClothingLevel };
    if (extended.clothingLevel) return extended.clothingLevel;
    return getClothingLevel(w.temperature);
  }, []);

  // 날씨 데이터 로드 (캐시 → API → 시뮬레이션 순서)
  const loadWeather = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1단계: 캐시 확인
      const cached = await getCachedWeather();
      if (cached) {
        if (isMountedRef.current) {
          setWeather(cached);
          setClothingLevel(extractClothingLevel(cached));
          setIsLoading(false);
        }
        // 캐시 유효 — API 호출 스킵
        return;
      }

      // 2단계: 실제 API 호출
      try {
        const realWeather = await fetchWeather();
        if (isMountedRef.current) {
          setWeather(realWeather);
          setClothingLevel(extractClothingLevel(realWeather));
        }
        if (__DEV__) console.log('[useWeather] 실제 날씨 로드 완료:', realWeather.condition, realWeather.temperature + '\u00B0C');
        return;
      } catch (apiError) {
        if (__DEV__) console.warn('[useWeather] API 호출 실패, 시뮬레이션으로 폴백:', apiError);
      }

      // 3단계: 시뮬레이션 폴백 (API 실패 시)
      const simulated = getSimulatedWeather();
      if (isMountedRef.current) {
        setWeather(simulated);
        setClothingLevel(extractClothingLevel(simulated));
        setError('날씨 데이터를 가져올 수 없어 시뮬레이션 중입니다');
      }
      if (__DEV__) console.log('[useWeather] 시뮬레이션 날씨 사용:', simulated.condition);
    } catch (unexpectedError) {
      if (__DEV__) console.error('[useWeather] 예상치 못한 에러:', unexpectedError);
      if (isMountedRef.current) {
        setError('날씨 데이터를 불러올 수 없습니다');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [extractClothingLevel]);

  // 수동 새로고침 (캐시 무시하고 API 재호출)
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const realWeather = await fetchWeather();
      if (isMountedRef.current) {
        setWeather(realWeather);
        setClothingLevel(extractClothingLevel(realWeather));
      }
    } catch {
      // API 실패 시 시뮬레이션 폴백
      const simulated = getSimulatedWeather();
      if (isMountedRef.current) {
        setWeather(simulated);
        setClothingLevel(extractClothingLevel(simulated));
        setError('날씨 새로고침 실패, 시뮬레이션 사용 중');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [extractClothingLevel]);

  // loadWeather를 ref로 보관 — 최신 버전을 쓰되 useEffect deps에서 제외 (무한 루프 방지)
  const loadWeatherRef = useRef(loadWeather);
  useEffect(() => { loadWeatherRef.current = loadWeather; }, [loadWeather]);

  // 마운트 시 초기 로드 + 30분 간격 자동 갱신 ([] — 한 번만 실행)
  useEffect(() => {
    isMountedRef.current = true;
    loadWeatherRef.current();

    refreshTimerRef.current = setInterval(() => {
      loadWeatherRef.current();
    }, REFRESH_INTERVAL);

    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
    // loadWeather는 loadWeatherRef를 통해 접근 — deps 제외하여 무한 루프 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    weather,
    clothingLevel,
    isLoading,
    error,
    refresh,
  };
}
