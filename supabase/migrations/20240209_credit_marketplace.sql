-- ============================================================================
-- AI 프리미엄 마켓플레이스: 크레딧 시스템 테이블 & RPC 함수
-- 3번째 수익원: 크레딧(코인) 기반 건별 과금
-- ============================================================================

-- 1. 사용자 크레딧 잔액 테이블
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  last_bonus_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: 본인만 읽기
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_credits_select_own"
  ON user_credits FOR SELECT
  USING (auth.uid() = user_id);

-- 2. 크레딧 거래 원장 (충전/차감/환불 내역)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'spend', 'refund', 'bonus', 'subscription_bonus')),
  amount INTEGER NOT NULL,           -- 양수: 충전/환불, 음수: 차감
  balance_after INTEGER NOT NULL,    -- 거래 후 잔액
  feature_type TEXT CHECK (feature_type IN ('deep_dive', 'what_if', 'tax_report', 'ai_cfo_chat') OR feature_type IS NULL),
  feature_ref_id UUID,               -- AI 분석 결과 ID 참조
  metadata JSONB,                    -- 패키지 정보, IAP 영수증 등
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: 본인만 읽기
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_transactions_select_own"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- 인덱스: 사용자별 최신 거래 조회 최적화
CREATE INDEX idx_credit_transactions_user_date
  ON credit_transactions (user_id, created_at DESC);

-- 3. AI 분석 결과 캐시 (24시간)
CREATE TABLE IF NOT EXISTS ai_feature_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('deep_dive', 'what_if', 'tax_report')),
  input_hash TEXT NOT NULL,          -- 입력 해시 (캐시 키)
  result JSONB NOT NULL,             -- AI 분석 결과
  credits_charged INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: 본인만 읽기
ALTER TABLE ai_feature_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_feature_results_select_own"
  ON ai_feature_results FOR SELECT
  USING (auth.uid() = user_id);

-- 인덱스: 캐시 조회 최적화 (사용자 + 기능 + 입력 해시)
CREATE INDEX idx_ai_feature_results_cache
  ON ai_feature_results (user_id, feature_type, input_hash, expires_at DESC);

-- 4. AI CFO 채팅 히스토리
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,          -- 세션 그룹핑
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: 본인만 읽기
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_messages_select_own"
  ON ai_chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- 인덱스: 세션별 메시지 조회
CREATE INDEX idx_ai_chat_messages_session
  ON ai_chat_messages (user_id, session_id, created_at ASC);

-- ============================================================================
-- RPC 함수: 원자적 크레딧 차감 (FOR UPDATE 락)
-- 기존 join_gathering_atomic 패턴 재사용
-- ============================================================================
CREATE OR REPLACE FUNCTION spend_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature_type TEXT,
  p_feature_ref_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 잔액 행 잠금 (FOR UPDATE)
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 사용자 크레딧 레코드가 없으면 생성
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, balance) VALUES (p_user_id, 0);
    v_current_balance := 0;
  END IF;

  -- 잔액 부족 체크
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, v_current_balance, '크레딧이 부족합니다'::TEXT;
    RETURN;
  END IF;

  -- 차감
  v_new_balance := v_current_balance - p_amount;
  UPDATE user_credits
  SET balance = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 거래 내역 기록
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, feature_type, feature_ref_id)
  VALUES (p_user_id, 'spend', -p_amount, v_new_balance, p_feature_type, p_feature_ref_id);

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- ============================================================================
-- RPC 함수: 크레딧 충전/보너스/환불
-- ============================================================================
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- upsert: 레코드 없으면 생성
  INSERT INTO user_credits (user_id, balance, lifetime_purchased)
  VALUES (p_user_id, p_amount, CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_credits.balance + p_amount,
    lifetime_purchased = user_credits.lifetime_purchased + CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END,
    last_bonus_at = CASE WHEN p_type = 'subscription_bonus' THEN NOW() ELSE user_credits.last_bonus_at END,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- 거래 내역 기록
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, metadata)
  VALUES (p_user_id, p_type, p_amount, v_new_balance, p_metadata);

  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$;
