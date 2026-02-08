/**
 * 인사이트 허브 - 투자 예측 게임 / 투자 DNA / 거장 인사이트 통합 탭
 * 토스 "혜택" 탭처럼 매일 방문할 이유를 주는 MAU 허브 역할
 *
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePollsWithMyVotes, useMyPredictionStats } from '../../src/hooks/usePredictions';
import { useGuruInsights } from '../../src/hooks/useSharedAnalysis';
import { useMyTierAllocation } from '../../src/hooks/useTierAllocation';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';

// 컬러 팔레트
const COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  primary: '#4CAF50',
  error: '#CF6679',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#888888',
  border: '#333333',
  prediction: '#7C4DFF',
  dna: '#00BCD4',
  guru: '#FF9800',
};

// 센티먼트 색상
const SENTIMENT_COLORS: Record<string, string> = {
  BULLISH: '#4CAF50',
  BEARISH: '#CF6679',
  CAUTIOUS: '#FF9800',
  NEUTRAL: '#FFD700',
};

export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // 훅 호출
  const { userTier } = useSharedPortfolio();
  const { data: polls, isLoading: pollsLoading, refetch: refetchPolls } = usePollsWithMyVotes();
  const { data: myStats, isLoading: statsLoading, refetch: refetchStats } = useMyPredictionStats();
  const { data: guruData, isLoading: guruLoading, refetch: refetchGuru } = useGuruInsights();
  const { data: tierData, isLoading: tierLoading, refetch: refetchTier } = useMyTierAllocation(userTier);

  // 새로고침
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPolls(), refetchStats(), refetchGuru(), refetchTier()]);
    setRefreshing(false);
  }, [refetchPolls, refetchStats, refetchGuru, refetchTier]);

  // 미투표 질문 수 계산
  const unvotedCount = polls?.filter((p) => p.myVote === null).length ?? 0;

  // 진행 중 질문 1개 미리보기
  const previewPoll = polls?.find((p) => p.myVote === null) ?? polls?.[0];

  // 거장 상위 3명
  const topGurus = guruData?.insights?.slice(0, 3) ?? [];

  // 배분 비중 항목
  const allocations = tierData
    ? [
        { label: '주식', value: tierData.avg_stock_weight, color: '#4CAF50' },
        { label: '코인', value: tierData.avg_crypto_weight, color: '#FF9800' },
        { label: '부동산', value: tierData.avg_realestate_weight, color: '#2196F3' },
        { label: '현금', value: tierData.avg_cash_weight, color: '#9E9E9E' },
      ]
    : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>인사이트</Text>
        <View style={styles.headerBadge}>
          <Ionicons name="bulb" size={14} color="#FFD700" />
          <Text style={styles.headerBadgeText}>AI</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* 카드 1: 투자 예측 게임 (최상단 - MAU 핵심) */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/games/predictions')}
        >
          {/* 카드 헤더 */}
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconContainer, { backgroundColor: COLORS.prediction + '20' }]}>
              <Ionicons name="game-controller" size={20} color={COLORS.prediction} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>투자 예측 게임</Text>
              <Text style={styles.cardSubtitle}>맞추면 크레딧 보상!</Text>
            </View>
            {unvotedCount > 0 && (
              <View style={styles.unvotedBadge}>
                <Text style={styles.unvotedBadgeText}>{unvotedCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>

          {/* 카드 바디 */}
          {pollsLoading ? (
            <View style={styles.cardLoading}>
              <ActivityIndicator size="small" color={COLORS.prediction} />
            </View>
          ) : previewPoll ? (
            <View style={styles.pollPreview}>
              <Text style={styles.pollQuestion} numberOfLines={2}>
                {previewPoll.question}
              </Text>
              {previewPoll.myVote === null ? (
                <View style={styles.pollVoteHint}>
                  <Ionicons name="hand-left-outline" size={14} color={COLORS.prediction} />
                  <Text style={styles.pollVoteHintText}>투표하러 가기</Text>
                </View>
              ) : (
                <View style={styles.pollVotedTag}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                  <Text style={styles.pollVotedText}>투표 완료</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyText}>오늘의 예측 질문이 곧 업데이트됩니다</Text>
            </View>
          )}

          {/* 내 통계 한줄 요약 */}
          {!statsLoading && myStats && myStats.total_votes > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>정확도</Text>
                <Text style={styles.statValue}>{myStats.accuracy_rate.toFixed(0)}%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>연속</Text>
                <Text style={styles.statValue}>{myStats.current_streak}회</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>획득</Text>
                <Text style={styles.statValue}>{myStats.total_credits_earned}C</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* 카드 2: 투자 DNA */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/settings/tier-insights')}
        >
          {/* 카드 헤더 */}
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconContainer, { backgroundColor: COLORS.dna + '20' }]}>
              <Ionicons name="bar-chart" size={20} color={COLORS.dna} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>투자 DNA</Text>
              <Text style={styles.cardSubtitle}>{userTier} 등급 평균 배분</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>

          {/* 배분 비중 바 */}
          {tierLoading ? (
            <View style={styles.cardLoading}>
              <ActivityIndicator size="small" color={COLORS.dna} />
            </View>
          ) : allocations.length > 0 ? (
            <View style={styles.allocationContainer}>
              {/* 시각적 배분 바 */}
              <View style={styles.allocationBar}>
                {allocations
                  .filter((a) => a.value > 0)
                  .map((alloc, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.allocationSegment,
                        {
                          flex: alloc.value,
                          backgroundColor: alloc.color,
                          borderTopLeftRadius: idx === 0 ? 4 : 0,
                          borderBottomLeftRadius: idx === 0 ? 4 : 0,
                          borderTopRightRadius: idx === allocations.filter((a) => a.value > 0).length - 1 ? 4 : 0,
                          borderBottomRightRadius: idx === allocations.filter((a) => a.value > 0).length - 1 ? 4 : 0,
                        },
                      ]}
                    />
                  ))}
              </View>
              {/* 범례 */}
              <View style={styles.allocationLegend}>
                {allocations.map((alloc, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: alloc.color }]} />
                    <Text style={styles.legendLabel}>{alloc.label}</Text>
                    <Text style={styles.legendValue}>{alloc.value.toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyText}>데이터 수집 중...</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 카드 3: 거장 인사이트 */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push('/settings/gurus')}
        >
          {/* 카드 헤더 */}
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconContainer, { backgroundColor: COLORS.guru + '20' }]}>
              <Ionicons name="telescope" size={20} color={COLORS.guru} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>거장 인사이트</Text>
              <Text style={styles.cardSubtitle}>오늘의 투자 거장 분석</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>

          {/* 거장 리스트 */}
          {guruLoading ? (
            <View style={styles.cardLoading}>
              <ActivityIndicator size="small" color={COLORS.guru} />
            </View>
          ) : topGurus.length > 0 ? (
            <View style={styles.guruList}>
              {topGurus.map((guru, idx) => (
                <View key={idx} style={styles.guruItem}>
                  <View
                    style={[
                      styles.sentimentDot,
                      { backgroundColor: SENTIMENT_COLORS[guru.sentiment] || SENTIMENT_COLORS.NEUTRAL },
                    ]}
                  />
                  <Text style={styles.guruName}>{guru.guruName}</Text>
                  <Text style={styles.guruTopic} numberOfLines={1}>
                    {guru.topic}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyText}>거장 인사이트가 곧 업데이트됩니다</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 하단 여백 (탭바 가림 방지) */}
        <View style={{ height: 100 }} />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // 카드 공통
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardLoading: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  // 미투표 배지
  unvotedBadge: {
    backgroundColor: COLORS.prediction,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  unvotedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 투표 미리보기
  pollPreview: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
  },
  pollQuestion: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  pollVoteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollVoteHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.prediction,
  },
  pollVotedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollVotedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // 통계 행
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.surfaceLight,
  },

  // 배분 비중
  allocationContainer: {
    gap: 12,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceLight,
  },
  allocationSegment: {
    height: '100%',
  },
  allocationLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },

  // 거장 리스트
  guruList: {
    gap: 10,
  },
  guruItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  guruName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 10,
    minWidth: 50,
  },
  guruTopic: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // 빈 상태
  emptyPreview: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
