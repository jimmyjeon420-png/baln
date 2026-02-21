/**
 * investor-level.tsx - 내 투자 레벨 상세 화면
 *
 * 역할: "레벨 현황판"
 * - 레벨 히어로 (아이콘 + 레벨명 + 프로그레스 바)
 * - 스트릭 섹션 (연속 출석 + 마일스톤 프로그레스)
 * - 30일 캘린더 히트맵
 * - 4칸 스탯 그리드 (총 XP, 총 출석, 최장 스트릭, 퀴즈 정답률)
 * - XP 히스토리 타임라인
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMyLevel, useXPHistory, useCheckinHeatmap } from '../../src/hooks/useInvestorLevel';
import {
  LEVEL_TITLES,
  LEVEL_ICONS,
  LEVEL_XP_TABLE,
  MAX_LEVEL,
  STREAK_MILESTONES,
  XP_SOURCE_INFO,
  getLevelProgress,
  getXPToNextLevel,
} from '../../src/types/level';
import type { XPSource } from '../../src/types/level';
import { useTheme } from '../../src/hooks/useTheme';

export default function InvestorLevelScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: levelData, isLoading } = useMyLevel();
  const { data: xpHistory = [] } = useXPHistory(30);
  const { data: heatmapDates = [] } = useCheckinHeatmap();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  const level = levelData?.level || 1;
  const totalXp = levelData?.total_xp || 0;
  const streak = levelData?.current_streak || 0;
  const longestStreak = levelData?.longest_streak || 0;
  const totalCheckins = levelData?.total_checkins || 0;
  const quizzesCorrect = levelData?.total_quizzes_correct || 0;
  const quizzesAttempted = levelData?.total_quizzes_attempted || 0;
  const quizAccuracy = quizzesAttempted > 0 ? Math.round((quizzesCorrect / quizzesAttempted) * 100) : 0;
  const progress = getLevelProgress(totalXp, level);
  const xpToNext = getXPToNextLevel(totalXp, level);
  const title = LEVEL_TITLES[level] || '새싹 투자자';
  const icon = LEVEL_ICONS[level] || '🌱';
  const currentLevelXp = LEVEL_XP_TABLE[level] || 0;
  const nextLevelXp = level < MAX_LEVEL ? (LEVEL_XP_TABLE[level + 1] || 0) : totalXp;
  const xpInLevel = totalXp - currentLevelXp;
  const xpRange = nextLevelXp - currentLevelXp;

  // 30일 캘린더 히트맵 데이터 생성
  const today = new Date();
  const calendarDays: { date: string; label: string; checked: boolean }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    calendarDays.push({
      date: dateStr,
      label: d.getDate().toString(),
      checked: heatmapDates.includes(dateStr),
    });
  }

  // 시간 포맷 (상대 시간)
  const formatRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 투자 레벨</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* 레벨 히어로 카드 */}
        <View style={styles.heroCard}>
          <Text style={styles.heroIcon}>{icon}</Text>
          <Text style={styles.heroLevel}>Lv.{level}</Text>
          <Text style={styles.heroTitle}>{title}</Text>

          {/* 프로그레스 바 */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {level >= MAX_LEVEL
                ? `${totalXp.toLocaleString()} XP (MAX LEVEL)`
                : `${xpInLevel} / ${xpRange} XP (${Math.round(progress * 100)}%)`
              }
            </Text>
            {level < MAX_LEVEL && (
              <Text style={styles.nextLevelHint}>
                다음 레벨까지 {xpToNext} XP
              </Text>
            )}
          </View>
        </View>

        {/* 스트릭 섹션 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {streak > 0 ? `🔥 ${streak}일 연속 출석!` : '📅 출석을 시작하세요'}
            </Text>
          </View>

          {/* 마일스톤 프로그레스 */}
          <View style={styles.milestoneRow}>
            {STREAK_MILESTONES.map((ms) => {
              const reached = streak >= ms.days;
              return (
                <View key={ms.days} style={styles.milestoneItem}>
                  <View style={[styles.milestoneDot, reached && styles.milestoneDotActive]} />
                  <Text style={[styles.milestoneLabel, reached && styles.milestoneLabelActive]}>
                    {ms.label}
                  </Text>
                  <Text style={styles.milestoneCredits}>+{ms.credits}C</Text>
                </View>
              );
            })}
          </View>

          {/* 30일 캘린더 히트맵 */}
          <Text style={styles.heatmapTitle}>최근 30일</Text>
          <View style={styles.heatmapGrid}>
            {calendarDays.map((day) => (
              <View
                key={day.date}
                style={[
                  styles.heatmapCell,
                  day.checked && styles.heatmapCellChecked,
                  day.date === today.toISOString().slice(0, 10) && styles.heatmapCellToday,
                ]}
              >
                <Text style={[
                  styles.heatmapCellText,
                  day.checked && styles.heatmapCellTextChecked,
                ]}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4칸 스탯 그리드 */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalXp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>총 XP</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalCheckins}일</Text>
            <Text style={styles.statLabel}>총 출석</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{longestStreak}일</Text>
            <Text style={styles.statLabel}>최장 연속</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{quizAccuracy}%</Text>
            <Text style={styles.statLabel}>퀴즈 정답률</Text>
          </View>
        </View>

        {/* XP 히스토리 */}
        {xpHistory.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📋 XP 히스토리</Text>
            {xpHistory.map((event) => {
              const sourceInfo = XP_SOURCE_INFO[event.source as XPSource];
              return (
                <View key={event.id} style={styles.historyItem}>
                  <Text style={styles.historyIcon}>{sourceInfo?.icon || '📌'}</Text>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyLabel}>{sourceInfo?.label || event.source}</Text>
                    <Text style={styles.historyTime}>{formatRelativeTime(event.created_at)}</Text>
                  </View>
                  <Text style={styles.historyXp}>+{event.amount} XP</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },

  // 히어로 카드
  heroCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  heroLevel: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 8,
  },
  nextLevelHint: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },

  // 섹션 카드
  sectionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },

  // 마일스톤
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  milestoneItem: {
    alignItems: 'center',
    flex: 1,
  },
  milestoneDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#333333',
    marginBottom: 4,
  },
  milestoneDotActive: {
    backgroundColor: '#4CAF50',
  },
  milestoneLabel: {
    fontSize: 11,
    color: '#666666',
  },
  milestoneLabelActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  milestoneCredits: {
    fontSize: 10,
    color: '#888888',
    marginTop: 2,
  },

  // 히트맵
  heatmapTitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatmapCell: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapCellChecked: {
    backgroundColor: '#1A3A1A',
  },
  heatmapCellToday: {
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  heatmapCellText: {
    fontSize: 12,
    color: '#555555',
  },
  heatmapCellTextChecked: {
    color: '#4CAF50',
    fontWeight: '700',
  },

  // 스탯 그리드
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },

  // XP 히스토리
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  historyIcon: {
    fontSize: 19,
    width: 30,
    textAlign: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 8,
  },
  historyLabel: {
    fontSize: 15,
    color: '#DDDDDD',
    fontWeight: '500',
  },
  historyTime: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  historyXp: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
});
