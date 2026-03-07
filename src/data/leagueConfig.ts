/**
 * leagueConfig — 예측 리그 설정 데이터
 *
 * 역할: "리그 운영 규정집" — 예측 적중률 기반 경쟁 리그의 티어/보상/규칙 정의
 * 비유: 축구 리그 승강제 — Bronze부터 Legend까지 실력에 따라 오르내림
 *
 * 핵심 루프: 예측 적중 → 레이팅 상승 → 티어 승급 → 주간 보상 크레딧
 *
 * 사용처:
 * - usePredictionLeague 훅: 레이팅/티어 관리
 * - PredictionLeagueCard: 오늘 탭 컴팩트 카드
 * - LeagueStandingModal: 전체 순위표 모달
 */

// ============================================================================
// 타입
// ============================================================================

export interface LeagueTier {
  id: string;
  nameKo: string;
  nameEn: string;
  nameJa: string;
  emoji: string;
  color: string;
  minRating: number;
  weeklyRewardCredits: number;
}

/** 언어별 티어 이름 */
export function getTierName(tier: LeagueTier, lang: string): string {
  if (lang === 'ja') return tier.nameJa;
  if (lang === 'en') return tier.nameEn;
  return tier.nameKo;
}

// ============================================================================
// 6-Tier 리그 설정
// ============================================================================

export const LEAGUE_TIERS: LeagueTier[] = [
  {
    id: 'bronze',
    nameKo: '브론즈',
    nameEn: 'Bronze',
    nameJa: 'ブロンズ',
    emoji: '\uD83E\uDD49',
    color: '#CD7F32',
    minRating: 0,
    weeklyRewardCredits: 2,
  },
  {
    id: 'silver',
    nameKo: '실버',
    nameEn: 'Silver',
    nameJa: 'シルバー',
    emoji: '\uD83E\uDD48',
    color: '#C0C0C0',
    minRating: 300,
    weeklyRewardCredits: 5,
  },
  {
    id: 'gold',
    nameKo: '골드',
    nameEn: 'Gold',
    nameJa: 'ゴールド',
    emoji: '\uD83E\uDD47',
    color: '#FFD700',
    minRating: 600,
    weeklyRewardCredits: 10,
  },
  {
    id: 'platinum',
    nameKo: '플래티넘',
    nameEn: 'Platinum',
    nameJa: 'プラチナ',
    emoji: '\uD83D\uDC8E',
    color: '#B9F2FF',
    minRating: 1000,
    weeklyRewardCredits: 15,
  },
  {
    id: 'diamond',
    nameKo: '다이아몬드',
    nameEn: 'Diamond',
    nameJa: 'ダイヤモンド',
    emoji: '\uD83D\uDCA0',
    color: '#00BFFF',
    minRating: 1500,
    weeklyRewardCredits: 25,
  },
  {
    id: 'legend',
    nameKo: '레전드',
    nameEn: 'Legend',
    nameJa: 'レジェンド',
    emoji: '\uD83D\uDC51',
    color: '#FF4500',
    minRating: 2000,
    weeklyRewardCredits: 50,
  },
];

// ============================================================================
// 레이팅 상수
// ============================================================================

/** 적중 시 레이팅 증가량 */
export const RATING_GAIN_CORRECT = 30;

/** 오답 시 레이팅 감소량 */
export const RATING_LOSS_WRONG = 10;

/** 레이팅 최저값 (0 이하로 내려가지 않음) */
export const RATING_FLOOR = 0;

/** 리그 내 시뮬레이션 플레이어 수 (나 포함) */
export const LEAGUE_PLAYER_COUNT = 30;

/** 승급 존 (상위 N명) */
export const PROMOTION_ZONE = 5;

/** 강등 존 (하위 N명) */
export const RELEGATION_ZONE = 5;

// ============================================================================
// 유틸
// ============================================================================

/** 레이팅 → 티어 변환 */
export function getTierForRating(rating: number): LeagueTier {
  for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
    if (rating >= LEAGUE_TIERS[i].minRating) {
      return LEAGUE_TIERS[i];
    }
  }
  return LEAGUE_TIERS[0];
}

/** 다음 티어 정보 (현재 최고 티어면 null) */
export function getNextTier(currentTierId: string): LeagueTier | null {
  const idx = LEAGUE_TIERS.findIndex(t => t.id === currentTierId);
  if (idx < 0 || idx >= LEAGUE_TIERS.length - 1) return null;
  return LEAGUE_TIERS[idx + 1];
}

/** 다음 티어까지 필요한 레이팅 */
export function ratingToNextTier(rating: number): number {
  const tier = getTierForRating(rating);
  const next = getNextTier(tier.id);
  if (!next) return 0;
  return Math.max(0, next.minRating - rating);
}

/** 다음 티어까지 진행률 (0~100) */
export function getTierProgress(rating: number): number {
  const tier = getTierForRating(rating);
  const next = getNextTier(tier.id);
  if (!next) return 100; // 최고 티어
  const range = next.minRating - tier.minRating;
  if (range <= 0) return 100;
  const progress = rating - tier.minRating;
  return Math.min(100, Math.round((progress / range) * 100));
}
