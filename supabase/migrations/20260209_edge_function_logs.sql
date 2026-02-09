-- ============================================================================
-- Edge Function 실행 로그 시스템
-- 목적: Central Kitchen Task별 성공/실패 추적 + 성능 모니터링
-- ============================================================================

-- Edge Function 실행 로그 테이블
CREATE TABLE IF NOT EXISTS edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,  -- 'daily-briefing'
  task_name TEXT,  -- 'macro', 'stocks', 'gurus', 'snapshots', 'predictions', 'resolve', 'realestate', 'context_card'
  status TEXT NOT NULL,  -- 'SUCCESS', 'FAILED', 'SKIPPED'
  elapsed_ms INTEGER,  -- 실행 시간 (밀리초)
  error_message TEXT,  -- 실패 시 에러 메시지
  result_summary JSONB,  -- 결과 통계 (예: 종목 개수, 유저 수 등)
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (빠른 조회용)
CREATE INDEX idx_edge_logs_function ON edge_function_logs(function_name, executed_at DESC);
CREATE INDEX idx_edge_logs_task ON edge_function_logs(task_name, status);
CREATE INDEX idx_edge_logs_executed ON edge_function_logs(executed_at DESC);

-- RLS 활성화 (Service Role만 쓰기)
ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;

-- Service Role만 모든 작업 가능
CREATE POLICY "Service role can do everything on edge_function_logs"
  ON edge_function_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7일 이상 된 로그 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_old_edge_logs()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM edge_function_logs
  WHERE executed_at < NOW() - INTERVAL '7 days';

  RAISE NOTICE '오래된 Edge Function 로그 정리 완료';
END;
$$ LANGUAGE plpgsql;

-- 매일 자정 로그 정리 스케줄
SELECT cron.schedule(
  'cleanup-edge-logs',
  '0 0 * * *',  -- 매일 00:00 UTC
  'SELECT cleanup_old_edge_logs();'
);

-- 초기 데이터 확인
COMMENT ON TABLE edge_function_logs IS 'Central Kitchen Edge Function 실행 로그 (7일 보관)';
COMMENT ON COLUMN edge_function_logs.task_name IS 'Task 이름: macro, stocks, gurus, snapshots, predictions, resolve, realestate, context_card';
COMMENT ON COLUMN edge_function_logs.status IS '실행 상태: SUCCESS, FAILED, SKIPPED';
COMMENT ON COLUMN edge_function_logs.result_summary IS 'JSON 형식 결과 요약 (예: {"count": 35, "sentiment": "BULLISH"})';
