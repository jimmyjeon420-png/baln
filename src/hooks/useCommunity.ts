/**
 * useCommunity Hook - VIP 라운지 커뮤니티 기능
 *
 * 접근 등급 (3단계):
 *   열람: 100만원+ → 게시물 읽기만 가능
 *   댓글: 1,000만원+ → 댓글 작성 가능
 *   글쓰기: 1.5억+ → 게시물 작성 가능
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
import {
  CommunityPost,
  CommunityComment,
  CreatePostInput,
  LoungeEligibility,
  UserDisplayInfo,
  HoldingSnapshot,
  CommunityCategory,
  CommunityCategoryFilter,
  TIER_THRESHOLDS,
  TIER_LABELS,
  LOUNGE_VIEW_THRESHOLD,
  LOUNGE_COMMENT_THRESHOLD,
  LOUNGE_POST_THRESHOLD,
} from '../types/community';

/**
 * 자산을 "X.X억" 또는 "X만" 형식으로 변환
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
 * 티어 결정 (4단계)
 */
const determineTier = (totalAssets: number): 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' => {
  if (totalAssets >= TIER_THRESHOLDS.DIAMOND) return 'DIAMOND';
  if (totalAssets >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (totalAssets >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  return 'SILVER';
};

/**
 * asset_type 문자열 → HoldingSnapshot type 변환
 */
const normalizeHoldingType = (assetType: string | null): HoldingSnapshot['type'] => {
  if (!assetType) return 'other';
  const t = assetType.toLowerCase();
  if (t.includes('crypto') || t.includes('coin') || t.includes('bitcoin')) return 'crypto';
  if (t.includes('real') || t.includes('부동산')) return 'realestate';
  if (t.includes('stock') || t.includes('liquid') || t.includes('주식') || t.includes('etf')) return 'stock';
  return 'other';
};

// ================================================================
// 라운지 자격 확인 훅
// ================================================================

export const useLoungeEligibility = () => {
  const [eligibility, setEligibility] = useState<LoungeEligibility>({
    isEligible: false,
    canComment: false,
    canPost: false,
    totalAssets: 0,
    requiredAssets: LOUNGE_VIEW_THRESHOLD,
    shortfall: LOUNGE_VIEW_THRESHOLD,
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
          canComment: false,
          canPost: false,
          totalAssets: 0,
          requiredAssets: LOUNGE_VIEW_THRESHOLD,
          shortfall: LOUNGE_VIEW_THRESHOLD,
          hasVerifiedAssets: false,
          verifiedAssetsTotal: 0,
          isVerificationRequired: false,
        });
        return;
      }

      // 포트폴리오에서 총 자산 계산
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, quantity, current_price, current_value')
        .eq('user_id', user.id);

      if (error) {
        console.error('Portfolio fetch error:', error);
        return;
      }

      const totalAssets = (data || []).reduce((sum, item) => {
        const value = item.quantity && item.current_price
          ? item.quantity * item.current_price
          : item.current_value || 0;
        return sum + value;
      }, 0);

      const verifiedAssetsTotal = totalAssets;
      const hasVerifiedAssets = (data || []).length > 0;

      // 3단계 접근 등급 판단
      const isEligible = totalAssets >= LOUNGE_VIEW_THRESHOLD;
      const canComment = totalAssets >= LOUNGE_COMMENT_THRESHOLD;
      const canPost = totalAssets >= LOUNGE_POST_THRESHOLD;

      const shortfall = isEligible
        ? 0
        : LOUNGE_VIEW_THRESHOLD - totalAssets;

      setEligibility({
        isEligible,
        canComment,
        canPost,
        totalAssets,
        requiredAssets: LOUNGE_VIEW_THRESHOLD,
        shortfall,
        hasVerifiedAssets,
        verifiedAssetsTotal,
        isVerificationRequired: false,
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

// ================================================================
// 사용자 표시 정보
// ================================================================

export const useUserDisplayInfo = (totalAssets: number, totalGain: number): UserDisplayInfo => {
  const tier = determineTier(totalAssets);
  const displayTag = `[자산: ${formatAssetInBillion(totalAssets)} / 수익: ${totalGain >= 0 ? '+' : ''}${formatAssetInBillion(totalGain)}]`;
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
  const topCategories = portfolio
    .filter(item => item.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return topCategories
    .map(item => `${item.category} ${item.percentage}%`)
    .join(', ');
};

// ================================================================
// 게시물 목록 조회
// ================================================================

export const useCommunityPosts = (category: CommunityCategoryFilter = 'all') => {
  return useQuery({
    queryKey: ['communityPosts', category],
    queryFn: async () => {
      let query = supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // top_holdings JSON 파싱 보장
      return (data || []).map(post => ({
        ...post,
        top_holdings: Array.isArray(post.top_holdings) ? post.top_holdings : [],
      })) as CommunityPost[];
    },
    staleTime: 60000,
  });
};

// ================================================================
// 게시물 작성 (1.5억+ 전용)
// ================================================================

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput & { displayTag: string; assetMix: string; totalAssets: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 자산 1.5억 미만이면 차단
      if (input.totalAssets < LOUNGE_POST_THRESHOLD) {
        throw new Error('글 작성은 자산 1.5억 이상 회원만 가능합니다.');
      }

      // 보유종목 스냅샷 가져오기 (상위 10개)
      const { data: portfolioData } = await supabase
        .from('portfolios')
        .select('ticker, name, asset_type, current_value, quantity, current_price')
        .eq('user_id', user.id)
        .order('current_value', { ascending: false })
        .limit(10);

      const topHoldings: HoldingSnapshot[] = (portfolioData || [])
        .filter(item => item.ticker && item.current_value > 0)
        .map(item => ({
          ticker: item.ticker,
          name: item.name || item.ticker,
          type: normalizeHoldingType(item.asset_type),
          value: item.current_value || (item.quantity * item.current_price) || 0,
        }));

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          display_tag: input.displayTag,
          asset_mix: input.assetMix,
          content: input.content,
          category: input.category,
          total_assets_at_post: input.totalAssets,
          top_holdings: topHoldings,
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

// ================================================================
// 좋아요 토글 (유저당 1회)
// ================================================================

/** 내가 좋아요한 게시물 ID 목록 조회 */
export const useMyLikes = () => {
  return useQuery({
    queryKey: ['myLikes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Set<string>();

      const { data, error } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) return new Set<string>();
      return new Set((data || []).map(d => d.post_id));
    },
    staleTime: 60000,
  });
};

/** 좋아요 토글 (RPC 사용) */
export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.rpc('toggle_post_like', {
        p_post_id: postId,
      });

      if (error) {
        // RPC 함수 미존재 시 폴백
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
        return true;
      }

      return data as boolean; // true=좋아요, false=취소
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['myLikes'] });
      queryClient.invalidateQueries({ queryKey: ['communityPost'] });
    },
  });
};

// ================================================================
// 댓글 관련
// ================================================================

export const usePostComments = (postId: string) => {
  return useQuery({
    queryKey: ['communityComments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CommunityComment[];
    },
    enabled: !!postId,
    staleTime: 60000,
  });
};

export const useCreateComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { content: string; displayTag: string; totalAssets: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 자산 1,000만원 미만이면 차단
      if (input.totalAssets < LOUNGE_COMMENT_THRESHOLD) {
        throw new Error('댓글 작성은 자산 1,000만원 이상 회원만 가능합니다.');
      }

      // 댓글 저장
      const { data, error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: input.content,
          display_tag: input.displayTag,
          total_assets_at_comment: input.totalAssets,
        })
        .select()
        .single();

      if (error) throw error;

      // 댓글 수 원자적 증가
      await supabase.rpc('increment_comment_count', { p_post_id: postId });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityComments', postId] });
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityPost', postId] });
    },
  });
};

// ================================================================
// 단일 게시물 조회
// ================================================================

export const useCommunityPost = (postId: string) => {
  return useQuery({
    queryKey: ['communityPost', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      return {
        ...data,
        top_holdings: Array.isArray(data.top_holdings) ? data.top_holdings : [],
      } as CommunityPost;
    },
    enabled: !!postId,
    staleTime: 60000,
  });
};

// ================================================================
// 작성자 프로필 (SNS형 — 특정 유저의 게시물 목록)
// ================================================================

/** 특정 유저의 게시물 조회 */
export const useAuthorPosts = (userId: string) => {
  return useQuery({
    queryKey: ['authorPosts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []).map(post => ({
        ...post,
        top_holdings: Array.isArray(post.top_holdings) ? post.top_holdings : [],
      })) as CommunityPost[];
    },
    enabled: !!userId,
    staleTime: 60000,
  });
};

export default useLoungeEligibility;
