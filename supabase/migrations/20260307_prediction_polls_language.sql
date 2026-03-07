-- ============================================================================
-- prediction_polls 테이블에 language 컬럼 추가
-- 각 언어 = 독립 게임 서버 (한국어/영어/일본어 폴이 별도로 존재)
-- ============================================================================

-- 1. language 컬럼 추가 (기존 데이터는 모두 'ko')
ALTER TABLE prediction_polls ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ko';
UPDATE prediction_polls SET language = 'ko' WHERE language IS NULL;

-- 2. 인덱스: 언어별 활성 폴 조회 최적화
CREATE INDEX IF NOT EXISTS idx_prediction_polls_language
  ON prediction_polls(language);

CREATE INDEX IF NOT EXISTS idx_prediction_polls_lang_status
  ON prediction_polls(language, status, deadline DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_polls_lang_created
  ON prediction_polls(language, created_at DESC);

-- 3. prediction_votes에도 language 추가 (리더보드 언어별 분리용)
ALTER TABLE prediction_votes ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ko';
UPDATE prediction_votes SET language = 'ko' WHERE language IS NULL;

CREATE INDEX IF NOT EXISTS idx_prediction_votes_language
  ON prediction_votes(language);

-- 4. prediction_user_stats에 language별 뷰 (향후 리더보드 분리용)
-- 현재는 글로벌 stats 유지, 언어별 필터는 votes 기반으로 처리
