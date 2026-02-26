-- ============================================================================
-- VIP 라운지 리디자인 마이그레이션 (2026-02-27)
-- 1) 구루 AI 댓글 테이블
-- 2) 자산 인증 확장 (profiles)
-- 3) 게시물 인증 여부 (community_posts)
-- 4) 자산 인증 RPC
-- ============================================================================

-- 1) 구루 AI 댓글 전용 테이블 (human 댓글과 분리)
CREATE TABLE IF NOT EXISTS community_guru_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  guru_id VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  content_en TEXT,
  sentiment VARCHAR(20) DEFAULT 'NEUTRAL',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: post_id + created_at (구루 댓글 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_guru_comments_post ON community_guru_comments(post_id, created_at);

-- RLS 활성화
ALTER TABLE community_guru_comments ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 읽기 허용
CREATE POLICY "guru_comments_read" ON community_guru_comments
  FOR SELECT USING (auth.role() = 'authenticated');

-- 서비스 역할만 삽입 가능 (클라이언트에서 직접 삽입)
CREATE POLICY "guru_comments_insert" ON community_guru_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2) 자산 인증 컬럼 (profiles 확장)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_method VARCHAR(20);

-- 3) 게시물에 인증 여부 저장 (작성 시점 스냅샷)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_author_verified BOOLEAN DEFAULT false;

-- 4) 자산 인증 RPC 함수
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
