/**
 * useBookmarks - 게시글 북마크 기능 훅
 *
 * 비유: "즐겨찾기 서랍"
 * - 게시글을 북마크하면 나중에 다시 찾아볼 수 있음
 * - 토글 방식: 탭하면 저장, 다시 탭하면 해제
 * - 내 북마크 목록 조회 가능
 *
 * DB: post_bookmarks (user_id + post_id UNIQUE)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase, { getCurrentUser } from '../services/supabase';
import type { CommunityPost } from '../types/community';

// ============================================================================
// 1. 내 북마크 ID 목록 (빠른 토글 확인용)
// ============================================================================

/**
 * 내가 북마크한 게시글 ID Set을 반환
 * - 게시글 카드에서 북마크 아이콘 토글 판별에 사용
 */
export function useMyBookmarks() {
  const query = useQuery({
    queryKey: ['myBookmarks'],
    queryFn: async (): Promise<string[]> => {
      const user = await getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('post_bookmarks')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) {
        console.warn('[북마크] 목록 조회 실패:', error.message);
        return [];
      }

      return (data || []).map(d => d.post_id);
    },
    staleTime: 60000, // 1분
    retry: 1,         // 실패 시 1회만 재시도 (무한 로딩 방지)
  });

  // React Query의 structuredClone이 Set을 파괴하므로 배열로 저장 후 Set 변환
  const safeArray = Array.isArray(query.data) ? query.data : [];
  return { ...query, data: new Set(safeArray) };
}

// ============================================================================
// 2. 북마크 토글 (추가/삭제)
// ============================================================================

/**
 * 게시글 북마크 토글 mutation
 * - 이미 북마크됨 → 삭제
 * - 북마크 안 됨 → 추가
 * - 낙관적 업데이트로 즉시 UI 반영
 */
export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 기존 북마크 확인
      const { data: existing } = await supabase
        .from('post_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      if (existing) {
        // 북마크 해제
        const { error } = await supabase
          .from('post_bookmarks')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return false; // 해제됨
      } else {
        // 북마크 추가
        const { error } = await supabase
          .from('post_bookmarks')
          .insert({ user_id: user.id, post_id: postId });
        if (error) throw error;
        return true; // 추가됨
      }
    },

    // 낙관적 업데이트 (배열로 저장 — Set은 structuredClone에 의해 파괴됨)
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['myBookmarks'] });

      const prevBookmarks = queryClient.getQueryData<string[]>(['myBookmarks']);
      const currentArray = Array.isArray(prevBookmarks) ? [...prevBookmarks] : [];

      const idx = currentArray.indexOf(postId);
      if (idx >= 0) {
        currentArray.splice(idx, 1);
      } else {
        currentArray.push(postId);
      }

      queryClient.setQueryData(['myBookmarks'], currentArray);
      return { prevBookmarks };
    },

    // 에러 시 롤백
    onError: (_err, _postId, context) => {
      if (context?.prevBookmarks) {
        queryClient.setQueryData(['myBookmarks'], context.prevBookmarks);
      }
    },

    // 서버 진실성 확보
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarkedPosts'] });
    },
  });
}

// ============================================================================
// 3. 내 북마크 게시글 목록 (북마크 페이지용)
// ============================================================================

/**
 * 북마크한 게시글 전체 목록 (최신순)
 * - bookmarks.tsx 에서 사용
 */
export function useBookmarkedPosts() {
  return useQuery({
    queryKey: ['bookmarkedPosts'],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) return [];

      // 북마크 → 게시글 조인 조회
      const { data: bookmarks, error: bError } = await supabase
        .from('post_bookmarks')
        .select('post_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bError || !bookmarks || bookmarks.length === 0) return [];

      // 게시글 ID 배열로 일괄 조회
      const postIds = bookmarks.map(b => b.post_id);
      const { data: posts, error: pError } = await supabase
        .from('community_posts')
        .select('*')
        .in('id', postIds);

      if (pError || !posts) return [];

      // 북마크 순서 유지 (최신 북마크 먼저)
      const postMap = new Map(posts.map(p => [p.id, p]));
      return bookmarks
        .map(b => postMap.get(b.post_id))
        .filter(Boolean)
        .map(post => ({
          ...post,
          top_holdings: Array.isArray(post!.top_holdings) ? post!.top_holdings : [],
        })) as CommunityPost[];
    },
    staleTime: 60000,
    retry: 1, // 실패 시 1회만 재시도 (무한 로딩 방지)
  });
}
