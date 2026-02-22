/**
 * useCommunity Hook - VIP 라운지 커뮤니티 기능
 *
 * 접근 등급 (3단계):
 *   열람: 100만원+ → 게시물 읽기만 가능
 *   댓글: 300만원+ → 댓글 작성 가능
 *   글쓰기: 3,000만원+ → 게시물 작성 가능
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase, { getCurrentUser } from '../services/supabase';
import { isFreePeriod } from '../config/freePeriod';
import { useSharedPortfolio } from './useSharedPortfolio';
import {
  CommunityPost,
  CommunityComment,
  CreatePostInput,
  LoungeEligibility,
  UserDisplayInfo,
  HoldingSnapshot,
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
// 라운지 자격 확인 (순수 계산 — useSharedPortfolio 캐시 활용)
// ================================================================

/** 순수 함수: 총 자산과 보유 여부 → LoungeEligibility 계산 */
const computeEligibility = (totalAssets: number, hasAssets: boolean): LoungeEligibility => {
  const free = isFreePeriod();
  const isEligible = free || totalAssets >= LOUNGE_VIEW_THRESHOLD;
  const canComment = free || totalAssets >= LOUNGE_COMMENT_THRESHOLD;
  const canPost = free || totalAssets >= LOUNGE_POST_THRESHOLD;
  const shortfall = isEligible ? 0 : LOUNGE_VIEW_THRESHOLD - totalAssets;

  return {
    isEligible,
    canComment,
    canPost,
    totalAssets,
    requiredAssets: LOUNGE_VIEW_THRESHOLD,
    shortfall,
    hasVerifiedAssets: hasAssets,
    verifiedAssetsTotal: totalAssets,
    isVerificationRequired: false,
  };
};

/** useSharedPortfolio 캐시 기반 자격 확인 (독립 Supabase 쿼리 제거) */
export const useLoungeEligibility = () => {
  const { totalAssets, hasAssets, isLoading, isPending, isError, refresh } = useSharedPortfolio();

  // 에러 발생 시 기본값 반환 (자격 미달로 잠기지 않도록 무료 기간 기준만 적용)
  if (isError) {
    return {
      eligibility: computeEligibility(0, false),
      loading: false,
      error: true,
      refetch: refresh,
    };
  }

  // ★ isPending도 포함: Auth 세션 로딩 중(enabled=false)일 때
  // TanStack Query v5에서 isLoading=false이지만 isPending=true
  // → 불완전한 데이터로 렌더링하지 않고 로딩 스피너 표시
  return {
    eligibility: computeEligibility(totalAssets, hasAssets),
    loading: isLoading || isPending,
    error: false,
    refetch: refresh,
  };
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
// 게시물 목록 조회 (무한 스크롤)
// ================================================================

/** 정렬 옵션 */
export type PostSortBy = 'latest' | 'popular' | 'hot';

// 성능 최적화: 페이지당 5개씩 로드
const PAGE_SIZE = 5;

export const useCommunityPosts = (
  category: CommunityCategoryFilter = 'all',
  sortBy: PostSortBy = 'latest',
) => {
  return useInfiniteQuery({
    queryKey: ['communityPosts', category, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('community_posts')
        .select('*');

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      // 정렬 기준
      if (sortBy === 'popular') {
        query = query.order('likes_count', { ascending: false });
      } else if (sortBy === 'hot') {
        query = query.order('comments_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // 오프셋 기반 페이지네이션
      query = query.range(pageParam, pageParam + PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message || '게시물 조회에 실패했습니다.');
      }

      return (data || []).map(post => ({
        ...post,
        top_holdings: Array.isArray(post.top_holdings) ? post.top_holdings : [],
      })) as CommunityPost[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // 마지막 페이지가 PAGE_SIZE 미만이면 더 이상 없음
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    staleTime: 60000,
  });
};

// ================================================================
// 게시물 작성 (3,000만원+ 전용)
// ================================================================

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput & { displayTag: string; assetMix: string; totalAssets: number; imageUrls?: string[] }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 자산 기준 미달이면 차단 (무료 기간에는 스킵)
      if (!isFreePeriod() && input.totalAssets < LOUNGE_POST_THRESHOLD) {
        throw new Error(`글 작성은 자산 ${formatAssetInBillion(LOUNGE_POST_THRESHOLD)} 이상 회원만 가능합니다.`);
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
          image_urls: input.imageUrls || null, // 이미지 URL 배열 추가
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
  const query = useQuery({
    queryKey: ['myLikes'],
    queryFn: async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return [] as string[];

        const { data, error } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', user.id);

        if (error) {
          console.warn('[Community] 좋아요 목록 조회 실패:', error.message);
          return [] as string[];
        }
        return (data || []).map(d => d.post_id);
      } catch (err) {
        console.warn('[Community] 좋아요 목록 조회 예외:', err);
        return [] as string[];
      }
    },
    staleTime: 60000,
  });

  // React Query의 structuredClone이 Set을 파괴하므로 배열로 저장 후 Set 변환
  const safeArray = Array.isArray(query.data) ? query.data : [];
  return { ...query, data: new Set(safeArray) };
};

/** 좋아요 토글 (RPC + 낙관적 업데이트) */
export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      console.log('[Community] 좋아요 토글 시작:', postId);

      const { data, error } = await supabase.rpc('toggle_post_like', {
        p_post_id: postId,
      });

      if (error) {
        console.warn('[Community] toggle_post_like RPC 에러, 폴백 시도:', error.message);

        // RPC 함수 미존재 시 폴백: community_likes 직접 조작
        const user = await getCurrentUser();
        if (!user) throw new Error('로그인이 필요합니다.');

        // 기존 좋아요 확인
        const { data: existing } = await supabase
          .from('community_likes')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .maybeSingle();

        if (existing) {
          // 좋아요 취소
          await supabase
            .from('community_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', postId);

          const { data: post } = await supabase
            .from('community_posts')
            .select('likes_count')
            .eq('id', postId)
            .single();
          if (post) {
            await supabase
              .from('community_posts')
              .update({ likes_count: Math.max((post.likes_count || 0) - 1, 0) })
              .eq('id', postId);
          }
          return false;
        } else {
          // 좋아요 추가
          const { error: insertErr } = await supabase
            .from('community_likes')
            .insert({ user_id: user.id, post_id: postId });

          if (insertErr) {
            console.warn('[Community] 좋아요 폴백 INSERT 실패:', insertErr.message);
            throw insertErr;
          }

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
      }

      return data as boolean; // true=좋아요, false=취소
    },

    // 낙관적 업데이트: 탭 → 즉시 UI 반영
    onMutate: async (postId: string) => {
      // 진행 중 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['communityPosts'] });
      await queryClient.cancelQueries({ queryKey: ['myLikes'] });
      await queryClient.cancelQueries({ queryKey: ['communityPost'] });

      // 캐시 스냅샷 저장 (롤백용)
      const prevMyLikes = queryClient.getQueryData<string[]>(['myLikes']);
      const prevPostsQueries = queryClient.getQueriesData({ queryKey: ['communityPosts'] });

      // myLikes 토글 (배열로 저장 — Set은 structuredClone에 의해 파괴됨)
      const currentArray = Array.isArray(prevMyLikes) ? [...prevMyLikes] : [];
      const likeIdx = currentArray.indexOf(postId);
      const isCurrentlyLiked = likeIdx >= 0;
      if (isCurrentlyLiked) {
        currentArray.splice(likeIdx, 1);
      } else {
        currentArray.push(postId);
      }
      queryClient.setQueryData(['myLikes'], currentArray);

      // communityPosts (useInfiniteQuery pages[][] 구조) 업데이트
      queryClient.setQueriesData(
        { queryKey: ['communityPosts'] },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: CommunityPost[]) =>
              page.map((post: CommunityPost) =>
                post.id === postId
                  ? { ...post, likes_count: (post.likes_count || 0) + (isCurrentlyLiked ? -1 : 1) }
                  : post
              )
            ),
          };
        },
      );

      // communityPost (단일) 업데이트
      queryClient.setQueriesData(
        { queryKey: ['communityPost'] },
        (oldData: any) => {
          if (!oldData || oldData.id !== postId) return oldData;
          return { ...oldData, likes_count: (oldData.likes_count || 0) + (isCurrentlyLiked ? -1 : 1) };
        },
      );

      return { prevMyLikes, prevPostsQueries };
    },

    // 에러 시 롤백
    onError: (_err, _postId, context) => {
      if (context?.prevMyLikes) {
        queryClient.setQueryData(['myLikes'], context.prevMyLikes);
      }
      if (context?.prevPostsQueries) {
        for (const [queryKey, data] of context.prevPostsQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    // 서버 진실성 확보
    onSettled: () => {
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
      try {
        const { data, error } = await supabase
          .from('community_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('[Community] 댓글 조회 실패 (빈 배열 반환):', error.message);
          return [] as CommunityComment[];
        }
        return data as CommunityComment[];
      } catch (err) {
        console.warn('[Community] 댓글 조회 예외:', err);
        return [] as CommunityComment[];
      }
    },
    enabled: !!postId,
    staleTime: 60000,
  });
};

export const useCreateComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { content: string; displayTag: string; totalAssets: number; parentId?: string }) => {
      console.log('[Community] 댓글 작성 시작:', { postId, contentLength: input.content.length, totalAssets: input.totalAssets, isFreePeriod: isFreePeriod() });

      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 자산 기준 미달이면 차단 (무료 기간 제외)
      if (!isFreePeriod() && input.totalAssets < LOUNGE_COMMENT_THRESHOLD) {
        throw new Error(`댓글 작성은 자산 ${formatAssetInBillion(LOUNGE_COMMENT_THRESHOLD)} 이상 회원만 가능합니다.`);
      }

      // 댓글 저장 (parent_id 포함 = 대댓글)
      const insertPayload = {
        post_id: postId,
        user_id: user.id,
        content: input.content,
        display_tag: input.displayTag,
        total_assets_at_comment: input.totalAssets,
        parent_id: input.parentId || null,
      };
      console.log('[Community] 댓글 INSERT payload:', insertPayload);

      const { data, error } = await supabase
        .from('community_comments')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.warn('[Community] 댓글 INSERT 실패:', error.code, error.message);
        throw error;
      }

      console.log('[Community] 댓글 저장 성공:', data?.id);

      // 댓글 수 원자적 증가 (대댓글도 카운트) — RPC 실패 시 무시 (댓글은 이미 저장됨)
      try {
        const { error: rpcError } = await supabase.rpc('increment_comment_count', { p_post_id: postId });
        if (rpcError) {
          console.warn('[Community] increment_comment_count RPC 에러 (무시):', rpcError.message);
        }
      } catch (rpcErr) {
        console.warn('[Community] increment_comment_count RPC 실패 (무시):', rpcErr);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityComments', postId] });
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityPost', postId] });
    },
  });
};

/** 댓글 수정 (본인 것만) */
export const useUpdateComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 본인 댓글인지 확인
      const { data: comment } = await supabase
        .from('community_comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

      if (comment?.user_id !== user.id) {
        throw new Error('본인의 댓글만 수정할 수 있습니다.');
      }

      // 수정
      const { data, error } = await supabase
        .from('community_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityComments', postId] });
    },
  });
};

/** 댓글 삭제 (본인 것만) */
export const useDeleteComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 본인 댓글인지 확인
      const { data: comment } = await supabase
        .from('community_comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

      if (comment?.user_id !== user.id) {
        throw new Error('본인의 댓글만 삭제할 수 있습니다.');
      }

      // 삭제
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // 댓글 수 감소 — RPC 실패 시 무시 (댓글은 이미 삭제됨)
      try {
        const { error: rpcError } = await supabase.rpc('increment_comment_count', { p_post_id: postId, p_delta: -1 });
        if (rpcError) {
          console.warn('[Community] increment_comment_count (감소) RPC 에러 (무시):', rpcError.message);
        }
      } catch (rpcErr) {
        console.warn('[Community] increment_comment_count (감소) RPC 실패 (무시):', rpcErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityComments', postId] });
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityPost', postId] });
    },
  });
};

/** 게시글 삭제 (본인 것만) */
export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 본인 게시글인지 확인
      const { data: post } = await supabase
        .from('community_posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (post?.user_id !== user.id) {
        throw new Error('본인의 게시글만 삭제할 수 있습니다.');
      }

      // 삭제
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    },
  });
};

/** 댓글 좋아요 (내가 좋아요한 댓글 ID 목록) */
export const useMyCommentLikes = () => {
  const query = useQuery({
    queryKey: ['myCommentLikes'],
    queryFn: async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return [] as string[];

        const { data, error } = await supabase
          .from('community_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id);

        if (error) {
          console.warn('[Community] 댓글 좋아요 목록 조회 실패:', error.message);
          return [] as string[];
        }
        return (data || []).map(d => d.comment_id);
      } catch (err) {
        console.warn('[Community] 댓글 좋아요 목록 조회 예외:', err);
        return [] as string[];
      }
    },
    staleTime: 60000,
  });

  // React Query의 structuredClone이 Set을 파괴하므로 배열로 저장 후 Set 변환
  const safeArray = Array.isArray(query.data) ? query.data : [];
  return { ...query, data: new Set(safeArray) };
};

/** 댓글 좋아요 토글 */
export const useLikeComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      console.log('[Community] 댓글 좋아요 토글:', commentId);

      // 기존 좋아요 확인 (maybeSingle: 없으면 null, 에러 없음)
      const { data: existing, error: checkError } = await supabase
        .from('community_comment_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .maybeSingle();

      if (checkError) {
        console.warn('[Community] 댓글 좋아요 확인 실패:', checkError.message);
        // 테이블 자체가 없을 수 있음 — 조용히 실패
        throw checkError;
      }

      if (existing) {
        // 좋아요 취소
        const { error: deleteErr } = await supabase
          .from('community_comment_likes')
          .delete()
          .eq('id', existing.id);

        if (deleteErr) {
          console.warn('[Community] 댓글 좋아요 삭제 실패:', deleteErr.message);
        }

        // 좋아요 수 감소
        const { data: comment } = await supabase
          .from('community_comments')
          .select('likes_count')
          .eq('id', commentId)
          .single();

        if (comment) {
          await supabase
            .from('community_comments')
            .update({ likes_count: Math.max((comment.likes_count || 0) - 1, 0) })
            .eq('id', commentId);
        }

        return false;
      } else {
        // 좋아요 추가
        const { error: insertErr } = await supabase
          .from('community_comment_likes')
          .insert({ user_id: user.id, comment_id: commentId });

        if (insertErr) {
          console.warn('[Community] 댓글 좋아요 INSERT 실패:', insertErr.message);
          throw insertErr;
        }

        // 좋아요 수 증가
        const { data: comment } = await supabase
          .from('community_comments')
          .select('likes_count')
          .eq('id', commentId)
          .single();

        if (comment) {
          await supabase
            .from('community_comments')
            .update({ likes_count: (comment.likes_count || 0) + 1 })
            .eq('id', commentId);
        }

        return true;
      }
    },
    onMutate: async (commentId: string) => {
      // 낙관적 업데이트 (배열로 저장 — Set은 structuredClone에 의해 파괴됨)
      await queryClient.cancelQueries({ queryKey: ['communityComments', postId] });
      await queryClient.cancelQueries({ queryKey: ['myCommentLikes'] });

      const prevLikes = queryClient.getQueryData<string[]>(['myCommentLikes']);
      const currentArray = Array.isArray(prevLikes) ? [...prevLikes] : [];
      const idx = currentArray.indexOf(commentId);

      if (idx >= 0) {
        currentArray.splice(idx, 1);
      } else {
        currentArray.push(commentId);
      }

      queryClient.setQueryData(['myCommentLikes'], currentArray);

      return { prevLikes };
    },
    onError: (_err, _commentId, context) => {
      if (context?.prevLikes) {
        queryClient.setQueryData(['myCommentLikes'], context.prevLikes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['communityComments', postId] });
      queryClient.invalidateQueries({ queryKey: ['myCommentLikes'] });
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
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (error) {
          console.warn('[Community] 게시물 상세 조회 실패:', error.message);
          return null;
        }
        return {
          ...data,
          top_holdings: Array.isArray(data.top_holdings) ? data.top_holdings : [],
        } as CommunityPost;
      } catch (err) {
        console.warn('[Community] 게시물 상세 조회 예외:', err);
        return null;
      }
    },
    enabled: !!postId,
    staleTime: 60000,
  });
};

// ================================================================
// 베스트 답변 (품질 시스템)
// ================================================================

export interface CommunityBestAnswer {
  post_id: string;
  comment_id: string;
  selected_by: string;
  selected_at: string;
}

/** 게시글별 베스트 답변 조회 */
export const useBestAnswer = (postId: string) => {
  return useQuery({
    queryKey: ['communityBestAnswer', postId],
    queryFn: async () => {
      if (!postId) return null as CommunityBestAnswer | null;
      try {
        const { data, error } = await supabase
          .from('community_best_answers')
          .select('*')
          .eq('post_id', postId)
          .maybeSingle();

        if (error) {
          // 테이블 미생성(마이그레이션 전)일 수 있으므로 조용히 null 처리
          if (error.code !== 'PGRST116') {
            console.warn('[Community] 베스트 답변 조회 실패:', error.message);
          }
          return null as CommunityBestAnswer | null;
        }

        return (data || null) as CommunityBestAnswer | null;
      } catch (err) {
        console.warn('[Community] 베스트 답변 조회 예외:', err);
        return null as CommunityBestAnswer | null;
      }
    },
    enabled: !!postId,
    staleTime: 60000,
  });
};

/** 베스트 답변 채택/변경 (게시글 작성자 권한) */
export const useSelectBestAnswer = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');
      if (!postId) throw new Error('게시글 정보가 없습니다.');

      // 게시글 작성자 권한 확인
      const { data: post, error: postErr } = await supabase
        .from('community_posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postErr) throw postErr;
      if (post?.user_id !== user.id) {
        throw new Error('게시글 작성자만 베스트 답변을 채택할 수 있습니다.');
      }

      const { error } = await supabase
        .from('community_best_answers')
        .upsert(
          {
            post_id: postId,
            comment_id: commentId,
            selected_by: user.id,
            selected_at: new Date().toISOString(),
          },
          { onConflict: 'post_id' }
        );

      if (error) {
        if (error.code === '42P01') {
          throw new Error('베스트 답변 기능 준비 중입니다. DB 마이그레이션을 먼저 적용해주세요.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityBestAnswer', postId] });
      queryClient.invalidateQueries({ queryKey: ['communityComments', postId] });
      queryClient.invalidateQueries({ queryKey: ['communityPost', postId] });
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    },
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
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) {
          console.warn('[Community] 작성자 게시물 조회 실패:', error.message);
          return [] as CommunityPost[];
        }
        return (data || []).map(post => ({
          ...post,
          top_holdings: Array.isArray(post.top_holdings) ? post.top_holdings : [],
        })) as CommunityPost[];
      } catch (err) {
        console.warn('[Community] 작성자 게시물 조회 예외:', err);
        return [] as CommunityPost[];
      }
    },
    enabled: !!userId,
    staleTime: 60000,
  });
};

export default useLoungeEligibility;
