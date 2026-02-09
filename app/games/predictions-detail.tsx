/**
 * predictions-detail.tsx - 예측 게임 상세 통계
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/styles/theme';
import {
  useMyPredictionStats,
  useLeaderboard,
} from '../../src/hooks/usePredictions';

export default function PredictionsDetailScreen() {
  const router = useRouter();
  const { data: myStats } = useMyPredictionStats();
  const { data: leaderboard = [] } = useLeaderboard();
  const [tab, setTab] = useState<'stats' | 'leaderboard'>('stats');

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>예측 통계</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'stats' && styles.tabActive]}
          onPress={() => setTab('stats')}
        >
          <Text style={[styles.tabText, tab === 'stats' && styles.tabTextActive]}>
            내 통계
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'leaderboard' && styles.tabActive]}
          onPress={() => setTab('leaderboard')}
        >
          <Text style={[styles.tabText, tab === 'leaderboard' && styles.tabTextActive]}>
            리더보드
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {tab === 'stats' ? (
          /* 내 통계 */
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>적중률</Text>
              <Text style={styles.statValue}>
                {myStats?.accuracy_rate?.toFixed(0) ?? '0'}%
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>총 투표</Text>
              <Text style={styles.statValue}>{myStats?.total_votes ?? 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>적중</Text>
              <Text style={styles.statValue}>{myStats?.correct_votes ?? 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>연속 적중</Text>
              <Text style={styles.statValue}>{myStats?.current_streak ?? 0}</Text>
            </View>
          </View>
        ) : (
          /* 리더보드 */
          <View style={styles.leaderboardContainer}>
            {leaderboard.map((user: any, index: number) => (
              <View key={user.user_id} style={styles.leaderboardItem}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.user_id.slice(0, 8)}...</Text>
                  <Text style={styles.userStats}>
                    {user.accuracy_rate?.toFixed(0)}% · {user.total_votes}회
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  statBox: {
    width: '47%',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  leaderboardContainer: {
    padding: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    width: 40,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userStats: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
