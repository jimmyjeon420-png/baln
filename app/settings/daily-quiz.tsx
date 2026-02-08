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

export default function DailyQuizScreen() {
  const router = useRouter();
  const { data: quiz, isLoading: quizLoading } = useTodayQuiz();
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
    const result = await submitQuiz.mutateAsync({ quizId, selectedOption });
    return result;
  };

  const isLoading = quizLoading || attemptLoading;
  const isAnswered = !!attempt;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오늘의 투자 퀴즈</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* 로딩 */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>퀴즈를 불러오는 중...</Text>
          </View>
        )}

        {/* 퀴즈 없음 */}
        {!isLoading && !quiz && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>오늘의 퀴즈를 준비 중입니다</Text>
            <Text style={styles.emptySubtitle}>잠시 후 다시 시도해주세요</Text>
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
            <Text style={styles.countdownLabel}>다음 퀴즈까지</Text>
            <Text style={styles.countdownTimer}>{countdown}</Text>
          </View>

          {/* 퀴즈 통계 */}
          {stats && stats.total > 0 && (
            <View style={styles.statsCard}>
              {stats.streak > 0 && (
                <View style={styles.statsRow}>
                  <Text style={styles.statsIcon}>🔥</Text>
                  <Text style={styles.statsText}>퀴즈 스트릭: {stats.streak}일 연속</Text>
                </View>
              )}
              <View style={styles.statsRow}>
                <Text style={styles.statsIcon}>📊</Text>
                <Text style={styles.statsText}>
                  정답률: {stats.accuracy}% ({stats.correct}/{stats.total})
                </Text>
              </View>
            </View>
          )}

          {/* 안내 */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 퀴즈 보상</Text>
            <Text style={styles.tipText}>• 정답: 1~3 크레딧 + 20 XP</Text>
            <Text style={styles.tipText}>• 오답: 참여 5 XP (경험치는 쌓여요!)</Text>
            <Text style={styles.tipText}>• 매일 1문제, 투자 지식을 키워보세요</Text>
          </View>
        </View>

        {/* 면책 조항 */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            본 퀴즈는 투자 교육 목적이며, 특정 투자를 권유하지 않습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    fontSize: 18,
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
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 13,
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
    fontSize: 13,
    color: '#888888',
  },
  countdownTimer: {
    fontSize: 28,
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
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  statsText: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#AAAAAA',
    lineHeight: 20,
  },

  // 면책
  disclaimerBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
});
