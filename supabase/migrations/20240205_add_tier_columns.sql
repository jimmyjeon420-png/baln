-- ================================================
-- TBAC (Tier-Based Access Control) 마이그레이션
-- 4단계 티어 시스템: SILVER / GOLD / PLATINUM / DIAMOND
-- ================================================

-- 1. profiles 테이블에 티어 관련 컬럼 추가
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_assets DECIMAL(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'SILVER' CHECK (tier IN ('SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ;

-- 2. gatherings 테이블에 최소 티어 요구사항 컬럼 추가
ALTER TABLE gatherings
ADD COLUMN IF NOT EXISTS min_tier_required VARCHAR(20) DEFAULT 'SILVER' CHECK (min_tier_required IN ('SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'));

-- 3. 티어 자동 계산 함수 (포트폴리오 총합 기반)
CREATE OR REPLACE FUNCTION calculate_user_tier(user_total_assets DECIMAL)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF user_total_assets >= 1000000000 THEN
    RETURN 'DIAMOND';  -- 10억 이상
  ELSIF user_total_assets >= 500000000 THEN
    RETURN 'PLATINUM'; -- 5억 이상
  ELSIF user_total_assets >= 100000000 THEN
    RETURN 'GOLD';     -- 1억 이상
  ELSE
    RETURN 'SILVER';   -- 1억 미만
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. 프로필 티어 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_profile_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_total_assets DECIMAL(18, 2);
  new_tier VARCHAR(20);
BEGIN
  -- 해당 사용자의 전체 포트폴리오 합계 계산
  SELECT COALESCE(SUM(current_value), 0) INTO new_total_assets
  FROM portfolios
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  -- 티어 계산
  new_tier := calculate_user_tier(new_total_assets);

  -- profiles 테이블 업데이트
  UPDATE profiles
  SET
    total_assets = new_total_assets,
    tier = new_tier,
    tier_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. portfolios 테이블에 트리거 연결
DROP TRIGGER IF EXISTS trigger_update_profile_tier ON portfolios;
CREATE TRIGGER trigger_update_profile_tier
AFTER INSERT OR UPDATE OR DELETE ON portfolios
FOR EACH ROW
EXECUTE FUNCTION update_profile_tier();

-- 6. 기존 데이터 마이그레이션 (모든 사용자의 티어 재계산)
DO $$
DECLARE
  profile_record RECORD;
  calculated_total DECIMAL(18, 2);
  calculated_tier VARCHAR(20);
BEGIN
  FOR profile_record IN SELECT id FROM profiles LOOP
    -- 포트폴리오 합계 계산
    SELECT COALESCE(SUM(current_value), 0) INTO calculated_total
    FROM portfolios
    WHERE user_id = profile_record.id;

    -- 티어 계산
    calculated_tier := calculate_user_tier(calculated_total);

    -- 프로필 업데이트
    UPDATE profiles
    SET
      total_assets = calculated_total,
      tier = calculated_tier,
      tier_updated_at = NOW()
    WHERE id = profile_record.id;
  END LOOP;

  RAISE NOTICE 'Migrated tier data for all existing profiles';
END $$;

-- 7. 인덱스 추가 (티어 기반 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_total_assets ON profiles(total_assets);
CREATE INDEX IF NOT EXISTS idx_gatherings_min_tier ON gatherings(min_tier_required);

-- 8. RLS (Row Level Security) 정책 업데이트 (선택사항)
-- gatherings 테이블에 티어 기반 접근 제어 추가
-- 참고: 앱에서 이미 클라이언트 사이드 체크를 하고 있으므로 DB 레벨은 선택사항

-- ================================================
-- 마이그레이션 완료
-- ================================================
-- 티어 기준:
-- SILVER: 1억 미만 (기본)
-- GOLD: 1억 ~ 5억
-- PLATINUM: 5억 ~ 10억
-- DIAMOND: 10억 이상
-- ================================================
