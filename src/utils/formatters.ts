/**
 * formatters.ts - 앱 전역 포맷터 유틸리티
 *
 * 역할: "표시 형식 통일 부서"
 * - 크레딧/코인 표시 (원화 병기)
 * - 금액 포맷 (한국 원, 미국 달러)
 * - 날짜 포맷
 */

import { t, getCurrentLanguage } from '../locales';

// ============================================================================
// 로케일 기반 포맷 유틸리티 (L10n)
// ============================================================================

/** 현재 로케일 코드 반환 ('en-US' | 'ko-KR') */
export function getLocaleCode(): string {
  return t('format.locale_code');
}

/** 현재 통화 기호 ($, ₩) */
export function getCurrencySymbol(): string {
  return t('format.currency_symbol');
}

/** 현재 로케일이 한국어인지 */
export function isKoreanLocale(): boolean {
  return getCurrentLanguage() === 'ko';
}

/**
 * 로케일 기반 날짜 포맷 ("2월 12일" / "Feb 12")
 */
export function formatLocalDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (isKoreanLocale()) {
    return t('format.date_short', { month, day });
  }
  const monthNames = t('format.month_names').split(',');
  return t('format.date_short', { month: monthNames[d.getMonth()], day });
}

/**
 * 로케일 기반 전체 날짜 ("2026년 2월 12일" / "February 12, 2026")
 */
export function formatLocalDateFull(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (isKoreanLocale()) {
    return t('format.date_full', { year, month, day });
  }
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return t('format.date_full', { year, month: monthNames[d.getMonth()], day });
}

/**
 * 로케일 기반 월+년 ("2026년 3월" / "March 2026")
 */
export function formatMonthYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (isKoreanLocale()) {
    return t('format.date_month_year', { year, month });
  }
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return t('format.date_month_year', { year, month: monthNames[date.getMonth()] });
}

/**
 * 로케일 기반 날짜+시간 ("3월 1일 토 · 14:30" / "Sat, 3/1 · 2:30 PM")
 */
export function formatDateWithTime(date: Date, weekdayNames: string[]): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdayNames[date.getDay()] ?? '';
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (isKoreanLocale()) {
    const time = `${String(hours).padStart(2, '0')}:${minutes}`;
    return t('format.date_with_time', { month, day, weekday, time });
  }
  // English: 12-hour format
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const time = `${h12}:${minutes} ${ampm}`;
  const monthNames = t('format.month_names').split(',');
  return t('format.date_with_time', { month: monthNames[date.getMonth()], day, weekday, time });
}

/**
 * 로케일 기반 금액 포맷 (₩120,000 / $120,000)
 * 자산 통화가 아닌 "표시 통화"를 기준으로 함
 */
export function formatLocalAmount(amount: number, compact = false): string {
  if (isKoreanLocale()) {
    return formatKRW(amount, compact);
  }
  return formatUSD(amount, compact);
}

/**
 * 로케일 기반 컴팩트 금액 ("1.2억" / "$120M")
 */
export function formatCompactAmount(amount: number): string {
  if (isKoreanLocale()) {
    if (amount >= 1_000_000_000_000) return t('format.compact_trillion', { n: Math.round(amount / 1_000_000_000_000).toLocaleString() });
    if (amount >= 100_000_000) return t('format.compact_billion', { n: (amount / 100_000_000).toFixed(1) });
    if (amount >= 10_000) return t('format.compact_thousand', { n: Math.floor(amount / 10_000).toLocaleString() });
    return `${getCurrencySymbol()}${amount.toLocaleString()}`;
  }
  if (amount >= 1_000_000_000_000) return t('format.compact_trillion', { n: (amount / 1_000_000_000_000).toFixed(1) });
  if (amount >= 1_000_000_000) return t('format.compact_billion', { n: (amount / 1_000_000_000).toFixed(1) });
  if (amount >= 1_000_000) return t('format.compact_million', { n: (amount / 1_000_000).toFixed(1) });
  if (amount >= 1_000) return t('format.compact_thousand', { n: (amount / 1_000).toFixed(1) });
  return `${getCurrencySymbol()}${amount.toLocaleString()}`;
}

/**
 * 로케일 기반 숫자 포맷 (toLocaleString 래퍼)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString(isKoreanLocale() ? 'ko-KR' : 'en-US');
}

// ============================================================================
// 크레딧 시스템 (출시 후 조정 가능한 상수)
// ============================================================================

/**
 * 크레딧 환율 (1크레딧 = ₩100)
 * 출시 후 사용자 피드백에 따라 조정 가능
 */
export const CREDIT_TO_KRW = 100;

/**
 * 크레딧 USD 환율 (1크레딧 ≈ $0.08)
 * 출시 후 사용자 피드백에 따라 조정 가능 (CREDIT_TO_KRW / ~1300 KRW/USD)
 */
export const CREDIT_TO_USD = 0.08;

/**
 * 크레딧 표시 이름 (로케일 기반 — 출시 후 리브랜딩 시 이것만 변경)
 * Korean: '크레딧' | English: 'Credit'
 */
export function getCreditName(): string {
  return t('credit.name');
}
/** @deprecated 한국어 고정 이름. 로케일 무관 코드에서만 사용. 가능하면 getCreditName() 사용 권장 */
export const CREDIT_NAME = '크레딧';
export const CREDIT_SYMBOL = 'C';

/**
 * 크레딧 포맷 (로케일 기반 통화 병기)
 * @param credits 크레딧 수량
 * @param showValue 통화 가치 표시 여부 (기본: true)
 * @returns Korean: "10C (₩1,000)" | English: "10C ($0.80)"
 *
 * 기존 호출자 하위 호환:
 *   formatCredits(10)         → locale에 따라 자동 표시
 *   formatCredits(10, false)  → "10C" (통화 숨김)
 *   formatCredits(10, true)   → 기존 동작 유지
 */
export function formatCredits(credits: number, showValue = true): string {
  if (!showValue) {
    return `${credits}${CREDIT_SYMBOL}`;
  }
  if (isKoreanLocale()) {
    const krw = (credits * CREDIT_TO_KRW).toLocaleString();
    return `${credits}${CREDIT_SYMBOL} (₩${krw})`;
  }
  // English: USD display
  const usd = (credits * CREDIT_TO_USD).toFixed(2);
  return `${credits}${CREDIT_SYMBOL} ($${usd})`;
}

/**
 * 크레딧 획득 메시지 포맷
 * @param credits 획득 크레딧
 * @returns Korean: "+10C (₩1,000) 획득" | English: "+10C ($0.80) earned"
 */
export function formatCreditReward(credits: number): string {
  if (isKoreanLocale()) {
    const krw = credits * CREDIT_TO_KRW;
    return t('credit.reward', { amount: credits, value: krw.toLocaleString() });
  }
  const usd = (credits * CREDIT_TO_USD).toFixed(2);
  return t('credit.reward', { amount: credits, value: usd });
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
 * 상대 시간 포맷 ("3분 전" / "3m ago")
 * i18n 지원: format.just_now, format.minutes_ago, format.hours_ago, format.days_ago
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const targetTime = typeof date === 'number' ? date : new Date(date).getTime();
  const diff = now - targetTime;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return t('format.just_now');
  if (diff < hour) return t('format.minutes_ago', { n: Math.floor(diff / minute) });
  if (diff < day) return t('format.hours_ago', { n: Math.floor(diff / hour) });
  if (diff < 7 * day) return t('format.days_ago', { n: Math.floor(diff / day) });

  // 7일 이상은 날짜 표시
  const d = new Date(targetTime);
  return t('format.date_month_day', { month: d.getMonth() + 1, day: d.getDate() });
}

/**
 * 날짜 포맷 (YYYY-MM-DD)
 */
export function formatDate(date: Date | string | number): string {
  return new Date(date).toISOString().split('T')[0];
}
