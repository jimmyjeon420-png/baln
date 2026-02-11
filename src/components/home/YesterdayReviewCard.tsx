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
}

// ============================================================================
// 개별 결과 아이템 컴포넌트
// ============================================================================

const ReviewResultItem = React.memo(({
  result,
  index,
  styles,
  COLORS,
}: {
  result: YesterdayReviewResult;
  index: number;
  styles: ReturnType<typeof createStyles>;
  COLORS: ThemeColors;
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
    }).start();
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
        onPress={() => hasExplanation && setExpanded(!expanded)}
        disabled={!hasExplanation}
        activeOpacity={0.7}
      >
        {/* 상단 행: 적중/오답 아이콘 + 질문 */}
        <View style={styles.resultHeader}>
          <Text style={styles.resultEmoji}>
            {result.isCorrect ? '🎯' : '❌'}
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
            {result.isCorrect ? '✅' : ''} {result.myVote}로 투표
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={COLORS.textTertiary}
          />
          <Text style={styles.resultVoteLabel}>
            정답 {result.correctAnswer}
          </Text>
          {result.isCorrect && result.reward > 0 && (
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+{result.reward}C</Text>
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
              {expanded ? '접기' : '해설 보기'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 해설 영역 (펼쳐진 상태) */}
      {expanded && hasExplanation && (
        <View style={styles.explanationArea}>
          {result.description && (
            <View style={styles.explanationSection}>
              <Text style={styles.explanationLabel}>💡 배경</Text>
              <Text style={styles.explanationText}>{result.description}</Text>
            </View>
          )}
          {result.source && (
            <View style={styles.explanationSection}>
              <Text style={styles.explanationLabel}>
                {result.isCorrect ? '🎯 정답 근거' : '📌 정답 근거'}
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
}: YesterdayReviewCardProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const COLORS = colors; // 하위 호환성

  // 결과가 없으면 Empty 상태
  if (!results || results.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.headerEmoji}>📊</Text>
          <Text style={styles.headerText}>어제의 예측 결과</Text>
        </View>
        <View style={styles.emptyArea}>
          <Text style={styles.emptyEmoji}>🔮</Text>
          <Text style={styles.emptyText}>아직 복기할 예측이 없어요</Text>
          <Text style={styles.emptySubtext}>
            오늘 예측에 참여하면 내일 결과를 확인할 수 있어요
          </Text>
        </View>
      </View>
    );
  }

  // 적중/오답 집계
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length;
  const totalReward = results.reduce((sum, r) => sum + r.reward, 0);

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <Text style={styles.headerEmoji}>📊</Text>
        <Text style={styles.headerText}>어제의 예측 결과</Text>
      </View>

      {/* 요약 행 */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {correctCount}/{totalCount}
          </Text>
          <Text style={styles.summaryLabel}>적중</Text>
        </View>
        {accuracyRate !== null && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{accuracyRate}%</Text>
            <Text style={styles.summaryLabel}>누적 적중률</Text>
          </View>
        )}
        {totalReward > 0 && (
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
              +{totalReward}C
            </Text>
            <Text style={styles.summaryLabel}>획득</Text>
          </View>
        )}
      </View>

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
        />
      ))}

      {/* 하단: 전체 기록 보기 */}
      <TouchableOpacity style={styles.historyButton} onPress={onViewHistory}>
        <Text style={styles.historyText}>전체 기록 보기</Text>
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
    fontSize: 20,
  },
  headerText: {
    fontSize: 18,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
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
    fontSize: 18,
    marginTop: 2,
  },
  resultQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
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
    fontSize: 13,
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
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
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
