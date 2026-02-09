/**
 * LeaderboardSection.tsx - 투자 예측 리더보드 섹션
 *
 * 역할: "명예의 전당"
 * - Top 10 유저 표시
 * - 순위 배지 (🥇🥈🥉)
 * - 적중률 + 투표 횟수
 * - 내 순위 하이라이트
 * - 최소 5회 투표 필터
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LeaderboardEntry } from '../../types/prediction';

interface LeaderboardSectionProps {
  leaderboard: LeaderboardEntry[] | undefined;
  isLoading: boolean;
}

export default function LeaderboardSection({ leaderboard, isLoading }: LeaderboardSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🏆 주간 리더보드</Text>
      {isLoading ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>리더보드를 불러오는 중...</Text>
        </View>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏅</Text>
          <Text style={styles.emptyTitle}>아직 리더보드가 비어있습니다</Text>
          <Text style={styles.emptyDescription}>
            최소 5회 투표한 유저만 리더보드에 표시됩니다.
          </Text>
        </View>
      ) : (
        <View style={styles.leaderboardCard}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.lbHeaderRank}>#</Text>
            <Text style={styles.lbHeaderName}>유저</Text>
            <Text style={styles.lbHeaderAccuracy}>적중률</Text>
            <Text style={styles.lbHeaderStreak}>연속</Text>
          </View>
          {leaderboard.map((entry) => (
            <View
              key={entry.user_id}
              style={[
                styles.leaderboardRow,
                entry.isMe && styles.leaderboardRowMe,
              ]}
            >
              <Text style={[styles.lbRank, entry.rank <= 3 && styles.lbRankTop]}>
                {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
              </Text>
              <View style={styles.lbNameCol}>
                <Text style={[styles.lbName, entry.isMe && styles.lbNameMe]}>
                  {entry.isMe ? '나' : entry.display_name}
                </Text>
                <Text style={styles.lbVotes}>{entry.total_votes}회 투표</Text>
              </View>
              <Text style={styles.lbAccuracy}>
                {Number(entry.accuracy_rate).toFixed(1)}%
              </Text>
              <Text style={styles.lbStreak}>
                {entry.best_streak > 0 ? `${entry.best_streak}🔥` : '-'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },

  // 로딩 상태
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },

  // 리더보드 카드
  leaderboardCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#252525',
  },
  lbHeaderRank: {
    width: 32,
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
  },
  lbHeaderName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
  },
  lbHeaderAccuracy: {
    width: 60,
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'right',
  },
  lbHeaderStreak: {
    width: 50,
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'right',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  leaderboardRowMe: {
    backgroundColor: '#1A2A1A',
  },
  lbRank: {
    width: 32,
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '600',
  },
  lbRankTop: {
    fontSize: 18,
  },
  lbNameCol: {
    flex: 1,
  },
  lbName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  lbNameMe: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  lbVotes: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  lbAccuracy: {
    width: 60,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  lbStreak: {
    width: 50,
    fontSize: 13,
    color: '#FF9800',
    textAlign: 'right',
  },
});
