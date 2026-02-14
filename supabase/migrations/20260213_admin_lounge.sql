-- ============================================
-- Admin Lounge Management RPC Functions
-- VIP 라운지 관리자 기능 (게시글 + 모임 관리)
-- 2026-02-13
-- ============================================

-- ============================================
-- 0. community_posts에 is_pinned 컬럼 추가
-- ============================================
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_community_posts_pinned
  ON community_posts(is_pinned DESC, created_at DESC);

-- ============================================
-- 1. admin_get_lounge_posts
-- 게시글 목록 조회 (작성자 이메일 포함)
-- p_filter: 'all' | 'reported' | 'pinned'
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_lounge_posts(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_posts JSONB;
  v_total BIGINT;
BEGIN
  -- 관리자 권한 확인
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 전체 수 카운트
  IF p_filter = 'reported' THEN
    SELECT COUNT(DISTINCT cp.id) INTO v_total
    FROM community_posts cp
    INNER JOIN community_reports cr ON cr.target_id = cp.id AND cr.target_type = 'post' AND cr.status = 'pending';
  ELSIF p_filter = 'pinned' THEN
    SELECT COUNT(*) INTO v_total
    FROM community_posts cp
    WHERE cp.is_pinned = TRUE;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM community_posts cp;
  END IF;

  -- 게시글 조회
  IF p_filter = 'reported' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb) INTO v_posts
    FROM (
      SELECT DISTINCT ON (cp.id) jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', p.email,
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', cp.likes_count,
        'comments_count', cp.comments_count,
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (SELECT COUNT(*) FROM community_reports cr2 WHERE cr2.target_id = cp.id AND cr2.target_type = 'post' AND cr2.status = 'pending')
      ) AS row_data
      FROM community_posts cp
      LEFT JOIN profiles p ON p.id = cp.user_id
      INNER JOIN community_reports cr ON cr.target_id = cp.id AND cr.target_type = 'post' AND cr.status = 'pending'
      LIMIT p_limit OFFSET p_offset
    ) sub;
  ELSIF p_filter = 'pinned' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb) INTO v_posts
    FROM (
      SELECT jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', p.email,
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', cp.likes_count,
        'comments_count', cp.comments_count,
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (SELECT COUNT(*) FROM community_reports cr2 WHERE cr2.target_id = cp.id AND cr2.target_type = 'post' AND cr2.status = 'pending')
      ) AS row_data
      FROM community_posts cp
      LEFT JOIN profiles p ON p.id = cp.user_id
      WHERE cp.is_pinned = TRUE
      ORDER BY cp.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  ELSE
    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'is_pinned')::boolean DESC, row_data->>'created_at' DESC), '[]'::jsonb) INTO v_posts
    FROM (
      SELECT jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'email', p.email,
        'display_tag', cp.display_tag,
        'content', cp.content,
        'category', cp.category,
        'likes_count', cp.likes_count,
        'comments_count', cp.comments_count,
        'is_pinned', COALESCE(cp.is_pinned, false),
        'created_at', cp.created_at,
        'report_count', (SELECT COUNT(*) FROM community_reports cr2 WHERE cr2.target_id = cp.id AND cr2.target_type = 'post' AND cr2.status = 'pending')
      ) AS row_data
      FROM community_posts cp
      LEFT JOIN profiles p ON p.id = cp.user_id
      ORDER BY cp.is_pinned DESC NULLS LAST, cp.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  END IF;

  result := jsonb_build_object(
    'posts', v_posts,
    'total_count', v_total
  );

  RETURN result;
END;
$$;

-- ============================================
-- 2. admin_delete_post
-- 게시글 삭제 (연관된 댓글, 좋아요, 신고도 함께 삭제)
-- ============================================
CREATE OR REPLACE FUNCTION admin_delete_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- 신고 삭제 (연관된 신고들)
  DELETE FROM community_reports WHERE target_id = p_post_id AND target_type = 'post';

  -- 댓글 좋아요 삭제 (댓글에 연결된 좋아요)
  DELETE FROM community_likes WHERE target_type = 'comment' AND target_id IN (
    SELECT id::text FROM community_comments WHERE post_id = p_post_id
  );

  -- 댓글 삭제
  DELETE FROM community_comments WHERE post_id = p_post_id;

  -- 게시글 좋아요 삭제
  DELETE FROM community_likes WHERE target_id = p_post_id::text AND target_type = 'post';

  -- 북마크 삭제
  DELETE FROM post_bookmarks WHERE post_id = p_post_id;

  -- 게시글 삭제
  DELETE FROM community_posts WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- 3. admin_toggle_pin_post
-- 게시글 고정/해제 토글
-- ============================================
CREATE OR REPLACE FUNCTION admin_toggle_pin_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_pinned BOOLEAN;
BEGIN
  -- 관리자 권한 확인
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 현재 상태 조회
  SELECT COALESCE(is_pinned, false) INTO v_current_pinned
  FROM community_posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '게시글을 찾을 수 없습니다.');
  END IF;

  -- 토글
  UPDATE community_posts
  SET is_pinned = NOT v_current_pinned, updated_at = NOW()
  WHERE id = p_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_pinned', NOT v_current_pinned
  );
END;
$$;

-- ============================================
-- 4. admin_get_gatherings
-- 모임 목록 조회
-- p_filter: 'all' | 'open' | 'closed' | 'cancelled'
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_gatherings(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_gatherings JSONB;
  v_total BIGINT;
BEGIN
  -- 관리자 권한 확인
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 전체 수 카운트
  IF p_filter = 'all' THEN
    SELECT COUNT(*) INTO v_total FROM gatherings;
  ELSE
    SELECT COUNT(*) INTO v_total FROM gatherings WHERE status = p_filter;
  END IF;

  -- 모임 조회
  IF p_filter = 'all' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'event_date' DESC), '[]'::jsonb) INTO v_gatherings
    FROM (
      SELECT jsonb_build_object(
        'id', g.id,
        'host_id', g.host_id,
        'host_email', p.email,
        'host_display_name', g.host_display_name,
        'host_tier', g.host_tier,
        'title', g.title,
        'description', g.description,
        'category', g.category,
        'entry_fee', g.entry_fee,
        'max_capacity', g.max_capacity,
        'current_capacity', g.current_capacity,
        'event_date', g.event_date,
        'location', g.location,
        'location_type', g.location_type,
        'status', g.status,
        'min_tier_required', g.min_tier_required,
        'created_at', g.created_at
      ) AS row_data
      FROM gatherings g
      LEFT JOIN profiles p ON p.id = g.host_id
      ORDER BY g.event_date DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  ELSE
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'event_date' DESC), '[]'::jsonb) INTO v_gatherings
    FROM (
      SELECT jsonb_build_object(
        'id', g.id,
        'host_id', g.host_id,
        'host_email', p.email,
        'host_display_name', g.host_display_name,
        'host_tier', g.host_tier,
        'title', g.title,
        'description', g.description,
        'category', g.category,
        'entry_fee', g.entry_fee,
        'max_capacity', g.max_capacity,
        'current_capacity', g.current_capacity,
        'event_date', g.event_date,
        'location', g.location,
        'location_type', g.location_type,
        'status', g.status,
        'min_tier_required', g.min_tier_required,
        'created_at', g.created_at
      ) AS row_data
      FROM gatherings g
      LEFT JOIN profiles p ON p.id = g.host_id
      WHERE g.status = p_filter
      ORDER BY g.event_date DESC
      LIMIT p_limit OFFSET p_offset
    ) sub;
  END IF;

  result := jsonb_build_object(
    'gatherings', v_gatherings,
    'total_count', v_total
  );

  RETURN result;
END;
$$;

-- ============================================
-- 5. admin_cancel_gathering
-- 모임 취소 (status -> 'cancelled')
-- ============================================
CREATE OR REPLACE FUNCTION admin_cancel_gathering(p_gathering_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 존재 확인
  IF NOT EXISTS (SELECT 1 FROM gatherings WHERE id = p_gathering_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '모임을 찾을 수 없습니다.');
  END IF;

  -- 이미 취소된 경우
  IF EXISTS (SELECT 1 FROM gatherings WHERE id = p_gathering_id AND status = 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 취소된 모임입니다.');
  END IF;

  -- 상태 변경
  UPDATE gatherings
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_gathering_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- 코멘트
-- ============================================
COMMENT ON FUNCTION admin_get_lounge_posts(INTEGER, INTEGER, TEXT) IS '관리자용 라운지 게시글 목록 조회';
COMMENT ON FUNCTION admin_delete_post(UUID) IS '관리자용 게시글 삭제 (연관 데이터 포함)';
COMMENT ON FUNCTION admin_toggle_pin_post(UUID) IS '관리자용 게시글 고정/해제 토글';
COMMENT ON FUNCTION admin_get_gatherings(INTEGER, INTEGER, TEXT) IS '관리자용 모임 목록 조회';
COMMENT ON FUNCTION admin_cancel_gathering(UUID) IS '관리자용 모임 취소';
