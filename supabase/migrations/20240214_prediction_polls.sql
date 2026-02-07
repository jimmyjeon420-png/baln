-- ============================================================================
-- 투자 예측 게임 (Prediction Polls): 테이블 & RPC 함수
-- MAU 성장을 위한 게임형 인게이지먼트 기능
-- AI가 매일 3개 예측 질문 → 유저 YES/NO 투표 → 정답 판정 → 크레딧 보상
-- ============================================================================

-- 1. 예측 투표 질문 테이블
CREATE TABLE IF NOT EXISTS prediction_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,                -- 질문 본문 (한글)
  description TEXT,                      -- 부연 설명 (배경 정보)
  category TEXT NOT NULL CHECK (category IN ('stocks', 'crypto', 'macro', 'event')),
  yes_label TEXT NOT NULL DEFAULT '네',  -- YES 버튼 라벨
  no_label TEXT NOT NULL DEFAULT '아니오', -- NO 버튼 라벨
  yes_count INTEGER NOT NULL DEFAULT 0,
  no_count INTEGER NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ NOT NULL,         -- 투표 마감 시간
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'resolved')),
  correct_answer TEXT CHECK (correct_answer IN ('YES', 'NO') OR correct_answer IS NULL),
  reward_credits INTEGER NOT NULL DEFAULT 2,  -- 적중 시 기본 보상
  source TEXT,                           -- 정답 판정 근거 출처
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- RLS: 모든 로그인 유저 읽기 가능, 쓰기는 service_role만
ALTER TABLE prediction_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prediction_polls_select_authenticated"
  ON prediction_polls FOR SELECT
  USING (auth.role() = 'authenticated');

-- 인덱스: 상태별 + 마감순 조회
CREATE INDEX idx_prediction_polls_status_deadline
  ON prediction_polls (status, deadline DESC);

-- 인덱스: 날짜별 조회 (created_at 직접 인덱스, IMMUTABLE 이슈 해결)
CREATE INDEX idx_prediction_polls_created_at
  ON prediction_polls (created_at DESC);

-- 2. 유저별 투표 기록 테이블
CREATE TABLE IF NOT EXISTS prediction_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES prediction_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('YES', 'NO')),
  is_correct BOOLEAN,                    -- 정답 판정 후 기록
  credits_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 유저당 1회 투표만 허용
  UNIQUE (poll_id, user_id)
);

-- RLS: 본인 투표만 읽기
ALTER TABLE prediction_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prediction_votes_select_own"
  ON prediction_votes FOR SELECT
  USING (auth.uid() = user_id);

-- 인덱스: 특정 투표의 내 기록 조회
CREATE INDEX idx_prediction_votes_user_poll
  ON prediction_votes (user_id, poll_id);

-- 인덱스: 정답 판정 시 poll별 투표 일괄 조회
CREATE INDEX idx_prediction_votes_poll
  ON prediction_votes (poll_id);

-- 3. 유저 예측 통계 (리더보드용)
CREATE TABLE IF NOT EXISTS prediction_user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_votes INTEGER NOT NULL DEFAULT 0,
  correct_votes INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,   -- 현재 연속 적중
  best_streak INTEGER NOT NULL DEFAULT 0,      -- 최고 연속 적중
  total_credits_earned INTEGER NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_votes > 0
      THEN ROUND((correct_votes::NUMERIC / total_votes) * 100, 2)
      ELSE 0
    END
  ) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: 리더보드용 모든 유저 읽기 가능
ALTER TABLE prediction_user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prediction_user_stats_select_authenticated"
  ON prediction_user_stats FOR SELECT
  USING (auth.role() = 'authenticated');

-- 인덱스: 리더보드 정렬 (적중률 내림차순)
CREATE INDEX idx_prediction_user_stats_accuracy
  ON prediction_user_stats (accuracy_rate DESC, total_votes DESC);

-- ============================================================================
-- RPC: 원자적 투표 제출 (중복체크 + 투표 + 카운트 증가 + 통계 갱신)
-- ============================================================================
CREATE OR REPLACE FUNCTION submit_poll_vote(
  p_poll_id UUID,
  p_vote TEXT
)
RETURNS TABLE (success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_poll_status TEXT;
  v_poll_deadline TIMESTAMPTZ;
  v_existing UUID;
BEGIN
  -- 현재 로그인 유저
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, '로그인이 필요합니다'::TEXT;
    RETURN;
  END IF;

  -- 투표 유효성 확인
  IF p_vote NOT IN ('YES', 'NO') THEN
    RETURN QUERY SELECT FALSE, '유효하지 않은 투표입니다'::TEXT;
    RETURN;
  END IF;

  -- 투표 존재 + 활성 상태 확인
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

  -- 중복 투표 체크
  SELECT id INTO v_existing
  FROM prediction_votes
  WHERE poll_id = p_poll_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, '이미 투표하셨습니다'::TEXT;
    RETURN;
  END IF;

  -- 투표 기록 삽입
  INSERT INTO prediction_votes (poll_id, user_id, vote)
  VALUES (p_poll_id, v_user_id, p_vote);

  -- 카운트 증가
  IF p_vote = 'YES' THEN
    UPDATE prediction_polls SET yes_count = yes_count + 1 WHERE id = p_poll_id;
  ELSE
    UPDATE prediction_polls SET no_count = no_count + 1 WHERE id = p_poll_id;
  END IF;

  -- 유저 통계 upsert (total_votes 증가)
  INSERT INTO prediction_user_stats (user_id, total_votes)
  VALUES (v_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_votes = prediction_user_stats.total_votes + 1,
    updated_at = NOW();

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ============================================================================
-- RPC: 정답 판정 + 전체 보상 지급 (service_role에서만 호출)
-- ============================================================================
CREATE OR REPLACE FUNCTION resolve_poll(
  p_poll_id UUID,
  p_correct_answer TEXT,
  p_source TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, voters_rewarded INTEGER, total_credits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
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
  -- 투표 조회 (잠금)
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

  -- 투표 상태 업데이트
  UPDATE prediction_polls SET
    status = 'resolved',
    correct_answer = p_correct_answer,
    source = p_source,
    resolved_at = NOW()
  WHERE id = p_poll_id;

  -- 모든 투표자 순회하며 정답 판정 + 보상
  FOR v_vote IN
    SELECT pv.id, pv.user_id, pv.vote
    FROM prediction_votes pv
    WHERE pv.poll_id = p_poll_id
  LOOP
    IF v_vote.vote = p_correct_answer THEN
      -- 정답: 기본 보상 (구독자는 2배)
      v_is_subscriber := EXISTS (
        SELECT 1 FROM profiles
        WHERE id = v_vote.user_id
        AND plan_type = 'premium'
        AND (premium_expires_at IS NULL OR premium_expires_at > NOW())
      );

      v_reward := CASE WHEN v_is_subscriber THEN v_poll.reward_credits * 2 ELSE v_poll.reward_credits END;

      -- 연속 적중 보너스 계산
      SELECT current_streak INTO v_current_streak
      FROM prediction_user_stats
      WHERE user_id = v_vote.user_id;

      v_current_streak := COALESCE(v_current_streak, 0) + 1;
      v_streak_bonus := 0;

      IF v_current_streak = 5 THEN
        v_streak_bonus := 3;   -- 5연속 +3
      ELSIF v_current_streak = 10 THEN
        v_streak_bonus := 10;  -- 10연속 +10
      END IF;

      v_reward := v_reward + v_streak_bonus;

      -- 투표 결과 업데이트
      UPDATE prediction_votes SET
        is_correct = TRUE,
        credits_earned = v_reward
      WHERE id = v_vote.id;

      -- 크레딧 지급 (add_credits RPC 재사용)
      PERFORM add_credits(v_vote.user_id, v_reward, 'bonus',
        jsonb_build_object('reward_type', 'prediction_correct', 'poll_id', p_poll_id, 'streak', v_current_streak));

      -- 유저 통계 업데이트 (적중)
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
      -- 오답: 연속 적중 리셋
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
