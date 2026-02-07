-- ================================================================
-- 커뮤니티 접근제어 강화 + 좋아요 시스템 + 보유종목 표시
--
-- 접근 등급:
--   열람: 자산 100만원 이상 (또는 자산인증 완료)
--   댓글: 자산 1,000만원 이상
--   글쓰기: 자산 1.5억 이상
--
-- 좋아요: 유저당 1회 토글 (community_likes 테이블)
-- 보유종목: 글 작성 시 작성자 포트폴리오 스냅샷 저장
-- ================================================================

-- ================================================================
-- 1. community_posts에 보유종목 스냅샷 컬럼 추가
-- ================================================================

-- 작성자의 상위 보유종목 (작성 시점 스냅샷)
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS top_holdings JSONB DEFAULT '[]'::jsonb;
-- 예시: [{"ticker":"AAPL","name":"애플","type":"stock","value":50000000},
--        {"ticker":"BTC","name":"비트코인","type":"crypto","value":20000000}]

-- ================================================================
-- 2. community_likes 테이블 (유저당 1회 좋아요)
-- ================================================================

CREATE TABLE IF NOT EXISTS community_likes (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id   UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- 게시물별 좋아요 목록 빠른 조회
CREATE INDEX IF NOT EXISTS idx_community_likes_post
  ON community_likes(post_id);

-- RLS
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_likes_read" ON community_likes
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "community_likes_insert" ON community_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_likes_delete" ON community_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- 3. 좋아요 토글 RPC (insert/delete + count 동기화)
-- ================================================================

CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
BEGIN
  -- 이미 좋아요 했는지 확인
  SELECT EXISTS(
    SELECT 1 FROM community_likes
    WHERE user_id = v_user_id AND post_id = p_post_id
  ) INTO v_exists;

  IF v_exists THEN
    -- 좋아요 취소
    DELETE FROM community_likes
    WHERE user_id = v_user_id AND post_id = p_post_id;

    UPDATE community_posts
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = p_post_id;

    RETURN FALSE;  -- 좋아요 해제됨
  ELSE
    -- 좋아요 추가
    INSERT INTO community_likes (user_id, post_id)
    VALUES (v_user_id, p_post_id);

    UPDATE community_posts
    SET likes_count = likes_count + 1
    WHERE id = p_post_id;

    RETURN TRUE;  -- 좋아요 됨
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. 댓글 RLS 정책 업데이트 (1억 → 1000만원)
-- ================================================================

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "community_comments_insert" ON community_comments;

CREATE POLICY "community_comments_insert" ON community_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND total_assets_at_comment >= 10000000  -- 1000만원 이상
  );

-- ================================================================
-- 완료
-- ================================================================

COMMENT ON TABLE community_likes IS '커뮤니티 좋아요 (유저당 1회, 토글)';
COMMENT ON FUNCTION toggle_post_like(UUID) IS '좋아요 토글: TRUE=좋아요, FALSE=취소';
