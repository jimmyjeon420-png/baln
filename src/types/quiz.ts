/**
 * quiz.ts - 일일 투자 퀴즈 타입 정의
 *
 * 역할: "퀴즈 시스템 설계도"
 * - 퀴즈 카테고리, 옵션, 답안 타입
 * - Gemini 퀴즈 생성 프롬프트용 상수
 */

// ============================================================================
// 퀴즈 카테고리
// ============================================================================

export type QuizCategory = 'stock_basics' | 'market_news' | 'investing_terms' | 'risk_management';

export interface QuizCategoryInfo {
  label: string;
  icon: string;
  description: string;
}

export const QUIZ_CATEGORIES: Record<QuizCategory, QuizCategoryInfo> = {
  stock_basics:     { label: '주식 기초',   icon: '📊', description: '주식 투자의 기본 개념' },
  market_news:      { label: '시장 뉴스',   icon: '📰', description: '최신 경제/시장 이슈' },
  investing_terms:  { label: '투자 용어',   icon: '📖', description: '꼭 알아야 할 투자 용어' },
  risk_management:  { label: '리스크 관리', icon: '🛡️', description: '위험 관리와 분산 투자' },
};

// ============================================================================
// 퀴즈 옵션
// ============================================================================

export interface QuizOption {
  id: string;  // 'A', 'B', 'C', 'D'
  text: string;
}

// ============================================================================
// DB 타입
// ============================================================================

export interface DailyQuiz {
  id: number;
  quiz_date: string;
  category: QuizCategory;
  question: string;
  options: QuizOption[];
  correct_option: string;
  explanation: string;
  difficulty: number;
  created_at: string;
}

export interface QuizAttempt {
  id: number;
  user_id: string;
  quiz_id: number;
  selected_option: string;
  is_correct: boolean;
  credits_earned: number;
  xp_earned: number;
  created_at: string;
}

// ============================================================================
// RPC 결과 타입
// ============================================================================

export interface SubmitQuizResult {
  success: boolean;
  reason?: string;
  is_correct?: boolean;
  correct_option?: string;
  explanation?: string;
  credits_earned?: number;
  xp_earned?: number;
  quiz_streak?: number;
  new_level?: number;
  level_up?: boolean;
}

export interface InsertQuizResult {
  success: boolean;
  quiz_id: number;
}
