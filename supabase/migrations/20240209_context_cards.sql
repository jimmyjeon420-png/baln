-- ============================================================================
-- 맥락 카드 (Context Cards) 시스템
-- baln의 킬링 피처: 시장 변동의 "왜"를 4겹으로 설명
--
-- 레이어:
--   1. 역사적 맥락 (Historical Context)
--   2. 거시경제 체인 (Macro Chain)
--   3. 기관 행동 (Institutional Behavior)
--   4. 내 포트폴리오 영향 (User Impact)
-- ============================================================================

-- ============================================================================
-- 1. 맥락 카드 테이블 (context_cards)
-- 일자별 글로벌 맥락 카드 (모든 유저 공유)
-- ============================================================================

CREATE TABLE IF NOT EXISTS context_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 헤드라인
  headline TEXT NOT NULL,  -- "오늘 당신의 자산이 -1.2% 빠진 이유"

  -- 4겹 레이어
  historical_context TEXT,  -- "2008년에도 이런 패턴이 있었고..."
  macro_chain JSONB DEFAULT '[]'::jsonb,  -- ["CPI 발표", "금리 인상 우려", "기술주 하락"]
  institutional_behavior TEXT,  -- "외국인 3일 연속 순매도 중"

  -- 메타데이터
  sentiment TEXT DEFAULT 'calm' CHECK (sentiment IN ('calm', 'caution', 'alert')),
  is_premium_only BOOLEAN DEFAULT false,  -- 기관 행동 레이어 등 프리미엄 잠금
  market_data JSONB DEFAULT '{}'::jsonb,  -- 추가 시장 지표 (VIX, 환율 등)

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약: 하루에 1개 카드만
  UNIQUE(date)
);

-- ============================================================================
-- 2. 유저별 맥락 카드 영향도 (user_context_impacts)
-- 개인화된 4번째 레이어: "당신의 포트폴리오는 -1.2% 영향"
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_context_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_card_id UUID NOT NULL REFERENCES context_cards(id) ON DELETE CASCADE,

  -- 영향도 지표
  percent_change DECIMAL(8,2),        -- 수익률 변화 (예: -1.2)
  health_score_change DECIMAL(8,2),   -- 건강 점수 변화 (예: -5.0)
  impact_message TEXT,                -- "당신의 포트폴리오는 -1.2% 영향, 건강 점수 변동 없음"

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약: 한 유저당 한 카드에 1개 영향도만
  UNIQUE(user_id, context_card_id)
);

-- ============================================================================
-- 3. 인덱스 (성능 최적화)
-- ============================================================================

-- 맥락 카드 날짜 역순 조회 (최신순)
CREATE INDEX IF NOT EXISTS idx_context_cards_date ON context_cards(date DESC);

-- 유저별 영향도 조회
CREATE INDEX IF NOT EXISTS idx_user_context_impacts_user
  ON user_context_impacts(user_id, created_at DESC);

-- 카드별 영향도 조회 (통계용)
CREATE INDEX IF NOT EXISTS idx_user_context_impacts_card
  ON user_context_impacts(context_card_id);

-- ============================================================================
-- 4. RLS (Row Level Security) 정책
-- ============================================================================

-- 맥락 카드는 모든 인증 유저가 읽기 가능 (글로벌 공유 데이터)
ALTER TABLE context_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "인증 유저는 맥락 카드 읽기 가능"
  ON context_cards FOR SELECT
  TO authenticated
  USING (true);

-- 유저 영향도는 본인 것만 읽기 가능
ALTER TABLE user_context_impacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인의 영향도만 읽기 가능"
  ON user_context_impacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Edge Function은 모든 데이터 쓰기 가능 (service_role 키 사용)
CREATE POLICY "Edge Function은 쓰기 가능"
  ON context_cards FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Edge Function은 영향도 쓰기 가능"
  ON user_context_impacts FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- 5. 데이터 샘플 (개발용)
-- ============================================================================

-- 개발 환경에서만 샘플 데이터 삽입 (프로덕션에서는 Edge Function이 생성)
-- DO $$
-- BEGIN
--   IF current_database() LIKE '%dev%' THEN
--     INSERT INTO context_cards (date, headline, historical_context, macro_chain, institutional_behavior, sentiment)
--     VALUES (
--       CURRENT_DATE,
--       '오늘 당신의 자산이 -1.2% 빠진 이유',
--       '2008년 금융위기 당시에도 CPI 급등 후 3개월간 조정이 있었고, 이후 6개월 만에 회복했습니다.',
--       '["미국 CPI 발표", "금리 인상 우려", "기술주 하락", "삼성전자 연동 하락"]'::jsonb,
--       '외국인 투자자들이 3일 연속 순매도 중입니다. 하지만 이는 패닉이 아니라 정기 리밸런싱 시즌입니다.',
--       'caution'
--     )
--     ON CONFLICT (date) DO NOTHING;
--   END IF;
-- END $$;

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================
