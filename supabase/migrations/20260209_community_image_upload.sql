-- ================================================================
-- 커뮤니티 이미지 업로드 지원
-- ================================================================
-- 목적: 게시글 작성 시 이미지 첨부 기능 추가 (최대 3장)
-- 작성일: 2026-02-09

-- 1. community_posts 테이블에 image_urls 컬럼 추가
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT NULL;

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN community_posts.image_urls IS '첨부 이미지 URL 배열 (최대 3장, 각 5MB 이하)';

-- 3. Storage Bucket 생성 (Supabase Dashboard에서 수동 생성 필요)
-- Bucket name: community-images
-- Public access: true
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png

-- 4. Storage RLS 정책 (Supabase Dashboard에서 수동 설정 필요)
-- Policy 1: "Anyone can view images"
--   Operation: SELECT
--   Role: public
--   Expression: true
--
-- Policy 2: "Users can upload their own images"
--   Operation: INSERT
--   Role: authenticated
--   Expression: bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy 3: "Users can delete their own images"
--   Operation: DELETE
--   Role: authenticated
--   Expression: bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]

-- 5. 인덱스 추가 (이미지가 있는 게시물 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_community_posts_image_urls
  ON community_posts USING GIN (image_urls)
  WHERE image_urls IS NOT NULL;

-- 6. 제약 조건 추가 (최대 3장 제한)
ALTER TABLE community_posts
  ADD CONSTRAINT chk_image_urls_max_count
  CHECK (image_urls IS NULL OR array_length(image_urls, 1) <= 3);

-- 7. 기존 데이터 호환성 확인
-- image_urls 컬럼은 DEFAULT NULL이므로 기존 게시글은 영향 없음
