/**
 * freePeriod.ts - 무료 기간 관리 부서 (Single Source of Truth)
 *
 * 역할: 앱 전체의 "무료/유료 스위치"
 * - 2026-05-31까지 모든 기능 무료 개방
 * - 6월 유료 전환 시: FREE_PERIOD_END 날짜만 과거로 변경하면 전체 앱이 유료 모드로 복귀
 * - 보상 시스템(출석, 공유)은 무료 기간에도 정상 적립 → 6월 이후 사용 가능
 */

// 무료 기간 종료일 (이 날짜까지 무료, 다음 날부터 유료)
export const FREE_PERIOD_END = '2026-05-31';

/**
 * 현재 무료 기간인지 판별
 * @returns true면 전 기능 무료, false면 기존 과금 모드
 */
export function isFreePeriod(): boolean {
  const now = new Date();
  const endDate = new Date(FREE_PERIOD_END + 'T23:59:59');
  return now <= endDate;
}

/**
 * 무료 기간 남은 일수 계산
 * @returns 남은 일수 (0이면 이미 종료)
 */
export function getFreePeriodDaysLeft(): number {
  const now = new Date();
  const endDate = new Date(FREE_PERIOD_END + 'T23:59:59');
  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
