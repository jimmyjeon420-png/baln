-- ============================================================================
-- Central Kitchen Cron 스케줄 설정
-- 목적: 매일 07:00 AM KST (UTC 22:00 전날) daily-briefing Edge Function 자동 실행
-- ============================================================================

-- pg_cron 확장 활성화 (Supabase에서 기본 제공)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존 스케줄 제거 (재실행 대비)
SELECT cron.unschedule('daily-briefing')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-briefing'
);

-- ⚠️ 주의: 아래 SQL은 실제 프로젝트 URL로 교체 필요
-- Supabase Dashboard → Settings → API → URL에서 확인
-- 예: https://abcdefg.supabase.co

-- 매일 07:00 AM KST = UTC 22:00 (전날) 실행
-- Supabase는 UTC 기준이므로 -9시간 = 전날 22:00
SELECT cron.schedule(
  'daily-briefing',  -- Job 이름
  '0 22 * * *',      -- 매일 22:00 UTC = 다음날 07:00 KST
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-briefing',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================================================
-- 설정 방법 (Supabase Dashboard에서 실행)
-- ============================================================================
--
-- 1. Supabase Dashboard → SQL Editor → New Query
--
-- 2. 아래 명령어로 project_ref와 service_role_key 확인:
--    SELECT current_setting('app.settings.project_ref', true);
--    SELECT current_setting('app.settings.service_role_key', true);
--
-- 3. 위 URL을 실제 값으로 교체:
--    예: https://abcdefghijk.supabase.co/functions/v1/daily-briefing
--
-- 4. 또는 하드코딩 방식 (권장):
--    SELECT net.http_post(
--      url := 'https://abcdefghijk.supabase.co/functions/v1/daily-briefing',
--      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
--    );
--
-- ============================================================================

-- 스케줄 확인 (정상 등록되었는지 확인)
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'daily-briefing';

-- Cron 실행 히스토리 확인 (최근 10회)
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-briefing')
-- ORDER BY start_time DESC
-- LIMIT 10;

COMMENT ON EXTENSION pg_cron IS 'Supabase Cron Scheduler - daily-briefing 매일 07:00 KST 실행';
