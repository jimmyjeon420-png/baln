-- ============================================================================
-- 예측 시스템 완성 설정 — AI 트랙레코드 배너 데이터 적립 활성화
--
-- 이 파일을 Supabase Dashboard → SQL Editor에서 실행하세요.
-- 프로젝트: ruqeinfcqhgexrckonsy
--
-- 포함 내용:
-- 1. 누락 컬럼 추가 (difficulty, context_hint, related_ticker)
-- 2. Cron Job 재설정 (07:30 KST 생성 + 23:00 KST 정답 판정)
-- 3. 관리자 수동 정답 판정 함수 (테스트/어드민용)
-- 4. 배너 테스트용 샘플 데이터 삽입
-- ============================================================================


-- ============================================================================
-- STEP 1: prediction_polls 누락 컬럼 추가
-- (task-e-predictions.ts가 삽입하는 컬럼 중 초기 마이그레이션에 빠진 것들)
-- ============================================================================

ALTER TABLE prediction_polls
  ADD COLUMN IF NOT EXISTS difficulty    TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  ADD COLUMN IF NOT EXISTS context_hint  TEXT,        -- 복기 시 학습 포인트
  ADD COLUMN IF NOT EXISTS related_ticker TEXT;       -- 관련 종목 티커 (예: SPY, BTC)

COMMENT ON COLUMN prediction_polls.difficulty     IS 'easy|medium|hard — 질문 난이도';
COMMENT ON COLUMN prediction_polls.context_hint   IS '복기 시 학습 포인트 (2~3문장)';
COMMENT ON COLUMN prediction_polls.related_ticker IS '관련 종목 티커 (예: SPY, BTC, KRW=X)';


-- ============================================================================
-- STEP 2: Cron Job 재설정
-- 기존 스케줄 제거 후 2개 job으로 분리:
--   - 07:30 KST (22:30 UTC 전날): 예측 질문 생성
--   - 23:00 KST (14:00 UTC): 전날 마감 투표 정답 판정
-- ============================================================================

-- pg_cron 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 스케줄 제거
DO $$
BEGIN
  PERFORM cron.unschedule('daily-briefing')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-briefing');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('prediction-resolve')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prediction-resolve');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Job 1: 매일 07:30 KST = 22:30 UTC (전날) — daily-briefing 전체 실행
-- (맥락 카드 + 예측 질문 3개 생성 포함)
SELECT cron.schedule(
  'daily-briefing',
  '30 22 * * *',  -- 매일 22:30 UTC = 다음날 07:30 KST
  $$
    SELECT net.http_post(
      url     := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing',
      headers := '{"Authorization": "Bearer ' ||
                 current_setting('app.settings.service_role_key', true) ||
                 '", "Content-Type": "application/json"}'::jsonb,
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Job 2: 매일 23:00 KST = 14:00 UTC — 정답 판정 전용 실행
-- (당일 24시간 마감 투표 → Gemini로 정답 판정 → 크레딧 지급)
-- body의 {"tasks":["E2"]}로 E-2 Task만 선택 실행 (다른 Task 제외)
SELECT cron.schedule(
  'prediction-resolve',
  '0 14 * * *',  -- 매일 14:00 UTC = 23:00 KST
  $$
    SELECT net.http_post(
      url     := 'https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/daily-briefing',
      headers := '{"Authorization": "Bearer ' ||
                 current_setting('app.settings.service_role_key', true) ||
                 '", "Content-Type": "application/json"}'::jsonb,
      body    := '{"tasks": ["E2"]}'::jsonb
    ) AS request_id;
  $$
);

-- Cron 등록 확인
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname IN ('daily-briefing', 'prediction-resolve');


-- ============================================================================
-- STEP 3: 관리자 수동 정답 판정 함수
-- 어드민이 직접 특정 투표를 정답 판정할 수 있는 함수
-- Supabase Dashboard → SQL Editor에서 수동 호출 가능
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_resolve_poll_manual(
  p_poll_id    UUID,
  p_answer     TEXT,      -- 'YES' 또는 'NO'
  p_source     TEXT DEFAULT '관리자 수동 판정'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- resolve_poll RPC 호출 (기존 RPC 재사용)
  SELECT * INTO v_result
  FROM resolve_poll(p_poll_id, p_answer, p_source);

  IF v_result.success THEN
    RETURN format('[완료] 정답: %s | 보상받은 유저: %s명 | 총 크레딧: %sC',
                  p_answer, v_result.voters_rewarded, v_result.total_credits);
  ELSE
    RETURN '[실패] 이미 판정된 투표이거나 투표를 찾을 수 없습니다.';
  END IF;
END;
$$;

COMMENT ON FUNCTION admin_resolve_poll_manual IS
  '어드민 수동 정답 판정. 사용: SELECT admin_resolve_poll_manual(''poll_uuid'', ''YES'', ''출처'');';


-- ============================================================================
-- STEP 4: 배너 테스트용 샘플 resolved 데이터
-- useGlobalPredictionStats 쿼리가 데이터를 반환하도록 샘플 삽입
-- 조건: status='resolved', correct_answer IS NOT NULL, resolved_at >= NOW()-30days
--
-- ⚠️  이 데이터는 테스트용입니다. 실제 서비스에서는 Edge Function이 자동 생성합니다.
-- ⚠️  배너가 이미 실데이터로 작동하면 이 블록은 실행하지 않아도 됩니다.
-- ============================================================================

-- 샘플 resolved 투표 5개 삽입 (지난 7일간)
-- 커뮤니티 총 투표: YES 380표 중 260표 정답 → 약 68% 적중
INSERT INTO prediction_polls (
  question, description, category,
  yes_label, no_label,
  yes_count, no_count,
  deadline, status,
  correct_answer, source, reward_credits,
  difficulty, context_hint, related_ticker,
  resolved_at, created_at
)
VALUES
-- 1. S&P 500 (YES 정답)
(
  'S&P 500이 이번 주 전일 대비 상승 마감했나요?',
  '미국 연준 FOMC 회의 결과 금리 동결 + 고용 지표 호조로 낙관론 확산.',
  'stocks',
  '상승 마감', '하락 마감',
  124, 56,
  NOW() - INTERVAL '6 days',
  'resolved', 'YES',
  'Yahoo Finance — S&P 500 종가 5,823 (전일 대비 +0.4%) 확인',
  2,
  'easy',
  '금리 동결 = 단기 주가 상승 요인. 하지만 "좋은 뉴스가 나쁜 뉴스"가 되는 역설에 주목하세요.',
  'SPY',
  NOW() - INTERVAL '5 days 22 hours',
  NOW() - INTERVAL '7 days'
),
-- 2. 비트코인 (NO 정답)
(
  '비트코인이 이번 주 $100,000를 돌파할까요?',
  'BTC ETF 순유입 지속. 기관 매수세 + 반감기 기대감. (현재가: $97,800)',
  'crypto',
  '돌파한다', '못한다',
  78, 102,
  NOW() - INTERVAL '5 days',
  'resolved', 'NO',
  'CoinMarketCap — BTC 주간 최고가 $99,120. $100K 돌파 실패.',
  2,
  'medium',
  '심리적 저항선($100K)에서 차익 실현 매물이 쏟아지는 경우가 많습니다. 큰 숫자 앞에서 한 번 쉬어가는 패턴을 기억하세요.',
  'BTC',
  NOW() - INTERVAL '4 days 22 hours',
  NOW() - INTERVAL '6 days'
),
-- 3. 원/달러 환율 (YES 정답)
(
  '이번 주 원/달러 환율이 1,450원 아래로 내려갈까요?',
  '한은 구두 개입 + 미 달러 약세 흐름. (현재: 1,467원)',
  'macro',
  '내려간다', '유지/상승',
  65, 115,
  NOW() - INTERVAL '4 days',
  'resolved', 'YES',
  '서울외환시장 — 원/달러 주간 종가 1,438원. 예상보다 빠른 하락.',
  2,
  'hard',
  '환율은 금리차·경상수지·자본흐름이 복합 작용합니다. 구두 개입은 단기 효과에 그치는 경우가 많아요.',
  'KRW=X',
  NOW() - INTERVAL '3 days 22 hours',
  NOW() - INTERVAL '5 days'
),
-- 4. 나스닥 (YES 정답)
(
  '나스닥 100이 이번 주 전고점(21,000)을 돌파할까요?',
  'AI 반도체 수요 증가 + NVIDIA 실적 호조 기대감.',
  'stocks',
  '돌파한다', '못한다',
  89, 71,
  NOW() - INTERVAL '3 days',
  'resolved', 'YES',
  'Bloomberg — QQQ 주간 종가 $521.3. 나스닥 100 기준 21,340 달성.',
  2,
  'medium',
  'AI 인프라 투자 사이클은 아직 초기 단계라는 분석이 많습니다. NVIDIA 실적은 시장 전체의 체온계 역할을 해요.',
  'QQQ',
  NOW() - INTERVAL '2 days 22 hours',
  NOW() - INTERVAL '4 days'
),
-- 5. 코스피 (NO 정답)
(
  '코스피가 이번 주 2,700을 회복할까요?',
  '삼성전자 HBM3E 수율 개선 기대 + 외국인 순매수 전환.',
  'stocks',
  '회복한다', '못한다',
  58, 112,
  NOW() - INTERVAL '2 days',
  'resolved', 'NO',
  '한국거래소 — 코스피 주간 종가 2,651. 2,700 저항선 돌파 실패.',
  2,
  'medium',
  '코스피 2,700은 강한 심리적 저항선입니다. 외국인 매수가 지속되어야 돌파가 가능해요.',
  '005930.KS',
  NOW() - INTERVAL '1 day 22 hours',
  NOW() - INTERVAL '3 days'
)
ON CONFLICT DO NOTHING;

-- 삽입 결과 확인
SELECT
  COUNT(*) AS total_resolved,
  COUNT(*) FILTER (WHERE correct_answer = 'YES') AS yes_correct,
  COUNT(*) FILTER (WHERE correct_answer = 'NO') AS no_correct,
  ROUND(
    SUM(
      CASE
        WHEN correct_answer = 'YES' THEN yes_count
        WHEN correct_answer = 'NO'  THEN no_count
        ELSE 0
      END
    )::NUMERIC /
    NULLIF(SUM(yes_count + no_count), 0) * 100
  , 1) AS community_accuracy_pct
FROM prediction_polls
WHERE status = 'resolved'
  AND correct_answer IS NOT NULL
  AND resolved_at >= NOW() - INTERVAL '30 days';


-- ============================================================================
-- STEP 5: 정답 판정 기록 조회 뷰 (어드민 모니터링용)
-- Supabase Dashboard → Table Editor에서 확인 가능
-- ============================================================================

CREATE OR REPLACE VIEW prediction_accuracy_summary AS
SELECT
  DATE_TRUNC('week', resolved_at) AS week,
  COUNT(*)                        AS resolved_count,
  SUM(yes_count + no_count)       AS total_votes,
  ROUND(
    SUM(
      CASE
        WHEN correct_answer = 'YES' THEN yes_count
        WHEN correct_answer = 'NO'  THEN no_count
        ELSE 0
      END
    )::NUMERIC /
    NULLIF(SUM(yes_count + no_count), 0) * 100
  , 1)                            AS community_accuracy_pct,
  SUM(yes_count + no_count) FILTER (WHERE correct_answer = 'YES') AS yes_voters,
  SUM(yes_count + no_count) FILTER (WHERE correct_answer = 'NO')  AS no_voters
FROM prediction_polls
WHERE status = 'resolved'
  AND correct_answer IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW prediction_accuracy_summary IS
  '주별 커뮤니티 예측 적중률 요약. AI 트랙레코드 배너 기반 데이터.';


-- ============================================================================
-- 사용 가이드
-- ============================================================================
--
-- [수동 테스트 - 정답 판정]
-- 1. 활성 투표 목록 조회:
--    SELECT id, question, deadline, status FROM prediction_polls WHERE status = 'active';
--
-- 2. 특정 투표 수동 판정:
--    SELECT admin_resolve_poll_manual('투표-UUID', 'YES', '수동 판정 테스트');
--
-- [Cron 실행 히스토리 확인]
--    SELECT * FROM cron.job_run_details
--    WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('daily-briefing', 'prediction-resolve'))
--    ORDER BY start_time DESC LIMIT 20;
--
-- [배너 데이터 수동 확인]
--    SELECT * FROM prediction_accuracy_summary;
--
-- [Edge Function 수동 트리거 (배포 후)]
--    supabase functions invoke daily-briefing --project-ref ruqeinfcqhgexrckonsy
-- ============================================================================
