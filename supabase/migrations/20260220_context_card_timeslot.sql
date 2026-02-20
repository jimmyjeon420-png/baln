-- ============================================================================
-- 맥락 카드 시간대(time_slot) 지원 추가 (2026-02-20)
-- 하루 1회 → 하루 3회로 업데이트 주기 확장
--
-- 배경:
--   기존에는 하루 1개 카드만 존재 (UNIQUE(date))
--   → 오전 6:00 / 오후 3:00 / 저녁 7:00 KST 3회로 확장
--   → 장 전, 장 중, 장 후 각 시점에 맞는 맥락 제공
--
-- 변경 요약:
--   1. time_slot 컬럼 추가 ('morning' | 'afternoon' | 'evening')
--   2. updated_at 컬럼 추가 (정확한 업데이트 시각 추적)
--   3. UNIQUE(date) 제약 해제 → UNIQUE(date, time_slot)으로 교체
--   4. 인덱스 재생성 (date + time_slot 복합)
--   5. service_role UPDATE 정책 추가 (UPSERT 지원)
-- ============================================================================


-- ============================================================================
-- 1. time_slot 컬럼 추가
--    기존 카드는 'morning'으로 기본값 설정
-- ============================================================================

ALTER TABLE context_cards
  ADD COLUMN IF NOT EXISTS time_slot TEXT NOT NULL DEFAULT 'morning'
    CHECK (time_slot IN ('morning', 'afternoon', 'evening'));

COMMENT ON COLUMN context_cards.time_slot IS
'하루 3회 업데이트 시간대:
  morning   = 오전 6:00 KST (장 전 브리핑 — 간밤 미국 지수 + 오늘 이벤트 예고)
  afternoon = 오후 3:00 KST (장 중 업데이트 — 현재 시장 흐름 + 기관 동향)
  evening   = 저녁 7:00 KST (장 마감 브리핑 — 오늘 결산 + 내일 예측)';


-- ============================================================================
-- 2. updated_at 컬럼 추가
--    Edge Function이 UPSERT 할 때마다 갱신 → 클라이언트에서 "방금 업데이트" 표시 가능
-- ============================================================================

ALTER TABLE context_cards
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN context_cards.updated_at IS
'카드가 마지막으로 생성/수정된 정확한 시각 (KST로 표시 시 +9시간)';


-- ============================================================================
-- 3. 기존 UNIQUE(date) 제약 해제
--    date 단독 유니크 → date + time_slot 복합 유니크로 전환
--
--    주의: Supabase는 UNIQUE 제약의 이름을 자동 생성함.
--    일반적인 이름 패턴: context_cards_date_key
--    IF EXISTS로 감싸 이미 삭제된 경우 오류 없이 넘어감.
-- ============================================================================

DO $$
BEGIN
  -- UNIQUE(date) 제약 제거 시도 (이름이 다를 경우 대비해 pg_constraint 조회)
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'context_cards'::regclass
      AND  contype  = 'u'
      AND  conname  = 'context_cards_date_key'
  ) THEN
    ALTER TABLE context_cards DROP CONSTRAINT context_cards_date_key;
  END IF;
END $$;

-- date + time_slot 복합 유니크 제약 추가
-- "같은 날 같은 시간대 카드는 1개만 존재" 보장
ALTER TABLE context_cards
  DROP CONSTRAINT IF EXISTS context_cards_date_time_slot_key;

ALTER TABLE context_cards
  ADD CONSTRAINT context_cards_date_time_slot_key
  UNIQUE (date, time_slot);

COMMENT ON CONSTRAINT context_cards_date_time_slot_key ON context_cards IS
'같은 날짜 + 같은 시간대에 카드는 1개만 허용. Edge Function이 UPSERT 시 이 제약을 기준으로 업데이트.';


-- ============================================================================
-- 4. 인덱스 재생성
--    기존 idx_context_cards_date (date DESC) → date + time_slot 복합으로 교체
--    클라이언트 쿼리: WHERE date = today ORDER BY time_slot DESC (최신 시간대 먼저)
-- ============================================================================

-- 기존 단일 컬럼 인덱스 제거
DROP INDEX IF EXISTS idx_context_cards_date;

-- 새 복합 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_context_cards_date_slot
  ON context_cards (date DESC, time_slot);

COMMENT ON INDEX idx_context_cards_date_slot IS
'날짜 역순 + 시간대 조회 최적화. 클라이언트가 "오늘 저녁 카드"를 빠르게 찾을 수 있게 함.';


-- ============================================================================
-- 5. service_role UPDATE 정책 추가
--    기존: INSERT만 허용
--    변경: INSERT + UPDATE 모두 허용 → UPSERT (ON CONFLICT DO UPDATE) 동작 가능
--
--    Edge Function이 같은 date + time_slot으로 재생성 시 내용을 갱신해야 하므로 필요.
-- ============================================================================

-- 기존 INSERT 정책 확인 후 UPDATE 정책 추가
-- (INSERT 정책은 20240209_context_cards.sql에서 이미 생성됨)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_policies
    WHERE  tablename = 'context_cards'
      AND  policyname = 'Edge Function은 카드 업데이트 가능'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Edge Function은 카드 업데이트 가능"
        ON context_cards FOR UPDATE
        TO service_role
        USING (true)
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;

COMMENT ON TABLE context_cards IS
'baln 킬링 피처: 하루 3회 (오전 6:00 / 오후 3:00 / 저녁 7:00 KST) 시장 맥락 카드.
 각 time_slot별로 1개 카드가 존재하며, Edge Function(generate-context-card)이 자동 생성/업데이트.
 5겹 레이어: 역사적 맥락 → 거시경제 체인 → 정치 맥락 → 기관 행동 → 포트폴리오 영향';


-- ============================================================================
-- 마이그레이션 완료 확인용 (psql 실행 시 출력됨)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ context_cards time_slot 마이그레이션 완료';
  RAISE NOTICE '   - time_slot 컬럼 추가 (morning / afternoon / evening)';
  RAISE NOTICE '   - updated_at 컬럼 추가';
  RAISE NOTICE '   - UNIQUE(date) → UNIQUE(date, time_slot) 전환';
  RAISE NOTICE '   - 인덱스: idx_context_cards_date_slot 생성';
  RAISE NOTICE '   - service_role UPDATE 정책 추가';
END $$;
