-- ============================================================
-- market_news 테이블 누락 컬럼 추가
-- Edge Function Task J가 뉴스 upsert 시 이 컬럼들이 필요
-- 없으면 "Could not find column in schema cache" 에러 발생
-- ============================================================

ALTER TABLE market_news ADD COLUMN IF NOT EXISTS news_quality_score numeric;
ALTER TABLE market_news ADD COLUMN IF NOT EXISTS freshness_score numeric;
ALTER TABLE market_news ADD COLUMN IF NOT EXISTS asset_relevance_score numeric;
ALTER TABLE market_news ADD COLUMN IF NOT EXISTS source_trust_score numeric;
