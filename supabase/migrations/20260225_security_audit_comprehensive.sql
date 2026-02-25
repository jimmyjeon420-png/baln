-- =============================================================
-- baln 종합 보안 감사 마이그레이션
-- 날짜: 2026-02-25
--
-- 수정 항목:
--   PART 1: 스키마 보정 (premium_expires_at 컬럼 보장)
--   PART 2: PL/pgSQL 함수 에러 4건 수정
--   PART 3: RLS 미설정 테이블 15건 활성화 + 정책
--   PART 4: 외래키 인덱스 10건 추가
--   PART 5: SECURITY DEFINER 함수 search_path 설정
-- =============================================================


-- =============================================================
-- PART 1: 스키마 보정
-- =============================================================

-- profiles 테이블에 premium_expires_at 컬럼이 없으면 추가
-- (resolve_poll 함수가 이 컬럼을 참조하는데, 실제 DB에 누락됨)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.premium_expires_at IS
  '프리미엄 구독 만료일 (NULL이면 무제한 또는 무료)';


-- =============================================================
-- PART 2: PL/pgSQL 함수 에러 수정
-- =============================================================

-- ----- 2.1 resolve_poll: premium_expires_at 참조 에러 -----
-- Part 1에서 컬럼이 보장되므로, search_path만 추가하여 재생성
CREATE OR REPLACE FUNCTION public.resolve_poll(
  p_poll_id UUID,
  p_correct_answer TEXT,
  p_source TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, voters_rewarded INTEGER, total_credits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll RECORD;
  v_vote RECORD;
  v_rewarded INTEGER := 0;
  v_total_credits INTEGER := 0;
  v_reward INTEGER;
  v_streak_bonus INTEGER;
  v_is_subscriber BOOLEAN;
  v_current_streak INTEGER;
BEGIN
  SELECT * INTO v_poll
  FROM prediction_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;

  IF v_poll.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;

  UPDATE prediction_polls SET
    status = 'resolved',
    correct_answer = p_correct_answer,
    source = p_source,
    resolved_at = NOW()
  WHERE id = p_poll_id;

  FOR v_vote IN
    SELECT pv.id, pv.user_id, pv.vote
    FROM prediction_votes pv
    WHERE pv.poll_id = p_poll_id
  LOOP
    IF v_vote.vote = p_correct_answer THEN
      v_is_subscriber := EXISTS (
        SELECT 1 FROM profiles
        WHERE id = v_vote.user_id
        AND plan_type = 'premium'
        AND (premium_expires_at IS NULL OR premium_expires_at > NOW())
      );

      v_reward := CASE WHEN v_is_subscriber THEN v_poll.reward_credits * 2 ELSE v_poll.reward_credits END;

      SELECT current_streak INTO v_current_streak
      FROM prediction_user_stats
      WHERE user_id = v_vote.user_id;

      v_current_streak := COALESCE(v_current_streak, 0) + 1;
      v_streak_bonus := 0;

      IF v_current_streak = 5 THEN
        v_streak_bonus := 3;
      ELSIF v_current_streak = 10 THEN
        v_streak_bonus := 10;
      END IF;

      v_reward := v_reward + v_streak_bonus;

      UPDATE prediction_votes SET
        is_correct = TRUE,
        credits_earned = v_reward
      WHERE id = v_vote.id;

      PERFORM add_credits(v_vote.user_id, v_reward, 'bonus',
        jsonb_build_object('reward_type', 'prediction_correct', 'poll_id', p_poll_id, 'streak', v_current_streak));

      UPDATE prediction_user_stats SET
        correct_votes = correct_votes + 1,
        current_streak = v_current_streak,
        best_streak = GREATEST(best_streak, v_current_streak),
        total_credits_earned = total_credits_earned + v_reward,
        updated_at = NOW()
      WHERE user_id = v_vote.user_id;

      v_rewarded := v_rewarded + 1;
      v_total_credits := v_total_credits + v_reward;
    ELSE
      UPDATE prediction_votes SET
        is_correct = FALSE,
        credits_earned = 0
      WHERE id = v_vote.id;

      UPDATE prediction_user_stats SET
        current_streak = 0,
        updated_at = NOW()
      WHERE user_id = v_vote.user_id;
    END IF;
  END LOOP;

  RETURN QUERY SELECT TRUE, v_rewarded, v_total_credits;
END;
$$;


-- ----- 2.2 admin_delete_post: text = uuid 타입 캐스팅 -----
-- community_reports.target_id가 TEXT인데 UUID와 직접 비교하여 에러 발생
CREATE OR REPLACE FUNCTION public.admin_delete_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM community_posts WHERE id = p_post_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '게시글을 찾을 수 없습니다.');
  END IF;

  -- target_id(TEXT) = UUID 비교 시 명시적 캐스팅
  DELETE FROM community_reports
  WHERE (target_id = p_post_id::text AND target_type = 'post')
     OR (target_type = 'comment' AND target_id IN (
           SELECT id::text FROM community_comments WHERE post_id = p_post_id
         ));

  DELETE FROM community_posts WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ----- 2.3 admin_get_lounge_posts: text = uuid 타입 캐스팅 -----
CREATE OR REPLACE FUNCTION public.admin_get_lounge_posts(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_posts JSONB;
  v_total BIGINT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 전체 수 카운트 (target_id::text 캐스팅)
  IF p_filter = 'reported' THEN
    SELECT COUNT(DISTINCT cp.id) INTO v_total
    FROM community_posts cp
    INNER JOIN community_reports cr
      ON cr.target_id = cp.id::text
      AND cr.target_type = 'post'
      AND COALESCE(cr.status, 'pending') = 'pending';
  ELSIF p_filter = 'pinned' THEN
    SELECT COUNT(*) INTO v_total
    FROM community_posts cp
    WHERE cp.is_pinned = TRUE;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM community_posts cp;
  END IF;

  -- 게시글 조회
  IF p_filter = 'reported' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb) INTO v_posts
    FROM (
      SELECT DISTINCT ON (cp.id) jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', p.email,
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', cp.likes_count,
        'comments_count', cp.comments_count,
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (SELECT COUNT(*) FROM community_reports cr2 WHERE cr2.target_id = cp.id::text AND cr2.target_type = 'post' AND COALESCE(cr2.status, 'pending') = 'pending')
      ) AS row_data
      FROM community_posts cp
      LEFT JOIN profiles p ON p.id = cp.user_id
      INNER JOIN community_reports cr
        ON cr.target_id = cp.id::text
        AND cr.target_type = 'post'
        AND COALESCE(cr.status, 'pending') = 'pending'
      LIMIT p_limit OFFSET p_offset
    ) sub;
  ELSIF p_filter = 'pinned' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb) INTO v_posts
    FROM (
      SELECT jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', p.email,
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', cp.likes_count,
        'comments_count', cp.comments_count,
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (SELECT COUNT(*) FROM community_reports cr2 WHERE cr2.target_id = cp.id::text AND cr2.target_type = 'post' AND COALESCE(cr2.status, 'pending') = 'pending')
      ) AS row_data
      FROM community_posts cp
      LEFT JOIN profiles p ON p.id = cp.user_id
      WHERE cp.is_pinned = TRUE
      ORDER BY cp.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  ELSE
    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'is_pinned')::boolean DESC, row_data->>'created_at' DESC), '[]'::jsonb) INTO v_posts
    FROM (
      SELECT jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', p.email,
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', cp.likes_count,
        'comments_count', cp.comments_count,
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (SELECT COUNT(*) FROM community_reports cr2 WHERE cr2.target_id = cp.id::text AND cr2.target_type = 'post' AND COALESCE(cr2.status, 'pending') = 'pending')
      ) AS row_data
      FROM community_posts cp
      LEFT JOIN profiles p ON p.id = cp.user_id
      ORDER BY cp.is_pinned DESC NULLS LAST, cp.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  END IF;

  result := jsonb_build_object(
    'posts', v_posts,
    'total_count', v_total
  );

  RETURN result;
END;
$$;


-- ----- 2.4 submit_poll_vote: 미사용 변수 v_existing 제거 -----
CREATE OR REPLACE FUNCTION public.submit_poll_vote(
  p_poll_id UUID,
  p_vote TEXT
)
RETURNS TABLE (success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_poll_status TEXT;
  v_poll_deadline TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, '로그인이 필요합니다'::TEXT;
    RETURN;
  END IF;

  IF p_vote NOT IN ('YES', 'NO') THEN
    RETURN QUERY SELECT FALSE, '유효하지 않은 투표입니다'::TEXT;
    RETURN;
  END IF;

  SELECT status, deadline INTO v_poll_status, v_poll_deadline
  FROM prediction_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, '투표를 찾을 수 없습니다'::TEXT;
    RETURN;
  END IF;

  IF v_poll_status != 'active' THEN
    RETURN QUERY SELECT FALSE, '이미 종료된 투표입니다'::TEXT;
    RETURN;
  END IF;

  IF v_poll_deadline < NOW() THEN
    RETURN QUERY SELECT FALSE, '투표 마감 시간이 지났습니다'::TEXT;
    RETURN;
  END IF;

  -- v_existing 변수 대신 IF EXISTS 패턴 사용
  IF EXISTS (
    SELECT 1 FROM prediction_votes
    WHERE poll_id = p_poll_id AND user_id = v_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, '이미 투표하셨습니다'::TEXT;
    RETURN;
  END IF;

  INSERT INTO prediction_votes (poll_id, user_id, vote)
  VALUES (p_poll_id, v_user_id, p_vote);

  IF p_vote = 'YES' THEN
    UPDATE prediction_polls SET yes_count = yes_count + 1 WHERE id = p_poll_id;
  ELSE
    UPDATE prediction_polls SET no_count = no_count + 1 WHERE id = p_poll_id;
  END IF;

  INSERT INTO prediction_user_stats (user_id, total_votes)
  VALUES (v_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_votes = prediction_user_stats.total_votes + 1,
    updated_at = NOW();

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;


-- =============================================================
-- PART 3: RLS 미설정 테이블 활성화 + 정책 추가
-- =============================================================
-- 참고: service_role은 RLS를 자동 우회하므로,
-- RLS 활성화만으로도 Edge Function 접근은 유지됨

-- ----- 3.1 decision_logs (user_id 있음) -----
ALTER TABLE public.decision_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decision_logs_select_own"
  ON public.decision_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "decision_logs_insert_own"
  ON public.decision_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "decision_logs_delete_own"
  ON public.decision_logs FOR DELETE
  USING (user_id = auth.uid());


-- ----- 3.2 referrals (referrer_id/referred_id, user_id 없음) -----
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_own"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "referrals_insert_referrer"
  ON public.referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid());


-- ----- 3.3 crisis_alerts (시스템 생성, 사용자 읽기 허용) -----
ALTER TABLE public.crisis_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crisis_alerts_read_authenticated"
  ON public.crisis_alerts FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ----- 3.4 impact_analysis (시스템 생성, 사용자 읽기 허용) -----
ALTER TABLE public.impact_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impact_analysis_read_authenticated"
  ON public.impact_analysis FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- prediction_accuracy_summary는 VIEW이므로 RLS 적용 불가 (제외)

-- ----- 3.5 fixed_expenses (user_id 없음, 서비스 전용) -----
-- 주의: user_id 컬럼이 없어 사용자 구분 불가. 서비스 역할만 허용.
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;


-- ----- 3.7 liabilities (user_id 없음, 서비스 전용) -----
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;


-- ----- 3.8 my_portfolio (user_id 없음, 서비스 전용) -----
-- 주의: assets/portfolios 테이블과 별도인 레거시 테이블로 추정
ALTER TABLE public.my_portfolio ENABLE ROW LEVEL SECURITY;


-- ----- 3.9 waitlist_signups (이메일 포함, 서비스 전용) -----
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;


-- ----- 3.10 landing_events (마케팅 이벤트, 서비스 전용) -----
ALTER TABLE public.landing_events ENABLE ROW LEVEL SECURITY;


-- ----- 3.11~3.15 ops_* 테이블 (운영/관리용, 서비스 전용) -----
ALTER TABLE public.ops_approved_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_career_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_collected_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_content_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_guru_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_guru_holdings ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- PART 4: 외래키 인덱스 추가 (성능 최적화)
-- =============================================================
-- 외래키 컬럼에 인덱스가 없으면 JOIN/DELETE 시 풀스캔 발생

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id
  ON public.admin_users (user_id);

CREATE INDEX IF NOT EXISTS idx_community_best_answers_post_id
  ON public.community_best_answers (post_id);

CREATE INDEX IF NOT EXISTS idx_community_best_answers_selected_by
  ON public.community_best_answers (selected_by);

CREATE INDEX IF NOT EXISTS idx_community_likes_post_id
  ON public.community_likes (post_id);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id
  ON public.post_bookmarks (post_id);

CREATE INDEX IF NOT EXISTS idx_prediction_user_stats_user_id
  ON public.prediction_user_stats (user_id);

-- quiz_attempts, user_investor_levels 테이블은 DB에 미존재하여 제외

CREATE INDEX IF NOT EXISTS idx_referral_pending_rewards_referrer_id
  ON public.referral_pending_rewards (referrer_id);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id
  ON public.user_credits (user_id);

-- community_reports.target_id 복합 인덱스 (신고 조회 성능)
CREATE INDEX IF NOT EXISTS idx_community_reports_target
  ON public.community_reports (target_type, target_id);


-- =============================================================
-- PART 5: RLS 정책 없는 테이블에 최소 정책 추가
-- =============================================================
-- RLS가 활성화되었지만 정책이 없는 테이블은
-- service_role 외에는 아무도 접근할 수 없음 (의도적)
-- 아래는 정책이 필요한 테이블만 추가

-- kostolany_phases: 사용자가 읽어야 하는 시장 위상 데이터
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kostolany_phases' AND schemaname = 'public'
  ) THEN
    EXECUTE 'CREATE POLICY "kostolany_phases_read_authenticated"
      ON public.kostolany_phases FOR SELECT
      USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;


-- =============================================================
-- 완료 확인
-- =============================================================
DO $$
DECLARE
  v_no_rls INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_no_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND NOT rowsecurity;

  RAISE NOTICE 'Security audit complete. Tables without RLS in public: %', v_no_rls;
END $$;
