/**
 * 투자 예측 게임 (Prediction Polls) 메인 화면
 *
 * 역할: "투자 예측 경기장"
 * - 매일 3개 투자 예측 질문에 YES/NO로 투표
 * - 적중 시 크레딧 보상, 연속 적중 보너스
 * - 주간 리더보드로 경쟁심 유발
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import PollCard from '../../src/components/PollCard';
import {
  usePollsWithMyVotes,
  useResolvedPollsWithMyVotes,
  useSubmitVote,
  useLeaderboard,
  useMyPredictionStats,
  PREDICTION_KEYS,
} from '../../src/hooks/usePredictions';
import {
  PollCategoryFilter,
  POLL_CATEGORY_INFO,
  PREDICTION_DISCLAIMER,
  PREDICTION_REWARDS,
} from '../../src/types/prediction';

export default function PredictionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<PollCategoryFilter>('all');

  // 데이터 훅
  const { data: activePolls, isLoading: activeLoading, isRefetching } = usePollsWithMyVotes();
  const { data: resolvedPolls, isLoading: resolvedLoading } = useResolvedPollsWithMyVotes(10);
  const { data: leaderboard } = useLeaderboard();
  const { data: myStats } = useMyPredictionStats();
  const submitVote = useSubmitVote();

  // 새로고침
  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['prediction'] });
  }, [queryClient]);

  // 투표 핸들러
  const handleVote = useCallback((pollId: string, vote: 'YES' | 'NO') => {
    submitVote.mutate(
      { pollId, vote },
      {
        onError: (error: Error) => {
          Alert.alert('투표 실패', error.message);
        },
      },
    );
  }, [submitVote]);

  // 카테고리 필터 적용
  const filteredActive = (activePolls || []).filter(
    p => categoryFilter === 'all' || p.category === categoryFilter,
  );
  const filteredResolved = (resolvedPolls || []).filter(
    p => categoryFilter === 'all' || p.category === categoryFilter,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>투자 예측</Text>
        {myStats && myStats.total_votes >= 5 && (
          <View style={styles.accuracyBadge}>
            <Text style={styles.accuracyBadgeText}>
              적중률 {Number(myStats.accuracy_rate).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {/* 내 통계 카드 */}
        {myStats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>나의 예측 기록</Text>
            <View style={styles.statsGrid}>
              <StatItem label="총 투표" value={`${myStats.total_votes}회`} />
              <StatItem
                label="적중률"
                value={`${Number(myStats.accuracy_rate).toFixed(1)}%`}
                highlight={Number(myStats.accuracy_rate) >= 60}
              />
              <StatItem
                label="연속 적중"
                value={`${myStats.current_streak}연속`}
                highlight={myStats.current_streak >= 5}
              />
              <StatItem label="획득 크레딧" value={`${myStats.total_credits_earned}C`} />
            </View>
            {myStats.current_streak >= 3 && (
              <View style={styles.streakBanner}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakText}>
                  {myStats.current_streak}연속 적중 중!
                  {myStats.current_streak < 5
                    ? ` (5연속 시 +${PREDICTION_REWARDS.streak5Bonus} 보너스)`
                    : myStats.current_streak < 10
                      ? ` (10연속 시 +${PREDICTION_REWARDS.streak10Bonus} 보너스)`
                      : ' 🏆 대단해요!'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 카테고리 필터 칩 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {(Object.keys(POLL_CATEGORY_INFO) as PollCategoryFilter[]).map((key) => {
            const info = POLL_CATEGORY_INFO[key];
            const isActive = categoryFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: info.color, borderColor: info.color },
                ]}
                onPress={() => setCategoryFilter(key)}
              >
                <Text style={styles.filterEmoji}>{info.emoji}</Text>
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && { color: '#000000', fontWeight: '700' },
                  ]}
                >
                  {info.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 오늘의 투표 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 오늘의 예측</Text>
          {activeLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>투표를 불러오는 중...</Text>
            </View>
          ) : filteredActive.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔮</Text>
              <Text style={styles.emptyTitle}>아직 예측 질문이 없습니다</Text>
              <Text style={styles.emptyDescription}>
                매일 아침 7시에 새로운 투자 예측 질문이{'\n'}자동으로 생성됩니다.
              </Text>
            </View>
          ) : (
            filteredActive.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onVote={handleVote}
                isVoting={submitVote.isPending}
              />
            ))
          )}
        </View>

        {/* 최근 결과 */}
        {filteredResolved.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 최근 결과</Text>
            {filteredResolved.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onVote={handleVote}
              />
            ))}
          </View>
        )}

        {/* 주간 리더보드 */}
        {leaderboard && leaderboard.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 주간 리더보드</Text>
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
          </View>
        )}

        {/* 보상 안내 */}
        <View style={styles.rewardInfo}>
          <Text style={styles.rewardInfoTitle}>보상 안내</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>적중 시</Text>
            <Text style={styles.rewardValue}>+{PREDICTION_REWARDS.correct} 크레딧 (구독자 {PREDICTION_REWARDS.correct * PREDICTION_REWARDS.subscriberMultiplier})</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>5연속 적중</Text>
            <Text style={styles.rewardValue}>+{PREDICTION_REWARDS.streak5Bonus} 보너스 크레딧</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>10연속 적중</Text>
            <Text style={styles.rewardValue}>+{PREDICTION_REWARDS.streak10Bonus} 보너스 크레딧</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>참여 비용</Text>
            <Text style={[styles.rewardValue, { color: '#4CAF50' }]}>무료</Text>
          </View>
        </View>

        {/* 면책 조항 */}
        <View style={styles.disclaimer}>
          <Ionicons name="warning-outline" size={14} color="#666666" />
          <Text style={styles.disclaimerText}>{PREDICTION_DISCLAIMER}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 통계 아이템 컴포넌트
// ============================================================================

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  accuracyBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  accuracyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },

  // 통계 카드
  statsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statValueHighlight: {
    color: '#4CAF50',
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2A1A1A',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    flex: 1,
  },

  // 필터 칩
  filterRow: {
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1E1E1E',
  },
  filterEmoji: {
    fontSize: 12,
  },
  filterChipText: {
    fontSize: 13,
    color: '#AAAAAA',
    fontWeight: '500',
  },

  // 섹션
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },

  // 로딩/빈 상태
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
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

  // 리더보드
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

  // 보상 안내
  rewardInfo: {
    backgroundColor: '#1A2A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3A2A',
  },
  rewardInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 12,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rewardLabel: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  rewardValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // 면책 조항
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#666666',
    lineHeight: 16,
  },
});
