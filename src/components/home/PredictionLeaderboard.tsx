/**
 * PredictionLeaderboard.tsx - 예측 순위표 컴포넌트
 *
 * 역할: "예측 경기장 순위판" — 월간 Top 10 예측가 + 내 주간 통계
 *
 * 위치: 오늘 탭 > 예측 섹션 하단
 * 갱신: 매일 (Central Kitchen 배치 후)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { usePredictionLeaderboard } from '../../hooks/usePredictionLeaderboard';

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PredictionLeaderboard() {
  const { colors } = useTheme();
  const {
    leaderboard,
    myRank,
    myPercentile,
    weeklyStats,
    totalParticipants,
    isLoading,
  } = usePredictionLeaderboard();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (leaderboard.length === 0) {
    return null; // 데이터 없으면 표시 안 함
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {'\u{1F3C6}'} 예측 순위표
        </Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          {totalParticipants}명 참여 중
        </Text>
      </View>

      {/* 내 주간 통계 */}
      {weeklyStats.totalVotes > 0 && (
        <View style={[styles.myStats, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' }]}>
          <View style={styles.myStatsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{weeklyStats.totalVotes}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>이번 주</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{weeklyStats.accuracyRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>적중률</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {myRank ? `#${myRank}` : '-'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>내 순위</Text>
            </View>
            {myPercentile !== null && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.premium.gold }]}>
                  상위 {myPercentile}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>등급</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Top 10 리스트 */}
      <View style={styles.list}>
        {leaderboard.slice(0, 5).map((entry) => (
          <View
            key={entry.user_id}
            style={[
              styles.row,
              { borderBottomColor: colors.border },
              entry.isMe && { backgroundColor: colors.primary + '0A' },
            ]}
          >
            {/* 순위 */}
            <View style={styles.rankCell}>
              <Text style={[
                styles.rankText,
                { color: entry.rank <= 3 ? colors.premium.gold : colors.textSecondary },
              ]}>
                {entry.rank <= 3 ? ['', '\u{1F947}', '\u{1F948}', '\u{1F949}'][entry.rank] : `${entry.rank}`}
              </Text>
            </View>

            {/* 닉네임 */}
            <View style={styles.nameCell}>
              <Text style={[styles.nameText, { color: colors.textPrimary }]} numberOfLines={1}>
                {entry.display_name}
                {entry.isMe ? ' (나)' : ''}
              </Text>
              <Text style={[styles.votesText, { color: colors.textTertiary }]}>
                {entry.total_votes}회 투표
              </Text>
            </View>

            {/* 적중률 */}
            <View style={styles.rateCell}>
              <Text style={[styles.rateText, { color: colors.primary }]}>
                {entry.accuracy_rate.toFixed(0)}%
              </Text>
            </View>

            {/* 스트릭 */}
            <View style={styles.streakCell}>
              <Text style={[styles.streakText, { color: colors.textTertiary }]}>
                {entry.current_streak > 0 ? `${entry.current_streak} {'\u{1F525}'}` : '-'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 내 통계
  myStats: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  myStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 19,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // 리스트
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  rankCell: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 17,
    fontWeight: '700',
  },
  nameCell: {
    flex: 1,
    marginLeft: 8,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
  },
  votesText: {
    fontSize: 12,
    marginTop: 1,
  },
  rateCell: {
    width: 50,
    alignItems: 'flex-end',
  },
  rateText: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakCell: {
    width: 40,
    alignItems: 'flex-end',
  },
  streakText: {
    fontSize: 13,
  },
});
