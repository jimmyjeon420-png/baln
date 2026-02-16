-- Phase 3-1: 자동 발행 시스템
-- 매일 08:00에 draft 상태 콘텐츠를 자동으로 published로 전환

-- 1. 자동 발행 함수
CREATE OR REPLACE FUNCTION auto_publish_daily_content()
RETURNS jsonb AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  published_count INTEGER := 0;
  result jsonb;
BEGIN
  -- daily_market_insights 자동 발행
  UPDATE daily_market_insights
  SET publish_status = 'published', published_at = NOW()
  WHERE date = today_date
    AND publish_status = 'draft';

  GET DIAGNOSTICS published_count = ROW_COUNT;
  result := jsonb_build_object('market_insights', published_count);

  -- guru_insights 자동 발행
  UPDATE guru_insights
  SET publish_status = 'published', published_at = NOW()
  WHERE date = today_date
    AND publish_status = 'draft';

  GET DIAGNOSTICS published_count = ROW_COUNT;
  result := result || jsonb_build_object('guru_insights', published_count);

  -- prediction_polls 자동 발행
  UPDATE prediction_polls
  SET publish_status = 'published', published_at = NOW()
  WHERE created_date = today_date
    AND publish_status = 'draft';

  GET DIAGNOSTICS published_count = ROW_COUNT;
  result := result || jsonb_build_object('prediction_polls', published_count);

  -- context_cards 자동 발행
  UPDATE context_cards
  SET publish_status = 'published', published_at = NOW()
  WHERE date = today_date
    AND publish_status = 'draft';

  GET DIAGNOSTICS published_count = ROW_COUNT;
  result := result || jsonb_build_object('context_cards', published_count);

  -- 로그 기록
  INSERT INTO admin_action_logs (action_type, details, created_at)
  VALUES ('auto_publish', result, NOW());

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 관리자 액션 로그 테이블 (자동화 추적용)
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- 'auto_publish', 'manual_publish', 'regenerate'
  details JSONB, -- 구체적인 액션 정보
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_action ON admin_action_logs(action_type, created_at DESC);

-- 3. pg_cron 스케줄 설정 (매일 08:00 KST = 23:00 UTC 전날)
-- Supabase Dashboard에서 수동으로 설정해야 함
-- SQL Editor에서 실행:
-- SELECT cron.schedule(
--   'auto-publish-daily-content',
--   '0 23 * * *',  -- 매일 23:00 UTC (한국시간 08:00)
--   $$ SELECT auto_publish_daily_content(); $$
-- );

-- 4. 수동 테스트용 함수
CREATE OR REPLACE FUNCTION test_auto_publish()
RETURNS jsonb AS $$
BEGIN
  RAISE NOTICE '🧪 자동 발행 테스트 실행 중...';
  RETURN auto_publish_daily_content();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_publish_daily_content() IS 'Phase 3: 매일 08:00 KST 자동 발행 (draft → published)';
COMMENT ON TABLE admin_action_logs IS 'Phase 3: 관리자 액션 로그 (자동/수동 발행 추적)';
