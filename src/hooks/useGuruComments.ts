/**
 * useGuruComments — 게시물의 구루 AI 댓글 조회 훅
 *
 * 역할: community_guru_comments 테이블에서 특정 게시물의 구루 댓글 목록 조회
 * staleTime 30초 (구루 댓글은 비동기 도착하므로 빠른 refetch)
 */

import { useQuery } from '@tanstack/react-query';
import supabase from '../services/supabase';
import type { GuruComment } from '../types/guruComment';

/**
 * 게시물의 구루 AI 댓글 조회
 *
 * @param postId 게시물 ID
 * @returns 구루 댓글 배열 (created_at ASC)
 */
export function useGuruComments(postId: string) {
  return useQuery({
    queryKey: ['guruComments', postId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('community_guru_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) {
          // 테이블 미생성(마이그레이션 전)일 수 있으므로 조용히 빈 배열 반환
          if (error.code === '42P01') {
            return [] as GuruComment[];
          }
          console.warn('[GuruComments] 조회 실패:', error.message);
          return [] as GuruComment[];
        }

        return (data || []) as GuruComment[];
      } catch (err) {
        console.warn('[GuruComments] 조회 예외:', err);
        return [] as GuruComment[];
      }
    },
    enabled: !!postId,
    staleTime: 30000, // 30초 — 구루 댓글 비동기 도착
  });
}
