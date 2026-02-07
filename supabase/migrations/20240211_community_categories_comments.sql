-- ================================================================
-- 커뮤니티 카테고리 + 댓글 기능 마이그레이션
-- 1. community_posts에 category, comments_count 컬럼 추가
-- 2. community_comments 테이블 생성
-- 3. 댓글 수 증가 RPC 함수
-- ================================================================

-- ================================================================
-- 1. community_posts 테이블에 카테고리 + 댓글 수 컬럼 추가
-- ================================================================

-- 카테고리: stocks(주식방), crypto(코인방), realestate(부동산방)
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'stocks'
    CHECK (category IN ('stocks', 'crypto', 'realestate'));

-- 댓글 수 카운터 (비정규화 — 매번 COUNT 쿼리 방지)
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0
    CHECK (comments_count >= 0);

-- 카테고리별 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_community_posts_category
  ON community_posts(category, created_at DESC);

-- ================================================================
-- 2. COMMUNITY_COMMENTS 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  display_tag VARCHAR(100) NOT NULL,              -- "[자산: X.X억]"
  total_assets_at_comment DECIMAL(18, 2) NOT NULL, -- 작성 시점 자산 스냅샷
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 게시물별 댓글 조회
CREATE INDEX IF NOT EXISTS idx_community_comments_post
  ON community_comments(post_id, created_at ASC);

-- 인덱스: 사용자별 댓글 조회
CREATE INDEX IF NOT EXISTS idx_community_comments_user
  ON community_comments(user_id);

-- ================================================================
-- 3. community_comments RLS 정책
-- ================================================================

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 인증 사용자
CREATE POLICY "community_comments_read" ON community_comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기: 본인만 + 1억 이상
CREATE POLICY "community_comments_insert" ON community_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND total_assets_at_comment >= 100000000
  );

-- 삭제: 본인만
CREATE POLICY "community_comments_delete" ON community_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- 4. 댓글 수 원자적 증가 RPC 함수
-- ================================================================

CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE community_posts
  SET comments_count = comments_count + 1
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 마이그레이션 완료
-- ================================================================

COMMENT ON TABLE community_comments IS 'VIP 라운지 댓글 (1억+ 회원 전용)';
COMMENT ON FUNCTION increment_comment_count(UUID) IS '댓글 수 원자적 증가 (Race Condition 방지)';
