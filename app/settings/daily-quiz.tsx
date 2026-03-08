/**
 * daily-quiz.tsx - 오늘의 투자 퀴즈 화면
 *
 * 역할: "퀴즈 교실"
 * - 오늘의 퀴즈 1문제 표시 (DB → Gemini 자동 생성)
 * - 4지선다 답안 제출 → 정답/오답 + 보상
 * - 다음 퀴즈 카운트다운 + 퀴즈 스트릭/정답률 표시
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTodayQuiz, useMyQuizAttempt, useSubmitQuiz, useQuizStats } from '../../src/hooks/useQuiz';
import QuizCard from '../../src/components/QuizCard';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';

export default function DailyQuizScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { data: quiz, isLoading: quizLoading, isError: quizError, refetch: refetchQuiz } = useTodayQuiz();
  const { data: attempt, isLoading: attemptLoading } = useMyQuizAttempt(quiz?.id);
  const submitQuiz = useSubmitQuiz();
  const { data: stats } = useQuizStats();

  // 다음 퀴즈 카운트다운
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (quizId: number, selectedOption: string) => {
    // 로컬 퀴즈 (DB 미연결) → RPC 없이 즉시 정답 체크
    if (quizId === -1 && quiz) {
      const isCorrect = selectedOption === quiz.correct_option;
      return {
        success: true,
        is_correct: isCorrect,
        correct_option: quiz.correct_option,
        explanation: quiz.explanation,
        credits_earned: isCorrect ? 1 : 0,
        xp_earned: isCorrect ? 20 : 5,
      };
    }
    const result = await submitQuiz.mutateAsync({ quizId, selectedOption });
    return result;
  };

  const isLoading = (quizLoading || attemptLoading) && !quizError;
  const _isAnswered = !!attempt;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('daily_quiz.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* 로딩 */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>{t('daily_quiz.loading')}</Text>
          </View>
        )}

        {/* 에러 상태 */}
        {quizError && !quiz && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>{t('daily_quiz.error_title')}</Text>
            <Text style={styles.emptySubtitle}>{t('daily_quiz.error_subtitle')}</Text>
            <TouchableOpacity
              onPress={() => refetchQuiz()}
              style={{ marginTop: 12, backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('daily_quiz.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 퀴즈 없음 (에러가 아닌 경우만) */}
        {!isLoading && !quiz && !quizError && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>{t('daily_quiz.empty_title')}</Text>
            <Text style={styles.emptySubtitle}>{t('daily_quiz.empty_subtitle')}</Text>
          </View>
        )}

        {/* 퀴즈 카드 */}
        {!isLoading && quiz && (
          <QuizCard
            quiz={quiz}
            attempt={attempt || null}
            onSubmit={handleSubmit}
            isSubmitting={submitQuiz.isPending}
          />
        )}

        {/* 하단 정보: 카운트다운 + 통계 */}
        <View style={styles.bottomSection}>
          {/* 다음 퀴즈 카운트다운 */}
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>{t('daily_quiz.next_quiz')}</Text>
            <Text style={styles.countdownTimer}>{countdown}</Text>
          </View>

          {/* 퀴즈 통계 */}
          {stats && stats.total > 0 && (
            <View style={styles.statsCard}>
              {stats.streak > 0 && (
                <View style={styles.statsRow}>
                  <Text style={styles.statsIcon}>🔥</Text>
                  <Text style={styles.statsText}>{t('daily_quiz.streak', { days: String(stats.streak) })}</Text>
                </View>
              )}
              <View style={styles.statsRow}>
                <Text style={styles.statsIcon}>📊</Text>
                <Text style={styles.statsText}>
                  {t('daily_quiz.accuracy', { pct: String(stats.accuracy), correct: String(stats.correct), total: String(stats.total) })}
                </Text>
              </View>
            </View>
          )}

          {/* 안내 */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 {t('daily_quiz.rewards_title')}</Text>
            <Text style={styles.tipText}>• {t('daily_quiz.reward_correct')}</Text>
            <Text style={styles.tipText}>• {t('daily_quiz.reward_wrong')}</Text>
            <Text style={styles.tipText}>• {t('daily_quiz.reward_tip')}</Text>
          </View>
        </View>

        {/* 면책 조항 */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            {t('daily_quiz.disclaimer')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via colors.background inline
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },

  // 로딩
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#888888',
  },

  // 빈 상태
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },

  // 하단 섹션
  bottomSection: {
    marginTop: 20,
    gap: 12,
  },

  // 카운트다운
  countdownCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#888888',
  },
  countdownTimer: {
    fontSize: 29,
    fontWeight: '800',
    color: '#4CAF50',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },

  // 통계
  statsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIcon: {
    fontSize: 17,
    width: 24,
    textAlign: 'center',
  },
  statsText: {
    fontSize: 15,
    color: '#DDDDDD',
    marginLeft: 8,
  },

  // 팁
  tipCard: {
    backgroundColor: '#1A2E1A',
    borderRadius: 12,
    padding: 16,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 21,
  },

  // 면책
  disclaimerBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 17,
  },
});
