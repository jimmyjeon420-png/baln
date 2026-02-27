-- ============================================================================
-- 통합 대기 마이그레이션 (2026-02-27)
--
-- 이 파일은 아직 Supabase에 배포되지 않은 마이그레이션들을 합친 것입니다.
-- Supabase Dashboard → SQL Editor에서 한 번에 실행하세요.
--
-- 포함된 마이그레이션:
-- 1) 댓글 삭제 RLS + RPC (20260222)
-- 2) 게시글 삭제 RLS + RPC (20260222)
-- 3) 구루 AI 댓글 테이블 + 자산 인증 (20260227)
-- 4) 구루 댓글 라이벌 토론 컬럼 (20260226)
-- 5) 맥락 카드 3시간 자동 업데이트 크론 (20260221)
-- ============================================================================


-- ====================================================================
-- PART 1: 댓글 삭제 안정화
-- ====================================================================

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_comments_delete" ON community_comments;
CREATE POLICY "community_comments_delete" ON community_comments
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION delete_own_community_comment(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_post_id UUID;
  v_owner_id UUID;
  v_before_count INTEGER := 0;
  v_after_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  SELECT post_id, user_id
  INTO v_post_id, v_owner_id
  FROM community_comments
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_owner_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'forbidden');
  END IF;

  SELECT COUNT(*) INTO v_before_count
  FROM community_comments
  WHERE post_id = v_post_id;

  DELETE FROM community_comments
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'delete_failed');
  END IF;

  SELECT COUNT(*) INTO v_after_count
  FROM community_comments
  WHERE post_id = v_post_id;

  UPDATE community_posts
  SET comments_count = GREATEST(v_after_count, 0)
  WHERE id = v_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'reason', 'deleted',
    'post_id', v_post_id,
    'deleted_count', GREATEST(v_before_count - v_after_count, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_community_comment(UUID) TO authenticated;


-- ====================================================================
-- PART 2: 게시글 삭제 안정화
-- ====================================================================

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_delete" ON community_posts;
CREATE POLICY "community_posts_delete" ON community_posts
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION delete_own_community_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  SELECT user_id
  INTO v_owner_id
  FROM community_posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_owner_id <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'forbidden');
  END IF;

  DELETE FROM community_posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'delete_failed');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reason', 'deleted',
    'post_id', p_post_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_community_post(UUID) TO authenticated;


-- ====================================================================
-- PART 3: 구루 AI 댓글 테이블 + 자산 인증
-- ====================================================================

CREATE TABLE IF NOT EXISTS community_guru_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  guru_id VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  content_en TEXT,
  sentiment VARCHAR(20) DEFAULT 'NEUTRAL',
  reply_to_guru_id VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guru_comments_post ON community_guru_comments(post_id, created_at);

ALTER TABLE community_guru_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guru_comments_read" ON community_guru_comments;
CREATE POLICY "guru_comments_read" ON community_guru_comments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "guru_comments_insert" ON community_guru_comments;
CREATE POLICY "guru_comments_insert" ON community_guru_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 자산 인증 컬럼 (profiles 확장)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_method VARCHAR(20);

-- 게시물에 인증 여부 저장 (작성 시점 스냅샷)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_author_verified BOOLEAN DEFAULT false;

-- 자산 인증 RPC 함수
CREATE OR REPLACE FUNCTION verify_user_assets(
  p_verified_total DECIMAL,
  p_method VARCHAR DEFAULT 'screenshot'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    is_verified = true,
    verified_total_assets = p_verified_total,
    verified_at = NOW(),
    verification_method = p_method
  WHERE id = auth.uid();

  RETURN json_build_object('success', true);
END;
$$;


-- ====================================================================
-- PART 4: 맥락 카드 3시간 자동 업데이트 크론
-- ====================================================================

-- time_slot CHECK 제약 확장 (8개 시간대 + 레거시 3개)
ALTER TABLE context_cards DROP CONSTRAINT IF EXISTS context_cards_time_slot_check;
ALTER TABLE context_cards
  ADD CONSTRAINT context_cards_time_slot_check
  CHECK (time_slot IN (
    'h00', 'h03', 'h06', 'h09', 'h12', 'h15', 'h18', 'h21',
    'morning', 'afternoon', 'evening'
  ));

-- 기존 데이터 마이그레이션
UPDATE context_cards SET time_slot = 'h06' WHERE time_slot = 'morning';
UPDATE context_cards SET time_slot = 'h15' WHERE time_slot = 'afternoon';
UPDATE context_cards SET time_slot = 'h18' WHERE time_slot = 'evening';

-- 기존 cron job 제거
SELECT cron.unschedule('context-card-morning')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'context-card-morning');

SELECT cron.unschedule('context-card-afternoon')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'context-card-afternoon');

SELECT cron.unschedule('context-card-evening')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'context-card-evening');

-- 새 cron job: 매 3시간마다 맥락 카드 자동 생성
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


-- ====================================================================
-- PART 5: PostgREST 캐시 리로드 + 확인
-- ====================================================================

SELECT pg_notify('pgrst', 'reload schema');

-- 크론 잡 등록 확인
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobid;

DO $$
BEGIN
  RAISE NOTICE '✅ 통합 마이그레이션 완료:';
  RAISE NOTICE '   1) 댓글 삭제 RLS + RPC';
  RAISE NOTICE '   2) 게시글 삭제 RLS + RPC';
  RAISE NOTICE '   3) 구루 AI 댓글 테이블';
  RAISE NOTICE '   4) 맥락 카드 3시간 자동 업데이트';
END $$;
