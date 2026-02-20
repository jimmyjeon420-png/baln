-- ============================================================================
-- 맥락 카드 3회 생성 Cron 스케줄 설정
-- 목적: 맥락 카드를 하루 3회 자동 생성 (06:00, 15:00, 19:00 KST)
-- 변경 사항:
--   - 기존 daily-briefing (07:00 KST, Task A-H 전체) → 삭제
--   - daily-briefing-main (06:00 KST, Task G 제외한 A~F,H,I) 신규 등록
--   - context-card-morning   (06:00 KST, Task G만, time_slot=morning)
--   - context-card-afternoon (15:00 KST, Task G만, time_slot=afternoon)
--   - context-card-evening   (19:00 KST, Task G만, time_slot=evening)
-- Supabase Project: ruqeinfcqhgexrckonsy
-- ============================================================================

-- pg_cron 확장 활성화 (Supabase 기본 제공 — 이미 활성화되어 있으면 무시됨)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- STEP 1: 기존 cron 잡 제거 (멱등성 보장 — 재실행해도 안전)
-- ============================================================================

-- 기존 daily-briefing 잡 제거
SELECT cron.unschedule('daily-briefing')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-briefing'
);

-- 이전 실행으로 이미 등록된 경우를 대비해 신규 잡들도 먼저 제거
SELECT cron.unschedule('daily-briefing-main')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-briefing-main'
);

SELECT cron.unschedule('context-card-morning')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'context-card-morning'
);

SELECT cron.unschedule('context-card-afternoon')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'context-card-afternoon'
);

SELECT cron.unschedule('context-card-evening')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'context-card-evening'
);

-- ============================================================================
-- STEP 2: daily-briefing-main 등록
-- 역할: Task G(맥락 카드 생성)를 제외한 나머지 분석 작업 전체 실행
-- 시간: 06:00 KST = 21:00 UTC (전날)
-- Tasks: A,B,C,D,E,F,H,I (시장 데이터 수집 + AI 진단 + 처방전 등)
-- ============================================================================
SELECT cron.schedule(
  'daily-briefing-main',  -- Job 이름
  '0 21 * * *',           -- 매일 21:00 UTC = 다음날 06:00 KST
  $$
    SELECT net.http_post(
      url := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing?tasks=A,B,C,D,E,F,H,I',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================================================
-- STEP 3: context-card-morning 등록
-- 역할: 아침 맥락 카드 생성 (Task G, time_slot=morning)
-- 시간: 06:00 KST = 21:00 UTC (전날)
-- 내용: 전날 미국 시장 마감 기준, 오늘 아침 전략 카드
-- ============================================================================
SELECT cron.schedule(
  'context-card-morning',  -- Job 이름
  '0 21 * * *',            -- 매일 21:00 UTC = 다음날 06:00 KST
  $$
    SELECT net.http_post(
      url := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing?tasks=G&time_slot=morning',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================================================
-- STEP 4: context-card-afternoon 등록
-- 역할: 오후 맥락 카드 생성 (Task G, time_slot=afternoon)
-- 시간: 15:00 KST = 06:00 UTC
-- 내용: 한국 장 마감 직후 기준, 오후 시장 흐름 카드
-- ============================================================================
SELECT cron.schedule(
  'context-card-afternoon',  -- Job 이름
  '0 6 * * *',               -- 매일 06:00 UTC = 15:00 KST
  $$
    SELECT net.http_post(
      url := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing?tasks=G&time_slot=afternoon',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================================================
-- STEP 5: context-card-evening 등록
-- 역할: 저녁 맥락 카드 생성 (Task G, time_slot=evening)
-- 시간: 19:00 KST = 10:00 UTC
-- 내용: 미국 장 시작 전, 저녁 포트폴리오 점검 카드
-- ============================================================================
SELECT cron.schedule(
  'context-card-evening',  -- Job 이름
  '0 10 * * *',            -- 매일 10:00 UTC = 19:00 KST
  $$
    SELECT net.http_post(
      url := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing?tasks=G&time_slot=evening',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================================================
-- STEP 6: 등록 결과 확인 (마이그레이션 실행 후 아래 쿼리로 검증)
-- ============================================================================

-- 현재 등록된 모든 cron 잡 목록 출력
SELECT
  jobid,
  jobname,
  schedule,
  active,
  -- UTC → KST 변환 참고용 주석 포함
  CASE jobname
    WHEN 'daily-briefing-main'    THEN '06:00 KST (Task A~F,H,I)'
    WHEN 'context-card-morning'   THEN '06:00 KST (Task G, morning)'
    WHEN 'context-card-afternoon' THEN '15:00 KST (Task G, afternoon)'
    WHEN 'context-card-evening'   THEN '19:00 KST (Task G, evening)'
    ELSE '기타'
  END AS kst_description
FROM cron.job
ORDER BY jobid;

-- ============================================================================
-- 설정 메모
-- ============================================================================
--
-- [시간대 변환 요약]
--   KST 06:00 = UTC 21:00 (전날)  → cron: '0 21 * * *'
--   KST 15:00 = UTC 06:00          → cron: '0 6 * * *'
--   KST 19:00 = UTC 10:00          → cron: '0 10 * * *'
--
-- [인증 헤더 주의사항]
--   current_setting('app.settings.service_role_key', true)는
--   Supabase Dashboard → Settings → API → service_role key 값이
--   pg_cron 실행 컨텍스트에서 참조되지 않을 수 있습니다.
--
--   만약 cron 실행 시 인증 오류(401)가 발생하면,
--   아래처럼 service_role key를 직접 하드코딩하거나
--   Supabase Vault에 저장 후 참조하세요:
--
--   headers := '{"Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb
--
-- [실행 히스토리 확인]
--   SELECT * FROM cron.job_run_details
--   WHERE jobid IN (
--     SELECT jobid FROM cron.job
--     WHERE jobname IN (
--       'daily-briefing-main',
--       'context-card-morning',
--       'context-card-afternoon',
--       'context-card-evening'
--     )
--   )
--   ORDER BY start_time DESC
--   LIMIT 20;
--
-- ============================================================================

COMMENT ON EXTENSION pg_cron IS 'Supabase Cron Scheduler — 맥락 카드 3회(06:00/15:00/19:00 KST) + daily-briefing-main(06:00 KST) 자동 실행';
