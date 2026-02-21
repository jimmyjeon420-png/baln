-- ============================================================================
-- 뉴스 수집 15분 간격 Cron 설정
-- Task J를 15분마다 호출하여 실시간 뉴스 수집
-- ⚠️ Supabase SQL Editor에서 직접 실행하세요 (cron + net 확장 필요)
-- ============================================================================

-- 기존 hourly 스케줄 제거 (있을 경우)
SELECT cron.unschedule('news-collection-hourly');

-- 15분 간격 스케줄 등록
SELECT cron.schedule(
  'news-collection-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{"tasks":"J"}'::jsonb
  );
  $$
);
