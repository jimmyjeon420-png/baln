-- ================================================================
-- community_posts 테이블에 total_assets_at_post 컬럼 추가
--
-- 에러: PGRST204 - Could not find the 'total_assets_at_post' column
-- 원인: 테이블은 존재하지만 이 컬럼이 누락됨
-- ================================================================

-- 컬럼이 없으면 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_posts'
    AND column_name = 'total_assets_at_post'
  ) THEN
    ALTER TABLE community_posts
    ADD COLUMN total_assets_at_post DECIMAL(18, 2) DEFAULT 0;
  END IF;
END $$;

-- top_holdings 컬럼도 없으면 추가 (같은 마이그레이션에서 정의됨)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_posts'
    AND column_name = 'top_holdings'
  ) THEN
    ALTER TABLE community_posts
    ADD COLUMN top_holdings JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- image_urls 컬럼도 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_posts'
    AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE community_posts
    ADD COLUMN image_urls TEXT[] DEFAULT NULL;
  END IF;
END $$;

-- PostgREST 스키마 캐시 갱신
NOTIFY pgrst, 'reload schema';
