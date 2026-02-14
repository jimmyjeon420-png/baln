-- ============================================================================
-- VIP 라운지 댓글 + 좋아요 기능 수정 마이그레이션
-- 날짜: 2026-02-14
--
-- 문제:
--   1. community_comment_likes 테이블이 존재하지 않음 (코드에서 참조 중)
--   2. community_comments에 updated_at, likes_count 컬럼 누락
--   3. community_comments INSERT RLS가 자산 1000만원 이상 강제 → 무료 기간 차단
--   4. increment_comment_count RPC에 p_delta 파라미터 누락
-- ============================================================================

-- ============================================================================
-- 1. community_comments 테이블에 누락 컬럼 추가
-- ============================================================================

-- 댓글 수정 시각 (useUpdateComment에서 사용)
ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NULL;

-- 댓글 좋아요 수 (useLikeComment에서 사용)
ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- ============================================================================
-- 2. community_comment_likes 테이블 생성
--    (useLikeComment, useMyCommentLikes에서 참조)
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- 인덱스: 댓글별 좋아요 조회
CREATE INDEX IF NOT EXISTS idx_community_comment_likes_comment
  ON community_comment_likes(comment_id);

-- 인덱스: 사용자별 좋아요 조회
CREATE INDEX IF NOT EXISTS idx_community_comment_likes_user
  ON community_comment_likes(user_id);

-- ============================================================================
-- 3. community_comment_likes RLS 정책
-- ============================================================================

ALTER TABLE community_comment_likes ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 인증 사용자
DROP POLICY IF EXISTS "comment_likes_read" ON community_comment_likes;
CREATE POLICY "comment_likes_read" ON community_comment_likes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기: 본인만
DROP POLICY IF EXISTS "comment_likes_insert" ON community_comment_likes;
CREATE POLICY "comment_likes_insert" ON community_comment_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 삭제: 본인만
DROP POLICY IF EXISTS "comment_likes_delete" ON community_comment_likes;
CREATE POLICY "comment_likes_delete" ON community_comment_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. community_comments INSERT RLS 수정
--    기존: total_assets_at_comment >= 10000000 (무료 기간에 차단됨)
--    수정: 본인 확인만 (자산 검증은 앱에서 처리 — freePeriod 로직)
-- ============================================================================

DROP POLICY IF EXISTS "community_comments_insert" ON community_comments;

CREATE POLICY "community_comments_insert" ON community_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. community_comments UPDATE RLS 추가 (수정 기능용)
-- ============================================================================

-- 수정 정책이 없으면 추가 (본인 댓글만 수정 가능)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'community_comments_update'
    AND tablename = 'community_comments'
  ) THEN
    CREATE POLICY "community_comments_update" ON community_comments
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 6. increment_comment_count RPC 수정 (p_delta 파라미터 추가)
--    기존: 항상 +1만 가능
--    수정: p_delta 기본값 1, 삭제 시 -1 전달 가능
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id UUID, p_delta INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE community_posts
  SET comments_count = GREATEST(comments_count + p_delta, 0)
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. PostgREST 스키마 캐시 강제 새로고침
-- ============================================================================

SELECT pg_notify('pgrst', 'reload schema');

-- ============================================================================
-- 코멘트
-- ============================================================================

COMMENT ON TABLE community_comment_likes IS '댓글 좋아요 (유저당 댓글당 1회)';
COMMENT ON FUNCTION increment_comment_count(UUID, INTEGER) IS '댓글 수 증감 (p_delta: 기본 +1, 삭제 시 -1)';
