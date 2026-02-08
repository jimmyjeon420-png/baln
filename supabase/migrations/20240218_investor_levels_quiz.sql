-- ============================================================================
-- 투자 레벨 & 연속 출석 스트릭 + 일일 투자 퀴즈
-- 테이블 4개 + RPC 4개
-- ============================================================================

-- ============================================================================
-- 1. user_investor_levels — 유저별 레벨/XP/스트릭 (1:1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_investor_levels (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp      INTEGER NOT NULL DEFAULT 0,
  -- 레벨은 XP에서 자동 계산 (GENERATED COLUMN)
  level         INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN total_xp >= 20000 THEN 20
      WHEN total_xp >= 15000 THEN 19
      WHEN total_xp >= 12000 THEN 18
      WHEN total_xp >= 9500  THEN 17
      WHEN total_xp >= 7500  THEN 16
      WHEN total_xp >= 5800  THEN 15
      WHEN total_xp >= 4500  THEN 14
      WHEN total_xp >= 3500  THEN 13
      WHEN total_xp >= 2700  THEN 12
      WHEN total_xp >= 2000  THEN 11
      WHEN total_xp >= 1500  THEN 10
      WHEN total_xp >= 1100  THEN 9
      WHEN total_xp >= 800   THEN 8
      WHEN total_xp >= 550   THEN 7
      WHEN total_xp >= 350   THEN 6
      WHEN total_xp >= 200   THEN 5
      WHEN total_xp >= 100   THEN 4
      WHEN total_xp >= 40    THEN 3
      WHEN total_xp >= 10    THEN 2
      ELSE 1
    END
  ) STORED,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  longest_streak      INTEGER NOT NULL DEFAULT 0,
  last_checkin_date   DATE,
  total_checkins      INTEGER NOT NULL DEFAULT 0,
  total_quizzes_correct  INTEGER NOT NULL DEFAULT 0,
  total_quizzes_attempted INTEGER NOT NULL DEFAULT 0,
  quiz_streak         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE user_investor_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_investor_levels_own" ON user_investor_levels
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 2. xp_events — XP 이벤트 원장 (감사 추적)
-- ============================================================================
CREATE TABLE IF NOT EXISTS xp_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  source      TEXT NOT NULL CHECK (source IN (
    'checkin', 'quiz_correct', 'quiz_attempt', 'prediction_vote', 'share', 'welcome', 'streak_bonus'
  )),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_user ON xp_events(user_id, created_at DESC);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_events_own" ON xp_events
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 3. daily_quizzes — 날짜별 1개 퀴즈
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_quizzes (
  id          BIGSERIAL PRIMARY KEY,
  quiz_date   DATE NOT NULL UNIQUE,
  category    TEXT NOT NULL CHECK (category IN (
    'stock_basics', 'market_news', 'investing_terms', 'risk_management'
  )),
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,  -- [{id:'A', text:'...'}, {id:'B', text:'...'}, ...]
  correct_option TEXT NOT NULL, -- 'A', 'B', 'C', 'D'
  explanation TEXT NOT NULL,
  difficulty  INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE daily_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_quizzes_read" ON daily_quizzes
  FOR SELECT USING (true);

-- ============================================================================
-- 4. quiz_attempts — 유저별 답안
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id         BIGINT NOT NULL REFERENCES daily_quizzes(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL,
  credits_earned  INTEGER NOT NULL DEFAULT 0,
  xp_earned       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id, created_at DESC);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_attempts_own" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- RPC 1: daily_checkin_v2 — 원자적 출석 체크 (에스컬레이팅 보상)
-- ============================================================================
CREATE OR REPLACE FUNCTION daily_checkin_v2(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_yesterday   DATE := CURRENT_DATE - 1;
  v_row         user_investor_levels%ROWTYPE;
  v_new_streak  INTEGER;
  v_credits     INTEGER;
  v_xp          INTEGER := 10;
  v_bonus_xp    INTEGER := 0;
  v_old_level   INTEGER;
  v_new_level   INTEGER;
  v_level_up    BOOLEAN := false;
  v_credit_result JSONB;
BEGIN
  -- upsert + FOR UPDATE 락
  INSERT INTO user_investor_levels (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row
  FROM user_investor_levels
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 이미 오늘 체크인 했으면 거부
  IF v_row.last_checkin_date = v_today THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'already_checked_in',
      'current_streak', v_row.current_streak,
      'level', v_row.level
    );
  END IF;

  -- 연속 출석 계산
  IF v_row.last_checkin_date = v_yesterday THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- 에스컬레이팅 보상: 스트릭에 따라 크레딧 증가
  v_credits := CASE
    WHEN v_new_streak >= 100 THEN 50
    WHEN v_new_streak >= 30  THEN 15
    WHEN v_new_streak >= 14  THEN 7
    WHEN v_new_streak >= 7   THEN 5
    WHEN v_new_streak >= 3   THEN 3
    ELSE 2
  END;

  -- 마일스톤 보너스 XP (정확히 해당 일수일 때)
  v_bonus_xp := CASE
    WHEN v_new_streak = 100 THEN 500
    WHEN v_new_streak = 30  THEN 100
    WHEN v_new_streak = 14  THEN 50
    WHEN v_new_streak = 7   THEN 30
    WHEN v_new_streak = 3   THEN 10
    ELSE 0
  END;

  v_xp := v_xp + v_bonus_xp;
  v_old_level := v_row.level;

  -- XP 업데이트
  UPDATE user_investor_levels SET
    total_xp = total_xp + v_xp,
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_checkin_date = v_today,
    total_checkins = total_checkins + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- 새 레벨 확인
  SELECT level INTO v_new_level
  FROM user_investor_levels
  WHERE user_id = p_user_id;

  v_level_up := v_new_level > v_old_level;

  -- XP 이벤트 기록
  INSERT INTO xp_events (user_id, amount, source, metadata)
  VALUES (p_user_id, v_xp, 'checkin', jsonb_build_object(
    'streak', v_new_streak,
    'bonus_xp', v_bonus_xp,
    'date', v_today::text
  ));

  -- 마일스톤 보너스 XP 별도 기록
  IF v_bonus_xp > 0 THEN
    INSERT INTO xp_events (user_id, amount, source, metadata)
    VALUES (p_user_id, v_bonus_xp, 'streak_bonus', jsonb_build_object(
      'streak', v_new_streak,
      'milestone', true
    ));
  END IF;

  -- 크레딧 지급 (기존 add_credits RPC 재사용)
  SELECT jsonb_agg(row_to_json(r)) INTO v_credit_result
  FROM add_credits(p_user_id, v_credits, 'bonus', jsonb_build_object(
    'reward_type', 'daily_checkin_v2',
    'streak', v_new_streak,
    'date', v_today::text
  )) r;

  RETURN jsonb_build_object(
    'success', true,
    'credits_earned', v_credits,
    'xp_earned', v_xp,
    'bonus_xp', v_bonus_xp,
    'new_streak', v_new_streak,
    'longest_streak', GREATEST(v_row.longest_streak, v_new_streak),
    'new_level', v_new_level,
    'level_up', v_level_up,
    'total_xp', v_row.total_xp + v_xp,
    'total_checkins', v_row.total_checkins + 1
  );
END;
$$;

-- ============================================================================
-- RPC 2: grant_xp — 범용 XP 부여
-- ============================================================================
CREATE OR REPLACE FUNCTION grant_xp(p_user_id UUID, p_amount INTEGER, p_source TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_new_xp    INTEGER;
BEGIN
  -- upsert
  INSERT INTO user_investor_levels (user_id, total_xp)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET total_xp = user_investor_levels.total_xp + p_amount,
      updated_at = now();

  SELECT total_xp, level INTO v_new_xp, v_new_level
  FROM user_investor_levels
  WHERE user_id = p_user_id;

  v_old_level := (
    CASE
      WHEN (v_new_xp - p_amount) >= 20000 THEN 20
      WHEN (v_new_xp - p_amount) >= 15000 THEN 19
      WHEN (v_new_xp - p_amount) >= 12000 THEN 18
      WHEN (v_new_xp - p_amount) >= 9500  THEN 17
      WHEN (v_new_xp - p_amount) >= 7500  THEN 16
      WHEN (v_new_xp - p_amount) >= 5800  THEN 15
      WHEN (v_new_xp - p_amount) >= 4500  THEN 14
      WHEN (v_new_xp - p_amount) >= 3500  THEN 13
      WHEN (v_new_xp - p_amount) >= 2700  THEN 12
      WHEN (v_new_xp - p_amount) >= 2000  THEN 11
      WHEN (v_new_xp - p_amount) >= 1500  THEN 10
      WHEN (v_new_xp - p_amount) >= 1100  THEN 9
      WHEN (v_new_xp - p_amount) >= 800   THEN 8
      WHEN (v_new_xp - p_amount) >= 550   THEN 7
      WHEN (v_new_xp - p_amount) >= 350   THEN 6
      WHEN (v_new_xp - p_amount) >= 200   THEN 5
      WHEN (v_new_xp - p_amount) >= 100   THEN 4
      WHEN (v_new_xp - p_amount) >= 40    THEN 3
      WHEN (v_new_xp - p_amount) >= 10    THEN 2
      ELSE 1
    END
  );

  -- XP 이벤트 기록
  INSERT INTO xp_events (user_id, amount, source)
  VALUES (p_user_id, p_amount, p_source);

  RETURN jsonb_build_object(
    'success', true,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'level_up', v_new_level > v_old_level
  );
END;
$$;

-- ============================================================================
-- RPC 3: submit_quiz_answer — 퀴즈 답안 제출
-- ============================================================================
CREATE OR REPLACE FUNCTION submit_quiz_answer(
  p_quiz_id   BIGINT,
  p_selected  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_quiz          daily_quizzes%ROWTYPE;
  v_is_correct    BOOLEAN;
  v_credits       INTEGER := 0;
  v_xp            INTEGER := 5;  -- 참여 XP (오답이라도)
  v_old_level     INTEGER;
  v_new_level     INTEGER;
  v_level_up      BOOLEAN := false;
  v_quiz_streak   INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- 퀴즈 조회
  SELECT * INTO v_quiz FROM daily_quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'quiz_not_found');
  END IF;

  -- 중복 답안 방지
  IF EXISTS (SELECT 1 FROM quiz_attempts WHERE user_id = v_user_id AND quiz_id = p_quiz_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_answered');
  END IF;

  v_is_correct := (p_selected = v_quiz.correct_option);

  IF v_is_correct THEN
    -- 정답: 1~3 크레딧 랜덤 + 20 XP
    v_credits := floor(random() * 3 + 1)::INTEGER;
    v_xp := 20;
  END IF;

  -- 답안 기록
  INSERT INTO quiz_attempts (user_id, quiz_id, selected_option, is_correct, credits_earned, xp_earned)
  VALUES (v_user_id, p_quiz_id, p_selected, v_is_correct, v_credits, v_xp);

  -- 레벨/XP 업데이트
  INSERT INTO user_investor_levels (user_id, total_xp)
  VALUES (v_user_id, v_xp)
  ON CONFLICT (user_id) DO UPDATE
  SET total_xp = user_investor_levels.total_xp + v_xp,
      updated_at = now();

  -- 퀴즈 통계 업데이트
  IF v_is_correct THEN
    UPDATE user_investor_levels SET
      total_quizzes_correct = total_quizzes_correct + 1,
      total_quizzes_attempted = total_quizzes_attempted + 1,
      quiz_streak = quiz_streak + 1
    WHERE user_id = v_user_id;
  ELSE
    UPDATE user_investor_levels SET
      total_quizzes_attempted = total_quizzes_attempted + 1,
      quiz_streak = 0
    WHERE user_id = v_user_id;
  END IF;

  -- 레벨 확인
  SELECT level, quiz_streak INTO v_new_level, v_quiz_streak
  FROM user_investor_levels WHERE user_id = v_user_id;

  -- XP 이벤트 기록
  INSERT INTO xp_events (user_id, amount, source, metadata)
  VALUES (v_user_id, v_xp,
    CASE WHEN v_is_correct THEN 'quiz_correct' ELSE 'quiz_attempt' END,
    jsonb_build_object('quiz_id', p_quiz_id, 'is_correct', v_is_correct)
  );

  -- 크레딧 지급 (정답인 경우만)
  IF v_credits > 0 THEN
    PERFORM add_credits(v_user_id, v_credits, 'bonus', jsonb_build_object(
      'reward_type', 'quiz_correct',
      'quiz_id', p_quiz_id
    ));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'correct_option', v_quiz.correct_option,
    'explanation', v_quiz.explanation,
    'credits_earned', v_credits,
    'xp_earned', v_xp,
    'quiz_streak', v_quiz_streak,
    'new_level', v_new_level,
    'level_up', v_level_up
  );
END;
$$;

-- ============================================================================
-- RPC 4: insert_daily_quiz — 퀴즈 삽입 (ON CONFLICT 동시 생성 방지)
-- ============================================================================
CREATE OR REPLACE FUNCTION insert_daily_quiz(
  p_quiz_date     DATE,
  p_category      TEXT,
  p_question      TEXT,
  p_options       JSONB,
  p_correct_option TEXT,
  p_explanation   TEXT,
  p_difficulty    INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz_id BIGINT;
BEGIN
  INSERT INTO daily_quizzes (quiz_date, category, question, options, correct_option, explanation, difficulty)
  VALUES (p_quiz_date, p_category, p_question, p_options, p_correct_option, p_explanation, p_difficulty)
  ON CONFLICT (quiz_date) DO NOTHING
  RETURNING id INTO v_quiz_id;

  -- 이미 존재하면 기존 퀴즈 ID 반환
  IF v_quiz_id IS NULL THEN
    SELECT id INTO v_quiz_id FROM daily_quizzes WHERE quiz_date = p_quiz_date;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'quiz_id', v_quiz_id
  );
END;
$$;
