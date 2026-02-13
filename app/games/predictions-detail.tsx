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
import { useTheme } from '../../src/hooks/useTheme';
import {
  useMyPredictionStats,
  useLeaderboard,
} from '../../src/hooks/usePredictions';

export default function PredictionsDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: myStats } = useMyPredictionStats();
  const { data: leaderboard = [] } = useLeaderboard();
  const [tab, setTab] = useState<'stats' | 'leaderboard'>('stats');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>예측 통계</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 탭 */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'stats' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('stats')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'stats' && { fontWeight: '600', color: colors.textPrimary }]}>
            내 통계
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'leaderboard' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('leaderboard')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, tab === 'leaderboard' && { fontWeight: '600', color: colors.textPrimary }]}>
            리더보드
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {tab === 'stats' ? (
          /* 내 통계 */
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>적중률</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {myStats?.accuracy_rate?.toFixed(0) ?? '0'}%
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>총 투표</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{myStats?.total_votes ?? 0}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>적중</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{myStats?.correct_votes ?? 0}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>연속 적중</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{myStats?.current_streak ?? 0}</Text>
            </View>
          </View>
        ) : (
          /* 리더보드 */
          <View style={styles.leaderboardContainer}>
            {leaderboard.map((user: any, index: number) => (
              <View key={user.user_id} style={[styles.leaderboardItem, { backgroundColor: colors.surface }]}>
                <Text style={[styles.rank, { color: colors.primary }]}>#{index + 1}</Text>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>{user.user_id.slice(0, 8)}...</Text>
                  <Text style={[styles.userStats, { color: colors.textSecondary }]}>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
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
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  leaderboardContainer: {
    padding: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    width: 40,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 14,
  },
});
