-- ================================================================
-- VIP 라운지 게시물 RLS 정책 수정
--
-- 기존: total_assets_at_post >= 1억 강제 → 무료 기간 + 소액 유저 게시물 등록 실패
-- 수정: 자산 검증은 클라이언트에서 처리, DB는 본인 확인만
--       (무료 기간에는 자산 기준 없이 게시 가능)
-- ================================================================

-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "community_posts_insert" ON community_posts;

-- 새 INSERT 정책: 본인 확인만 (자산 검증은 앱에서)
CREATE POLICY "community_posts_insert" ON community_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
