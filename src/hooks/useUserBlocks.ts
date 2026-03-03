/**
 * useUserBlocks - 사용자 차단 관리 훅
 *
 * Apple Guideline 1.2 준수:
 * - 차단된 사용자 목록 관리
 * - 차단/해제 기능
 * - 차단된 사용자 콘텐츠 필터링
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase, { getCurrentUser } from '../services/supabase';

export interface BlockedUser {
  id: string;
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
  /** 차단된 사용자의 display_tag (조인 데이터) */
  display_tag?: string;
}

/** 차단된 사용자 ID 목록 조회 */
export const useBlockedUserIds = () => {
  return useQuery({
    queryKey: ['blockedUserIds'],
    queryFn: async (): Promise<string[]> => {
      try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('user_blocks')
          .select('blocked_user_id')
          .eq('blocker_id', user.id);

        if (error) {
          console.warn('[UserBlocks] 차단 목록 조회 실패:', error.message);
          return [];
        }
        return (data || []).map(d => d.blocked_user_id);
      } catch (err) {
        console.warn('[UserBlocks] 차단 목록 조회 예외:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
};

/** 차단된 사용자 상세 목록 (설정 페이지용) */
export const useBlockedUsers = () => {
  return useQuery({
    queryKey: ['blockedUsers'],
    queryFn: async (): Promise<BlockedUser[]> => {
      try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('user_blocks')
          .select('id, blocked_user_id, reason, created_at')
          .eq('blocker_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[UserBlocks] 차단 상세 목록 조회 실패:', error.message);
          return [];
        }
        return (data || []) as BlockedUser[];
      } catch (err) {
        console.warn('[UserBlocks] 차단 상세 목록 조회 예외:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};

/** 사용자 차단 (+ 신고 자동 등록) */
export const useBlockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      blockedUserId: string;
      reason?: string;
      targetType?: 'post' | 'comment';
      targetId?: string;
    }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // RPC로 차단 + 신고 통합 처리
      const { data, error } = await supabase.rpc('block_and_report_user', {
        p_blocked_user_id: params.blockedUserId,
        p_reason: params.reason || null,
        p_target_type: params.targetType || null,
        p_target_id: params.targetId || null,
      });

      if (error) {
        console.warn('[UserBlocks] RPC 실패, 직접 INSERT 시도:', error.message);
        // 폴백: 직접 INSERT
        const { error: insertErr } = await supabase
          .from('user_blocks')
          .insert({
            blocker_id: user.id,
            blocked_user_id: params.blockedUserId,
            reason: params.reason || null,
          });

        if (insertErr) {
          // 이미 차단된 경우 (23505 = unique violation)
          if (insertErr.code === '23505') {
            return { alreadyBlocked: true };
          }
          throw insertErr;
        }

        // 신고도 별도 등록
        if (params.targetType && params.targetId) {
          try {
            await supabase.from('community_reports').insert({
              reporter_id: user.id,
              target_type: params.targetType,
              target_id: params.targetId,
              reason: 'abuse',
              description: params.reason || 'User blocked this account',
            });
          } catch {
            // best-effort
          }
        }

        return { success: true };
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUserIds'] });
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityComments'] });
    },
  });
};

/** 사용자 차단 해제 */
export const useUnblockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedUserId: string) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', blockedUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUserIds'] });
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['communityComments'] });
    },
  });
};

/** 특정 사용자가 차단되었는지 확인 (클라이언트 캐시 기반) */
export const useIsUserBlocked = (userId: string): boolean => {
  const { data: blockedIds } = useBlockedUserIds();
  if (!blockedIds || !userId) return false;
  return blockedIds.includes(userId);
};
