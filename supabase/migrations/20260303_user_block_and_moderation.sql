-- ============================================================================
-- Apple Guideline 1.2 준수: 사용자 차단 + 콘텐츠 모더레이션 시스템
-- 2026-03-03
-- ============================================================================

-- 1. user_blocks 테이블: 사용자 간 차단
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_user_id),
  CHECK (blocker_id != blocked_user_id)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- 자신의 차단 목록만 조회 가능
CREATE POLICY "users_see_own_blocks" ON user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

-- 자신만 차단 추가 가능
CREATE POLICY "users_insert_own_blocks" ON user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- 자신만 차단 해제 가능
CREATE POLICY "users_delete_own_blocks" ON user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);

-- 2. profiles에 community_terms_accepted 컬럼 추가 (EULA 동의 추적)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS community_terms_accepted_at TIMESTAMPTZ;

-- 3. community_reports에 신고 시 자동 차단 여부 + 신고 대상 user_id 추가
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id);
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS auto_blocked BOOLEAN DEFAULT FALSE;

-- 4. 차단된 사용자의 게시물 필터링을 위한 뷰 (성능 최적화)
CREATE OR REPLACE FUNCTION get_blocked_user_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(blocked_user_id), ARRAY[]::UUID[])
  FROM user_blocks
  WHERE blocker_id = p_user_id;
$$;

-- 5. 차단 + 신고 통합 함수 (Apple 요구: 차단 시 개발자에게 알림 + 콘텐츠 즉시 제거)
CREATE OR REPLACE FUNCTION block_and_report_user(
  p_blocked_user_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocker_id UUID;
  v_block_id UUID;
BEGIN
  v_blocker_id := auth.uid();
  IF v_blocker_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF v_blocker_id = p_blocked_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cannot_block_self');
  END IF;

  -- 차단 추가 (이미 존재하면 무시)
  INSERT INTO user_blocks (blocker_id, blocked_user_id, reason)
  VALUES (v_blocker_id, p_blocked_user_id, p_reason)
  ON CONFLICT (blocker_id, blocked_user_id) DO NOTHING
  RETURNING id INTO v_block_id;

  -- 신고도 함께 등록 (Apple 요구: 차단 시 개발자에게 알림)
  IF p_target_type IS NOT NULL AND p_target_id IS NOT NULL THEN
    INSERT INTO community_reports (reporter_id, target_type, target_id, target_user_id, reason, description, auto_blocked)
    VALUES (
      v_blocker_id,
      p_target_type::text,
      p_target_id,
      p_blocked_user_id,
      'abuse',
      COALESCE(p_reason, 'User blocked this account'),
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'block_id', v_block_id);
END;
$$;
