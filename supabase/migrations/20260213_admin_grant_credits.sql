-- ============================================
-- Admin Grant Credits RPC
-- 관리자가 특정 유저에게 보너스 크레딧을 지급하는 함수
-- 2026-02-13
-- ============================================

-- 기존 add_credits() RPC를 관리자 권한으로 감싸는 래퍼 함수
-- "사장님이 직접 고객에게 보너스를 지급하는 결재 도장"
CREATE OR REPLACE FUNCTION admin_grant_credits(
  p_target_user_id UUID,
  p_amount INTEGER,
  p_memo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
  v_success BOOLEAN;
  v_admin_email TEXT;
BEGIN
  -- 1. 관리자 권한 확인
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- 2. 금액 유효성 검사
  IF p_amount <= 0 OR p_amount > 10000 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '지급 금액은 1~10,000C 사이여야 합니다.'
    );
  END IF;

  -- 3. 대상 유저 존재 확인
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '존재하지 않는 유저입니다.'
    );
  END IF;

  -- 4. 관리자 이메일 기록 (감사 추적용)
  SELECT email INTO v_admin_email
    FROM profiles WHERE id = auth.uid();

  -- 5. add_credits() 호출하여 크레딧 지급
  SELECT ac.success, ac.new_balance
  INTO v_success, v_new_balance
  FROM add_credits(
    p_target_user_id,
    p_amount,
    'bonus',
    jsonb_build_object(
      'source', 'admin_grant',
      'admin_id', auth.uid(),
      'admin_email', COALESCE(v_admin_email, 'unknown'),
      'memo', COALESCE(p_memo, '관리자 보너스 지급')
    )
  ) AS ac;

  IF NOT v_success THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '크레딧 지급에 실패했습니다.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'granted_amount', p_amount,
    'target_user_id', p_target_user_id
  );
END;
$$;
