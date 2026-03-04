/**
 * YesterdayReviewCard.tsx - 어제 예측 복기 카드
 *
 * 역할: "어제의 예측 결과를 복기하는 학습 카드"
 * - 습관 루프의 핵심: 예측 → 복기 → 기준 형성
 * - 적중/오답 시각적 구분 + 해설 제공
 * - 적중률 + 연속 적중 표시
 *
 * 배치: CardSwipeContainer 아래 ScrollView 내부
 * 데이터: usePredictions.ts의 useYesterdayReview 사용
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import type { ThemeColors } from '../../styles/colors';
import { success, lightTap } from '../../services/hapticService';
import { GuruPredictionComment } from './GuruPredictionComment';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// Props 인터페이스
// ============================================================================

export interface YesterdayReviewResult {
  /** 예측 질문 */
  question: string;
  /** 내 투표 */
  myVote: 'YES' | 'NO';
  /** 정답 */
  correctAnswer: 'YES' | 'NO';
  /** 적중 여부 */
  isCorrect: boolean;
  /** 보상 크레딧 */
  reward: number;
  /** 배경 설명 (해설) */
  description?: string;
  /** 정답 근거 */
  source?: string;
}

interface YesterdayReviewCardProps {
  /** 어제 예측 결과 배열 */
  results: YesterdayReviewResult[];
  /** 적중률 (0~100, null이면 통계 미생성) */
  accuracyRate: number | null;
  /** 전체 기록 보기 콜백 */
  onViewHistory: () => void;
  /** 빈 상태에서 예측 화면으로 이동하는 CTA 콜백 */
  onStartPrediction?: () => void;
}

// ============================================================================
// 개별 결과 아이템 컴포넌트
// ============================================================================

const ReviewResultItem = React.memo(({
  result,
  index,
  styles,
  COLORS,
  t,
}: {
  result: YesterdayReviewResult;
  index: number;
  styles: ReturnType<typeof createStyles>;
  COLORS: ThemeColors;
  t: (key: string) => string;
}) => {
  // 해설 펼침/접힘 상태
  const [expanded, setExpanded] = React.useState(false);

  // 마운트 애니메이션 (순차 페이드인)
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 150, // 순차적 등장 (0ms, 150ms, 300ms)
      useNativeDriver: true,
    }).start(() => {
      // 페이드인 완료 후 적중 아이템이면 성공 햅틱
      if (result.isCorrect) {
        success();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animation should only run on mount
  }, []);

  const hasExplanation = !!(result.description || result.source);

  // 적중/오답에 따른 스타일 결정
  const itemStyle = result.isCorrect
    ? styles.resultItemCorrect
    : styles.resultItemWrong;

  return (
    <Animated.View style={[styles.resultItemWrapper, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[styles.resultItem, itemStyle]}
        onPress={() => {
          if (hasExplanation) {
            lightTap();
            setExpanded(!expanded);
          }
        }}
        disabled={!hasExplanation}
        activeOpacity={0.7}
      >
        {/* 상단 행: 적중/오답 아이콘 + 질문 */}
        <View style={styles.resultHeader}>
          <Text style={styles.resultEmoji}>
            {result.isCorrect ? '⭕' : '❌'}
          </Text>
          <Text
            style={[
              styles.resultQuestion,
              result.isCorrect ? styles.resultQuestionCorrect : styles.resultQuestionWrong,
            ]}
            numberOfLines={expanded ? undefined : 2}
          >
            {result.question}
          </Text>
        </View>

        {/* 투표 결과 행 */}
        <View style={styles.resultVoteRow}>
          <Text style={styles.resultVoteLabel}>
            {result.isCorrect ? '✅' : ''} {t('home.yesterday_review.voted')} {result.myVote}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={COLORS.textTertiary}
          />
          <Text style={styles.resultVoteLabel}>
            {t('home.yesterday_review.correct_answer')} {result.correctAnswer}
          </Text>
          {result.isCorrect && result.reward > 0 && (
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+{result.reward}개</Text>
            </View>
          )}
        </View>

        {/* 펼침 화살표 (해설이 있을 때만) */}
        {hasExplanation && (
          <View style={styles.expandHint}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.textTertiary}
            />
            <Text style={styles.expandHintText}>
              {expanded ? t('home.yesterday_review.collapse') : t('home.yesterday_review.show_explanation')}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 해설 영역 (펼쳐진 상태) */}
      {expanded && hasExplanation && (
        <View style={styles.explanationArea}>
          {result.description && (
            <View style={styles.explanationSection}>
              <Text style={styles.explanationLabel}>💡 {t('home.yesterday_review.explanation_background')}</Text>
              <Text style={styles.explanationText}>{result.description}</Text>
            </View>
          )}
          {result.source && (
            <View style={styles.explanationSection}>
              <Text style={styles.explanationLabel}>
                {result.isCorrect ? `🎯 ${t('home.yesterday_review.explanation_basis')}` : `📌 ${t('home.yesterday_review.explanation_basis')}`}
              </Text>
              <Text style={styles.explanationText}>{result.source}</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
});

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function YesterdayReviewCard({
  results,
  accuracyRate,
  onViewHistory,
  onStartPrediction,
}: YesterdayReviewCardProps) {
  const { colors } = useTheme();
  const { language, t } = useLocale();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const COLORS = colors; // 하위 호환성

  // 보상 스케일 애니메이션 (totalReward > 0일 때 실행)
  const rewardScaleAnim = React.useRef(new Animated.Value(0.8)).current;

  // 총 보상 계산 (결과가 있을 때만)
  const totalReward = React.useMemo(
    () => (results || []).reduce((sum, r) => sum + r.reward, 0),
    [results]
  );

  // 결과가 있을 때 햅틱 + 보상 스케일 애니메이션 트리거
  React.useEffect(() => {
    if (!results || results.length === 0) return;

    if (totalReward > 0) {
      // 보상이 있으면 성공 햅틱
      success();
      // 보상 텍스트 스케일 애니메이션: 0.8 → 1.2 → 1.0
      Animated.spring(rewardScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      // 보상 없으면 가벼운 햅틱
      lightTap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rewardScaleAnim is a ref, adding it causes unnecessary re-runs
  }, [results, totalReward]);

  // 결과가 없으면 Empty 상태
  if (!results || results.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.headerEmoji}>📊</Text>
          <Text style={styles.headerText}>{t('home.yesterday_review.header')}</Text>
        </View>
        <View style={styles.emptyArea}>
          <Text style={styles.emptyEmoji}>🔮</Text>
          <Text style={styles.emptyText}>{t('home.yesterday_review.empty_text')}</Text>
          <Text style={styles.emptySubtext}>
            {t('home.yesterday_review.empty_subtext')}
          </Text>
          {onStartPrediction && (
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={onStartPrediction}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyCtaText}>{t('home.yesterday_review.empty_cta')}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // 적중/오답 집계
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length;
  // totalReward는 위 useMemo에서 이미 계산됨

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <Text style={styles.headerEmoji}>📊</Text>
        <Text style={styles.headerText}>{t('home.yesterday_review.header')}</Text>
      </View>

      {/* 요약 행 */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {correctCount}/{totalCount}
          </Text>
          <Text style={styles.summaryLabel}>{t('home.yesterday_review.summary_hits')}</Text>
        </View>
        {accuracyRate !== null && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{accuracyRate}%</Text>
            <Text style={styles.summaryLabel}>{t('home.yesterday_review.summary_accuracy')}</Text>
          </View>
        )}
        {totalReward > 0 && (
          <View style={styles.summaryItem}>
            <Animated.Text
              style={[
                styles.summaryValue,
                { color: COLORS.primary, fontSize: 25 },
                { transform: [{ scale: rewardScaleAnim }] },
              ]}
            >
              +{totalReward}C
            </Animated.Text>
            <Text style={styles.summaryLabel}>{t('home.yesterday_review.summary_earned')}</Text>
          </View>
        )}
      </View>

      {/* 구루 코멘트 (적중률 기반 피드백 + 명언) */}
      <GuruPredictionComment
        correctCount={correctCount}
        totalCount={totalCount}
        colors={COLORS}
        locale={language}
      />

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 개별 결과 리스트 */}
      {results.map((result, index) => (
        <ReviewResultItem
          key={index}
          result={result}
          index={index}
          styles={styles}
          COLORS={COLORS}
          t={t}
        />
      ))}

      {/* 하단: 전체 기록 보기 */}
      <TouchableOpacity style={styles.historyButton} onPress={onViewHistory}>
        <Text style={styles.historyText}>{t('home.yesterday_review.view_history')}</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(YesterdayReviewCard);

// ============================================================================
// 스타일
// ============================================================================

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // 헤더
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerEmoji: {
    fontSize: 21,
  },
  headerText: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  // 요약 행
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  // 개별 결과
  resultItemWrapper: {
    marginBottom: 12,
  },
  resultItem: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  resultItemCorrect: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  resultItemWrong: {
    backgroundColor: 'rgba(207, 102, 121, 0.1)',
    borderColor: 'rgba(207, 102, 121, 0.3)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  resultEmoji: {
    fontSize: 19,
    marginTop: 2,
  },
  resultQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },
  resultQuestionCorrect: {
    color: COLORS.textPrimary,
  },
  resultQuestionWrong: {
    color: COLORS.textSecondary,
  },
  resultVoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 28, // 이모지 너비만큼 들여쓰기
  },
  resultVoteLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rewardBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: 'auto',
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandHintText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  // 해설 영역
  explanationArea: {
    marginTop: 8,
    marginLeft: 14,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    gap: 12,
  },
  explanationSection: {
    gap: 4,
  },
  explanationLabel: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  // Empty 상태
  emptyArea: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 4,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // 하단 버튼
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  historyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
