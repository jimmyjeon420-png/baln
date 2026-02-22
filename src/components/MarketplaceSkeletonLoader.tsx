/**
 * MarketplaceSkeletonLoader - 마켓플레이스 전용 로딩 스켈레톤
 * 기존 SkeletonBlock 패턴 재사용
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

function SkeletonBlock({ width, height, borderRadius = 8 }: {
  width: number | string;
  height: number;
  borderRadius?: number;
}) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 1000 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#333',
        },
        animatedStyle,
      ]}
    />
  );
}

/** AI 분석 결과 대기 스켈레톤 */
export function AnalysisSkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* 제목 영역 */}
      <SkeletonBlock width="60%" height={24} borderRadius={6} />
      <View style={{ height: 8 }} />
      <SkeletonBlock width="40%" height={16} borderRadius={4} />

      {/* 점수 영역 */}
      <View style={[styles.card, { marginTop: 20 }]}>
        <View style={styles.row}>
          <SkeletonBlock width={60} height={60} borderRadius={30} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <SkeletonBlock width="80%" height={18} />
            <View style={{ height: 8 }} />
            <SkeletonBlock width="50%" height={14} />
          </View>
        </View>
      </View>

      {/* 섹션 카드들 */}
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.card, { marginTop: 12 }]}>
          <SkeletonBlock width="50%" height={18} />
          <View style={{ height: 12 }} />
          <SkeletonBlock width="100%" height={14} />
          <View style={{ height: 6 }} />
          <SkeletonBlock width="90%" height={14} />
          <View style={{ height: 6 }} />
          <SkeletonBlock width="70%" height={14} />
        </View>
      ))}
    </View>
  );
}

/** 마켓플레이스 메인 스켈레톤 */
export function MarketplaceMainSkeleton() {
  return (
    <View style={styles.container}>
      {/* 크레딧 배지 */}
      <View style={styles.headerRow}>
        <SkeletonBlock width="40%" height={20} />
        <SkeletonBlock width={80} height={32} borderRadius={16} />
      </View>

      {/* 기능 카드들 */}
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.featureCard, { marginTop: 12 }]}>
          <SkeletonBlock width={48} height={48} borderRadius={14} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <SkeletonBlock width="60%" height={16} />
            <View style={{ height: 6 }} />
            <SkeletonBlock width="80%" height={12} />
          </View>
          <SkeletonBlock width={40} height={20} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

/** 채팅 스켈레톤 */
export function ChatSkeletonLoader() {
  return (
    <View style={styles.container}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ marginBottom: 16, alignItems: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
          <SkeletonBlock
            width={i % 2 === 0 ? '70%' : '60%'}
            height={i % 2 === 0 ? 60 : 40}
            borderRadius={16}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
});
