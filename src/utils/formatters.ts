/**
 * formatters.ts - 앱 전역 포맷터 유틸리티
 *
 * 역할: "표시 형식 통일 부서"
 * - 크레딧/코인 표시 (원화 병기)
 * - 금액 포맷 (한국 원, 미국 달러)
 * - 날짜 포맷
 */

// ============================================================================
// 크레딧 시스템 (출시 후 조정 가능한 상수)
// ============================================================================

/**
 * 크레딧 환율 (1크레딧 = ₩100)
 * 출시 후 사용자 피드백에 따라 조정 가능
 */
export const CREDIT_TO_KRW = 100;

/**
 * 크레딧 표시 이름 (출시 후 리브랜딩 시 이것만 변경)
 */
export const CREDIT_NAME = '크레딧';
export const CREDIT_SYMBOL = 'C';

/**
 * 크레딧 포맷 (원화 병기 옵션)
 * @param credits 크레딧 수량
 * @param showKRW 원화 표시 여부 (기본: true)
 * @returns "10C (₩1,000)" 형태
 */
export function formatCredits(credits: number, showKRW = true): string {
  if (showKRW) {
    const krw = (credits * CREDIT_TO_KRW).toLocaleString();
    return `${credits}${CREDIT_SYMBOL} (₩${krw})`;
  }
  return `${credits}${CREDIT_SYMBOL}`;
}

/**
 * 크레딧 획득 메시지 포맷
 * @param credits 획득 크레딧
 * @returns "+10C (₩1,000) 획득" 형태
 */
export function formatCreditReward(credits: number): string {
  return `+${formatCredits(credits)} 획득`;
}

// ============================================================================
// 금액 포맷
// ============================================================================

/**
 * 한국 원화 포맷
 * @param amount 금액
 * @param compact 간결 표시 (100만 → 1백만)
 */
export function formatKRW(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000_000_000) {
      // 1조 이상 → 조 단위
      return `${Math.round(amount / 1_000_000_000_000).toLocaleString()}조`;
    }
    if (amount >= 100_000_000) {
      // 1억 이상 → 억 단위 (소수점 없음)
      return `${Math.round(amount / 100_000_000).toLocaleString()}억`;
    }
    if (amount >= 10000) {
      return `${Math.floor(amount / 10000).toLocaleString()}만`;
    }
  }
  return `₩${amount.toLocaleString()}`;
}

/**
 * 미국 달러 포맷
 */
export function formatUSD(amount: number, compact = false): string {
  if (compact && amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * 통화 자동 감지 포맷
 */
export function formatCurrency(
  amount: number,
  currency: 'KRW' | 'USD' = 'KRW',
  compact = false
): string {
  return currency === 'KRW' ? formatKRW(amount, compact) : formatUSD(amount, compact);
}

// ============================================================================
// 날짜 포맷
// ============================================================================

/**
 * 상대 시간 포맷 ("3분 전", "2시간 전")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const targetTime = typeof date === 'number' ? date : new Date(date).getTime();
  const diff = now - targetTime;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '방금 전';
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}일 전`;

  // 7일 이상은 날짜 표시
  return new Date(targetTime).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 날짜 포맷 (YYYY-MM-DD)
 */
export function formatDate(date: Date | string | number): string {
  return new Date(date).toISOString().split('T')[0];
}
