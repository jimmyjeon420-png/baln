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

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import type { HeartAsset, HeartAssetWithSignal, HeartAssetType } from '../types/heartAsset';
import { useSharedPortfolio } from './useSharedPortfolio';
import {
  calculateHealthScore,
  type HealthScoreResult,
  type HealthGrade,
  type AssetCategory,
  DALIO_TARGET,
  BUFFETT_TARGET,
  CATHIE_WOOD_TARGET,
  DEFAULT_TARGET,
  getPhaseAdjustedTarget,
} from '../services/rebalanceScore';
import { useKostolalyPhase } from './useKostolalyPhase';
import { getTickerProfile } from '../data/tickerProfile';
import supabase, { getCurrentUser } from '../services/supabase';

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
 * HeartAsset의 ticker/type으로 자산 카테고리 간이 판단
 * (classifyAsset은 Asset 전체 타입 필요 → HeartAsset용 경량 버전)
 */
function getHeartAssetCategory(asset: HeartAsset): string {
  const ticker = (asset.ticker ?? '').toUpperCase();
  if (ticker === 'BTC') return 'bitcoin';
  if (asset.type === 'crypto') return 'altcoin';
  if (ticker.startsWith('CASH_')) return 'cash';
  // 주요 채권 ETF
  const BOND_QUICK = new Set(['AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'GOVT', 'BNDX']);
  if (BOND_QUICK.has(ticker)) return 'bond';
  // 주요 금 ETF
  const GOLD_QUICK = new Set(['GLD', 'IAU', 'GLDM', 'SGOL', 'SLV', 'BAR']);
  if (GOLD_QUICK.has(ticker)) return 'gold';
  // 현금 관련
  const CASH_QUICK = new Set(['USDT', 'USDC', 'DAI', 'BUSD']);
  if (CASH_QUICK.has(ticker)) return 'cash';
  // 주식/ETF → large_cap
  return 'large_cap';
}

/**
 * 하트 자산에 신호등 매핑
 *
 * @param heartAssets - 하트 자산 배열
 * @param healthResult - 건강 점수 결과
 * @param portfolioAssets - 포트폴리오 자산 배열
 * @param totalAssets - 총 자산 금액
 * @param guruStyle - 선택 구루 스타일 (선택적)
 * @param kostolalyPhase - 현재 코스톨라니 국면 (선택적)
 * @returns HeartAssetWithSignal[]
 *
 * [기본 매핑 규칙]
 * - 포트폴리오에 없는 자산: green (데이터 부족)
 * - 전체 점수 75+: 모두 green
 * - 전체 점수 50-74: 비중 30%+ 자산 yellow, 나머지 green
 * - 전체 점수 49-: 비중 30%+ 자산 red, 15%+ yellow, 나머지 green
 *
 * [코스톨라니 국면 오버라이드]
 * - D/C 국면: 주식·알트코인 경고 신호
 * - F/A 국면: 비트코인·가치주 기회 신호
 * - B 국면: 주식 전반 긍정
 * - E 국면: 채권·금·현금 선호
 */
function mapSignals(
  heartAssets: HeartAsset[],
  healthResult: HealthScoreResult | null,
  portfolioAssets: any[],
  totalAssets: number,
  guruStyle?: string,
  kostolalyPhase?: string | null,
): HeartAssetWithSignal[] {
  // 데이터 없으면 모두 green (기본)
  if (!healthResult || portfolioAssets.length === 0 || totalAssets === 0) {
    return heartAssets.map(a => ({ ...a, signal: 'green' as const }));
  }

  const totalScore = healthResult.totalScore;

  // 1단계: 기본 건강 점수 기반 신호 계산
  const result: HeartAssetWithSignal[] = heartAssets.map(asset => {
    // 포트폴리오에서 해당 자산 찾기
    const portfolioAsset = portfolioAssets.find(
      p => p.ticker === asset.ticker || p.name === asset.name
    );

    // 포트폴리오에 없거나 currentValue 없으면 green
    if (!portfolioAsset || portfolioAsset.currentValue == null) {
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

  // 2단계: 코스톨라니 국면별 신호 오버라이드
  if (kostolalyPhase) {
    for (const item of result) {
      const cat = getHeartAssetCategory(item);

      if (kostolalyPhase === 'D' || kostolalyPhase === 'C') {
        // D(하락초기)/C(과열): 주식·알트코인 경고
        if (cat === 'large_cap' || cat === 'altcoin') {
          item.signal = kostolalyPhase === 'D' ? 'red' : 'yellow';
        }
        if (cat === 'cash' || cat === 'bond') {
          item.signal = 'green';
        }
      } else if (kostolalyPhase === 'F' || kostolalyPhase === 'A') {
        // F(극비관)/A(바닥): 비트코인·가치주 기회
        if (cat === 'bitcoin') {
          item.signal = 'green';
        }
        if (cat === 'large_cap') {
          // 가치주·배당주 → green, 나머지 유지
          const profile = getTickerProfile(item.ticker ?? '');
          if (profile?.style === 'value' || profile?.style === 'dividend') {
            item.signal = 'green';
          }
        }
      } else if (kostolalyPhase === 'B') {
        // B(상승): 주식 전반 긍정
        if (cat === 'large_cap') {
          item.signal = 'green';
        }
      } else if (kostolalyPhase === 'E') {
        // E(침체/패닉): 채권·금·현금 선호, 주식 경고 완화
        if (cat === 'bond' || cat === 'gold' || cat === 'cash') {
          item.signal = 'green';
        }
        if (cat === 'large_cap' && item.signal === 'red') {
          item.signal = 'yellow'; // red → yellow로 완화
        }
      }
    }
  }

  return result;
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

  // ── 구루 철학 타겟 + 스타일 (오늘 탭 건강 점수 연동) ──
  const [guruTarget, setGuruTarget] = useState<Record<AssetCategory, number>>(DEFAULT_TARGET);
  const [guruStyle, setGuruStyle] = useState<string>('dalio');
  const [isCustomTarget, setIsCustomTarget] = useState(false);

  // 코스톨라니 국면 (Supabase에서 실시간 조회)
  const { phase: kostolalyPhase } = useKostolalyPhase();

  // 탭 포커스 시 AsyncStorage에서 저장된 구루 스타일 읽기
  useFocusEffect(useCallback(() => {
    Promise.all([
      AsyncStorage.getItem('@baln:guru_style'),
      AsyncStorage.getItem('@investment_philosophy'),
      AsyncStorage.getItem('@target_allocation'),
    ]).then(([storedGuruStyle, storedPhil, storedCustomTarget]) => {
      const normalizedPhil = storedPhil === 'consensus' ? 'dalio' : storedPhil;
      const validGuruStyles = ['dalio', 'buffett', 'cathie_wood'];
      const targetMap: Partial<Record<string, Record<AssetCategory, number>>> = {
        dalio: DALIO_TARGET,
        buffett: BUFFETT_TARGET,
        cathie_wood: CATHIE_WOOD_TARGET,
      };

      // 직접설정 모드: 저장된 커스텀 배분을 우선 사용 (분석 탭과 동일 기준)
      if (normalizedPhil === 'custom') {
        let parsedTarget: Record<AssetCategory, number> | null = null;
        if (storedCustomTarget) {
          try {
            parsedTarget = JSON.parse(storedCustomTarget) as Record<AssetCategory, number>;
          } catch {
            parsedTarget = null;
          }
        }
        setGuruTarget(parsedTarget ?? DEFAULT_TARGET);
        setIsCustomTarget(true);
        setGuruStyle(
          storedGuruStyle && validGuruStyles.includes(storedGuruStyle)
            ? storedGuruStyle
            : 'dalio',
        );
        return;
      }

      const phil = storedGuruStyle && validGuruStyles.includes(storedGuruStyle)
        ? storedGuruStyle
        : normalizedPhil && validGuruStyles.includes(normalizedPhil)
          ? normalizedPhil
          : 'dalio';

      setGuruTarget(targetMap[phil] ?? DEFAULT_TARGET);
      setGuruStyle(phil);
      setIsCustomTarget(false);
    }).catch(() => {
      setGuruTarget(DEFAULT_TARGET);
      setGuruStyle('dalio');
      setIsCustomTarget(false);
    });
  }, []));

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

  const heartAssetsFromStorage = query.data || [];

  // ★ 포트폴리오 자산을 HeartAsset 형식으로 변환하여 병합
  // "자산 추가하기"로 등록한 자산도 자동으로 하트 목록에 포함
  const heartAssets = React.useMemo(() => {
    const merged = [...heartAssetsFromStorage];

    for (const asset of assets) {
      // 부동산 제외, 티커가 있는 자산만
      if (!asset.ticker || asset.ticker.startsWith('RE_')) continue;
      // 이미 하트 목록에 있으면 스킵
      if (merged.some(h => h.ticker === asset.ticker)) continue;

      const upper = asset.ticker.toUpperCase();
      const cryptoKeywords = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK', 'BNB', 'MATIC'];
      let type: HeartAssetType = 'stock';
      if (cryptoKeywords.some(kw => upper.includes(kw))) type = 'crypto';

      merged.push({
        name: asset.name,
        ticker: asset.ticker,
        type,
        heartedAt: new Date(asset.createdAt).toISOString(),
      });
    }

    return merged;
  }, [heartAssetsFromStorage, assets]);

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

      // ★ 포트폴리오 DB에도 추가 (초기 수량 0, 실패해도 하트 저장은 유지)
      // upsert + onConflict로 중복 삽입 방지 (같은 ticker를 두 번 하트하면 무시)
      try {
        const user = await getCurrentUser();
        if (user) {
          await supabase.from('portfolios').upsert({
            user_id: user.id,
            ticker: asset.ticker,
            quantity: 0,
            asset_type: asset.type === 'stock' ? 'stock' :
                        asset.type === 'crypto' ? 'crypto' : 'other',
            name: asset.name,
            current_value: 0,
            target_allocation: 0,
          }, {
            onConflict: 'user_id,name',
            ignoreDuplicates: true, // 이미 존재하면 기존 데이터 유지
          });
        }
      } catch (err) {
        console.warn('[HeartAssets] 포트폴리오 DB 추가 실패 (하트 저장은 유지):', err);
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

      // ★ 포트폴리오 DB에서도 삭제 (실패해도 하트 제거는 유지)
      try {
        const user = await getCurrentUser();
        if (user) {
          await supabase.from('portfolios')
            .delete()
            .eq('user_id', user.id)
            .eq('ticker', ticker);
        }
      } catch (err) {
        console.warn('[HeartAssets] 포트폴리오 DB 삭제 실패 (하트 제거는 유지):', err);
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

  const effectiveTarget = isCustomTarget
    ? guruTarget
    : getPhaseAdjustedTarget(guruTarget, kostolalyPhase);

  if (assets.length > 0 && totalAssets > 0) {
    healthResult = calculateHealthScore(assets, totalAssets, effectiveTarget, {
      guruStyle,
      kostolalyPhase: kostolalyPhase ?? undefined,
    });
    portfolioHealthScore = healthResult.totalScore;
    portfolioGrade = healthResult.grade;
    portfolioGradeLabel = getGradeLabel(healthResult.grade);
  }

  // 신호등 매핑 (코스톨라니 국면 오버라이드 포함)
  const heartAssetsWithSignal = mapSignals(
    heartAssets,
    healthResult,
    portfolioAssets,
    totalAssets,
    guruStyle,
    kostolalyPhase,
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
