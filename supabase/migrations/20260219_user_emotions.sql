-- ============================================================================
-- user_emotions: 유저 감정 기록 (Supabase 클라우드 저장)
-- 목적: 앱 재설치/기기 변경 시 데이터 보호 + 크로스 디바이스 동기화
--
-- 설계 원칙 (이승건):
-- - 로컬(AsyncStorage)이 Primary → 오프라인에서도 동작
-- - Supabase는 Backup + Sync → 앱 재설치 후 복원 가능
-- - 하루 1개 엔트리 (user_id + date UNIQUE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_emotions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,                          -- 'YYYY-MM-DD'
  emotion      TEXT        NOT NULL CHECK (
                             emotion IN ('anxious', 'worried', 'neutral', 'calm', 'confident')
                           ),
  memo         TEXT        NOT NULL DEFAULT '',
  nasdaq_close NUMERIC,                                       -- 나스닥 종가 (선택)
  btc_close    NUMERIC,                                       -- BTC 종가 $ (선택)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 하루에 한 번만 기록 (중복 시 upsert)
  UNIQUE (user_id, date)
);

-- ============================================================================
-- RLS (Row Level Security): 본인 데이터만 접근
-- ============================================================================

ALTER TABLE user_emotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_emotions_select_own"
  ON user_emotions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_emotions_insert_own"
  ON user_emotions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_emotions_update_own"
  ON user_emotions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_emotions_delete_own"
  ON user_emotions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 인덱스
-- ============================================================================

-- 유저별 날짜 내림차순 조회 (최신 기록 먼저)
CREATE INDEX idx_user_emotions_user_date
  ON user_emotions (user_id, date DESC);

-- ============================================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_emotions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_emotions_updated_at
  BEFORE UPDATE ON user_emotions
  FOR EACH ROW EXECUTE FUNCTION update_user_emotions_updated_at();

-- ============================================================================
-- 코멘트
-- ============================================================================

COMMENT ON TABLE user_emotions IS
  '유저 투자 감정 일기. 앱 재설치 시 복원 + 크로스 디바이스 동기화 지원.';
COMMENT ON COLUMN user_emotions.emotion IS
  'anxious(불안) | worried(걱정) | neutral(보통) | calm(안심) | confident(확신)';
COMMENT ON COLUMN user_emotions.nasdaq_close IS
  '나스닥 종가 (유저 직접 입력, 이승건 원칙: 마찰이 교육)';
COMMENT ON COLUMN user_emotions.btc_close IS
  'BTC 종가 달러 (유저 직접 입력)';
