-- ============================================================================
-- Admin Schema Compatibility Hotfix
-- 목적:
-- 1) 운영 DB에서 created_at 컬럼 누락으로 관리자 화면 RPC가 실패하는 문제 복구
-- 2) prediction_votes 컬럼명 불일치(choice/question_id vs vote/poll_id) 호환 계층 추가
-- 날짜: 2026-02-22
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) 관리자 화면에서 참조하는 주요 테이블에 created_at 컬럼 보장
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'profiles',
    'analytics_events',
    'community_reports',
    'community_posts',
    'prediction_votes',
    'credit_transactions',
    'gatherings'
  ]
  LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'created_at'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN created_at TIMESTAMPTZ',
        v_table
      );
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN created_at SET DEFAULT NOW()',
      v_table
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) created_at 백필(가능한 경우만)
--    - profiles: auth.users.created_at 우선 복구
--    - 기타 테이블: updated_at / 대체 시간 컬럼에서 복구
-- ---------------------------------------------------------------------------

-- 2-1) profiles.created_at 백필
DO $$
DECLARE
  v_has_updated BOOLEAN;
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'profiles'
         AND column_name = 'created_at'
     )
  THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'updated_at'
    ) INTO v_has_updated;

    IF v_has_updated THEN
      EXECUTE '
        UPDATE public.profiles
        SET created_at = COALESCE(created_at, updated_at)
        WHERE created_at IS NULL
      ';
    END IF;

    EXECUTE '
      UPDATE public.profiles p
      SET created_at = u.created_at
      FROM auth.users u
      WHERE p.id = u.id
        AND p.created_at IS NULL
    ';
  END IF;
END
$$;

-- 2-2) analytics_events.created_at 백필 (대체 시간 컬럼 탐색)
DO $$
DECLARE
  v_source_col TEXT;
BEGIN
  IF to_regclass('public.analytics_events') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'analytics_events'
         AND column_name = 'created_at'
     )
  THEN
    SELECT c.column_name
    INTO v_source_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'analytics_events'
      AND c.column_name IN (
        'event_time',
        'occurred_at',
        'event_at',
        'timestamp',
        'inserted_at',
        'updated_at'
      )
    ORDER BY CASE c.column_name
      WHEN 'event_time' THEN 1
      WHEN 'occurred_at' THEN 2
      WHEN 'event_at' THEN 3
      WHEN 'timestamp' THEN 4
      WHEN 'inserted_at' THEN 5
      WHEN 'updated_at' THEN 6
      ELSE 99
    END
    LIMIT 1;

    IF v_source_col IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.analytics_events
         SET created_at = COALESCE(created_at, %I::timestamptz)
         WHERE created_at IS NULL',
        v_source_col
      );
    END IF;
  END IF;
END
$$;

-- 2-3) updated_at 기반 백필 (해당 컬럼이 있는 테이블만)
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'community_posts',
    'community_reports',
    'credit_transactions',
    'gatherings'
  ]
  LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'created_at'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'updated_at'
    )
    THEN
      EXECUTE format(
        'UPDATE public.%I
         SET created_at = COALESCE(created_at, updated_at)
         WHERE created_at IS NULL',
        v_table
      );
    END IF;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) created_at 조회 성능 인덱스 보강
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC)';
  END IF;

  IF to_regclass('public.analytics_events') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC)';
  END IF;

  IF to_regclass('public.community_reports') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_community_reports_created_at ON public.community_reports(created_at DESC)';
  END IF;

  IF to_regclass('public.community_posts') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC)';
  END IF;

  IF to_regclass('public.prediction_votes') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prediction_votes_created_at ON public.prediction_votes(created_at DESC)';
  END IF;

  IF to_regclass('public.credit_transactions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC)';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4) prediction_votes 컬럼 호환 계층
--    admin_get_user_detail가 기대하는 question_id/choice 컬럼을 보강
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_has_vote BOOLEAN;
  v_has_poll_id BOOLEAN;
  v_has_choice BOOLEAN;
  v_has_question_id BOOLEAN;
BEGIN
  IF to_regclass('public.prediction_votes') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prediction_votes' AND column_name = 'vote'
    ) INTO v_has_vote;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prediction_votes' AND column_name = 'poll_id'
    ) INTO v_has_poll_id;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prediction_votes' AND column_name = 'choice'
    ) INTO v_has_choice;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'prediction_votes' AND column_name = 'question_id'
    ) INTO v_has_question_id;

    IF v_has_vote AND NOT v_has_choice THEN
      EXECUTE 'ALTER TABLE public.prediction_votes ADD COLUMN choice TEXT';
      v_has_choice := TRUE;
    END IF;

    IF v_has_poll_id AND NOT v_has_question_id THEN
      EXECUTE 'ALTER TABLE public.prediction_votes ADD COLUMN question_id UUID';
      v_has_question_id := TRUE;
    END IF;

    IF v_has_vote AND v_has_choice THEN
      EXECUTE 'UPDATE public.prediction_votes SET choice = vote WHERE choice IS NULL';
    END IF;

    IF v_has_poll_id AND v_has_question_id THEN
      EXECUTE 'UPDATE public.prediction_votes SET question_id = poll_id WHERE question_id IS NULL';
    END IF;

    IF v_has_vote AND v_has_poll_id AND v_has_choice AND v_has_question_id THEN
      EXECUTE $sql$
        CREATE OR REPLACE FUNCTION public.admin_sync_prediction_votes_compat()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $fn$
        BEGIN
          NEW.choice := NEW.vote;
          NEW.question_id := NEW.poll_id;
          RETURN NEW;
        END;
        $fn$
      $sql$;

      EXECUTE 'DROP TRIGGER IF EXISTS trg_admin_sync_prediction_votes_compat ON public.prediction_votes';
      EXECUTE '
        CREATE TRIGGER trg_admin_sync_prediction_votes_compat
        BEFORE INSERT OR UPDATE ON public.prediction_votes
        FOR EACH ROW
        EXECUTE FUNCTION public.admin_sync_prediction_votes_compat()
      ';
    END IF;
  END IF;
END
$$;

