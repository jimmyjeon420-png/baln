/**
 * PredictionVote.tsx - 예측 투표 카드 (다중 옵션)
 *
 * 역할: "오늘의 예측 투표 컴포넌트"
 * - 3개 예측 질문 표시 (예: "내일 코스피 방향은?" → 상승/보합/하락)
 * - 투표하면 크레딧 획득 애니메이션 (+2C)
 * - 이미 투표했으면 "투표 완료" 상태 표시
 * - 남은 투표 수 표시 (3/3, 2/3 등)
 *
 * useTheme()으로 다크/라이트 모드 대응
 */

import React, { useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
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

export interface PredictionVoteProps {
  questions: {
    id: string;
    text: string;
    options: string[];
    votedOption?: string;
  }[];
  onVote: (questionId: string, option: string) => void;
  creditsEarned: number;
}

// ============================================================================
// 개별 질문 카드 컴포넌트
// ============================================================================

interface QuestionCardProps {
  question: {
    id: string;
    text: string;
    options: string[];
    votedOption?: string;
  };
  index: number;
  onVote: (questionId: string, option: string) => void;
}

function QuestionCard({ question, index, onVote }: QuestionCardProps) {
  const { colors } = useTheme();
  const hasVoted = !!question.votedOption;

  // 각 옵션 버튼에 대한 scale 애니메이션
  const scaleValues = useRef(
    question.options.map(() => new Animated.Value(1))
  ).current;

  // 크레딧 획득 팝업 애니메이션
  const creditOpacity = useRef(new Animated.Value(0)).current;
  const creditTranslateY = useRef(new Animated.Value(0)).current;
  const [showCredit, setShowCredit] = React.useState(false);

  const handlePressIn = useCallback(
    (optionIndex: number) => {
      Animated.spring(scaleValues[optionIndex], {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    },
    [scaleValues]
  );

  const handlePressOut = useCallback(
    (optionIndex: number) => {
      Animated.spring(scaleValues[optionIndex], {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }).start();
    },
    [scaleValues]
  );

  const handleVote = useCallback(
    (option: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onVote(question.id, option);

      // 크레딧 획득 애니메이션
      setShowCredit(true);
      creditOpacity.setValue(0);
      creditTranslateY.setValue(0);

      Animated.parallel([
        Animated.timing(creditOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(creditTranslateY, {
          toValue: -20,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(creditOpacity, {
          toValue: 0,
          duration: 400,
          delay: 300,
          useNativeDriver: true,
        }).start(() => setShowCredit(false));
      });
    },
    [question.id, onVote, creditOpacity, creditTranslateY]
  );

  // 옵션별 아이콘 (상승/보합/하락 패턴)
  const getOptionIcon = (option: string): string => {
    const lower = option.toLowerCase();
    if (lower.includes('상승') || lower.includes('오름') || lower.includes('up'))
      return 'trending-up';
    if (lower.includes('하락') || lower.includes('내림') || lower.includes('down'))
      return 'trending-down';
    if (lower.includes('보합') || lower.includes('횡보') || lower.includes('flat'))
      return 'remove-outline';
    return 'radio-button-off';
  };

  const getOptionColor = (option: string): string => {
    const lower = option.toLowerCase();
    if (lower.includes('상승') || lower.includes('오름') || lower.includes('up'))
      return colors.buy;
    if (lower.includes('하락') || lower.includes('내림') || lower.includes('down'))
      return colors.sell;
    return colors.neutral;
  };

  return (
    <View
      style={[
        styles.questionCard,
        {
          backgroundColor: colors.surface,
          borderColor: hasVoted ? colors.primary + '40' : colors.border,
        },
      ]}
    >
      {/* 질문 번호 + 텍스트 */}
      <View style={styles.questionHeader}>
        <View
          style={[
            styles.questionNumber,
            { backgroundColor: hasVoted ? colors.primary + '20' : colors.surfaceElevated },
          ]}
        >
          <Text
            style={[
              styles.questionNumberText,
              { color: hasVoted ? colors.primary : colors.textSecondary },
            ]}
          >
            Q{index + 1}
          </Text>
        </View>
        <Text
          style={[styles.questionText, { color: colors.textPrimary }]}
          numberOfLines={3}
        >
          {question.text}
        </Text>
      </View>

      {/* 옵션 버튼들 */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, optIdx) => {
          const isSelected = question.votedOption === option;
          const optionColor = getOptionColor(option);
          const iconName = getOptionIcon(option);

          return (
            <Animated.View
              key={option}
              style={{ transform: [{ scale: scaleValues[optIdx] }] }}
            >
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    borderColor: hasVoted
                      ? isSelected
                        ? optionColor
                        : colors.border
                      : colors.borderStrong,
                    backgroundColor: isSelected
                      ? optionColor + '15'
                      : 'transparent',
                  },
                ]}
                onPress={() => handleVote(option)}
                onPressIn={() => handlePressIn(optIdx)}
                onPressOut={() => handlePressOut(optIdx)}
                activeOpacity={0.7}
                disabled={hasVoted}
              >
                <Ionicons
                  name={
                    hasVoted && isSelected
                      ? 'checkmark-circle'
                      : (iconName as keyof typeof Ionicons.glyphMap)
                  }
                  size={18}
                  color={
                    hasVoted
                      ? isSelected
                        ? optionColor
                        : colors.textTertiary
                      : optionColor
                  }
                />
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: hasVoted
                        ? isSelected
                          ? optionColor
                          : colors.textTertiary
                        : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {option}
                </Text>
                {hasVoted && isSelected && (
                  <View
                    style={[
                      styles.selectedDot,
                      { backgroundColor: optionColor },
                    ]}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* 크레딧 획득 팝업 */}
      {showCredit && (
        <Animated.View
          style={[
            styles.creditPopup,
            {
              opacity: creditOpacity,
              transform: [{ translateY: creditTranslateY }],
            },
          ]}
        >
          <Text style={[styles.creditPopupText, { color: colors.primary }]}>
            +{formatCredits(2)}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PredictionVote({
  questions,
  onVote,
  creditsEarned,
}: PredictionVoteProps) {
  const { colors, shadows } = useTheme();

  const votedCount = useMemo(
    () => questions.filter((q) => !!q.votedOption).length,
    [questions]
  );
  const totalCount = questions.length;
  const allVoted = votedCount === totalCount;

  // 전체 완료 배너 애니메이션
  const completeFade = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (allVoted) {
      Animated.timing(completeFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      completeFade.setValue(0);
    }
  }, [allVoted, completeFade]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🎯</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            오늘의 예측
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* 투표 진행도 */}
          <View
            style={[
              styles.progressBadge,
              {
                backgroundColor: allVoted
                  ? colors.primary + '20'
                  : colors.surfaceElevated,
              },
            ]}
          >
            {allVoted ? (
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            ) : null}
            <Text
              style={[
                styles.progressText,
                {
                  color: allVoted ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              {allVoted ? '완료' : `${votedCount}/${totalCount}`}
            </Text>
          </View>
        </View>
      </View>

      {/* 질문 목록 */}
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          onVote={onVote}
        />
      ))}

      {/* 전체 투표 완료 배너 */}
      {allVoted && (
        <Animated.View
          style={[
            styles.completeBanner,
            {
              opacity: completeFade,
              backgroundColor: colors.primary + '10',
              borderColor: colors.primary + '30',
            },
          ]}
        >
          <Ionicons name="checkmark-done" size={20} color={colors.primary} />
          <View style={styles.completeBannerContent}>
            <Text style={[styles.completeText, { color: colors.primary }]}>
              모든 투표 완료!
            </Text>
            <Text style={[styles.completeSubtext, { color: colors.textSecondary }]}>
              내일 결과를 확인하세요
            </Text>
          </View>
          {creditsEarned > 0 && (
            <View
              style={[
                styles.creditBadge,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Text style={[styles.creditBadgeText, { color: colors.primary }]}>
                +{formatCredits(creditsEarned)}
              </Text>
            </View>
          )}
        </Animated.View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 질문 카드
  questionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },

  // 옵션 버튼
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 15,
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // 크레딧 팝업
  creditPopup: {
    position: 'absolute',
    right: 16,
    top: 8,
  },
  creditPopupText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // 완료 배너
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  completeBannerContent: {
    flex: 1,
  },
  completeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  completeSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  creditBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  creditBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
