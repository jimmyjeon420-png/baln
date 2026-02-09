/**
 * 투자 예측 게임 (Prediction Polls) 메인 화면 - 3탭 구조
 *
 * 역할: "투자 예측 경기장"
 * - 진행중 탭: 활성 투표 + 내 통계 + 어제 복기
 * - 종료됨 탭: 정답 판정 완료 투표
 * - 리더보드 탭: 상위 10명 + 내 순위 + 보상 안내
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
import PollCard from '../../src/components/predictions/PollCard';
import ReviewCard from '../../src/components/predictions/ReviewCard';
import LeaderboardSection from '../../src/components/predictions/LeaderboardSection';
import StreakBadge from '../../src/components/predictions/StreakBadge';
import MyStatsSection from '../../src/components/predictions/MyStatsSection';
import {
  usePollsWithMyVotes,
  useResolvedPollsWithMyVotes,
  useSubmitVote,
  useLeaderboard,
  useMyPredictionStats,
  useYesterdayReview,
} from '../../src/hooks/usePredictions';
import {
  PollCategoryFilter,
  POLL_CATEGORY_INFO,
  PREDICTION_DISCLAIMER,
  PREDICTION_REWARDS,
} from '../../src/types/prediction';

type TabType = 'active' | 'resolved' | 'leaderboard';

export default function PredictionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [categoryFilter, setCategoryFilter] = useState<PollCategoryFilter>('all');

  // 데이터 훅
  const { data: activePolls, isLoading: activeLoading, isRefetching } = usePollsWithMyVotes();
  const { data: resolvedPolls, isLoading: resolvedLoading } = useResolvedPollsWithMyVotes(20);
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard();
  const { data: myStats } = useMyPredictionStats();
  const { data: yesterdayPolls, summary: yesterdaySummary } = useYesterdayReview();
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

  // 탭별 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'active':
        return renderActiveTab();
      case 'resolved':
        return renderResolvedTab();
      case 'leaderboard':
        return renderLeaderboardTab();
      default:
        return null;
    }
  };

  // ============================================================================
  // 진행중 탭 렌더링
  // ============================================================================
  function renderActiveTab() {
    const filteredActive = (activePolls || []).filter(
      p => categoryFilter === 'all' || p.category === categoryFilter,
    );

    return (
      <>
        {/* 내 통계 카드 */}
        {myStats && <MyStatsSection stats={myStats} />}

        {/* 연속 적중 배지 (3연속 이상) */}
        {myStats && myStats.current_streak >= 3 && (
          <View style={{ marginBottom: 16 }}>
            <StreakBadge currentStreak={myStats.current_streak} />
          </View>
        )}

        {/* 어제의 결과 복기 (습관 루프) */}
        {yesterdayPolls && yesterdayPolls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 어제의 결과</Text>

            {/* 요약 배너 */}
            <View style={styles.yesterdaySummary}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryEmoji}>
                  {yesterdaySummary.accuracyRate >= 60 ? '🎉' : '💪'}
                </Text>
                <View>
                  <Text style={styles.summaryTitle}>
                    {yesterdaySummary.totalVoted}개 중 {yesterdaySummary.totalCorrect}개 적중
                  </Text>
                  <Text style={styles.summarySubtitle}>
                    적중률 {yesterdaySummary.accuracyRate}%
                  </Text>
                </View>
              </View>
              {myStats && myStats.current_streak >= 3 && (
                <View style={styles.summaryStreak}>
                  <Text style={styles.summaryStreakText}>
                    🔥 {myStats.current_streak}연속
                  </Text>
                </View>
              )}
            </View>

            {/* 복기 카드 리스트 */}
            {yesterdayPolls.map((poll) => (
              <ReviewCard
                key={poll.id}
                poll={poll}
                isCorrect={poll.myIsCorrect === true}
                currentStreak={myStats?.current_streak}
              />
            ))}
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
      </>
    );
  }

  // ============================================================================
  // 종료됨 탭 렌더링
  // ============================================================================
  function renderResolvedTab() {
    const filteredResolved = (resolvedPolls || []).filter(
      p => categoryFilter === 'all' || p.category === categoryFilter,
    );

    return (
      <>
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

        {/* 최근 결과 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 최근 결과</Text>
          {resolvedLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>결과를 불러오는 중...</Text>
            </View>
          ) : filteredResolved.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>종료된 예측이 없습니다</Text>
              <Text style={styles.emptyDescription}>
                예측이 마감되면 여기에 표시됩니다.
              </Text>
            </View>
          ) : (
            filteredResolved.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onVote={handleVote}
              />
            ))
          )}
        </View>
      </>
    );
  }

  // ============================================================================
  // 리더보드 탭 렌더링
  // ============================================================================
  function renderLeaderboardTab() {
    return (
      <>
        {/* 주간 리더보드 */}
        <LeaderboardSection leaderboard={leaderboard} isLoading={leaderboardLoading} />

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
      </>
    );
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================
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

      {/* 탭 헤더 */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            진행중
          </Text>
          {activePolls && activePolls.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{activePolls.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'resolved' && styles.tabButtonActive]}
          onPress={() => setActiveTab('resolved')}
        >
          <Text style={[styles.tabText, activeTab === 'resolved' && styles.tabTextActive]}>
            종료됨
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'leaderboard' && styles.tabButtonActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
            리더보드
          </Text>
        </TouchableOpacity>
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
        {/* 탭별 컨텐츠 */}
        {renderTabContent()}

        {/* 면책 조항 (모든 탭 공통) */}
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

  // 탭 헤더
  tabHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#2A2A2A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
  tabTextActive: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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

  // 어제의 결과 요약 배너
  yesterdaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  summaryEmoji: {
    fontSize: 32,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#888888',
  },
  summaryStreak: {
    backgroundColor: '#2A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  summaryStreakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9800',
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
