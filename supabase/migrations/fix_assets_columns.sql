-- ============================================================
-- assets 테이블 컬럼 수정 스크립트
--
-- 문제: avg_price 컬럼이 존재하지 않는 오류 해결
--
-- 실행 방법:
-- 1. Supabase Dashboard (https://supabase.com/dashboard)
-- 2. 프로젝트 선택 → SQL Editor
-- 3. 이 스크립트 전체 복사 후 실행 (Run 버튼)
-- ============================================================

-- 방법 1: 테이블이 없거나 새로 시작하는 경우 (권장)
-- 기존 테이블 삭제하고 새로 생성
DROP TABLE IF EXISTS public.assets CASCADE;

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

-- 인덱스 생성
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_ticker ON public.assets(ticker);

-- RLS 활성화
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS 정책들
CREATE POLICY "Users can view own assets" ON public.assets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets" ON public.assets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets" ON public.assets
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets" ON public.assets
    FOR DELETE USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 완료 확인
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;
