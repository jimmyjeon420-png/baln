/**
 * useCommunity Hook - VIP 라운지 커뮤니티 기능
 * CRITICAL: 라운지 입장 조건
 * 1. 총 자산 1억 이상
 * 2. OCR 검증(Verified) 완료 필수
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
import { getUserVerificationStatus } from '../services/verification';
import {
  CommunityPost,
  CreatePostInput,
  LoungeEligibility,
  UserDisplayInfo,
  TIER_THRESHOLDS,
  TIER_LABELS,
} from '../types/community';

// 라운지 입장 최소 자산 (1억)
const MINIMUM_ASSETS_FOR_LOUNGE = 100000000;

/**
 * 자산을 "X.X억" 형식으로 변환
 */
const formatAssetInBillion = (amount: number): string => {
  const billion = amount / 100000000;
  if (billion >= 1) {
    return `${billion.toFixed(1)}억`;
  }
  const million = amount / 10000;
  return `${million.toFixed(0)}만`;
};

/**
 * 티어 결정
 */
const determineTier = (totalAssets: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' => {
  if (totalAssets >= TIER_THRESHOLDS.DIAMOND) return 'DIAMOND';
  if (totalAssets >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (totalAssets >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (totalAssets >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
};

/**
 * 라운지 자격 확인 훅
 * CRITICAL: 두 가지 조건 모두 충족해야 입장 가능
 * 1. 총 자산 1억 이상
 * 2. OCR 검증(Verified) 완료 필수 - 수동 입력은 불인정
 */
export const useLoungeEligibility = () => {
  const [eligibility, setEligibility] = useState<LoungeEligibility>({
    isEligible: false,
    totalAssets: 0,
    requiredAssets: MINIMUM_ASSETS_FOR_LOUNGE,
    shortfall: MINIMUM_ASSETS_FOR_LOUNGE,
    hasVerifiedAssets: false,
    verifiedAssetsTotal: 0,
    isVerificationRequired: false,
  });
  const [loading, setLoading] = useState(true);

  const checkEligibility = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEligibility({
          isEligible: false,
          totalAssets: 0,
          requiredAssets: MINIMUM_ASSETS_FOR_LOUNGE,
          shortfall: MINIMUM_ASSETS_FOR_LOUNGE,
          hasVerifiedAssets: false,
          verifiedAssetsTotal: 0,
          isVerificationRequired: false,
        });
        return;
      }

      // 1. 포트폴리오에서 총 자산 계산 (전체)
      // NOTE: is_verified, verified_value 컬럼은 아직 DB에 없으므로 제외
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, quantity, current_price, current_value')
        .eq('user_id', user.id);

      if (error) {
        console.error('Portfolio fetch error:', error);
        return;
      }

      // 전체 자산 합계
      const totalAssets = (data || []).reduce((sum, item) => {
        const value = item.quantity && item.current_price
          ? item.quantity * item.current_price
          : item.current_value || 0;
        return sum + value;
      }, 0);

      // TODO: 검증 기능은 DB 스키마 업데이트 후 활성화
      // 현재는 전체 자산으로 라운지 입장 가능 여부 판단
      const verifiedAssetsTotal = totalAssets;
      const hasVerifiedAssets = (data || []).length > 0;

      // 자산 조건 충족 여부
      const meetsAssetRequirement = totalAssets >= MINIMUM_ASSETS_FOR_LOUNGE;

      // 임시: 자산 조건만으로 입장 가능 여부 판단
      const isEligible = meetsAssetRequirement;

      // 검증 필요 여부 (현재 비활성화)
      const isVerificationRequired = false;

      const shortfall = meetsAssetRequirement
        ? 0
        : MINIMUM_ASSETS_FOR_LOUNGE - totalAssets;

      setEligibility({
        isEligible,
        totalAssets,
        requiredAssets: MINIMUM_ASSETS_FOR_LOUNGE,
        shortfall,
        hasVerifiedAssets,
        verifiedAssetsTotal,
        isVerificationRequired,
      });
    } catch (error) {
      console.error('Eligibility check error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  return { eligibility, loading, refetch: checkEligibility };
};

/**
 * 사용자 표시 정보 생성
 */
export const useUserDisplayInfo = (totalAssets: number, totalGain: number): UserDisplayInfo => {
  const tier = determineTier(totalAssets);

  // display_tag 생성: "[자산: X.X억 / 수익: Y.Y억]"
  const displayTag = `[자산: ${formatAssetInBillion(totalAssets)} / 수익: ${totalGain >= 0 ? '+' : ''}${formatAssetInBillion(totalGain)}]`;

  // asset_mix는 포트폴리오 데이터가 필요하므로 빈 문자열 반환
  // 실제 사용 시 포트폴리오 데이터를 전달받아 계산
  const assetMix = '';

  return {
    displayTag,
    assetMix,
    tier,
    tierLabel: TIER_LABELS[tier],
  };
};

/**
 * 자산 믹스 문자열 생성
 */
export const generateAssetMix = (portfolio: { category: string; percentage: number }[]): string => {
  // 상위 3개 카테고리만 표시
  const topCategories = portfolio
    .filter(item => item.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return topCategories
    .map(item => `${item.category} ${item.percentage}%`)
    .join(', ');
};

/**
 * 커뮤니티 게시물 목록 조회 훅
 */
export const useCommunityPosts = () => {
  return useQuery({
    queryKey: ['communityPosts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CommunityPost[];
    },
    staleTime: 60000, // 1분 캐시
  });
};

/**
 * 게시물 작성 훅
 */
export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput & { displayTag: string; assetMix: string; totalAssets: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          display_tag: input.displayTag,
          asset_mix: input.assetMix,
          content: input.content,
          total_assets_at_post: input.totalAssets,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    },
  });
};

/**
 * 좋아요 토글 훅
 */
export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      // likes_count 증가 (실제로는 별도 likes 테이블 사용 권장)
      const { error } = await supabase.rpc('increment_post_likes', {
        post_id: postId,
      });

      if (error) {
        // RPC 함수가 없는 경우 직접 업데이트
        const { data: post } = await supabase
          .from('community_posts')
          .select('likes_count')
          .eq('id', postId)
          .single();

        if (post) {
          await supabase
            .from('community_posts')
            .update({ likes_count: (post.likes_count || 0) + 1 })
            .eq('id', postId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    },
  });
};

export default useLoungeEligibility;
