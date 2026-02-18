-- 코스톨라니 달걀 모형 국면 저장 테이블
-- 주 1회 Edge Function(kostolany-detector)이 업데이트
-- A=바닥, B=상승, C=과열, D=하락초, E=패닉, F=극비관

CREATE TABLE IF NOT EXISTS kostolany_phases (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phase        char(1) NOT NULL CHECK (phase IN ('A','B','C','D','E','F')),
  confidence   int NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  reasoning    jsonb NOT NULL DEFAULT '[]',   -- string[] 배열 (AI 근거 3~5개)
  dalio_view   text,                          -- 달리오 관점 한 문장
  buffett_view text,                          -- 버핏 관점 한 문장
  suggested_target jsonb,                     -- 추천 배분 (AssetCategory → %)
  is_current   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- is_current=true인 행이 항상 최대 1개만 있도록 보장
CREATE UNIQUE INDEX IF NOT EXISTS kostolany_phases_current_unique
  ON kostolany_phases(is_current) WHERE is_current = true;

-- 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_kostolany_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kostolany_phases_updated_at ON kostolany_phases;
CREATE TRIGGER kostolany_phases_updated_at
  BEFORE UPDATE ON kostolany_phases
  FOR EACH ROW EXECUTE FUNCTION update_kostolany_updated_at();

-- RLS 설정
ALTER TABLE kostolany_phases ENABLE ROW LEVEL SECURITY;

-- 로그인 유저 읽기 허용 (국면은 공개 정보)
DROP POLICY IF EXISTS "kostolany_phases_read" ON kostolany_phases;
CREATE POLICY "kostolany_phases_read"
  ON kostolany_phases FOR SELECT
  TO authenticated
  USING (true);

-- 서비스 롤 전체 권한 (Edge Function에서 쓰기)
DROP POLICY IF EXISTS "kostolany_phases_service_write" ON kostolany_phases;
CREATE POLICY "kostolany_phases_service_write"
  ON kostolany_phases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 초기 데이터: B 국면 (2026년 초 상승 추세 반영)
INSERT INTO kostolany_phases (
  phase, confidence, reasoning, dalio_view, buffett_view, suggested_target, is_current
)
VALUES (
  'B',
  72,
  '["미국 증시 연초 강세 지속 중", "연준 금리인하 기대감 유지", "AI 섹터 기업이익 호조", "기관 자금 유입 확인", "거시경제 연착륙 시나리오 우세"]'::jsonb,
  '달리오: "주식 비중 확대 시점이지만 분산을 잊지 마라. 채권도 일부 보유해 리스크 균형을 맞춰라"',
  '버핏: "시장이 오르고 있지만 좋은 기업을 합리적 가격에 사는 원칙은 변하지 않는다"',
  '{"large_cap":65,"bond":5,"bitcoin":15,"gold":5,"commodity":3,"altcoin":5,"cash":2,"realestate":0}'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
