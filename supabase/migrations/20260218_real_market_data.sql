-- daily_market_insights 테이블에 실시간 시장 데이터 컬럼 추가
-- Yahoo Finance에서 수집한 원시 데이터 저장 (Task A)

ALTER TABLE daily_market_insights
  ADD COLUMN IF NOT EXISTS real_market_data jsonb;

-- 인덱스: real_market_data의 dataQuality 필드로 검색 최적화
CREATE INDEX IF NOT EXISTS idx_daily_market_insights_data_quality
  ON daily_market_insights ((real_market_data->>'dataQuality'));

COMMENT ON COLUMN daily_market_insights.real_market_data IS
  'Yahoo Finance 실시간 데이터 (S&P500, VIX, BTC, KOSPI 등) - Task A에서 매일 갱신';
