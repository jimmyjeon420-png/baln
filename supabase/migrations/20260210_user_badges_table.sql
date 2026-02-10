-- ============================================================================
-- 사용자 뱃지 시스템 (출시 준비용)
-- ============================================================================
-- 역할: 사용자가 획득한 뱃지를 저장하는 테이블
-- 출시 전 준비: 테이블만 생성, 실제 뱃지 지급은 출시 후
-- ============================================================================

-- 사용자 뱃지 테이블
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 제약조건
  UNIQUE(user_id, badge_id),
  CONSTRAINT check_badge_id CHECK (badge_id ~ '^[a-z0-9_]+$')
);

-- 인덱스
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_earned ON user_badges(earned_at DESC);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- RLS (Row Level Security)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- 정책 1: 모든 사용자는 모든 뱃지를 볼 수 있음 (프로필 공개)
CREATE POLICY "Users can view all badges"
  ON user_badges FOR SELECT
  USING (true);

-- 정책 2: 시스템만 뱃지를 지급할 수 있음 (Edge Function or 본인)
CREATE POLICY "System can grant badges"
  ON user_badges FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    auth.jwt()->>'role' = 'service_role'
  );

-- 정책 3: 뱃지는 삭제 불가 (획득한 뱃지는 영구 보유)
-- (DELETE 정책 없음 = 아무도 삭제 못함)

-- ============================================================================
-- 헬퍼 함수: 사용자 스트릭 조회 (뱃지 조건 체크용)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, last_checkin_date DATE) AS $$
  SELECT
    COALESCE(current_streak, 0) as current_streak,
    last_checkin_date
  FROM user_checkin_streaks
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 헬퍼 함수: 사용자 뱃지 수 조회 (프로필 표시용)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_badge_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_badges
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 주석
-- ============================================================================

COMMENT ON TABLE user_badges IS '사용자가 획득한 뱃지 목록';
COMMENT ON COLUMN user_badges.badge_id IS '뱃지 ID (badgeDefinitions.ts에 정의)';
COMMENT ON COLUMN user_badges.earned_at IS '뱃지 획득 시각';
COMMENT ON FUNCTION get_user_streak IS '사용자 연속 출석 일수 조회 (뱃지 조건 체크용)';
COMMENT ON FUNCTION get_user_badge_count IS '사용자가 보유한 뱃지 총 개수';
