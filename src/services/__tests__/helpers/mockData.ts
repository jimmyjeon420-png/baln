/**
 * Integration Test Mock Data
 *
 * 재사용 가능한 테스트 fixture들을 제공합니다.
 * - 테스트용 포트폴리오 데이터
 * - 테스트용 사용자 데이터
 * - Gemini API 고정 응답
 */

import type { PortfolioAsset } from '../../gemini';
import type { DailyMarketInsight, StockQuantReport } from '../../centralKitchen';

// ============================================================================
// 테스트 사용자 데이터
// ============================================================================

export const mockUser = {
  id: 'test-user-integration-001',
  email: 'test@baln.app',
  created_at: '2026-01-01T00:00:00Z',
};

export const mockUserCredits = {
  user_id: mockUser.id,
  balance: 100,
  lifetime_purchased: 200,
  lifetime_spent: 100,
  last_bonus_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-11T00:00:00Z',
};

// ============================================================================
// 테스트 포트폴리오 데이터
// ============================================================================

export const mockPortfolio: PortfolioAsset[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    quantity: 10,
    avgPrice: 180.0,
    currentPrice: 195.0,
    currentValue: 1950.0,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    quantity: 5,
    avgPrice: 500.0,
    currentPrice: 520.0,
    currentValue: 2600.0,
  },
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    quantity: 0.1,
    avgPrice: 90000.0,
    currentPrice: 95000.0,
    currentValue: 9500.0,
  },
];

export const mockPortfolioHash = 'AAPL:10,BTC:0.1,NVDA:5';

// ============================================================================
// Gemini API 고정 응답 (Morning Briefing)
// ============================================================================

export const mockGeminiMorningBriefingResponse = {
  macroSummary: {
    title: '📈 기술주 반등 + 금리 인하 기대감',
    highlights: [
      '미국 CPI 예상치 하회 → 금리 인하 기대',
      '엔비디아 실적 호조 → AI 붐 지속',
      '비트코인 ETF 승인 기대감 상승',
    ],
    interestRateProbability: '3월 금리 인하 확률: 85%',
    marketSentiment: 'BULLISH' as const,
  },
  portfolioActions: [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      action: 'HOLD' as const,
      reason: '아이폰 15 판매 호조, 목표가 유지',
      priority: 'MEDIUM' as const,
    },
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      action: 'BUY' as const,
      reason: 'AI 반도체 수요 폭발, 실적 상향 조정',
      priority: 'HIGH' as const,
    },
    {
      ticker: 'BTC',
      name: 'Bitcoin',
      action: 'HOLD' as const,
      reason: 'ETF 승인 대기 중, 변동성 예상',
      priority: 'LOW' as const,
    },
  ],
  cfoWeather: {
    emoji: '🌤️',
    status: '맑음',
    message: '안정적인 상승장, 적극 투자 적기',
  },
  generatedAt: '2026-02-11T00:00:00Z',
};

// ============================================================================
// Gemini API 고정 응답 (Risk Analysis)
// ============================================================================

export const mockGeminiRiskAnalysisResponse = {
  panicScore: 85,
  riskLevel: 'MEDIUM' as const,
  strengths: [
    '종목 분산: 3개 자산 (주식 2 + 암호화폐 1)',
    '섹터 다각화: 기술주 + 가상자산',
  ],
  weaknesses: [
    '과도한 비중: NVDA 50% (권장: 30% 이하)',
    '변동성 노출: 비트코인 10% 보유',
  ],
  shortTermRisks: [
    {
      risk: '금리 인상 리스크',
      probability: 'MEDIUM' as const,
      impact: '기술주 전반 하락',
    },
  ],
  longTermConcerns: [
    {
      concern: '기술주 집중 리스크',
      advice: '방어주 (헬스케어, 유틸리티) 편입 검토',
    },
  ],
  recommendations: [
    '포트폴리오 리밸런싱 필요 (NVDA 비중 축소)',
    '현금 비중 10% 확보 (기회 대응)',
  ],
  generatedAt: '2026-02-11T00:00:00Z',
};

// ============================================================================
// Central Kitchen DB 데이터 (daily_market_insights)
// ============================================================================

export const mockDailyMarketInsight: DailyMarketInsight = {
  date: '2026-02-11',
  macro_summary: {
    title: '📊 글로벌 증시 상승 + 달러 약세',
    highlights: [
      'S&P 500 사상 최고치 경신',
      '달러 인덱스 6개월 최저',
      '유가 안정 (WTI $75)',
    ],
    interestRateProbability: '3월 금리 동결 확률: 60%',
    marketSentiment: 'BULLISH',
  },
  bitcoin_analysis: {
    score: 78,
    whaleAlerts: ['고래 지갑 1,000 BTC 매집 (2026-02-10)'],
    etfInflows: 'BlackRock IBIT +$500M (3일 연속 유입)',
    politicsImpact: '트럼프 친암호화폐 발언 → 긍정적',
    priceTarget: '단기: $98K / 중기(3개월): $105K',
  },
  market_sentiment: 'BULLISH',
  cfo_weather: {
    emoji: '☀️',
    status: '매우 맑음',
    message: '강세장 지속, 적극 매수 전략',
  },
  vix_level: 12.5,
  global_liquidity: '증가 추세 (Fed 완화 기조)',
};

// ============================================================================
// Central Kitchen DB 데이터 (stock_quant_reports)
// ============================================================================

export const mockStockQuantReports: StockQuantReport[] = [
  {
    ticker: 'AAPL',
    date: '2026-02-11',
    valuation_score: 72,
    signal: 'HOLD',
    analysis: 'PER 28배, 적정 밸류에이션. 신제품 모멘텀 주시.',
    metrics: {
      pegRatio: 1.8,
      rsi: 55,
      earningsRevision: '상향 (Q1 실적 호조)',
      priceToFairValue: 1.05,
    },
    sector: 'Technology',
  },
  {
    ticker: 'NVDA',
    date: '2026-02-11',
    valuation_score: 88,
    signal: 'STRONG_BUY',
    analysis: 'AI 반도체 독점. 실적 상향 조정. 단기 과열 주의.',
    metrics: {
      pegRatio: 1.2,
      rsi: 68,
      earningsRevision: '대폭 상향 (+25%)',
      priceToFairValue: 0.92,
      shortInterest: '낮음 (3%)',
    },
    sector: 'Technology',
  },
];

// ============================================================================
// 크레딧 트랜잭션 Mock
// ============================================================================

export const mockCreditTransactions = [
  {
    id: 'tx-001',
    user_id: mockUser.id,
    type: 'attendance',
    amount: 2,
    balance_after: 102,
    created_at: '2026-02-11T09:00:00Z',
    feature_type: null,
    feature_ref_id: null,
    metadata: { streak: 7 },
  },
  {
    id: 'tx-002',
    user_id: mockUser.id,
    type: 'spend',
    amount: -3,
    balance_after: 99,
    created_at: '2026-02-11T10:00:00Z',
    feature_type: 'deep_dive',
    feature_ref_id: 'analysis-123',
    metadata: null,
  },
];

// ============================================================================
// 에러 응답
// ============================================================================

export const mockSupabaseError = {
  code: 'PGRST116',
  message: 'No rows found',
  details: null,
  hint: null,
};

export const mockGeminiApiError = {
  message: 'Gemini API rate limit exceeded',
  status: 429,
};
