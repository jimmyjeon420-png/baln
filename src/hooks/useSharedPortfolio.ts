/**
 * useSharedPortfolio - 전 탭 공유 포트폴리오 데이터 훅
 *
 * [문제 해결]
 * 기존: 홈/진단/처방전 3개 탭이 각각 supabase.from('portfolios')를 독립 호출
 *       → 탭 전환마다 네트워크 왕복 + Gemini API 중복 호출 (6~20초 지연)
 * 개선: TanStack Query 캐시 1곳에서 관리
 *       → 3개 탭이 같은 데이터를 공유 (탭 전환 시 0ms)
 *
 * [캐시 전략]
 * - staleTime: 5분 → 탭 전환 시 재요청 안 함 (캐시 우선)
 * - gcTime: 30분 → 이 기간 내 캐시를 fallback으로 사용
 * - networkMode: offlineFirst → 오프라인 시 캐시 데이터 표시
 * - Supabase 쿼리 타임아웃: 10초 (무한 로딩 방지)
 * - Pull-to-refresh 시에만 강제 갱신
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import supabase from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Asset, AssetType } from '../types/asset';
import { transformDbRowToAsset } from '../utils/assetTransform';
import { determineTier, syncUserProfileTier } from './useGatherings';
import type { UserTier } from '../types/database';
import type { PortfolioAsset } from '../services/gemini';

// 쿼리 키 (외부에서 invalidate 할 때 사용)
export const SHARED_PORTFOLIO_KEY = ['shared-portfolio'];

interface SharedPortfolioData {
  /** Asset 타입 배열 (홈 탭용, 기존 transformDbRowToAsset 사용) */
  assets: Asset[];
  /** PortfolioAsset 배열 (진단/처방전 탭의 Gemini 호출용) */
  portfolioAssets: PortfolioAsset[];
  /** 총 자산 (KRW) */
  totalAssets: number;
  /** 자산 기반 티어 */
  userTier: UserTier;
  /** 유동 자산 티커 목록 (Central Kitchen 조회용) */
  liquidTickers: string[];
  /** 부동산 자산 (RE_ 티커 필터링) */
  realEstateAssets: Asset[];
  /** 부동산 총 자산 (KRW) */
  totalRealEstate: number;
}

/** 빈 포트폴리오 기본값 (타임아웃·에러·빈 데이터 시 공통 반환) */
const EMPTY_PORTFOLIO: SharedPortfolioData = {
  assets: [],
  portfolioAssets: [],
  totalAssets: 0,
  userTier: 'SILVER',
  liquidTickers: [],
  realEstateAssets: [],
  totalRealEstate: 0,
};

/** Supabase 쿼리에 타임아웃을 감싸는 헬퍼 (기본 10초) */
function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = 10000,
  label: string = 'query',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.warn(`[useSharedPortfolio] ${label} ${ms}ms 타임아웃`);
      reject(new Error(`${label} timeout after ${ms}ms`));
    }, ms);

    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err)   => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Supabase에서 포트폴리오 조회 + 두 가지 형식으로 변환 */
async function fetchSharedPortfolio(
  userId: string,
  options?: { signal?: AbortSignal },
): Promise<SharedPortfolioData> {
  // AbortController 시그널이 이미 취소되었으면 즉시 빈 데이터 반환
  if (options?.signal?.aborted) {
    return EMPTY_PORTFOLIO;
  }

  // 10초 타임아웃 — 서버 응답 없으면 에러로 처리 (React Query retry가 1회 재시도)
  let data: any[] | null = null;
  let error: any = null;

  try {
    const result = await withTimeout(
      supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .order('current_value', { ascending: false }),
      10000,
      'portfolios query',
    );
    data = result.data;
    error = result.error;
  } catch (timeoutErr) {
    console.warn('[useSharedPortfolio] Supabase 쿼리 실패:', timeoutErr);
    // 타임아웃이나 네트워크 에러 시 — 에러를 throw해서 React Query가
    // 캐시된 데이터(placeholderData)를 유지하면서 retry 로직을 작동시킴
    throw timeoutErr;
  }

  if (error) {
    console.warn('[useSharedPortfolio] Supabase 에러:', error.message || error);
    throw new Error(error.message || 'Supabase query failed');
  }

  if (!data || data.length === 0) {
    return EMPTY_PORTFOLIO;
  }

  // 홈 탭용 Asset 배열
  const assets = data.map(transformDbRowToAsset);

  // 부동산 자산 필터링 (RE_ 티커) — ticker undefined 방어
  const realEstateAssets = assets.filter(a => a.ticker && a.ticker.startsWith('RE_'));
  const totalRealEstate = realEstateAssets.reduce((sum, a) => sum + (Number.isFinite(a.currentValue) ? a.currentValue : 0), 0);

  // 진단/처방전용 PortfolioAsset 배열 (부동산 제외 — Gemini에 전달하지 않음)
  const portfolioAssets: PortfolioAsset[] = data
    .filter((item: any) => !item.ticker || !item.ticker.startsWith('RE_'))
    .map((item: any) => {
    const qty = Number(item.quantity) || 0;
    const avgP = Number(item.avg_price) || 0;
    const curP = Number(item.current_price) || avgP || 0;
    const curV = Number(item.current_value);
    // currentValue: DB값 우선, NaN이면 quantity*currentPrice로 계산
    const computedValue = Number.isFinite(curV) && curV > 0
      ? curV
      : (qty > 0 && curP > 0 ? qty * curP : 0);
    return {
      ticker: item.ticker || 'UNKNOWN',
      name: item.name || '알 수 없는 자산',
      quantity: qty,
      avgPrice: avgP,
      currentPrice: curP,
      currentValue: computedValue,
    };
  });

  // 총 자산 계산 (getAssetValue와 동일한 로직 — 일관성 보장)
  // quantity * currentPrice가 둘 다 양수면 실시간 계산, 아니면 DB의 currentValue 사용
  const totalAssets = assets.reduce((sum, asset) => {
    const value = (asset.quantity != null && asset.quantity > 0 && asset.currentPrice != null && asset.currentPrice > 0)
      ? asset.quantity * asset.currentPrice
      : asset.currentValue;
    // NaN/Infinity 방어: 비정상 값은 0으로 처리
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const userTier = determineTier(totalAssets);

  // 유동 자산 티커 목록
  const liquidTickers = assets
    .filter(a => a.assetType === AssetType.LIQUID && a.ticker)
    .map(a => a.ticker!);

  // 프로필 티어 동기화 (백그라운드, 실패 무시)
  syncUserProfileTier(userId).catch(() => {});

  return { assets, portfolioAssets, totalAssets, userTier, liquidTickers, realEstateAssets, totalRealEstate };
}

// ============================================================================
// 훅
// ============================================================================

export function useSharedPortfolio() {
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();

  const query = useQuery({
    queryKey: [...SHARED_PORTFOLIO_KEY, user?.id],
    queryFn: ({ signal }) => fetchSharedPortfolio(user!.id, { signal }),
    // ★ 핵심 수정: Auth 세션이 준비된 후에만 쿼리 실행
    // 이전: 세션 없어도 즉시 실행 → 빈 데이터가 "성공"으로 캐시 → 30분간 유지
    // 이후: user 존재 + loading 완료 시에만 실행 → 만료 토큰 조기 실행 방지
    enabled: !loading && !!user,
    staleTime: 1000 * 60 * 5,        // 5분: 탭 전환 시 재요청 안 함 (캐시 우선)
    gcTime: 1000 * 60 * 30,          // 30분: 이 기간 내 캐시 데이터를 fallback으로 사용
    placeholderData: keepPreviousData, // 갱신 중에도 이전 데이터 유지 (로딩 방지)
    retry: 1,                         // 네트워크 실패 시 1회 재시도 (무한 로딩 방지)
    retryDelay: 2000,                 // 2초 후 재시도
    networkMode: 'offlineFirst',      // 오프라인 시 캐시 데이터 먼저 사용
  });

  /** Pull-to-refresh 시 호출 — 캐시 즉시 무효화 + 재조회 */
  const refresh = () => {
    return queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
  };

  return {
    ...query,
    refresh,
    // 편의 접근자 (undefined 방어)
    assets: query.data?.assets ?? [],
    portfolioAssets: query.data?.portfolioAssets ?? [],
    totalAssets: query.data?.totalAssets ?? 0,
    userTier: (query.data?.userTier ?? 'SILVER') as UserTier,
    liquidTickers: query.data?.liquidTickers ?? [],
    realEstateAssets: query.data?.realEstateAssets ?? [],
    totalRealEstate: query.data?.totalRealEstate ?? 0,
    hasAssets: (query.data?.totalAssets ?? 0) > 0,
  };
}
