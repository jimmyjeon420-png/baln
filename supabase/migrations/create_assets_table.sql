-- ============================================================
-- Supabase assets 테이블 생성 스크립트
-- Smart Rebalancer App용
--
-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor 접속
-- 2. 이 스크립트 전체 복사 후 실행
-- ============================================================

-- 기존 테이블 삭제 (주의: 데이터 손실)
DROP TABLE IF EXISTS public.assets;

-- assets 테이블 생성
CREATE TABLE public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
    avg_price DECIMAL(20, 2) NOT NULL DEFAULT 0,
    current_price DECIMAL(20, 2) NOT NULL DEFAULT 0,
    asset_type VARCHAR(20) DEFAULT 'stock',
    currency VARCHAR(10) DEFAULT 'KRW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_ticker ON public.assets(ticker);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 자산만 조회 가능
CREATE POLICY "Users can view own assets" ON public.assets
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 자산만 추가 가능
CREATE POLICY "Users can insert own assets" ON public.assets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 자산만 수정 가능
CREATE POLICY "Users can update own assets" ON public.assets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 자산만 삭제 가능
CREATE POLICY "Users can delete own assets" ON public.assets
    FOR DELETE
    USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블 코멘트
COMMENT ON TABLE public.assets IS '사용자 자산 포트폴리오 테이블';
COMMENT ON COLUMN public.assets.ticker IS '종목 코드 (예: AAPL, 005930.KS, BTC)';
COMMENT ON COLUMN public.assets.name IS '종목명 (예: 애플, 삼성전자, 비트코인)';
COMMENT ON COLUMN public.assets.quantity IS '보유 수량';
COMMENT ON COLUMN public.assets.avg_price IS '평균 매입 단가';
COMMENT ON COLUMN public.assets.current_price IS '현재가';
COMMENT ON COLUMN public.assets.asset_type IS '자산 유형 (stock, crypto, etf, bond)';
COMMENT ON COLUMN public.assets.currency IS '통화 (KRW, USD)';

-- 완료 메시지
SELECT 'assets 테이블이 성공적으로 생성되었습니다!' AS result;
