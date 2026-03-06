/**
 * YesterdayReviewSection.tsx - 어제 복기 섹션
 *
 * 역할: "어제 내 예측의 성적표 전체 보기"
 * - 어제 투표한 예측들의 통계 요약 (총 투표/적중/적중률)
 * - 각 예측의 정답/오답 복기 카드 목록
 * - 빈 상태 처리 (어제 투표 없음)
 * - ReviewCard 컴포넌트 재사용
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useYesterdayReview, useMyPredictionStats } from '../../hooks/usePredictions';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { useHabitLoopTracking } from '../../hooks/useHabitLoopTracking';
import ReviewCard from './ReviewCard';
import { AccuracyBadge } from './AccuracyBadge';
import { useLocale } from '../../context/LocaleContext';

export default function YesterdayReviewSection() {
  const { data: yesterdayPolls, summary, isLoading } = useYesterdayReview();
  const { data: myStats } = useMyPredictionStats();
  const track = useTrackEvent();
  const { trackStep } = useHabitLoopTracking();
  const { t } = useLocale();
  const hasTrackedView = useRef(false);

  // 복기 데이터가 로드되고 어제 투표가 있으면 review_completed 이벤트 기록
  useEffect(() => {
    if (!isLoading && yesterdayPolls && yesterdayPolls.length > 0 && !hasTrackedView.current) {
      hasTrackedView.current = true;
      track('review_completed', {
        totalVoted: summary.totalVoted,
        totalCorrect: summary.totalCorrect,
        accuracyRate: summary.accuracyRate,
      });
      trackStep('review_completed');
    }
  }, [isLoading, yesterdayPolls, summary, track, trackStep]);

  // 로딩 상태
  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'📊 '}{t('yesterdayReview.section_title')}</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('yesterdayReview.loading')}</Text>
        </View>
      </View>
    );
  }

  // 빈 상태 (어제 투표 없음)
  if (!yesterdayPolls || yesterdayPolls.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{'📊 '}{t('yesterdayReview.section_title')}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🗓️</Text>
          <Text style={styles.emptyTitle}>{t('yesterdayReview.empty_title')}</Text>
          <Text style={styles.emptyDescription}>
            {t('yesterdayReview.empty_desc')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{'📊 '}{t('yesterdayReview.section_title')}</Text>
        {myStats && (
          <AccuracyBadge accuracyRate={Number(myStats.accuracy_rate)} minVotes={myStats.total_votes} />
        )}
      </View>

      {/* 통계 요약 카드 */}
      <View style={styles.summaryCard}>
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="checkbox-outline" size={24} color="#4CAF50" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{summary.totalVoted}</Text>
            <Text style={styles.statLabel}>{t('yesterdayReview.stat_votes')}</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {summary.totalCorrect}
            </Text>
            <Text style={styles.statLabel}>{t('yesterdayReview.stat_hits')}</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="analytics" size={24} color="#FF9800" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>
              {summary.accuracyRate}%
            </Text>
            <Text style={styles.statLabel}>{t('yesterdayReview.stat_accuracy')}</Text>
          </View>
        </View>
      </View>

      {/* 격려 메시지 */}
      {summary.accuracyRate >= 70 && (
        <View style={styles.encouragementBanner}>
          <Text style={styles.encouragementEmoji}>🎉</Text>
          <Text style={styles.encouragementText}>
            {summary.accuracyRate >= 80
              ? t('yesterdayReview.encourage_high')
              : t('yesterdayReview.encourage_good')}
          </Text>
        </View>
      )}

      {summary.accuracyRate < 50 && summary.totalVoted >= 3 && (
        <View style={styles.encouragementBanner}>
          <Text style={styles.encouragementEmoji}>💪</Text>
          <Text style={styles.encouragementText}>
            {t('yesterdayReview.encourage_low')}
          </Text>
        </View>
      )}

      {/* 복기 카드 목록 */}
      <View style={styles.reviewList}>
        <Text style={styles.reviewListTitle}>{t('yesterdayReview.review_list_title')}</Text>
        {yesterdayPolls.map((poll) => (
          <ReviewCard
            key={poll.id}
            poll={poll}
            isCorrect={poll.myIsCorrect === true}
            currentStreak={myStats?.current_streak}
          />
        ))}
      </View>

      {/* 하단 팁 */}
      <View style={styles.tipContainer}>
        <Ionicons name="bulb-outline" size={16} color="#888888" />
        <Text style={styles.tipText}>
          {'💡 '}{t('yesterdayReview.tip')}
        </Text>
      </View>
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

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 로딩 상태
  loadingContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#666666',
  },

  // 빈 상태
  emptyContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },

  // 통계 요약 카드
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    // 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 8,
  },

  // 격려 메시지 배너
  encouragementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#2A1A2A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF5040',
  },
  encouragementEmoji: {
    fontSize: 25,
  },
  encouragementText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },

  // 복기 카드 목록
  reviewList: {
    marginBottom: 16,
  },
  reviewListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#AAAAAA',
    marginBottom: 12,
  },

  // 하단 팁
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#888888',
    lineHeight: 19,
  },
});
