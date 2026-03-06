-- ============================================================================
-- Edge Function cron 복구
-- 목적:
-- 1) pg_cron 환경에서 current_setting('app.settings.service_role_key') 의존 제거
-- 2) 무거운 Task G 경로(daily-briefing?tasks=G) 대신 generate-context-card로 교체
-- 3) 뉴스/예측 정답 판정 크론도 anon JWT 기반으로 안정화
--
-- 참고:
-- - Supabase anon key는 public JWT이므로 Edge Function 호출용 헤더에 포함해도 안전하다.
-- - verify_jwt=true 함수도 anon JWT를 Authorization/apikey 헤더로 전달하면 호출 가능하다.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_project_url CONSTANT TEXT := 'https://ruqeinfcqhgexrckonsy.supabase.co';
  v_anon_jwt CONSTANT TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cWVpbmZjcWhnZXhyY2tvbnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMTE4MDksImV4cCI6MjA4NDc4NzgwOX0.NJmOH_uF59nYaSmjebGMNHlBwvqx5MHIwXOoqzITsXc';
BEGIN
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN (
    'daily-briefing',
    'daily-briefing-main',
    'context-card-morning',
    'context-card-afternoon',
    'context-card-evening',
    'context-card-3h',
    'news-collection-15min',
    'news-collection-30min',
    'prediction-resolve'
  );

  PERFORM cron.schedule(
    'daily-briefing-main',
    '0 21 * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || %L,
          'apikey', %L,
          'Content-Type', 'application/json'
        ),
        body := '{"tasks":"A,B,C,D,E,F,H,I","lang":"ko","trigger_source":"cron-main"}'::jsonb
      );
      $job$,
      v_project_url || '/functions/v1/daily-briefing',
      v_anon_jwt,
      v_anon_jwt
    )
  );

  PERFORM cron.schedule(
    'context-card-3h',
    '0 */3 * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || %L,
          'apikey', %L,
          'Content-Type', 'application/json'
        ),
        body := '{"lang":"ko","trigger_source":"cron-context-card"}'::jsonb
      );
      $job$,
      v_project_url || '/functions/v1/generate-context-card',
      v_anon_jwt,
      v_anon_jwt
    )
  );

  PERFORM cron.schedule(
    'news-collection-30min',
    '*/30 * * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || %L,
          'apikey', %L,
          'Content-Type', 'application/json'
        ),
        body := '{"tasks":"J","lang":"ko","trigger_source":"cron-news"}'::jsonb
      );
      $job$,
      v_project_url || '/functions/v1/daily-briefing',
      v_anon_jwt,
      v_anon_jwt
    )
  );

  PERFORM cron.schedule(
    'prediction-resolve',
    '0 14 * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || %L,
          'apikey', %L,
          'Content-Type', 'application/json'
        ),
        body := '{"tasks":["E2"],"lang":"ko","trigger_source":"cron-prediction-resolve"}'::jsonb
      );
      $job$,
      v_project_url || '/functions/v1/daily-briefing',
      v_anon_jwt,
      v_anon_jwt
    )
  );
END
$$;

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'daily-briefing-main',
  'context-card-3h',
  'news-collection-30min',
  'prediction-resolve'
)
ORDER BY jobname;
