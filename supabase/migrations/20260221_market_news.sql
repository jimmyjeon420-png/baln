-- ============================================================================
-- 실시간 뉴스 피드 테이블 (market_news)
-- 한국경제 RSS + Google News → AI 태깅 → 앱 무한 스크롤
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  source_name TEXT NOT NULL,        -- '한국경제', 'Google News'
  source_url TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  tags TEXT[] DEFAULT '{}',          -- ['BTC','ETH','삼성전자']
  category TEXT DEFAULT 'general',   -- 'crypto','stock','macro','general'
  is_pick BOOLEAN DEFAULT false,     -- AI 추천 뉴스
  pick_reason TEXT,                  -- AI 추천 이유
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_url)                 -- 중복 방지
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_market_news_published ON market_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_news_category ON market_news(category);
CREATE INDEX IF NOT EXISTS idx_market_news_tags ON market_news USING GIN(tags);

-- RLS 활성화 + 읽기 정책
ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'market_news' AND policyname = '누구나 뉴스 읽기'
  ) THEN
    CREATE POLICY "누구나 뉴스 읽기" ON market_news FOR SELECT USING (true);
  END IF;
END $$;

-- Cron: 매시 15분에 뉴스 수집 (Task J)
-- ⚠️ Supabase SQL Editor에서 실행 시 cron + net 확장이 활성화되어 있어야 합니다.
-- SELECT cron.schedule(
--   'news-collection-hourly',
--   '15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing?tasks=J',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
