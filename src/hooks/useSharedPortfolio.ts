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
 * - staleTime: 3분 → 탭 전환 시 재요청 안 함
 * - Pull-to-refresh 시에만 강제 갱신
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
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

/** Supabase에서 포트폴리오 조회 + 두 가지 형식으로 변환 */
async function fetchSharedPortfolio(): Promise<SharedPortfolioData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { assets: [], portfolioAssets: [], totalAssets: 0, userTier: 'SILVER', liquidTickers: [], realEstateAssets: [], totalRealEstate: 0 };
  }

  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('current_value', { ascending: false });

  if (error || !data || data.length === 0) {
    return { assets: [], portfolioAssets: [], totalAssets: 0, userTier: 'SILVER', liquidTickers: [], realEstateAssets: [], totalRealEstate: 0 };
  }

  // 홈 탭용 Asset 배열
  const assets = data.map(transformDbRowToAsset);

  // 부동산 자산 필터링 (RE_ 티커)
  const realEstateAssets = assets.filter(a => a.ticker?.startsWith('RE_'));
  const totalRealEstate = realEstateAssets.reduce((sum, a) => sum + a.currentValue, 0);

  // 진단/처방전용 PortfolioAsset 배열 (부동산 제외 — Gemini에 전달하지 않음)
  const portfolioAssets: PortfolioAsset[] = data
    .filter((item: any) => !item.ticker?.startsWith('RE_'))
    .map((item: any) => ({
    ticker: item.ticker || 'UNKNOWN',
    name: item.name || '알 수 없는 자산',
    quantity: item.quantity || 0,
    avgPrice: item.avg_price || 0,
    currentPrice: item.current_price || item.avg_price || 0,
    currentValue: item.current_value || (item.quantity * (item.current_price || item.avg_price)) || 0,
  }));

  // 총 자산 계산
  const totalAssets = assets.reduce((sum, asset) => {
    if (asset.quantity && asset.currentPrice) {
      return sum + (asset.quantity * asset.currentPrice);
    }
    return sum + asset.currentValue;
  }, 0);

  const userTier = determineTier(totalAssets);

  // 유동 자산 티커 목록
  const liquidTickers = assets
    .filter(a => a.assetType === AssetType.LIQUID && a.ticker)
    .map(a => a.ticker!);

  // 프로필 티어 동기화 (백그라운드, 실패 무시)
  syncUserProfileTier(user.id).catch(() => {});

  return { assets, portfolioAssets, totalAssets, userTier, liquidTickers, realEstateAssets, totalRealEstate };
}

// ============================================================================
// 훅
// ============================================================================

export function useSharedPortfolio() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SHARED_PORTFOLIO_KEY,
    queryFn: fetchSharedPortfolio,
    staleTime: 1000 * 60 * 3,   // 3분: 탭 전환 시 재요청 안 함
    gcTime: 1000 * 60 * 10,     // 10분: 가비지 컬렉션
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
