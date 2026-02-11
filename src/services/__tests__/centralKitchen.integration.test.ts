/**
 * centralKitchen.ts 통합 테스트
 *
 * 통합 테스트 시나리오:
 * - DB 캐시 히트 (오늘 데이터 있음)
 * - DB 캐시 미스 → Gemini 호출
 * - 포트폴리오 해시 변경 시 재분석
 * - 에러 핸들링 (Gemini API 실패)
 *
 * 외부 의존성은 모두 mock 처리됩니다.
 */

import {
  loadMorningBriefing,
  getTodayMarketInsight,
  getTodayStockReports,
  getTodayPrescription,
  savePrescription,
  computePortfolioHash,
  getQuickMarketSentiment,
  getQuickStockSignal,
} from '../centralKitchen';
import { generateMorningBriefing } from '../gemini';
import supabase from '../supabase';
import {
  mockPortfolio,
  mockPortfolioHash,
  mockDailyMarketInsight,
  mockStockQuantReports,
  mockGeminiMorningBriefingResponse,
  mockUser,
  mockSupabaseError,
} from './helpers/mockData';

// Mock 설정
jest.mock('../supabase');
jest.mock('../gemini');

describe('centralKitchen.ts 통합 테스트', () => {
  const today = new Date().toISOString().split('T')[0];

  beforeEach(() => {
    jest.clearAllMocks();
    // 시간 고정 (2026-02-11)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-11T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // getTodayMarketInsight - 거시경제 데이터 조회
  // ============================================================================

  describe('getTodayMarketInsight', () => {
    it('1. [Cache Hit] DB에 오늘 데이터가 있으면 반환한다', async () => {
      // Mock DB 응답
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDailyMarketInsight,
          error: null,
        }),
      });

      const result = await getTodayMarketInsight();

      expect(result).toEqual(mockDailyMarketInsight);
      expect(supabase.from).toHaveBeenCalledWith('daily_market_insights');
    });

    it('2. [Cache Miss] DB에 데이터가 없으면 null을 반환한다', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockSupabaseError,
        }),
      });

      const result = await getTodayMarketInsight();

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getTodayStockReports - 종목별 퀀트 리포트 조회
  // ============================================================================

  describe('getTodayStockReports', () => {
    it('3. [Cache Hit] DB에 퀀트 리포트가 있으면 반환한다', async () => {
      const tickers = ['AAPL', 'NVDA'];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: mockStockQuantReports,
          error: null,
        }),
      });

      const result = await getTodayStockReports(tickers);

      expect(result).toEqual(mockStockQuantReports);
      expect(supabase.from).toHaveBeenCalledWith('stock_quant_reports');
    });

    it('4. [Empty Tickers] 빈 티커 배열이면 빈 배열 반환', async () => {
      const result = await getTodayStockReports([]);

      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('5. [Cache Miss] DB 조회 실패 시 빈 배열 반환', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: null,
          error: mockSupabaseError,
        }),
      });

      const result = await getTodayStockReports(['AAPL']);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // loadMorningBriefing - 통합 Morning Briefing (핵심 시나리오)
  // ============================================================================

  describe('loadMorningBriefing (핵심 통합 테스트)', () => {
    it('6. [Scenario A] DB 캐시 히트 → Central Kitchen 데이터 사용', async () => {
      // Mock DB 동시 조회 (getTodayMarketInsight + getTodayStockReports)
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'daily_market_insights') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockDailyMarketInsight,
              error: null,
            }),
          };
        }
        if (table === 'stock_quant_reports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: mockStockQuantReports,
              error: null,
            }),
          };
        }
        return {};
      });

      const result = await loadMorningBriefing(mockPortfolio);

      // Central Kitchen 데이터 사용 확인
      expect(result.source).toBe('central-kitchen');
      expect(result.marketInsight).toEqual(mockDailyMarketInsight);
      expect(result.stockReports).toEqual(mockStockQuantReports);

      // Morning Briefing 병합 확인
      expect(result.morningBriefing.macroSummary).toEqual(mockDailyMarketInsight.macro_summary);
      expect(result.morningBriefing.cfoWeather).toEqual(mockDailyMarketInsight.cfo_weather);
      expect(result.morningBriefing.portfolioActions).toHaveLength(3); // AAPL, NVDA, BTC

      // Gemini API 호출 안 함
      expect(generateMorningBriefing).not.toHaveBeenCalled();
    });

    it('7. [Scenario B] DB 캐시 미스 → Gemini API 폴백', async () => {
      // DB 데이터 없음 (캐시 미스)
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockSupabaseError,
        }),
      });

      // Gemini API Mock
      (generateMorningBriefing as jest.Mock).mockResolvedValue(mockGeminiMorningBriefingResponse);

      const result = await loadMorningBriefing(mockPortfolio);

      // Live Gemini 사용 확인
      expect(result.source).toBe('live-gemini');
      expect(result.morningBriefing).toEqual(mockGeminiMorningBriefingResponse);
      expect(result.marketInsight).toBeNull();
      expect(result.stockReports).toEqual([]);

      // Gemini API 호출됨
      expect(generateMorningBriefing).toHaveBeenCalledWith(mockPortfolio, undefined);
    });

    it('8. [Scenario C] DB 조회 에러 → Gemini API 폴백', async () => {
      // DB 조회 중 예외 발생
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      (generateMorningBriefing as jest.Mock).mockResolvedValue(mockGeminiMorningBriefingResponse);

      const result = await loadMorningBriefing(mockPortfolio);

      // 폴백 성공
      expect(result.source).toBe('live-gemini');
      expect(result.morningBriefing).toEqual(mockGeminiMorningBriefingResponse);
      expect(generateMorningBriefing).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 포트폴리오 해시 & 처방전 캐시
  // ============================================================================

  describe('처방전 캐시 시스템', () => {
    it('9. [Portfolio Hash] 포트폴리오 해시를 정확히 계산한다', () => {
      const hash = computePortfolioHash(mockPortfolio);

      // 정렬된 "티커:수량" 문자열
      expect(hash).toBe(mockPortfolioHash);
    });

    it('10. [Cache Hit] 같은 날 + 같은 포트폴리오 → 캐시된 처방전 반환', async () => {
      const cachedPrescription = {
        morning_briefing: mockGeminiMorningBriefingResponse,
        risk_analysis: null,
        portfolio_hash: mockPortfolioHash,
        source: 'central-kitchen',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: cachedPrescription,
          error: null,
        }),
      });

      const result = await getTodayPrescription(mockUser.id, mockPortfolioHash);

      expect(result).toEqual({
        morningBriefing: mockGeminiMorningBriefingResponse,
        riskAnalysis: null,
        source: 'central-kitchen',
      });
      expect(supabase.from).toHaveBeenCalledWith('user_daily_prescriptions');
    });

    it('11. [Cache Invalidation] 포트폴리오 해시 변경 시 캐시 무효화', async () => {
      const oldHash = 'AAPL:5,NVDA:3'; // 다른 해시
      const cachedPrescription = {
        morning_briefing: mockGeminiMorningBriefingResponse,
        risk_analysis: null,
        portfolio_hash: oldHash,
        source: 'central-kitchen',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: cachedPrescription,
          error: null,
        }),
      });

      const result = await getTodayPrescription(mockUser.id, mockPortfolioHash);

      // 해시 불일치 → 캐시 무효화
      expect(result).toBeNull();
    });

    it('12. [Save Prescription] 처방전을 DB에 저장한다 (UPSERT)', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      await savePrescription(
        mockUser.id,
        mockPortfolioHash,
        mockGeminiMorningBriefingResponse,
        null,
        'central-kitchen'
      );

      expect(supabase.from).toHaveBeenCalledWith('user_daily_prescriptions');
      const upsertCall = (supabase.from as jest.Mock).mock.results[0].value.upsert;
      expect(upsertCall).toHaveBeenCalledWith(
        {
          user_id: mockUser.id,
          date: today,
          morning_briefing: mockGeminiMorningBriefingResponse,
          risk_analysis: null,
          portfolio_hash: mockPortfolioHash,
          source: 'central-kitchen',
        },
        { onConflict: 'user_id,date' }
      );
    });
  });

  // ============================================================================
  // 빠른 조회 API (위젯/배지용)
  // ============================================================================

  describe('빠른 조회 API', () => {
    it('13. [Quick Sentiment] 시장 심리 빠르게 조회 (< 50ms 목표)', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            market_sentiment: 'BULLISH',
            cfo_weather: mockDailyMarketInsight.cfo_weather,
          },
          error: null,
        }),
      });

      const startTime = Date.now();
      const result = await getQuickMarketSentiment();
      const elapsed = Date.now() - startTime;

      expect(result).toEqual({
        sentiment: 'BULLISH',
        cfoWeather: mockDailyMarketInsight.cfo_weather,
      });

      // 실제로는 mock이라 즉시 반환되지만, 프로덕션에서는 < 50ms 목표
      expect(elapsed).toBeLessThan(100);
    });

    it('14. [Quick Stock Signal] 종목 퀀트 신호 빠르게 조회', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            signal: 'STRONG_BUY',
            valuation_score: 88,
            analysis: mockStockQuantReports[1].analysis,
          },
          error: null,
        }),
      });

      const result = await getQuickStockSignal('NVDA');

      expect(result).toEqual({
        signal: 'STRONG_BUY',
        score: 88,
        analysis: mockStockQuantReports[1].analysis,
      });
    });

    it('15. [Quick Query - No Data] 데이터 없으면 null 반환 (에러 없음)', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockSupabaseError,
        }),
      });

      const sentiment = await getQuickMarketSentiment();
      const signal = await getQuickStockSignal('UNKNOWN');

      expect(sentiment).toBeNull();
      expect(signal).toBeNull();
    });
  });

  // ============================================================================
  // 에러 핸들링
  // ============================================================================

  describe('에러 핸들링', () => {
    it('16. [Gemini API Failure] Gemini API 실패 시 에러 throw', async () => {
      // DB 캐시 미스
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockSupabaseError,
        }),
      });

      // Gemini API 실패
      (generateMorningBriefing as jest.Mock).mockRejectedValue(
        new Error('Gemini API rate limit exceeded')
      );

      await expect(loadMorningBriefing(mockPortfolio)).rejects.toThrow('Gemini API rate limit exceeded');
    });
  });
});
