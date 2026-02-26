/**
 * SeasonParticles -- 계절별 파티클 이펙트
 *
 * 역할: 봄 벚꽃, 여름 반딧불, 가을 낙엽, 겨울 눈
 *       화면 상단에서 하단으로 자연스럽게 떨어지는 파티클 (10개)
 * 비유: "마을 날씨 연출팀" -- 계절에 맞춰 하늘에서 무언가를 뿌려주는 담당
 *
 * 사용처:
 * - 마을 탭 배경 위에 오버레이로 렌더링
 * - useVillageSeason의 particleType/particleEmoji를 전달받아 사용
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

// ============================================================================
// 타입
// ============================================================================

interface SeasonParticlesProps {
  /** 파티클 종류 ('none'이면 렌더링 안 함) */
  particleType: 'cherry_blossom' | 'firefly' | 'falling_leaf' | 'snowflake' | 'none';
  /** 파티클 이모지 */
  particleEmoji: string;
  /** 화면 너비 (파티클 x좌표 분산용) */
  screenWidth: number;
}

// ============================================================================
// 파티클 타입별 설정
// ============================================================================

interface ParticleConfig {
  /** 낙하 시간 (ms) */
  duration: number;
  /** 좌우 흔들림 진폭 (px) */
  swayAmplitude: number;
  /** 회전 활성화 여부 */
  rotates: boolean;
  /** 투명도 기본값 */
  baseOpacity: number;
  /** 반딧불처럼 깜빡이는지 여부 */
  flickers: boolean;
}

const PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
  cherry_blossom: {
    duration: 8000,
    swayAmplitude: 30,
    rotates: true,
    baseOpacity: 0.85,
    flickers: false,
  },
  firefly: {
    duration: 10000,
    swayAmplitude: 20,
    rotates: false,
    baseOpacity: 0.5,
    flickers: true,
  },
  falling_leaf: {
    duration: 7000,
    swayAmplitude: 40,
    rotates: true,
    baseOpacity: 0.8,
    flickers: false,
  },
  snowflake: {
    duration: 6000,
    swayAmplitude: 15,
    rotates: false,
    baseOpacity: 0.9,
    flickers: false,
  },
};

const PARTICLE_COUNT = 10;

// ============================================================================
// 개별 파티클 컴포넌트
// ============================================================================

interface SingleParticleProps {
  emoji: string;
  x: number;
  delay: number;
  fontSize: number;
  config: ParticleConfig;
}

function SingleParticle({ emoji, x, delay, fontSize, config }: SingleParticleProps) {
  const screenHeight = Dimensions.get('window').height;
  const fallAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const flickerAnim = useRef(new Animated.Value(config.baseOpacity)).current;

  useEffect(() => {
    // 낙하 루프: 위에서 아래로
    const fallLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(fallAnim, {
          toValue: 1,
          duration: config.duration + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(fallAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    // 좌우 흔들림 루프
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: -1,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    fallLoop.start();
    swayLoop.start();

    // 회전 (낙엽/벚꽃)
    if (config.rotates) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ).start();
    }

    // 반딧불 깜빡임
    if (config.flickers) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flickerAnim, {
            toValue: 1,
            duration: 800 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.timing(flickerAnim, {
            toValue: 0.2,
            duration: 800 + Math.random() * 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }

    return () => {
      fallLoop.stop();
      swayLoop.stop();
    };
  }, [fallAnim, swayAnim, rotateAnim, flickerAnim, delay, config]);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, screenHeight + 30],
  });

  const translateX = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-config.swayAmplitude, config.swayAmplitude],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: x,
          opacity: config.flickers ? flickerAnim : config.baseOpacity,
          transform: [
            { translateY },
            { translateX },
            ...(config.rotates ? [{ rotate }] : []),
          ],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={{ fontSize }}>{emoji}</Text>
    </Animated.View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function SeasonParticles({ particleType, particleEmoji, screenWidth }: SeasonParticlesProps) {
  // 'none' 이면 렌더링 안 함
  if (particleType === 'none') return null;

  const config = PARTICLE_CONFIGS[particleType];
  if (!config) return null;

  // 파티클 10개의 랜덤 설정 메모이제이션
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * (screenWidth - 20),
      delay: Math.random() * 4000,
      fontSize: 14 + Math.random() * 10, // 14~24px 랜덤 크기
    }));
  }, [screenWidth]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <SingleParticle
          key={p.id}
          emoji={particleEmoji}
          x={p.x}
          delay={p.delay}
          fontSize={p.fontSize}
          config={config}
        />
      ))}
    </View>
  );
}

export default SeasonParticles;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
