-- ============================================================================
-- 투자 거장 인사이트 (Guru Insights) 테이블
-- 매일 10명의 투자 거장 분석 결과를 저장 (Central Kitchen 배치)
-- ============================================================================

CREATE TABLE IF NOT EXISTS guru_insights (
  date            DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  insights        JSONB NOT NULL DEFAULT '[]',   -- GuruInsight[] (10명)
  market_context  TEXT,                           -- 시장 상황 요약
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE guru_insights ENABLE ROW LEVEL SECURITY;

-- 읽기: 인증된 사용자 누구나 (글로벌 공유 데이터)
CREATE POLICY "guru_insights_read_authenticated"
  ON guru_insights FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기: service_role만 (Edge Function 배치 전용)
CREATE POLICY "guru_insights_write_service_role"
  ON guru_insights FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at 자동 갱신 트리거 (기존 함수 재사용)
CREATE TRIGGER update_guru_insights_updated_at
  BEFORE UPDATE ON guru_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 인덱스: 날짜 기반 조회 최적화 (PK이므로 이미 인덱스 있지만 명시)
COMMENT ON TABLE guru_insights IS '투자 거장 인사이트 - 매일 10명의 거장 분석 결과 (Central Kitchen 배치)';
