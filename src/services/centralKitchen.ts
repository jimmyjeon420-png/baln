// ============================================================================
// Central Kitchen Client Service
// 프론트엔드에서 사전 계산된 시장 데이터를 조회하고,
// 유저 포트폴리오와 병합하여 최종 결과를 반환
// 폴백: DB 데이터 없으면 라이브 Gemini API 호출
// ============================================================================

import * as Sentry from '@sentry/react-native';
import supabase from './supabase';
import {
  generateMorningBriefing,
  analyzePortfolioRisk,
  type PortfolioAsset,
  type MorningBriefingResult,
  type RiskAnalysisResult,
} from './gemini';
import { getCurrentLanguage } from '../locales';
import { withTimeout } from '../utils/withTimeout';

/**
 * KST 기준 날짜를 YYYY-MM-DD 형식으로 반환
 * Edge Function과 동일한 KST 기준 사용 → 날짜 불일치 방지
 * (이승건: "서버와 클라이언트는 같은 시간대를 써야 한다")
 */
function getLocalDate(): string {
  // UTC + 9시간 = KST
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

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
  signal: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
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

/** 투자 거장 개별 인사이트 */
export interface GuruInsight {
  guruName: string;          // "워렌 버핏"
  guruNameEn: string;        // "Warren Buffett"
  organization: string;      // "Berkshire Hathaway"
  emoji: string;             // "🦉"
  topic: string;             // "미국 대형 가치주"
  recentAction: string;      // 최근 포트폴리오 변동/행동
  quote: string;             // 공개 발언 인용
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS';
  reasoning: string;         // AI 분석 2-3문장
  relevantAssets: string[];  // 관련 티커
  source: string;            // 뉴스 출처
  // 구조화 분석 필드 (선택)
  action?: 'BUY' | 'SELL' | 'HOLD';
  target_tickers?: string[];
  sector?: string;
  conviction_level?: number;
}

/** guru_insights 테이블 행 */
export interface GuruInsightsData {
  date: string;
  insights: GuruInsight[];
  market_context: string | null;
}

// ============================================================================
// 금리 사이클 증거 타입 정의
// ============================================================================

/** 개별 뉴스/이벤트 증거 */
export interface EvidenceItem {
  headline: string;       // 뉴스 헤드라인
  source: string;         // 출처 (Bloomberg, Reuters 등)
  date: string;           // 날짜
  stance: 'hawkish' | 'dovish' | 'neutral';  // 매파/비둘기파/중립
  impact: 'high' | 'medium' | 'low';         // 영향도
}

/** 경제 지표 */
export interface EconIndicator {
  name: string;           // 지표명 (Fed 기준금리, CPI 등)
  value: string;          // 현재 값 (예: "5.25-5.50%")
  previous: string;       // 이전 값
  trend: 'rising' | 'falling' | 'stable';    // 추세
  nextRelease?: string;   // 다음 발표일
}

/** 전문가 진영 */
export interface ExpertCamp {
  ratio: number;          // 비율 (0-100, 매파 비율)
  hawkishArgs: string[];  // 매파 논거
  dovishArgs: string[];   // 비둘기파 논거
  hawkishFigures: string[];  // 매파 대표 인물
  dovishFigures: string[];   // 비둘기파 대표 인물
}

/** 신뢰도 요인 */
export interface ConfidenceFactor {
  factor: string;         // 요인 설명
  type: 'supporting' | 'opposing';  // 지지/반론
  weight: 'strong' | 'medium' | 'weak';  // 가중치
}

/** 금리 사이클 증거 전체 구조 */
export interface RateCycleEvidence {
  keyEvidence: EvidenceItem[];           // 핵심 뉴스 증거
  economicIndicators: {
    fedRate: EconIndicator;              // Fed 기준금리
    cpi: EconIndicator;                  // 소비자물가지수
    unemployment: EconIndicator;         // 실업률
    yieldCurveSpread: EconIndicator;     // 수익률곡선 스프레드
    pceCore: EconIndicator;              // PCE 코어
  };
  expertPerspectives: ExpertCamp;        // 매파 vs 비둘기파
  confidenceFactors: {
    overall: number;                     // 전체 신뢰도 (0-100)
    factors: ConfidenceFactor[];         // 개별 요인
  };
  generatedAt: string;                   // 생성 시각
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
  /** 이 분석에 사용된 데이터 출처 (3~5개) */
  sources?: string[];
}

// ============================================================================
// 핵심 함수: Central Kitchen 데이터 조회
// ============================================================================

/**
 * 오늘의 거시경제 인사이트 조회
 * @returns DailyMarketInsight 또는 null (데이터 없음)
 */
export async function getTodayMarketInsight(): Promise<DailyMarketInsight | null> {
  const today = getLocalDate();

  const { data, error } = await withTimeout(
    supabase
      .from('daily_market_insights')
      .select('date, macro_summary, bitcoin_analysis, market_sentiment, cfo_weather, vix_level, global_liquidity')
      .eq('date', today)
      .single(),
    15000,
    'getTodayMarketInsight'
  );

  if (error || !data) {
    if (__DEV__) console.log('[Central Kitchen] 오늘의 거시경제 데이터 없음 → 폴백 필요');
    return null;
  }

  // Supabase는 JSONB를 자동 파싱함 (진단 결과: 객체로 반환 확인)
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

  const today = getLocalDate();

  const { data, error } = await withTimeout(
    supabase
      .from('stock_quant_reports')
      .select('ticker, date, valuation_score, signal, analysis, metrics, sector')
      .eq('date', today)
      .in('ticker', tickers),
    15000,
    'getTodayStockReports'
  );

  if (error || !data) {
    if (__DEV__) console.log('[Central Kitchen] 종목 퀀트 데이터 없음 → 폴백 필요');
    return [];
  }

  return data as StockQuantReport[];
}

// ============================================================================
// 맥락 카드 타입 Re-export (중앙화)
// ============================================================================

// 맥락 카드 조회 함수는 contextCardService.ts에 구현되어 있음
// 이 파일에서는 타입만 re-export (import 경로 단순화)
export type { ContextCard, UserContextImpact, ContextCardWithImpact } from '../types/contextCard';

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
      if (report.signal === 'VERY_POSITIVE' || report.signal === 'POSITIVE') {
        action = 'BUY';
        reason = `밸류에이션 점수 ${report.valuation_score}/100 (저평가). `;
      } else if (report.signal === 'VERY_NEGATIVE' || report.signal === 'NEGATIVE') {
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
// 출처 구성 헬퍼
// ============================================================================

/**
 * 거시경제 인사이트 + 퀀트 리포트에서 출처 레이블 3~5개 추출
 * "이 분석에 사용된 데이터"를 사용자에게 표시하기 위한 짧은 레이블 배열
 */
function buildSources(
  insight: DailyMarketInsight,
  stockReports: StockQuantReport[]
): string[] {
  const sources: string[] = [];
  const isKo = getCurrentLanguage() === 'ko';

  // 1) 거시경제 핵심 지표 (항상 포함)
  sources.push(isKo ? '한국은행 / Fed 금리 데이터' : 'BOK / Fed Rate Data');

  // 2) VIX (시장 변동성 지수)
  if (insight.vix_level != null) {
    sources.push(`VIX ${insight.vix_level.toFixed(1)}`);
  }

  // 3) 글로벌 유동성 언급 여부
  if (insight.global_liquidity) {
    sources.push(isKo ? '글로벌 유동성 지표' : 'Global Liquidity Index');
  }

  // 4) 종목 퀀트 리포트 섹터 (중복 제거)
  const sectors = [...new Set(stockReports.map(r => r.sector).filter(Boolean))];
  if (sectors.length > 0) {
    const sectorLabel = sectors.slice(0, 2).join(' / ');
    sources.push(isKo ? `${sectorLabel} 퀀트 분석` : `${sectorLabel} Quant Analysis`);
  }

  // 5) 비트코인 분석 포함 여부
  if (insight.bitcoin_analysis?.score != null) {
    sources.push(isKo ? 'BTC 온체인 데이터' : 'BTC On-chain Data');
  }

  // 최대 5개로 제한
  return sources.slice(0, 5);
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
  options?: { includeRealEstate?: boolean; realEstateContext?: string; guruStyle?: string }
): Promise<CentralKitchenResult> {
  const tickers = portfolio.map(p => p.ticker);
  const isKo = getCurrentLanguage() === 'ko';

  // Central Kitchen DB 데이터는 한국어로 생성됨 — 영어 모드에서는 스킵하고 라이브 Gemini 호출
  if (isKo) {
    try {
      // 1단계: Central Kitchen에서 동시 조회
      const [insight, stockReports] = await Promise.all([
        getTodayMarketInsight(),
        getTodayStockReports(tickers),
      ]);

      // Central Kitchen 데이터가 있으면 병합하여 반환
      if (__DEV__) console.log('[디버그] insight:', !!insight, 'macro_summary:', insight?.macro_summary, 'title:', insight?.macro_summary?.title);

      if (insight && insight.macro_summary?.title) {
        if (__DEV__) console.log('[Central Kitchen] ✅ DB 데이터 사용 (빠른 경로)');
        const briefing = buildBriefingFromKitchen(insight, stockReports, portfolio);
        if (__DEV__) console.log('[디버그] briefing.macroSummary:', briefing.macroSummary);

        // 출처 구성: 거시경제 하이라이트 + 종목 섹터 + 글로벌 유동성 지표
        const sources = buildSources(insight, stockReports);

        return {
          source: 'central-kitchen',
          morningBriefing: briefing,
          stockReports,
          marketInsight: insight,
          sources,
        };
      } else {
        if (__DEV__) console.log('[Central Kitchen] ❌ DB 검증 실패 → 라이브 폴백');
      }
    } catch (err) {
      console.warn('[Central Kitchen] DB 조회 실패, 라이브 폴백:', err);
      Sentry.addBreadcrumb({
        category: 'api',
        message: 'Central Kitchen DB lookup failed, falling back to live Gemini',
        level: 'error',
        data: { error: String(err) },
      });
    }
  } else {
    if (__DEV__) console.log('[Central Kitchen] 영어 모드 → DB 스킵, 라이브 Gemini 직행');
  }

  // 2단계: 라이브 Gemini 호출 (폴백)
  if (__DEV__) console.log('[Central Kitchen] 라이브 Gemini 폴백 실행');
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
  const today = getLocalDate();

  const { data, error } = await withTimeout(
    supabase
      .from('daily_market_insights')
      .select('market_sentiment, cfo_weather')
      .eq('date', today)
      .single(),
    10000,
    'getQuickMarketSentiment'
  );

  if (error || !data) return null;

  return {
    sentiment: data.market_sentiment as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    cfoWeather: data.cfo_weather as { emoji: string; status: string; message: string },
  };
}

// ============================================================================
// Panic Shield 점수 저장 (스냅샷에 기록)
// ============================================================================

/**
 * Gemini가 계산한 Panic Shield 점수를 오늘 스냅샷에 저장
 * fire-and-forget 패턴: 실패해도 앱 동작에 영향 없음
 * @param score - 0~100 (높을수록 안전)
 */
export async function savePanicScoreToSnapshot(score: number): Promise<void> {
  // 점수 범위 검증 (0~100 클램프)
  const clampedScore = Math.round(Math.max(0, Math.min(100, score)));

  const { error } = await withTimeout(
    supabase.rpc('save_panic_shield_score', {
      p_score: clampedScore,
    }),
    10000,
    'save_panic_shield_score'
  );

  if (error) {
    console.warn('[Panic Score] 스냅샷 저장 실패 (기능 영향 없음):', error.message);
  } else {
    if (__DEV__) console.log(`[Panic Score] 스냅샷 저장 완료 (${clampedScore}점)`);
  }
}

/**
 * 특정 종목의 퀀트 신호 빠른 조회 (카드/배지용)
 */
export async function getQuickStockSignal(
  ticker: string
): Promise<{ signal: string; score: number; analysis: string } | null> {
  const today = getLocalDate();

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

// ============================================================================
// 유저별 일일 처방전 캐시 (하루 한 번 처방전)
// ============================================================================

/** user_daily_prescriptions 테이블 결과 */
export interface UserDailyPrescription {
  user_id: string;
  date: string;
  morning_briefing: MorningBriefingResult | null;
  risk_analysis: RiskAnalysisResult | null;
  portfolio_hash: string;
  source: string;
  created_at: string;
}

/**
 * 포트폴리오 해시 계산
 * 종목 구성이 바뀌면 해시가 달라짐 → 캐시 무효화
 * @param portfolioAssets - 유저 포트폴리오 자산 배열
 * @returns 정렬된 "티커:수량" 문자열 (예: "AAPL:10,NVDA:5,TSLA:3")
 */
export function computePortfolioHash(portfolioAssets: PortfolioAsset[]): string {
  return portfolioAssets
    .map(a => `${a.ticker}:${a.quantity}`)
    .sort()
    .join(',');
}

/**
 * 오늘의 처방전 캐시 조회
 * 같은 날 + 같은 포트폴리오 해시면 캐시된 결과 반환
 * @returns { morningBriefing, riskAnalysis, source } 또는 null
 */
export async function getTodayPrescription(
  userId: string,
  portfolioHash: string
): Promise<{ morningBriefing: MorningBriefingResult | null; riskAnalysis: RiskAnalysisResult | null; source: string } | null> {
  const today = getLocalDate();

  const { data, error } = await supabase
    .from('user_daily_prescriptions')
    .select('morning_briefing, risk_analysis, portfolio_hash, source')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) {
    if (__DEV__) console.log('[처방전 캐시] 오늘 캐시 없음 → Gemini 생성 필요');
    return null;
  }

  // 포트폴리오 구성이 바뀌었으면 캐시 무효화
  if (data.portfolio_hash !== portfolioHash) {
    if (__DEV__) console.log('[처방전 캐시] 포트폴리오 변경 감지 → 재생성 필요');
    return null;
  }

  if (__DEV__) console.log('[처방전 캐시] DB 캐시 히트 (빠른 경로)');
  return {
    morningBriefing: data.morning_briefing as MorningBriefingResult | null,
    riskAnalysis: data.risk_analysis as RiskAnalysisResult | null,
    source: data.source as string,
  };
}

/**
 * 처방전 결과를 DB에 저장 (UPSERT)
 * 같은 날 재생성 시 덮어쓰기 (포트폴리오 변경 등)
 */
export async function savePrescription(
  userId: string,
  portfolioHash: string,
  morningBriefing: MorningBriefingResult | null,
  riskAnalysis: RiskAnalysisResult | null,
  source: string
): Promise<void> {
  const today = getLocalDate();

  const { error } = await supabase
    .from('user_daily_prescriptions')
    .upsert(
      {
        user_id: userId,
        date: today,
        morning_briefing: morningBriefing,
        risk_analysis: riskAnalysis,
        portfolio_hash: portfolioHash,
        source,
      },
      { onConflict: 'user_id,date' }
    );

  if (error) {
    console.warn('[처방전 캐시] 저장 실패 (기능 영향 없음):', error.message);
  } else {
    if (__DEV__) console.log('[처방전 캐시] DB 저장 완료');
  }
}

// ============================================================================
// 투자 거장 인사이트 조회
// ============================================================================

/**
 * 오늘의 금리 사이클 증거 데이터 조회
 * DB only (< 50ms), 라이브 폴백 없음
 * @returns RateCycleEvidence 또는 null (데이터 없음 또는 07:00 이전)
 */
export async function getTodayRateCycleEvidence(): Promise<RateCycleEvidence | null> {
  const today = getLocalDate();

  const { data, error } = await supabase
    .from('daily_market_insights')
    .select('rate_cycle_evidence')
    .eq('date', today)
    .single();

  if (error || !data || !data.rate_cycle_evidence) {
    if (__DEV__) console.log('[Central Kitchen] 오늘의 금리 사이클 증거 없음');
    return null;
  }

  return data.rate_cycle_evidence as RateCycleEvidence;
}

/**
 * 오늘의 투자 거장 인사이트 조회
 * 글로벌 공유 데이터이므로 라이브 폴백 없음 (DB only)
 * @returns GuruInsightsData 또는 null (데이터 없음)
 */
export async function getTodayGuruInsights(): Promise<GuruInsightsData | null> {
  const today = getLocalDate();

  const { data, error } = await supabase
    .from('guru_insights')
    .select('date, insights, market_context')
    .eq('date', today)
    .single();

  if (error || !data) {
    if (__DEV__) console.log('[Central Kitchen] 오늘의 거장 인사이트 없음');
    return null;
  }

  return data as GuruInsightsData;
}

// ============================================================================
// 부동산 시세 캐시 조회
// ============================================================================

/** 부동산 시세 캐시 결과 */
export interface RealEstatePriceCacheResult {
  latestPrice: number;       // 최근 거래가 (원)
  avgPrice3: number;         // 최근 3건 평균 (원)
  priceChangeRate: number;   // 변동률 (%)
  lastTransactionDate: string | null;
  transactionCount: number;
  updatedAt: string;
}

/**
 * 부동산 시세 캐시 조회 (DB only, < 50ms)
 * Central Kitchen 패턴: Task F에서 사전 갱신된 데이터 조회
 *
 * @param lawdCd - 법정동코드
 * @param complexName - 단지명
 * @param unitArea - 전용면적 (㎡)
 * @returns 캐시된 시세 정보 또는 null
 */
export async function getRealEstatePrice(
  lawdCd: string,
  complexName: string,
  unitArea: number,
): Promise<RealEstatePriceCacheResult | null> {
  const { data, error } = await supabase
    .from('realestate_price_cache')
    .select('latest_price, avg_price_3, price_change_rate, last_transaction_date, transaction_count, updated_at')
    .eq('lawd_cd', lawdCd)
    .eq('complex_name', complexName)
    .gte('unit_area', unitArea - 2)
    .lte('unit_area', unitArea + 2)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    if (__DEV__) console.log('[Central Kitchen] 부동산 시세 캐시 없음');
    return null;
  }

  return {
    latestPrice: data.latest_price,
    avgPrice3: data.avg_price_3,
    priceChangeRate: data.price_change_rate || 0,
    lastTransactionDate: data.last_transaction_date,
    transactionCount: data.transaction_count,
    updatedAt: data.updated_at,
  };
}
