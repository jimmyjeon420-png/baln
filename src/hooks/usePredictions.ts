/**
 * usePredictions.ts - 투자 예측 게임 데이터 훅
 *
 * 역할: "예측 경기장의 데이터 관리 부서"
 * - 활성 투표 조회, 종료된 투표 조회
 * - 내 투표 기록, 투표 제출 (RPC)
 * - 리더보드, 내 통계
 * - 투표 + 내 투표 병합 편의 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../services/supabase';
import type {
  PredictionPoll,
  PredictionVote,
  PredictionUserStats,
  PollWithMyVote,
  LeaderboardEntry,
  VoteChoice,
} from '../types/prediction';

// ============================================================================
// 쿼리 키 상수
// ============================================================================

export const PREDICTION_KEYS = {
  activePolls: ['prediction', 'active'] as const,
  resolvedPolls: (limit: number) => ['prediction', 'resolved', limit] as const,
  myVotes: (pollIds: string[]) => ['prediction', 'myVotes', pollIds] as const,
  leaderboard: ['prediction', 'leaderboard'] as const,
  myStats: ['prediction', 'myStats'] as const,
};

// ============================================================================
// 활성 투표 조회 (staleTime 60초)
// ============================================================================

export const useActivePolls = () => {
  return useQuery({
    queryKey: PREDICTION_KEYS.activePolls,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prediction_polls')
        .select('*')
        .eq('status', 'active')
        .gte('deadline', new Date().toISOString())
        .order('deadline', { ascending: true });

      if (error) throw error;
      return (data || []) as PredictionPoll[];
    },
    staleTime: 60000, // 60초
  });
};

// ============================================================================
// 종료된 투표 조회 (staleTime 5분)
// ============================================================================

export const useResolvedPolls = (limit: number = 10) => {
  return useQuery({
    queryKey: PREDICTION_KEYS.resolvedPolls(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prediction_polls')
        .select('*')
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as PredictionPoll[];
    },
    staleTime: 300000, // 5분
  });
};

// ============================================================================
// 내 투표 기록 조회 (IN 쿼리로 N+1 방지)
// ============================================================================

export const useMyVotes = (pollIds: string[]) => {
  return useQuery({
    queryKey: PREDICTION_KEYS.myVotes(pollIds),
    queryFn: async () => {
      if (pollIds.length === 0) return [] as PredictionVote[];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as PredictionVote[];

      const { data, error } = await supabase
        .from('prediction_votes')
        .select('*')
        .eq('user_id', user.id)
        .in('poll_id', pollIds);

      if (error) throw error;
      return (data || []) as PredictionVote[];
    },
    enabled: pollIds.length > 0,
    staleTime: 60000,
  });
};

// ============================================================================
// 투표 제출 Mutation (submit_poll_vote RPC)
// ============================================================================

export const useSubmitVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, vote }: { pollId: string; vote: VoteChoice }) => {
      const { data, error } = await supabase.rpc('submit_poll_vote', {
        p_poll_id: pollId,
        p_vote: vote,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.error_message || '투표에 실패했습니다');
      }

      return result;
    },
    onSuccess: () => {
      // 관련 쿼리 무효화 → 자동 리페치
      queryClient.invalidateQueries({ queryKey: ['prediction'] });
    },
  });
};

// ============================================================================
// 리더보드 (상위 10명 + 내 순위, staleTime 5분)
// ============================================================================

export const useLeaderboard = () => {
  return useQuery({
    queryKey: PREDICTION_KEYS.leaderboard,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // 상위 10명 조회 (최소 5회 투표한 유저만)
      const { data: topData, error: topError } = await supabase
        .from('prediction_user_stats')
        .select('*')
        .gte('total_votes', 5)
        .order('accuracy_rate', { ascending: false })
        .order('total_votes', { ascending: false })
        .limit(10);

      if (topError) throw topError;

      const entries: LeaderboardEntry[] = (topData || []).map((row, index) => ({
        rank: index + 1,
        user_id: row.user_id,
        display_name: maskUserId(row.user_id),
        total_votes: row.total_votes,
        correct_votes: row.correct_votes,
        accuracy_rate: Number(row.accuracy_rate),
        current_streak: row.current_streak,
        best_streak: row.best_streak,
        total_credits_earned: row.total_credits_earned,
        isMe: row.user_id === user?.id,
      }));

      // 내 순위가 TOP 10 안에 없으면 별도 조회
      if (user && !entries.some(e => e.isMe)) {
        const { data: myData } = await supabase
          .from('prediction_user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (myData && myData.total_votes >= 5) {
          // 내 순위 계산 (나보다 적중률 높은 유저 수 + 1)
          const { count } = await supabase
            .from('prediction_user_stats')
            .select('*', { count: 'exact', head: true })
            .gte('total_votes', 5)
            .gt('accuracy_rate', myData.accuracy_rate);

          entries.push({
            rank: (count || 0) + 1,
            user_id: myData.user_id,
            display_name: '나',
            total_votes: myData.total_votes,
            correct_votes: myData.correct_votes,
            accuracy_rate: Number(myData.accuracy_rate),
            current_streak: myData.current_streak,
            best_streak: myData.best_streak,
            total_credits_earned: myData.total_credits_earned,
            isMe: true,
          });
        }
      }

      return entries;
    },
    staleTime: 300000, // 5분
  });
};

// ============================================================================
// 내 예측 통계 (staleTime 60초)
// ============================================================================

export const useMyPredictionStats = () => {
  return useQuery({
    queryKey: PREDICTION_KEYS.myStats,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('prediction_user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // 아직 통계 없음 (첫 투표 전)
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as PredictionUserStats;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// ============================================================================
// 편의 훅: 활성 투표 + 내 투표 병합
// ============================================================================

export const usePollsWithMyVotes = () => {
  const { data: polls, isLoading: pollsLoading, ...pollsRest } = useActivePolls();
  const pollIds = (polls || []).map(p => p.id);
  const { data: myVotes, isLoading: votesLoading } = useMyVotes(pollIds);

  // 병합
  const pollsWithVotes: PollWithMyVote[] = (polls || []).map(poll => {
    const vote = (myVotes || []).find(v => v.poll_id === poll.id);
    return {
      ...poll,
      myVote: vote?.vote || null,
      myIsCorrect: vote?.is_correct ?? null,
      myCreditsEarned: vote?.credits_earned || 0,
    };
  });

  return {
    data: pollsWithVotes,
    isLoading: pollsLoading || votesLoading,
    ...pollsRest,
  };
};

// ============================================================================
// 편의 훅: 종료 투표 + 내 투표 병합
// ============================================================================

export const useResolvedPollsWithMyVotes = (limit: number = 10) => {
  const { data: polls, isLoading: pollsLoading, ...pollsRest } = useResolvedPolls(limit);
  const pollIds = (polls || []).map(p => p.id);
  const { data: myVotes, isLoading: votesLoading } = useMyVotes(pollIds);

  const pollsWithVotes: PollWithMyVote[] = (polls || []).map(poll => {
    const vote = (myVotes || []).find(v => v.poll_id === poll.id);
    return {
      ...poll,
      myVote: vote?.vote || null,
      myIsCorrect: vote?.is_correct ?? null,
      myCreditsEarned: vote?.credits_earned || 0,
    };
  });

  return {
    data: pollsWithVotes,
    isLoading: pollsLoading || votesLoading,
    ...pollsRest,
  };
};

// ============================================================================
// 어제의 복기 (Yesterday Review) - 습관 루프 강화
// ============================================================================

export const useYesterdayReview = () => {
  const { data: resolvedPolls, isLoading: resolvedLoading } = useResolvedPolls(20);
  const pollIds = (resolvedPolls || []).map(p => p.id);
  const { data: myVotes, isLoading: votesLoading } = useMyVotes(pollIds);

  // 어제 날짜 계산 (로컬 타임존)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateString = yesterday.toISOString().split('T')[0]; // "YYYY-MM-DD"

  // 어제 resolved + 내가 투표한 것만 필터링
  const yesterdayPolls: PollWithMyVote[] = (resolvedPolls || [])
    .filter(poll => {
      // resolved_at이 어제인지 확인
      if (!poll.resolved_at) return false;
      const resolvedDate = new Date(poll.resolved_at).toISOString().split('T')[0];
      return resolvedDate === yesterdayDateString;
    })
    .map(poll => {
      const vote = (myVotes || []).find(v => v.poll_id === poll.id);
      return {
        ...poll,
        myVote: vote?.vote || null,
        myIsCorrect: vote?.is_correct ?? null,
        myCreditsEarned: vote?.credits_earned || 0,
      };
    })
    .filter(poll => poll.myVote !== null); // 내가 투표한 것만

  // 통계 계산
  const totalVoted = yesterdayPolls.length;
  const totalCorrect = yesterdayPolls.filter(p => p.myIsCorrect === true).length;
  const accuracyRate = totalVoted > 0 ? Math.round((totalCorrect / totalVoted) * 100) : 0;

  return {
    data: yesterdayPolls,
    isLoading: resolvedLoading || votesLoading,
    summary: {
      totalVoted,
      totalCorrect,
      accuracyRate,
    },
  };
};

// ============================================================================
// 유틸리티
// ============================================================================

/** 유저 ID 마스킹 (프라이버시) */
function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) return '***';
  return userId.substring(0, 4) + '****' + userId.substring(userId.length - 4);
}
