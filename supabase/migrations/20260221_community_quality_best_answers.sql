-- ============================================================================
-- 커뮤니티 품질 시스템: 베스트 답변 채택
-- 날짜: 2026-02-21
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_best_answers (
  post_id UUID PRIMARY KEY REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  selected_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_best_answers_comment
  ON community_best_answers(comment_id);

ALTER TABLE community_best_answers ENABLE ROW LEVEL SECURITY;

-- 조회: 로그인 사용자 누구나
DROP POLICY IF EXISTS "community_best_answers_read" ON community_best_answers;
CREATE POLICY "community_best_answers_read" ON community_best_answers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 생성/수정/삭제: 게시글 작성자만 가능
DROP POLICY IF EXISTS "community_best_answers_upsert_owner" ON community_best_answers;
CREATE POLICY "community_best_answers_upsert_owner" ON community_best_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM community_posts cp
      WHERE cp.id = post_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "community_best_answers_update_owner" ON community_best_answers;
CREATE POLICY "community_best_answers_update_owner" ON community_best_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM community_posts cp
      WHERE cp.id = post_id
      AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM community_posts cp
      WHERE cp.id = post_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "community_best_answers_delete_owner" ON community_best_answers;
CREATE POLICY "community_best_answers_delete_owner" ON community_best_answers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM community_posts cp
      WHERE cp.id = post_id
      AND cp.user_id = auth.uid()
    )
  );

COMMENT ON TABLE community_best_answers IS '게시글 작성자가 채택한 베스트 답변';
