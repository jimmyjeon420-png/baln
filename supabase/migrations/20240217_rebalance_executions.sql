-- ============================================================================
-- 리밸런싱 실행 기록 시스템
-- ============================================================================
-- 목적: AI가 제안한 액션(BUY/SELL/WATCH)을 사용자가 실제로 실행했을 때 기록
-- 활용: 히스토리 추적 → AI 제안 성과 분석 → 신뢰도 측정 → 학습 피드백 루프

-- ── 1. 실행 기록 테이블 ──

CREATE TABLE IF NOT EXISTS rebalance_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 제안 정보 (AI가 제안한 내용)
  prescription_date DATE NOT NULL,           -- 어느 날짜 처방전인지
  action_ticker TEXT NOT NULL,               -- 종목 티커
  action_name TEXT,                          -- 종목명
  action_type TEXT NOT NULL CHECK (action_type IN ('BUY', 'SELL', 'HOLD', 'WATCH')),
  suggested_price NUMERIC,                   -- AI 제안 시점 가격
  suggested_qty INTEGER,                     -- AI 제안 수량

  -- 실제 실행 정보 (사용자가 입력)
  executed_at TIMESTAMPTZ NOT NULL,          -- 실제 실행 시각
  executed_price NUMERIC NOT NULL,           -- 실제 체결 가격
  executed_qty INTEGER NOT NULL,             -- 실제 체결 수량
  execution_note TEXT,                       -- 메모 (증권사, 주문 방식 등)

  -- 결과 추적 (나중에 계산)
  result_gain_loss NUMERIC,                  -- 손익 (나중에 업데이트)
  result_gain_pct NUMERIC,                   -- 손익률 (%)

  -- 메타
  created_at TIMESTAMPTZ DEFAULT now(),

  -- 인덱스용
  CONSTRAINT unique_execution UNIQUE (user_id, prescription_date, action_ticker)
);

-- 인덱스: 유저별 히스토리 조회 최적화
CREATE INDEX IF NOT EXISTS idx_rebalance_executions_user_date
  ON rebalance_executions(user_id, prescription_date DESC);

-- 인덱스: 티커별 조회
CREATE INDEX IF NOT EXISTS idx_rebalance_executions_ticker
  ON rebalance_executions(action_ticker);

-- ── 2. RLS 정책 ──

ALTER TABLE rebalance_executions ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 읽기
CREATE POLICY "Users can view own executions"
  ON rebalance_executions FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 데이터만 쓰기
CREATE POLICY "Users can insert own executions"
  ON rebalance_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 데이터만 수정
CREATE POLICY "Users can update own executions"
  ON rebalance_executions FOR UPDATE
  USING (auth.uid() = user_id);

-- 본인 데이터만 삭제
CREATE POLICY "Users can delete own executions"
  ON rebalance_executions FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. RPC 함수: 실행 기록 저장 (중복 방지) ──

CREATE OR REPLACE FUNCTION save_rebalance_execution(
  p_prescription_date DATE,
  p_action_ticker TEXT,
  p_action_name TEXT,
  p_action_type TEXT,
  p_suggested_price NUMERIC,
  p_suggested_qty INTEGER,
  p_executed_at TIMESTAMPTZ,
  p_executed_price NUMERIC,
  p_executed_qty INTEGER,
  p_execution_note TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_execution_id UUID;
BEGIN
  -- 현재 유저
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- UPSERT: 같은 날짜 + 같은 티커 → 업데이트, 없으면 신규 생성
  INSERT INTO rebalance_executions (
    user_id,
    prescription_date,
    action_ticker,
    action_name,
    action_type,
    suggested_price,
    suggested_qty,
    executed_at,
    executed_price,
    executed_qty,
    execution_note
  ) VALUES (
    v_user_id,
    p_prescription_date,
    p_action_ticker,
    p_action_name,
    p_action_type,
    p_suggested_price,
    p_suggested_qty,
    p_executed_at,
    p_executed_price,
    p_executed_qty,
    p_execution_note
  )
  ON CONFLICT (user_id, prescription_date, action_ticker)
  DO UPDATE SET
    action_type = EXCLUDED.action_type,
    executed_at = EXCLUDED.executed_at,
    executed_price = EXCLUDED.executed_price,
    executed_qty = EXCLUDED.executed_qty,
    execution_note = EXCLUDED.execution_note
  RETURNING id INTO v_execution_id;

  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. RPC 함수: 실행 결과 계산 (배치용) ──

CREATE OR REPLACE FUNCTION calculate_execution_results()
RETURNS void AS $$
BEGIN
  -- BUY 실행 → 현재 가격과 비교하여 손익 계산
  -- SELL 실행 → 매도 이후 가격 추적 (복잡, 추후 구현)
  -- 여기서는 스켈레톤만 제공
  -- 실제 구현은 Edge Function에서 매일 실행
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. 코멘트 ──

COMMENT ON TABLE rebalance_executions IS 'AI 제안 액션 실행 기록 (수동 입력)';
COMMENT ON COLUMN rebalance_executions.prescription_date IS '어느 날짜 처방전의 제안인지';
COMMENT ON COLUMN rebalance_executions.executed_at IS '사용자가 실제 매매한 시각';
COMMENT ON COLUMN rebalance_executions.execution_note IS '증권사, 주문 방식 등 메모';
COMMENT ON COLUMN rebalance_executions.result_gain_loss IS '매수 후 현재까지 손익 (정기 배치로 업데이트)';
