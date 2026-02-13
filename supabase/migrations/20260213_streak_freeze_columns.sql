-- 스트릭 프리즈 Supabase 백업 컬럼 추가
-- profiles 테이블에 프리즈 데이터 저장 (앱 삭제 후 재설치 시 복원용)
-- 이승건 대표 결재: "돈 주고 산 건데 왜 없어졌지?" CS 방지

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS streak_freeze_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_freeze_last_used DATE DEFAULT NULL;

-- 레퍼럴 보상 대기 테이블 (조건부 지급: 피추천인 3일 연속 접속 후)
CREATE TABLE IF NOT EXISTS referral_pending_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_user_id UUID NOT NULL REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  streak_required INTEGER DEFAULT 3,
  is_fulfilled BOOLEAN DEFAULT FALSE,
  fulfilled_at TIMESTAMPTZ DEFAULT NULL,
  reward_amount INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_referral_pending_referred
  ON referral_pending_rewards(referred_user_id)
  WHERE is_fulfilled = FALSE;
