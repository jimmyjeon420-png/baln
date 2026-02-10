/**
 * useHeartAssets.ts - 하트 자산 관리 훅
 *
 * 역할: "관심 자산 관리 + 건강 신호등 부서"
 * - AsyncStorage에서 하트 자산 CRUD
 * - 하트 추가/제거/토글 mutation
 * - 포트폴리오 건강 점수 계산 (useSharedPortfolio + rebalanceScore 연동)
 * - 개별 자산 신호등 매핑
 *
 * Anti-Toss 원칙:
 * - Heart/Like: 가격/수량 없이 ❤️만으로 자산 등록
 * - 보험 BM: 건강 점수는 무료, 상세 분석은 프리미엄
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HeartAsset, HeartAssetWithSignal } from '../types/heartAsset';
import { useSharedPortfolio } from './useSharedPortfolio';
import {
  calculateHealthScore,
  type HealthScoreResult,
  type HealthGrade,
} from '../services/rebalanceScore';
import supabase from '../services/supabase';

// ============================================================================
// 상수
// ============================================================================

const HEART_ASSETS_KEY = '@baln:heart_assets';
const HEART_ASSETS_QUERY_KEY = ['heart-assets'];

// ============================================================================
// 훅 반환 타입
// ============================================================================

interface UseHeartAssetsReturn {
  // 하트 자산 목록
  heartAssets: HeartAsset[];
  heartAssetsWithSignal: HeartAssetWithSignal[];
  hasAssets: boolean;
  isLoading: boolean;

  // CRUD
  addHeart: (asset: Omit<HeartAsset, 'heartedAt'>) => void;
  removeHeart: (ticker: string) => void;
  removeHeartAsset: (ticker: string) => void; // C5 호환 alias
  updateHeartAsset: (params: { ticker: string; newName: string }) => void;
  toggleHeart: (asset: Omit<HeartAsset, 'heartedAt'>) => void;
  isHearted: (ticker: string) => boolean;

  // 포트폴리오 건강 점수
  portfolioHealthScore: number | null;
  portfolioGrade: HealthGrade | null;
  portfolioGradeLabel: string | null;

  refresh: () => void;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 등급 → 한국어 라벨 변환
 */
function getGradeLabel(grade: HealthGrade): string {
  const labels: Record<HealthGrade, string> = {
    S: '최적',
    A: '양호',
    B: '보통',
    C: '주의',
    D: '개선필요',
  };
  return labels[grade] || '미측정';
}

/**
 * 하트 자산에 신호등 매핑
 *
 * @param heartAssets - 하트 자산 배열
 * @param healthResult - 건강 점수 결과
 * @param portfolioAssets - 포트폴리오 자산 배열
 * @param totalAssets - 총 자산 금액
 * @returns HeartAssetWithSignal[]
 *
 * [매핑 규칙]
 * - 포트폴리오에 없는 자산: green (데이터 부족)
 * - 전체 점수 75+: 모두 green
 * - 전체 점수 50-74: 비중 30%+ 자산 yellow, 나머지 green
 * - 전체 점수 49-: 비중 30%+ 자산 red, 15%+ yellow, 나머지 green
 */
function mapSignals(
  heartAssets: HeartAsset[],
  healthResult: HealthScoreResult | null,
  portfolioAssets: any[],
  totalAssets: number
): HeartAssetWithSignal[] {
  // 데이터 없으면 모두 green (기본)
  if (!healthResult || portfolioAssets.length === 0 || totalAssets === 0) {
    return heartAssets.map(a => ({ ...a, signal: 'green' as const }));
  }

  const totalScore = healthResult.totalScore;

  return heartAssets.map(asset => {
    // 포트폴리오에서 해당 자산 찾기
    const portfolioAsset = portfolioAssets.find(
      p => p.ticker === asset.ticker || p.name === asset.name
    );

    // 포트폴리오에 없으면 green
    if (!portfolioAsset) {
      return { ...asset, signal: 'green' as const };
    }

    // 비중 계산
    const weight = portfolioAsset.currentValue / totalAssets;

    // 신호등 매핑
    if (totalScore >= 75) {
      return { ...asset, signal: 'green' as const };
    } else if (totalScore >= 50) {
      return { ...asset, signal: weight > 0.3 ? 'yellow' as const : 'green' as const };
    } else {
      // totalScore < 50
      if (weight > 0.3) {
        return { ...asset, signal: 'red' as const };
      } else if (weight > 0.15) {
        return { ...asset, signal: 'yellow' as const };
      } else {
        return { ...asset, signal: 'green' as const };
      }
    }
  });
}

// ============================================================================
// 메인 훅
// ============================================================================

/**
 * 하트 자산 관리 훅
 *
 * [사용처]
 * - HealthSignalCard: 건강 점수 + 개별 자산 신호등
 * - 온보딩: 하트 추가/제거
 * - 설정: 관심 자산 관리
 *
 * [캐시 전략]
 * - staleTime: Infinity (AsyncStorage 데이터, 수동 invalidate만)
 * - mutation 성공 시 자동 invalidate
 */
export function useHeartAssets(): UseHeartAssetsReturn {
  const queryClient = useQueryClient();

  // 포트폴리오 데이터 가져오기 (건강 점수 계산용)
  const { assets, portfolioAssets, totalAssets } = useSharedPortfolio();

  // 하트 자산 조회 (AsyncStorage)
  const query = useQuery({
    queryKey: HEART_ASSETS_QUERY_KEY,
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(HEART_ASSETS_KEY);
      if (!stored) return [];
      return JSON.parse(stored) as HeartAsset[];
    },
    staleTime: Infinity, // AsyncStorage 데이터는 변경 시에만 갱신
  });

  const heartAssets = query.data || [];

  // 하트 추가 mutation
  const addMutation = useMutation({
    mutationFn: async (asset: Omit<HeartAsset, 'heartedAt'>) => {
      const current = query.data || [];
      // 중복 체크
      if (current.some(a => a.ticker === asset.ticker)) {
        return current; // 이미 있으면 그대로
      }
      const newAsset: HeartAsset = {
        ...asset,
        heartedAt: new Date().toISOString(),
      };
      const updated = [...current, newAsset];
      await AsyncStorage.setItem(HEART_ASSETS_KEY, JSON.stringify(updated));

      // ★ 포트폴리오 DB에도 추가 (초기 수량 0)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('portfolios').insert({
          user_id: user.id,
          ticker: asset.ticker,
          quantity: 0,
          asset_type: asset.type === 'stock' ? 'stock' :
                      asset.type === 'crypto' ? 'crypto' : 'other',
          name: asset.name,
        });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEART_ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['shared-portfolio'] }); // 포트폴리오 캐시 무효화
    },
  });

  // 하트 제거 mutation
  const removeMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const current = query.data || [];
      const updated = current.filter(a => a.ticker !== ticker);
      await AsyncStorage.setItem(HEART_ASSETS_KEY, JSON.stringify(updated));

      // ★ 포트폴리오 DB에서도 삭제
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('portfolios')
          .delete()
          .eq('user_id', user.id)
          .eq('ticker', ticker);
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEART_ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['shared-portfolio'] }); // 포트폴리오 캐시 무효화
    },
  });

  // 하트 자산 이름 변경 mutation
  const updateMutation = useMutation({
    mutationFn: async ({ ticker, newName }: { ticker: string; newName: string }) => {
      const current = query.data || [];
      const updated = current.map(a =>
        a.ticker === ticker ? { ...a, name: newName } : a
      );
      await AsyncStorage.setItem(HEART_ASSETS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEART_ASSETS_QUERY_KEY });
    },
  });

  // 하트 토글 (추가/제거)
  const toggleHeart = (asset: Omit<HeartAsset, 'heartedAt'>) => {
    const isHearted = heartAssets.some(a => a.ticker === asset.ticker);
    if (isHearted) {
      removeMutation.mutate(asset.ticker);
    } else {
      addMutation.mutate(asset);
    }
  };

  // 하트 여부 확인
  const isHearted = (ticker: string): boolean => {
    return heartAssets.some(a => a.ticker === ticker);
  };

  // 포트폴리오 건강 점수 계산
  let portfolioHealthScore: number | null = null;
  let portfolioGrade: HealthGrade | null = null;
  let portfolioGradeLabel: string | null = null;
  let healthResult: HealthScoreResult | null = null;

  if (assets.length > 0 && totalAssets > 0) {
    healthResult = calculateHealthScore(assets, totalAssets);
    portfolioHealthScore = healthResult.totalScore;
    portfolioGrade = healthResult.grade;
    portfolioGradeLabel = getGradeLabel(healthResult.grade);
  }

  // 신호등 매핑
  const heartAssetsWithSignal = mapSignals(
    heartAssets,
    healthResult,
    portfolioAssets,
    totalAssets
  );

  // 새로고침
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: HEART_ASSETS_QUERY_KEY });
  };

  return {
    heartAssets,
    heartAssetsWithSignal,
    hasAssets: heartAssets.length > 0 || assets.length > 0,
    isLoading: query.isLoading,
    addHeart: addMutation.mutate,
    removeHeart: removeMutation.mutate,
    removeHeartAsset: removeMutation.mutate, // C5 호환 alias
    updateHeartAsset: updateMutation.mutate,
    toggleHeart,
    isHearted,
    portfolioHealthScore,
    portfolioGrade,
    portfolioGradeLabel,
    refresh,
  };
}
