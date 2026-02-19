-- ============================================================
-- admin_action_logs RLS 활성화
-- 2026-02-20: Supabase 보안 감사에서 발견, 즉시 수정
-- ============================================================
-- 문제: admin_action_logs 테이블이 RLS 없이 public에 노출
-- 해결: RLS 활성화 + 관리자 전용 읽기 정책 적용

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 역할(Edge Function)만 모든 작업 허용
-- 일반 사용자는 완전 차단
CREATE POLICY "Service role only"
  ON public.admin_action_logs
  FOR ALL
  USING (auth.role() = 'service_role');
