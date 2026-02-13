-- 글로벌 버전 준비: 사용자 시장 지역 설정
-- 현재는 KR 기본값, 글로벌 출시 시 US 등 추가

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS market_region TEXT DEFAULT 'KR'
  CHECK (market_region IN ('KR', 'US'));

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS display_language TEXT DEFAULT 'ko'
  CHECK (display_language IN ('ko', 'en'));

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS primary_currency TEXT DEFAULT 'KRW'
  CHECK (primary_currency IN ('KRW', 'USD'));

-- 인덱스 (시장별 사용자 분석용)
CREATE INDEX IF NOT EXISTS idx_user_profiles_market_region
  ON user_profiles(market_region);

COMMENT ON COLUMN user_profiles.market_region IS '콘텐츠 기준 시장 (KR=한국, US=미국)';
COMMENT ON COLUMN user_profiles.display_language IS 'UI 표시 언어 (ko=한국어, en=영어)';
COMMENT ON COLUMN user_profiles.primary_currency IS '기본 통화 (KRW=원화, USD=달러)';
