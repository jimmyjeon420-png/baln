/**
 * villageConversationService.ts 테스트
 *
 * 마을 대화 서비스의 캐시 로직을 테스트합니다.
 * - AsyncStorage 캐시 읽기/쓰기
 * - 손상된 캐시 처리 (null 반환)
 * - getCachedBatch 유효 시간 체크
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

jest.mock('../../data/guruCharacterConfig', () => ({
  GURU_CHARACTER_CONFIGS: {
    buffett: { guruName: 'Warren Buffett', guruNameEn: 'Warren Buffett' },
    dalio: { guruName: 'Ray Dalio', guruNameEn: 'Ray Dalio' },
  },
}));

jest.mock('../../utils/promptLanguage', () => ({
  getPromptLanguageInstruction: jest.fn(() => ''),
  getLangParam: jest.fn(() => 'ko'),
}));

jest.mock('../../utils/edgeInvokeError', () => ({
  edgeInvokeErrorMessage: jest.fn((err: { message: string }) => err.message),
  isTransientEdgeInvokeError: jest.fn(() => false),
}));

jest.mock('../../context/LocaleContext', () => ({
  getCurrentDisplayLanguage: jest.fn(() => 'ko'),
}));

jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => 'ko'),
  t: jest.fn((key: string) => key),
}));

jest.mock('../contentFreshnessService', () => ({
  getFreshnessPromptSuffix: jest.fn().mockResolvedValue(''),
  markSeen: jest.fn().mockResolvedValue(undefined),
  hashContent: jest.fn((s: string) => `hash_${s.slice(0, 10)}`),
}));

jest.mock('../../data/guruQuoteBank', () => ({
  getRandomQuote: jest.fn(() => ({
    guruId: 'buffett',
    quote: 'test quote',
    quoteEn: 'test quote en',
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { getCachedBatch } = require('../villageConversationService');

describe('villageConversationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // getCachedBatch
  // ============================================================================

  describe('getCachedBatch', () => {
    it('should return null when no cache exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const result = await getCachedBatch();
      expect(result).toBeNull();
    });

    it('should return cached batch when valid and fresh', async () => {
      const freshBatch = {
        conversations: [
          {
            trigger: 'test conversation',
            messages: [
              { id: 'vm_1', speaker: 'buffett', message: 'hello', sentiment: 'NEUTRAL' },
            ],
          },
        ],
        generatedAt: new Date().toISOString(),
        language: 'ko',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(freshBatch));

      const result = await getCachedBatch();
      expect(result).not.toBeNull();
      expect(result?.conversations).toHaveLength(1);
      expect(result?.conversations[0].trigger).toBe('test conversation');
    });

    it('should return null when cache is expired (> 3 hours)', async () => {
      const oldBatch = {
        conversations: [
          {
            trigger: 'old conversation',
            messages: [
              { id: 'vm_1', speaker: 'dalio', message: 'old', sentiment: 'NEUTRAL' },
            ],
          },
        ],
        generatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        language: 'ko',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(oldBatch));

      const result = await getCachedBatch();
      expect(result).toBeNull();
    });

    it('should handle corrupted cache gracefully (returns null)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('this is not valid JSON!!!');

      const result = await getCachedBatch();
      expect(result).toBeNull();
    });

    it('should return null when cached language mismatches current language', async () => {
      const enBatch = {
        conversations: [
          {
            trigger: 'English conversation',
            messages: [
              { id: 'vm_1', speaker: 'buffett', message: 'Hello', sentiment: 'NEUTRAL' },
            ],
          },
        ],
        generatedAt: new Date().toISOString(),
        language: 'en', // cached in English, but current locale is 'ko'
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(enBatch));

      const result = await getCachedBatch();
      expect(result).toBeNull();
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await getCachedBatch();
      expect(result).toBeNull();
    });
  });
});
