-- ================================================================
-- GATHERINGS 테이블 생성 마이그레이션
-- 모임/스터디 마켓플레이스 기능
-- ================================================================

-- 1. GATHERINGS 테이블 생성
CREATE TABLE IF NOT EXISTS gatherings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL CHECK (category IN ('study', 'meeting', 'networking', 'workshop')),
  entry_fee DECIMAL(12, 0) DEFAULT 0 CHECK (entry_fee >= 0),
  max_capacity INTEGER NOT NULL CHECK (max_capacity >= 2 AND max_capacity <= 100),
  current_capacity INTEGER DEFAULT 0 CHECK (current_capacity >= 0),
  event_date TIMESTAMPTZ NOT NULL,
  location VARCHAR(200) NOT NULL,
  location_type VARCHAR(20) DEFAULT 'offline' CHECK (location_type IN ('online', 'offline')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'completed')),
  -- 티어 기반 접근 제어 (TBAC)
  min_tier_required VARCHAR(20) DEFAULT 'SILVER' CHECK (min_tier_required IN ('SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  -- 호스트 정보 스냅샷 (조인 최소화)
  host_display_name VARCHAR(100),
  host_verified_assets DECIMAL(18, 2),
  host_tier VARCHAR(20) DEFAULT 'SILVER' CHECK (host_tier IN ('SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GATHERING_PARTICIPANTS 테이블 생성
CREATE TABLE IF NOT EXISTS gathering_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gathering_id UUID NOT NULL REFERENCES gatherings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  paid_amount DECIMAL(12, 0) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
  -- 참가자 정보 스냅샷
  participant_display_name VARCHAR(100),
  participant_verified_assets DECIMAL(18, 2),
  participant_tier VARCHAR(20) DEFAULT 'SILVER' CHECK (participant_tier IN ('SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 중복 참가 방지
  CONSTRAINT unique_gathering_participant UNIQUE (gathering_id, user_id)
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_gatherings_host ON gatherings(host_id);
CREATE INDEX IF NOT EXISTS idx_gatherings_status ON gatherings(status);
CREATE INDEX IF NOT EXISTS idx_gatherings_event_date ON gatherings(event_date);
CREATE INDEX IF NOT EXISTS idx_gatherings_category ON gatherings(category);
CREATE INDEX IF NOT EXISTS idx_gatherings_min_tier ON gatherings(min_tier_required);

CREATE INDEX IF NOT EXISTS idx_participants_gathering ON gathering_participants(gathering_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON gathering_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON gathering_participants(status);

-- 4. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gatherings_updated_at ON gatherings;
CREATE TRIGGER trigger_gatherings_updated_at
  BEFORE UPDATE ON gatherings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_participants_updated_at ON gathering_participants;
CREATE TRIGGER trigger_participants_updated_at
  BEFORE UPDATE ON gathering_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 마이그레이션 완료
-- ================================================================
COMMENT ON TABLE gatherings IS 'VIP 라운지 모임/스터디 마켓플레이스';
COMMENT ON TABLE gathering_participants IS '모임 참가자 목록';
