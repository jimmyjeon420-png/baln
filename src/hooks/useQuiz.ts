/**
 * useQuiz.ts - 일일 투자 퀴즈 TanStack Query 훅
 *
 * 역할: "퀴즈 출제 부서의 접수 창구"
 * - useTodayQuiz: 오늘의 퀴즈 조회 (DB → Gemini 자동 생성)
 * - useMyQuizAttempt: 오늘 내 답안 확인
 * - useSubmitQuiz: 답안 제출 뮤테이션
 * - useQuizStats: 퀴즈 통계
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getTodayQuiz, submitQuizAnswer, getMyTodayAttempt, getMyQuizStats } from '../services/quizService';
import type { DailyQuiz, QuizAttempt, SubmitQuizResult } from '../types/quiz';

// ============================================================================
// Query Keys
// ============================================================================

const QUIZ_KEYS = {
  todayQuiz: ['daily-quiz', 'today'],
  myAttempt: (quizId: number) => ['quiz-attempt', quizId],
  myStats: ['quiz-stats'],
};

// ============================================================================
// 오늘의 퀴즈
// ============================================================================

export function useTodayQuiz() {
  return useQuery<DailyQuiz | null>({
    queryKey: QUIZ_KEYS.todayQuiz,
    queryFn: getTodayQuiz,
    staleTime: 10 * 60 * 1000,  // 10분 (하루 1개이므로 길게)
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

// ============================================================================
// 내 답안 확인
// ============================================================================

export function useMyQuizAttempt(quizId: number | undefined) {
  return useQuery<QuizAttempt | null>({
    queryKey: QUIZ_KEYS.myAttempt(quizId || 0),
    queryFn: () => getMyTodayAttempt(quizId!),
    enabled: !!quizId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// 답안 제출
// ============================================================================

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<SubmitQuizResult, Error, { quizId: number; selectedOption: string }>({
    mutationFn: ({ quizId, selectedOption }) => submitQuizAnswer(quizId, selectedOption),
    onSuccess: (data, variables) => {
      // 답안 캐시 무효화
      queryClient.invalidateQueries({ queryKey: QUIZ_KEYS.myAttempt(variables.quizId) });
      queryClient.invalidateQueries({ queryKey: QUIZ_KEYS.myStats });
      // 레벨도 업데이트될 수 있으므로
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['investor-level', user.id] });
        queryClient.invalidateQueries({ queryKey: ['xp-history', user.id] });
      }
    },
  });
}

// ============================================================================
// 퀴즈 통계
// ============================================================================

export function useQuizStats() {
  return useQuery({
    queryKey: QUIZ_KEYS.myStats,
    queryFn: getMyQuizStats,
    staleTime: 5 * 60 * 1000,
  });
}
