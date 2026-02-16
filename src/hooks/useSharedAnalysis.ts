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

import { useQuery, useQueryClient, keepPreviousData, type QueryClient } from '@tanstack/react-query';
import {
  loadMorningBriefing,
  computePortfolioHash,
  getTodayPrescription,
  savePrescription,
  savePanicScoreToSnapshot,
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
  fetchBitcoinLivePrice,
  type BitcoinIntelligenceResult,
  type BitcoinLivePrice,
} from '../services/bitcoinIntelligence';
import {
  getQuickMarketSentiment,
  getTodayStockReports,
  getTodayGuruInsights,
  getTodayRateCycleEvidence,
  type StockQuantReport,
  type GuruInsightsData,
  type RateCycleEvidence,
} from '../services/centralKitchen';
import supabase, { getCurrentUser } from '../services/supabase';
import { validateAndCorrectRiskAnalysis, validatePortfolioActions } from '../utils/aiResponseValidator';

// 쿼리 키 (외부에서 invalidate 할 때 사용)
export const AI_ANALYSIS_KEY = ['shared-ai-analysis'];
export const MARKET_DATA_KEY = ['shared-market-data'];
export const BITCOIN_KEY = ['shared-bitcoin'];
export const BITCOIN_PRICE_KEY = ['shared-bitcoin-price'];
export const GURU_INSIGHTS_KEY = ['shared-guru-insights'];
export const RATE_CYCLE_EVIDENCE_KEY = ['shared-rate-cycle-evidence'];

// ============================================================================
// AI 분석 결과 (진단 + 처방전 공유)
// ============================================================================

interface AIAnalysisData {
  morningBriefing: MorningBriefingResult | null;
  riskAnalysis: RiskAnalysisResult | null;
  /** Central Kitchen 결과 소스 ('central-kitchen' | 'live-gemini') */
  source: string;
}

/**
 * Morning Briefing + Risk Analysis (하루 한 번 처방전)
 *
 * [흐름]
 * 1. 현재 유저 ID + 포트폴리오 해시 계산
 * 2. DB에서 오늘 캐시 조회 (같은 날 + 같은 해시)
 * 3-A. 캐시 히트 → 즉시 반환 (< 100ms, 새로고침해도 동일)
 * 3-B. 캐시 미스 → Gemini 병렬 호출 → DB 저장 → 반환
 */
export async function fetchAIAnalysis(
  portfolioAssets: PortfolioAsset[],
  queryClient: QueryClient
): Promise<AIAnalysisData> {
  if (portfolioAssets.length === 0) {
    return { morningBriefing: null, riskAnalysis: null, source: '' };
  }

  // 1) 유저 ID 가져오기
  const user = await getCurrentUser();
  const userId = user?.id;

  // 2) 포트폴리오 해시 계산
  const portfolioHash = computePortfolioHash(portfolioAssets);

  // 3) DB 캐시 조회 (유저 로그인 상태일 때만)
  if (userId) {
    try {
      const cached = await getTodayPrescription(userId, portfolioHash);
      if (cached) {
        // [이승건: 캐시 검증 강화] morningBriefing이 null이면 무효
        if (!cached.morningBriefing || !cached.morningBriefing.macroSummary) {
          if (__DEV__) console.log('[처방전 캐시] NULL 캐시 감지 → 라이브 재생성');
        } else {
          // 캐시된 morningBriefing이 에러 폴백 데이터인지 검증
          const cachedTitle = cached.morningBriefing?.macroSummary?.title || '';
          const cachedCfoMessage = cached.morningBriefing?.cfoWeather?.message || '';
          const isErrorFallback =
            cachedTitle === '시장 분석 중...' ||
            cachedTitle === '분석 중' ||
            cachedTitle === '오늘의 시장 분석' ||
            cachedTitle === '시장 분석 업데이트 중' ||
            cachedCfoMessage.includes('업데이트됩니다') ||
            cachedCfoMessage.includes('데이터 수집 중');

          if (!isErrorFallback) {
            // 정상 캐시 히트 → 즉시 반환
            if (__DEV__) console.log('[처방전 캐시] ✅ 유효한 캐시 사용:', cachedTitle);
            return {
              morningBriefing: cached.morningBriefing,
              riskAnalysis: cached.riskAnalysis,
              source: cached.source,
            };
          }
          // 에러 폴백 캐시 → 무시하고 라이브 재생성
          if (__DEV__) console.log('[처방전 캐시] 에러 폴백 캐시 감지 → 라이브 재생성');
        }
      }
    } catch (err) {
      console.warn('[처방전 캐시] 조회 실패, 라이브 진행:', err);
    }
  }

  // 4) 캐시 미스 → Gemini 병렬 호출 (기존 로직 유지)
  const [kitchenResult, riskResult] = await Promise.all([
    loadMorningBriefing(portfolioAssets, { includeRealEstate: false })
      .catch((err) => {
        console.warn('[공유분석] Morning Briefing 실패:', err);
        return null;
      }),
    analyzePortfolioRisk(portfolioAssets)
      .catch((err) => {
        console.warn('[공유분석] Risk Analysis 실패:', err);
        return null;
      }),
  ]);

  // 4-B) AI 응답 검증 및 보정 (감사 부서 역할)
  let validatedRisk = riskResult;
  if (riskResult) {
    const clientTotal = portfolioAssets.reduce((sum, a) => sum + (a.currentPrice * a.quantity), 0);
    const { corrected, validation } = validateAndCorrectRiskAnalysis(riskResult, clientTotal);
    if (validation.warnings.length > 0) {
      console.warn('[AI검증] 보정 항목:', validation.warnings);
    }
    validatedRisk = corrected;
  }

  // 4-C) 포트폴리오 액션 검증 (중복/무효 제거)
  let validatedBriefing = kitchenResult?.morningBriefing ?? null;
  if (validatedBriefing?.portfolioActions) {
    validatedBriefing = {
      ...validatedBriefing,
      portfolioActions: validatePortfolioActions(validatedBriefing.portfolioActions),
    };
  }

  const result: AIAnalysisData = {
    morningBriefing: validatedBriefing,
    riskAnalysis: validatedRisk,
    source: kitchenResult?.source ?? 'failed',
  };

  // [이승건: 최종 디버그] 반환값 확인
  if (__DEV__) {
    console.log('[fetchAIAnalysis 반환]', {
      hasBriefing: !!result.morningBriefing,
      hasTitle: !!result.morningBriefing?.macroSummary?.title,
      title: result.morningBriefing?.macroSummary?.title,
      source: result.source,
    });
  }

  // 5) 결과를 DB에 저장 (안정적인 3단 안전장치)
  if (userId && (result.morningBriefing || result.riskAnalysis)) {
    try {
      // 5-1) DB 저장 완료까지 대기 (타이밍 이슈 방지)
      await savePrescription(
        userId,
        portfolioHash,
        result.morningBriefing,
        result.riskAnalysis,
        result.source
      );

      // 5-2) queryClient 캐시도 즉시 업데이트 (다음 로드 0ms)
      const queryKey = [...AI_ANALYSIS_KEY, portfolioHash];
      queryClient.setQueryData(queryKey, result);

      if (__DEV__) {
        console.log('[처방전 저장] ✅ DB + 캐시 동기화 완료');
      }
    } catch (err) {
      console.warn('[처방전 저장] ⚠️ 실패 (UI는 정상 동작):', err);
    }
  }

  // 6) Panic Shield 점수를 오늘 스냅샷에 저장 (백그라운드, fire-and-forget)
  // 캐시 히트 경로에서는 호출 안 함 (위에서 이미 return됨)
  if (riskResult?.panicShieldIndex != null) {
    savePanicScoreToSnapshot(riskResult.panicShieldIndex)
      .catch(err => console.warn('[공유분석] Panic Score 저장 실패:', err));
  }

  return result;
}

/**
 * AI 분석 공유 훅 (진단 + 처방전 탭에서 사용)
 * @param portfolioAssets - useSharedPortfolio().portfolioAssets
 */
export function useSharedAnalysis(portfolioAssets: PortfolioAsset[]) {
  const queryClient = useQueryClient();
  const hasAssets = portfolioAssets.length > 0;

  // 포트폴리오 해시 계산 (자산 내용이 바뀌면 캐시 무효화)
  const portfolioHash = hasAssets ? computePortfolioHash(portfolioAssets) : '';

  const query = useQuery({
    queryKey: [...AI_ANALYSIS_KEY, portfolioHash],
    queryFn: () => fetchAIAnalysis(portfolioAssets, queryClient),
    enabled: hasAssets,
    staleTime: 0,                      // 항상 최신 데이터 조회
    gcTime: 1000 * 60 * 15,
    retry: 1,
    refetchOnMount: true,              // [이승건: 마운트 시 항상 새로고침]
    refetchOnWindowFocus: false,       // 포커스 시 재조회 방지
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
    retry: 1,                    // 홈 탭 시장 데이터 — 1회 재시도
    retryDelay: 2000,
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
// BTC 실시간 가격 (30초마다 갱신 — "시세 전광판")
// 확신 점수(5분 캐시)와 별도로 가격만 자주 업데이트
// ============================================================================

export function useBitcoinPrice() {
  return useQuery({
    queryKey: BITCOIN_PRICE_KEY,
    queryFn: () => fetchBitcoinLivePrice(),
    staleTime: 1000 * 30,        // 30초: 가격은 자주 갱신
    gcTime: 1000 * 60 * 5,       // 5분: 가비지 컬렉션
    refetchInterval: 1000 * 30,  // 30초마다 자동 재조회
    retry: false,
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

// ============================================================================
// 금리 사이클 증거 (KostolanyEggCard 2차 확장에서 사용)
// Lazy loading: 카드 확장(enabled=true) 시에만 쿼리 실행
// ============================================================================

/**
 * 금리 사이클 판단 근거 훅
 * 카드가 확장될 때만 DB 조회 (< 50ms)
 * @param enabled - 카드 2차 확장 여부 (true일 때만 쿼리 실행)
 */
export function useRateCycleEvidence(enabled: boolean) {
  return useQuery({
    queryKey: RATE_CYCLE_EVIDENCE_KEY,
    queryFn: () => getTodayRateCycleEvidence(),
    enabled,                       // lazy loading: 확장 시에만 실행
    staleTime: 1000 * 60 * 5,     // 5분
    gcTime: 1000 * 60 * 15,       // 15분
    retry: 1,
  });
}
