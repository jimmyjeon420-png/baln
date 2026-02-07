-- ================================================================
-- Panic Shield 또래 비교 마이그레이션
-- 목적: 유저의 Panic Shield 점수를 스냅샷에 저장하고,
--        구간별 평균/중앙값을 집계하여 또래 비교 넛지 제공
-- ================================================================

-- ================================================================
-- 1. portfolio_snapshots에 panic_shield_score 컬럼 추가
-- Gemini가 계산한 0~100 점수를 유저가 앱 실행 시 저장
-- ================================================================

ALTER TABLE portfolio_snapshots
  ADD COLUMN IF NOT EXISTS panic_shield_score SMALLINT;

-- 범위 제약 (0~100)
ALTER TABLE portfolio_snapshots
  ADD CONSTRAINT chk_panic_score_range
  CHECK (panic_shield_score IS NULL OR (panic_shield_score >= 0 AND panic_shield_score <= 100));

-- 집계 성능용 인덱스 (bracket별 panic_shield_score가 NULL이 아닌 행만)
CREATE INDEX IF NOT EXISTS idx_snapshots_bracket_panic
  ON portfolio_snapshots(bracket, snapshot_date)
  WHERE panic_shield_score IS NOT NULL;

-- ================================================================
-- 2. bracket_performance에 panic 점수 집계 컬럼 추가
-- Edge Function Task D에서 어제 스냅샷을 bracket별 집계
-- ================================================================

ALTER TABLE bracket_performance
  ADD COLUMN IF NOT EXISTS avg_panic_score DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS median_panic_score SMALLINT,
  ADD COLUMN IF NOT EXISTS panic_sample_count INTEGER DEFAULT 0;

-- ================================================================
-- 3. RPC: save_panic_shield_score
-- 유저가 앱에서 Gemini 결과를 받으면 오늘 스냅샷에 점수 저장
-- 보안: panic_shield_score 컬럼만 UPDATE 가능
-- ================================================================

CREATE OR REPLACE FUNCTION save_panic_shield_score(p_score SMALLINT)
RETURNS VOID AS $$
BEGIN
  UPDATE portfolio_snapshots
  SET panic_shield_score = LEAST(100, GREATEST(0, p_score))
  WHERE user_id = auth.uid()
    AND snapshot_date = CURRENT_DATE;
  -- 오늘 스냅샷이 없으면 0행 UPDATE → 조용히 무시
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 마이그레이션 완료
-- ================================================================

COMMENT ON COLUMN portfolio_snapshots.panic_shield_score
  IS 'Gemini AI가 계산한 Panic Shield 점수 (0~100, 높을수록 안전)';
COMMENT ON COLUMN bracket_performance.avg_panic_score
  IS '해당 구간 유저들의 평균 Panic Shield 점수';
COMMENT ON COLUMN bracket_performance.median_panic_score
  IS '해당 구간 유저들의 중앙값 Panic Shield 점수';
COMMENT ON COLUMN bracket_performance.panic_sample_count
  IS 'Panic Shield 점수가 기록된 유저 수 (통계 유의성 판단용)';
