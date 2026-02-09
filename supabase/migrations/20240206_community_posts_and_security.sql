-- [긴급 수정] likes_count 컬럼이 없으면 강제로 추가
ALTER TABLE IF EXISTS community_posts 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- [긴급 수정] view_count 컬럼도 없을 수 있으니 미리 추가 (안전장치)
ALTER TABLE IF EXISTS community_posts 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
-- ================================================================
-- ULTRA-DEEP SECURITY MIGRATION
-- 1. community_posts 테이블 생성 (PGRST205 에러 해결)
-- 2. RLS 보안 정책 (티어 스푸핑 방지)
-- 3. Race Condition 방지 함수
-- ================================================================

-- ================================================================
-- 1. COMMUNITY_POSTS 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_tag VARCHAR(100) NOT NULL,           -- "[자산: 1.2억 / 수익: 0.3억]"
  asset_mix VARCHAR(200),                       -- "Tech 70%, Crypto 30%"
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  total_assets_at_post DECIMAL(18, 2) NOT NULL, -- 작성 시점 자산 스냅샷
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_likes ON community_posts(likes_count DESC);

-- RLS 활성화
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 모든 인증 사용자 조회 가능
CREATE POLICY "community_posts_read" ON community_posts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기 정책: 본인만 작성 가능 + 1억 이상 자산 검증
CREATE POLICY "community_posts_insert" ON community_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND total_assets_at_post >= 100000000  -- 1억 이상만 작성 가능
  );

-- 수정 정책: 본인만 수정 가능
CREATE POLICY "community_posts_update" ON community_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 삭제 정책: 본인만 삭제 가능
CREATE POLICY "community_posts_delete" ON community_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- 2. 좋아요 증가 RPC 함수 (Race Condition 방지)
-- ================================================================

CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 원자적 증가 (동시성 안전)
  UPDATE community_posts
  SET
    likes_count = likes_count + 1,
    updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. GATHERINGS 테이블 RLS 보안 정책
-- ================================================================

-- RLS 활성화
ALTER TABLE gatherings ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 모든 인증 사용자 조회 가능
CREATE POLICY "gatherings_read" ON gatherings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기 정책: 호스트만 생성 가능 + 티어 검증
CREATE POLICY "gatherings_insert" ON gatherings
  FOR INSERT
  WITH CHECK (
    auth.uid() = host_id
    AND host_verified_assets >= 100000000  -- 1억 이상만 호스팅 가능
  );

-- 수정 정책: 호스트만 수정 가능
CREATE POLICY "gatherings_update" ON gatherings
  FOR UPDATE
  USING (auth.uid() = host_id);

-- ================================================================
-- 4. GATHERING_PARTICIPANTS 테이블 RLS + 티어 검증
-- ================================================================

-- RLS 활성화
ALTER TABLE gathering_participants ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 모든 인증 사용자 조회 가능
CREATE POLICY "participants_read" ON gathering_participants
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 참가 신청 정책: 본인만 신청 가능
CREATE POLICY "participants_insert" ON gathering_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 수정 정책: 본인 또는 모임 호스트만 수정 가능
CREATE POLICY "participants_update" ON gathering_participants
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT host_id FROM gatherings WHERE id = gathering_id
    )
  );

-- ================================================================
-- 5. 모임 참가 시 인원 원자적 증가 함수 (Race Condition 방지)
-- CRITICAL: 동시 참가 신청 시 정원 초과 방지
-- ================================================================

CREATE OR REPLACE FUNCTION join_gathering_atomic(
  p_gathering_id UUID,
  p_user_id UUID,
  p_display_name VARCHAR,
  p_verified_assets DECIMAL,
  p_tier VARCHAR
)
RETURNS JSON AS $$
DECLARE
  v_gathering RECORD;
  v_existing RECORD;
  v_required_tier VARCHAR;
  v_user_tier_level INTEGER;
  v_required_tier_level INTEGER;
  v_participation RECORD;
BEGIN
  -- 1. 모임 정보 조회 (FOR UPDATE로 락 획득)
  SELECT * INTO v_gathering
  FROM gatherings
  WHERE id = p_gathering_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', '모임을 찾을 수 없습니다.');
  END IF;

  IF v_gathering.status != 'open' THEN
    RETURN json_build_object('success', false, 'error', '모집이 마감된 모임입니다.');
  END IF;

  IF v_gathering.current_capacity >= v_gathering.max_capacity THEN
    RETURN json_build_object('success', false, 'error', '정원이 가득 찼습니다.');
  END IF;

  -- 2. 티어 레벨 비교 (서버사이드 TBAC)
  v_required_tier := COALESCE(v_gathering.min_tier_required, 'SILVER');

  SELECT CASE v_required_tier
    WHEN 'SILVER' THEN 1
    WHEN 'GOLD' THEN 2
    WHEN 'PLATINUM' THEN 3
    WHEN 'DIAMOND' THEN 4
    ELSE 1
  END INTO v_required_tier_level;

  SELECT CASE p_tier
    WHEN 'SILVER' THEN 1
    WHEN 'GOLD' THEN 2
    WHEN 'PLATINUM' THEN 3
    WHEN 'DIAMOND' THEN 4
    ELSE 1
  END INTO v_user_tier_level;

  IF v_user_tier_level < v_required_tier_level THEN
    RETURN json_build_object(
      'success', false,
      'error', v_required_tier || ' 등급 이상만 참가할 수 있습니다.'
    );
  END IF;

  -- 3. 중복 참가 확인
  SELECT * INTO v_existing
  FROM gathering_participants
  WHERE gathering_id = p_gathering_id
    AND user_id = p_user_id
    AND status != 'cancelled';

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', '이미 참가 신청한 모임입니다.');
  END IF;

  -- 4. 참가 기록 생성 (원자적)
  INSERT INTO gathering_participants (
    gathering_id, user_id, status, paid_amount, payment_status,
    participant_display_name, participant_verified_assets, participant_tier,
    applied_at, approved_at
  ) VALUES (
    p_gathering_id, p_user_id, 'approved', v_gathering.entry_fee, 'completed',
    p_display_name, p_verified_assets, p_tier,
    NOW(), NOW()
  )
  RETURNING * INTO v_participation;

  -- 5. 인원 증가 (원자적)
  UPDATE gatherings
  SET
    current_capacity = current_capacity + 1,
    status = CASE
      WHEN current_capacity + 1 >= max_capacity THEN 'closed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_gathering_id;

  RETURN json_build_object(
    'success', true,
    'participation', row_to_json(v_participation)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. 프로필 총 자산 검증 함수 (티어 스푸핑 방지)
-- 클라이언트가 보낸 값 대신 서버에서 직접 계산
-- ================================================================

CREATE OR REPLACE FUNCTION get_verified_user_tier(p_user_id UUID)
RETURNS TABLE (
  total_assets DECIMAL,
  tier VARCHAR,
  is_eligible_for_lounge BOOLEAN
) AS $$
DECLARE
  v_total DECIMAL;
  v_tier VARCHAR;
BEGIN
  -- 포트폴리오에서 총 자산 계산 (서버사이드)
  SELECT COALESCE(SUM(
    CASE
      WHEN quantity IS NOT NULL AND current_price IS NOT NULL
        THEN quantity * current_price
      ELSE current_value
    END
  ), 0) INTO v_total
  FROM portfolios
  WHERE user_id = p_user_id;

  -- 티어 계산
  v_tier := CASE
    WHEN v_total >= 1000000000 THEN 'DIAMOND'
    WHEN v_total >= 500000000 THEN 'PLATINUM'
    WHEN v_total >= 100000000 THEN 'GOLD'
    ELSE 'SILVER'
  END;

  -- 프로필 동기화
  UPDATE profiles
  SET
    total_assets = v_total,
    tier = v_tier,
    tier_updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_total, v_tier, v_total >= 100000000;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. PORTFOLIOS 테이블 RLS
-- ================================================================

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 본인 자산만 조회 가능
CREATE POLICY "portfolios_read" ON portfolios
  FOR SELECT
  USING (auth.uid() = user_id);

-- 쓰기 정책: 본인 자산만 생성 가능
CREATE POLICY "portfolios_insert" ON portfolios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 수정 정책: 본인 자산만 수정 가능
CREATE POLICY "portfolios_update" ON portfolios
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 삭제 정책: 본인 자산만 삭제 가능
CREATE POLICY "portfolios_delete" ON portfolios
  FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- 8. PROFILES 테이블 RLS
-- ================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 모든 인증 사용자가 프로필 조회 가능 (티어 표시용)
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 수정 정책: 본인 프로필만 수정 가능
-- CRITICAL: total_assets, tier 필드는 트리거로만 업데이트 (직접 수정 금지)
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ================================================================
-- 마이그레이션 완료
-- ================================================================

COMMENT ON TABLE community_posts IS 'VIP 라운지 커뮤니티 게시물 (1억+ 회원 전용)';
COMMENT ON FUNCTION increment_post_likes(UUID) IS '좋아요 원자적 증가 (Race Condition 방지)';
COMMENT ON FUNCTION join_gathering_atomic(UUID, UUID, VARCHAR, DECIMAL, VARCHAR) IS '모임 참가 원자적 처리 (Race Condition + TBAC 서버사이드 검증)';
COMMENT ON FUNCTION get_verified_user_tier(UUID) IS '서버사이드 티어 계산 (스푸핑 방지)';
