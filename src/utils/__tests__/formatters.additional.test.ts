/**
 * formatters.ts 추가 테스트 -- 로케일 기반 포맷 함수
 *
 * 기존 formatters.test.ts는 한국어 고정 테스트.
 * 이 파일은 영어/일본어/한국어 전환을 포함한 로케일별 테스트.
 */

// 로케일 mock 상태를 제어하기 위한 변수 (mock 이름 규칙: mock 접두사)
let mockCurrentLang = 'ko';

jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => mockCurrentLang),
  t: jest.fn((key: string, opts?: Record<string, unknown>) => {
    const koMap: Record<string, string> = {
      'format.locale_code': 'ko-KR',
      'format.currency_symbol': '\u20A9',
    };
    const enMap: Record<string, string> = {
      'format.locale_code': 'en-US',
      'format.currency_symbol': '$',
    };
    const jaMap: Record<string, string> = {
      'format.locale_code': 'ja-JP',
      'format.currency_symbol': '\u00A5',
    };

    const map = mockCurrentLang === 'ja' ? jaMap : mockCurrentLang === 'en' ? enMap : koMap;
    if (map[key] !== undefined) return map[key];

    // compact format interpolation
    if (key === 'format.compact_trillion') {
      return mockCurrentLang === 'en' ? `$${opts?.n}T` : `${opts?.n}조`;
    }
    if (key === 'format.compact_billion') {
      return mockCurrentLang === 'en' ? `$${opts?.n}B` : `${opts?.n}억`;
    }
    if (key === 'format.compact_million') return `$${opts?.n}M`;
    if (key === 'format.compact_thousand') {
      return mockCurrentLang === 'en' ? `$${opts?.n}K` : `${opts?.n}만`;
    }
    return key;
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const formatters = require('../formatters');

describe('formatters - locale-aware functions', () => {
  beforeEach(() => {
    mockCurrentLang = 'ko';
  });

  // ============================================================================
  // getCurrencySymbol
  // ============================================================================

  describe('getCurrencySymbol', () => {
    it('should return Won sign for Korean locale', () => {
      mockCurrentLang = 'ko';
      expect(formatters.getCurrencySymbol()).toBe('\u20A9');
    });

    it('should return Dollar sign for English locale', () => {
      mockCurrentLang = 'en';
      expect(formatters.getCurrencySymbol()).toBe('$');
    });

    it('should return Yen sign for Japanese locale', () => {
      mockCurrentLang = 'ja';
      expect(formatters.getCurrencySymbol()).toBe('\u00A5');
    });
  });

  // ============================================================================
  // isKoreanLocale / isJapaneseLocale
  // ============================================================================

  describe('isKoreanLocale', () => {
    it('should return true for Korean', () => {
      mockCurrentLang = 'ko';
      expect(formatters.isKoreanLocale()).toBe(true);
    });

    it('should return false for English', () => {
      mockCurrentLang = 'en';
      expect(formatters.isKoreanLocale()).toBe(false);
    });

    it('should return false for Japanese', () => {
      mockCurrentLang = 'ja';
      expect(formatters.isKoreanLocale()).toBe(false);
    });
  });

  describe('isJapaneseLocale', () => {
    it('should return true for Japanese', () => {
      mockCurrentLang = 'ja';
      expect(formatters.isJapaneseLocale()).toBe(true);
    });

    it('should return false for Korean', () => {
      mockCurrentLang = 'ko';
      expect(formatters.isJapaneseLocale()).toBe(false);
    });

    it('should return false for English', () => {
      mockCurrentLang = 'en';
      expect(formatters.isJapaneseLocale()).toBe(false);
    });
  });

  // ============================================================================
  // formatJPY
  // ============================================================================

  describe('formatJPY', () => {
    it('should format basic JPY amount', () => {
      expect(formatters.formatJPY(120000)).toBe('\u00A5120,000');
    });

    it('should format compact with man (10000+)', () => {
      expect(formatters.formatJPY(50000, true)).toBe('5\u4E07');
      expect(formatters.formatJPY(120000, true)).toBe('12\u4E07');
    });

    it('should format compact with oku (100M+)', () => {
      expect(formatters.formatJPY(500_000_000, true)).toBe('5\u5104');
      expect(formatters.formatJPY(1_200_000_000, true)).toBe('12\u5104');
    });

    it('should format compact with cho (1T+)', () => {
      expect(formatters.formatJPY(1_000_000_000_000, true)).toBe('1\u5146');
      expect(formatters.formatJPY(5_000_000_000_000, true)).toBe('5\u5146');
    });

    it('should not compact amounts below 10000', () => {
      expect(formatters.formatJPY(9999, true)).toBe('\u00A59,999');
    });
  });

  // ============================================================================
  // formatLocalAmount
  // ============================================================================

  describe('formatLocalAmount', () => {
    it('should format as KRW for Korean locale', () => {
      mockCurrentLang = 'ko';
      expect(formatters.formatLocalAmount(50000)).toBe('\u20A950,000');
    });

    it('should format as USD for English locale', () => {
      mockCurrentLang = 'en';
      expect(formatters.formatLocalAmount(1000)).toBe('$1,000');
    });

    it('should format as JPY for Japanese locale', () => {
      mockCurrentLang = 'ja';
      expect(formatters.formatLocalAmount(10000)).toBe('\u00A510,000');
    });

    it('should handle compact mode for Korean', () => {
      mockCurrentLang = 'ko';
      expect(formatters.formatLocalAmount(100_000_000, true)).toBe('1\uC5B5');
    });

    it('should handle compact mode for English', () => {
      mockCurrentLang = 'en';
      expect(formatters.formatLocalAmount(5000, true)).toBe('$5.0K');
    });
  });

  // ============================================================================
  // formatCompactAmount
  // ============================================================================

  describe('formatCompactAmount', () => {
    it('should compact Korean amounts with man/eok/jo', () => {
      mockCurrentLang = 'ko';
      expect(formatters.formatCompactAmount(50000)).toContain('\uB9CC');
      expect(formatters.formatCompactAmount(200_000_000)).toContain('\uC5B5');
      expect(formatters.formatCompactAmount(3_000_000_000_000)).toContain('\uC870');
    });

    it('should compact English amounts with K/M/B/T', () => {
      mockCurrentLang = 'en';
      expect(formatters.formatCompactAmount(5000)).toContain('K');
      expect(formatters.formatCompactAmount(2_000_000)).toContain('M');
      expect(formatters.formatCompactAmount(3_000_000_000)).toContain('B');
      expect(formatters.formatCompactAmount(1_000_000_000_000)).toContain('T');
    });

    it('should return plain formatted amount for small values', () => {
      mockCurrentLang = 'en';
      const result = formatters.formatCompactAmount(500);
      expect(result).toContain('$');
      expect(result).toContain('500');
    });

    it('should compact Japanese amounts with man/eok (same path as Korean)', () => {
      mockCurrentLang = 'ja';
      expect(formatters.formatCompactAmount(50000)).toContain('\uB9CC');
      expect(formatters.formatCompactAmount(200_000_000)).toContain('\uC5B5');
    });
  });
});
