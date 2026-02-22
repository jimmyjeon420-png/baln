-- ============================================================================
-- Admin Contract Refresh (운영 호환 패치)
-- 목적:
-- 1) 관리자 화면이 기대하는 최소 스키마(컬럼/테이블) 보장
-- 2) 관리자 RPC 집합을 최신 계약으로 재생성
-- 날짜: 2026-02-22
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) 관리자 명단 테이블 + 관리자 체크 함수
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_users'
      AND policyname = 'admin_users_self_read'
  ) THEN
    CREATE POLICY admin_users_self_read
      ON public.admin_users
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- 1) 관리자 화면에 필요한 최소 컬럼 보장
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- profiles
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'SILVER';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_assets NUMERIC DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date DATE;
  END IF;

  -- analytics_events
  IF to_regclass('public.analytics_events') IS NULL THEN
    CREATE TABLE public.analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_name TEXT NOT NULL,
      properties JSONB DEFAULT '{}'::jsonb,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS event_name TEXT;
    ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS user_id UUID;
  END IF;

  -- community_reports
  IF to_regclass('public.community_reports') IS NULL THEN
    CREATE TABLE public.community_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL DEFAULT 'post',
      target_id UUID NOT NULL,
      reason TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS reporter_id UUID;
    ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'post';
    ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS target_id UUID;
    ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- community_posts
  IF to_regclass('public.community_posts') IS NOT NULL THEN
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS display_tag TEXT;
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'stocks';
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
    ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
  END IF;

  -- gatherings
  IF to_regclass('public.gatherings') IS NOT NULL THEN
    ALTER TABLE public.gatherings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.gatherings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.gatherings ADD COLUMN IF NOT EXISTS host_display_name TEXT;
    ALTER TABLE public.gatherings ADD COLUMN IF NOT EXISTS host_tier TEXT DEFAULT 'SILVER';
    ALTER TABLE public.gatherings ADD COLUMN IF NOT EXISTS min_tier_required TEXT DEFAULT 'SILVER';
    ALTER TABLE public.gatherings ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'offline';
    ALTER TABLE public.gatherings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
    ALTER TABLE public.gatherings ADD COLUMN IF NOT EXISTS current_capacity INTEGER DEFAULT 0;
  END IF;

  -- user_credits
  IF to_regclass('public.user_credits') IS NULL THEN
    CREATE TABLE public.user_credits (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;
  END IF;

  -- credit_transactions
  IF to_regclass('public.credit_transactions') IS NOT NULL THEN
    ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'bonus';
    ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0;
    ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS balance_after INTEGER DEFAULT 0;
    ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS description TEXT;
  END IF;

  -- prediction_votes
  IF to_regclass('public.prediction_votes') IS NOT NULL THEN
    ALTER TABLE public.prediction_votes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.prediction_votes ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.prediction_votes ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
    ALTER TABLE public.prediction_votes ADD COLUMN IF NOT EXISTS vote TEXT;
    ALTER TABLE public.prediction_votes ADD COLUMN IF NOT EXISTS poll_id UUID;
    ALTER TABLE public.prediction_votes ADD COLUMN IF NOT EXISTS choice TEXT;
    ALTER TABLE public.prediction_votes ADD COLUMN IF NOT EXISTS question_id UUID;
  END IF;

  -- prediction_user_stats
  IF to_regclass('public.prediction_user_stats') IS NULL THEN
    CREATE TABLE public.prediction_user_stats (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      total_votes INTEGER NOT NULL DEFAULT 0,
      correct_votes INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      accuracy_rate NUMERIC(7, 4) DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    ALTER TABLE public.prediction_user_stats ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0;
    ALTER TABLE public.prediction_user_stats ADD COLUMN IF NOT EXISTS correct_votes INTEGER DEFAULT 0;
    ALTER TABLE public.prediction_user_stats ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
    ALTER TABLE public.prediction_user_stats ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;
    ALTER TABLE public.prediction_user_stats ADD COLUMN IF NOT EXISTS accuracy_rate NUMERIC(7, 4) DEFAULT 0;
    ALTER TABLE public.prediction_user_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- user_badges
  IF to_regclass('public.user_badges') IS NULL THEN
    CREATE TABLE public.user_badges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      badge_id TEXT NOT NULL,
      earned_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    ALTER TABLE public.user_badges ADD COLUMN IF NOT EXISTS badge_id TEXT;
    ALTER TABLE public.user_badges ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END
$$;

-- profiles created_at/email 백필
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    UPDATE public.profiles p
    SET
      created_at = COALESCE(p.created_at, u.created_at, NOW()),
      email = COALESCE(NULLIF(p.email, ''), u.email)
    FROM auth.users u
    WHERE p.id = u.id;

    UPDATE public.profiles
    SET created_at = COALESCE(created_at, NOW())
    WHERE created_at IS NULL;
  END IF;
END
$$;

-- prediction_votes 호환 동기화 트리거
CREATE OR REPLACE FUNCTION public.admin_sync_prediction_votes_compat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.choice := COALESCE(NEW.choice, NEW.vote);
  NEW.question_id := COALESCE(NEW.question_id, NEW.poll_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_sync_prediction_votes_compat ON public.prediction_votes;
CREATE TRIGGER trg_admin_sync_prediction_votes_compat
BEFORE INSERT OR UPDATE ON public.prediction_votes
FOR EACH ROW
EXECUTE FUNCTION public.admin_sync_prediction_votes_compat();

-- ----------------------------------------------------------------------------
-- 2) 관리자 RPC 재생성
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_total_users BIGINT := 0;
  v_dau BIGINT := 0;
  v_wau BIGINT := 0;
  v_new_today BIGINT := 0;
  v_new_this_week BIGINT := 0;
  v_premium_count BIGINT := 0;
  v_total_credits NUMERIC := 0;
  v_credits_issued_today NUMERIC := 0;
  v_credits_spent_today NUMERIC := 0;
  v_predictions_today BIGINT := 0;
  v_posts_today BIGINT := 0;
  v_pending_reports BIGINT := 0;
  v_ever_active BIGINT := 0;
  v_churn_risk BIGINT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_new_today FROM public.profiles WHERE created_at >= CURRENT_DATE;
  SELECT COUNT(*) INTO v_new_this_week FROM public.profiles WHERE created_at >= date_trunc('week', CURRENT_DATE);
  SELECT COUNT(*) INTO v_premium_count FROM public.profiles WHERE COALESCE(plan_type, 'free') = 'premium';

  SELECT COUNT(DISTINCT user_id) INTO v_dau
  FROM public.analytics_events
  WHERE created_at >= CURRENT_DATE AND user_id IS NOT NULL;

  SELECT COUNT(DISTINCT user_id) INTO v_wau
  FROM public.analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND user_id IS NOT NULL;

  SELECT COALESCE(SUM(balance), 0) INTO v_total_credits FROM public.user_credits;

  SELECT COALESCE(SUM(amount), 0) INTO v_credits_issued_today
  FROM public.credit_transactions
  WHERE type IN ('bonus', 'purchase', 'subscription_bonus')
    AND created_at >= CURRENT_DATE;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_credits_spent_today
  FROM public.credit_transactions
  WHERE type = 'spend'
    AND created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_predictions_today FROM public.prediction_votes WHERE created_at >= CURRENT_DATE;
  SELECT COUNT(*) INTO v_posts_today FROM public.community_posts WHERE created_at >= CURRENT_DATE;
  SELECT COUNT(*) INTO v_pending_reports FROM public.community_reports WHERE COALESCE(status, 'pending') = 'pending';

  SELECT COUNT(DISTINCT user_id) INTO v_ever_active
  FROM public.analytics_events
  WHERE user_id IS NOT NULL;

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

CREATE OR REPLACE FUNCTION public.admin_get_user_list(
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_search IS NOT NULL AND p_search <> '' THEN
    SELECT COUNT(*)
    INTO v_total
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE COALESCE(NULLIF(p.email, ''), u.email, '') ILIKE '%' || p_search || '%';
  ELSE
    SELECT COUNT(*) INTO v_total FROM public.profiles;
  END IF;

  WITH user_data AS (
    SELECT
      p.id,
      COALESCE(NULLIF(p.email, ''), u.email) AS email,
      COALESCE(p.plan_type, 'free') AS plan_type,
      COALESCE(p.tier, 'SILVER') AS tier,
      COALESCE(p.total_assets, 0) AS total_assets,
      p.created_at,
      COALESCE(uc.balance, 0) AS credit_balance,
      pus.accuracy_rate AS prediction_accuracy,
      COALESCE(pus.total_votes, 0) AS total_votes,
      (
        SELECT MAX(ae.created_at)
        FROM public.analytics_events ae
        WHERE ae.user_id = p.id
      ) AS last_active
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.user_credits uc ON uc.user_id = p.id
    LEFT JOIN public.prediction_user_stats pus ON pus.user_id = p.id
    WHERE (p_search IS NULL OR p_search = '' OR COALESCE(NULLIF(p.email, ''), u.email, '') ILIKE '%' || p_search || '%')
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

CREATE OR REPLACE FUNCTION public.admin_get_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_total_signups BIGINT := 0;
  v_d1_retained BIGINT := 0;
  v_d7_retained BIGINT := 0;
  v_d30_retained BIGINT := 0;
  v_d7_eligible BIGINT := 0;
  v_d30_eligible BIGINT := 0;
  v_d1 NUMERIC := 0;
  v_d7 NUMERIC := 0;
  v_d30 NUMERIC := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT COUNT(*) INTO v_total_signups FROM public.profiles WHERE created_at < CURRENT_DATE;

  SELECT COUNT(DISTINCT p.id) INTO v_d1_retained
  FROM public.profiles p
  WHERE p.created_at < CURRENT_DATE
    AND EXISTS (
      SELECT 1
      FROM public.analytics_events ae
      WHERE ae.user_id = p.id
        AND ae.created_at::date = (p.created_at::date + INTERVAL '1 day')::date
    );

  SELECT COUNT(*) INTO v_d7_eligible
  FROM public.profiles
  WHERE created_at < CURRENT_DATE - INTERVAL '7 days';

  SELECT COUNT(DISTINCT p.id) INTO v_d7_retained
  FROM public.profiles p
  WHERE p.created_at < CURRENT_DATE - INTERVAL '7 days'
    AND EXISTS (
      SELECT 1
      FROM public.analytics_events ae
      WHERE ae.user_id = p.id
        AND ae.created_at >= p.created_at + INTERVAL '7 days'
        AND ae.created_at < p.created_at + INTERVAL '8 days'
    );

  SELECT COUNT(*) INTO v_d30_eligible
  FROM public.profiles
  WHERE created_at < CURRENT_DATE - INTERVAL '30 days';

  SELECT COUNT(DISTINCT p.id) INTO v_d30_retained
  FROM public.profiles p
  WHERE p.created_at < CURRENT_DATE - INTERVAL '30 days'
    AND EXISTS (
      SELECT 1
      FROM public.analytics_events ae
      WHERE ae.user_id = p.id
        AND ae.created_at >= p.created_at + INTERVAL '30 days'
        AND ae.created_at < p.created_at + INTERVAL '31 days'
    );

  v_d1 := CASE WHEN v_total_signups > 0 THEN ROUND(v_d1_retained::numeric / v_total_signups * 100, 1) ELSE 0 END;
  v_d7 := CASE WHEN v_d7_eligible > 0 THEN ROUND(v_d7_retained::numeric / v_d7_eligible * 100, 1) ELSE 0 END;
  v_d30 := CASE WHEN v_d30_eligible > 0 THEN ROUND(v_d30_retained::numeric / v_d30_eligible * 100, 1) ELSE 0 END;

  result := jsonb_build_object(
    'd1_retention', v_d1,
    'd7_retention', v_d7,
    'd30_retention', v_d30,
    'd1_count', v_d1_retained,
    'd7_count', v_d7_retained,
    'd30_count', v_d30_retained,
    'total_signups', v_total_signups,
    'tier_distribution', (
      SELECT COALESCE(jsonb_object_agg(tier_key, cnt), '{}'::jsonb)
      FROM (
        SELECT COALESCE(tier, 'SILVER') AS tier_key, COUNT(*) AS cnt
        FROM public.profiles
        GROUP BY COALESCE(tier, 'SILVER')
      ) t
    ),
    'plan_distribution', (
      SELECT COALESCE(jsonb_object_agg(plan_key, cnt), '{}'::jsonb)
      FROM (
        SELECT COALESCE(plan_type, 'free') AS plan_key, COUNT(*) AS cnt
        FROM public.profiles
        GROUP BY COALESCE(plan_type, 'free')
      ) t
    ),
    'bracket_distribution', (
      SELECT COALESCE(jsonb_object_agg(bracket, cnt), '{}'::jsonb)
      FROM (
        SELECT
          CASE
            WHEN COALESCE(total_assets, 0) < 10000000 THEN 'B1'
            WHEN COALESCE(total_assets, 0) < 30000000 THEN 'B2'
            WHEN COALESCE(total_assets, 0) < 50000000 THEN 'B3'
            WHEN COALESCE(total_assets, 0) < 100000000 THEN 'B4'
            ELSE 'B5'
          END AS bracket,
          COUNT(*) AS cnt
        FROM public.profiles
        GROUP BY 1
      ) t
    ),
    'daily_signups_7d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('date', d::date, 'count', COALESCE(c, 0))
        ORDER BY d
      ), '[]'::jsonb)
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d
      LEFT JOIN (
        SELECT created_at::date AS signup_date, COUNT(*) AS c
        FROM public.profiles
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY 1
      ) s ON s.signup_date = d::date
    ),
    'daily_dau_7d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('date', d::date, 'count', COALESCE(c, 0))
        ORDER BY d
      ), '[]'::jsonb)
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d
      LEFT JOIN (
        SELECT created_at::date AS event_date, COUNT(DISTINCT user_id) AS c
        FROM public.analytics_events
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
          AND user_id IS NOT NULL
        GROUP BY 1
      ) s ON s.event_date = d::date
    )
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_recent_activity(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      ae.event_name,
      ae.properties,
      ae.user_id,
      COALESCE(NULLIF(p.email, ''), u.email) AS email,
      ae.created_at
    FROM public.analytics_events ae
    LEFT JOIN public.profiles p ON p.id = ae.user_id
    LEFT JOIN auth.users u ON u.id = ae.user_id
    ORDER BY ae.created_at DESC
    LIMIT p_limit
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_daily_comparison()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_dau_today BIGINT := 0;
  v_dau_yesterday BIGINT := 0;
  v_signups_today BIGINT := 0;
  v_signups_yesterday BIGINT := 0;
  v_votes_today BIGINT := 0;
  v_votes_yesterday BIGINT := 0;
  v_posts_today BIGINT := 0;
  v_posts_yesterday BIGINT := 0;
  v_credits_issued_today NUMERIC := 0;
  v_credits_issued_yesterday NUMERIC := 0;
  v_credits_spent_today NUMERIC := 0;
  v_credits_spent_yesterday NUMERIC := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_dau_today
  FROM public.analytics_events
  WHERE created_at >= CURRENT_DATE AND user_id IS NOT NULL;

  SELECT COUNT(DISTINCT user_id) INTO v_dau_yesterday
  FROM public.analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE
    AND user_id IS NOT NULL;

  SELECT COUNT(*) INTO v_signups_today
  FROM public.profiles
  WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_signups_yesterday
  FROM public.profiles
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE;

  SELECT COUNT(*) INTO v_votes_today
  FROM public.prediction_votes
  WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_votes_yesterday
  FROM public.prediction_votes
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE;

  SELECT COUNT(*) INTO v_posts_today
  FROM public.community_posts
  WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_posts_yesterday
  FROM public.community_posts
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_credits_issued_today
  FROM public.credit_transactions
  WHERE type IN ('bonus', 'purchase', 'subscription_bonus')
    AND created_at >= CURRENT_DATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_credits_issued_yesterday
  FROM public.credit_transactions
  WHERE type IN ('bonus', 'purchase', 'subscription_bonus')
    AND created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_credits_spent_today
  FROM public.credit_transactions
  WHERE type = 'spend'
    AND created_at >= CURRENT_DATE;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_credits_spent_yesterday
  FROM public.credit_transactions
  WHERE type = 'spend'
    AND created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE;

  result := jsonb_build_object(
    'dau', jsonb_build_object('today', v_dau_today, 'yesterday', v_dau_yesterday, 'delta', v_dau_today - v_dau_yesterday),
    'signups', jsonb_build_object('today', v_signups_today, 'yesterday', v_signups_yesterday, 'delta', v_signups_today - v_signups_yesterday),
    'votes', jsonb_build_object('today', v_votes_today, 'yesterday', v_votes_yesterday, 'delta', v_votes_today - v_votes_yesterday),
    'posts', jsonb_build_object('today', v_posts_today, 'yesterday', v_posts_yesterday, 'delta', v_posts_today - v_posts_yesterday),
    'credits_issued', jsonb_build_object('today', v_credits_issued_today, 'yesterday', v_credits_issued_yesterday, 'delta', v_credits_issued_today - v_credits_issued_yesterday),
    'credits_spent', jsonb_build_object('today', v_credits_spent_today, 'yesterday', v_credits_spent_yesterday, 'delta', v_credits_spent_today - v_credits_spent_yesterday)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user_detail(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_profile JSONB;
  v_credits JSONB;
  v_badges JSONB;
  v_predictions JSONB;
  v_recent_activities JSONB;
  v_streak JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'email', COALESCE(NULLIF(p.email, ''), u.email),
    'plan_type', COALESCE(p.plan_type, 'free'),
    'tier', COALESCE(p.tier, 'SILVER'),
    'total_assets', COALESCE(p.total_assets, 0),
    'created_at', p.created_at,
    'is_banned', COALESCE(p.is_banned, false),
    'banned_at', p.banned_at,
    'ban_reason', p.ban_reason,
    'display_name', p.display_name
  ) INTO v_profile
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = p_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  SELECT jsonb_build_object(
    'balance', COALESCE(uc.balance, 0),
    'recent_transactions', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', ct.type,
          'amount', ct.amount,
          'description', ct.description,
          'created_at', ct.created_at
        ) ORDER BY ct.created_at DESC
      ), '[]'::jsonb)
      FROM (
        SELECT *
        FROM public.credit_transactions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) ct
    )
  ) INTO v_credits
  FROM public.user_credits uc
  WHERE uc.user_id = p_user_id;

  IF v_credits IS NULL THEN
    v_credits := jsonb_build_object(
      'balance', 0,
      'recent_transactions', '[]'::jsonb
    );
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'badge_id', ub.badge_id,
      'earned_at', ub.earned_at
    ) ORDER BY ub.earned_at DESC
  ), '[]'::jsonb)
  INTO v_badges
  FROM public.user_badges ub
  WHERE ub.user_id = p_user_id;

  SELECT jsonb_build_object(
    'accuracy_rate', pus.accuracy_rate,
    'total_votes', COALESCE(pus.total_votes, 0),
    'correct_votes', COALESCE(pus.correct_votes, 0),
    'current_streak', COALESCE(pus.current_streak, 0),
    'best_streak', COALESCE(pus.best_streak, 0),
    'recent_votes', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'question_id', COALESCE(pv.question_id, pv.poll_id),
          'choice', COALESCE(pv.choice, pv.vote),
          'is_correct', pv.is_correct,
          'created_at', pv.created_at
        ) ORDER BY pv.created_at DESC
      ), '[]'::jsonb)
      FROM (
        SELECT *
        FROM public.prediction_votes
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) pv
    )
  ) INTO v_predictions
  FROM public.prediction_user_stats pus
  WHERE pus.user_id = p_user_id;

  IF v_predictions IS NULL THEN
    v_predictions := jsonb_build_object(
      'accuracy_rate', null,
      'total_votes', 0,
      'correct_votes', 0,
      'current_streak', 0,
      'best_streak', 0,
      'recent_votes', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'current_streak', COALESCE(p.current_streak, 0),
    'longest_streak', COALESCE(p.longest_streak, 0),
    'last_active_date', p.last_active_date
  ) INTO v_streak
  FROM public.profiles p
  WHERE p.id = p_user_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'event_name', ae.event_name,
      'properties', ae.properties,
      'created_at', ae.created_at
    ) ORDER BY ae.created_at DESC
  ), '[]'::jsonb)
  INTO v_recent_activities
  FROM (
    SELECT *
    FROM public.analytics_events
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 20
  ) ae;

  result := jsonb_build_object(
    'profile', v_profile,
    'credits', v_credits,
    'badges', v_badges,
    'predictions', v_predictions,
    'streak', v_streak,
    'recent_activities', v_recent_activities
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_banned BOOLEAN;
  v_new_banned BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', '본인 계정은 차단할 수 없습니다.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '다른 관리자는 차단할 수 없습니다.');
  END IF;

  SELECT COALESCE(is_banned, false) INTO v_current_banned
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '유저를 찾을 수 없습니다.');
  END IF;

  v_new_banned := NOT v_current_banned;

  UPDATE public.profiles
  SET
    is_banned = v_new_banned,
    banned_at = CASE WHEN v_new_banned THEN NOW() ELSE NULL END,
    ban_reason = CASE WHEN v_new_banned THEN p_reason ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_banned', v_new_banned,
    'user_id', p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_credits(
  p_target_user_id UUID,
  p_amount INTEGER,
  p_memo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', '지급 금액은 1 이상이어야 합니다.');
  END IF;

  INSERT INTO public.user_credits (user_id, balance, updated_at)
  VALUES (p_target_user_id, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    balance = public.user_credits.balance + EXCLUDED.balance,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.credit_transactions (
    user_id, type, amount, balance_after, description, created_at
  ) VALUES (
    p_target_user_id,
    'bonus',
    p_amount,
    v_new_balance,
    COALESCE(p_memo, 'admin_grant'),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', p_target_user_id,
    'granted_amount', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- 라운지 관리 RPC
CREATE OR REPLACE FUNCTION public.admin_get_lounge_posts(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_posts JSONB;
  v_total BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_filter = 'reported' THEN
    SELECT COUNT(DISTINCT cp.id) INTO v_total
    FROM public.community_posts cp
    JOIN public.community_reports cr
      ON cr.target_id = cp.id AND cr.target_type = 'post' AND COALESCE(cr.status, 'pending') = 'pending';
  ELSIF p_filter = 'pinned' THEN
    SELECT COUNT(*) INTO v_total
    FROM public.community_posts cp
    WHERE COALESCE(cp.is_pinned, false) = TRUE;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM public.community_posts cp;
  END IF;

  IF p_filter = 'reported' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb)
    INTO v_posts
    FROM (
      SELECT DISTINCT ON (cp.id) jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', COALESCE(NULLIF(p.email, ''), u.email),
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', COALESCE(cp.likes_count, 0),
        'comments_count', COALESCE(cp.comments_count, 0),
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (
          SELECT COUNT(*)
          FROM public.community_reports cr2
          WHERE cr2.target_id = cp.id
            AND cr2.target_type = 'post'
            AND COALESCE(cr2.status, 'pending') = 'pending'
        )
      ) AS row_data
      FROM public.community_posts cp
      LEFT JOIN public.profiles p ON p.id = cp.user_id
      LEFT JOIN auth.users u ON u.id = cp.user_id
      JOIN public.community_reports cr
        ON cr.target_id = cp.id
       AND cr.target_type = 'post'
       AND COALESCE(cr.status, 'pending') = 'pending'
      LIMIT p_limit OFFSET p_offset
    ) sub;
  ELSIF p_filter = 'pinned' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb)
    INTO v_posts
    FROM (
      SELECT jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', COALESCE(NULLIF(p.email, ''), u.email),
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', COALESCE(cp.likes_count, 0),
        'comments_count', COALESCE(cp.comments_count, 0),
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (
          SELECT COUNT(*)
          FROM public.community_reports cr2
          WHERE cr2.target_id = cp.id
            AND cr2.target_type = 'post'
            AND COALESCE(cr2.status, 'pending') = 'pending'
        )
      ) AS row_data
      FROM public.community_posts cp
      LEFT JOIN public.profiles p ON p.id = cp.user_id
      LEFT JOIN auth.users u ON u.id = cp.user_id
      WHERE COALESCE(cp.is_pinned, false) = TRUE
      ORDER BY cp.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  ELSE
    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'is_pinned')::boolean DESC, row_data->>'created_at' DESC), '[]'::jsonb)
    INTO v_posts
    FROM (
      SELECT jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', COALESCE(NULLIF(p.email, ''), u.email),
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', COALESCE(cp.likes_count, 0),
        'comments_count', COALESCE(cp.comments_count, 0),
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (
          SELECT COUNT(*)
          FROM public.community_reports cr2
          WHERE cr2.target_id = cp.id
            AND cr2.target_type = 'post'
            AND COALESCE(cr2.status, 'pending') = 'pending'
        )
      ) AS row_data
      FROM public.community_posts cp
      LEFT JOIN public.profiles p ON p.id = cp.user_id
      LEFT JOIN auth.users u ON u.id = cp.user_id
      ORDER BY COALESCE(cp.is_pinned, false) DESC, cp.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  END IF;

  result := jsonb_build_object(
    'posts', COALESCE(v_posts, '[]'::jsonb),
    'total_count', COALESCE(v_total, 0)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = p_post_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '게시글을 찾을 수 없습니다.');
  END IF;

  DELETE FROM public.community_reports WHERE target_id = p_post_id AND target_type = 'post';
  DELETE FROM public.community_likes WHERE target_type = 'comment' AND target_id IN (
    SELECT id::text FROM public.community_comments WHERE post_id = p_post_id
  );
  DELETE FROM public.community_comments WHERE post_id = p_post_id;
  DELETE FROM public.community_likes WHERE target_id = p_post_id::text AND target_type = 'post';
  DELETE FROM public.post_bookmarks WHERE post_id = p_post_id;
  DELETE FROM public.community_posts WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_pin_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_pinned BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT COALESCE(is_pinned, false)
  INTO v_current_pinned
  FROM public.community_posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '게시글을 찾을 수 없습니다.');
  END IF;

  UPDATE public.community_posts
  SET is_pinned = NOT v_current_pinned, updated_at = NOW()
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true, 'is_pinned', NOT v_current_pinned);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_gatherings(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_gatherings JSONB;
  v_total BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_filter = 'all' THEN
    SELECT COUNT(*) INTO v_total FROM public.gatherings;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM public.gatherings
    WHERE COALESCE(status, 'open') = p_filter;
  END IF;

  IF p_filter = 'all' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'event_date' DESC), '[]'::jsonb)
    INTO v_gatherings
    FROM (
      SELECT jsonb_build_object(
        'id', g.id,
        'host_id', g.host_id,
        'host_email', COALESCE(NULLIF(p.email, ''), u.email),
        'host_display_name', g.host_display_name,
        'host_tier', COALESCE(g.host_tier, 'SILVER'),
        'title', g.title,
        'description', g.description,
        'category', g.category,
        'entry_fee', g.entry_fee,
        'max_capacity', g.max_capacity,
        'current_capacity', COALESCE(g.current_capacity, 0),
        'event_date', g.event_date,
        'location', g.location,
        'location_type', COALESCE(g.location_type, 'offline'),
        'status', COALESCE(g.status, 'open'),
        'min_tier_required', COALESCE(g.min_tier_required, 'SILVER'),
        'created_at', g.created_at
      ) AS row_data
      FROM public.gatherings g
      LEFT JOIN public.profiles p ON p.id = g.host_id
      LEFT JOIN auth.users u ON u.id = g.host_id
      ORDER BY g.event_date DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  ELSE
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'event_date' DESC), '[]'::jsonb)
    INTO v_gatherings
    FROM (
      SELECT jsonb_build_object(
        'id', g.id,
        'host_id', g.host_id,
        'host_email', COALESCE(NULLIF(p.email, ''), u.email),
        'host_display_name', g.host_display_name,
        'host_tier', COALESCE(g.host_tier, 'SILVER'),
        'title', g.title,
        'description', g.description,
        'category', g.category,
        'entry_fee', g.entry_fee,
        'max_capacity', g.max_capacity,
        'current_capacity', COALESCE(g.current_capacity, 0),
        'event_date', g.event_date,
        'location', g.location,
        'location_type', COALESCE(g.location_type, 'offline'),
        'status', COALESCE(g.status, 'open'),
        'min_tier_required', COALESCE(g.min_tier_required, 'SILVER'),
        'created_at', g.created_at
      ) AS row_data
      FROM public.gatherings g
      LEFT JOIN public.profiles p ON p.id = g.host_id
      LEFT JOIN auth.users u ON u.id = g.host_id
      WHERE COALESCE(g.status, 'open') = p_filter
      ORDER BY g.event_date DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  END IF;

  result := jsonb_build_object(
    'gatherings', COALESCE(v_gatherings, '[]'::jsonb),
    'total_count', COALESCE(v_total, 0)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_gathering(p_gathering_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.gatherings WHERE id = p_gathering_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '모임을 찾을 수 없습니다.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.gatherings
    WHERE id = p_gathering_id AND COALESCE(status, 'open') = 'cancelled'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 취소된 모임입니다.');
  END IF;

  UPDATE public.gatherings
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_gathering_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

