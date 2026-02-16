-- 콘텐츠 발행 시스템 추가
-- 관리자가 콘텐츠를 확인하고 승인하는 워크플로우

-- 1. daily_market_insights 테이블에 발행 상태 추가
ALTER TABLE daily_market_insights
ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'archived'));

ALTER TABLE daily_market_insights
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 2. guru_insights 테이블에 발행 상태 추가
ALTER TABLE guru_insights
ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'archived'));

ALTER TABLE guru_insights
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 3. prediction_polls 테이블에 발행 상태 추가
ALTER TABLE prediction_polls
ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'archived'));

ALTER TABLE prediction_polls
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 4. context_cards 테이블 생성 (맥락 카드 전용)
CREATE TABLE IF NOT EXISTS context_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  layer_1_historical TEXT, -- 역사적 맥락
  layer_2_macro_chain TEXT, -- 거시경제 체인
  layer_3_institution TEXT, -- 기관 행동
  layer_4_portfolio TEXT, -- 내 포트폴리오 영향
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX idx_context_cards_date ON context_cards(date DESC);
CREATE INDEX idx_context_cards_status ON context_cards(publish_status, date DESC);

-- 5. 기존 데이터를 'published' 상태로 전환 (이미 사용자에게 노출된 콘텐츠)
UPDATE daily_market_insights
SET publish_status = 'published', published_at = created_at
WHERE publish_status IS NULL OR publish_status = 'draft';

UPDATE guru_insights
SET publish_status = 'published', published_at = created_at
WHERE publish_status IS NULL OR publish_status = 'draft';

UPDATE prediction_polls
SET publish_status = 'published', published_at = created_at
WHERE publish_status IS NULL OR publish_status = 'draft';

-- 6. 트리거: published_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.publish_status = 'published' AND OLD.publish_status != 'published' THEN
    NEW.published_at = NOW();
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_market_insights_publish_trigger
  BEFORE UPDATE ON daily_market_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_published_at();

CREATE TRIGGER guru_insights_publish_trigger
  BEFORE UPDATE ON guru_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_published_at();

CREATE TRIGGER prediction_polls_publish_trigger
  BEFORE UPDATE ON prediction_polls
  FOR EACH ROW
  EXECUTE FUNCTION update_published_at();

CREATE TRIGGER context_cards_publish_trigger
  BEFORE UPDATE ON context_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_published_at();

COMMENT ON COLUMN daily_market_insights.publish_status IS '발행 상태: draft(임시), published(발행됨), archived(보관)';
COMMENT ON COLUMN guru_insights.publish_status IS '발행 상태: draft(임시), published(발행됨), archived(보관)';
COMMENT ON COLUMN prediction_polls.publish_status IS '발행 상태: draft(임시), published(발행됨), archived(보관)';
COMMENT ON TABLE context_cards IS '맥락 카드 4겹 레이어 (킬링 피처)';
