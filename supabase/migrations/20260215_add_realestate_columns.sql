-- ============================================================================
-- 부동산 자산 지원을 위한 portfolios 테이블 컬럼 추가
-- 날짜: 2026-02-15
-- ============================================================================

-- portfolios 테이블에 부동산 메타데이터 컬럼 추가
ALTER TABLE portfolios
ADD COLUMN IF NOT EXISTS lawd_cd TEXT,
ADD COLUMN IF NOT EXISTS complex_name TEXT,
ADD COLUMN IF NOT EXISTS unit_area NUMERIC,
ADD COLUMN IF NOT EXISTS unit_detail TEXT,
ADD COLUMN IF NOT EXISTS purchase_price_krw BIGINT,
ADD COLUMN IF NOT EXISTS last_price_updated_at TIMESTAMPTZ;

-- 인덱스 추가 (부동산 자산 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_portfolios_lawd_cd ON portfolios(lawd_cd);
CREATE INDEX IF NOT EXISTS idx_portfolios_complex_name ON portfolios(complex_name);

-- 코멘트 추가
COMMENT ON COLUMN portfolios.lawd_cd IS '법정동코드 (5자리, 부동산 전용)';
COMMENT ON COLUMN portfolios.complex_name IS '아파트 단지명 (부동산 전용)';
COMMENT ON COLUMN portfolios.unit_area IS '전용면적 ㎡ (부동산 전용)';
COMMENT ON COLUMN portfolios.unit_detail IS '동/호수 (부동산 전용)';
COMMENT ON COLUMN portfolios.purchase_price_krw IS '매입가 원화 (부동산 전용)';
COMMENT ON COLUMN portfolios.last_price_updated_at IS '마지막 시세 업데이트 시각 (부동산 전용)';
