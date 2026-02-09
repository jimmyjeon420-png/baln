-- ============================================================================
-- 맥락 카드 샘플 데이터 (개발용)
-- ============================================================================

-- 오늘의 맥락 카드 삽입
INSERT INTO context_cards (
  date,
  headline,
  historical_context,
  macro_chain,
  institutional_behavior,
  sentiment,
  is_premium_only
) VALUES (
  CURRENT_DATE,
  '비트코인 68,000달러 돌파, 연준 통화정책 완화 기대감',
  '2020년 12월 비트코인이 처음 20,000달러를 돌파했을 때와 유사한 패턴입니다. 당시 3개월간 180% 상승 후 조정을 거쳤으나, 6개월 만에 신고가를 경신했습니다.',
  '["연준 금리 동결 시사", "달러 약세 지속", "기관 투자자 비트코인 ETF 매수", "비트코인 $68,000 돌파"]'::jsonb,
  '블랙록과 피델리티의 비트코인 현물 ETF로 최근 3일간 12억 달러 순유입이 확인되었습니다. 기관 자금이 본격적으로 유입되고 있습니다.',
  'calm',
  true
) ON CONFLICT (date) DO UPDATE SET
  headline = EXCLUDED.headline,
  historical_context = EXCLUDED.historical_context,
  macro_chain = EXCLUDED.macro_chain,
  institutional_behavior = EXCLUDED.institutional_behavior,
  sentiment = EXCLUDED.sentiment,
  is_premium_only = EXCLUDED.is_premium_only;

-- 어제의 맥락 카드 (복기용)
INSERT INTO context_cards (
  date,
  headline,
  historical_context,
  macro_chain,
  institutional_behavior,
  sentiment,
  is_premium_only
) VALUES (
  CURRENT_DATE - INTERVAL '1 day',
  '미국 CPI 예상 상회, 금리 인상 우려 확산',
  '2022년 6월에도 비슷한 인플레이션 우려가 있었고, 당시 S&P500은 -5.8% 하락 후 3개월 내 +8.2% 반등했습니다.',
  '["미국 CPI 3.2% 발표 (예상 3.0%)", "금리 인상 우려 확산", "나스닥 기술주 -2.1% 하락", "삼성전자 외국인 매도세"]'::jsonb,
  '외국인 투자자 3일 연속 순매도 중 (총 -1,200억원). 패닉 매도가 아닌 분기말 리밸런싱 시즌으로 분석됩니다.',
  'caution',
  true
) ON CONFLICT (date) DO UPDATE SET
  headline = EXCLUDED.headline,
  historical_context = EXCLUDED.historical_context,
  macro_chain = EXCLUDED.macro_chain,
  institutional_behavior = EXCLUDED.institutional_behavior,
  sentiment = EXCLUDED.sentiment,
  is_premium_only = EXCLUDED.is_premium_only;

-- 그저께 맥락 카드 (트렌드 분석용)
INSERT INTO context_cards (
  date,
  headline,
  historical_context,
  macro_chain,
  institutional_behavior,
  sentiment,
  is_premium_only
) VALUES (
  CURRENT_DATE - INTERVAL '2 days',
  '테슬라 실적 호조, 나스닥 1.2% 상승',
  '2023년 1분기 테슬라 실적 발표 후에도 나스닥이 1.5% 상승했으며, 이후 2주간 기술주 랠리가 이어졌습니다.',
  '["테슬라 Q4 실적 예상치 초과", "EV 시장 전망 개선", "나스닥 +1.2% 상승", "코스피 반도체주 동반 상승"]'::jsonb,
  '국내 기관 투자자들이 삼성전자와 SK하이닉스를 3일 연속 순매수 중입니다. 반도체 업황 회복 시그널로 해석됩니다.',
  'calm',
  true
) ON CONFLICT (date) DO NOTHING;

-- ============================================================================
-- 마이그레이션 완료
-- ============================================================================
