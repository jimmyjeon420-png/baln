-- ============================================================
-- Smart Rebalancer 프리미엄 플랜 & 검증 필드 마이그레이션
-- 버전: 2.0.0
-- 날짜: 2026-02-04
--
-- 변경 사항:
-- 1. profiles 테이블: 수익화 관련 필드 추가 (월 50만원 목표)
-- 2. portfolios 테이블: 통화 표시 필드 추가
-- 3. 소수점 수량 지원 확인 (fractional shares)
--
-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor 접속
-- 2. 이 스크립트 전체 복사 후 실행
-- ============================================================

-- ============================================================
-- 1. PROFILES 테이블 수익화 필드 추가
-- ============================================================

-- plan_type: 요금제 구분 (free, premium, vip)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'free';

-- is_verified: VIP 라운지 입장 자격 (검증된 자산 보유 여부)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- verified_total_assets: 검증된 총 자산 (KRW 기준)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verified_total_assets DECIMAL(20, 2) DEFAULT NULL;

-- premium_expires_at: 프리미엄 구독 만료일
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN public.profiles.plan_type IS '요금제: free(무료), premium(유료), vip(검증된 고액자산가)';
COMMENT ON COLUMN public.profiles.is_verified IS 'VIP 라운지 입장 자격 - OCR 검증 완료된 자산 보유';
COMMENT ON COLUMN public.profiles.verified_total_assets IS '검증된 총 자산 (KRW) - VIP 등급 결정 기준';
COMMENT ON COLUMN public.profiles.premium_expires_at IS '프리미엄 구독 만료일 (NULL이면 무제한 또는 무료)';

-- ============================================================
-- 2. PORTFOLIOS 테이블 통화 표시 필드 추가
-- ============================================================

-- display_currency: 표시 통화 (항상 KRW - 화면 표시 값 기준)
ALTER TABLE public.portfolios
ADD COLUMN IF NOT EXISTS display_currency VARCHAR(10) DEFAULT 'KRW';

-- 컬럼 코멘트
COMMENT ON COLUMN public.portfolios.display_currency IS '표시 통화 (항상 KRW - 외부 환율 변환 금지)';

-- ============================================================
-- 3. 소수점 수량 지원 확인 (DECIMAL 타입)
-- ============================================================

-- 기존 quantity 컬럼이 INTEGER인 경우 DECIMAL로 변환
-- 주의: 이미 DECIMAL이면 무시됨
DO $$
BEGIN
    -- portfolios 테이블의 quantity 컬럼 타입 확인 및 변환
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'portfolios'
        AND column_name = 'quantity'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.portfolios
        ALTER COLUMN quantity TYPE DECIMAL(18, 8) USING quantity::DECIMAL(18, 8);
        RAISE NOTICE 'portfolios.quantity 컬럼을 DECIMAL(18,8)로 변환했습니다.';
    END IF;

    -- assets 테이블의 quantity 컬럼 타입 확인 (이미 DECIMAL이어야 함)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assets'
        AND column_name = 'quantity'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.assets
        ALTER COLUMN quantity TYPE DECIMAL(20, 8) USING quantity::DECIMAL(20, 8);
        RAISE NOTICE 'assets.quantity 컬럼을 DECIMAL(20,8)로 변환했습니다.';
    END IF;
END $$;

-- ============================================================
-- 4. VIP 라운지 입장 조건 확인 함수 (선택적)
-- ============================================================

-- VIP 자격 확인 함수: 검증된 자산이 1억원 이상이면 VIP
CREATE OR REPLACE FUNCTION check_vip_eligibility(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_verified DECIMAL(20, 2);
    vip_threshold DECIMAL(20, 2) := 100000000; -- 1억원 기준
BEGIN
    -- 검증된 자산 총액 계산
    SELECT COALESCE(SUM(current_value), 0) INTO total_verified
    FROM public.portfolios
    WHERE user_id = user_uuid
    AND is_verified = true;

    -- 프로필 업데이트
    UPDATE public.profiles
    SET
        verified_total_assets = total_verified,
        is_verified = (total_verified >= vip_threshold),
        plan_type = CASE
            WHEN total_verified >= vip_threshold THEN 'vip'
            ELSE plan_type
        END,
        updated_at = NOW()
    WHERE id = user_uuid;

    RETURN total_verified >= vip_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 코멘트
COMMENT ON FUNCTION check_vip_eligibility IS 'VIP 라운지 입장 자격 확인 - 검증된 자산 1억원 이상';

-- ============================================================
-- 5. 인덱스 추가 (성능 최적화)
-- ============================================================

-- plan_type 인덱스 (요금제별 사용자 조회용)
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type ON public.profiles(plan_type);

-- is_verified 인덱스 (VIP 사용자 조회용)
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);

-- portfolios is_verified 인덱스
CREATE INDEX IF NOT EXISTS idx_portfolios_is_verified ON public.portfolios(is_verified);

-- ============================================================
-- 완료 메시지
-- ============================================================
SELECT '마이그레이션 완료! 프리미엄 플랜 및 검증 필드가 추가되었습니다.' AS result;
