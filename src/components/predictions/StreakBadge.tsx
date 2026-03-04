/**
 * StreakBadge.tsx - 연속 적중 배지 컴포넌트
 *
 * 역할: "연속 적중 불꽃 배지"
 * - 3연속: 🔥 (+0C)
 * - 5연속: 🔥🔥 (+3C)
 * - 10연속: 🔥🔥🔥 (+10C)
 * - Reanimated 펄스 애니메이션
 * - 연속 끊김 시 슬픈 애니메이션
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface StreakBadgeProps {
  currentStreak: number;
  isBroken?: boolean; // 연속이 끊겼을 때 true
}

export default function StreakBadge({ currentStreak, isBroken }: StreakBadgeProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // 연속 단계 결정
  const getStreakLevel = () => {
    if (currentStreak >= 10) return { level: 3, emoji: '🔥🔥🔥', bonus: 10, label: '10연속 달성!' };
    if (currentStreak >= 5) return { level: 2, emoji: '🔥🔥', bonus: 3, label: '5연속 달성!' };
    if (currentStreak >= 3) return { level: 1, emoji: '🔥', bonus: 0, label: '3연속 적중 중' };
    return null;
  };

  const streakLevel = getStreakLevel();

  // 펄스 애니메이션 (연속 적중 중)
  useEffect(() => {
    if (streakLevel && !isBroken) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // 무한 반복
        false,
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [streakLevel, isBroken, scale]);

  // 연속 끊김 애니메이션
  useEffect(() => {
    if (isBroken) {
      opacity.value = withSequence(
        withTiming(0.3, { duration: 200 }),
        withTiming(1.0, { duration: 200 }),
        withTiming(0.3, { duration: 200 }),
        withTiming(1.0, { duration: 200 }),
      );
    }
  }, [isBroken, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // 연속 적중이 3 미만이면 아무것도 표시하지 않음
  if (!streakLevel) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        isBroken && styles.containerBroken,
        animatedStyle,
      ]}
    >
      {/* 불꽃 이모지 */}
      <Text style={styles.emoji}>{streakLevel.emoji}</Text>

      {/* 연속 정보 */}
      <View style={styles.textContainer}>
        <Text style={[styles.streakText, isBroken && styles.streakTextBroken]}>
          {isBroken ? `${currentStreak}연속 끊김...` : streakLevel.label}
        </Text>
        {!isBroken && streakLevel.bonus > 0 && (
          <Text style={styles.bonusText}>+{streakLevel.bonus} 도토리 보너스 획득!</Text>
        )}
        {!isBroken && currentStreak >= 3 && currentStreak < 5 && (
          <Text style={styles.nextGoalText}>5연속 시 +3 보너스!</Text>
        )}
        {!isBroken && currentStreak >= 5 && currentStreak < 10 && (
          <Text style={styles.nextGoalText}>10연속 시 +10 보너스!</Text>
        )}
      </View>

      {/* 연속 횟수 배지 */}
      <View style={[styles.countBadge, isBroken && styles.countBadgeBroken]}>
        <Text style={[styles.countText, isBroken && styles.countTextBroken]}>
          {currentStreak}
        </Text>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2A1A1A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FF9800',
  },
  containerBroken: {
    backgroundColor: '#2A2A2A',
    borderColor: '#666666',
  },

  // 불꽃 이모지
  emoji: {
    fontSize: 33,
  },

  // 텍스트 영역
  textContainer: {
    flex: 1,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 3,
  },
  streakTextBroken: {
    color: '#888888',
  },
  bonusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  nextGoalText: {
    fontSize: 12,
    color: '#AAAAAA',
  },

  // 연속 횟수 배지
  countBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeBroken: {
    backgroundColor: '#666666',
  },
  countText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#000000',
  },
  countTextBroken: {
    color: '#FFFFFF',
  },
});
