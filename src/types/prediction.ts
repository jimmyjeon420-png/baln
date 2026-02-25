/**
 * prediction.ts - 투자 예측 게임 타입 정의
 *
 * 역할: "투자 예측 경기장의 규칙서"
 * - 투표 질문, 유저 투표, 통계, 리더보드 타입
 * - 카테고리/상태 상수 및 면책 문구
 */

// ============================================================================
// 기본 타입
// ============================================================================

/** 투표 카테고리 (주식/코인/거시경제/이벤트) */
export type PollCategory = 'stocks' | 'crypto' | 'macro' | 'event';

/** 카테고리 필터 (전체 포함) */
export type PollCategoryFilter = 'all' | PollCategory;

/** 투표 상태 */
export type PollStatus = 'active' | 'closed' | 'resolved';

/** 투표 선택지 */
export type VoteChoice = 'YES' | 'NO';

// ============================================================================
// DB 테이블 인터페이스
// ============================================================================

/** 난이도 레벨 */
export type PollDifficulty = 'easy' | 'medium' | 'hard';

/** prediction_polls 테이블 */
export interface PredictionPoll {
  id: string;
  question: string;
  description: string | null;
  category: PollCategory;
  yes_label: string;
  no_label: string;
  yes_count: number;
  no_count: number;
  deadline: string;        // ISO 8601
  status: PollStatus;
  correct_answer: VoteChoice | null;
  reward_credits: number;
  source: string | null;
  created_at: string;
  resolved_at: string | null;
  difficulty?: PollDifficulty;      // 난이도 (easy/medium/hard)
  context_hint?: string | null;     // 복기 시 학습 포인트 힌트
  related_ticker?: string | null;   // 관련 종목 티커
  up_reason?: string | null;        // YES(오를) 근거
  down_reason?: string | null;      // NO(내릴) 근거
}

/** prediction_votes 테이블 */
export interface PredictionVote {
  id: string;
  poll_id: string;
  user_id: string;
  vote: VoteChoice;
  is_correct: boolean | null;
  credits_earned: number;
  created_at: string;
}

/** prediction_user_stats 테이블 */
export interface PredictionUserStats {
  user_id: string;
  total_votes: number;
  correct_votes: number;
  current_streak: number;
  best_streak: number;
  total_credits_earned: number;
  accuracy_rate: number;   // GENERATED 컬럼 (0.00 ~ 100.00)
  updated_at: string;
}

// ============================================================================
// UI 통합 타입
// ============================================================================

/** 투표 + 내 투표 기록 병합 (UI 렌더링용) */
export interface PollWithMyVote extends PredictionPoll {
  myVote: VoteChoice | null;     // 내가 투표한 값 (null = 미투표)
  myIsCorrect: boolean | null;   // 정답 여부
  myCreditsEarned: number;       // 획득 크레딧
}

/** 리더보드 엔트리 */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;      // 이메일 앞부분 마스킹
  total_votes: number;
  correct_votes: number;
  accuracy_rate: number;
  current_streak: number;
  best_streak: number;
  total_credits_earned: number;
  isMe: boolean;             // 현재 유저 하이라이트
}

// ============================================================================
// 카테고리 정보 상수
// ============================================================================

export const POLL_CATEGORY_INFO: Record<PollCategoryFilter, {
  label: string;
  emoji: string;
  color: string;
}> = {
  all:     { label: '전체',     emoji: '🎯', color: '#4CAF50' },
  stocks:  { label: '주식',     emoji: '📈', color: '#4CAF50' },
  crypto:  { label: '코인',     emoji: '₿',  color: '#F7931A' },
  macro:   { label: '거시경제', emoji: '🌍', color: '#2196F3' },
  event:   { label: '이벤트',   emoji: '⚡', color: '#FF9800' },
};

/** 난이도별 UI 정보 */
export const POLL_DIFFICULTY_INFO: Record<PollDifficulty, {
  label: string;
  emoji: string;
  color: string;
}> = {
  easy:   { label: '쉬움', emoji: '🟢', color: '#4CAF50' },
  medium: { label: '보통', emoji: '🟡', color: '#FF9800' },
  hard:   { label: '어려움', emoji: '🔴', color: '#F44336' },
};

// ============================================================================
// 보상 상수
// ============================================================================

export const PREDICTION_REWARDS = {
  correct: 3,           // 기본 적중 보상 (CLAUDE.md 기준 3C)
  subscriberMultiplier: 2, // 구독자 보상 배수
  streak5Bonus: 3,      // 5연속 적중 보너스
  streak10Bonus: 10,    // 10연속 적중 보너스
} as const;

// ============================================================================
// 면책 문구
// ============================================================================

export const PREDICTION_DISCLAIMER =
  '본 예측 게임은 오락 및 학습 목적으로 제공되며, 실제 투자 권유가 아닙니다. ' +
  '예측 결과는 AI가 공개 데이터를 기반으로 판정하며, 실제 시장 상황과 다를 수 있습니다. ' +
  '투자 결정은 본인의 판단과 전문가 상담에 따라 이루어져야 합니다.';
