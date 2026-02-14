-- community_comments 테이블에 누락된 display_tag 컬럼 추가
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS display_tag VARCHAR(100) DEFAULT '';
