/**
 * useGuruStyle — 구루 투자 철학 전역 상태 관리
 *
 * 역할: 사용자가 선택한 투자 거장(구루)을 AsyncStorage에 영구 저장하고
 *      앱 전역에서 일관되게 사용할 수 있도록 관리합니다.
 *
 * 지원 구루:
 * - dalio: 레이 달리오 — All Weather (분산·안정)
 * - buffett: 워렌 버핏 — Berkshire (주식·현금)
 * - cathie_wood: 캐시우드 — ARK Invest (혁신·크립토)
 * (코스톨라니 시장 사이클은 3구루 목표 배분에 25% 자동 반영)
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GURU_KEY = '@baln:guru_style';

export type GuruStyle = 'dalio' | 'buffett' | 'cathie_wood';

const VALID_GURU_STYLES: GuruStyle[] = ['dalio', 'buffett', 'cathie_wood'];

/** 구루별 표시 이름 */
export const GURU_DISPLAY_NAME: Record<GuruStyle, string> = {
  dalio: '🌊 달리오 All Weather',
  buffett: '🔴 버핏 Berkshire',
  cathie_wood: '🚀 캐시우드 ARK',
};

/**
 * 구루 스타일 훅
 * - 앱 시작 시 AsyncStorage에서 저장된 구루 스타일을 로드
 * - setGuruStyle 호출 시 즉시 상태 업데이트 + AsyncStorage 저장
 */
export function useGuruStyle() {
  const [guruStyle, setGuruStyleState] = useState<GuruStyle>('dalio');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GURU_KEY).then(v => {
      if (v && VALID_GURU_STYLES.includes(v as GuruStyle)) {
        setGuruStyleState(v as GuruStyle);
      }
      setLoaded(true);
    }).catch(() => {
      setLoaded(true);
    });
  }, []);

  const setGuruStyle = useCallback(async (style: GuruStyle) => {
    setGuruStyleState(style);
    try {
      // @baln:guru_style + @investment_philosophy 동시 동기화
      // → AllocationDriftSection이 @investment_philosophy를 우선 읽으므로 반드시 함께 업데이트
      await AsyncStorage.multiSet([
        [GURU_KEY, style],
        ['@investment_philosophy', style],
      ]);
    } catch (err) {
      console.warn('[useGuruStyle] 저장 실패:', err);
    }
  }, []);

  return { guruStyle, setGuruStyle, loaded };
}
