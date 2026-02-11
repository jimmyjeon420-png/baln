-- Day 0 Database Migration
-- Created: 2026-02-11
-- Purpose: Launch preparation - 6 tables for P0 features

-- ============================================
-- MIG-001: user_goals (온보딩 목표)
-- ============================================
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('panic_sell', 'fomo', 'context', 'management')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);

-- ============================================
-- MIG-002: bracket_performance (또래 비교)
-- ============================================
CREATE TABLE IF NOT EXISTS bracket_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bracket TEXT NOT NULL CHECK (bracket IN ('B1', 'B2', 'B3', 'B4', 'B5')),
  avg_health_score TEXT CHECK (avg_health_score IN ('A', 'B', 'C', 'D', 'F')),
  avg_prediction_accuracy DECIMAL(5, 2),
  avg_review_completion DECIMAL(5, 2),
  user_count INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bracket_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bracket performance"
  ON bracket_performance FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_bracket_performance_bracket ON bracket_performance(bracket);
CREATE INDEX IF NOT EXISTS idx_bracket_performance_calculated_at ON bracket_performance(calculated_at DESC);

INSERT INTO bracket_performance (bracket, user_count) VALUES
  ('B1', 0),
  ('B2', 0),
  ('B3', 0),
  ('B4', 0),
  ('B5', 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- MIG-003: feature_flags (자동 잠금 해제)
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  name TEXT PRIMARY KEY CHECK (name IN ('peer_comparison', 'fear_greed_index', 'account_linking')),
  enabled BOOLEAN DEFAULT FALSE,
  threshold_mau INTEGER,
  threshold_votes INTEGER,
  threshold_trust_score DECIMAL(3, 2),
  unlock_message TEXT,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (true);

INSERT INTO feature_flags (name, enabled, threshold_mau, threshold_votes, unlock_message) VALUES
  ('peer_comparison', FALSE, 200, NULL, '🎉 사용자 200명 돌파! 또래 비교 기능 활성화!'),
  ('fear_greed_index', FALSE, 200, 500, '📊 baln 공포-탐욕 지수 오픈!'),
  ('account_linking', FALSE, 500, NULL, '🔐 계좌 자동 연동 베타 오픈!')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- MIG-004: prediction_votes (sentiment 추가)
-- ============================================
ALTER TABLE prediction_votes
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('BUY', 'HOLD', 'SELL'));

UPDATE prediction_votes
SET sentiment = 'HOLD'
WHERE sentiment IS NULL;

CREATE INDEX IF NOT EXISTS idx_prediction_votes_sentiment ON prediction_votes(sentiment);
CREATE INDEX IF NOT EXISTS idx_prediction_votes_created_at ON prediction_votes(created_at DESC);

-- ============================================
-- MIG-005: health_score_history (건강 점수 추이)
-- ============================================
CREATE TABLE IF NOT EXISTS health_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  health_score DECIMAL(5, 2) NOT NULL,
  health_grade TEXT NOT NULL CHECK (health_grade IN ('A', 'B', 'C', 'D', 'F')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE health_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health score history"
  ON health_score_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health score history"
  ON health_score_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_score_history_user_id ON health_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_health_score_history_snapshot_date ON health_score_history(snapshot_date DESC);

-- ============================================
-- MIG-006: app_metrics (MAU 추적)
-- ============================================
CREATE TABLE IF NOT EXISTS app_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  mau INTEGER DEFAULT 0,
  dau INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app metrics"
  ON app_metrics FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_app_metrics_date ON app_metrics(metric_date DESC);

INSERT INTO app_metrics (metric_date, mau, dau) VALUES
  (CURRENT_DATE, 0, 0)
ON CONFLICT (metric_date) DO NOTHING;
