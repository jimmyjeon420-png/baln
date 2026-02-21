/**
 * InvestorLevelCard.tsx - 프로필용 컴팩트 레벨 카드
 *
 * 역할: "레벨 미니 디스플레이"
 * - 프로필 화면에서 현재 레벨/XP/스트릭을 한눈에 표시
 * - 터치하면 상세 레벨 화면으로 이동
 * - 프로그레스 바 + 연속 출석 불꽃 표시
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMyLevel } from '../hooks/useInvestorLevel';
import {
  LEVEL_TITLES,
  LEVEL_ICONS,
  getLevelProgress,
  getXPToNextLevel,
  MAX_LEVEL,
  LEVEL_XP_TABLE,
} from '../types/level';

export default function InvestorLevelCard() {
  const router = useRouter();
  const { data: levelData, isLoading } = useMyLevel();

  if (isLoading || !levelData) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => router.push('/settings/investor-level')}
      >
        <View style={styles.loadingRow}>
          <View style={styles.loadingBlock} />
          <View style={[styles.loadingBlock, { flex: 1, marginLeft: 12 }]} />
        </View>
      </TouchableOpacity>
    );
  }

  const level = levelData.level || 1;
  const totalXp = levelData.total_xp || 0;
  const streak = levelData.current_streak || 0;
  const progress = getLevelProgress(totalXp, level);
  const xpToNext = getXPToNextLevel(totalXp, level);
  const title = LEVEL_TITLES[level] || '새싹 투자자';
  const icon = LEVEL_ICONS[level] || '🌱';

  // 현재 레벨 내 진행 XP
  const currentLevelXp = LEVEL_XP_TABLE[level] || 0;
  const nextLevelXp = level < MAX_LEVEL ? (LEVEL_XP_TABLE[level + 1] || 0) : totalXp;
  const xpInLevel = totalXp - currentLevelXp;
  const xpRange = nextLevelXp - currentLevelXp;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/settings/investor-level')}
      activeOpacity={0.7}
    >
      {/* 상단: 아이콘 + 레벨 정보 + 스트릭 */}
      <View style={styles.topRow}>
        <Text style={styles.levelIcon}>{icon}</Text>
        <View style={styles.levelInfo}>
          <Text style={styles.levelText}>Lv.{level} {title}</Text>
          <Text style={styles.xpText}>
            {level >= MAX_LEVEL
              ? `${totalXp.toLocaleString()} XP (MAX)`
              : `${xpInLevel} / ${xpRange} XP`
            }
          </Text>
        </View>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {streak}일</Text>
          </View>
        )}
      </View>

      {/* 프로그레스 바 */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      {/* 하단: 다음 레벨까지 */}
      {level < MAX_LEVEL && (
        <Text style={styles.nextLevelText}>
          다음 레벨까지 {xpToNext} XP
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  loadingBlock: {
    height: 20,
    width: 40,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelIcon: {
    fontSize: 29,
  },
  levelInfo: {
    flex: 1,
    marginLeft: 10,
  },
  levelText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  xpText: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: '#2A1A1A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  nextLevelText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 6,
    textAlign: 'right',
  },
});
