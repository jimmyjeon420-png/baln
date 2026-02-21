-- ============================================================================
-- 맥락 카드 3시간 간격 업데이트 전환 (2026-02-21)
-- 기존: 하루 3회 (morning/afternoon/evening)
-- 변경: 3시간마다 (h00, h03, h06, h09, h12, h15, h18, h21)
--
-- 변경 사항:
--   1. time_slot CHECK 제약 확장 (3개 → 8개 + 레거시 3개 호환)
--   2. 기존 데이터 마이그레이션 (morning→h06, afternoon→h15, evening→h18)
--   3. Cron 스케줄 변경: 3개 job → 1개 job (매 3시간)
-- ============================================================================


-- ============================================================================
-- STEP 1: time_slot CHECK 제약 확장
-- 기존 3개 ('morning','afternoon','evening') → 8개 추가 + 레거시 호환
-- ============================================================================

-- 기존 CHECK 제약 제거
ALTER TABLE context_cards DROP CONSTRAINT IF EXISTS context_cards_time_slot_check;

-- 새 CHECK 제약 추가 (8개 시간대 슬롯 + 레거시 3개 호환)
ALTER TABLE context_cards
  ADD CONSTRAINT context_cards_time_slot_check
  CHECK (time_slot IN (
    'h00', 'h03', 'h06', 'h09', 'h12', 'h15', 'h18', 'h21',
    'morning', 'afternoon', 'evening'
  ));

COMMENT ON COLUMN context_cards.time_slot IS
'3시간 간격 업데이트 시간대 (KST 기준):
  h00 = 00:00 (미국 장 진행 중)
  h03 = 03:00 (미국 장 마감 직후)
  h06 = 06:00 (아침 브리핑)
  h09 = 09:00 (한국 장 개장)
  h12 = 12:00 (한국 장 중반)
  h15 = 15:00 (한국 장 마감)
  h18 = 18:00 (저녁 종합, 유럽 장 진행)
  h21 = 21:00 (미국 프리마켓)
  + morning/afternoon/evening (레거시 호환)';


-- ============================================================================
-- STEP 2: 기존 데이터 마이그레이션
-- morning → h06, afternoon → h15, evening → h18
-- ============================================================================

UPDATE context_cards SET time_slot = 'h06' WHERE time_slot = 'morning';
UPDATE context_cards SET time_slot = 'h15' WHERE time_slot = 'afternoon';
UPDATE context_cards SET time_slot = 'h18' WHERE time_slot = 'evening';


-- ============================================================================
-- STEP 3: Cron 스케줄 변경
-- 기존 3개 job 제거 → 1개 job (매 3시간 UTC) 등록
-- ============================================================================

-- 기존 cron job 제거
SELECT cron.unschedule('context-card-morning')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'context-card-morning');

SELECT cron.unschedule('context-card-afternoon')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'context-card-afternoon');

SELECT cron.unschedule('context-card-evening')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'context-card-evening');

-- 새 cron job: 매 3시간마다 (UTC 기준)
-- UTC 0,3,6,9,12,15,18,21 → KST 9,12,15,18,21,0,3,6
-- Edge Function이 현재 KST 시간을 기준으로 time_slot 자동 결정
SELECT cron.schedule(
  'context-card-3h',
  '0 */3 * * *',
  $$
    SELECT net.http_post(
      url := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing?tasks=G',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);


-- ============================================================================
-- STEP 4: 등록 결과 확인
-- ============================================================================

SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN ('daily-briefing-main', 'context-card-3h')
ORDER BY jobid;


-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 맥락 카드 3시간 간격 마이그레이션 완료';
  RAISE NOTICE '   - time_slot CHECK: 8개 슬롯 (h00~h21) + 레거시 3개';
  RAISE NOTICE '   - 기존 데이터: morning→h06, afternoon→h15, evening→h18';
  RAISE NOTICE '   - Cron: 3개 job → 1개 job (매 3시간)';
END $$;
