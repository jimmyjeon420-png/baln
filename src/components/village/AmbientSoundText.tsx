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
import { Text, StyleSheet, Animated } from 'react-native';

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
  colors: any;
  /** 로케일 (ko/en) */
  locale: string;
}

// =============================================================================
// 환경음 텍스트 풀 (날씨 + 시간대 + 계절 조합)
// =============================================================================

interface SoundText {
  ko: string;
  en: string;
}

const AMBIENT_SOUNDS: Record<string, SoundText[]> = {
  // 날씨 기반
  clear_morning: [
    { ko: '...새가 지저귄다 \uD83D\uDC26', en: '...birds are singing \uD83D\uDC26' },
    { ko: '...바람이 살랑인다 \uD83C\uDF43', en: '...a gentle breeze blows \uD83C\uDF43' },
  ],
  clear_night: [
    { ko: '...귀뚜라미 소리 \uD83E\uDD97', en: '...crickets chirping \uD83E\uDD97' },
    { ko: '...별이 반짝인다 \u2728', en: '...stars are twinkling \u2728' },
  ],
  rain: [
    { ko: '...빗소리가 들린다 \uD83C\uDF27', en: '...rain is falling \uD83C\uDF27' },
    { ko: '...빗방울이 토닥토닥 \uD83D\uDCA7', en: '...raindrops patter softly \uD83D\uDCA7' },
  ],
  snow: [
    { ko: '...눈이 소복소복 \u2744\uFE0F', en: '...snow falls silently \u2744\uFE0F' },
    { ko: '...고요한 겨울밤 \uD83C\uDF28', en: '...a quiet winter night \uD83C\uDF28' },
  ],
  // 계절 기반
  spring: [
    { ko: '...꽃향기가 난다 \uD83C\uDF38', en: '...flowers bloom fragrant \uD83C\uDF38' },
  ],
  summer: [
    { ko: '...매미 소리 \uD83C\uDF3F', en: '...cicadas buzzing \uD83C\uDF3F' },
  ],
  autumn: [
    { ko: '...낙엽 바스락 \uD83C\uDF42', en: '...leaves crunching \uD83C\uDF42' },
  ],
  // 기본
  default: [
    { ko: '...마을이 평화롭다', en: '...the village is peaceful' },
    { ko: '...구루들의 속삭임', en: '...gurus whispering' },
  ],
};

// =============================================================================
// 환경음 텍스트 선택 헬퍼
// =============================================================================

/**
 * 현재 상태에 맞는 환경음 텍스트 풀을 조합하여 반환
 */
function getSoundPool(
  weather?: string,
  timeOfDay?: string,
  season?: string,
): SoundText[] {
  const pool: SoundText[] = [];

  // 날씨 기반 텍스트
  if (weather === 'rain') {
    pool.push(...AMBIENT_SOUNDS.rain);
  } else if (weather === 'snow') {
    pool.push(...AMBIENT_SOUNDS.snow);
  } else {
    // clear 계열 — 시간대에 따라 분기
    const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
    const key = isNight ? 'clear_night' : 'clear_morning';
    pool.push(...AMBIENT_SOUNDS[key]);
  }

  // 계절 기반 텍스트 추가
  if (season && AMBIENT_SOUNDS[season]) {
    pool.push(...AMBIENT_SOUNDS[season]);
  }

  // 기본 텍스트 항상 포함
  pool.push(...AMBIENT_SOUNDS.default);

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
  locale,
}: AmbientSoundTextProps): React.ReactElement {
  const isKo = locale === 'ko';
  const opacity = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  // 현재 조건에 맞는 사운드 텍스트 풀
  const soundPool = useMemo(
    () => getSoundPool(weather, timeOfDay, season),
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
              setCurrentIndex((prev) => (prev + 1) % soundPool.length);
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
    // soundPool.length가 바뀔 때만 사이클 재시작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundPool.length]);

  // 안전한 인덱스 계산
  const safeIndex = currentIndex % soundPool.length;
  const currentText = soundPool[safeIndex];
  const displayText = currentText
    ? (isKo ? currentText.ko : currentText.en)
    : '';

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
