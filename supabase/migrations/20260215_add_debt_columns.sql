-- ============================================================================
-- 레버리지(대출) 정보 컬럼 추가 - Phase 1 (부동산 대출만)
-- 날짜: 2026-02-15
-- ============================================================================

-- portfolios 테이블에 대출 정보 컬럼 추가
ALTER TABLE portfolios
ADD COLUMN IF NOT EXISTS debt_amount BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS debt_interest_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS debt_monthly_payment INTEGER;

-- 인덱스 추가 (대출 있는 자산 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_portfolios_debt ON portfolios(debt_amount) WHERE debt_amount > 0;

-- 코멘트 추가
COMMENT ON COLUMN portfolios.debt_amount IS '대출 잔액 원화 (부동산 담보대출 등)';
COMMENT ON COLUMN portfolios.debt_interest_rate IS '대출 금리 % (Premium 기능용, 현재 미사용)';
COMMENT ON COLUMN portfolios.debt_monthly_payment IS '월 상환액 만원 (Premium 기능용, 현재 미사용)';
