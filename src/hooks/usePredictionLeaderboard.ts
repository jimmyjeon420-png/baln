/**
 * usePredictionLeaderboard.ts - 예측 리더보드 훅
 *
 * 역할: "예측 순위표 매니저" — 월간 예측 적중률 Top 10 + 내 주간 통계
 *
 * 기능:
 * - 월간 리더보드 Top 10 (prediction_user_stats 기반)
 * - 내 주간 통계 (이번 주 투표 수, 적중률)
 * - 내 전체 랭킹 (상위 몇 %)
 *
 * 데이터 소스: Supabase prediction_user_stats + prediction_votes
 */

import { useState, useEffect, useCallback } from 'react';
import supabase from '../services/supabase';
import type { LeaderboardEntry } from '../types/prediction';

// ============================================================================
// 타입 정의
// ============================================================================

export interface WeeklyStats {
  totalVotes: number;
  correctVotes: number;
  accuracyRate: number;
  streak: number;
}

export interface UsePredictionLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  myRank: number | null;           // 내 전체 순위
  myPercentile: number | null;     // 상위 몇 % (예: 5 = 상위 5%)
  weeklyStats: WeeklyStats;
  totalParticipants: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// 기본값
// ============================================================================

const DEFAULT_WEEKLY: WeeklyStats = {
  totalVotes: 0,
  correctVotes: 0,
  accuracyRate: 0,
  streak: 0,
};

// ============================================================================
// 유틸리티
// ============================================================================

/** 이메일 → 마스킹된 닉네임 (ab***@gmail.com → ab***) */
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 2) return email.substring(0, 1) + '***';
  return email.substring(0, 2) + '***';
}

/** 이번 주 월요일 날짜 (YYYY-MM-DD, KST 기준) */
function getThisMonday(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // 월요일 = 0
  kst.setUTCDate(kst.getUTCDate() - diff);
  return kst.toISOString().split('T')[0];
}

// ============================================================================
// 훅
// ============================================================================

export function usePredictionLeaderboard(): UsePredictionLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myPercentile, setMyPercentile] = useState<number | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>(DEFAULT_WEEKLY);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 현재 사용자
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // ── 1. 월간 리더보드 Top 10 ──
      const { data: statsData, error: statsError } = await supabase
        .from('prediction_user_stats')
        .select('user_id, total_votes, correct_votes, accuracy_rate, current_streak, best_streak, total_credits_earned')
        .gte('total_votes', 5)  // 최소 5회 이상 투표한 사용자만
        .order('accuracy_rate', { ascending: false })
        .order('total_votes', { ascending: false })
        .limit(10);

      if (statsError) {
        console.warn('[리더보드] 통계 조회 실패:', statsError.message);
        setError('리더보드를 불러올 수 없습니다.');
        return;
      }

      // 전체 참가자 수
      const { count: totalCount } = await supabase
        .from('prediction_user_stats')
        .select('user_id', { count: 'exact', head: true })
        .gte('total_votes', 1);

      const total = totalCount || 0;
      setTotalParticipants(total);

      // 프로필에서 display_name 가져오기
      const userIds = (statsData || []).map((s: any) => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const profileMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.id, p.email || 'Unknown');
      });

      // 리더보드 엔트리 구성
      const entries: LeaderboardEntry[] = (statsData || []).map((s: any, index: number) => ({
        rank: index + 1,
        user_id: s.user_id,
        display_name: maskEmail(profileMap.get(s.user_id) || 'User'),
        total_votes: s.total_votes,
        correct_votes: s.correct_votes,
        accuracy_rate: s.accuracy_rate,
        current_streak: s.current_streak,
        best_streak: s.best_streak,
        total_credits_earned: s.total_credits_earned,
        isMe: s.user_id === userId,
      }));

      setLeaderboard(entries);

      // ── 2. 내 순위 계산 ──
      if (userId) {
        const { data: myStats } = await supabase
          .from('prediction_user_stats')
          .select('accuracy_rate, total_votes, current_streak')
          .eq('user_id', userId)
          .single();

        if (myStats && myStats.total_votes >= 1) {
          // 나보다 높은 순위 사용자 수
          const { count: higherCount } = await supabase
            .from('prediction_user_stats')
            .select('user_id', { count: 'exact', head: true })
            .gt('accuracy_rate', myStats.accuracy_rate)
            .gte('total_votes', 5);

          const rank = (higherCount || 0) + 1;
          setMyRank(rank);

          if (total > 0) {
            setMyPercentile(Math.round((rank / total) * 100));
          }
        }

        // ── 3. 주간 통계 ──
        const monday = getThisMonday();
        const { data: weekVotes } = await supabase
          .from('prediction_votes')
          .select('is_correct')
          .eq('user_id', userId)
          .gte('created_at', monday + 'T00:00:00+09:00');

        if (weekVotes && weekVotes.length > 0) {
          const correct = weekVotes.filter((v: any) => v.is_correct === true).length;
          setWeeklyStats({
            totalVotes: weekVotes.length,
            correctVotes: correct,
            accuracyRate: weekVotes.length > 0 ? Math.round((correct / weekVotes.length) * 100) : 0,
            streak: myStats?.current_streak || 0,
          });
        }
      }
    } catch (err) {
      console.warn('[리더보드] 에러:', err);
      setError('네트워크 연결을 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    myRank,
    myPercentile,
    weeklyStats,
    totalParticipants,
    isLoading,
    error,
    refresh: fetchLeaderboard,
  };
}
