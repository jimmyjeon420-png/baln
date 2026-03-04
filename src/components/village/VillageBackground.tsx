/**
 * VillageBackground — 시간대별 동적 배경 (하늘 + 별 + 바닥)
 *
 * 역할: "동물의숲 하늘" — 아침엔 따뜻한 골드, 밤엔 별 반짝이는 네이비
 * - 시간대별 자동 변화 (KST 기준)
 * - 별 애니메이션 (밤에만)
 * - 자식 컴포넌트를 감싸는 배경 역할
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface VillageBackgroundProps {
  skyGradient: [string, string];
  groundColor: string;
  starOpacity: number;
  allowOverflow?: boolean;
  children?: React.ReactNode;
}

/** 별 위치 (고정 — 매번 랜덤이면 리렌더링 시 깜빡임) */
const STARS = [
  { x: 0.1, y: 0.05, size: 2 },
  { x: 0.25, y: 0.12, size: 1.5 },
  { x: 0.4, y: 0.03, size: 2.5 },
  { x: 0.55, y: 0.15, size: 1.8 },
  { x: 0.7, y: 0.08, size: 2 },
  { x: 0.85, y: 0.18, size: 1.5 },
  { x: 0.15, y: 0.22, size: 1.2 },
  { x: 0.35, y: 0.28, size: 2.2 },
  { x: 0.6, y: 0.25, size: 1.5 },
  { x: 0.8, y: 0.3, size: 1.8 },
  { x: 0.05, y: 0.35, size: 2 },
  { x: 0.45, y: 0.38, size: 1.3 },
  { x: 0.92, y: 0.1, size: 2.5 },
  { x: 0.3, y: 0.4, size: 1.5 },
  { x: 0.75, y: 0.42, size: 1.8 },
];

function TwinklingStar({ x, y, size, baseOpacity }: { x: number; y: number; size: number; baseOpacity: number }) {
  const opacity = useRef(new Animated.Value(baseOpacity * 0.5)).current;

  useEffect(() => {
    if (baseOpacity <= 0) return;

    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: baseOpacity,
          duration: 1000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: baseOpacity * 0.2,
          duration: 1000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ])
    );
    twinkle.start();
    return () => twinkle.stop();
  }, [opacity, baseOpacity]);

  if (baseOpacity <= 0) return null;

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
        },
      ]}
    />
  );
}

export function VillageBackground({
  skyGradient,
  groundColor,
  starOpacity,
  allowOverflow = false,
  children,
}: VillageBackgroundProps) {
  return (
    <View style={[styles.container, allowOverflow && styles.containerOverflowVisible]}>
      {/* 하늘 (상단 그라데이션 — 2색 단순 블렌딩) */}
      <View style={[styles.skyTop, { backgroundColor: skyGradient[0] }]} />
      <View style={[styles.skyBottom, { backgroundColor: skyGradient[1] }]} />

      {/* 별 */}
      {starOpacity > 0 && STARS.map((star, i) => (
        <TwinklingStar
          key={i}
          x={star.x}
          y={star.y}
          size={star.size}
          baseOpacity={starOpacity}
        />
      ))}

      {/* 바닥 (잔디/흙) */}
      <View style={[styles.ground, { backgroundColor: groundColor }]}>
        {/* 잔디 패턴 */}
        <View style={styles.grassRow}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={[styles.grassBlade, { left: `${i * 13 + 2}%`, height: 4 + (i % 3) * 2 }]}
            />
          ))}
        </View>
      </View>

      {/* 자식 (구루 마을 콘텐츠) */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  containerOverflowVisible: {
    overflow: 'visible',
  },
  skyTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  skyBottom: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: '30%',
    opacity: 0.6,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFDE7',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  grassRow: {
    position: 'absolute',
    top: -3,
    left: 0,
    right: 0,
    height: 8,
  },
  grassBlade: {
    position: 'absolute',
    width: 3,
    backgroundColor: '#5DBB6340',
    borderRadius: 1.5,
    bottom: 0,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
  },
});
