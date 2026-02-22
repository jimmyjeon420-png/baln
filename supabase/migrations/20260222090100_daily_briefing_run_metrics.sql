-- ============================================================================
-- Daily Briefing 실행 메트릭 표준화
-- 목적:
-- 1) 배치 실행(run) 단위 상태/소요시간 추적
-- 2) Task 단위 성공률/지연시간/토큰량 집계 기반 확보
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1) Run 단위 로그
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_briefing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL DEFAULT 'daily-briefing',
  run_mode TEXT NOT NULL CHECK (run_mode IN ('full', 'selective')),
  selected_tasks TEXT[] NOT NULL DEFAULT '{}',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  elapsed_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_briefing_runs_started_at
  ON daily_briefing_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_briefing_runs_status_started
  ON daily_briefing_runs(status, started_at DESC);

-- --------------------------------------------------------------------------
-- 2) Task 단위 로그
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_briefing_task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES daily_briefing_runs(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'SKIPPED')),
  elapsed_ms INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  tokens_prompt INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_briefing_task_runs_created_at
  ON daily_briefing_task_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_briefing_task_runs_task_status
  ON daily_briefing_task_runs(task_key, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_briefing_task_runs_run_id
  ON daily_briefing_task_runs(run_id);

-- --------------------------------------------------------------------------
-- 3) RLS (service_role 전용)
-- --------------------------------------------------------------------------
ALTER TABLE daily_briefing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefing_task_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_briefing_runs'
      AND policyname = 'Service role can do everything on daily_briefing_runs'
  ) THEN
    CREATE POLICY "Service role can do everything on daily_briefing_runs"
      ON daily_briefing_runs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_briefing_task_runs'
      AND policyname = 'Service role can do everything on daily_briefing_task_runs'
  ) THEN
    CREATE POLICY "Service role can do everything on daily_briefing_task_runs"
      ON daily_briefing_task_runs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 4) 24시간 헬스 뷰
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_daily_briefing_health_24h AS
SELECT
  COUNT(*)::INTEGER AS run_count,
  COUNT(*) FILTER (WHERE status = 'SUCCESS')::INTEGER AS success_count,
  COUNT(*) FILTER (WHERE status = 'PARTIAL')::INTEGER AS partial_count,
  COUNT(*) FILTER (WHERE status = 'FAILED')::INTEGER AS failed_count,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'SUCCESS')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS success_rate_pct,
  ROUND(AVG(elapsed_ms)::NUMERIC, 2) AS avg_elapsed_ms,
  ROUND(
    percentile_cont(0.95) WITHIN GROUP (ORDER BY COALESCE(elapsed_ms, 0))::NUMERIC,
    2
  ) AS p95_elapsed_ms,
  MAX(started_at) AS last_run_at
FROM daily_briefing_runs
WHERE started_at >= NOW() - INTERVAL '24 hours';

CREATE OR REPLACE VIEW vw_daily_briefing_task_health_24h AS
SELECT
  task_key,
  COUNT(*)::INTEGER AS executions,
  COUNT(*) FILTER (WHERE status = 'SUCCESS')::INTEGER AS success_count,
  COUNT(*) FILTER (WHERE status = 'FAILED')::INTEGER AS failed_count,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'SUCCESS')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS success_rate_pct,
  ROUND(AVG(elapsed_ms)::NUMERIC, 2) AS avg_elapsed_ms,
  ROUND(
    percentile_cont(0.95) WITHIN GROUP (ORDER BY COALESCE(elapsed_ms, 0))::NUMERIC,
    2
  ) AS p95_elapsed_ms,
  COALESCE(SUM(tokens_total), 0)::INTEGER AS total_tokens_24h,
  MAX(created_at) AS last_executed_at
FROM daily_briefing_task_runs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY task_key
ORDER BY task_key;

-- --------------------------------------------------------------------------
-- 5) 보관 주기 정리 (30일)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_daily_briefing_metrics()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM daily_briefing_runs
  WHERE started_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cleanup-daily-briefing-metrics'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-daily-briefing-metrics',
      '15 0 * * *',
      'SELECT cleanup_old_daily_briefing_metrics();'
    );
  END IF;
END $$;

COMMENT ON TABLE daily_briefing_runs IS 'daily-briefing 함수 실행(run) 단위 메트릭';
COMMENT ON TABLE daily_briefing_task_runs IS 'daily-briefing Task 단위 실행 메트릭';
COMMENT ON VIEW vw_daily_briefing_health_24h IS '최근 24시간 daily-briefing 런 요약';
COMMENT ON VIEW vw_daily_briefing_task_health_24h IS '최근 24시간 Task별 성공률/지연시간/토큰량';
