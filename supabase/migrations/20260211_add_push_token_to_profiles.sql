-- ============================================================================
-- Phase 5: 푸시 알림 지원 - profiles 테이블에 push_token 컬럼 추가
-- ============================================================================

-- 1. push_token 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

-- 2. 인덱스: 푸시 알림 전송 시 활성 토큰 조회 최적화
CREATE INDEX IF NOT EXISTS idx_profiles_push_token
  ON profiles(push_token)
  WHERE push_token IS NOT NULL;

-- 3. 코멘트
COMMENT ON COLUMN profiles.push_token
  IS 'Expo Push Token for sending notifications';
COMMENT ON COLUMN profiles.push_token_updated_at
  IS 'Last time the push token was updated';
