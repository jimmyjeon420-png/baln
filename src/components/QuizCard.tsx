/**
 * QuizCard.tsx - 퀴즈 카드 컴포넌트
 *
 * 역할: "퀴즈 문제지"
 * - 4지선다 퀴즈 표시
 * - 선택 → 제출 → 정답/오답 피드백
 * - 해설 표시 + 보상 안내
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { DailyQuiz, QuizAttempt, SubmitQuizResult } from '../types/quiz';
import { QUIZ_CATEGORIES } from '../types/quiz';

interface QuizCardProps {
  quiz: DailyQuiz;
  attempt: QuizAttempt | null;
  onSubmit: (quizId: number, selectedOption: string) => Promise<SubmitQuizResult>;
  isSubmitting?: boolean;
}

export default function QuizCard({ quiz, attempt, onSubmit, isSubmitting }: QuizCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitQuizResult | null>(null);

  // 이미 풀었으면 결과 모드
  const isAnswered = !!attempt || !!result;
  const correctOption = attempt?.is_correct !== undefined
    ? (attempt.is_correct ? attempt.selected_option : null)
    : result?.correct_option;

  const categoryInfo = QUIZ_CATEGORIES[quiz.category];

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    const res = await onSubmit(quiz.id, selectedOption);
    setResult(res);
  };

  // 옵션 스타일 결정
  const getOptionStyle = (optionId: string) => {
    if (!isAnswered) {
      return selectedOption === optionId ? styles.optionSelected : styles.option;
    }

    // 정답/오답 표시
    const actualCorrect = attempt
      ? quiz.correct_option  // 이미 답안이 있으면 quiz에서
      : result?.correct_option;

    if (optionId === actualCorrect) return styles.optionCorrect;

    const myAnswer = attempt?.selected_option || selectedOption;
    if (optionId === myAnswer && optionId !== actualCorrect) return styles.optionWrong;

    return styles.optionDisabled;
  };

  const getOptionTextStyle = (optionId: string) => {
    if (!isAnswered) {
      return selectedOption === optionId ? styles.optionTextSelected : styles.optionText;
    }
    const actualCorrect = attempt ? quiz.correct_option : result?.correct_option;
    if (optionId === actualCorrect) return styles.optionTextCorrect;

    const myAnswer = attempt?.selected_option || selectedOption;
    if (optionId === myAnswer && optionId !== actualCorrect) return styles.optionTextWrong;
    return styles.optionTextDisabled;
  };

  const isCorrect = attempt?.is_correct ?? result?.is_correct;
  const creditsEarned = attempt?.credits_earned ?? result?.credits_earned ?? 0;
  const xpEarned = attempt?.xp_earned ?? result?.xp_earned ?? 0;

  return (
    <View style={styles.container}>
      {/* 카테고리 뱃지 */}
      <View style={styles.categoryRow}>
        <Text style={styles.categoryIcon}>{categoryInfo?.icon || '📊'}</Text>
        <Text style={styles.categoryLabel}>{categoryInfo?.label || quiz.category}</Text>
      </View>

      {/* 문제 */}
      <Text style={styles.question}>{quiz.question}</Text>

      {/* 선택지 */}
      <View style={styles.optionsContainer}>
        {quiz.options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={getOptionStyle(option.id)}
            onPress={() => !isAnswered && setSelectedOption(option.id)}
            disabled={isAnswered}
            activeOpacity={0.7}
          >
            <View style={styles.optionIdBox}>
              <Text style={styles.optionId}>{option.id}</Text>
            </View>
            <Text style={getOptionTextStyle(option.id)}>{option.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 제출 버튼 (아직 안 풀었을 때) */}
      {!isAnswered && (
        <TouchableOpacity
          style={[styles.submitButton, !selectedOption && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedOption || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000000" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>정답 제출하기</Text>
          )}
        </TouchableOpacity>
      )}

      {/* 결과 표시 (풀었을 때) */}
      {isAnswered && (
        <View style={styles.resultContainer}>
          {/* 정답/오답 */}
          <View style={[styles.resultBanner, isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultEmoji}>{isCorrect ? '✅' : '❌'}</Text>
            <Text style={styles.resultText}>
              {isCorrect ? '정답입니다!' : '아쉽네요!'}
            </Text>
            <View style={styles.rewardRow}>
              {creditsEarned > 0 && (
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardText}>+{creditsEarned} 크레딧</Text>
                </View>
              )}
              {xpEarned > 0 && (
                <View style={[styles.rewardBadge, styles.xpBadge]}>
                  <Text style={styles.rewardText}>+{xpEarned} XP</Text>
                </View>
              )}
            </View>
          </View>

          {/* 해설 */}
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>💡 해설</Text>
            <Text style={styles.explanationText}>
              {attempt ? quiz.explanation : result?.explanation || quiz.explanation}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
  },
  question: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333333',
  },
  optionSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2E1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  optionCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2E1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  optionWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E1A1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CF6679',
  },
  optionDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  optionIdBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#DDDDDD',
    lineHeight: 22,
  },
  optionTextSelected: {
    flex: 1,
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
    lineHeight: 22,
  },
  optionTextCorrect: {
    flex: 1,
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
    lineHeight: 22,
  },
  optionTextWrong: {
    flex: 1,
    fontSize: 15,
    color: '#CF6679',
    fontWeight: '600',
    lineHeight: 22,
  },
  optionTextDisabled: {
    flex: 1,
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  resultContainer: {
    marginTop: 20,
    gap: 12,
  },
  resultBanner: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  resultCorrect: {
    backgroundColor: '#1A2E1A',
  },
  resultWrong: {
    backgroundColor: '#2E1A1A',
  },
  resultEmoji: {
    fontSize: 28,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rewardBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpBadge: {
    backgroundColor: '#7C4DFF',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  explanationBox: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFB74D',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
});
