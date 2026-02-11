/**
 * centralKitchen.ts 통합 테스트
 *
 * Central Kitchen 서비스의 핵심 기능을 테스트합니다:
 * - DB 조회 → Gemini 폴백 로직
 * - Morning Briefing 로드 (DB hit/miss)
 * - 거시경제 인사이트 조회
 * - 종목별 퀀트 리포트 조회
 * - 포트폴리오 해시 기반 캐싱
 * - 처방전 저장 및 조회
 */

import {
  getTodayMarketInsight,
  getTodayStockReports,
  loadMorningBriefing,
  computePortfolioHash,
  getTodayPrescription,
  savePrescription,
  getQuickMarketSentiment,
  getQuickStockSignal,
  getTodayGuruInsights,
  getTodayRateCycleEvidence,
  type DailyMarketInsight,
  type StockQuantReport,
  type CentralKitchenResult,
} from '../centralKitchen';

import {
  type PortfolioAsset,
  type MorningBriefingResult,
  type RiskAnalysisResult,
} from '../gemini';

import * as geminiService from '../gemini';
import supabase from '../supabase';

// ============================================================================
// Mock 설정
// ============================================================================

// Supabase mock
jest.mock('../supabase', () => ({
  __esModule: true,
  default: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

// Gemini mock
jest.mock('../gemini', () => ({
  generateMorningBriefing: jest.fn(),
  analyzePortfolioRisk: jest.fn(),
}));

// ============================================================================
// Fixtures (테스트 데이터)
// ============================================================================

const mockPortfolio: PortfolioAsset[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    quantity: 10,
    avgPrice: 150000,
    currentPrice: 180000,
    currentValue: 1800000,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    quantity: 5,
    avgPrice: 500000,
    currentPrice: 800000,
    currentValue: 4000000,
  },
  {
    ticker: '005930.KS',
    name: '삼성전자',
    quantity: 20,
    avgPrice: 70000,
    currentPrice: 75000,
    currentValue: 1500000,
  },
];

const mockMarketInsight: DailyMarketInsight = {
  date: '2026-02-11',
  macro_summary: {
    title: '금리 동결, 기술주 강세',
    highlights: [
      'Fed 금리 동결 발표',
      'AI 반도체 수요 지속',
      '삼성전자 실적 개선',
    ],
    interestRateProbability: '동결 70%, 인하 30%',
    marketSentiment: 'BULLISH',
  },
  bitcoin_analysis: {
    score: 75,
    whaleAlerts: ['고래 지갑 1,200 BTC 매수'],
    etfInflows: '+$320M',
    politicsImpact: 'SEC ETF 추가 승인 임박',
    priceTarget: '$95,000',
  },
  market_sentiment: 'BULLISH',
  cfo_weather: {
    emoji: '☀️',
    status: '맑음',
    message: '투자하기 좋은 날',
  },
  vix_level: 14.5,
  global_liquidity: 'Rising (+2.3% MoM)',
};

const mockStockReports: StockQuantReport[] = [
  {
    ticker: 'AAPL',
    date: '2026-02-11',
    valuation_score: 72,
    signal: 'BUY',
    analysis: 'AI 기능 탑재로 실적 개선 기대',
    metrics: {
      pegRatio: 2.1,
      rsi: 58,
      earningsRevision: '상향',
      priceToFairValue: 0.95,
    },
    sector: 'Technology',
  },
  {
    ticker: 'NVDA',
    date: '2026-02-11',
    valuation_score: 88,
    signal: 'STRONG_BUY',
    analysis: 'AI 수요 폭발, 데이터센터 주문 급증',
    metrics: {
      pegRatio: 1.8,
      rsi: 65,
      earningsRevision: '대폭 상향',
      priceToFairValue: 0.88,
    },
    sector: 'Technology',
  },
  {
    ticker: '005930.KS',
    date: '2026-02-11',
    valuation_score: 65,
    signal: 'HOLD',
    analysis: 'HBM 수주 증가, 단 중국 리스크 존재',
    metrics: {
      pegRatio: 1.5,
      rsi: 52,
      earningsRevision: '소폭 상향',
      priceToFairValue: 1.02,
    },
    sector: 'Technology',
  },
];

const mockMorningBriefing: MorningBriefingResult = {
  macroSummary: mockMarketInsight.macro_summary,
  portfolioActions: [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      action: 'BUY',
      reason: '밸류에이션 점수 72/100 (저평가). AI 기능 탑재로 실적 개선 기대',
      priority: 'MEDIUM',
    },
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      action: 'SELL',
      reason: '밸류에이션 점수 88/100 (저평가). 현재 수익률 +60.0% - 일부 익절 검토',
      priority: 'HIGH',
    },
    {
      ticker: '005930.KS',
      name: '삼성전자',
      action: 'HOLD',
      reason: '밸류에이션 점수 65/100 (저평가). HBM 수주 증가, 단 중국 리스크 존재',
      priority: 'LOW',
    },
  ],
  cfoWeather: mockMarketInsight.cfo_weather,
  generatedAt: '2026-02-11T00:00:00.000Z',
};

const mockRiskAnalysis: RiskAnalysisResult = {
  panicShieldIndex: 55,
  panicShieldLevel: 'CAUTION',
  panicShieldReason: '포트폴리오의 60% 이상이 기술주에 집중되어 있습니다',
  stopLossGuidelines: [],
  fomoAlerts: [],
  personalizedAdvice: [
    '포트폴리오의 60% 이상이 기술주에 집중되어 있습니다',
    '채권이나 금 ETF로 일부 분산 검토',
  ],
  portfolioSnapshot: {
    totalValue: 7300000,
    totalGainLoss: 1900000,
    gainLossPercent: 26,
    diversificationScore: 72,
  },
};

const mockGuruInsights = {
  date: '2026-02-11',
  insights: [
    {
      guruName: '워렌 버핏',
      guruNameEn: 'Warren Buffett',
      organization: 'Berkshire Hathaway',
      emoji: '🦉',
      topic: '미국 대형 가치주',
      recentAction: '에너지주 추가 매수',
      quote: '공포가 지배할 때 탐욕스러워지라',
      sentiment: 'BULLISH' as const,
      reasoning: '최근 금리 안정화로 가치주 저평가 국면 진입',
      relevantAssets: ['BRK.B', 'KO', 'BAC'],
      source: 'Berkshire Hathaway SEC Filing',
    },
  ],
  market_context: '금리 동결 후 가치주 재평가 국면',
};

const mockRateCycleEvidence = {
  keyEvidence: [
    {
      headline: 'Fed Chair Powell: 금리 인하 시기상조',
      source: 'Bloomberg',
      date: '2026-02-10',
      stance: 'hawkish' as const,
      impact: 'high' as const,
    },
  ],
  economicIndicators: {
    fedRate: {
      name: 'Fed 기준금리',
      value: '5.25-5.50%',
      previous: '5.25-5.50%',
      trend: 'stable' as const,
    },
    cpi: {
      name: 'CPI (소비자물가)',
      value: '3.1%',
      previous: '3.4%',
      trend: 'falling' as const,
    },
    unemployment: {
      name: '실업률',
      value: '3.7%',
      previous: '3.8%',
      trend: 'falling' as const,
    },
    yieldCurveSpread: {
      name: '수익률곡선 스프레드',
      value: '0.15%',
      previous: '0.05%',
      trend: 'rising' as const,
    },
    pceCore: {
      name: 'PCE 코어',
      value: '2.9%',
      previous: '3.2%',
      trend: 'falling' as const,
    },
  },
  expertPerspectives: {
    ratio: 60,
    hawkishArgs: ['인플레이션 재가속 리스크', '노동시장 여전히 견조'],
    dovishArgs: ['CPI 하락 추세', '경기 둔화 조짐'],
    hawkishFigures: ['James Bullard', 'Neel Kashkari'],
    dovishFigures: ['Raphael Bostic', 'Charles Evans'],
  },
  confidenceFactors: {
    overall: 75,
    factors: [
      {
        factor: 'Fed 의장 발언 일관성',
        type: 'supporting' as const,
        weight: 'strong' as const,
      },
      {
        factor: '시장 금리 선물 가격',
        type: 'opposing' as const,
        weight: 'medium' as const,
      },
    ],
  },
  generatedAt: '2026-02-11T00:00:00.000Z',
};

// ============================================================================
// 테스트 케이스
// ============================================================================

describe('centralKitchen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Test 1: getTodayMarketInsight - DB 히트
  // ============================================================================
  describe('getTodayMarketInsight', () => {
    it('should return market insight when DB has data', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMarketInsight,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayMarketInsight();

      expect(result).toEqual(mockMarketInsight);
      expect(mockFrom).toHaveBeenCalledWith('daily_market_insights');
    });

    it('should return null when DB has no data', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayMarketInsight();

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Test 2: getTodayStockReports - 티커별 조회
  // ============================================================================
  describe('getTodayStockReports', () => {
    it('should return stock reports for given tickers', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockStockReports,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayStockReports(['AAPL', 'NVDA', '005930.KS']);

      expect(result).toEqual(mockStockReports);
      expect(mockFrom).toHaveBeenCalledWith('stock_quant_reports');
    });

    it('should return empty array when tickers is empty', async () => {
      const result = await getTodayStockReports([]);

      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should return empty array when DB has no data', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayStockReports(['UNKNOWN']);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Test 3: loadMorningBriefing - DB 히트 (빠른 경로)
  // ============================================================================
  describe('loadMorningBriefing', () => {
    it('should use Central Kitchen data when available (fast path)', async () => {
      const mockFrom = jest.fn((tableName: string) => {
        if (tableName === 'daily_market_insights') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMarketInsight,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tableName === 'stock_quant_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: mockStockReports,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await loadMorningBriefing(mockPortfolio);

      expect(result.source).toBe('central-kitchen');
      expect(result.morningBriefing).toBeDefined();
      expect(result.morningBriefing.macroSummary).toEqual(mockMarketInsight.macro_summary);
      expect(result.morningBriefing.portfolioActions).toHaveLength(3);
      expect(result.stockReports).toEqual(mockStockReports);
      expect(result.marketInsight).toEqual(mockMarketInsight);
      expect(geminiService.generateMorningBriefing).not.toHaveBeenCalled();
    });

    it('should fallback to live Gemini when DB has no data', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;
      (geminiService.generateMorningBriefing as jest.Mock).mockResolvedValue(
        mockMorningBriefing
      );

      const result = await loadMorningBriefing(mockPortfolio);

      expect(result.source).toBe('live-gemini');
      expect(result.morningBriefing).toEqual(mockMorningBriefing);
      expect(result.stockReports).toEqual([]);
      expect(result.marketInsight).toBeNull();
      expect(geminiService.generateMorningBriefing).toHaveBeenCalledWith(
        mockPortfolio,
        undefined
      );
    });

    it('should fallback to live Gemini when DB query fails', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('DB connection error')),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;
      (geminiService.generateMorningBriefing as jest.Mock).mockResolvedValue(
        mockMorningBriefing
      );

      const result = await loadMorningBriefing(mockPortfolio);

      expect(result.source).toBe('live-gemini');
      expect(geminiService.generateMorningBriefing).toHaveBeenCalled();
    });

    it('should include real estate insights when options provided', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;
      (geminiService.generateMorningBriefing as jest.Mock).mockResolvedValue(
        mockMorningBriefing
      );

      const options = {
        includeRealEstate: true,
        realEstateContext: '서울시 강남구 아파트 보유',
      };

      await loadMorningBriefing(mockPortfolio, options);

      expect(geminiService.generateMorningBriefing).toHaveBeenCalledWith(
        mockPortfolio,
        options
      );
    });
  });

  // ============================================================================
  // Test 4: computePortfolioHash - 해시 계산
  // ============================================================================
  describe('computePortfolioHash', () => {
    it('should compute deterministic hash for portfolio', () => {
      const hash1 = computePortfolioHash(mockPortfolio);
      const hash2 = computePortfolioHash(mockPortfolio);

      expect(hash1).toBe(hash2);
      expect(hash1).toContain('AAPL:10');
      expect(hash1).toContain('NVDA:5');
      expect(hash1).toContain('005930.KS:20');
    });

    it('should produce different hash when quantity changes', () => {
      const hash1 = computePortfolioHash(mockPortfolio);

      const modifiedPortfolio = [
        { ...mockPortfolio[0], quantity: 20 }, // AAPL 10주 → 20주
        mockPortfolio[1],
        mockPortfolio[2],
      ];

      const hash2 = computePortfolioHash(modifiedPortfolio);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash when tickers change', () => {
      const hash1 = computePortfolioHash(mockPortfolio);

      const modifiedPortfolio = [
        { ...mockPortfolio[0], ticker: 'TSLA' }, // AAPL → TSLA
        mockPortfolio[1],
        mockPortfolio[2],
      ];

      const hash2 = computePortfolioHash(modifiedPortfolio);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash regardless of order', () => {
      const hash1 = computePortfolioHash(mockPortfolio);
      const reversedPortfolio = [...mockPortfolio].reverse();
      const hash2 = computePortfolioHash(reversedPortfolio);

      expect(hash1).toBe(hash2);
    });

    it('should handle empty portfolio', () => {
      const hash = computePortfolioHash([]);

      expect(hash).toBe('');
    });
  });

  // ============================================================================
  // Test 5: getTodayPrescription - 캐시 조회
  // ============================================================================
  describe('getTodayPrescription', () => {
    it('should return cached prescription when hash matches', async () => {
      const userId = 'user-123';
      const portfolioHash = 'AAPL:10,NVDA:5';

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              morning_briefing: mockMorningBriefing,
              risk_analysis: mockRiskAnalysis,
              portfolio_hash: portfolioHash,
              source: 'central-kitchen',
            },
            error: null,
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayPrescription(userId, portfolioHash);

      expect(result).toBeDefined();
      expect(result?.morningBriefing).toEqual(mockMorningBriefing);
      expect(result?.riskAnalysis).toEqual(mockRiskAnalysis);
      expect(result?.source).toBe('central-kitchen');
    });

    it('should return null when cache not found', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'No rows' },
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayPrescription('user-123', 'AAPL:10');

      expect(result).toBeNull();
    });

    it('should return null when portfolio hash mismatch', async () => {
      const userId = 'user-123';
      const currentHash = 'AAPL:20,NVDA:5'; // 수량 변경됨
      const cachedHash = 'AAPL:10,NVDA:5';

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              morning_briefing: mockMorningBriefing,
              risk_analysis: mockRiskAnalysis,
              portfolio_hash: cachedHash, // 캐시된 해시가 다름
              source: 'central-kitchen',
            },
            error: null,
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayPrescription(userId, currentHash);

      expect(result).toBeNull(); // 해시 불일치 → 캐시 무효화
    });
  });

  // ============================================================================
  // Test 6: savePrescription - 처방전 저장
  // ============================================================================
  describe('savePrescription', () => {
    it('should save prescription to DB', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      await savePrescription(
        'user-123',
        'AAPL:10,NVDA:5',
        mockMorningBriefing,
        mockRiskAnalysis,
        'central-kitchen'
      );

      expect(mockFrom).toHaveBeenCalledWith('user_daily_prescriptions');
      expect(mockFrom().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          portfolio_hash: 'AAPL:10,NVDA:5',
          source: 'central-kitchen',
        }),
        { onConflict: 'user_id,date' }
      );
    });

    it('should handle save errors gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'Network error' },
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      // 에러를 던지지 않고 경고만 출력해야 함
      await expect(
        savePrescription(
          'user-123',
          'AAPL:10',
          mockMorningBriefing,
          null,
          'live-gemini'
        )
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Test 7: getQuickMarketSentiment - 빠른 조회
  // ============================================================================
  describe('getQuickMarketSentiment', () => {
    it('should return quick sentiment data', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                market_sentiment: 'BULLISH',
                cfo_weather: mockMarketInsight.cfo_weather,
              },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getQuickMarketSentiment();

      expect(result).toEqual({
        sentiment: 'BULLISH',
        cfoWeather: mockMarketInsight.cfo_weather,
      });
    });

    it('should return null when no data', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getQuickMarketSentiment();

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Test 8: getQuickStockSignal - 종목 신호 조회
  // ============================================================================
  describe('getQuickStockSignal', () => {
    it('should return stock signal for given ticker', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              signal: 'STRONG_BUY',
              valuation_score: 88,
              analysis: 'AI 수요 폭발',
            },
            error: null,
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getQuickStockSignal('NVDA');

      expect(result).toEqual({
        signal: 'STRONG_BUY',
        score: 88,
        analysis: 'AI 수요 폭발',
      });
    });

    it('should return null when no data for ticker', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'No rows' },
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getQuickStockSignal('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Test 9: getTodayGuruInsights - 거장 인사이트
  // ============================================================================
  describe('getTodayGuruInsights', () => {
    it('should return guru insights when available', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockGuruInsights,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayGuruInsights();

      expect(result).toEqual(mockGuruInsights);
      expect(result?.insights).toHaveLength(1);
      expect(result?.insights[0].guruName).toBe('워렌 버핏');
    });

    it('should return null when no insights available', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayGuruInsights();

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Test 10: getTodayRateCycleEvidence - 금리 사이클 증거
  // ============================================================================
  describe('getTodayRateCycleEvidence', () => {
    it('should return rate cycle evidence when available', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                rate_cycle_evidence: mockRateCycleEvidence,
              },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayRateCycleEvidence();

      expect(result).toEqual(mockRateCycleEvidence);
      expect(result?.keyEvidence).toHaveLength(1);
      expect(result?.expertPerspectives.ratio).toBe(60);
    });

    it('should return null when no evidence available', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayRateCycleEvidence();

      expect(result).toBeNull();
    });

    it('should return null when rate_cycle_evidence field is null', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                rate_cycle_evidence: null, // 필드는 있지만 null
              },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getTodayRateCycleEvidence();

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Test 11: Portfolio Action 생성 로직 (내부 로직 검증)
  // ============================================================================
  describe('buildBriefingFromKitchen (portfolio actions)', () => {
    it('should generate BUY action for undervalued stock', async () => {
      const mockFrom = jest.fn((tableName: string) => {
        if (tableName === 'daily_market_insights') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMarketInsight,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tableName === 'stock_quant_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [mockStockReports[0]], // AAPL만 (BUY 신호)
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await loadMorningBriefing([mockPortfolio[0]]);

      expect(result.source).toBe('central-kitchen');
      const action = result.morningBriefing.portfolioActions[0];
      expect(action.ticker).toBe('AAPL');
      expect(action.action).toBe('BUY');
      expect(action.reason).toContain('밸류에이션 점수');
    });

    it('should generate SELL action for high profit position', async () => {
      const mockFrom = jest.fn((tableName: string) => {
        if (tableName === 'daily_market_insights') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMarketInsight,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tableName === 'stock_quant_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [mockStockReports[1]], // NVDA (STRONG_BUY, 수익률 60%)
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await loadMorningBriefing([mockPortfolio[1]]);

      expect(result.source).toBe('central-kitchen');
      const action = result.morningBriefing.portfolioActions[0];
      expect(action.ticker).toBe('NVDA');
      expect(action.action).toBe('SELL'); // 수익률 60% → 익절 권고
      expect(action.priority).toBe('HIGH');
      expect(action.reason).toContain('익절');
    });

    it('should generate WATCH action for losing position', async () => {
      const losingPortfolio: PortfolioAsset[] = [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          quantity: 10,
          avgPrice: 200000,
          currentPrice: 150000, // -25% 손실
          currentValue: 1500000,
        },
      ];

      const mockFrom = jest.fn((tableName: string) => {
        if (tableName === 'daily_market_insights') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMarketInsight,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (tableName === 'stock_quant_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [mockStockReports[0]],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await loadMorningBriefing(losingPortfolio);

      const action = result.morningBriefing.portfolioActions[0];
      expect(action.action).toBe('WATCH');
      expect(action.priority).toBe('HIGH');
      expect(action.reason).toContain('손절선');
    });
  });
});
