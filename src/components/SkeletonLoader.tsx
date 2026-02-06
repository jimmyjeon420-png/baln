/**
 * SkeletonLoader - 프리미엄 로딩 플레이스홀더
 * 실제 콘텐츠와 동일한 높이로 레이아웃 시프트 방지
 * Reanimated 기반 shimmer 애니메이션
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** 단일 스켈레톤 블록 (shimmer 효과 포함) */
function SkeletonBlock({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#2A2A2A',
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** 처방전(Diagnosis) 화면 전용 스켈레톤 - 실제 콘텐츠와 높이 일치 */
export function DiagnosisSkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* 헤더 영역 */}
      <View style={styles.headerSkeleton}>
        <SkeletonBlock width={120} height={32} borderRadius={6} />
        <SkeletonBlock width={80} height={28} borderRadius={14} />
      </View>
      <SkeletonBlock width={200} height={14} style={{ marginTop: 6 }} />

      {/* Morning Briefing 카드 (실제 높이 ~320px) */}
      <View style={[styles.cardSkeleton, { height: 320 }]}>
        <View style={styles.briefingHeaderSkeleton}>
          <SkeletonBlock width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock width={140} height={16} />
            <SkeletonBlock width={100} height={12} />
          </View>
          <SkeletonBlock width={60} height={24} borderRadius={12} />
        </View>
        <View style={styles.divider} />
        <SkeletonBlock width="90%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="75%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="80%" height={14} style={{ marginBottom: 16 }} />
        <View style={styles.divider} />
        <SkeletonBlock width={160} height={14} style={{ marginBottom: 10 }} />
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} height={52} style={{ marginBottom: 8 }} />
        ))}
      </View>

      {/* 맞춤 전략 카드 (실제 높이 ~200px) */}
      <View style={[styles.cardSkeleton, { height: 200 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <SkeletonBlock width={24} height={24} borderRadius={12} />
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonBlock width={60} height={11} />
            <SkeletonBlock width={180} height={16} />
          </View>
        </View>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <SkeletonBlock width={6} height={6} borderRadius={3} />
            <SkeletonBlock width="85%" height={14} />
          </View>
        ))}
      </View>

      {/* Panic Shield 카드 (실제 높이 ~180px) */}
      <View style={[styles.cardSkeleton, { height: 180 }]}>
        <SkeletonBlock width={140} height={16} style={{ marginBottom: 16 }} />
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <SkeletonBlock width={100} height={100} borderRadius={50} />
        </View>
        <SkeletonBlock width="60%" height={14} style={{ alignSelf: 'center' }} />
      </View>
    </View>
  );
}

/** 라운지(Lounge) 화면 전용 스켈레톤 */
export function LoungeSkeleton() {
  return (
    <View style={styles.container}>
      {/* 라운지 헤더 */}
      <View style={styles.headerSkeleton}>
        <SkeletonBlock width={100} height={28} />
        <SkeletonBlock width={70} height={24} borderRadius={12} />
      </View>

      {/* 커뮤니티 포스트 카드 x3 */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.cardSkeleton, { height: 140 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <SkeletonBlock width={36} height={36} borderRadius={18} />
            <View style={{ flex: 1, gap: 4 }}>
              <SkeletonBlock width={100} height={14} />
              <SkeletonBlock width={60} height={11} />
            </View>
          </View>
          <SkeletonBlock width="95%" height={14} style={{ marginBottom: 6 }} />
          <SkeletonBlock width="70%" height={14} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <SkeletonBlock width={50} height={14} />
            <SkeletonBlock width={50} height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** 홈(Portfolio Pulse) 화면 전용 스켈레톤 */
export function HomeSkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* Section 1: 인사 + 시장 날씨 */}
      <View style={styles.headerSkeleton}>
        <View style={{ gap: 6 }}>
          <SkeletonBlock width={160} height={24} />
          <SkeletonBlock width={100} height={14} />
        </View>
        <SkeletonBlock width={80} height={28} borderRadius={14} />
      </View>

      {/* Section 2: Pulse Hero 카드 */}
      <View style={[styles.cardSkeleton, { height: 180 }]}>
        <SkeletonBlock width={80} height={14} style={{ marginBottom: 12 }} />
        <SkeletonBlock width={200} height={36} style={{ marginBottom: 8 }} />
        <SkeletonBlock width={150} height={16} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SkeletonBlock width="48%" height={44} borderRadius={12} />
          <SkeletonBlock width="48%" height={44} borderRadius={12} />
        </View>
      </View>

      {/* Section 3: 오늘의 시그널 */}
      <View style={[styles.cardSkeleton, { height: 160 }]}>
        <SkeletonBlock width={180} height={16} style={{ marginBottom: 16 }} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <SkeletonBlock width={50} height={14} />
            <SkeletonBlock width={50} height={22} borderRadius={6} />
            <SkeletonBlock width="50%" height={14} />
          </View>
        ))}
      </View>

      {/* Section 4: 활성 자산 리스트 */}
      <SkeletonBlock width={100} height={16} style={{ marginBottom: 12 }} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.cardSkeleton, { height: 64, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }]}>
          <SkeletonBlock width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock width={80} height={14} />
            <SkeletonBlock width={120} height={12} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <SkeletonBlock width={90} height={14} />
            <SkeletonBlock width={60} height={12} />
          </View>
        </View>
      ))}

      {/* Section 5: 리밸런싱 배너 */}
      <View style={[styles.cardSkeleton, { height: 70 }]}>
        <SkeletonBlock width={160} height={14} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="80%" height={14} />
      </View>
    </View>
  );
}

export { SkeletonBlock };
export default DiagnosisSkeletonLoader;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSkeleton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
  },
  briefingHeaderSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 12,
  },
});
