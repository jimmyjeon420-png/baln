-- ============================================================================
-- Security Advisor 3 에러 수정
-- 1. prediction_accuracy_summary: SECURITY INVOKER로 변경
-- 2. gathering_participants: RLS 재확인 + 보장
-- 3. market_news: RLS 재확인 + 보장
-- ============================================================================

-- 1. prediction_accuracy_summary 뷰: SECURITY INVOKER로 변경
-- Security Advisor가 "Security Definer View"로 경고
-- PostgreSQL 15+에서 뷰를 security_invoker로 설정하면 뷰 호출자의 RLS 적용
ALTER VIEW prediction_accuracy_summary SET (security_invoker = on);

-- 2. gathering_participants: RLS 반드시 활성화 보장
ALTER TABLE gathering_participants ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 없을 때만 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gathering_participants' AND policyname = 'participants_read'
  ) THEN
    CREATE POLICY "participants_read" ON gathering_participants FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gathering_participants' AND policyname = 'participants_insert'
  ) THEN
    CREATE POLICY "participants_insert" ON gathering_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gathering_participants' AND policyname = 'participants_update'
  ) THEN
    CREATE POLICY "participants_update" ON gathering_participants FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. market_news: RLS 반드시 활성화 보장
ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'market_news' AND policyname = '누구나 뉴스 읽기'
  ) THEN
    CREATE POLICY "누구나 뉴스 읽기" ON market_news FOR SELECT USING (true);
  END IF;
END $$;

-- 4. 37개 경고 수정: Function Search Path Mutable
-- 모든 public 함수에 search_path 고정
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (p.proconfig IS NULL OR NOT p.proconfig @> ARRAY['search_path=public'])
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public',
        func_record.function_name,
        func_record.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter function %.%(%): %',
        func_record.schema_name, func_record.function_name, func_record.args, SQLERRM;
    END;
  END LOOP;
END $$;
