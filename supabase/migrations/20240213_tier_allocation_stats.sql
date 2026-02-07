-- ================================================================
-- 등급별 자산 배분 통계 마이그레이션
-- 목적: "투자 DNA" 기능 — 등급별 주식/코인/부동산 비중 비교
-- Edge Function Task D가 일별 집계하여 저장
-- ================================================================

CREATE TABLE IF NOT EXISTS tier_allocation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  tier VARCHAR(20) NOT NULL,                           -- SILVER/GOLD/PLATINUM/DIAMOND

  -- 자산 배분 평균 비중 (%, 합계 100)
  avg_stock_weight DECIMAL(5, 2) DEFAULT 0,            -- 주식 비중
  avg_crypto_weight DECIMAL(5, 2) DEFAULT 0,           -- 코인 비중
  avg_realestate_weight DECIMAL(5, 2) DEFAULT 0,       -- 부동산 비중
  avg_cash_weight DECIMAL(5, 2) DEFAULT 0,             -- 현금 비중
  avg_other_weight DECIMAL(5, 2) DEFAULT 0,            -- 기타 비중

  -- 인기 종목 (상위 5개)
  top_holdings JSONB DEFAULT '[]',
  -- 예: [{"ticker":"NVDA","name":"엔비디아","holders":45,"avg_weight":12.3},...]

  -- 비트코인 상세 (별도 트래킹 — 코인 중 BTC 비중)
  avg_btc_weight DECIMAL(5, 2) DEFAULT 0,              -- BTC만의 비중

  -- 표본 수
  user_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_tier_alloc UNIQUE (stat_date, tier)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_tier_alloc_date
  ON tier_allocation_stats(stat_date DESC);

CREATE INDEX IF NOT EXISTS idx_tier_alloc_tier_date
  ON tier_allocation_stats(tier, stat_date DESC);

-- RLS: 모든 인증 유저 조회 가능 (집계 통계이므로 개인정보 아님)
ALTER TABLE tier_allocation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tier_alloc_read" ON tier_allocation_stats
  FOR SELECT USING (auth.role() = 'authenticated');

-- ================================================================
-- 마이그레이션 완료
-- ================================================================
COMMENT ON TABLE tier_allocation_stats IS '등급별 자산 배분 통계 (투자 DNA 기능 데이터)';
