-- ============================================
-- Admin Dashboard Enhanced Features
-- 어드민 대시보드 고도화 — 비교 지표, 유저 상세, 차단 기능
-- 2026-02-14
-- ============================================

-- ============================================
-- 0. profiles 테이블에 차단 관련 컬럼 추가
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- ============================================
-- 1. admin_get_daily_comparison() — 어제 vs 오늘 비교
-- 6개 지표: DAU, 신규가입, 예측투표, 게시글, 크레딧발행, 크레딧소비
-- 각 지표별 {today, yesterday, delta} 반환
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_daily_comparison()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_dau_today BIGINT;
  v_dau_yesterday BIGINT;
  v_signups_today BIGINT;
  v_signups_yesterday BIGINT;
  v_votes_today BIGINT;
  v_votes_yesterday BIGINT;
  v_posts_today BIGINT;
  v_posts_yesterday BIGINT;
  v_credits_issued_today NUMERIC;
  v_credits_issued_yesterday NUMERIC;
  v_credits_spent_today NUMERIC;
  v_credits_spent_yesterday NUMERIC;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- DAU
  SELECT COUNT(DISTINCT user_id) INTO v_dau_today
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE AND user_id IS NOT NULL;

  SELECT COUNT(DISTINCT user_id) INTO v_dau_yesterday
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE
      AND user_id IS NOT NULL;

  -- 신규 가입
  SELECT COUNT(*) INTO v_signups_today
    FROM profiles WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_signups_yesterday
    FROM profiles WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE;

  -- 예측 투표
  SELECT COUNT(*) INTO v_votes_today
    FROM prediction_votes WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_votes_yesterday
    FROM prediction_votes WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE;

  -- 게시글
  SELECT COUNT(*) INTO v_posts_today
    FROM community_posts WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_posts_yesterday
    FROM community_posts WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE;

  -- 크레딧 발행
  SELECT COALESCE(SUM(amount), 0) INTO v_credits_issued_today
    FROM credit_transactions
    WHERE type IN ('bonus', 'purchase', 'subscription_bonus')
      AND created_at >= CURRENT_DATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_credits_issued_yesterday
    FROM credit_transactions
    WHERE type IN ('bonus', 'purchase', 'subscription_bonus')
      AND created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE;

  -- 크레딧 소비
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_credits_spent_today
    FROM credit_transactions
    WHERE type = 'spend' AND created_at >= CURRENT_DATE;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_credits_spent_yesterday
    FROM credit_transactions
    WHERE type = 'spend'
      AND created_at >= CURRENT_DATE - INTERVAL '1 day'
      AND created_at < CURRENT_DATE;

  result := jsonb_build_object(
    'dau', jsonb_build_object(
      'today', v_dau_today,
      'yesterday', v_dau_yesterday,
      'delta', v_dau_today - v_dau_yesterday
    ),
    'signups', jsonb_build_object(
      'today', v_signups_today,
      'yesterday', v_signups_yesterday,
      'delta', v_signups_today - v_signups_yesterday
    ),
    'votes', jsonb_build_object(
      'today', v_votes_today,
      'yesterday', v_votes_yesterday,
      'delta', v_votes_today - v_votes_yesterday
    ),
    'posts', jsonb_build_object(
      'today', v_posts_today,
      'yesterday', v_posts_yesterday,
      'delta', v_posts_today - v_posts_yesterday
    ),
    'credits_issued', jsonb_build_object(
      'today', v_credits_issued_today,
      'yesterday', v_credits_issued_yesterday,
      'delta', v_credits_issued_today - v_credits_issued_yesterday
    ),
    'credits_spent', jsonb_build_object(
      'today', v_credits_spent_today,
      'yesterday', v_credits_spent_yesterday,
      'delta', v_credits_spent_today - v_credits_spent_yesterday
    )
  );

  RETURN result;
END;
$$;

-- ============================================
-- 2. admin_get_user_detail(p_user_id) — 유저 상세 프로필
-- 프로필 + 크레딧 + 뱃지 + 예측 통계 + 스트릭 + 최근 활동
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_user_detail(p_user_id UUID)
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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 프로필 기본정보
  SELECT jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'plan_type', p.plan_type,
    'tier', p.tier,
    'total_assets', p.total_assets,
    'created_at', p.created_at,
    'is_banned', COALESCE(p.is_banned, false),
    'banned_at', p.banned_at,
    'ban_reason', p.ban_reason,
    'display_name', p.display_name
  ) INTO v_profile
  FROM profiles p
  WHERE p.id = p_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- 크레딧 잔액 + 최근 거래 내역
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
      FROM credit_transactions ct
      WHERE ct.user_id = p_user_id
      ORDER BY ct.created_at DESC
      LIMIT 10
    )
  ) INTO v_credits
  FROM user_credits uc
  WHERE uc.user_id = p_user_id;

  IF v_credits IS NULL THEN
    v_credits := jsonb_build_object('balance', 0, 'recent_transactions', '[]'::jsonb);
  END IF;

  -- 뱃지
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'badge_id', ub.badge_id,
      'earned_at', ub.earned_at
    ) ORDER BY ub.earned_at DESC
  ), '[]'::jsonb)
  INTO v_badges
  FROM user_badges ub
  WHERE ub.user_id = p_user_id;

  -- 예측 통계 + 최근 기록
  SELECT jsonb_build_object(
    'accuracy_rate', pus.accuracy_rate,
    'total_votes', COALESCE(pus.total_votes, 0),
    'correct_votes', COALESCE(pus.correct_votes, 0),
    'current_streak', COALESCE(pus.current_streak, 0),
    'best_streak', COALESCE(pus.best_streak, 0),
    'recent_votes', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'question_id', pv.question_id,
          'choice', pv.choice,
          'is_correct', pv.is_correct,
          'created_at', pv.created_at
        ) ORDER BY pv.created_at DESC
      ), '[]'::jsonb)
      FROM prediction_votes pv
      WHERE pv.user_id = p_user_id
      ORDER BY pv.created_at DESC
      LIMIT 10
    )
  ) INTO v_predictions
  FROM prediction_user_stats pus
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

  -- 스트릭 정보
  SELECT jsonb_build_object(
    'current_streak', COALESCE(p.current_streak, 0),
    'longest_streak', COALESCE(p.longest_streak, 0),
    'last_active_date', p.last_active_date
  ) INTO v_streak
  FROM profiles p
  WHERE p.id = p_user_id;

  -- 최근 활동 (analytics_events)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'event_name', ae.event_name,
      'properties', ae.properties,
      'created_at', ae.created_at
    ) ORDER BY ae.created_at DESC
  ), '[]'::jsonb)
  INTO v_recent_activities
  FROM analytics_events ae
  WHERE ae.user_id = p_user_id
  ORDER BY ae.created_at DESC
  LIMIT 20;

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

-- ============================================
-- 3. admin_ban_user(p_user_id, p_reason) — 유저 차단/해제 토글
-- is_banned 토글 + 감사 로그 기록
-- 자기 자신 및 다른 관리자 차단 방지
-- ============================================
CREATE OR REPLACE FUNCTION admin_ban_user(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_banned BOOLEAN;
  v_new_banned BOOLEAN;
  v_admin_id UUID;
  v_admin_email TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  v_admin_id := auth.uid();

  -- 자기 자신 차단 방지
  IF p_user_id = v_admin_id THEN
    RETURN jsonb_build_object('success', false, 'error', '자기 자신을 차단할 수 없습니다.');
  END IF;

  -- 다른 관리자 차단 방지
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '다른 관리자를 차단할 수 없습니다.');
  END IF;

  -- 현재 상태 확인
  SELECT COALESCE(is_banned, false) INTO v_current_banned
    FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '유저를 찾을 수 없습니다.');
  END IF;

  -- 토글
  v_new_banned := NOT v_current_banned;

  IF v_new_banned THEN
    UPDATE profiles
    SET is_banned = true,
        banned_at = NOW(),
        ban_reason = p_reason
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET is_banned = false,
        banned_at = NULL,
        ban_reason = NULL
    WHERE id = p_user_id;
  END IF;

  -- 관리자 이메일 조회
  SELECT email INTO v_admin_email FROM profiles WHERE id = v_admin_id;

  -- 감사 로그 기록
  INSERT INTO analytics_events (user_id, event_name, properties, created_at)
  VALUES (
    v_admin_id,
    CASE WHEN v_new_banned THEN 'admin_ban_user' ELSE 'admin_unban_user' END,
    jsonb_build_object(
      'target_user_id', p_user_id,
      'reason', p_reason,
      'admin_email', v_admin_email
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'is_banned', v_new_banned,
    'user_id', p_user_id
  );
END;
$$;
