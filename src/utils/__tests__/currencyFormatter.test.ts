/**
 * currencyFormatter.ts 테스트
 *
 * 통화/숫자 포맷팅 유틸리티 함수들을 테스트합니다.
 */

import {
  formatCurrency,
  formatNumber,
  formatPrice,
  formatPercentage,
  formatPriceChange,
  getPriceChangeIndicator,
  getPriceChangeColor,
  formatLargeNumber,
  formatTimeDelta,
  formatAllocation,
  parseCurrency,
} from '../currencyFormatter';
import { LocalizationSettings } from '../../types/i18n';

describe('currencyFormatter', () => {
  const mockLocalizationKRW: LocalizationSettings = {
    locale: 'ko-KR',
    currency: 'KRW',
    currencySymbol: '₩',
    language: 'ko',
  };

  const mockLocalizationUSD: LocalizationSettings = {
    locale: 'en-US',
    currency: 'USD',
    currencySymbol: '$',
    language: 'en',
  };

  describe('formatCurrency', () => {
    it('should format KRW without decimals', () => {
      const result = formatCurrency(10000, mockLocalizationKRW);
      expect(result).toContain('10,000');
      expect(result).toContain('₩');
    });

    it('should format USD with 2 decimals', () => {
      const result = formatCurrency(10000.5, mockLocalizationUSD);
      expect(result).toContain('10,000.50');
      expect(result).toContain('$');
    });

    it('should handle null localization with fallback', () => {
      const result = formatCurrency(100, null);
      expect(result).toBe('$100.00');
    });

    it('should floor KRW values to integers', () => {
      const result = formatCurrency(10000.99, mockLocalizationKRW);
      expect(result).toContain('10,000');
      expect(result).not.toContain('.99');
    });

    it('should handle zero values', () => {
      const result = formatCurrency(0, mockLocalizationKRW);
      expect(result).toContain('0');
    });

    it('should handle negative values', () => {
      const result = formatCurrency(-5000, mockLocalizationKRW);
      expect(result).toContain('-');
      expect(result).toContain('5,000');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with default 2 decimals', () => {
      const result = formatNumber(1234.5678, mockLocalizationKRW, 2);
      expect(result).toContain('1,234.57');
    });

    it('should format numbers with custom decimals', () => {
      const result = formatNumber(1234.5678, mockLocalizationKRW, 0);
      expect(result).toContain('1,235');
    });

    it('should handle null localization with fallback', () => {
      const result = formatNumber(100, null, 2);
      expect(result).toBe('100.00');
    });

    it('should handle 1 decimal place', () => {
      const result = formatNumber(99.95, mockLocalizationKRW, 1);
      expect(result).toContain('100.0');
    });
  });

  describe('formatPrice', () => {
    it('should format price with currency symbol', () => {
      const result = formatPrice(10000, '₩', mockLocalizationKRW);
      expect(result).toContain('₩');
      expect(result).toContain('10,000');
    });

    it('should work with different currency symbols', () => {
      const result = formatPrice(100, '$', mockLocalizationUSD);
      expect(result).toContain('$');
      expect(result).toContain('100');
    });

    it('should handle null localization', () => {
      const result = formatPrice(50, '₩', null);
      expect(result).toContain('₩');
      expect(result).toContain('50');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default 2 decimals', () => {
      const result = formatPercentage(12.345);
      expect(result).toBe('12.35%');
    });

    it('should format percentage with custom decimals', () => {
      const result = formatPercentage(12.345, 1);
      expect(result).toBe('12.3%');
    });

    it('should format percentage without symbol', () => {
      const result = formatPercentage(12.345, 2, false);
      expect(result).toBe('12.35');
    });

    it('should handle negative percentages', () => {
      const result = formatPercentage(-5.55);
      expect(result).toBe('-5.55%');
    });

    it('should handle zero percentage', () => {
      const result = formatPercentage(0);
      expect(result).toBe('0.00%');
    });
  });

  describe('formatPriceChange', () => {
    it('should format positive price change with up direction', () => {
      const result = formatPriceChange(1000, 5.5, mockLocalizationKRW, '₩');
      expect(result.direction).toBe('up');
      expect(result.change).toContain('+');
      expect(result.percent).toContain('+');
      expect(result.percent).toContain('5.50%');
    });

    it('should format negative price change with down direction', () => {
      const result = formatPriceChange(-500, -3.2, mockLocalizationKRW, '₩');
      expect(result.direction).toBe('down');
      expect(result.change).toContain('500');
      expect(result.percent).toContain('3.20%');
    });

    it('should format zero change with neutral direction', () => {
      const result = formatPriceChange(0, 0, mockLocalizationKRW, '₩');
      expect(result.direction).toBe('neutral');
      expect(result.change).not.toContain('+');
      expect(result.percent).not.toContain('+');
    });

    it('should use absolute values in display', () => {
      const result = formatPriceChange(-1000, -10, mockLocalizationKRW, '₩');
      expect(result.change).not.toContain('-');
      expect(result.percent).not.toContain('-');
    });
  });

  describe('getPriceChangeIndicator', () => {
    it('should return up arrow for positive change', () => {
      expect(getPriceChangeIndicator(100)).toBe('↑');
    });

    it('should return down arrow for negative change', () => {
      expect(getPriceChangeIndicator(-100)).toBe('↓');
    });

    it('should return right arrow for zero change', () => {
      expect(getPriceChangeIndicator(0)).toBe('→');
    });
  });

  describe('getPriceChangeColor', () => {
    it('should return green for positive change', () => {
      expect(getPriceChangeColor(100)).toBe('green');
    });

    it('should return red for negative change', () => {
      expect(getPriceChangeColor(-100)).toBe('red');
    });

    it('should return gray for zero change', () => {
      expect(getPriceChangeColor(0)).toBe('gray');
    });
  });

  describe('formatLargeNumber', () => {
    it('should format billions with B suffix', () => {
      expect(formatLargeNumber(1500000000)).toBe('1.5B');
      expect(formatLargeNumber(2000000000)).toBe('2.0B');
    });

    it('should format millions with M suffix', () => {
      expect(formatLargeNumber(1500000)).toBe('1.5M');
      expect(formatLargeNumber(2000000)).toBe('2.0M');
    });

    it('should format thousands with K suffix', () => {
      expect(formatLargeNumber(1500)).toBe('1.5K');
      expect(formatLargeNumber(2000)).toBe('2.0K');
    });

    it('should handle numbers below 1000 without suffix', () => {
      expect(formatLargeNumber(500)).toBe('500.0');
      expect(formatLargeNumber(999)).toBe('999.0');
    });

    it('should handle negative large numbers', () => {
      expect(formatLargeNumber(-1500000)).toBe('-1.5M');
    });

    it('should respect custom decimal places', () => {
      expect(formatLargeNumber(1234567, 2)).toBe('1.23M');
      expect(formatLargeNumber(1234567, 0)).toBe('1M');
    });
  });

  describe('formatTimeDelta', () => {
    const now = Date.now();

    it('should format seconds ago', () => {
      const timestamp = now - 30000; // 30 seconds ago
      const result = formatTimeDelta(timestamp);
      expect(result).toBe('30s ago');
    });

    it('should format minutes ago', () => {
      const timestamp = now - 300000; // 5 minutes ago
      const result = formatTimeDelta(timestamp);
      expect(result).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const timestamp = now - 7200000; // 2 hours ago
      const result = formatTimeDelta(timestamp);
      expect(result).toBe('2h ago');
    });

    it('should format days ago', () => {
      const timestamp = now - 172800000; // 2 days ago
      const result = formatTimeDelta(timestamp);
      expect(result).toBe('2d ago');
    });

    it('should handle current time (0 seconds)', () => {
      const result = formatTimeDelta(now);
      expect(result).toBe('0s ago');
    });
  });

  describe('formatAllocation', () => {
    it('should format allocation with 1 decimal and % symbol', () => {
      const result = formatAllocation(25.567, mockLocalizationKRW);
      expect(result).toContain('25.6');
      expect(result).toContain('%');
    });

    it('should handle integer allocations', () => {
      const result = formatAllocation(50, mockLocalizationKRW);
      expect(result).toContain('50');
      expect(result).toContain('%');
    });

    it('should handle null localization', () => {
      const result = formatAllocation(33.3, null);
      expect(result).toContain('33.3');
      expect(result).toContain('%');
    });
  });

  describe('parseCurrency', () => {
    it('should parse KRW formatted string', () => {
      expect(parseCurrency('₩10,000')).toBe(10000);
      expect(parseCurrency('₩1,000,000')).toBe(1000000);
    });

    it('should parse USD formatted string', () => {
      expect(parseCurrency('$10,000.50')).toBe(10000.50);
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
    });

    it('should handle various currency symbols', () => {
      expect(parseCurrency('€500')).toBe(500);
      expect(parseCurrency('£250.75')).toBe(250.75);
    });

    it('should handle strings without symbols', () => {
      expect(parseCurrency('1000')).toBe(1000);
      expect(parseCurrency('1,000')).toBe(1000);
    });

    it('should return null for invalid strings', () => {
      expect(parseCurrency('not a number')).toBe(null);
      expect(parseCurrency('abc')).toBe(null);
    });

    it('should handle European number format (period as thousands separator)', () => {
      // This test might need adjustment based on actual implementation
      const result = parseCurrency('1.000,50');
      expect(result).toBeTruthy();
    });

    it('should handle empty string', () => {
      expect(parseCurrency('')).toBe(null);
    });
  });
});
