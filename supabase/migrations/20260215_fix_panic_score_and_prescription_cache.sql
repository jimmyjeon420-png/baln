-- 2026-02-15: save_panic_shield_score 오버로딩 충돌 해결 + 처방전 캐시 UNIQUE 제약조건 추가
-- 이미 프로덕션 DB에 적용됨 (Management API로 직접 실행)

-- 1) save_panic_shield_score 중복 함수 삭제 (numeric 버전만 유지)
DROP FUNCTION IF EXISTS public.save_panic_shield_score(smallint);
DROP FUNCTION IF EXISTS public.save_panic_shield_score(uuid, numeric);

-- 2) user_daily_prescriptions: prescription_data NOT NULL 해제 + UNIQUE 제약조건 추가
ALTER TABLE public.user_daily_prescriptions ALTER COLUMN prescription_data DROP NOT NULL;
ALTER TABLE public.user_daily_prescriptions ALTER COLUMN prescription_data SET DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_daily_prescriptions_user_date_unique'
  ) THEN
    ALTER TABLE public.user_daily_prescriptions
      ADD CONSTRAINT user_daily_prescriptions_user_date_unique UNIQUE (user_id, date);
  END IF;
END $$;
