/**
 * VillageWeatherBackground
 *
 * 역할: "마을 하늘 배경" — 시간대 + 날씨에 따라 마을 뷰 전체 배경을 동적으로 바꿔주는 컴포넌트
 * 비유: 동물의숲에서 아침/저녁/밤이 되면 하늘 색이 바뀌고, 비 올 때 빗방울이 내리는 효과
 *
 * 구현 원칙:
 * - 외부 이미지 없음 — 순수 View + Animated + 이모지 파티클
 * - 네이티브 드라이버 사용으로 JS 스레드 부담 최소화
 * - 기상 변화 시 0.8초 부드러운 크로스페이드 전환
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, RadialGradient } from 'react-native-svg';
import type { VillageWeather } from '../../types/village';
import type { ThemeColors } from '../../styles/colors';

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

interface VillageWeatherBackgroundProps {
  weather: VillageWeather | null;
  timeOfDay: TimeOfDay;
  colors: ThemeColors;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// 시간대별 하늘 색상 (그라데이션 느낌을 배경색 1개로 표현)
// ---------------------------------------------------------------------------

const SKY_COLORS: Record<TimeOfDay, { top: string; bottom: string }> = {
  dawn: { top: '#FF8C5A', bottom: '#F6B58A' },        // 따뜻한 오렌지 핑크 (여명)
  morning: { top: '#AED6F1', bottom: '#DDF2FF' },     // 연한 하늘색 (아침)
  afternoon: { top: '#5DADE2', bottom: '#B7E4FF' },   // 밝은 하늘색 (낮)
  evening: { top: '#D4788A', bottom: '#F2B37D' },     // 오렌지-핑크-보라 (저녁노을)
  night: { top: '#0D1B2A', bottom: '#21364E' },       // 깊은 네이비 (밤)
};

const HORIZON_TINT: Record<TimeOfDay, string> = {
  dawn: 'rgba(255, 220, 170, 0.25)',
  morning: 'rgba(255, 255, 255, 0.15)',
  afternoon: 'rgba(255, 255, 255, 0.08)',
  evening: 'rgba(255, 185, 120, 0.22)',
  night: 'rgba(120, 160, 210, 0.09)',
};

const CELESTIAL: Record<TimeOfDay, { show: boolean; x: number; y: number; color: string; glow: string }> = {
  dawn: { show: true, x: 0.18, y: 0.22, color: '#FFD57E', glow: 'rgba(255, 190, 110, 0.45)' },
  morning: { show: true, x: 0.2, y: 0.2, color: '#FFE39E', glow: 'rgba(255, 226, 154, 0.35)' },
  afternoon: { show: true, x: 0.8, y: 0.18, color: '#FFF2BF', glow: 'rgba(255, 242, 191, 0.28)' },
  evening: { show: true, x: 0.82, y: 0.26, color: '#FFD08A', glow: 'rgba(255, 170, 110, 0.35)' },
  night: { show: true, x: 0.82, y: 0.2, color: '#E8F1FF', glow: 'rgba(180, 210, 255, 0.25)' },
};

// ---------------------------------------------------------------------------
// 날씨별 오버레이 색상 + 불투명도
// ---------------------------------------------------------------------------

interface WeatherOverlay {
  color: string;
  opacity: number;
}

function getWeatherOverlay(
  condition: string | undefined,
  timeOfDay: TimeOfDay,
): WeatherOverlay {
  if (!condition) return { color: 'transparent', opacity: 0 };

  const isDark = timeOfDay === 'night' || timeOfDay === 'evening';

  switch (condition) {
    case 'rain':
      return { color: '#1A3A5C', opacity: isDark ? 0.5 : 0.3 };
    case 'snow':
      return { color: '#D6EAF8', opacity: 0.25 };
    case 'fog':
      return { color: '#F2F3F4', opacity: isDark ? 0.2 : 0.45 };
    case 'thunderstorm':
    case 'storm':
      return { color: '#1C2833', opacity: isDark ? 0.65 : 0.5 };
    case 'cloudy':
    case 'clouds':
      return { color: '#85929E', opacity: 0.2 };
    case 'rainbow':
      return { color: '#F9E79F', opacity: 0.15 };  // 황금빛 틴트
    case 'windy':
      return { color: '#D5F5E3', opacity: 0.1 };
    default:
      return { color: 'transparent', opacity: 0 };
  }
}

// ---------------------------------------------------------------------------
// 파티클 설정 (비 / 눈)
// ---------------------------------------------------------------------------

interface Particle {
  key: string;
  emoji: string;
  left: number;      // 0~100 (%)
  delay: number;     // ms
  duration: number;  // ms
  size: number;      // 폰트 크기
  opacity: number;
}

function generateParticles(condition: string | undefined, count: number): Particle[] {
  if (!condition) return [];

  let emoji = '';
  let durations: [number, number] = [2500, 4000];
  let sizes: [number, number] = [10, 14];
  let opacity = 0.55;

  if (condition === 'rain') {
    emoji = '🌧';
    durations = [1800, 2800];
    sizes = [10, 13];
    opacity = 0.6;
  } else if (condition === 'snow') {
    emoji = '❄️';
    durations = [3500, 5500];
    sizes = [11, 16];
    opacity = 0.75;
  } else {
    return [];
  }

  return Array.from({ length: count }, (_, i) => ({
    key: `p_${condition}_${i}`,
    emoji,
    left: Math.round(Math.random() * 95),
    delay: Math.round(Math.random() * 2500),
    duration:
      durations[0] + Math.round(Math.random() * (durations[1] - durations[0])),
    size: sizes[0] + Math.round(Math.random() * (sizes[1] - sizes[0])),
    opacity,
  }));
}

// ---------------------------------------------------------------------------
// 개별 파티클 (독립적인 Animated.Value 로 낙하 루프)
// ---------------------------------------------------------------------------

interface FallingParticleProps {
  particle: Particle;
}

const FallingParticle: React.FC<FallingParticleProps> = ({ particle }) => {
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const startAnimation = useCallback(() => {
    translateY.setValue(-30);
    opacity.setValue(0);

    Animated.sequence([
      Animated.delay(particle.delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 720,
          duration: particle.duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: particle.opacity,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(particle.duration - 600),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      // 루프: 끝나면 다시 시작
      startAnimation();
    });
  }, [translateY, opacity, particle.delay, particle.duration, particle.opacity]);

  useEffect(() => {
    startAnimation();
    return () => {
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [startAnimation, translateY, opacity]);

  return (
    <Animated.Text
      style={[
        styles.particle,
        {
          left: `${particle.left}%` as any,
          fontSize: particle.size,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {particle.emoji}
    </Animated.Text>
  );
};

// ---------------------------------------------------------------------------
// 번개 플래시 (thunderstorm 전용)
// ---------------------------------------------------------------------------

const ThunderFlash: React.FC = () => {
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runFlash = () => {
      const nextDelay = 4000 + Math.round(Math.random() * 8000);
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(flashOpacity, {
            toValue: 0.35,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(flashOpacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.delay(120),
          Animated.timing(flashOpacity, {
            toValue: 0.2,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(flashOpacity, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start(runFlash);
      }, nextDelay);
    };

    runFlash();
    return () => {
      flashOpacity.stopAnimation();
    };
  }, [flashOpacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E8F8FF', opacity: flashOpacity }]}
    />
  );
};

// ---------------------------------------------------------------------------
// 별 레이어 (night 전용)
// ---------------------------------------------------------------------------

interface StarProps {
  top: number;
  left: number;
  size: number;
  delay: number;
}

const Star: React.FC<StarProps> = ({ top, left, size, delay }) => {
  const twinkle = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(twinkle, {
          toValue: 1,
          duration: 1000 + Math.round(Math.random() * 800),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0.3,
          duration: 1200 + Math.round(Math.random() * 800),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [twinkle, delay]);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        top,
        left,
        fontSize: size,
        opacity: twinkle,
      }}
    >
      ⭐
    </Animated.Text>
  );
};

// ---------------------------------------------------------------------------
// 별 목록 (night 고정 생성)
// ---------------------------------------------------------------------------

const STARS: StarProps[] = Array.from({ length: 18 }, (_, i) => ({
  top: Math.round(Math.random() * 250),
  left: Math.round(Math.random() * 360),
  size: 7 + Math.round(Math.random() * 5),
  delay: Math.round(Math.random() * 2000),
}));

// ---------------------------------------------------------------------------
// 메인 컴포넌트
// ---------------------------------------------------------------------------

export const VillageWeatherBackground: React.FC<VillageWeatherBackgroundProps> = ({
  weather,
  timeOfDay,
  colors: _colors,
  children,
}) => {
  // ── 하늘 색상 크로스페이드 ───────────────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const prevSkyColor = useRef(SKY_COLORS[timeOfDay]);
  const currentSkyColor = SKY_COLORS[timeOfDay];
  const celestial = CELESTIAL[timeOfDay];

  useEffect(() => {
    overlayOpacity.setValue(0);
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      prevSkyColor.current = currentSkyColor;
    });
  }, [timeOfDay, currentSkyColor, overlayOpacity]);

  // ── 날씨 오버레이 페이드 ────────────────────────────────────────────────
  const weatherOverlayOpacity = useRef(new Animated.Value(0)).current;
  const weatherCondition = weather?.condition;

  const weatherOverlay = useMemo(
    () => getWeatherOverlay(weatherCondition, timeOfDay),
    [weatherCondition, timeOfDay],
  );

  useEffect(() => {
    Animated.timing(weatherOverlayOpacity, {
      toValue: weatherOverlay.opacity,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [weatherCondition, timeOfDay, weatherOverlay.opacity, weatherOverlayOpacity]);

  // ── 파티클 ──────────────────────────────────────────────────────────────
  const particles = useMemo(
    () => generateParticles(weatherCondition, 18),
    [weatherCondition],
  );

  const isThunder =
    weatherCondition === 'thunderstorm' || weatherCondition === 'storm';
  const isNight = timeOfDay === 'night';

  return (
    <View style={styles.container}>
      {/* 레이어 1: 이전 하늘색 (배경) */}
      <View style={styles.skyLayer}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="skyGradPrev" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={prevSkyColor.current.top} stopOpacity="1" />
              <Stop offset="1" stopColor={prevSkyColor.current.bottom} stopOpacity="1" />
            </LinearGradient>
            <RadialGradient id="vignettePrev" cx="50%" cy="55%" rx="75%" ry="65%">
              <Stop offset="0" stopColor="#00000000" />
              <Stop offset="1" stopColor="#00000028" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#skyGradPrev)" />
          <Rect x="0" y="58%" width="100%" height="42%" fill={HORIZON_TINT[timeOfDay]} />
          {celestial.show && (
            <>
              <Circle cx={`${celestial.x * 100}%`} cy={`${celestial.y * 100}%`} r="58" fill={celestial.glow} />
              <Circle cx={`${celestial.x * 100}%`} cy={`${celestial.y * 100}%`} r="18" fill={celestial.color} />
            </>
          )}
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#vignettePrev)" />
        </Svg>
      </View>

      {/* 레이어 2: 현재 하늘색 (크로스페이드) */}
      <Animated.View
        style={[
          styles.skyLayer,
          { opacity: overlayOpacity },
        ]}
      >
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="skyGradCurrent" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={currentSkyColor.top} stopOpacity="1" />
              <Stop offset="1" stopColor={currentSkyColor.bottom} stopOpacity="1" />
            </LinearGradient>
            <RadialGradient id="vignetteCurrent" cx="50%" cy="55%" rx="75%" ry="65%">
              <Stop offset="0" stopColor="#00000000" />
              <Stop offset="1" stopColor="#00000028" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#skyGradCurrent)" />
          <Rect x="0" y="58%" width="100%" height="42%" fill={HORIZON_TINT[timeOfDay]} />
          {celestial.show && (
            <>
              <Circle cx={`${celestial.x * 100}%`} cy={`${celestial.y * 100}%`} r="58" fill={celestial.glow} />
              <Circle cx={`${celestial.x * 100}%`} cy={`${celestial.y * 100}%`} r="18" fill={celestial.color} />
            </>
          )}
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#vignetteCurrent)" />
        </Svg>
      </Animated.View>

      {/* 레이어 3: 밤하늘 별 */}
      {isNight &&
        STARS.map((star, i) => (
          <Star key={`star_${i}`} {...star} />
        ))}

      {/* 레이어 4: 날씨 오버레이 (비/눈/안개/뇌우 틴트) */}
      {weatherOverlay.color !== 'transparent' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.weatherOverlay,
            {
              backgroundColor: weatherOverlay.color,
              opacity: weatherOverlayOpacity,
            },
          ]}
        />
      )}

      {/* 레이어 5: 번개 플래시 */}
      {isThunder && <ThunderFlash />}

      {/* 레이어 6: 파티클 (비/눈) */}
      {particles.map(p => (
        <FallingParticle key={p.key} particle={p} />
      ))}

      {/* 레이어 7: 안개 */}
      {weatherCondition === 'fog' && (
        <View
          pointerEvents="none"
          style={[styles.fogOverlay, { backgroundColor: '#F2F3F4' }]}
        />
      )}

      {/* 레이어 8: 무지개 (rainbow 날씨 전용) */}
      {weatherCondition === 'rainbow' && (
        <View pointerEvents="none" style={styles.rainbowBar}>
          <Text style={styles.rainbowEmoji}>🌈</Text>
        </View>
      )}

      {/* 콘텐츠 */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  skyLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  weatherOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  fogOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.38,
  },
  particle: {
    position: 'absolute',
    top: -30,
  },
  rainbowBar: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 2,
  },
  rainbowEmoji: {
    fontSize: 36,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});

export default VillageWeatherBackground;
