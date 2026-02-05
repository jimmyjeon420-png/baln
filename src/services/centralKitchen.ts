// ============================================================================
// Central Kitchen Client Service
// 프론트엔드에서 사전 계산된 시장 데이터를 조회하고,
// 유저 포트폴리오와 병합하여 최종 결과를 반환
// 폴백: DB 데이터 없으면 라이브 Gemini API 호출
// ============================================================================

import supabase from './supabase';
import {
  generateMorningBriefing,
  analyzePortfolioRisk,
  type PortfolioAsset,
  type MorningBriefingResult,
  type RiskAnalysisResult,
} from './gemini';

// ============================================================================
// 타입 정의
// ============================================================================

/** daily_market_insights 테이블 행 */
export interface DailyMarketInsight {
  date: string;
  macro_summary: {
    title: string;
    highlights: string[];
    interestRateProbability: string;
    marketSentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  };
  bitcoin_analysis: {
    score: number;
    whaleAlerts: string[];
    etfInflows: string;
    politicsImpact: string;
    priceTarget: string;
  };
  market_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  cfo_weather: {
    emoji: string;
    status: string;
    message: string;
  };
  vix_level: number | null;
  global_liquidity: string;
}

/** stock_quant_reports 테이블 행 */
export interface StockQuantReport {
  ticker: string;
  date: string;
  valuation_score: number;
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  analysis: string;
  metrics: {
    pegRatio?: number;
    rsi?: number;
    earningsRevision?: string;
    priceToFairValue?: number;
    shortInterest?: string;
  };
  sector: string;
}

/** Central Kitchen 통합 결과 (Morning Briefing에 퀀트 데이터 병합) */
export interface CentralKitchenResult {
  /** Central Kitchen에서 가져왔는지 여부 */
  source: 'central-kitchen' | 'live-gemini';
  /** Morning Briefing 결과 */
  morningBriefing: MorningBriefingResult;
  /** 유저 보유 종목의 퀀트 리포트 */
  stockReports: StockQuantReport[];
  /** 거시경제 인사이트 */
  marketInsight: DailyMarketInsight | null;
}

// ============================================================================
// 핵심 함수: Central Kitchen 데이터 조회
// ============================================================================

/**
 * 오늘의 거시경제 인사이트 조회
 * @returns DailyMarketInsight 또는 null (데이터 없음)
 */
export async function getTodayMarketInsight(): Promise<DailyMarketInsight | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_market_insights')
    .select('*')
    .eq('date', today)
    .single();

  if (error || !data) {
    console.log('[Central Kitchen] 오늘의 거시경제 데이터 없음 → 폴백 필요');
    return null;
  }

  return data as DailyMarketInsight;
}

/**
 * 오늘의 종목별 퀀트 리포트 조회
 * @param tickers - 조회할 종목 티커 배열
 * @returns 매칭된 퀀트 리포트 배열
 */
export async function getTodayStockReports(
  tickers: string[]
): Promise<StockQuantReport[]> {
  if (tickers.length === 0) return [];

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('stock_quant_reports')
    .select('*')
    .eq('date', today)
    .in('ticker', tickers);

  if (error || !data) {
    console.log('[Central Kitchen] 종목 퀀트 데이터 없음 → 폴백 필요');
    return [];
  }

  return data as StockQuantReport[];
}

// ============================================================================
// 병합 함수: Central Kitchen 데이터 + 유저 포트폴리오
// ============================================================================

/**
 * Central Kitchen 데이터로 MorningBriefingResult 생성
 * 사전 계산된 거시경제 데이터와 유저 포트폴리오 수익률을 병합
 */
function buildBriefingFromKitchen(
  insight: DailyMarketInsight,
  stockReports: StockQuantReport[],
  portfolio: PortfolioAsset[]
): MorningBriefingResult {
  // 포트폴리오 종목별 퀀트 데이터 매칭 → portfolioActions 생성
  const portfolioActions = portfolio.map(asset => {
    const report = stockReports.find(r => r.ticker === asset.ticker);
    const profitLossRate = asset.avgPrice > 0
      ? ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100
      : 0;

    // 퀀트 신호 + 수익률 기반 액션 결정
    let action: 'BUY' | 'HOLD' | 'SELL' | 'WATCH' = 'HOLD';
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let reason = '';

    if (report) {
      // 퀀트 신호 기반
      if (report.signal === 'STRONG_BUY' || report.signal === 'BUY') {
        action = 'BUY';
        reason = `밸류에이션 점수 ${report.valuation_score}/100 (저평가). `;
      } else if (report.signal === 'STRONG_SELL' || report.signal === 'SELL') {
        action = 'SELL';
        reason = `밸류에이션 점수 ${report.valuation_score}/100 (고평가). `;
      }

      // 수익률 기반 오버라이드
      if (profitLossRate > 30) {
        action = 'SELL';
        priority = 'HIGH';
        reason += `현재 수익률 +${profitLossRate.toFixed(1)}% - 일부 익절 검토`;
      } else if (profitLossRate < -20) {
        action = 'WATCH';
        priority = 'HIGH';
        reason += `현재 손실률 ${profitLossRate.toFixed(1)}% - 손절선 재검토`;
      } else if (profitLossRate < -10) {
        priority = 'MEDIUM';
        reason += `현재 손실률 ${profitLossRate.toFixed(1)}% - 주시 필요`;
      }

      // 퀀트 분석 텍스트 추가
      if (report.analysis) {
        reason += ` ${report.analysis}`;
      }
    } else {
      reason = `수익률 ${profitLossRate >= 0 ? '+' : ''}${profitLossRate.toFixed(1)}%`;
    }

    return {
      ticker: asset.ticker,
      name: asset.name,
      action,
      reason: reason.trim(),
      priority,
    };
  });

  return {
    macroSummary: insight.macro_summary,
    portfolioActions,
    cfoWeather: insight.cfo_weather,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 메인 API: Central Kitchen 우선 → 라이브 Gemini 폴백
// ============================================================================

/**
 * 통합 Morning Briefing 로드
 *
 * 1단계: Central Kitchen (DB) 에서 오늘 데이터 조회 (< 100ms)
 * 2단계: DB 데이터 없으면 → 라이브 Gemini API 호출 (3-8초)
 *
 * @param portfolio - 유저 포트폴리오
 * @param options - 부동산 인사이트 옵션
 */
export async function loadMorningBriefing(
  portfolio: PortfolioAsset[],
  options?: { includeRealEstate?: boolean; realEstateContext?: string }
): Promise<CentralKitchenResult> {
  const tickers = portfolio.map(p => p.ticker);

  try {
    // 1단계: Central Kitchen에서 동시 조회
    const [insight, stockReports] = await Promise.all([
      getTodayMarketInsight(),
      getTodayStockReports(tickers),
    ]);

    // Central Kitchen 데이터가 있으면 병합하여 반환
    if (insight && insight.macro_summary?.title) {
      console.log('[Central Kitchen] DB 데이터 사용 (빠른 경로)');
      const briefing = buildBriefingFromKitchen(insight, stockReports, portfolio);
      return {
        source: 'central-kitchen',
        morningBriefing: briefing,
        stockReports,
        marketInsight: insight,
      };
    }
  } catch (err) {
    console.warn('[Central Kitchen] DB 조회 실패, 라이브 폴백:', err);
  }

  // 2단계: 라이브 Gemini 호출 (폴백)
  console.log('[Central Kitchen] 라이브 Gemini 폴백 실행');
  const liveBriefing = await generateMorningBriefing(portfolio, options);

  return {
    source: 'live-gemini',
    morningBriefing: liveBriefing,
    stockReports: [],
    marketInsight: null,
  };
}

/**
 * 통합 Risk Analysis 로드
 * Central Kitchen 퀀트 데이터를 활용하여 리스크 분석 보강
 *
 * 참고: 리스크 분석은 유저별 맞춤이므로 항상 라이브 Gemini 호출
 * 단, 퀀트 데이터가 있으면 프롬프트에 추가 컨텍스트로 활용
 */
export async function loadRiskAnalysis(
  portfolio: PortfolioAsset[]
): Promise<RiskAnalysisResult> {
  // 리스크 분석은 개인화 데이터이므로 라이브 Gemini 사용
  // (Central Kitchen은 글로벌 데이터만 사전 계산)
  return analyzePortfolioRisk(portfolio);
}

/**
 * 오늘의 시장 심리 빠른 조회 (위젯/배지용)
 * DB 조회만 하므로 초고속 (< 50ms)
 */
export async function getQuickMarketSentiment(): Promise<{
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  cfoWeather: { emoji: string; status: string; message: string } | null;
} | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_market_insights')
    .select('market_sentiment, cfo_weather')
    .eq('date', today)
    .single();

  if (error || !data) return null;

  return {
    sentiment: data.market_sentiment as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    cfoWeather: data.cfo_weather as { emoji: string; status: string; message: string },
  };
}

/**
 * 특정 종목의 퀀트 신호 빠른 조회 (카드/배지용)
 */
export async function getQuickStockSignal(
  ticker: string
): Promise<{ signal: string; score: number; analysis: string } | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('stock_quant_reports')
    .select('signal, valuation_score, analysis')
    .eq('ticker', ticker)
    .eq('date', today)
    .single();

  if (error || !data) return null;

  return {
    signal: data.signal,
    score: data.valuation_score,
    analysis: data.analysis,
  };
}
