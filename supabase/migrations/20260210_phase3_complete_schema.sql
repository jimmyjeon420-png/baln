-- ============================================================================
-- Phase 3: 전체 DB 스키마 총정리 (2026-02-10)
-- 모든 Edge Function Task에서 필요한 테이블/컬럼을 한 번에 생성
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================================================

-- ============================================================================
-- 1. context_cards 테이블 (Task G: 맥락 카드)
-- ============================================================================
CREATE TABLE IF NOT EXISTS context_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  headline TEXT NOT NULL DEFAULT '오늘의 시장 분석',
  historical_context TEXT,
  macro_chain JSONB DEFAULT '[]'::jsonb,
  institutional_behavior TEXT,
  sentiment TEXT DEFAULT 'calm' CHECK (sentiment IN ('calm', 'caution', 'alert')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_cards_date ON context_cards(date DESC);

-- ============================================================================
-- 2. user_context_impacts 테이블 (Task G: 유저별 포트폴리오 영향도)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_context_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_card_id UUID NOT NULL REFERENCES context_cards(id) ON DELETE CASCADE,
  portfolio_impact_pct NUMERIC DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, context_card_id)
);

CREATE INDEX IF NOT EXISTS idx_user_impacts_user ON user_context_impacts(user_id, calculated_at DESC);

-- ============================================================================
-- 3. portfolio_snapshots 완전체 (Task D)
-- 기존 테이블에 누락 컬럼 추가
-- ============================================================================
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_assets NUMERIC NOT NULL DEFAULT 0,
  tier TEXT,
  bracket TEXT,
  asset_breakdown JSONB,
  net_deposit_since_last NUMERIC DEFAULT 0,
  daily_return_rate NUMERIC DEFAULT 0,
  holdings_count INTEGER DEFAULT 0,
  panic_shield_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- 기존 테이블에 누락 컬럼 추가 (중복 실행 안전)
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS snapshot_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS bracket TEXT;
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS net_deposit_since_last NUMERIC DEFAULT 0;
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS daily_return_rate NUMERIC DEFAULT 0;
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS holdings_count INTEGER DEFAULT 0;
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS panic_shield_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_tier ON portfolio_snapshots(tier, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_bracket ON portfolio_snapshots(bracket, snapshot_date DESC);

-- ============================================================================
-- 4. bracket_performance 테이블 (Task D: 구간별 집계)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bracket_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bracket TEXT NOT NULL,
  user_count INTEGER DEFAULT 0,
  avg_return_rate NUMERIC DEFAULT 0,
  median_return_rate NUMERIC DEFAULT 0,
  top_10_return_rate NUMERIC DEFAULT 0,
  bottom_10_return_rate NUMERIC DEFAULT 0,
  avg_panic_score NUMERIC,
  median_panic_score NUMERIC,
  panic_sample_count INTEGER DEFAULT 0,
  avg_btc_weight NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stat_date, bracket)
);

-- 기존 테이블에 누락 컬럼 추가
ALTER TABLE bracket_performance ADD COLUMN IF NOT EXISTS stat_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE bracket_performance ADD COLUMN IF NOT EXISTS user_count INTEGER DEFAULT 0;
ALTER TABLE bracket_performance ADD COLUMN IF NOT EXISTS top_10_return_rate NUMERIC DEFAULT 0;
ALTER TABLE bracket_performance ADD COLUMN IF NOT EXISTS bottom_10_return_rate NUMERIC DEFAULT 0;
ALTER TABLE bracket_performance ADD COLUMN IF NOT EXISTS avg_panic_score NUMERIC;
ALTER TABLE bracket_performance ADD COLUMN IF NOT EXISTS median_panic_score NUMERIC;
ALTER TABLE bracket_performance ADD COLUMN IF NOT EXISTS panic_sample_count INTEGER DEFAULT 0;
ALTER TABLE bracket_performance ADD COLUMN IF NOT EXISTS avg_btc_weight NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bracket_perf_date ON bracket_performance(stat_date DESC, bracket);

-- ============================================================================
-- 5. tier_allocation_stats 완전체 (Task D: 등급별 배분)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tier_allocation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tier TEXT NOT NULL CHECK (tier IN ('SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  avg_stock_weight NUMERIC DEFAULT 0,
  avg_crypto_weight NUMERIC DEFAULT 0,
  avg_realestate_weight NUMERIC DEFAULT 0,
  avg_cash_weight NUMERIC DEFAULT 0,
  avg_other_weight NUMERIC DEFAULT 0,
  avg_btc_weight NUMERIC DEFAULT 0,
  top_holdings JSONB DEFAULT '[]'::jsonb,
  user_count INTEGER DEFAULT 0,
  sample_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stat_date, tier)
);

-- 기존 테이블에 누락 컬럼 추가
ALTER TABLE tier_allocation_stats ADD COLUMN IF NOT EXISTS stat_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE tier_allocation_stats ADD COLUMN IF NOT EXISTS avg_stock_weight NUMERIC DEFAULT 0;
ALTER TABLE tier_allocation_stats ADD COLUMN IF NOT EXISTS avg_crypto_weight NUMERIC DEFAULT 0;
ALTER TABLE tier_allocation_stats ADD COLUMN IF NOT EXISTS avg_realestate_weight NUMERIC DEFAULT 0;
ALTER TABLE tier_allocation_stats ADD COLUMN IF NOT EXISTS avg_cash_weight NUMERIC DEFAULT 0;
ALTER TABLE tier_allocation_stats ADD COLUMN IF NOT EXISTS avg_other_weight NUMERIC DEFAULT 0;
ALTER TABLE tier_allocation_stats ADD COLUMN IF NOT EXISTS avg_btc_weight NUMERIC DEFAULT 0;
ALTER TABLE tier_allocation_stats ADD COLUMN IF NOT EXISTS user_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tier_alloc_date ON tier_allocation_stats(stat_date DESC, tier);

-- ============================================================================
-- 6. deposit_events 테이블 (Task D: 입출금 이벤트)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deposit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL DEFAULT 0,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_events_user ON deposit_events(user_id, event_date DESC);

-- ============================================================================
-- 7. daily_market_insights 완전체 (Task A: 거시경제)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_market_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  macro_summary JSONB,
  bitcoin_analysis JSONB,
  cfo_weather JSONB,
  market_sentiment TEXT CHECK (market_sentiment IN ('BULLISH', 'BEARISH', 'NEUTRAL', 'CAUTIOUS')),
  vix_level NUMERIC,
  global_liquidity TEXT,
  rate_cycle_evidence JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블에 누락 컬럼 추가
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS macro_summary JSONB;
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS cfo_weather JSONB;
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS market_sentiment TEXT;
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS vix_level NUMERIC;
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS global_liquidity TEXT;
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS rate_cycle_evidence JSONB;
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- bitcoin_analysis 컬럼 타입 보정 (기존 CHECK_MISSING_TABLES.sql이 TEXT로 생성했을 수 있음)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'bitcoin_analysis') THEN
    ALTER TABLE daily_market_insights ADD COLUMN bitcoin_analysis JSONB;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_market_insights' AND column_name = 'bitcoin_analysis' AND data_type = 'text'
  ) THEN
    ALTER TABLE daily_market_insights ALTER COLUMN bitcoin_analysis TYPE JSONB USING COALESCE(bitcoin_analysis::jsonb, '{}'::jsonb);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_market_insights_date ON daily_market_insights(date DESC);

-- ============================================================================
-- 8. stock_quant_reports 완전체 (Task B: 종목 퀀트)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_quant_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ticker TEXT NOT NULL,
  valuation_score INTEGER CHECK (valuation_score >= 0 AND valuation_score <= 100),
  signal TEXT CHECK (signal IN ('STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL')),
  analysis TEXT,
  metrics JSONB,
  sector TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, ticker)
);

CREATE INDEX IF NOT EXISTS idx_stock_reports_date ON stock_quant_reports(date DESC, ticker);

-- ============================================================================
-- 9. guru_insights 테이블 (Task C: 투자 거장)
-- ============================================================================
CREATE TABLE IF NOT EXISTS guru_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  market_context TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guru_insights_date ON guru_insights(date DESC);

-- ============================================================================
-- 10. edge_function_logs 테이블 (모니터링)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'SKIPPED')),
  elapsed_ms INTEGER,
  result_summary JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edge_logs_date ON edge_function_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_logs_task ON edge_function_logs(task_name, created_at DESC);

-- ============================================================================
-- 11. sector_sentiments 테이블 (Task A 고도화: 섹터별 센티먼트)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sector_sentiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  sector TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('BULLISH', 'BEARISH', 'NEUTRAL', 'CAUTIOUS')),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, sector)
);

CREATE INDEX IF NOT EXISTS idx_sector_sentiments_date ON sector_sentiments(date DESC, sector);

-- ============================================================================
-- 12. global_market_calendar 테이블 (Task A 고도화: 이벤트 캘린더)
-- ============================================================================
CREATE TABLE IF NOT EXISTS global_market_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  event_type TEXT CHECK (event_type IN ('earnings', 'economic_data', 'fed_meeting', 'holiday', 'policy', 'other')),
  title TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  importance INTEGER CHECK (importance BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_date ON global_market_calendar(date, importance DESC);

-- ============================================================================
-- 13. RLS 정책 (Service Role + Authenticated)
-- ============================================================================

-- RLS 활성화
ALTER TABLE context_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_context_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_allocation_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_market_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_quant_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_sentiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_market_calendar ENABLE ROW LEVEL SECURITY;

-- Service Role 전체 접근 (IF NOT EXISTS로 중복 방지)
DO $$ BEGIN
  -- context_cards
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_all_context_cards') THEN
    CREATE POLICY service_all_context_cards ON context_cards FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- user_context_impacts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_all_user_context_impacts') THEN
    CREATE POLICY service_all_user_context_impacts ON user_context_impacts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- portfolio_snapshots (기존 정책 있을 수 있음)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_all_portfolio_snapshots') THEN
    CREATE POLICY service_all_portfolio_snapshots ON portfolio_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- bracket_performance
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_all_bracket_performance') THEN
    CREATE POLICY service_all_bracket_performance ON bracket_performance FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- deposit_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_all_deposit_events') THEN
    CREATE POLICY service_all_deposit_events ON deposit_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- sector_sentiments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_all_sector_sentiments') THEN
    CREATE POLICY service_all_sector_sentiments ON sector_sentiments FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- global_market_calendar
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_all_global_market_calendar') THEN
    CREATE POLICY service_all_global_market_calendar ON global_market_calendar FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- edge_function_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_all_edge_function_logs') THEN
    CREATE POLICY service_all_edge_function_logs ON edge_function_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Authenticated 읽기 권한
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_context_cards') THEN
    CREATE POLICY users_read_context_cards ON context_cards FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_own_impacts') THEN
    CREATE POLICY users_read_own_impacts ON user_context_impacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_own_snapshots') THEN
    CREATE POLICY users_read_own_snapshots ON portfolio_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_bracket_performance') THEN
    CREATE POLICY users_read_bracket_performance ON bracket_performance FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_tier_allocation') THEN
    CREATE POLICY users_read_tier_allocation ON tier_allocation_stats FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_market_insights') THEN
    CREATE POLICY users_read_market_insights ON daily_market_insights FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_stock_reports') THEN
    CREATE POLICY users_read_stock_reports ON stock_quant_reports FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_guru_insights') THEN
    CREATE POLICY users_read_guru_insights ON guru_insights FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_sector_sentiments') THEN
    CREATE POLICY users_read_sector_sentiments ON sector_sentiments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_market_calendar') THEN
    CREATE POLICY users_read_market_calendar ON global_market_calendar FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================================
-- 14. prediction_polls 테이블 확장 (난이도, 맥락 힌트, 관련 종목)
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prediction_polls' AND column_name = 'difficulty') THEN
    ALTER TABLE prediction_polls ADD COLUMN difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prediction_polls' AND column_name = 'context_hint') THEN
    ALTER TABLE prediction_polls ADD COLUMN context_hint TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prediction_polls' AND column_name = 'related_ticker') THEN
    ALTER TABLE prediction_polls ADD COLUMN related_ticker TEXT;
  END IF;
END $$;

-- ============================================================================
-- 15. daily_market_insights 테이블 확장 (Task A 고도화 컬럼)
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'macro_summary') THEN
    ALTER TABLE daily_market_insights ADD COLUMN macro_summary JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'bitcoin_analysis') THEN
    ALTER TABLE daily_market_insights ADD COLUMN bitcoin_analysis JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'cfo_weather') THEN
    ALTER TABLE daily_market_insights ADD COLUMN cfo_weather JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'market_sentiment') THEN
    ALTER TABLE daily_market_insights ADD COLUMN market_sentiment TEXT DEFAULT 'NEUTRAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'vix_level') THEN
    ALTER TABLE daily_market_insights ADD COLUMN vix_level NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'global_liquidity') THEN
    ALTER TABLE daily_market_insights ADD COLUMN global_liquidity TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'rate_cycle_evidence') THEN
    ALTER TABLE daily_market_insights ADD COLUMN rate_cycle_evidence JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_market_insights' AND column_name = 'updated_at') THEN
    ALTER TABLE daily_market_insights ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- 16. PostgREST 스키마 캐시 강제 새로고침
-- ============================================================================
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================================================
-- 15. 최종 확인
-- ============================================================================
SELECT table_name, (
  SELECT COUNT(*) FROM information_schema.columns c
  WHERE c.table_name = t.table_name AND c.table_schema = 'public'
) as column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_name IN (
  'context_cards', 'user_context_impacts',
  'portfolio_snapshots', 'bracket_performance', 'tier_allocation_stats',
  'deposit_events', 'daily_market_insights', 'stock_quant_reports',
  'guru_insights', 'edge_function_logs',
  'sector_sentiments', 'global_market_calendar'
)
ORDER BY t.table_name;
