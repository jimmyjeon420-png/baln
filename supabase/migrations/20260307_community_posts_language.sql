-- community_posts에 language 컬럼 추가
-- 기존 게시물은 모두 'ko' (한국어)로 설정
-- 새 게시물은 작성 시 앱 언어로 저장

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ko';

-- 기존 게시물 모두 ko로 설정
UPDATE community_posts SET language = 'ko' WHERE language IS NULL;

-- 인덱스 추가 (언어별 필터링 성능)
CREATE INDEX IF NOT EXISTS idx_community_posts_language
  ON community_posts(language);

-- 복합 인덱스 (언어 + 최신순)
CREATE INDEX IF NOT EXISTS idx_community_posts_lang_created
  ON community_posts(language, created_at DESC);
