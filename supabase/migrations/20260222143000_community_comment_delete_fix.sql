-- ============================================================================
-- community_comments 삭제 안정화 (본인 댓글 삭제 실패 이슈 대응)
-- 날짜: 2026-02-22
--
-- 문제:
-- - 운영 환경에서 DELETE RLS 정책이 누락/불일치하면
--   "삭제할 댓글이 없거나 권한이 없습니다" 오류가 발생할 수 있음
--
-- 해결:
-- 1) DELETE RLS 정책을 명시적으로 재보장
-- 2) 본인 댓글 삭제 RPC 추가 (함수 내부 소유권 검증 + comments_count 재동기화)
-- ============================================================================

-- 1) DELETE 정책 재보장
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_comments_delete" ON community_comments;
CREATE POLICY "community_comments_delete" ON community_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2) 본인 댓글 삭제 RPC (RLS 정책 불일치 상황에서도 안정 동작)
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

  -- 삭제 전 전체 댓글 수 (해당 게시물)
  SELECT COUNT(*) INTO v_before_count
  FROM community_comments
  WHERE post_id = v_post_id;

  DELETE FROM community_comments
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'delete_failed');
  END IF;

  -- 삭제 후 전체 댓글 수 재계산 (답글 cascade 삭제 포함 정확 동기화)
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

-- 3) PostgREST 캐시 리로드
SELECT pg_notify('pgrst', 'reload schema');

COMMENT ON FUNCTION delete_own_community_comment(UUID) IS
  '본인 댓글 삭제 + 게시물 comments_count 재동기화 (RLS 불일치 대응)';
