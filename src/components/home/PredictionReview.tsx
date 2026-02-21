/**
 * PredictionReview.tsx - 어제 예측 복기 카드
 *
 * 역할: "어제 예측한 결과를 복기하는 컴포넌트"
 * - 어제 예측한 결과 복기 (정답/오답 + 해설)
 * - 적중 시 +3C 크레딧 표시
 * - 연속 적중 스트릭 표시
 * - "나의 적중률" 퍼센트 표시
 *
 * useTheme()으로 다크/라이트 모드 대응
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useTrackEvent } from '../../hooks/useAnalytics';
import { useHabitLoopTracking } from '../../hooks/useHabitLoopTracking';
import { formatCredits } from '../../utils/formatters';

// Android LayoutAnimation 활성화
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// Props 인터페이스
// ============================================================================

export interface PredictionReviewProps {
  reviews: Array<{
    id: string;
    question: string;
    myAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }>;
  streak: number;
  accuracy: number;
  creditsEarned: number;
}

// ============================================================================
// 개별 복기 아이템 컴포넌트
// ============================================================================

interface ReviewItemProps {
  review: {
    id: string;
    question: string;
    myAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  };
  index: number;
}

function ReviewItem({ review, index }: ReviewItemProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rotateValue = useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);

    Animated.timing(rotateValue, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateValue]);

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const resultColor = review.isCorrect ? colors.success : colors.error;
  const resultBgColor = review.isCorrect
    ? colors.success + '15'
    : colors.error + '15';

  return (
    <View
      style={[
        styles.reviewItem,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: resultColor + '30',
        },
      ]}
    >
      {/* 헤더 (터치하여 펼치기) */}
      <TouchableOpacity
        style={styles.reviewHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.reviewHeaderLeft}>
          {/* 결과 아이콘 */}
          <View
            style={[styles.resultIcon, { backgroundColor: resultBgColor }]}
          >
            <Ionicons
              name={review.isCorrect ? 'checkmark' : 'close'}
              size={16}
              color={resultColor}
            />
          </View>
          {/* 질문 텍스트 */}
          <Text
            style={[styles.reviewQuestion, { color: colors.textPrimary }]}
            numberOfLines={expanded ? undefined : 2}
          >
            {review.question}
          </Text>
        </View>

        <View style={styles.reviewHeaderRight}>
          {/* 적중 크레딧 */}
          {review.isCorrect && (
            <Text style={[styles.creditText, { color: colors.success }]}>
              +{formatCredits(3, false)}
            </Text>
          )}
          {/* 펼치기 아이콘 */}
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons
              name="chevron-down"
              size={18}
              color={colors.textTertiary}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* 펼쳐진 상세 내용 */}
      {expanded && (
        <View style={styles.reviewDetail}>
          {/* 내 답변 vs 정답 */}
          <View style={styles.answerComparison}>
            <View style={styles.answerBox}>
              <Text
                style={[styles.answerLabel, { color: colors.textTertiary }]}
              >
                내 답변
              </Text>
              <Text
                style={[
                  styles.answerValue,
                  {
                    color: review.isCorrect ? colors.success : colors.error,
                  },
                ]}
              >
                {review.myAnswer}
              </Text>
            </View>

            <Ionicons
              name={review.isCorrect ? 'checkmark-circle' : 'arrow-forward'}
              size={16}
              color={colors.textTertiary}
            />

            <View style={styles.answerBox}>
              <Text
                style={[styles.answerLabel, { color: colors.textTertiary }]}
              >
                정답
              </Text>
              <Text
                style={[styles.answerValue, { color: colors.success }]}
              >
                {review.correctAnswer}
              </Text>
            </View>
          </View>

          {/* 해설 */}
          {review.explanation && (
            <View
              style={[
                styles.explanationBox,
                {
                  backgroundColor: colors.surface,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[styles.explanationLabel, { color: colors.primary }]}
              >
                해설
              </Text>
              <Text
                style={[
                  styles.explanationText,
                  { color: colors.textSecondary },
                ]}
              >
                {review.explanation}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PredictionReview({
  reviews,
  streak,
  accuracy,
  creditsEarned,
}: PredictionReviewProps) {
  const { colors, shadows } = useTheme();
  const track = useTrackEvent();
  const { trackStep } = useHabitLoopTracking();
  const hasTrackedReview = useRef(false);

  const correctCount = reviews.filter((r) => r.isCorrect).length;

  // 복기 데이터가 로드되면 review_completed 이벤트 기록 (1회만)
  useEffect(() => {
    if (reviews.length > 0 && !hasTrackedReview.current) {
      hasTrackedReview.current = true;
      track('review_completed', {
        totalReviews: reviews.length,
        correctCount,
        accuracy,
        streak,
      });
      trackStep('review_completed');
    }
  }, [reviews.length, correctCount, accuracy, streak, track, trackStep]);

  // 빈 상태
  if (reviews.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>📋</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            어제의 복기
          </Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            아직 복기할 예측이 없습니다
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>📋</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            어제의 복기
          </Text>
        </View>
        {/* 적중 요약 */}
        <View
          style={[
            styles.resultSummary,
            { backgroundColor: colors.success + '15' },
          ]}
        >
          <Text style={[styles.resultSummaryText, { color: colors.success }]}>
            {correctCount}/{reviews.length} 적중
          </Text>
        </View>
      </View>

      {/* 스탯 바 (스트릭 + 적중률 + 크레딧) */}
      <View style={[styles.statsBar, { borderColor: colors.border }]}>
        {/* 연속 적중 스트릭 */}
        <View style={styles.statItem}>
          <View style={styles.statIconRow}>
            <Ionicons
              name="flame"
              size={16}
              color={streak > 0 ? colors.warning : colors.textTertiary}
            />
            <Text
              style={[
                styles.statValue,
                {
                  color: streak > 0 ? colors.warning : colors.textTertiary,
                },
              ]}
            >
              {streak}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            연속 적중
          </Text>
        </View>

        {/* 구분선 */}
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />

        {/* 적중률 */}
        <View style={styles.statItem}>
          <View style={styles.statIconRow}>
            <Ionicons
              name="analytics"
              size={16}
              color={accuracy >= 60 ? colors.success : colors.textSecondary}
            />
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    accuracy >= 60 ? colors.success : colors.textSecondary,
                },
              ]}
            >
              {accuracy}%
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            나의 적중률
          </Text>
        </View>

        {/* 구분선 */}
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />

        {/* 획득 크레딧 */}
        <View style={styles.statItem}>
          <View style={styles.statIconRow}>
            <Ionicons
              name="star"
              size={16}
              color={creditsEarned > 0 ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    creditsEarned > 0 ? colors.primary : colors.textTertiary,
                },
              ]}
            >
              {formatCredits(creditsEarned, false)}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            획득
          </Text>
        </View>
      </View>

      {/* 복기 아이템 목록 */}
      {reviews.map((review, index) => (
        <ReviewItem key={review.id} review={review} index={index} />
      ))}

      {/* 스트릭 메시지 */}
      {streak >= 3 && (
        <View
          style={[
            styles.streakBanner,
            {
              backgroundColor: colors.streak?.background || colors.warning + '15',
              borderColor: colors.warning + '30',
            },
          ]}
        >
          <Text style={styles.streakEmoji}>
            {streak >= 10 ? '🏆' : streak >= 5 ? '💪' : '🔥'}
          </Text>
          <Text style={[styles.streakText, { color: colors.warning }]}>
            {streak}연속 적중! {streak >= 10 ? '레전드 달성!' : '계속 가보자!'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 23,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  resultSummary: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  resultSummaryText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // 스탯 바
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 28,
  },

  // 복기 아이템
  reviewItem: {
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  resultIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  reviewHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  creditText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // 복기 상세
  reviewDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  answerComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  answerBox: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  answerValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // 해설
  explanationBox: {
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 12,
  },
  explanationLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 21,
  },

  // 빈 상태
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },

  // 스트릭 배너
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  streakEmoji: {
    fontSize: 19,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
