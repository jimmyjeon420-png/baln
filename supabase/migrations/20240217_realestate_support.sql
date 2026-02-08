-- ============================================================================
-- 부동산 자산 지원 스키마
-- portfolios 테이블에 부동산 메타데이터 컬럼 추가
-- realestate_price_cache 테이블 생성 (실거래가 캐시)
-- ============================================================================

-- 1. portfolios 테이블에 부동산 메타데이터 컬럼 추가
ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS lawd_cd TEXT DEFAULT NULL,           -- 법정동코드 (5자리)
  ADD COLUMN IF NOT EXISTS complex_name TEXT DEFAULT NULL,       -- 단지명 (예: '래미안퍼스티지')
  ADD COLUMN IF NOT EXISTS unit_area NUMERIC DEFAULT NULL,       -- 전용면적 (㎡, 예: 84.95)
  ADD COLUMN IF NOT EXISTS unit_detail TEXT DEFAULT NULL,        -- 동/호수 (선택, 예: '103동 1502호')
  ADD COLUMN IF NOT EXISTS purchase_price_krw BIGINT DEFAULT NULL, -- 매입가 (원)
  ADD COLUMN IF NOT EXISTS last_price_updated_at TIMESTAMPTZ DEFAULT NULL; -- 시세 마지막 갱신 시각

-- 2. 부동산 실거래가 캐시 테이블
CREATE TABLE IF NOT EXISTS realestate_price_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawd_cd TEXT NOT NULL,                    -- 법정동코드
  complex_name TEXT NOT NULL,               -- 단지명
  unit_area NUMERIC NOT NULL,               -- 전용면적 (㎡)
  latest_price BIGINT NOT NULL,             -- 최근 거래가 (원)
  avg_price_3 BIGINT NOT NULL,              -- 최근 3건 평균 (원)
  price_change_rate NUMERIC DEFAULT 0,      -- 전년 대비 변동률 (%)
  last_transaction_date TEXT,               -- 마지막 거래 날짜 (YYYY-MM-DD)
  transaction_count INT DEFAULT 0,          -- 조회된 거래 건수
  raw_transactions JSONB DEFAULT '[]',      -- 최근 5건 원본 데이터
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 유니크 제약: 법정동+단지+면적
  CONSTRAINT uq_realestate_price UNIQUE (lawd_cd, complex_name, unit_area)
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_realestate_cache_lookup
  ON realestate_price_cache (lawd_cd, complex_name);

CREATE INDEX IF NOT EXISTS idx_portfolios_realestate
  ON portfolios (user_id)
  WHERE ticker LIKE 'RE_%';

-- 4. RLS 정책
ALTER TABLE realestate_price_cache ENABLE ROW LEVEL SECURITY;

-- 인증된 유저 읽기 허용 (공유 캐시)
CREATE POLICY "realestate_cache_read" ON realestate_price_cache
  FOR SELECT TO authenticated
  USING (true);

-- Service Role만 쓰기 가능 (Edge Function에서 갱신)
CREATE POLICY "realestate_cache_service_write" ON realestate_price_cache
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
