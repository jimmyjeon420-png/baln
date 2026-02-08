-- ============================================================================
-- 금리 사이클 나침반: 증거 기반 확장
-- daily_market_insights 테이블에 rate_cycle_evidence 컬럼 추가
-- 비파괴적 변경 (nullable), 기존 데이터/Web Dashboard 무영향
-- ============================================================================

-- rate_cycle_evidence JSONB 컬럼 추가
ALTER TABLE daily_market_insights
ADD COLUMN IF NOT EXISTS rate_cycle_evidence JSONB DEFAULT NULL;

-- 인덱스: 날짜별 조회 성능 최적화 (이미 date PK라면 불필요하지만 안전장치)
COMMENT ON COLUMN daily_market_insights.rate_cycle_evidence IS
  '금리 사이클 판단 근거: keyEvidence[], economicIndicators, expertPerspectives, confidenceFactors';
