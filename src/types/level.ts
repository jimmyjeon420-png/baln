/**
 * level.ts - 투자 레벨 & 스트릭 타입 정의
 *
 * 역할: "레벨 시스템 설계도"
 * - 20단계 레벨 구조 (XP 기반 자동 산정)
 * - 연속 출석 마일스톤 보상 테이블
 * - XP 소스별 정보 (라벨, 기본 XP)
 */

// ============================================================================
// XP → 레벨 매핑 테이블
// ============================================================================

/** 각 레벨에 필요한 최소 XP */
export const LEVEL_XP_TABLE: Record<number, number> = {
  1: 0,
  2: 10,
  3: 40,
  4: 100,
  5: 200,
  6: 350,
  7: 550,
  8: 800,
  9: 1100,
  10: 1500,
  11: 2000,
  12: 2700,
  13: 3500,
  14: 4500,
  15: 5800,
  16: 7500,
  17: 9500,
  18: 12000,
  19: 15000,
  20: 20000,
};

/** 최대 레벨 */
export const MAX_LEVEL = 20;

// ============================================================================
// 레벨별 칭호
// ============================================================================

export const LEVEL_TITLES: Record<number, string> = {
  1: '새싹 투자자',
  2: '호기심 투자자',
  3: '견습 투자자',
  4: '초보 투자자',
  5: '성장 투자자',
  6: '학습 투자자',
  7: '적극 투자자',
  8: '숙련 투자자',
  9: '전문 투자자',
  10: '시니어 투자자',
  11: '엘리트 투자자',
  12: '마스터 투자자',
  13: '고수 투자자',
  14: '달인 투자자',
  15: '베테랑 투자자',
  16: '전설 투자자',
  17: '그랜드마스터',
  18: '투자 현인',
  19: '투자 거장',
  20: '투자의 신',
};

/** 레벨별 아이콘 */
export const LEVEL_ICONS: Record<number, string> = {
  1: '🌱', 2: '🔍', 3: '📚', 4: '💡',
  5: '🌿', 6: '📖', 7: '🔥', 8: '⚡',
  9: '🎯', 10: '⭐', 11: '💎', 12: '🏆',
  13: '👑', 14: '🐉', 15: '🦅', 16: '🌟',
  17: '🔮', 18: '🧙', 19: '🏛️', 20: '🌌',
};

// ============================================================================
// 스트릭 마일스톤
// ============================================================================

export interface StreakMilestone {
  days: number;
  credits: number;
  bonusXp: number;
  label: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3,   credits: 3,  bonusXp: 10,  label: '3일 연속' },
  { days: 7,   credits: 5,  bonusXp: 30,  label: '1주일' },
  { days: 14,  credits: 7,  bonusXp: 50,  label: '2주일' },
  { days: 30,  credits: 15, bonusXp: 100, label: '1개월' },
  { days: 100, credits: 50, bonusXp: 500, label: '100일' },
];

// ============================================================================
// XP 소스 정보
// ============================================================================

export type XPSource = 'checkin' | 'quiz_correct' | 'quiz_attempt' | 'prediction_vote' | 'share' | 'welcome' | 'streak_bonus';

export interface XPSourceInfo {
  label: string;
  icon: string;
  defaultXp: number;
}

export const XP_SOURCE_INFO: Record<XPSource, XPSourceInfo> = {
  checkin:         { label: '출석 체크',   icon: '📅', defaultXp: 10 },
  quiz_correct:    { label: '퀴즈 정답',   icon: '✅', defaultXp: 20 },
  quiz_attempt:    { label: '퀴즈 참여',   icon: '📝', defaultXp: 5 },
  prediction_vote: { label: '예측 투표',   icon: '🎯', defaultXp: 10 },
  share:           { label: '공유 보상',   icon: '📤', defaultXp: 5 },
  welcome:         { label: '가입 보너스', icon: '🎉', defaultXp: 50 },
  streak_bonus:    { label: '연속 보너스', icon: '🔥', defaultXp: 0 },
};

// ============================================================================
// DB 타입
// ============================================================================

export interface UserInvestorLevel {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  total_checkins: number;
  total_quizzes_correct: number;
  total_quizzes_attempted: number;
  quiz_streak: number;
  created_at: string;
  updated_at: string;
}

export interface XPEvent {
  id: number;
  user_id: string;
  amount: number;
  source: XPSource;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  created_at: string;
}

export interface CheckInResult {
  success: boolean;
  reason?: string;
  credits_earned?: number;
  xp_earned?: number;
  bonus_xp?: number;
  new_streak?: number;
  longest_streak?: number;
  new_level?: number;
  level_up?: boolean;
  total_xp?: number;
  total_checkins?: number;
  current_streak?: number;
  level?: number;
}

export interface GrantXPResult {
  success: boolean;
  new_xp: number;
  new_level: number;
  level_up: boolean;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/** 현재 레벨 내 진행률 (0~1) */
export function getLevelProgress(totalXp: number, level: number): number {
  if (level >= MAX_LEVEL) return 1;
  const currentLevelXp = LEVEL_XP_TABLE[level] || 0;
  const nextLevelXp = LEVEL_XP_TABLE[level + 1] || currentLevelXp;
  const range = nextLevelXp - currentLevelXp;
  if (range <= 0) return 1;
  return Math.min(1, (totalXp - currentLevelXp) / range);
}

/** 다음 레벨까지 남은 XP */
export function getXPToNextLevel(totalXp: number, level: number): number {
  if (level >= MAX_LEVEL) return 0;
  const nextLevelXp = LEVEL_XP_TABLE[level + 1] || 0;
  return Math.max(0, nextLevelXp - totalXp);
}

/** XP에서 레벨 계산 (클라이언트 사이드 참고용, DB GENERATED가 정본) */
export function calculateLevel(totalXp: number): number {
  for (let lv = MAX_LEVEL; lv >= 1; lv--) {
    if (totalXp >= LEVEL_XP_TABLE[lv]) return lv;
  }
  return 1;
}
