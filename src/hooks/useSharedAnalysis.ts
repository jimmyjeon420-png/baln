/**
 * useSharedAnalysis - 전 탭 공유 AI 분석 결과 훅
 *
 * [문제 해결]
 * 기존: 진단 탭과 처방전 탭이 각각 Gemini API를 독립 호출
 *       → analyzePortfolioRisk (3-8초) + generateMorningBriefing (3-8초)
 *       → 각 탭 진입마다 6-16초 대기, 탭 전환 시 또 호출
 *
 * 개선:
 * 1) TanStack Query 캐시로 한 번 호출한 결과를 공유 (탭 전환 시 0ms)
 * 2) 직렬 → 병렬 실행 (Promise.all) → 최대 대기 시간 절반
 * 3) staleTime 5분 → 5분 내 재호출 없음
 *
 * [참고]
 * - Morning Briefing은 Central Kitchen 패턴 사용 (DB 우선 < 100ms)
 * - Risk Analysis는 유저별 맞춤이라 항상 라이브 Gemini
 * - Bitcoin Intelligence는 별도 비동기 (선택적)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  loadMorningBriefing,
  type CentralKitchenResult,
} from '../services/centralKitchen';
import {
  analyzePortfolioRisk,
  type PortfolioAsset,
  type RiskAnalysisResult,
  type MorningBriefingResult,
} from '../services/gemini';
import {
  loadBitcoinIntelligence,
  type BitcoinIntelligenceResult,
} from '../services/bitcoinIntelligence';
import {
  getQuickMarketSentiment,
  getTodayStockReports,
  getTodayGuruInsights,
  type StockQuantReport,
  type GuruInsightsData,
} from '../services/centralKitchen';

// 쿼리 키 (외부에서 invalidate 할 때 사용)
export const AI_ANALYSIS_KEY = ['shared-ai-analysis'];
export const MARKET_DATA_KEY = ['shared-market-data'];
export const BITCOIN_KEY = ['shared-bitcoin'];
export const GURU_INSIGHTS_KEY = ['shared-guru-insights'];

// ============================================================================
// AI 분석 결과 (진단 + 처방전 공유)
// ============================================================================

interface AIAnalysisData {
  morningBriefing: MorningBriefingResult | null;
  riskAnalysis: RiskAnalysisResult | null;
  /** Central Kitchen 결과 소스 ('central-kitchen' | 'live-gemini') */
  source: string;
}

/** Morning Briefing + Risk Analysis 병렬 실행 */
async function fetchAIAnalysis(
  portfolioAssets: PortfolioAsset[]
): Promise<AIAnalysisData> {
  if (portfolioAssets.length === 0) {
    return { morningBriefing: null, riskAnalysis: null, source: '' };
  }

  // [핵심 최적화] 두 API를 병렬 실행 → 기존 직렬 대비 시간 절반
  const [kitchenResult, riskResult] = await Promise.all([
    loadMorningBriefing(portfolioAssets, { includeRealEstate: false })
      .catch((err) => {
        console.error('[공유분석] Morning Briefing 실패:', err);
        return null;
      }),
    analyzePortfolioRisk(portfolioAssets)
      .catch((err) => {
        console.error('[공유분석] Risk Analysis 실패:', err);
        return null;
      }),
  ]);

  return {
    morningBriefing: kitchenResult?.morningBriefing ?? null,
    riskAnalysis: riskResult,
    source: kitchenResult?.source ?? 'failed',
  };
}

/**
 * AI 분석 공유 훅 (진단 + 처방전 탭에서 사용)
 * @param portfolioAssets - useSharedPortfolio().portfolioAssets
 */
export function useSharedAnalysis(portfolioAssets: PortfolioAsset[]) {
  const queryClient = useQueryClient();
  const hasAssets = portfolioAssets.length > 0;

  const query = useQuery({
    queryKey: [...AI_ANALYSIS_KEY, portfolioAssets.length],
    queryFn: () => fetchAIAnalysis(portfolioAssets),
    enabled: hasAssets,                // 자산 없으면 실행 안 함
    staleTime: 1000 * 60 * 5,         // 5분: Gemini 결과는 자주 바뀌지 않음
    gcTime: 1000 * 60 * 15,           // 15분: 가비지 컬렉션
    retry: 1,                          // 1회 재시도
  });

  const refresh = () => {
    return queryClient.invalidateQueries({ queryKey: AI_ANALYSIS_KEY });
  };

  return {
    ...query,
    refresh,
    morningBriefing: query.data?.morningBriefing ?? null,
    riskAnalysis: query.data?.riskAnalysis ?? null,
    source: query.data?.source ?? '',
  };
}

// ============================================================================
// 시장 데이터 (홈 탭 Central Kitchen 전용)
// ============================================================================

interface MarketData {
  sentiment: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    cfoWeather: { emoji: string; status: string; message: string } | null;
  } | null;
  stockReports: StockQuantReport[];
}

async function fetchMarketData(liquidTickers: string[]): Promise<MarketData> {
  const [sentimentResult, reportsResult] = await Promise.all([
    getQuickMarketSentiment().catch(() => null),
    liquidTickers.length > 0
      ? getTodayStockReports(liquidTickers).catch(() => [])
      : Promise.resolve([]),
  ]);

  return {
    sentiment: sentimentResult,
    stockReports: reportsResult,
  };
}

/**
 * 시장 데이터 공유 훅 (홈 탭에서 사용)
 * @param liquidTickers - useSharedPortfolio().liquidTickers
 */
export function useSharedMarketData(liquidTickers: string[]) {
  return useQuery({
    queryKey: [...MARKET_DATA_KEY, liquidTickers.length],
    queryFn: () => fetchMarketData(liquidTickers),
    enabled: liquidTickers.length > 0,
    staleTime: 1000 * 60 * 3,   // 3분
    gcTime: 1000 * 60 * 10,
  });
}

// ============================================================================
// 비트코인 Intelligence (처방전 탭에서 사용, 선택적)
// ============================================================================

export function useSharedBitcoin() {
  return useQuery({
    queryKey: BITCOIN_KEY,
    queryFn: () => loadBitcoinIntelligence().catch(() => null),
    staleTime: 1000 * 60 * 5,   // 5분
    gcTime: 1000 * 60 * 15,
    retry: false,                 // 실패해도 재시도 안 함 (선택적 데이터)
  });
}

// ============================================================================
// 투자 거장 인사이트 (글로벌 공유 데이터, DB only)
// ============================================================================

/**
 * 투자 거장 인사이트 훅
 * Central Kitchen 배치 데이터만 사용 (라이브 폴백 없음)
 */
export function useGuruInsights() {
  return useQuery({
    queryKey: GURU_INSIGHTS_KEY,
    queryFn: () => getTodayGuruInsights(),
    staleTime: 1000 * 60 * 5,   // 5분
    gcTime: 1000 * 60 * 15,     // 15분
    retry: 1,
  });
}
