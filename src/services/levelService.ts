/**
 * levelService.ts - 투자 레벨 서비스
 *
 * 역할: "레벨 관리 부서"
 * - 유저 레벨/XP/스트릭 조회
 * - XP 히스토리 조회 (타임라인용)
 * - 30일 출석 히트맵 데이터 조회
 * - 체크인 실행 (daily_checkin_v2 RPC)
 */

import supabase from './supabase';
import type { UserInvestorLevel, XPEvent, CheckInResult, GrantXPResult } from '../types/level';

// ============================================================================
// 레벨/XP 조회
// ============================================================================

/** 내 레벨 정보 조회 (없으면 초기화) */
export async function getMyLevel(userId: string): Promise<UserInvestorLevel | null> {
  const { data, error } = await supabase
    .from('user_investor_levels')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // 레코드 없음 → 기본값 반환
    return {
      user_id: userId,
      total_xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      last_checkin_date: null,
      total_checkins: 0,
      total_quizzes_correct: 0,
      total_quizzes_attempted: 0,
      quiz_streak: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  if (error) {
    console.error('[Level] 레벨 조회 실패:', error);
    return null;
  }

  return data;
}

// ============================================================================
// XP 히스토리
// ============================================================================

/** 최근 XP 이벤트 조회 (타임라인용) */
export async function getXPHistory(userId: string, limit: number = 20): Promise<XPEvent[]> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Level] XP 히스토리 조회 실패:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// 30일 출석 히트맵
// ============================================================================

/** 최근 30일 출석 날짜 목록 (히트맵용) */
export async function getCheckinHeatmap(userId: string): Promise<string[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('xp_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('source', 'checkin')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Level] 히트맵 조회 실패:', error);
    return [];
  }

  // 날짜만 추출 (YYYY-MM-DD)
  const dates = (data || []).map(e => e.created_at.slice(0, 10));
  return [...new Set(dates)]; // 중복 제거
}

// ============================================================================
// 체크인 실행
// ============================================================================

/** 출석 체크 (daily_checkin_v2 RPC) */
export async function performCheckIn(userId: string): Promise<CheckInResult> {
  const { data, error } = await supabase.rpc('daily_checkin_v2', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[Level] 체크인 RPC 실패:', error);
    return { success: false, reason: error.message };
  }

  return data as CheckInResult;
}

// ============================================================================
// XP 부여
// ============================================================================

/** 범용 XP 부여 (grant_xp RPC) */
export async function grantXP(userId: string, amount: number, source: string): Promise<GrantXPResult | null> {
  const { data, error } = await supabase.rpc('grant_xp', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
  });

  if (error) {
    console.error('[Level] XP 부여 실패:', error);
    return null;
  }

  return data as GrantXPResult;
}
