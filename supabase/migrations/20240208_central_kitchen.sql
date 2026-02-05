-- ============================================================================
-- Central Kitchen: 사전 계산된 시장 인사이트 테이블
-- 매일 07:00 AM Edge Function이 Gemini + Google Search로 분석 결과 저장
-- 프론트엔드는 이 테이블에서 즉시 읽어 사용 (latency < 100ms)
-- ============================================================================

-- 1. 일별 거시경제 & 비트코인 분석
-- 하루에 한 행, 모든 유저가 공유하는 글로벌 데이터
CREATE TABLE IF NOT EXISTS daily_market_insights (
  date        DATE PRIMARY KEY DEFAULT CURRENT_DATE,

  -- 거시경제 요약 (MorningBriefingResult.macroSummary 호환)
  -- { title, highlights[], interestRateProbability, marketSentiment }
  macro_summary     JSONB NOT NULL DEFAULT '{}',

  -- 비트코인/암호화폐 분석 (Goldman Sachs 모델 기반)
  -- { score, whaleAlerts[], etfInflows, politicsImpact, priceTarget }
  bitcoin_analysis  JSONB NOT NULL DEFAULT '{}',

  -- 시장 심리 (빠른 필터용)
  market_sentiment  TEXT CHECK (market_sentiment IN ('BULLISH', 'BEARISH', 'NEUTRAL'))
                    DEFAULT 'NEUTRAL',

  -- CFO 날씨 (공유 카드용)
  -- { emoji, status, message }
  cfo_weather       JSONB DEFAULT '{}',

  -- VIX & 글로벌 유동성
  vix_level         DECIMAL(6,2),
  global_liquidity  TEXT, -- M2 증감 설명

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 종목별 퀀트 리포트
-- 종목 × 날짜 복합 PK, Edge Function이 배치로 생성
CREATE TABLE IF NOT EXISTS stock_quant_reports (
  ticker          TEXT NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 밸류에이션 점수 (0-100, 높을수록 저평가)
  valuation_score INT CHECK (valuation_score BETWEEN 0 AND 100),

  -- 신호: 매수/매도 방향성
  signal          TEXT CHECK (signal IN (
    'STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'
  )),

  -- AI 분석 텍스트 (한글)
  analysis        TEXT,

  -- 퀀트 메트릭 (세부 지표)
  -- { pegRatio, rsi, earningsRevision, priceToFairValue, shortInterest }
  metrics         JSONB DEFAULT '{}',

  -- 섹터/카테고리
  sector          TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (ticker, date)
);

-- ============================================================================
-- 인덱스: 프론트엔드 쿼리 최적화
-- ============================================================================

-- 날짜별 빠른 조회 (stock_quant_reports)
CREATE INDEX IF NOT EXISTS idx_sqr_date ON stock_quant_reports(date);

-- 티커별 히스토리 조회
CREATE INDEX IF NOT EXISTS idx_sqr_ticker ON stock_quant_reports(ticker);

-- 시그널별 필터링 (강력 매수 종목 찾기)
CREATE INDEX IF NOT EXISTS idx_sqr_signal ON stock_quant_reports(signal, date);

-- ============================================================================
-- RLS: 인증된 사용자만 읽기 허용, 쓰기는 Service Role만
-- ============================================================================

ALTER TABLE daily_market_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_quant_reports ENABLE ROW LEVEL SECURITY;

-- 읽기 정책: 인증된 사용자 누구나 읽을 수 있음
CREATE POLICY "daily_market_insights_read"
  ON daily_market_insights
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stock_quant_reports_read"
  ON stock_quant_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기 정책: Service Role만 (Edge Function에서 SERVICE_ROLE_KEY 사용)
-- RLS는 Service Role에 대해 자동 우회되므로 별도 정책 불필요

-- ============================================================================
-- updated_at 자동 갱신 트리거
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_market_insights_updated_at
  BEFORE UPDATE ON daily_market_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
