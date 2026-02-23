-- ============================================================================
-- admin_delete_post 수정: community_likes 잘못된 컬럼 참조 수정
-- 날짜: 2026-02-23
--
-- 문제:
-- - admin_delete_post()가 community_likes에 없는 target_id/target_type 컬럼 참조
-- - 실행 시 "column does not exist" 에러로 항상 롤백됨
-- - 실제 테이블은 (user_id, post_id) PK 구조이며 ON DELETE CASCADE 설정됨
--
-- 해결:
-- - FK CASCADE가 community_likes, community_comments, community_comment_likes,
--   post_bookmarks, post_reports를 모두 자동 삭제하므로 수동 삭제 불필요
-- - community_reports만 polymorphic 관계(FK 없음)이므로 수동 삭제 유지
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_delete_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 존재 확인
  IF NOT EXISTS (SELECT 1 FROM community_posts WHERE id = p_post_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '게시글을 찾을 수 없습니다.');
  END IF;

  -- 신고 삭제 (polymorphic 관계, FK CASCADE 없음)
  DELETE FROM community_reports
  WHERE (target_id = p_post_id AND target_type = 'post')
     OR (target_type = 'comment' AND target_id IN (
           SELECT id FROM community_comments WHERE post_id = p_post_id
         ));

  -- 게시글 삭제 (나머지는 FK CASCADE로 자동 처리)
  -- CASCADE 대상: community_comments, community_likes,
  --   community_comment_likes, post_bookmarks, post_reports
  DELETE FROM community_posts WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- PostgREST 캐시 리로드
SELECT pg_notify('pgrst', 'reload schema');

COMMENT ON FUNCTION admin_delete_post(UUID) IS
  '관리자 게시글 삭제 (FK CASCADE 활용, community_reports만 수동 삭제)';
