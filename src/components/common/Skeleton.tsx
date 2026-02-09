/**
 * Skeleton.tsx - 스켈레톤 로딩 컴포넌트
 *
 * 역할: "로딩 애니메이션" — 데이터 로딩 중 placeholder 표시
 *
 * 사용처:
 * - 모든 카드의 로딩 상태
 * - 리스트 로딩 상태
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../styles/theme';

interface SkeletonProps {
  /** 너비 (숫자 또는 '100%') */
  width?: number | string;

  /** 높이 */
  height?: number;

  /** 둥근 모서리 반경 */
  borderRadius?: number;

  /** 추가 스타일 */
  style?: any;

  /** 원형 여부 (프로필 이미지 등) */
  circle?: boolean;
}

export default function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  circle = false,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // 깜빡이는 애니메이션
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  const skeletonStyle = circle
    ? {
        width: typeof height === 'number' ? height : 40,
        height: height,
        borderRadius: (typeof height === 'number' ? height : 40) / 2,
      }
    : {
        width,
        height,
        borderRadius,
      };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        skeletonStyle,
        { opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#2A2A2A',
  },
});
