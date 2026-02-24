-- ============================================================================
-- ops_pm_predictions: Polymarket 예측 시장 데이터 (Task K 자동 수집)
--
-- 역할: Polymarket의 활성 예측 시장 데이터를 저장하여 앱의 "예측 시장" 탭에 표시
-- 갱신: 3시간 간격 (맥락카드와 동일 주기)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ops_pm_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polymarket_id TEXT NOT NULL UNIQUE,
  question_ko TEXT NOT NULL,
  question_en TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('stock', 'crypto', 'macro')),
  probability NUMERIC(5,4) NOT NULL,
  probability_change_24h NUMERIC(5,4),
  volume_usd NUMERIC(15,2),
  volume_24h_usd NUMERIC(15,2),
  whale_signal JSONB,
  related_tickers TEXT[] DEFAULT '{}',
  impact_analysis JSONB,
  yes_label TEXT,
  no_label TEXT,
  summary_ko TEXT,
  end_date TIMESTAMPTZ,
  slug TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스: 카테고리별 + 거래량 정렬 (앱에서 가장 자주 쓰는 쿼리)
CREATE INDEX IF NOT EXISTS idx_ops_pm_predictions_category_volume
  ON ops_pm_predictions (category, volume_24h_usd DESC NULLS LAST);

-- 인덱스: polymarket_id UPSERT용 (UNIQUE 제약 + B-tree 자동 생성되지만 명시)
-- UNIQUE 제약이 이미 인덱스를 생성하므로 추가 인덱스 불필요

-- 인덱스: 최신순 조회 (업데이트 시간 기준)
CREATE INDEX IF NOT EXISTS idx_ops_pm_predictions_updated_at
  ON ops_pm_predictions (updated_at DESC);

-- RLS 활성화
ALTER TABLE ops_pm_predictions ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 인증된 사용자 누구나 조회 가능
CREATE POLICY "ops_pm_predictions_select_authenticated"
  ON ops_pm_predictions FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기 정책: service_role만 (Edge Function에서 service_role 키로 접근)
CREATE POLICY "ops_pm_predictions_insert_service_role"
  ON ops_pm_predictions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "ops_pm_predictions_update_service_role"
  ON ops_pm_predictions FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "ops_pm_predictions_delete_service_role"
  ON ops_pm_predictions FOR DELETE
  TO service_role
  USING (true);
