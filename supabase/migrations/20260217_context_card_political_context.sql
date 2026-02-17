-- 맥락 카드 정치 맥락 컬럼 추가 (2026-02-17)
-- 5겹 레이어: 역사적맥락 → 거시경제 → 정치맥락(신규) → 기관행동 → 포트폴리오

ALTER TABLE context_cards
ADD COLUMN IF NOT EXISTS political_context TEXT;

COMMENT ON COLUMN context_cards.political_context IS
'정치 맥락 레이어 (레이어 3, 무료) — 현재 미국 정치 이벤트를 역사적 유사 사례와 함께 설명, 결론은 안심 톤';
