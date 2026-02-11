/**
 * communityUtils.ts 테스트
 *
 * 커뮤니티 공유 유틸리티 함수들을 테스트합니다.
 */

import {
  getTierFromAssets,
  getTierIcon,
  TIER_COLORS,
  TIER_LABELS,
  HOLDING_TYPE_COLORS,
  getRelativeTime,
  formatAssetAmount,
} from '../communityUtils';

describe('communityUtils', () => {
  describe('getTierFromAssets', () => {
    it('should return SILVER for assets under 100M', () => {
      expect(getTierFromAssets(50000000)).toBe('SILVER');
      expect(getTierFromAssets(99999999)).toBe('SILVER');
    });

    it('should return GOLD for assets 100M and above', () => {
      expect(getTierFromAssets(100000000)).toBe('GOLD');
      expect(getTierFromAssets(150000000)).toBe('GOLD');
    });

    it('should return PLATINUM for assets at PLATINUM threshold', () => {
      expect(getTierFromAssets(500000000)).toBe('PLATINUM');
      expect(getTierFromAssets(700000000)).toBe('PLATINUM');
    });

    it('should return DIAMOND for assets at DIAMOND threshold', () => {
      expect(getTierFromAssets(1000000000)).toBe('DIAMOND');
      expect(getTierFromAssets(5000000000)).toBe('DIAMOND');
    });

    it('should handle zero assets', () => {
      expect(getTierFromAssets(0)).toBe('SILVER');
    });

    it('should handle negative assets (edge case)', () => {
      expect(getTierFromAssets(-1000000)).toBe('SILVER');
    });

    it('should handle boundary values correctly', () => {
      expect(getTierFromAssets(99999999)).toBe('SILVER');
      expect(getTierFromAssets(100000000)).toBe('GOLD');
      expect(getTierFromAssets(499999999)).toBe('GOLD');
      expect(getTierFromAssets(500000000)).toBe('PLATINUM');
      expect(getTierFromAssets(999999999)).toBe('PLATINUM');
      expect(getTierFromAssets(1000000000)).toBe('DIAMOND');
    });
  });

  describe('getTierIcon', () => {
    it('should return diamond icon for DIAMOND tier', () => {
      expect(getTierIcon('DIAMOND')).toBe('diamond');
    });

    it('should return star icon for PLATINUM tier', () => {
      expect(getTierIcon('PLATINUM')).toBe('star');
    });

    it('should return trophy icon for GOLD tier', () => {
      expect(getTierIcon('GOLD')).toBe('trophy');
    });

    it('should return medal icon for SILVER tier', () => {
      expect(getTierIcon('SILVER')).toBe('medal');
    });

    it('should return ribbon icon for unknown tier', () => {
      expect(getTierIcon('UNKNOWN')).toBe('ribbon');
      expect(getTierIcon('')).toBe('ribbon');
    });
  });

  describe('TIER_COLORS', () => {
    it('should have colors for all tiers', () => {
      expect(TIER_COLORS.DIAMOND).toBeDefined();
      expect(TIER_COLORS.PLATINUM).toBeDefined();
      expect(TIER_COLORS.GOLD).toBeDefined();
      expect(TIER_COLORS.SILVER).toBeDefined();
    });

    it('should return hex color codes', () => {
      expect(TIER_COLORS.DIAMOND).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TIER_COLORS.PLATINUM).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TIER_COLORS.GOLD).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TIER_COLORS.SILVER).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('TIER_LABELS', () => {
    it('should have Korean labels for all tiers', () => {
      expect(TIER_LABELS.DIAMOND).toBe('다이아몬드');
      expect(TIER_LABELS.PLATINUM).toBe('플래티넘');
      expect(TIER_LABELS.GOLD).toBe('골드');
      expect(TIER_LABELS.SILVER).toBe('실버');
    });
  });

  describe('HOLDING_TYPE_COLORS', () => {
    it('should have colors for all holding types', () => {
      expect(HOLDING_TYPE_COLORS.stock).toBeDefined();
      expect(HOLDING_TYPE_COLORS.crypto).toBeDefined();
      expect(HOLDING_TYPE_COLORS.realestate).toBeDefined();
      expect(HOLDING_TYPE_COLORS.other).toBeDefined();
    });

    it('should return hex color codes', () => {
      expect(HOLDING_TYPE_COLORS.stock).toMatch(/^#[0-9A-F]{6}$/i);
      expect(HOLDING_TYPE_COLORS.crypto).toMatch(/^#[0-9A-F]{6}$/i);
      expect(HOLDING_TYPE_COLORS.realestate).toMatch(/^#[0-9A-F]{6}$/i);
      expect(HOLDING_TYPE_COLORS.other).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('getRelativeTime', () => {
    const now = new Date();

    it('should return "방금 전" for times less than 1 minute ago', () => {
      const recent = new Date(now.getTime() - 30000); // 30 seconds ago
      expect(getRelativeTime(recent.toISOString())).toBe('방금 전');
    });

    it('should return minutes for times less than 1 hour ago', () => {
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
      expect(getRelativeTime(fiveMinutesAgo.toISOString())).toBe('5분 전');

      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
      expect(getRelativeTime(thirtyMinutesAgo.toISOString())).toBe('30분 전');
    });

    it('should return hours for times less than 24 hours ago', () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 3600000);
      expect(getRelativeTime(twoHoursAgo.toISOString())).toBe('2시간 전');

      const tenHoursAgo = new Date(now.getTime() - 10 * 3600000);
      expect(getRelativeTime(tenHoursAgo.toISOString())).toBe('10시간 전');
    });

    it('should return days for times less than 7 days ago', () => {
      const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
      expect(getRelativeTime(threeDaysAgo.toISOString())).toBe('3일 전');

      const sixDaysAgo = new Date(now.getTime() - 6 * 86400000);
      expect(getRelativeTime(sixDaysAgo.toISOString())).toBe('6일 전');
    });

    it('should return formatted date for times 7+ days ago', () => {
      const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);
      const result = getRelativeTime(tenDaysAgo.toISOString());

      // Should return Korean date format
      expect(result).toBeTruthy();
      expect(result).not.toContain('일 전');
    });

    it('should handle edge case at exactly 1 minute', () => {
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      expect(getRelativeTime(oneMinuteAgo.toISOString())).toBe('1분 전');
    });

    it('should handle edge case at exactly 1 hour', () => {
      const oneHourAgo = new Date(now.getTime() - 3600000);
      expect(getRelativeTime(oneHourAgo.toISOString())).toBe('1시간 전');
    });

    it('should handle edge case at exactly 1 day', () => {
      const oneDayAgo = new Date(now.getTime() - 86400000);
      expect(getRelativeTime(oneDayAgo.toISOString())).toBe('1일 전');
    });
  });

  describe('formatAssetAmount', () => {
    it('should format amounts over 100M with 억', () => {
      expect(formatAssetAmount(100000000)).toBe('1.0억');
      expect(formatAssetAmount(150000000)).toBe('1.5억');
      expect(formatAssetAmount(1000000000)).toBe('10.0억');
    });

    it('should format amounts over 10K with 만원', () => {
      expect(formatAssetAmount(10000)).toBe('1만원');
      expect(formatAssetAmount(50000)).toBe('5만원');
      expect(formatAssetAmount(99999999)).toBe('10000만원'); // Rounds up
    });

    it('should format small amounts with 원', () => {
      expect(formatAssetAmount(1000)).toBe('1,000원');
      expect(formatAssetAmount(5000)).toBe('5,000원');
      expect(formatAssetAmount(9999)).toBe('9,999원');
    });

    it('should handle zero', () => {
      expect(formatAssetAmount(0)).toBe('0원');
    });

    it('should handle boundary values correctly', () => {
      expect(formatAssetAmount(9999)).toBe('9,999원');
      expect(formatAssetAmount(10000)).toBe('1만원');
      expect(formatAssetAmount(99999999)).toBe('10000만원'); // Rounds to 10000만원
      expect(formatAssetAmount(100000000)).toBe('1.0억');
    });

    it('should format decimal 억 values with 1 decimal place', () => {
      expect(formatAssetAmount(123456789)).toBe('1.2억');
      expect(formatAssetAmount(567890123)).toBe('5.7억');
    });

    it('should format 만원 as integer', () => {
      expect(formatAssetAmount(12345678)).toBe('1235만원'); // Rounded
      expect(formatAssetAmount(56789012)).toBe('5679만원'); // Rounded
    });

    it('should use locale string for amounts under 10K', () => {
      const result = formatAssetAmount(1234);
      expect(result).toContain(',');
      expect(result).toBe('1,234원');
    });
  });
});
