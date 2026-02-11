/**
 * formatters.ts 테스트
 *
 * 크레딧 포맷팅 함수들을 테스트합니다.
 */

import {
  formatCredits,
  formatCreditReward,
  formatKRW,
  formatUSD,
  formatCurrency,
  formatRelativeTime,
  formatDate,
  CREDIT_TO_KRW,
  CREDIT_SYMBOL,
  CREDIT_NAME,
} from '../formatters';

describe('formatters', () => {
  describe('formatCredits', () => {
    it('should format credit with KRW by default', () => {
      expect(formatCredits(10)).toBe('10C (₩1,000)');
      expect(formatCredits(5)).toBe('5C (₩500)');
      expect(formatCredits(0)).toBe('0C (₩0)');
    });

    it('should format credit without KRW when showKRW is false', () => {
      expect(formatCredits(10, false)).toBe('10C');
      expect(formatCredits(100, false)).toBe('100C');
    });

    it('should handle large amounts', () => {
      expect(formatCredits(100)).toBe('100C (₩10,000)');
      expect(formatCredits(1000)).toBe('1000C (₩100,000)');
    });

    it('should handle negative values', () => {
      expect(formatCredits(-10)).toBe('-10C (₩-1,000)');
    });

    it('should handle decimal values', () => {
      expect(formatCredits(10.5)).toBe('10.5C (₩1,050)');
    });

    it('should use correct credit symbol', () => {
      const result = formatCredits(10);
      expect(result).toContain(CREDIT_SYMBOL);
    });
  });

  describe('formatCreditReward', () => {
    it('should format credit reward message', () => {
      expect(formatCreditReward(10)).toBe('+10C (₩1,000) 획득');
      expect(formatCreditReward(5)).toBe('+5C (₩500) 획득');
    });

    it('should always include plus sign', () => {
      const result = formatCreditReward(1);
      expect(result).toContain('+');
      expect(result).toContain('획득');
    });

    it('should handle zero credits', () => {
      expect(formatCreditReward(0)).toBe('+0C (₩0) 획득');
    });
  });

  describe('formatKRW', () => {
    it('should format Korean Won correctly', () => {
      expect(formatKRW(1000)).toBe('₩1,000');
      expect(formatKRW(1000000)).toBe('₩1,000,000');
    });

    it('should format Korean Won in compact mode', () => {
      expect(formatKRW(10000, true)).toBe('1만');
      expect(formatKRW(100000000, true)).toBe('1.0억');
    });

    it('should handle amounts between 1억 and 10억 in compact mode', () => {
      expect(formatKRW(250000000, true)).toBe('2.5억');
      expect(formatKRW(999999999, true)).toBe('10.0억');
    });

    it('should handle amounts just under 1억 in compact mode', () => {
      expect(formatKRW(50000000, true)).toBe('5,000만');
      expect(formatKRW(99999999, true)).toBe('9,999만');
    });

    it('should handle small amounts in compact mode without suffix', () => {
      expect(formatKRW(9999, true)).toBe('₩9,999');
      expect(formatKRW(5000, true)).toBe('₩5,000');
    });

    it('should handle zero', () => {
      expect(formatKRW(0)).toBe('₩0');
      expect(formatKRW(0, true)).toBe('₩0');
    });

    it('should handle negative amounts', () => {
      expect(formatKRW(-10000)).toBe('₩-10,000');
    });
  });

  describe('formatUSD', () => {
    it('should format US Dollars correctly', () => {
      expect(formatUSD(1000)).toBe('$1,000');
      expect(formatUSD(1000000)).toBe('$1,000,000');
    });

    it('should format US Dollars in compact mode', () => {
      expect(formatUSD(5000, true)).toBe('$5.0K');
      expect(formatUSD(500, true)).toBe('$500');
    });

    it('should handle amounts under 1000 in compact mode', () => {
      expect(formatUSD(999, true)).toBe('$999');
      expect(formatUSD(100, true)).toBe('$100');
    });

    it('should format large amounts in compact mode', () => {
      expect(formatUSD(1500, true)).toBe('$1.5K');
      expect(formatUSD(999999, true)).toBe('$1000.0K');
    });

    it('should handle zero', () => {
      expect(formatUSD(0)).toBe('$0');
      expect(formatUSD(0, true)).toBe('$0');
    });

    it('should handle negative amounts', () => {
      expect(formatUSD(-1000)).toBe('$-1,000');
    });
  });

  describe('formatCurrency', () => {
    it('should format KRW by default', () => {
      expect(formatCurrency(10000)).toBe('₩10,000');
      expect(formatCurrency(10000, 'KRW')).toBe('₩10,000');
    });

    it('should format USD when specified', () => {
      expect(formatCurrency(10000, 'USD')).toBe('$10,000');
    });

    it('should respect compact mode for KRW', () => {
      expect(formatCurrency(100000000, 'KRW', true)).toBe('1.0억');
    });

    it('should respect compact mode for USD', () => {
      expect(formatCurrency(5000, 'USD', true)).toBe('$5.0K');
    });
  });

  describe('formatRelativeTime', () => {
    const now = Date.now();

    it('should return "방금 전" for times less than 1 minute ago', () => {
      const recent = now - 30000; // 30 seconds ago
      expect(formatRelativeTime(recent)).toBe('방금 전');
    });

    it('should return minutes for times less than 1 hour ago', () => {
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5분 전');
    });

    it('should return hours for times less than 1 day ago', () => {
      const threeHoursAgo = now - 3 * 60 * 60 * 1000;
      expect(formatRelativeTime(threeHoursAgo)).toBe('3시간 전');
    });

    it('should return days for times less than 7 days ago', () => {
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
      expect(formatRelativeTime(threeDaysAgo)).toBe('3일 전');
    });

    it('should return formatted date for times 7+ days ago', () => {
      const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;
      const result = formatRelativeTime(tenDaysAgo);
      expect(result).toBeTruthy();
      expect(result).not.toContain('일 전');
    });

    it('should accept Date object', () => {
      const date = new Date(now - 60000);
      expect(formatRelativeTime(date)).toBe('1분 전');
    });

    it('should accept ISO string', () => {
      const date = new Date(now - 120000);
      expect(formatRelativeTime(date.toISOString())).toBe('2분 전');
    });
  });

  describe('formatDate', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T12:30:00Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should format timestamp to YYYY-MM-DD', () => {
      const timestamp = new Date('2024-01-15T12:30:00Z').getTime();
      expect(formatDate(timestamp)).toBe('2024-01-15');
    });

    it('should format ISO string to YYYY-MM-DD', () => {
      expect(formatDate('2024-01-15T12:30:00Z')).toBe('2024-01-15');
    });

    it('should handle different time zones consistently', () => {
      const date1 = new Date('2024-01-15T00:00:00Z');
      const date2 = new Date('2024-01-15T23:59:59Z');
      expect(formatDate(date1)).toBe('2024-01-15');
      expect(formatDate(date2)).toBe('2024-01-15');
    });
  });

  describe('Constants', () => {
    it('should have correct CREDIT_TO_KRW exchange rate', () => {
      expect(CREDIT_TO_KRW).toBe(100);
    });

    it('should have correct CREDIT_SYMBOL', () => {
      expect(CREDIT_SYMBOL).toBe('C');
    });

    it('should have correct CREDIT_NAME', () => {
      expect(CREDIT_NAME).toBe('크레딧');
    });
  });
});
