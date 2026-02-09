-- ================================================================
-- analytics_events: 사용자 행동 분석 이벤트 테이블
-- ================================================================
-- 목적: 외부 SDK(Firebase, Amplitude) 없이 자체 이벤트 수집
-- 데이터: 화면 조회, 카드 읽기, 투표, 공유, 위기 배너 등
-- 연관 서비스: src/services/analyticsService.ts (배치 INSERT)
-- ================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,           -- 이벤트 이름 (screen_view, prediction_vote 등)
  properties JSONB DEFAULT '{}',      -- 이벤트 부가 정보 (화면 이름, 선택값 등)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 사용자 (탈퇴 시 NULL 유지)
  created_at TIMESTAMPTZ DEFAULT NOW()  -- 이벤트 발생 시각
);

-- 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 정책 1: 모든 인증된 유저가 이벤트를 기록(INSERT)할 수 있음
CREATE POLICY "Users can insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 정책 2: 자기 이벤트만 조회(SELECT) 가능 (프라이버시 보호)
CREATE POLICY "Users can read own analytics"
  ON analytics_events FOR SELECT
  USING (user_id = auth.uid());
