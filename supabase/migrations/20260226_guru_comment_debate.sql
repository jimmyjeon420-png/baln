-- 구루 댓글 라이벌 토론 지원
-- reply_to_guru_id: 어떤 구루에게 반박하는 댓글인지 (NULL = 독립 댓글)
ALTER TABLE community_guru_comments
  ADD COLUMN IF NOT EXISTS reply_to_guru_id VARCHAR(30);
