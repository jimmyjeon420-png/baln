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
import { useTheme } from '../../src/hooks/useTheme';
import { getLocaleCode } from '../../src/utils/formatters';

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
  const { colors } = useTheme();
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
          console.warn('[예측] 투표 실패:', error.message);
          Alert.alert('투표 실패', '투표를 처리할 수 없습니다. 잠시 후 다시 시도해주세요.');
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{'📝 어제의 결과'}</Text>

            {/* 요약 배너 */}
            <View style={[styles.yesterdaySummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryEmoji}>
                  {yesterdaySummary.accuracyRate >= 60 ? '🎉' : '💪'}
                </Text>
                <View>
                  <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                    {yesterdaySummary.totalVoted}개 중 {yesterdaySummary.totalCorrect}개 적중
                  </Text>
                  <Text style={[styles.summarySubtitle, { color: colors.textTertiary }]}>
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
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { backgroundColor: info.color, borderColor: info.color },
                ]}
                onPress={() => setCategoryFilter(key)}
              >
                <Text style={styles.filterEmoji}>{info.emoji}</Text>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{'🎯 오늘의 예측'}</Text>
          {activeLoading ? (
            <View style={styles.loadingState}>
              <Text style={[styles.loadingText, { color: colors.textTertiary }]}>투표를 불러오는 중...</Text>
            </View>
          ) : filteredActive.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{'🔮'}</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>아직 예측 질문이 없습니다</Text>
              <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>
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
                      { backgroundColor: CATEGORY_COLORS[poll.category] || '#4CAF50' },
                    ]} />
                    <Text style={[
                      styles.categoryBadgeText,
                      { color: CATEGORY_COLORS[poll.category] || '#4CAF50' },
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
                <View style={[styles.allVotedBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                  <Text style={styles.allVotedEmoji}>{'🎯'}</Text>
                  <Text style={[styles.allVotedTitle, { color: colors.primary }]}>모든 투표 완료!</Text>
                  <Text style={[styles.allVotedDesc, { color: colors.textSecondary }]}>
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
        <View style={[styles.monthSummaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.monthSummaryTitle, { color: colors.textPrimary }]}>{'📅 이번 달 기록'}</Text>
          <View style={styles.monthStatsRow}>
            <View style={styles.monthStatItem}>
              <Text style={[styles.monthStatValue, { color: colors.textPrimary }]}>{monthAccuracy}%</Text>
              <Text style={[styles.monthStatLabel, { color: colors.textTertiary }]}>적중률</Text>
            </View>
            <View style={[styles.monthStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.monthStatItem}>
              <Text style={[styles.monthStatValue, { color: colors.textPrimary }]}>{monthCorrect}/{monthTotal}</Text>
              <Text style={[styles.monthStatLabel, { color: colors.textTertiary }]}>적중/투표</Text>
            </View>
            <View style={[styles.monthStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.monthStatItem}>
              <Text style={[
                styles.monthStatValue,
                { color: myStats?.current_streak && myStats.current_streak >= 3 ? '#FF9800' : colors.textPrimary },
              ]}>
                {myStats?.current_streak || 0}회
              </Text>
              <Text style={[styles.monthStatLabel, { color: colors.textTertiary }]}>연속 적중</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{'📊 최근 기록'}</Text>
          {resolvedLoading ? (
            <View style={styles.loadingState}>
              <Text style={[styles.loadingText, { color: colors.textTertiary }]}>기록을 불러오는 중...</Text>
            </View>
          ) : !resolvedPolls || resolvedPolls.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{'📋'}</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>아직 기록이 없습니다</Text>
              <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>
                예측에 참여하면 여기에 기록이 쌓입니다.
              </Text>
            </View>
          ) : (
            resolvedPolls
              .filter(p => p.myVote !== null) // 내가 투표한 것만
              .slice(0, 20) // 최근 20개
              .map((poll) => (
                <View key={poll.id} style={[styles.historyItem, { backgroundColor: colors.surface }]}>
                  <View style={styles.historyLeft}>
                    {/* 날짜 */}
                    <Text style={[styles.historyDate, { color: colors.textTertiary }]}>
                      {poll.resolved_at
                        ? new Date(poll.resolved_at).toLocaleDateString(getLocaleCode(), { month: 'numeric', day: 'numeric' })
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
                    <Text style={[styles.historyQuestion, { color: colors.textPrimary }]} numberOfLines={1}>
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
                      <Text style={styles.historyCreditText}>+{poll.myCreditsEarned}개</Text>
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
            <Text style={[styles.rewardLabel]}>적중 시</Text>
            <Text style={[styles.rewardValue, { color: colors.textPrimary }]}>
              +{PREDICTION_REWARDS.correct} 크레딧 (구독자 {PREDICTION_REWARDS.correct * PREDICTION_REWARDS.subscriberMultiplier})
            </Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={[styles.rewardLabel]}>5연속 적중</Text>
            <Text style={[styles.rewardValue, { color: colors.textPrimary }]}>+{PREDICTION_REWARDS.streak5Bonus} 보너스 크레딧</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={[styles.rewardLabel]}>10연속 적중</Text>
            <Text style={[styles.rewardValue, { color: colors.textPrimary }]}>+{PREDICTION_REWARDS.streak10Bonus} 보너스 크레딧</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>참여 비용</Text>
            <Text style={[styles.rewardValue, { color: colors.primary }]}>무료</Text>
          </View>
        </View>
      </>
    );
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>투자 예측</Text>
        {myStats && myStats.total_votes >= 5 && (
          <View style={styles.accuracyBadge}>
            <Text style={styles.accuracyBadgeText}>
              적중률 {Number(myStats.accuracy_rate).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      {/* 3탭 헤더: 투표하기 / 내 기록 / 리더보드 */}
      <View style={[styles.tabHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'vote' && { backgroundColor: colors.surfaceLight }]}
          onPress={() => setActiveTab('vote')}
        >
          <Ionicons
            name="hand-left-outline"
            size={16}
            color={activeTab === 'vote' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'vote' && { color: colors.primary, fontWeight: '700' }]}>
            투표하기
          </Text>
          {activePolls && activePolls.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{activePolls.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && { backgroundColor: colors.surfaceLight }]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'history' && { color: colors.primary, fontWeight: '700' }]}>
            내 기록
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'leaderboard' && { backgroundColor: colors.surfaceLight }]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Ionicons
            name="trophy-outline"
            size={16}
            color={activeTab === 'leaderboard' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'leaderboard' && { color: colors.primary, fontWeight: '700' }]}>
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
            tintColor={colors.primary}
          />
        }
      >
        {/* 탭별 컨텐츠 */}
        {renderTabContent()}

        {/* 면책 조항 (모든 탭 공통) */}
        <View style={styles.disclaimer}>
          <Ionicons name="warning-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>{PREDICTION_DISCLAIMER}</Text>
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
    fontSize: 21,
    fontWeight: 'bold',
  },
  accuracyBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  accuracyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  tabHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
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
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
  },
  allVotedBanner: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    borderWidth: 1,
  },
  allVotedEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  allVotedTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },
  allVotedDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  monthSummaryCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  monthSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  monthStatValue: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 4,
  },
  monthStatLabel: {
    fontSize: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
  historyWrongBadge: {
    backgroundColor: '#CF667920',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyWrongText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CF6679',
  },
  historyCreditText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
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
  },
  filterEmoji: {
    fontSize: 13,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 15,
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
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  yesterdaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  summaryEmoji: {
    fontSize: 33,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  summarySubtitle: {
    fontSize: 14,
  },
  summaryStreak: {
    backgroundColor: '#2A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  summaryStreakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800',
  },
  rewardInfo: {
    backgroundColor: '#1A2A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3A2A',
  },
  rewardInfoTitle: {
    fontSize: 14,
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
    fontSize: 14,
    color: '#AAAAAA',
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
