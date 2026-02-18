-- 건강 점수 이력 테이블 (P1-2: 추이 차트용)
-- 사용자별 일별 건강 점수를 저장. Edge Function task-d-snapshots 또는 앱 자체 저장

CREATE TABLE IF NOT EXISTS health_score_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE health_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own health score history"
  ON health_score_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_health_score_history_user_date
  ON health_score_history(user_id, snapshot_date DESC);
