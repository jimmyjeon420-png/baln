-- ============================================================================
-- community_posts 삭제 안정화 (성공 메시지 후 미삭제 이슈 대응)
-- 날짜: 2026-02-22
--
-- 문제:
-- - 운영 환경에서 DELETE RLS 정책 누락/불일치 시
--   DELETE 요청이 0건 처리되어도 클라이언트가 성공으로 오인할 수 있음
--
-- 해결:
-- 1) DELETE RLS 정책 재보장
-- 2) 본인 게시글 삭제 RPC 추가 (함수 내부 소유권 검증)
-- ============================================================================

-- 1) DELETE 정책 재보장
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_delete" ON community_posts;
CREATE POLICY "community_posts_delete" ON community_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2) 본인 게시글 삭제 RPC (RLS 정책 불일치 상황에서도 안정 동작)
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

-- 3) PostgREST 캐시 리로드
SELECT pg_notify('pgrst', 'reload schema');

COMMENT ON FUNCTION delete_own_community_post(UUID) IS
  '본인 게시글 삭제 (RLS 불일치 대응)';
