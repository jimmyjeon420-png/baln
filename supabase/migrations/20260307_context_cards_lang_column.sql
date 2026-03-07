-- context_cards 테이블에 lang 컬럼 추가 (다국어 독립 생성 지원)
-- 기존: (date, time_slot) unique → 변경: (date, time_slot, lang) unique

-- 1. lang 컬럼 추가 (기본값 'ko')
ALTER TABLE context_cards
  ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'ko';

COMMENT ON COLUMN context_cards.lang IS
  'Language code: ko, en, ja — each language gets its own context card per time slot';

-- 2. 기존 unique constraint 제거 후 재생성
-- 기존 constraint 이름 패턴 찾기
DO $$
DECLARE
  old_constraint TEXT;
BEGIN
  -- date,time_slot unique constraint 찾기
  SELECT conname INTO old_constraint
  FROM pg_constraint
  WHERE conrelid = 'context_cards'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2;

  IF old_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE context_cards DROP CONSTRAINT %I', old_constraint);
    RAISE NOTICE 'Dropped old constraint: %', old_constraint;
  END IF;
END $$;

-- 3. 새 unique constraint: (date, time_slot, lang)
ALTER TABLE context_cards
  ADD CONSTRAINT context_cards_date_timeslot_lang_key
  UNIQUE (date, time_slot, lang);

-- 4. user_context_impacts에도 lang 추가 (선택적, 사용자별 영향도는 카드 ID로 연결)
-- 이미 context_card_id FK로 연결되어 있으므로 별도 lang 불필요
