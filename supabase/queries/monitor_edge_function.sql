-- ============================================================================
-- Central Kitchen 모니터링 쿼리
-- 사용법: Supabase Dashboard → SQL Editor에서 실행
-- ============================================================================

-- ============================================================================
-- 1. 최근 10회 실행 로그 (전체 개요)
-- ============================================================================
SELECT
  task_name,
  status,
  elapsed_ms,
  result_summary,
  error_message,
  executed_at AT TIME ZONE 'Asia/Seoul' as executed_at_kst
FROM edge_function_logs
WHERE function_name = 'daily-briefing'
ORDER BY executed_at DESC
LIMIT 10;


-- ============================================================================
-- 2. Task별 성공률 통계 (최근 7일)
-- ============================================================================
SELECT
  task_name,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ROUND(AVG(elapsed_ms), 0) as avg_elapsed_ms,
  ROUND(MAX(elapsed_ms), 0) as max_elapsed_ms,
  ROUND(MIN(elapsed_ms), 0) as min_elapsed_ms
FROM edge_function_logs
WHERE function_name = 'daily-briefing'
  AND executed_at >= NOW() - INTERVAL '7 days'
GROUP BY task_name
ORDER BY task_name;


-- ============================================================================
-- 3. 실패한 Task 에러 메시지 (최근 5건)
-- ============================================================================
SELECT
  task_name,
  error_message,
  result_summary,
  executed_at AT TIME ZONE 'Asia/Seoul' as executed_at_kst
FROM edge_function_logs
WHERE function_name = 'daily-briefing'
  AND status = 'FAILED'
ORDER BY executed_at DESC
LIMIT 5;


-- ============================================================================
-- 4. 오늘 배치 실행 여부 확인
-- ============================================================================
SELECT
  task_name,
  status,
  elapsed_ms,
  executed_at AT TIME ZONE 'Asia/Seoul' as executed_at_kst
FROM edge_function_logs
WHERE function_name = 'daily-briefing'
  AND executed_at >= CURRENT_DATE
ORDER BY executed_at DESC;


-- ============================================================================
-- 5. Task별 평균 실행 시간 추이 (최근 7일, 일별)
-- ============================================================================
SELECT
  DATE(executed_at AT TIME ZONE 'Asia/Seoul') as date_kst,
  task_name,
  COUNT(*) as runs,
  ROUND(AVG(elapsed_ms), 0) as avg_elapsed_ms,
  STRING_AGG(status, ', ' ORDER BY executed_at) as status_history
FROM edge_function_logs
WHERE function_name = 'daily-briefing'
  AND executed_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(executed_at AT TIME ZONE 'Asia/Seoul'), task_name
ORDER BY date_kst DESC, task_name;


-- ============================================================================
-- 6. 가장 느린 Task TOP 5 (최근 7일)
-- ============================================================================
SELECT
  task_name,
  elapsed_ms,
  status,
  result_summary,
  executed_at AT TIME ZONE 'Asia/Seoul' as executed_at_kst
FROM edge_function_logs
WHERE function_name = 'daily-briefing'
  AND executed_at >= NOW() - INTERVAL '7 days'
ORDER BY elapsed_ms DESC
LIMIT 5;


-- ============================================================================
-- 7. Cron Job 실행 히스토리 (pg_cron)
-- ============================================================================
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time AT TIME ZONE 'Asia/Seoul' as start_time_kst,
  end_time AT TIME ZONE 'Asia/Seoul' as end_time_kst
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-briefing')
ORDER BY start_time DESC
LIMIT 10;


-- ============================================================================
-- 8. 등록된 Cron Job 목록
-- ============================================================================
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%daily%' OR jobname LIKE '%cleanup%';


-- ============================================================================
-- 9. Task별 결과 요약 (최근 실행)
-- ============================================================================
SELECT
  task_name,
  status,
  result_summary->>'count' as count,
  result_summary->>'sentiment' as sentiment,
  result_summary->>'users' as users,
  result_summary->>'created' as created,
  executed_at AT TIME ZONE 'Asia/Seoul' as executed_at_kst
FROM edge_function_logs
WHERE function_name = 'daily-briefing'
  AND executed_at >= NOW() - INTERVAL '24 hours'
ORDER BY task_name, executed_at DESC;


-- ============================================================================
-- 10. 로그 테이블 크기 및 레코드 수
-- ============================================================================
SELECT
  COUNT(*) as total_records,
  MIN(executed_at) AT TIME ZONE 'Asia/Seoul' as oldest_log_kst,
  MAX(executed_at) AT TIME ZONE 'Asia/Seoul' as latest_log_kst,
  pg_size_pretty(pg_total_relation_size('edge_function_logs')) as table_size
FROM edge_function_logs;
