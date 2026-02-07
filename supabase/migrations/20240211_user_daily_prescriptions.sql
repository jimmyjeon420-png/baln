-- ============================================================================
-- 유저별 일일 처방전 캐시 테이블
-- "하루 한 번 처방전" — 같은 날 같은 포트폴리오면 같은 결과
-- ============================================================================

CREATE TABLE user_daily_prescriptions (
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,

  -- AI 분석 결과 (JSONB)
  morning_briefing  JSONB,      -- MorningBriefingResult (portfolioActions, cfoWeather 등)
  risk_analysis     JSONB,      -- RiskAnalysisResult (panicShield, FOMO, advice 등)

  -- 포트폴리오 변경 감지용 해시
  portfolio_hash    TEXT NOT NULL,  -- 티커:수량 정렬 문자열 (예: "AAPL:10,TSLA:5")

  -- 메타데이터
  source            TEXT DEFAULT 'live-gemini',  -- 생성 소스
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, date)
);

-- 인덱스: 유저별 오늘 처방전 빠른 조회
CREATE INDEX idx_udp_user_date ON user_daily_prescriptions (user_id, date DESC);

-- RLS: 본인 데이터만 읽기/쓰기
ALTER TABLE user_daily_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own prescriptions"
  ON user_daily_prescriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own prescriptions"
  ON user_daily_prescriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own prescriptions"
  ON user_daily_prescriptions FOR UPDATE
  USING (auth.uid() = user_id);
