-- ============================================================================
-- 예측 질문에 오를/내릴 근거 추가 (Wave 1 — Task 1-B)
-- 라운드테이블 #3: "퀴즈 → 교육 콘텐츠로 업그레이드"
--
-- 이승건: "금리가 오를까요?라고만 물으면 베팅 게임이다.
--          오를 근거와 내릴 근거를 뉴스로 알려줘야 교육이다."
-- ============================================================================

-- prediction_polls 테이블에 근거 필드 추가
ALTER TABLE prediction_polls
  ADD COLUMN IF NOT EXISTS up_reason TEXT,     -- YES(오를) 근거 (뉴스 기반)
  ADD COLUMN IF NOT EXISTS down_reason TEXT;   -- NO(내릴) 근거 (뉴스 기반)

-- 컬럼 코멘트 추가
COMMENT ON COLUMN prediction_polls.up_reason IS '오를 근거 (뉴스 기반, 한 줄)';
COMMENT ON COLUMN prediction_polls.down_reason IS '내릴 근거 (뉴스 기반, 한 줄)';

-- 예시:
-- up_reason: "CPI 3개월 연속 상승 (블룸버그)"
-- down_reason: "실업률 4.2% → 경기 둔화 우려 (WSJ)"
