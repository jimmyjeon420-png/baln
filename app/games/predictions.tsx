/**
 * 투자 예측 게임 (Prediction Polls) 메인 화면 - 3탭 구조
 *
 * 역할: "투자 예측 경기장"
 * - 투표하기 탭: 오늘의 3개 질문 카드 + 투표 완료 메시지
 * - 내 기록 탭: 이번 달 적중률 + 연속 적중 + 최근 기록 리스트
 * - 리더보드 탭: TOP 10 + 내 순위 + 보상 안내
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import MyStatsSection from '../../src/components/predictions/MyStatsSection';
import ShareCard from '../../src/components/predictions/ShareCard';
import StatsChart from '../../src/components/predictions/StatsChart';
import StreakBadge from '../../src/components/predictions/StreakBadge';
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
import { COLORS } from '../../src/styles/theme';

// 3탭: 투표하기 / 내 기록 / 리더보드
type TabType = 'vote' | 'history' | 'leaderboard';

// 카테고리별 색상 매핑 (작업 요구사항)
const CATEGORY_COLORS: Record<string, string> = {
  stocks: '#2196F3',  // 파랑
  crypto: '#FF9800',  // 주황
  macro: '#9C27B0',   // 보라
  event: '#FFC107',   // 금색
};

export default function PredictionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('vote');
  const [categoryFilter, setCategoryFilter] = useState<PollCategoryFilter>('all');

  // 데이터 훅
  const { data: activePolls, isLoading: activeLoading, isRefetching } = usePollsWithMyVotes();
  const { data: resolvedPolls, isLoading: resolvedLoading } = useResolvedPollsWithMyVotes(50);
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

  // 투표하기 탭: 모두 투표 완료 여부 확인
  const allVoted = useMemo(() => {
    if (!activePolls || activePolls.length === 0) return false;
    return activePolls.every(p => p.myVote !== null);
  }, [activePolls]);

  // 내 기록 탭: 이번 달 필터링
  const thisMonthRecords = useMemo(() => {
    if (!resolvedPolls) return [];
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return resolvedPolls.filter(p => {
      if (!p.resolved_at) return false;
      return p.resolved_at.startsWith(thisMonth);
    });
  }, [resolvedPolls]);

  // 탭별 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'vote':
        return renderVoteTab();
      case 'history':
        return renderHistoryTab();
      case 'leaderboard':
        return renderLeaderboardTab();
      default:
        return null;
    }
  };

  // ============================================================================
  // 투표하기 탭
  // ============================================================================
  function renderVoteTab() {
    const filteredActive = (activePolls || []).filter(
      p => categoryFilter === 'all' || p.category === categoryFilter,
    );

    return (
      <>
        {/* 어제의 결과 복기 (습관 루프 강화) */}
        {yesterdayPolls && yesterdayPolls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{'📝 어제의 결과'}</Text>

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
                    {'🔥'} {myStats.current_streak}연속
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

        {/* 오늘의 투표 카드 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'🎯 오늘의 예측'}</Text>
          {activeLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>투표를 불러오는 중...</Text>
            </View>
          ) : filteredActive.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{'🔮'}</Text>
              <Text style={styles.emptyTitle}>아직 예측 질문이 없습니다</Text>
              <Text style={styles.emptyDescription}>
                {'매일 아침 7시에 새로운 투자 예측 질문이\n자동으로 생성됩니다.'}
              </Text>
            </View>
          ) : (
            <>
              {filteredActive.map((poll) => (
                <View key={poll.id}>
                  {/* 카테고리 뱃지 (카드 위) */}
                  <View style={styles.pollCategoryBadge}>
                    <View style={[
                      styles.categoryDot,
                      { backgroundColor: CATEGORY_COLORS[poll.category] || COLORS.primary },
                    ]} />
                    <Text style={[
                      styles.categoryBadgeText,
                      { color: CATEGORY_COLORS[poll.category] || COLORS.primary },
                    ]}>
                      {POLL_CATEGORY_INFO[poll.category as PollCategoryFilter]?.label || poll.category}
                    </Text>
                  </View>
                  <PollCard
                    poll={poll}
                    onVote={handleVote}
                    isVoting={submitVote.isPending}
                  />
                </View>
              ))}

              {/* 모두 투표 완료 시 안내 메시지 */}
              {allVoted && (
                <View style={styles.allVotedBanner}>
                  <Text style={styles.allVotedEmoji}>{'🎯'}</Text>
                  <Text style={styles.allVotedTitle}>모든 투표 완료!</Text>
                  <Text style={styles.allVotedDesc}>
                    내일 아침 결과를 확인하세요.{'\n'}적중하면 크레딧 보상이 지급됩니다!
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </>
    );
  }

  // ============================================================================
  // 내 기록 탭
  // ============================================================================
  function renderHistoryTab() {
    // 이번 달 통계 계산
    const monthCorrect = thisMonthRecords.filter(p => p.myIsCorrect === true).length;
    const monthTotal = thisMonthRecords.filter(p => p.myVote !== null).length;
    const monthAccuracy = monthTotal > 0 ? Math.round((monthCorrect / monthTotal) * 100) : 0;

    return (
      <>
        {/* 내 통계 카드 (원형 차트 포함) */}
        {myStats && <MyStatsSection stats={myStats} />}

        {/* 통계 차트 (최소 3회 투표 시 표시) */}
        {myStats && myStats.total_votes >= 3 && (
          <View style={{ marginBottom: 16 }}>
            <StatsChart />
          </View>
        )}

        {/* 이번 달 적중률 요약 카드 */}
        <View style={styles.monthSummaryCard}>
          <Text style={styles.monthSummaryTitle}>{'📅 이번 달 기록'}</Text>
          <View style={styles.monthStatsRow}>
            <View style={styles.monthStatItem}>
              <Text style={styles.monthStatValue}>{monthAccuracy}%</Text>
              <Text style={styles.monthStatLabel}>적중률</Text>
            </View>
            <View style={styles.monthStatDivider} />
            <View style={styles.monthStatItem}>
              <Text style={styles.monthStatValue}>{monthCorrect}/{monthTotal}</Text>
              <Text style={styles.monthStatLabel}>적중/투표</Text>
            </View>
            <View style={styles.monthStatDivider} />
            <View style={styles.monthStatItem}>
              <Text style={[
                styles.monthStatValue,
                { color: myStats?.current_streak && myStats.current_streak >= 3 ? '#FF9800' : COLORS.textPrimary },
              ]}>
                {myStats?.current_streak || 0}회
              </Text>
              <Text style={styles.monthStatLabel}>연속 적중</Text>
            </View>
          </View>
        </View>

        {/* 연속 적중 배지 (3연속 이상) */}
        {myStats && myStats.current_streak >= 3 && (
          <View style={{ marginBottom: 16 }}>
            <StreakBadge currentStreak={myStats.current_streak} />
          </View>
        )}

        {/* 인스타그램 공유 (5회 이상 투표 시) */}
        {myStats && myStats.total_votes >= 5 && (
          <ShareCard
            accuracyRate={Number(myStats.accuracy_rate.toFixed(0))}
            totalVotes={myStats.total_votes}
            currentStreak={myStats.current_streak}
            onShare={() => {
              console.log('투자 예측 적중률 공유 완료');
            }}
          />
        )}

        {/* 최근 기록 리스트 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'📊 최근 기록'}</Text>
          {resolvedLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>기록을 불러오는 중...</Text>
            </View>
          ) : !resolvedPolls || resolvedPolls.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{'📋'}</Text>
              <Text style={styles.emptyTitle}>아직 기록이 없습니다</Text>
              <Text style={styles.emptyDescription}>
                예측에 참여하면 여기에 기록이 쌓입니다.
              </Text>
            </View>
          ) : (
            resolvedPolls
              .filter(p => p.myVote !== null) // 내가 투표한 것만
              .slice(0, 20) // 최근 20개
              .map((poll) => (
                <View key={poll.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    {/* 날짜 */}
                    <Text style={styles.historyDate}>
                      {poll.resolved_at
                        ? new Date(poll.resolved_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
                        : '-'}
                    </Text>
                    {/* 카테고리 점 */}
                    <View style={[
                      styles.historyDot,
                      { backgroundColor: CATEGORY_COLORS[poll.category] || '#888' },
                    ]} />
                  </View>
                  {/* 질문 */}
                  <View style={styles.historyCenter}>
                    <Text style={styles.historyQuestion} numberOfLines={1}>
                      {poll.question}
                    </Text>
                  </View>
                  {/* 결과 */}
                  <View style={styles.historyRight}>
                    {poll.myIsCorrect === true ? (
                      <View style={styles.historyCorrectBadge}>
                        <Text style={styles.historyCorrectText}>{'🎯'} 적중</Text>
                      </View>
                    ) : (
                      <View style={styles.historyWrongBadge}>
                        <Text style={styles.historyWrongText}>오답</Text>
                      </View>
                    )}
                    {poll.myCreditsEarned > 0 && (
                      <Text style={styles.historyCreditText}>+{poll.myCreditsEarned}C</Text>
                    )}
                  </View>
                </View>
              ))
          )}
        </View>
      </>
    );
  }

  // ============================================================================
  // 리더보드 탭
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
            <Text style={styles.rewardValue}>
              +{PREDICTION_REWARDS.correct} 크레딧 (구독자 {PREDICTION_REWARDS.correct * PREDICTION_REWARDS.subscriberMultiplier})
            </Text>
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
            <Text style={[styles.rewardValue, { color: COLORS.primary }]}>무료</Text>
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

      {/* 3탭 헤더: 투표하기 / 내 기록 / 리더보드 */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'vote' && styles.tabButtonActive]}
          onPress={() => setActiveTab('vote')}
        >
          <Ionicons
            name="hand-left-outline"
            size={16}
            color={activeTab === 'vote' ? COLORS.primary : '#888888'}
          />
          <Text style={[styles.tabText, activeTab === 'vote' && styles.tabTextActive]}>
            투표하기
          </Text>
          {activePolls && activePolls.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{activePolls.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? COLORS.primary : '#888888'}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            내 기록
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'leaderboard' && styles.tabButtonActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Ionicons
            name="trophy-outline"
            size={16}
            color={activeTab === 'leaderboard' ? COLORS.primary : '#888888'}
          />
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
            tintColor={COLORS.primary}
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
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textPrimary,
  },
  accuracyBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  accuracyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },

  // 탭 헤더 (3탭: 투표하기 / 내 기록 / 리더보드)
  tabHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#2A2A2A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.primary,
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

  // 카테고리 뱃지 (투표하기 탭 카드 위)
  pollCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    marginLeft: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // 모두 투표 완료 배너
  allVotedBanner: {
    alignItems: 'center',
    backgroundColor: '#1A2A1A',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  allVotedEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  allVotedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  allVotedDesc: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 21,
  },

  // 이번 달 기록 요약
  monthSummaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  monthSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  monthStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#333333',
  },
  monthStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  monthStatLabel: {
    fontSize: 11,
    color: '#888888',
  },

  // 내 기록 리스트 아이템
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
    minWidth: 50,
  },
  historyDate: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
  historyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  historyCenter: {
    flex: 1,
    marginRight: 10,
  },
  historyQuestion: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyCorrectBadge: {
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyCorrectText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  historyWrongBadge: {
    backgroundColor: '#CF667920',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyWrongText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.error,
  },
  historyCreditText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
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
    backgroundColor: COLORS.surface,
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
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },

  // 어제의 결과 요약 배너
  yesterdaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
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
    color: COLORS.textPrimary,
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
    color: COLORS.primary,
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
    color: COLORS.textPrimary,
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
