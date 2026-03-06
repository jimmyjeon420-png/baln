/**
 * AmbientSoundText — 마을 사운드스케이프 (텍스트 기반)
 *
 * 역할: "마을 환경음 자막" — 실제 사운드 대신 은은한 텍스트로
 *       마을의 분위기를 전달 (새소리, 빗소리, 귀뚜라미 등)
 *
 * 비유: 동물의숲에서 마을 배경에 들리는 환경음을
 *       텍스트로 시각화한 것 — 눈으로 듣는 소리
 *
 * 동작: 15초 주기로 텍스트가 바뀜
 *       2s 페이드인 → 8s 표시 → 2s 페이드아웃 → 3s 대기 → 반복
 *
 * 사용처:
 * - app/(tabs)/village.tsx 마을 씬 상단 오버레이
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, Animated } from 'react-native';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

// =============================================================================
// 타입 정의
// =============================================================================

interface AmbientSoundTextProps {
  /** 현재 날씨 상태 */
  weather?: string; // 'clear' | 'rain' | 'snow' | etc.
  /** 현재 시간대 */
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
  /** 계절 */
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  /** 테마 색상 */
  colors: ThemeColors;
}

// =============================================================================
// 환경음 텍스트 풀 (날씨 + 시간대 + 계절 조합)
// =============================================================================

/** i18n key groups per category */
const AMBIENT_SOUND_KEYS: Record<string, string[]> = {
  clear_morning: ['ambient.clear_morning_0', 'ambient.clear_morning_1'],
  clear_night: ['ambient.clear_night_0', 'ambient.clear_night_1'],
  rain: ['ambient.rain_0', 'ambient.rain_1'],
  snow: ['ambient.snow_0', 'ambient.snow_1'],
  spring: ['ambient.spring_0'],
  summer: ['ambient.summer_0'],
  autumn: ['ambient.autumn_0'],
  default: ['ambient.default_0', 'ambient.default_1'],
};

// =============================================================================
// 환경음 텍스트 선택 헬퍼
// =============================================================================

/**
 * 현재 상태에 맞는 환경음 텍스트 풀을 조합하여 반환
 */
function getSoundKeyPool(
  weather?: string,
  timeOfDay?: string,
  season?: string,
): string[] {
  const pool: string[] = [];

  // 날씨 기반 텍스트
  if (weather === 'rain') {
    pool.push(...AMBIENT_SOUND_KEYS.rain);
  } else if (weather === 'snow') {
    pool.push(...AMBIENT_SOUND_KEYS.snow);
  } else {
    // clear 계열 — 시간대에 따라 분기
    const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
    const key = isNight ? 'clear_night' : 'clear_morning';
    pool.push(...AMBIENT_SOUND_KEYS[key]);
  }

  // 계절 기반 텍스트 추가
  if (season && AMBIENT_SOUND_KEYS[season]) {
    pool.push(...AMBIENT_SOUND_KEYS[season]);
  }

  // 기본 텍스트 항상 포함
  pool.push(...AMBIENT_SOUND_KEYS.default);

  return pool;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function AmbientSoundText({
  weather,
  timeOfDay,
  season,
  colors,
}: AmbientSoundTextProps): React.ReactElement {
  const { t } = useLocale();
  const opacity = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  // 현재 조건에 맞는 사운드 i18n 키 풀
  const soundKeyPool = useMemo(
    () => getSoundKeyPool(weather, timeOfDay, season),
    [weather, timeOfDay, season],
  );

  // 15초 주기 사이클: 2s 페이드인 → 8s 표시 → 2s 페이드아웃 → 3s 대기
  useEffect(() => {
    let isMounted = true;

    const runCycle = () => {
      if (!isMounted) return;

      // 페이드인 (2s → 최대 opacity 0.4)
      Animated.timing(opacity, {
        toValue: 0.4,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => {
        if (!isMounted) return;

        // 8초 표시 유지
        setTimeout(() => {
          if (!isMounted) return;

          // 페이드아웃 (2s)
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }).start(() => {
            if (!isMounted) return;

            // 3초 대기 후 다음 텍스트로 전환
            setTimeout(() => {
              if (!isMounted) return;
              setCurrentIndex((prev) => (prev + 1) % soundKeyPool.length);
              runCycle();
            }, 3000);
          });
        }, 8000);
      });
    };

    runCycle();

    return () => {
      isMounted = false;
    };
    // soundKeyPool.length가 바뀔 때만 사이클 재시작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundKeyPool.length]);

  // 안전한 인덱스 계산
  const safeIndex = currentIndex % soundKeyPool.length;
  const currentKey = soundKeyPool[safeIndex];
  const displayText = currentKey ? t(currentKey) : '';

  return (
    <Animated.Text
      style={[
        styles.ambientText,
        {
          color: colors.textTertiary,
          opacity,
        },
      ]}
      numberOfLines={1}
    >
      {displayText}
    </Animated.Text>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  ambientText: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    fontSize: 11,
    fontStyle: 'italic',
  },
});

export default AmbientSoundText;
