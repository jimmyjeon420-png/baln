-- ============================================================================
-- 누락된 컬럼 추가 (Edge Function daily-briefing이 사용하는 컬럼)
-- 원인: 초기 마이그레이션 이후 Edge Function이 업데이트되면서 새 컬럼이 필요해졌지만
--       DB 마이그레이션이 적용되지 않음
-- ============================================================================

-- daily_market_insights: Task A (거시경제 분석)에서 사용하는 누락 컬럼
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS cfo_weather JSONB DEFAULT '{}';
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS global_liquidity TEXT DEFAULT '';
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS rate_cycle_evidence JSONB DEFAULT NULL;
ALTER TABLE daily_market_insights ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- RLS 정책: 인증된 사용자는 읽기 가능 (쓰기는 service_role만)
DO $$
BEGIN
  -- daily_market_insights RLS 활성화 (이미 활성화되어 있으면 무시)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_market_insights' AND policyname = 'anon_read_market_insights'
  ) THEN
    ALTER TABLE daily_market_insights ENABLE ROW LEVEL SECURITY;
    CREATE POLICY anon_read_market_insights ON daily_market_insights FOR SELECT USING (true);
  END IF;

  -- stock_quant_reports RLS 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_quant_reports' AND policyname = 'anon_read_stock_reports'
  ) THEN
    ALTER TABLE stock_quant_reports ENABLE ROW LEVEL SECURITY;
    CREATE POLICY anon_read_stock_reports ON stock_quant_reports FOR SELECT USING (true);
  END IF;

  -- context_cards RLS 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'context_cards' AND policyname = 'anon_read_context_cards'
  ) THEN
    ALTER TABLE context_cards ENABLE ROW LEVEL SECURITY;
    CREATE POLICY anon_read_context_cards ON context_cards FOR SELECT USING (true);
  END IF;
END $$;
