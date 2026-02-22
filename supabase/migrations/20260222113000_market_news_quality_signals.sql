-- ============================================================================
-- market_news 품질/영향 점수 컬럼 확장
-- 목적:
-- 1) 신선도 우선 선별 기준 저장
-- 2) 내 자산 영향 지수 계산 기반 데이터 확보
-- 3) PiCK/실시간 탭의 품질 랭킹 조회 단순화
-- ============================================================================

ALTER TABLE market_news
  ADD COLUMN IF NOT EXISTS impact_summary TEXT,
  ADD COLUMN IF NOT EXISTS impact_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS news_quality_score SMALLINT,
  ADD COLUMN IF NOT EXISTS freshness_score SMALLINT,
  ADD COLUMN IF NOT EXISTS asset_relevance_score SMALLINT,
  ADD COLUMN IF NOT EXISTS source_trust_score SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_market_news_impact_score_range'
  ) THEN
    ALTER TABLE market_news
      ADD CONSTRAINT chk_market_news_impact_score_range
      CHECK (impact_score BETWEEN -2 AND 2);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_market_news_quality_score_range'
  ) THEN
    ALTER TABLE market_news
      ADD CONSTRAINT chk_market_news_quality_score_range
      CHECK (
        news_quality_score IS NULL
        OR (
          news_quality_score BETWEEN 0 AND 100
          AND freshness_score BETWEEN 0 AND 100
          AND asset_relevance_score BETWEEN 0 AND 100
          AND source_trust_score BETWEEN 0 AND 100
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_market_news_quality_recent
  ON market_news (published_at DESC, news_quality_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_market_news_pick_recent
  ON market_news (is_pick, published_at DESC);

CREATE OR REPLACE VIEW vw_market_news_fresh_quality AS
SELECT
  id,
  title,
  source_name,
  source_url,
  published_at,
  tags,
  category,
  is_pick,
  impact_score,
  news_quality_score,
  freshness_score,
  asset_relevance_score,
  source_trust_score,
  created_at
FROM market_news
WHERE published_at >= (NOW() - INTERVAL '24 hours')
ORDER BY news_quality_score DESC NULLS LAST, published_at DESC;

COMMENT ON VIEW vw_market_news_fresh_quality IS
  '최근 24시간 뉴스를 품질 점수 기준으로 정렬한 조회 뷰';

-- 브랜드/출처 정책 정리: 금지 소스 잔존 데이터 제거
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'market_news'
      AND column_name = 'source'
  ) THEN
    EXECUTE $sql$
      DELETE FROM market_news
      WHERE source_url ILIKE '%bloomingbit%'
         OR source_name ILIKE '%코인속보%'
         OR source ILIKE '%블루밍비트%'
    $sql$;
  ELSE
    EXECUTE $sql$
      DELETE FROM market_news
      WHERE source_url ILIKE '%bloomingbit%'
         OR source_name ILIKE '%코인속보%'
    $sql$;
  END IF;
END
$$;
