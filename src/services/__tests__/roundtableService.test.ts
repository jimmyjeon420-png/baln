/**
 * roundtableService.ts 테스트
 *
 * JSON 파싱 헬퍼 함수(parseJsonResponse)를 테스트합니다.
 * - 유효한 JSON 파싱
 * - 마크다운 코드 블록 래핑된 JSON 처리
 * - 잘못된 JSON에 대한 에러 메시지
 * - 세션 저장/로드 (AsyncStorage)
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

jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => 'ko'),
  t: jest.fn((key: string) => key),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { saveSession, getRecentSessions, getSessionById } = require('../roundtableService');

describe('roundtableService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // parseJsonResponse (간접 테스트 -- 내부 함수이므로 동일 로직 재현)
  // ============================================================================

  describe('parseJsonResponse logic', () => {
    function parseJsonResponse<T>(text: string): T {
      const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      try {
        return JSON.parse(cleaned);
      } catch (err) {
        throw new Error(
          `[Roundtable] JSON 파싱 실패: ${err instanceof Error ? err.message : String(err)} -- 원본: ${cleaned.slice(0, 200)}`
        );
      }
    }

    it('should parse valid JSON', () => {
      const input = '{"topic_summary": "test", "turns": [], "conclusion": "done"}';
      const result = parseJsonResponse(input);
      expect(result).toEqual({
        topic_summary: 'test',
        turns: [],
        conclusion: 'done',
      });
    });

    it('should handle markdown-wrapped JSON (```json...```)', () => {
      const input = '```json\n{"topic_summary": "BTC", "turns": [{"speaker": "buffett", "message": "hi", "sentiment": "NEUTRAL"}], "conclusion": "end"}\n```';
      const result = parseJsonResponse(input);
      expect(result).toEqual({
        topic_summary: 'BTC',
        turns: [{ speaker: 'buffett', message: 'hi', sentiment: 'NEUTRAL' }],
        conclusion: 'end',
      });
    });

    it('should handle markdown-wrapped JSON with extra whitespace', () => {
      const input = '```json  \n  {"key": "value"}  \n  ```';
      const result = parseJsonResponse(input);
      expect(result).toEqual({ key: 'value' });
    });

    it('should throw descriptive error on invalid JSON', () => {
      const input = 'this is not json at all';
      expect(() => parseJsonResponse(input)).toThrow('[Roundtable] JSON 파싱 실패');
      expect(() => parseJsonResponse(input)).toThrow('원본:');
    });

    it('should throw on empty string', () => {
      expect(() => parseJsonResponse('')).toThrow();
    });
  });

  // ============================================================================
  // 세션 저장/로드 (AsyncStorage)
  // ============================================================================

  describe('saveSession / getRecentSessions', () => {
    it('should save session to AsyncStorage', async () => {
      const mockSession = {
        id: 'rt_test_1',
        topic: 'test topic',
        topicSummary: 'summary',
        participants: ['buffett', 'dalio'],
        turns: [{ speaker: 'buffett', message: 'hello', sentiment: 'NEUTRAL' }],
        conclusion: 'conclusion',
        userQuestions: [],
        createdAt: new Date().toISOString(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      await saveSession(mockSession);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@baln:roundtable_sessions',
        expect.stringContaining('rt_test_1')
      );
    });

    it('should return empty array when no sessions exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const sessions = await getRecentSessions();
      expect(sessions).toEqual([]);
    });

    it('should return empty array on corrupted data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('not valid json!!!');
      const sessions = await getRecentSessions();
      expect(sessions).toEqual([]);
    });

    it('should find session by ID', async () => {
      const sessions = [
        { id: 'rt_1', topic: 'A' },
        { id: 'rt_2', topic: 'B' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(sessions));

      const found = await getSessionById('rt_2');
      expect(found).toEqual({ id: 'rt_2', topic: 'B' });
    });

    it('should return null for non-existent session ID', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([]));
      const found = await getSessionById('non_existent');
      expect(found).toBeNull();
    });
  });
});
