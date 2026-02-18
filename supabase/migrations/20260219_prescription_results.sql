-- 처방전 월별 결과 테이블 (P1-1)
-- 사용자별 월별 처방전 실행 결과를 추적 (적중률 표시용)

CREATE TABLE IF NOT EXISTS prescription_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,                -- "2026-02" 형식
  phase TEXT,                         -- 코스톨라니 단계 ('A'~'F')
  actions_recommended INTEGER DEFAULT 0,
  actions_completed INTEGER DEFAULT 0,
  health_score_start INTEGER,         -- 월초 건강 점수
  health_score_end INTEGER,           -- 월말 건강 점수 (업데이트됨)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

ALTER TABLE prescription_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own prescription results"
  ON prescription_results
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_prescription_results_user_month
  ON prescription_results(user_id, month DESC);
