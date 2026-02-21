/**
 * BadgeRow.tsx - 프로필 헤더 뱃지 행
 *
 * 역할: "프로필 상단 미니 뱃지 진열창"
 * - 획득한 배지 중 최근 3개를 가로로 표시
 * - 배지가 없으면 잠금 플레이스홀더 표시
 * - 탭 시 /achievements 화면으로 이동
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { type AchievementWithStatus } from '../../services/achievementService';

interface BadgeRowProps {
  /** useAchievements()의 achievements 배열 */
  achievements: AchievementWithStatus[];
  isLoading?: boolean;
}

export function BadgeRow({ achievements, isLoading = false }: BadgeRowProps) {
  const router = useRouter();

  // 해금된 배지를 최근 순으로 정렬 후 상위 3개
  const unlockedBadges = achievements
    .filter((a) => a.isUnlocked)
    .sort((a, b) => {
      if (!a.unlockedDate) return 1;
      if (!b.unlockedDate) return -1;
      return b.unlockedDate.localeCompare(a.unlockedDate);
    })
    .slice(0, 3);

  // 항상 3칸 슬롯 표시
  const slots: (AchievementWithStatus | null)[] = [
    unlockedBadges[0] ?? null,
    unlockedBadges[1] ?? null,
    unlockedBadges[2] ?? null,
  ];

  const totalUnlocked = achievements.filter((a) => a.isUnlocked).length;

  return (
    <Pressable
      style={styles.container}
      onPress={() => router.push('/achievements')}
      accessibilityRole="button"
      accessibilityLabel="내 뱃지 보기"
    >
      <View style={styles.row}>
        {slots.map((badge, index) =>
          badge ? (
            <UnlockedSlot key={badge.id} badge={badge} />
          ) : (
            <LockedSlot key={`locked-${index}`} />
          )
        )}
      </View>
      <Text style={styles.hint}>
        {totalUnlocked > 0
          ? `${totalUnlocked}개 획득 · 전체 보기 →`
          : '첫 뱃지를 획득해보세요 →'}
      </Text>
    </Pressable>
  );
}

function UnlockedSlot({ badge }: { badge: AchievementWithStatus }) {
  return (
    <View style={styles.slotWrapper}>
      <View style={[styles.circle, styles.circleUnlocked]}>
        <Text style={styles.emoji}>{badge.emoji}</Text>
      </View>
      <Text style={styles.badgeLabel} numberOfLines={1}>
        {badge.title}
      </Text>
    </View>
  );
}

function LockedSlot() {
  return (
    <View style={styles.slotWrapper}>
      <View style={[styles.circle, styles.circleLocked]}>
        <Text style={styles.questionMark}>?</Text>
      </View>
      <Text style={[styles.badgeLabel, styles.badgeLabelLocked]}>미획득</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 8,
  },
  slotWrapper: {
    alignItems: 'center',
    width: 72,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
  },
  circleUnlocked: {
    backgroundColor: '#252540',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  circleLocked: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2a2a4a',
    borderStyle: 'dashed',
  },
  emoji: {
    fontSize: 27,
  },
  questionMark: {
    fontSize: 21,
    color: '#3a3a5a',
    fontWeight: '700',
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  badgeLabelLocked: {
    color: '#3a3a5a',
  },
  hint: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
