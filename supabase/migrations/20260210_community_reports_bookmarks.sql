-- ============================================================================
-- 커뮤니티 신고 + 북마크 + 답글 마이그레이션
-- 날짜: 2026-02-10
-- ============================================================================

-- 1. 신고 테이블 (post_reports) — 게시글/댓글 통합 신고
-- 기존 community_reports와 별개로, 구조화된 신고 처리용
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'leading', 'fraud', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 중복 신고 방지: 같은 유저가 같은 대상을 중복 신고 불가
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_reports_unique_post
  ON post_reports(reporter_id, post_id)
  WHERE post_id IS NOT NULL AND comment_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_reports_unique_comment
  ON post_reports(reporter_id, comment_id)
  WHERE comment_id IS NOT NULL;

-- 2. 북마크 테이블
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 인덱스: 사용자별 북마크 조회 최적화
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user ON post_bookmarks(user_id, created_at DESC);

-- 3. 댓글 parent_id 컬럼 (답글용)
-- community_comments에 parent_id가 없으면 추가
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE;

-- RLS 정책
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

-- 신고: 본인 것만 INSERT/SELECT 가능
CREATE POLICY "신고: 본인 작성한 것만 조회" ON post_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "신고: 로그인 사용자 생성 가능" ON post_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 북마크: 본인 것만 CRUD 가능
CREATE POLICY "북마크: 본인 것만 조회" ON post_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "북마크: 본인만 생성" ON post_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "북마크: 본인만 삭제" ON post_bookmarks
  FOR DELETE USING (auth.uid() = user_id);
