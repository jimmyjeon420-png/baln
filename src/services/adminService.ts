/**
 * adminService.ts - 관리자 대시보드 데이터 서비스
 *
 * 역할: Supabase RPC 함수를 호출하여 관리자 전용 데이터를 가져옵니다.
 *       일반 유저는 접근 불가 — DB 레벨에서 admin_users 테이블로 차단됩니다.
 *
 * 비유: "경영진 전용 보고서를 만드는 비서실"
 *       - fetchAdminOverview: 오늘의 회사 현황 요약
 *       - fetchAdminUserList: 고객 명단 조회
 *       - fetchAdminRetention: 고객 이탈/잔존 분석
 *       - fetchRecentActivity: 실시간 활동 로그
 */

import supabase from './supabase';

// ─── 타입 정의 ─────────────────────────────────────────────

/** 대시보드 핵심 KPI */
export interface AdminOverview {
  total_users: number;
  dau: number;
  wau: number;
  new_today: number;
  new_this_week: number;
  premium_count: number;
  total_credits_balance: number;
  credits_issued_today: number;
  credits_spent_today: number;
  predictions_today: number;
  posts_today: number;
  pending_reports: number;
  churn_risk_count: number;
}

/** 유저 목록 아이템 */
export interface AdminUser {
  id: string;
  email: string | null;
  plan_type: string;
  tier: string;
  total_assets: number;
  created_at: string;
  last_active: string | null;
  prediction_accuracy: number | null;
  total_votes: number;
  credit_balance: number;
}

/** 유저 목록 결과 (페이지네이션 포함) */
export interface AdminUserListResult {
  users: AdminUser[];
  total_count: number;
}

/** 리텐션 & 분포 데이터 */
export interface RetentionData {
  d1_retention: number;
  d7_retention: number;
  d30_retention: number;
  d1_count: number;
  d7_count: number;
  d30_count: number;
  total_signups: number;
  tier_distribution: Record<string, number>;
  plan_distribution: Record<string, number>;
  bracket_distribution: Record<string, number>;
  daily_signups_7d: { date: string; count: number }[];
  daily_dau_7d: { date: string; count: number }[];
}

/** 최근 활동 아이템 */
export interface RecentActivity {
  event_name: string;
  properties: Record<string, any> | null;
  user_id: string | null;
  email: string | null;
  created_at: string;
}

// ─── API 함수 ──────────────────────────────────────────────

/** 현재 유저가 관리자인지 확인 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data === true;
}

/** 대시보드 핵심 KPI 조회 */
export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('admin_get_overview');
  if (error) throw new Error(error.message);
  return data as AdminOverview;
}

/** 유저 목록 조회 (검색 + 페이지네이션) */
export async function fetchAdminUserList(params: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<AdminUserListResult> {
  const { data, error } = await supabase.rpc('admin_get_user_list', {
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
    p_search: params.search || null,
  });
  if (error) throw new Error(error.message);
  return data as AdminUserListResult;
}

/** 리텐션율 + 유저 분포 데이터 조회 */
export async function fetchAdminRetention(): Promise<RetentionData> {
  const { data, error } = await supabase.rpc('admin_get_retention');
  if (error) throw new Error(error.message);
  return data as RetentionData;
}

/** 최근 활동 피드 조회 */
export async function fetchRecentActivity(
  limit: number = 20
): Promise<RecentActivity[]> {
  const { data, error } = await supabase.rpc('admin_get_recent_activity', {
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data as RecentActivity[]) || [];
}

/** 보너스 크레딧 지급 결과 */
export interface GrantCreditsResult {
  success: boolean;
  new_balance?: number;
  granted_amount?: number;
  target_user_id?: string;
  error?: string;
}

/** 관리자가 특정 유저에게 보너스 크레딧 지급 */
export async function grantBonusCredits(params: {
  targetUserId: string;
  amount: number;
  memo?: string;
}): Promise<GrantCreditsResult> {
  const { data, error } = await supabase.rpc('admin_grant_credits', {
    p_target_user_id: params.targetUserId,
    p_amount: params.amount,
    p_memo: params.memo || null,
  });
  if (error) throw new Error(error.message);
  return data as GrantCreditsResult;
}
