-- ============================================================================
-- Phase 1 토큰 최적화: 뉴스 수집 15분 → 30분 간격으로 변경
-- Task J 호출 횟수 50% 절감 (하루 96회 → 48회)
-- ⚠️ Supabase SQL Editor에서 직접 실행하세요
-- ============================================================================

-- 기존 15분 스케줄 제거
SELECT cron.unschedule('news-collection-15min');

-- 30분 간격 스케줄 등록
SELECT cron.schedule(
  'news-collection-30min',
  '*/30 * * * *',
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
