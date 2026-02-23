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

const DAY_MS = 24 * 60 * 60 * 1000;

function isSchemaError(message?: string): boolean {
  if (!message) return false;
  return (
    /column .* does not exist/i.test(message) ||
    /relation .* does not exist/i.test(message) ||
    /function .* does not exist/i.test(message)
  );
}

function normalizeIso(value: unknown, fallback: string = new Date().toISOString()): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return fallback;
}

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function startOfWeekIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 월요일 시작
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return monday.toISOString();
}

async function countRows(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count || 0;
}

async function countRowsSince(table: string, sinceIso: string): Promise<number> {
  const dateColumns = ['created_at', 'updated_at'];
  for (const col of dateColumns) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .gte(col, sinceIso);
    if (!error) return count || 0;
    if (!isSchemaError(error.message)) return 0;
  }
  return 0;
}

async function fetchRecentRows(table: string, options?: { limit?: number; userId?: string; fromIso?: string }): Promise<any[]> {
  const dateColumns = ['created_at', 'updated_at'];
  const limit = options?.limit ?? 50;
  for (const col of dateColumns) {
    let query = supabase
      .from(table)
      .select('*')
      .order(col, { ascending: false })
      .limit(limit);

    if (options?.userId) query = query.eq('user_id', options.userId);
    if (options?.fromIso) query = query.gte(col, options.fromIso);

    const { data, error } = await query;
    if (!error) return data || [];
    if (!isSchemaError(error.message)) break;
  }

  let fallbackQuery = supabase
    .from(table)
    .select('*')
    .limit(limit);

  if (options?.userId) fallbackQuery = fallbackQuery.eq('user_id', options.userId);

  const { data } = await fallbackQuery;
  return data || [];
}

function toComparisonMetric(today: number, yesterday: number): DailyComparisonMetric {
  return {
    today,
    yesterday,
    delta: today - yesterday,
  };
}

function normalizeAdminUser(row: Record<string, any>): AdminUser {
  const created = normalizeIso(row.created_at ?? row.updated_at);
  const lastActiveValue = row.last_active ?? row.last_active_date ?? row.updated_at ?? null;
  const lastActive = lastActiveValue ? normalizeIso(lastActiveValue, created) : null;

  return {
    id: String(row.id || ''),
    email: typeof row.email === 'string' ? row.email : null,
    plan_type: typeof row.plan_type === 'string' ? row.plan_type : 'free',
    tier: typeof row.tier === 'string' ? row.tier : 'SILVER',
    total_assets: toNum(row.total_assets ?? row.verified_total_assets),
    created_at: created,
    last_active: lastActive,
    prediction_accuracy: row.prediction_accuracy == null ? null : toNum(row.prediction_accuracy),
    total_votes: toNum(row.total_votes),
    credit_balance: toNum(row.credit_balance ?? row.balance),
  };
}

async function fetchAdminUserListFallback(params: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<AdminUserListResult> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const upper = offset + limit - 1;

  const runProfilesQuery = async (orderBy?: 'created_at' | 'updated_at') => {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (params.search) {
      const keyword = params.search.trim().replace(/,/g, '');
      query = query.or(`email.ilike.%${keyword}%,full_name.ilike.%${keyword}%,display_name.ilike.%${keyword}%`);
    }

    if (orderBy) {
      query = query.order(orderBy, { ascending: false });
    }

    return query.range(offset, upper);
  };

  let profilesResult = await runProfilesQuery('created_at');
  if (profilesResult.error && isSchemaError(profilesResult.error.message)) {
    profilesResult = await runProfilesQuery('updated_at');
  }
  if (profilesResult.error && isSchemaError(profilesResult.error.message)) {
    profilesResult = await runProfilesQuery();
  }
  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const rows = (profilesResult.data || []) as Record<string, any>[];
  const userIds = rows.map((row) => row.id).filter(Boolean) as string[];

  const [creditRows, statRows] = await Promise.all([
    userIds.length > 0
      ? supabase.from('user_credits').select('user_id,balance').in('user_id', userIds)
      : Promise.resolve({ data: [], error: null } as any),
    userIds.length > 0
      ? supabase.from('prediction_user_stats').select('user_id,total_votes,accuracy_rate').in('user_id', userIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const creditMap = new Map<string, number>();
  (creditRows.data || []).forEach((row: Record<string, any>) => {
    creditMap.set(String(row.user_id), toNum(row.balance));
  });

  const statMap = new Map<string, { totalVotes: number; accuracy: number | null }>();
  (statRows.data || []).forEach((row: Record<string, any>) => {
    statMap.set(String(row.user_id), {
      totalVotes: toNum(row.total_votes),
      accuracy: row.accuracy_rate == null ? null : toNum(row.accuracy_rate),
    });
  });

  const users = rows.map((row) => {
    const user = normalizeAdminUser(row);
    const credits = creditMap.get(user.id);
    const stats = statMap.get(user.id);
    return {
      ...user,
      credit_balance: credits ?? user.credit_balance,
      total_votes: stats?.totalVotes ?? user.total_votes,
      prediction_accuracy: stats?.accuracy ?? user.prediction_accuracy,
    };
  });

  return {
    users,
    total_count: profilesResult.count || users.length,
  };
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
  if (!error && data) {
    return data as AdminOverview;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const todayIso = startOfTodayIso();
  const weekIso = startOfWeekIso();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * DAY_MS).toISOString();

  const [
    totalUsers,
    newToday,
    newThisWeek,
    premiumCount,
    predictionsToday,
    postsToday,
    pendingReports,
    totalCreditsRows,
    issuedRows,
    spentRows,
    dauRows,
    wauRows,
  ] = await Promise.all([
    countRows('profiles'),
    countRowsSince('profiles', todayIso),
    countRowsSince('profiles', weekIso),
    (async () => {
      const { count, error: premiumErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_type', 'premium');
      return premiumErr ? 0 : (count || 0);
    })(),
    countRowsSince('prediction_votes', todayIso),
    countRowsSince('community_posts', todayIso),
    (async () => {
      const { count, error: reportErr } = await supabase
        .from('community_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return reportErr ? 0 : (count || 0);
    })(),
    fetchRecentRows('user_credits', { limit: 5000 }),
    (async () => fetchRecentRows('credit_transactions', { fromIso: todayIso, limit: 5000 }))(),
    (async () => fetchRecentRows('credit_transactions', { fromIso: todayIso, limit: 5000 }))(),
    fetchRecentRows('analytics_events', { fromIso: todayIso, limit: 10000 }),
    fetchRecentRows('analytics_events', { fromIso: sevenDaysAgoIso, limit: 10000 }),
  ]);

  const totalCreditsBalance = totalCreditsRows.reduce((sum, row) => sum + toNum(row.balance), 0);
  const creditsIssuedToday = issuedRows
    .filter((row) => ['bonus', 'purchase', 'subscription_bonus', 'admin_grant'].includes(String(row.type || '')))
    .reduce((sum, row) => sum + Math.max(0, toNum(row.amount)), 0);
  const creditsSpentToday = spentRows
    .filter((row) => String(row.type || '') === 'spend')
    .reduce((sum, row) => sum + Math.abs(toNum(row.amount)), 0);

  const dau = new Set(dauRows.map((row) => row.user_id).filter(Boolean)).size;
  const wau = new Set(wauRows.map((row) => row.user_id).filter(Boolean)).size;

  return {
    total_users: totalUsers,
    dau,
    wau,
    new_today: newToday,
    new_this_week: newThisWeek,
    premium_count: premiumCount,
    total_credits_balance: Math.round(totalCreditsBalance),
    credits_issued_today: Math.round(creditsIssuedToday),
    credits_spent_today: Math.round(creditsSpentToday),
    predictions_today: predictionsToday,
    posts_today: postsToday,
    pending_reports: pendingReports,
    churn_risk_count: Math.max(0, totalUsers - wau),
  };
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
  if (!error && data) {
    return data as AdminUserListResult;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  return fetchAdminUserListFallback(params);
}

/** 리텐션율 + 유저 분포 데이터 조회 */
export async function fetchAdminRetention(): Promise<RetentionData> {
  const { data, error } = await supabase.rpc('admin_get_retention');
  if (!error && data) {
    return data as RetentionData;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const profileRows = await fetchRecentRows('profiles', { limit: 10000 });
  const analyticsRows = await fetchRecentRows('analytics_events', { limit: 20000 });
  const today = new Date();

  const toDateKey = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const emptyDaily = Array.from({ length: 7 }).map((_, idx) => {
    const day = new Date(today.getTime() - (6 - idx) * DAY_MS);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return { date: key, count: 0 };
  });

  const signupMap = new Map<string, number>(emptyDaily.map((d) => [d.date, 0]));
  profileRows.forEach((row) => {
    const key = toDateKey(String(row.created_at || row.updated_at || ''));
    if (!signupMap.has(key)) return;
    signupMap.set(key, (signupMap.get(key) || 0) + 1);
  });

  const dauMap = new Map<string, Set<string>>();
  emptyDaily.forEach((d) => dauMap.set(d.date, new Set<string>()));
  analyticsRows.forEach((row) => {
    const key = toDateKey(String(row.created_at || row.updated_at || ''));
    const userId = row.user_id ? String(row.user_id) : '';
    if (!userId) return;
    const set = dauMap.get(key);
    if (!set) return;
    set.add(userId);
  });

  const planDistribution: Record<string, number> = {};
  const tierDistribution: Record<string, number> = {};
  const bracketDistribution: Record<string, number> = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0 };

  profileRows.forEach((row) => {
    const plan = String(row.plan_type || 'free');
    const tier = String(row.tier || 'SILVER');
    const assets = toNum(row.total_assets ?? row.verified_total_assets);

    planDistribution[plan] = (planDistribution[plan] || 0) + 1;
    tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;

    if (assets < 10_000_000) bracketDistribution.B1 += 1;
    else if (assets < 30_000_000) bracketDistribution.B2 += 1;
    else if (assets < 50_000_000) bracketDistribution.B3 += 1;
    else if (assets < 100_000_000) bracketDistribution.B4 += 1;
    else bracketDistribution.B5 += 1;
  });

  return {
    d1_retention: 0,
    d7_retention: 0,
    d30_retention: 0,
    d1_count: 0,
    d7_count: 0,
    d30_count: 0,
    total_signups: profileRows.length,
    tier_distribution: tierDistribution,
    plan_distribution: planDistribution,
    bracket_distribution: bracketDistribution,
    daily_signups_7d: emptyDaily.map((d) => ({ date: d.date, count: signupMap.get(d.date) || 0 })),
    daily_dau_7d: emptyDaily.map((d) => ({ date: d.date, count: dauMap.get(d.date)?.size || 0 })),
  };
}

/** 최근 활동 피드 조회 */
export async function fetchRecentActivity(
  limit: number = 20
): Promise<RecentActivity[]> {
  const { data, error } = await supabase.rpc('admin_get_recent_activity', {
    p_limit: limit,
  });
  if (!error && data) {
    return (data as RecentActivity[]) || [];
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const rows = await fetchRecentRows('analytics_events', { limit });
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[];
  const { data: profileRows } = userIds.length > 0
    ? await supabase.from('profiles').select('id,email').in('id', userIds)
    : ({ data: [] } as any);
  const emailMap = new Map<string, string | null>();
  (profileRows || []).forEach((row: Record<string, any>) => {
    emailMap.set(String(row.id), row.email || null);
  });

  return rows.map((row) => ({
    event_name: String(row.event_name || 'unknown_event'),
    properties: row.properties && typeof row.properties === 'object' ? row.properties : null,
    user_id: row.user_id ? String(row.user_id) : null,
    email: row.user_id ? (emailMap.get(String(row.user_id)) ?? null) : null,
    created_at: normalizeIso(row.created_at ?? row.updated_at),
  }));
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
  if (!error && data) {
    return data as GrantCreditsResult;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const { data: creditRow, error: creditError } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', params.targetUserId)
    .maybeSingle();

  if (creditError) throw new Error(creditError.message);

  const nextBalance = toNum(creditRow?.balance) + Math.max(0, Math.floor(params.amount));
  const { error: upsertError } = await supabase
    .from('user_credits')
    .upsert({
      user_id: params.targetUserId,
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    });
  if (upsertError) throw new Error(upsertError.message);

  await supabase.from('credit_transactions').insert({
    user_id: params.targetUserId,
    type: 'admin_grant',
    amount: Math.max(0, Math.floor(params.amount)),
    balance_after: nextBalance,
    description: params.memo || '관리자 보너스 지급',
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    new_balance: nextBalance,
    granted_amount: Math.max(0, Math.floor(params.amount)),
    target_user_id: params.targetUserId,
  };
}

// ─── 라운지 관리 타입 ─────────────────────────────────────

/** 관리자용 게시글 아이템 */
export interface AdminLoungePost {
  id: string;
  user_id: string;
  email: string | null;
  display_tag: string | null;
  content: string;
  category: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  report_count: number;
}

/** 게시글 목록 결과 */
export interface AdminLoungePostsResult {
  posts: AdminLoungePost[];
  total_count: number;
}

/** 관리자용 모임 아이템 */
export interface AdminGathering {
  id: string;
  host_id: string;
  host_email: string | null;
  host_display_name: string | null;
  host_tier: string;
  title: string;
  description: string | null;
  category: string;
  entry_fee: number;
  max_capacity: number;
  current_capacity: number;
  event_date: string;
  location: string;
  location_type: string;
  status: string;
  min_tier_required: string;
  created_at: string;
}

/** 모임 목록 결과 */
export interface AdminGatheringsResult {
  gatherings: AdminGathering[];
  total_count: number;
}

/** 관리자 액션 결과 (삭제, 고정, 취소 등) */
export interface AdminActionResult {
  success: boolean;
  is_pinned?: boolean;
  error?: string;
}

// ─── 라운지 관리 API ──────────────────────────────────────

/** 라운지 게시글 목록 조회 */
export async function fetchAdminLoungePosts(params: {
  limit?: number;
  offset?: number;
  filter?: string;
}): Promise<AdminLoungePostsResult> {
  const { data, error } = await supabase.rpc('admin_get_lounge_posts', {
    p_limit: params.limit ?? 30,
    p_offset: params.offset ?? 0,
    p_filter: params.filter || 'all',
  });
  if (!error && data) {
    return data as AdminLoungePostsResult;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const limit = params.limit ?? 30;
  const offset = params.offset ?? 0;
  const filter = params.filter || 'all';
  const upper = offset + limit - 1;

  const runPostsQuery = async (orderBy?: 'created_at' | 'updated_at') => {
    let query = supabase
      .from('community_posts')
      .select('*', { count: 'exact' });

    if (filter === 'pinned') query = query.eq('is_pinned', true);
    if (orderBy) query = query.order(orderBy, { ascending: false });

    return query.range(offset, upper);
  };

  let postsResult = await runPostsQuery('created_at');
  if (postsResult.error && isSchemaError(postsResult.error.message)) {
    postsResult = await runPostsQuery('updated_at');
  }
  if (postsResult.error && isSchemaError(postsResult.error.message)) {
    postsResult = await runPostsQuery();
  }
  if (postsResult.error) throw new Error(postsResult.error.message);

  let rows = (postsResult.data || []) as Record<string, any>[];

  const reportMap = new Map<string, number>();
  if (filter === 'reported' || rows.some((row) => row.report_count == null)) {
    const reportRows = await fetchRecentRows('community_reports', { limit: 5000 });
    reportRows.forEach((row) => {
      if (row.target_type !== 'post') return;
      const key = String(row.target_id || '');
      if (!key) return;
      reportMap.set(key, (reportMap.get(key) || 0) + 1);
    });
    if (filter === 'reported') {
      rows = rows.filter((row) => (reportMap.get(String(row.id || '')) || 0) > 0);
    }
  }

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[];
  const { data: profileRows } = userIds.length > 0
    ? await supabase.from('profiles').select('id,email,display_tag').in('id', userIds)
    : ({ data: [] } as any);
  const profileMap = new Map<string, { email: string | null; displayTag: string | null }>();
  (profileRows || []).forEach((row: Record<string, any>) => {
    profileMap.set(String(row.id), {
      email: row.email || null,
      displayTag: row.display_tag || null,
    });
  });

  const posts: AdminLoungePost[] = rows.map((row) => {
    const profile = row.user_id ? profileMap.get(String(row.user_id)) : null;
    return {
      id: String(row.id || ''),
      user_id: String(row.user_id || ''),
      email: row.email || profile?.email || null,
      display_tag: row.display_tag || profile?.displayTag || null,
      content: String(row.content || ''),
      category: String(row.category || 'stocks'),
      likes_count: toNum(row.likes_count),
      comments_count: toNum(row.comments_count),
      is_pinned: Boolean(row.is_pinned),
      created_at: normalizeIso(row.created_at ?? row.updated_at),
      report_count: toNum(row.report_count ?? reportMap.get(String(row.id || '')) ?? 0),
    };
  });

  return {
    posts,
    total_count: postsResult.count || posts.length,
  };
}

/** 게시글 삭제 */
export async function adminDeletePost(postId: string): Promise<AdminActionResult> {
  const { data, error } = await supabase.rpc('admin_delete_post', {
    p_post_id: postId,
  });
  if (!error && data) {
    return data as AdminActionResult;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const { error: deleteErr } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);
  if (deleteErr) throw new Error(deleteErr.message);
  return { success: true };
}

/** 게시글 고정/해제 토글 */
export async function adminTogglePinPost(postId: string): Promise<AdminActionResult> {
  const { data, error } = await supabase.rpc('admin_toggle_pin_post', {
    p_post_id: postId,
  });
  if (!error && data) {
    return data as AdminActionResult;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const { data: row, error: rowErr } = await supabase
    .from('community_posts')
    .select('is_pinned')
    .eq('id', postId)
    .maybeSingle();
  if (rowErr) throw new Error(rowErr.message);
  const nextPinned = !Boolean(row?.is_pinned);

  const { error: updateErr } = await supabase
    .from('community_posts')
    .update({ is_pinned: nextPinned, updated_at: new Date().toISOString() })
    .eq('id', postId);
  if (updateErr) throw new Error(updateErr.message);

  return { success: true, is_pinned: nextPinned };
}

/** 모임 목록 조회 */
export async function fetchAdminGatherings(params: {
  limit?: number;
  offset?: number;
  filter?: string;
}): Promise<AdminGatheringsResult> {
  const { data, error } = await supabase.rpc('admin_get_gatherings', {
    p_limit: params.limit ?? 30,
    p_offset: params.offset ?? 0,
    p_filter: params.filter || 'all',
  });
  if (!error && data) {
    return data as AdminGatheringsResult;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const limit = params.limit ?? 30;
  const offset = params.offset ?? 0;
  const filter = params.filter || 'all';
  const upper = offset + limit - 1;

  const runGatheringsQuery = async (orderBy?: 'created_at' | 'updated_at') => {
    let query = supabase
      .from('gatherings')
      .select('*', { count: 'exact' });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    if (orderBy) query = query.order(orderBy, { ascending: false });

    return query.range(offset, upper);
  };

  let rowsResult = await runGatheringsQuery('created_at');
  if (rowsResult.error && isSchemaError(rowsResult.error.message)) {
    rowsResult = await runGatheringsQuery('updated_at');
  }
  if (rowsResult.error && isSchemaError(rowsResult.error.message)) {
    rowsResult = await runGatheringsQuery();
  }
  if (rowsResult.error) throw new Error(rowsResult.error.message);

  const rows = (rowsResult.data || []) as Record<string, any>[];
  const hostIds = Array.from(new Set(rows.map((row) => row.host_id).filter(Boolean))) as string[];
  const { data: hostProfiles } = hostIds.length > 0
    ? await supabase.from('profiles').select('id,email,display_name,tier').in('id', hostIds)
    : ({ data: [] } as any);
  const hostMap = new Map<string, Record<string, any>>();
  (hostProfiles || []).forEach((row: Record<string, any>) => hostMap.set(String(row.id), row));

  const gatherings: AdminGathering[] = rows.map((row) => {
    const host = row.host_id ? hostMap.get(String(row.host_id)) : null;
    return {
      id: String(row.id || ''),
      host_id: String(row.host_id || ''),
      host_email: row.host_email || host?.email || null,
      host_display_name: row.host_display_name || host?.display_name || null,
      host_tier: String(row.host_tier || host?.tier || 'SILVER'),
      title: String(row.title || ''),
      description: row.description || null,
      category: String(row.category || 'study'),
      entry_fee: toNum(row.entry_fee),
      max_capacity: toNum(row.max_capacity, 0),
      current_capacity: toNum(row.current_capacity, 0),
      event_date: normalizeIso(row.event_date ?? row.created_at ?? row.updated_at),
      location: String(row.location || '미정'),
      location_type: String(row.location_type || 'offline'),
      status: String(row.status || 'open'),
      min_tier_required: String(row.min_tier_required || 'SILVER'),
      created_at: normalizeIso(row.created_at ?? row.updated_at),
    };
  });

  return {
    gatherings,
    total_count: rowsResult.count || gatherings.length,
  };
}

/** 모임 취소 */
export async function adminCancelGathering(gatheringId: string): Promise<AdminActionResult> {
  const { data, error } = await supabase.rpc('admin_cancel_gathering', {
    p_gathering_id: gatheringId,
  });
  if (!error && data) {
    return data as AdminActionResult;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const { error: updateErr } = await supabase
    .from('gatherings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', gatheringId);
  if (updateErr) throw new Error(updateErr.message);
  return { success: true };
}

// ─── 고도화: 비교 지표, 유저 상세, 차단 ──────────────────

/** 어제 vs 오늘 비교 지표 (6개 항목) */
export interface DailyComparisonMetric {
  today: number;
  yesterday: number;
  delta: number;
}

export interface DailyComparisonData {
  dau: DailyComparisonMetric;
  signups: DailyComparisonMetric;
  votes: DailyComparisonMetric;
  posts: DailyComparisonMetric;
  credits_issued: DailyComparisonMetric;
  credits_spent: DailyComparisonMetric;
}

/** 유저 상세 프로필 */
export interface AdminUserDetail {
  profile: {
    id: string;
    email: string | null;
    plan_type: string;
    tier: string;
    total_assets: number;
    created_at: string;
    is_banned: boolean;
    banned_at: string | null;
    ban_reason: string | null;
    display_name: string | null;
  };
  credits: {
    balance: number;
    recent_transactions: {
      type: string;
      amount: number;
      description: string | null;
      created_at: string;
    }[];
  };
  badges: {
    badge_id: string;
    earned_at: string;
  }[];
  predictions: {
    accuracy_rate: number | null;
    total_votes: number;
    correct_votes: number;
    current_streak: number;
    best_streak: number;
    recent_votes: {
      question_id: string;
      choice: string;
      is_correct: boolean | null;
      created_at: string;
    }[];
  };
  streak: {
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null;
  };
  recent_activities: {
    event_name: string;
    properties: Record<string, any> | null;
    created_at: string;
  }[];
}

/** 유저 차단 결과 */
export interface BanUserResult {
  success: boolean;
  is_banned?: boolean;
  user_id?: string;
  error?: string;
}

/** 어제 vs 오늘 비교 데이터 조회 */
export async function fetchAdminDailyComparison(): Promise<DailyComparisonData> {
  const { data, error } = await supabase.rpc('admin_get_daily_comparison');
  if (!error && data) {
    return data as DailyComparisonData;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);

  const [dauTodayRows, dauYesterdayRows, signupsToday, signupsYesterday, votesToday, votesYesterday, postsToday, postsYesterday, issuedTodayRows, issuedYesterdayRows, spentTodayRows, spentYesterdayRows] = await Promise.all([
    fetchRecentRows('analytics_events', { fromIso: todayStart.toISOString(), limit: 20000 }),
    fetchRecentRows('analytics_events', { fromIso: yesterdayStart.toISOString(), limit: 20000 }),
    countRowsSince('profiles', todayStart.toISOString()),
    countRowsSince('profiles', yesterdayStart.toISOString()),
    countRowsSince('prediction_votes', todayStart.toISOString()),
    countRowsSince('prediction_votes', yesterdayStart.toISOString()),
    countRowsSince('community_posts', todayStart.toISOString()),
    countRowsSince('community_posts', yesterdayStart.toISOString()),
    fetchRecentRows('credit_transactions', { fromIso: todayStart.toISOString(), limit: 5000 }),
    fetchRecentRows('credit_transactions', { fromIso: yesterdayStart.toISOString(), limit: 5000 }),
    fetchRecentRows('credit_transactions', { fromIso: todayStart.toISOString(), limit: 5000 }),
    fetchRecentRows('credit_transactions', { fromIso: yesterdayStart.toISOString(), limit: 5000 }),
  ]);

  const inToday = (row: Record<string, any>) => {
    const date = new Date(String(row.created_at || row.updated_at || 0));
    return !Number.isNaN(date.getTime()) && date.getTime() >= todayStart.getTime();
  };
  const inYesterday = (row: Record<string, any>) => {
    const date = new Date(String(row.created_at || row.updated_at || 0));
    return !Number.isNaN(date.getTime()) && date.getTime() >= yesterdayStart.getTime() && date.getTime() < todayStart.getTime();
  };

  const dauToday = new Set(dauTodayRows.filter(inToday).map((row) => row.user_id).filter(Boolean)).size;
  const dauYesterday = new Set(dauYesterdayRows.filter(inYesterday).map((row) => row.user_id).filter(Boolean)).size;
  const signupsYesterdayActual = Math.max(0, signupsYesterday - signupsToday);
  const votesYesterdayActual = Math.max(0, votesYesterday - votesToday);
  const postsYesterdayActual = Math.max(0, postsYesterday - postsToday);
  const issuedToday = issuedTodayRows
    .filter((row) => inToday(row) && ['bonus', 'purchase', 'subscription_bonus', 'admin_grant'].includes(String(row.type || '')))
    .reduce((sum, row) => sum + Math.max(0, toNum(row.amount)), 0);
  const issuedYesterday = issuedYesterdayRows
    .filter((row) => inYesterday(row) && ['bonus', 'purchase', 'subscription_bonus', 'admin_grant'].includes(String(row.type || '')))
    .reduce((sum, row) => sum + Math.max(0, toNum(row.amount)), 0);
  const spentToday = spentTodayRows
    .filter((row) => inToday(row) && String(row.type || '') === 'spend')
    .reduce((sum, row) => sum + Math.abs(toNum(row.amount)), 0);
  const spentYesterday = spentYesterdayRows
    .filter((row) => inYesterday(row) && String(row.type || '') === 'spend')
    .reduce((sum, row) => sum + Math.abs(toNum(row.amount)), 0);

  return {
    dau: toComparisonMetric(dauToday, dauYesterday),
    signups: toComparisonMetric(signupsToday, signupsYesterdayActual),
    votes: toComparisonMetric(votesToday, votesYesterdayActual),
    posts: toComparisonMetric(postsToday, postsYesterdayActual),
    credits_issued: toComparisonMetric(Math.round(issuedToday), Math.round(issuedYesterday)),
    credits_spent: toComparisonMetric(Math.round(spentToday), Math.round(spentYesterday)),
  };
}

/** 유저 상세 프로필 조회 */
export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const { data, error } = await supabase.rpc('admin_get_user_detail', {
    p_user_id: userId,
  });
  if (!error && data) {
    return data as AdminUserDetail;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const [profileRows, creditRows, txRows, statsRows, badgeRows, voteRows, activityRows] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).limit(1),
    supabase.from('user_credits').select('*').eq('user_id', userId).limit(1),
    fetchRecentRows('credit_transactions', { userId, limit: 20 }),
    supabase.from('prediction_user_stats').select('*').eq('user_id', userId).limit(1),
    fetchRecentRows('user_badges', { userId, limit: 20 }),
    fetchRecentRows('prediction_votes', { userId, limit: 20 }),
    fetchRecentRows('analytics_events', { userId, limit: 20 }),
  ]);

  const profile = ((profileRows as any).data?.[0] || {}) as Record<string, any>;
  const credits = ((creditRows as any).data?.[0] || {}) as Record<string, any>;
  const stats = ((statsRows as any).data?.[0] || {}) as Record<string, any>;
  const createdAt = normalizeIso(profile.created_at ?? profile.updated_at);

  const totalVotes = toNum(stats.total_votes, voteRows.length);
  const correctVotes = toNum(
    stats.correct_votes,
    voteRows.filter((row) => row.is_correct === true).length,
  );
  const accuracyRate = totalVotes > 0
    ? Math.round((correctVotes / Math.max(totalVotes, 1)) * 10000) / 10000
    : null;

  return {
    profile: {
      id: userId,
      email: profile.email || null,
      plan_type: profile.plan_type || 'free',
      tier: profile.tier || 'SILVER',
      total_assets: toNum(profile.total_assets ?? profile.verified_total_assets),
      created_at: createdAt,
      is_banned: Boolean(profile.is_banned),
      banned_at: profile.banned_at ? normalizeIso(profile.banned_at, createdAt) : null,
      ban_reason: profile.ban_reason || null,
      display_name: profile.display_name || profile.full_name || null,
    },
    credits: {
      balance: toNum(credits.balance),
      recent_transactions: txRows.map((row) => ({
        type: String(row.type || 'unknown'),
        amount: toNum(row.amount),
        description: row.description || null,
        created_at: normalizeIso(row.created_at ?? row.updated_at, createdAt),
      })),
    },
    badges: badgeRows.map((row) => ({
      badge_id: String(row.badge_id || row.id || 'UNKNOWN'),
      earned_at: normalizeIso(row.earned_at ?? row.created_at, createdAt),
    })),
    predictions: {
      accuracy_rate: accuracyRate,
      total_votes: totalVotes,
      correct_votes: correctVotes,
      current_streak: toNum(stats.current_streak ?? profile.current_streak),
      best_streak: toNum(stats.best_streak ?? profile.longest_streak),
      recent_votes: voteRows.map((row) => ({
        question_id: String(row.question_id || row.poll_id || row.id || ''),
        choice: String(row.choice || row.vote || ''),
        is_correct: typeof row.is_correct === 'boolean' ? row.is_correct : null,
        created_at: normalizeIso(row.created_at ?? row.updated_at, createdAt),
      })),
    },
    streak: {
      current_streak: toNum(profile.current_streak),
      longest_streak: toNum(profile.longest_streak),
      last_active_date: profile.last_active_date || null,
    },
    recent_activities: activityRows.map((row) => ({
      event_name: String(row.event_name || 'unknown_event'),
      properties: row.properties && typeof row.properties === 'object' ? row.properties : null,
      created_at: normalizeIso(row.created_at ?? row.updated_at, createdAt),
    })),
  };
}

/** 유저 차단/해제 토글 */
export async function adminBanUser(params: {
  userId: string;
  reason?: string;
}): Promise<BanUserResult> {
  const { data, error } = await supabase.rpc('admin_ban_user', {
    p_user_id: params.userId,
    p_reason: params.reason || null,
  });
  if (!error && data) {
    return data as BanUserResult;
  }

  if (error && !isSchemaError(error.message)) {
    throw new Error(error.message);
  }

  const { data: row, error: rowErr } = await supabase
    .from('profiles')
    .select('is_banned')
    .eq('id', params.userId)
    .maybeSingle();
  if (rowErr) throw new Error(rowErr.message);

  const nextBanned = !Boolean(row?.is_banned);
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      is_banned: nextBanned,
      banned_at: nextBanned ? new Date().toISOString() : null,
      ban_reason: nextBanned ? (params.reason || null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.userId);
  if (updateErr) throw new Error(updateErr.message);

  return {
    success: true,
    is_banned: nextBanned,
    user_id: params.userId,
  };
}
