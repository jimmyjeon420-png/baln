-- ================================================================
-- 포트폴리오 일별 스냅샷 + 입출금 추적 마이그레이션
-- 목적: 유저 자산 구간별 수익률 비교 기능의 데이터 기반
-- ================================================================

-- ================================================================
-- 1. PORTFOLIO_SNAPSHOTS: 일별 자산 스냅샷 (핵심 테이블)
-- 매일 Edge Function이 모든 유저의 자산 상태를 기록
-- ================================================================

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 자산 요약
  total_assets DECIMAL(18, 2) NOT NULL DEFAULT 0,       -- 총 자산 (KRW)
  tier VARCHAR(20) NOT NULL DEFAULT 'SILVER',            -- 스냅샷 시점 티어
  bracket VARCHAR(20) NOT NULL DEFAULT 'bracket_0',      -- 자산 구간 코드

  -- 자산 구성 상세 (JSONB로 유연하게)
  asset_breakdown JSONB DEFAULT '{}',
  -- 예: { "stocks_kr": 50000000, "stocks_us": 30000000, "crypto": 20000000,
  --       "realestate": 0, "cash": 5000000,
  --       "top_holdings": [{"ticker": "NVDA", "value": 15000000, "weight": 15.0}] }

  -- 입출금 보정용
  net_deposit_since_last DECIMAL(18, 2) DEFAULT 0,       -- 전일 대비 순입금액
  -- 양수: 입금(자산 추가), 음수: 출금(자산 삭제)

  -- 수익률 (전일 대비, 보정 후)
  daily_return_rate DECIMAL(8, 4) DEFAULT 0,              -- 일간 수익률 (%)
  -- 계산: (오늘 자산 - 어제 자산 - 순입금) / 어제 자산 * 100

  -- 종목 수
  holdings_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 유저 + 날짜 유니크 (하루에 한 번만 기록)
  CONSTRAINT uq_snapshot_user_date UNIQUE (user_id, snapshot_date)
);

-- 인덱스: 유저별 시계열 조회 (내 수익률 추이)
CREATE INDEX IF NOT EXISTS idx_snapshots_user_date
  ON portfolio_snapshots(user_id, snapshot_date DESC);

-- 인덱스: 구간별 집계 (bracket_performance 생성용)
CREATE INDEX IF NOT EXISTS idx_snapshots_bracket_date
  ON portfolio_snapshots(bracket, snapshot_date DESC);

-- 인덱스: 날짜별 전체 조회 (일별 배치 확인용)
CREATE INDEX IF NOT EXISTS idx_snapshots_date
  ON portfolio_snapshots(snapshot_date DESC);

-- ================================================================
-- 2. DEPOSIT_EVENTS: 입출금 이벤트 추적
-- portfolios 테이블에 INSERT/DELETE 시 자동 기록 (트리거)
-- ================================================================

CREATE TABLE IF NOT EXISTS deposit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('deposit', 'withdrawal')),
  -- deposit: 자산 추가, withdrawal: 자산 삭제

  amount DECIMAL(18, 2) NOT NULL,                         -- 이벤트 금액
  ticker VARCHAR(20),                                      -- 관련 종목
  event_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 유저별 날짜 조회 (스냅샷 시 순입금 계산용)
CREATE INDEX IF NOT EXISTS idx_deposit_events_user_date
  ON deposit_events(user_id, event_date);

-- ================================================================
-- 3. BRACKET_PERFORMANCE: 구간별 집계 통계 (사전 계산)
-- Edge Function이 스냅샷 후 집계하여 저장
-- ================================================================

CREATE TABLE IF NOT EXISTS bracket_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  bracket VARCHAR(20) NOT NULL,                            -- 자산 구간 코드

  user_count INTEGER DEFAULT 0,                            -- 해당 구간 유저 수
  avg_return_rate DECIMAL(8, 4) DEFAULT 0,                 -- 평균 수익률 (%)
  median_return_rate DECIMAL(8, 4) DEFAULT 0,              -- 중앙값 수익률 (%)
  top_10_return_rate DECIMAL(8, 4) DEFAULT 0,              -- 상위 10% 수익률
  bottom_10_return_rate DECIMAL(8, 4) DEFAULT 0,           -- 하위 10% 수익률

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_bracket_stat UNIQUE (stat_date, bracket)
);

CREATE INDEX IF NOT EXISTS idx_bracket_perf_date
  ON bracket_performance(stat_date DESC);

-- ================================================================
-- 4. RLS 정책
-- ================================================================

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_performance ENABLE ROW LEVEL SECURITY;

-- portfolio_snapshots: 본인 기록만 조회
CREATE POLICY "snapshots_read_own" ON portfolio_snapshots
  FOR SELECT USING (auth.uid() = user_id);

-- deposit_events: 본인 기록만 조회
CREATE POLICY "deposit_events_read_own" ON deposit_events
  FOR SELECT USING (auth.uid() = user_id);

-- bracket_performance: 모든 인증 유저 조회 (집계 통계이므로)
CREATE POLICY "bracket_perf_read" ON bracket_performance
  FOR SELECT USING (auth.role() = 'authenticated');

-- ================================================================
-- 5. 트리거: portfolios INSERT/DELETE 시 deposit_events 자동 기록
-- 목적: 유저가 자산을 추가/삭제하면 입출금으로 간주하여 기록
-- ================================================================

-- 자산 추가 시 deposit 이벤트
CREATE OR REPLACE FUNCTION log_portfolio_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_amount DECIMAL(18, 2);
BEGIN
  -- 자산 금액 계산
  v_amount := COALESCE(
    CASE
      WHEN NEW.quantity IS NOT NULL AND NEW.current_price IS NOT NULL
        THEN NEW.quantity * NEW.current_price
      ELSE NEW.current_value
    END,
    0
  );

  IF v_amount > 0 THEN
    INSERT INTO deposit_events (user_id, event_type, amount, ticker, event_date)
    VALUES (NEW.user_id, 'deposit', v_amount, NEW.ticker, CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 자산 삭제 시 withdrawal 이벤트
CREATE OR REPLACE FUNCTION log_portfolio_withdrawal()
RETURNS TRIGGER AS $$
DECLARE
  v_amount DECIMAL(18, 2);
BEGIN
  v_amount := COALESCE(
    CASE
      WHEN OLD.quantity IS NOT NULL AND OLD.current_price IS NOT NULL
        THEN OLD.quantity * OLD.current_price
      ELSE OLD.current_value
    END,
    0
  );

  IF v_amount > 0 THEN
    INSERT INTO deposit_events (user_id, event_type, amount, ticker, event_date)
    VALUES (OLD.user_id, 'withdrawal', v_amount, OLD.ticker, CURRENT_DATE);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 연결
DROP TRIGGER IF EXISTS trg_portfolio_deposit ON portfolios;
CREATE TRIGGER trg_portfolio_deposit
  AFTER INSERT ON portfolios
  FOR EACH ROW EXECUTE FUNCTION log_portfolio_deposit();

DROP TRIGGER IF EXISTS trg_portfolio_withdrawal ON portfolios;
CREATE TRIGGER trg_portfolio_withdrawal
  AFTER DELETE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION log_portfolio_withdrawal();

-- ================================================================
-- 6. 자산 구간 결정 함수 (Edge Function에서도, 트리거에서도 사용)
-- ================================================================

CREATE OR REPLACE FUNCTION get_asset_bracket(total DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE
    WHEN total < 100000000 THEN 'bracket_0'       -- 1억 미만
    WHEN total < 300000000 THEN 'bracket_1'       -- 1~3억
    WHEN total < 500000000 THEN 'bracket_2'       -- 3~5억
    WHEN total < 1000000000 THEN 'bracket_3'      -- 5~10억
    WHEN total < 3000000000 THEN 'bracket_4'      -- 10~30억
    ELSE 'bracket_5'                               -- 30억+
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ================================================================
-- 마이그레이션 완료
-- ================================================================

COMMENT ON TABLE portfolio_snapshots IS '유저별 일일 자산 스냅샷 (수익률 비교 기반 데이터)';
COMMENT ON TABLE deposit_events IS '입출금 이벤트 자동 추적 (수익률 보정용)';
COMMENT ON TABLE bracket_performance IS '자산 구간별 집계 통계 (사전 계산)';
COMMENT ON FUNCTION get_asset_bracket(DECIMAL) IS '자산 금액 → 구간 코드 매핑';
