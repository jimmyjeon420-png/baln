-- ============================================
-- Admin Dashboard Infrastructure
-- 관리자 대시보드를 위한 테이블 및 RPC 함수
-- 2026-02-13
-- ============================================

-- ============================================
-- 1. Admin Users Table (관리자 명단)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_self_read" ON admin_users
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- 2. Admin Check Function
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

-- ============================================
-- 3. Dashboard Overview RPC
-- 매일 확인할 핵심 KPI 한 방에 조회
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_total_users BIGINT;
  v_dau BIGINT;
  v_wau BIGINT;
  v_new_today BIGINT;
  v_new_this_week BIGINT;
  v_premium_count BIGINT;
  v_total_credits NUMERIC;
  v_credits_issued_today NUMERIC;
  v_credits_spent_today NUMERIC;
  v_predictions_today BIGINT;
  v_posts_today BIGINT;
  v_pending_reports BIGINT;
  v_ever_active BIGINT;
  v_churn_risk BIGINT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- User counts
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(*) INTO v_new_today
    FROM profiles WHERE created_at >= CURRENT_DATE;
  SELECT COUNT(*) INTO v_new_this_week
    FROM profiles WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE);
  SELECT COUNT(*) INTO v_premium_count
    FROM profiles WHERE plan_type = 'premium';

  -- Activity (DAU / WAU)
  SELECT COUNT(DISTINCT user_id) INTO v_dau
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE AND user_id IS NOT NULL;

  SELECT COUNT(DISTINCT user_id) INTO v_wau
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND user_id IS NOT NULL;

  -- Credits
  SELECT COALESCE(SUM(balance), 0) INTO v_total_credits FROM user_credits;

  SELECT COALESCE(SUM(amount), 0) INTO v_credits_issued_today
    FROM credit_transactions
    WHERE type IN ('bonus', 'purchase', 'subscription_bonus')
      AND created_at >= CURRENT_DATE;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_credits_spent_today
    FROM credit_transactions
    WHERE type = 'spend' AND created_at >= CURRENT_DATE;

  -- Engagement
  SELECT COUNT(*) INTO v_predictions_today
    FROM prediction_votes WHERE created_at >= CURRENT_DATE;
  SELECT COUNT(*) INTO v_posts_today
    FROM community_posts WHERE created_at >= CURRENT_DATE;
  SELECT COUNT(*) INTO v_pending_reports
    FROM community_reports WHERE status = 'pending';

  -- Churn risk (활동 이력 있으나 최근 7일 미접속)
  SELECT COUNT(DISTINCT user_id) INTO v_ever_active
    FROM analytics_events WHERE user_id IS NOT NULL;
  v_churn_risk := GREATEST(0, v_ever_active - v_wau);

  result := jsonb_build_object(
    'total_users', v_total_users,
    'dau', v_dau,
    'wau', v_wau,
    'new_today', v_new_today,
    'new_this_week', v_new_this_week,
    'premium_count', v_premium_count,
    'total_credits_balance', v_total_credits,
    'credits_issued_today', v_credits_issued_today,
    'credits_spent_today', v_credits_spent_today,
    'predictions_today', v_predictions_today,
    'posts_today', v_posts_today,
    'pending_reports', v_pending_reports,
    'churn_risk_count', v_churn_risk
  );

  RETURN result;
END;
$$;

-- ============================================
-- 4. User List RPC (유저 목록 + 검색)
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_user_list(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_users JSONB;
  v_total BIGINT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 총 유저 수 (검색 필터 적용)
  IF p_search IS NOT NULL AND p_search != '' THEN
    SELECT COUNT(*) INTO v_total
      FROM profiles WHERE email ILIKE '%' || p_search || '%';
  ELSE
    SELECT COUNT(*) INTO v_total FROM profiles;
  END IF;

  -- 유저 목록 + 부가 정보 조인
  WITH user_data AS (
    SELECT
      p.id,
      p.email,
      p.plan_type,
      p.tier,
      p.total_assets,
      p.created_at,
      COALESCE(uc.balance, 0) AS credit_balance,
      pus.accuracy_rate AS prediction_accuracy,
      COALESCE(pus.total_votes, 0) AS total_votes,
      (
        SELECT MAX(ae.created_at)
        FROM analytics_events ae
        WHERE ae.user_id = p.id
      ) AS last_active
    FROM profiles p
    LEFT JOIN user_credits uc ON uc.user_id = p.id
    LEFT JOIN prediction_user_stats pus ON pus.user_id = p.id
    WHERE (p_search IS NULL OR p_search = '' OR p.email ILIKE '%' || p_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(row_to_json(user_data)::jsonb), '[]'::jsonb)
  INTO v_users
  FROM user_data;

  result := jsonb_build_object(
    'users', v_users,
    'total_count', v_total
  );

  RETURN result;
END;
$$;

-- ============================================
-- 5. Retention & Distribution RPC
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_total_signups BIGINT;
  v_d1_retained BIGINT;
  v_d7_retained BIGINT;
  v_d30_retained BIGINT;
  v_d7_eligible BIGINT;
  v_d30_eligible BIGINT;
  v_d1 NUMERIC;
  v_d7 NUMERIC;
  v_d30 NUMERIC;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- D1: 가입 다음날 복귀한 유저
  SELECT COUNT(*) INTO v_total_signups
    FROM profiles WHERE created_at < CURRENT_DATE;

  SELECT COUNT(DISTINCT p.id) INTO v_d1_retained
    FROM profiles p
    WHERE p.created_at < CURRENT_DATE
      AND EXISTS (
        SELECT 1 FROM analytics_events ae
        WHERE ae.user_id = p.id
          AND ae.created_at::date = (p.created_at::date + INTERVAL '1 day')::date
      );

  -- D7: 가입 7일 후 복귀한 유저
  SELECT COUNT(*) INTO v_d7_eligible
    FROM profiles WHERE created_at < CURRENT_DATE - INTERVAL '7 days';

  SELECT COUNT(DISTINCT p.id) INTO v_d7_retained
    FROM profiles p
    WHERE p.created_at < CURRENT_DATE - INTERVAL '7 days'
      AND EXISTS (
        SELECT 1 FROM analytics_events ae
        WHERE ae.user_id = p.id
          AND ae.created_at >= p.created_at + INTERVAL '7 days'
          AND ae.created_at < p.created_at + INTERVAL '8 days'
      );

  -- D30: 가입 30일 후 복귀한 유저
  SELECT COUNT(*) INTO v_d30_eligible
    FROM profiles WHERE created_at < CURRENT_DATE - INTERVAL '30 days';

  SELECT COUNT(DISTINCT p.id) INTO v_d30_retained
    FROM profiles p
    WHERE p.created_at < CURRENT_DATE - INTERVAL '30 days'
      AND EXISTS (
        SELECT 1 FROM analytics_events ae
        WHERE ae.user_id = p.id
          AND ae.created_at >= p.created_at + INTERVAL '30 days'
          AND ae.created_at < p.created_at + INTERVAL '31 days'
      );

  -- % 계산
  v_d1 := CASE WHEN v_total_signups > 0
    THEN ROUND(v_d1_retained::numeric / v_total_signups * 100, 1) ELSE 0 END;
  v_d7 := CASE WHEN v_d7_eligible > 0
    THEN ROUND(v_d7_retained::numeric / v_d7_eligible * 100, 1) ELSE 0 END;
  v_d30 := CASE WHEN v_d30_eligible > 0
    THEN ROUND(v_d30_retained::numeric / v_d30_eligible * 100, 1) ELSE 0 END;

  result := jsonb_build_object(
    'd1_retention', v_d1,
    'd7_retention', v_d7,
    'd30_retention', v_d30,
    'd1_count', v_d1_retained,
    'd7_count', v_d7_retained,
    'd30_count', v_d30_retained,
    'total_signups', v_total_signups,
    'tier_distribution', (
      SELECT COALESCE(jsonb_object_agg(tier, cnt), '{}'::jsonb)
      FROM (SELECT tier, COUNT(*) as cnt FROM profiles GROUP BY tier) t
    ),
    'plan_distribution', (
      SELECT COALESCE(jsonb_object_agg(plan_type, cnt), '{}'::jsonb)
      FROM (SELECT plan_type, COUNT(*) as cnt FROM profiles GROUP BY plan_type) t
    ),
    'bracket_distribution', (
      SELECT COALESCE(jsonb_object_agg(bracket, cnt), '{}'::jsonb)
      FROM (
        SELECT
          CASE
            WHEN total_assets < 10000000 THEN 'B1'
            WHEN total_assets < 30000000 THEN 'B2'
            WHEN total_assets < 50000000 THEN 'B3'
            WHEN total_assets < 100000000 THEN 'B4'
            ELSE 'B5'
          END as bracket,
          COUNT(*) as cnt
        FROM profiles GROUP BY bracket
      ) t
    ),
    'daily_signups_7d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('date', d::date, 'count', COALESCE(c, 0))
        ORDER BY d
      ), '[]'::jsonb)
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'
      ) AS d
      LEFT JOIN (
        SELECT created_at::date as signup_date, COUNT(*) as c
        FROM profiles
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY signup_date
      ) s ON s.signup_date = d::date
    ),
    'daily_dau_7d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('date', d::date, 'count', COALESCE(c, 0))
        ORDER BY d
      ), '[]'::jsonb)
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'
      ) AS d
      LEFT JOIN (
        SELECT created_at::date as event_date, COUNT(DISTINCT user_id) as c
        FROM analytics_events
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
          AND user_id IS NOT NULL
        GROUP BY event_date
      ) s ON s.event_date = d::date
    )
  );

  RETURN result;
END;
$$;

-- ============================================
-- 6. Recent Activity RPC (최근 활동 피드)
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_recent_activity(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      ae.event_name,
      ae.properties,
      ae.user_id,
      p.email,
      ae.created_at
    FROM analytics_events ae
    LEFT JOIN profiles p ON p.id = ae.user_id
    ORDER BY ae.created_at DESC
    LIMIT p_limit
  ) t;

  RETURN result;
END;
$$;

-- ============================================
-- SETUP: 관리자 등록 방법
-- Supabase SQL Editor에서 실행:
--
-- INSERT INTO admin_users (user_id)
-- VALUES ('여기에_본인_auth_user_id');
--
-- user_id 확인법:
-- SELECT id, email FROM auth.users WHERE email = '본인이메일';
-- ============================================
