# Project Status (Live Audit Log)

> 매 마일스톤 완료 시 업데이트. 에이전트가 세션 시작 시 이 파일을 먼저 읽음.
> 가장 최근 항목이 맨 위.

---

## 2026-03-08

### M6: 종합 QA — 하드코딩 통화/색상/크래시 수정 -- IN PROGRESS
- **하드코딩 ₩ 제거**: 15개 파일 29건 → getCurrencySymbol()/formatLocalAmount() 전환 완료
  - 컴포넌트: TaxReportCard, HeroSection, AssetTrendSection, HoldingsSection, TodayActionsSection, MarketplaceGrid/Card, ItemPurchaseModal, CreditDisplay, AssetImpactWaterfall
  - 화면: tax-report, tier-strategy, rebalance-history, log-trade, paywall
- **JSON.parse 크래시 방지**: 4개 서비스 파일 (guruCommentService, quizService, roundtableService, gemini.ts) — 진행 중
- **레거시 배경색 #121212 → colors.background**: 7파일 — 진행 중
- **검증**: tsc 0 errors, 27 suites 493 tests pass, verify:full PASS

### QA 발견 사항 (보류)
- **P0 서피스 색상 #1E1E1E/#2A2A2A → colors.surface**: 32파일 53건 (별도 작업)
- **P1 lounge.tsx 에러 바운더리 i18n**: 6 문자열
- **P1 village.tsx 채팅 에러 토스트**: 없음
- **P2 #2196F3 Material Blue → colors.info**: 6건

### M3: spend_credits RPC UUID 타입 에러 수정 -- DONE
- **Commit**: 2f48858
- **변경**: useStreakFreeze, useStreakRecovery, ItemPurchaseModal
- **원인**: DB 함수 `spend_credits`의 `p_feature_ref_id`가 UUID 타입인데 문자열 전달
- **해결**: null로 변경, feature_type에 용도 명시
- **Sentry 영향**: "invalid input syntax for type uuid" 에러 해결

### M2: 통화 표기 로케일 대응 -- DONE
- **Commit**: 0280e45
- **변경**: 14개 파일, formatters.ts + 컴포넌트 + 서비스
- **핵심**: getCurrencySymbol() → ko=Won, en=$, ja=Yen
- **빌드**: #122 (v1.1.0) TestFlight 제출 완료

### M1: i18n 전체 대응 -- DONE
- **Commits**: f7b1ea8, 2172e37
- **변경**: 37개 파일 + ja.json 13개 키 추가
- **검증**: i18n-js 기반 전수 검사 → user-facing 누락 0개
- **빌드**: #121 → #122로 통합

---

## Current State

- **Branch**: main
- **Latest commit**: 2f48858
- **Latest build**: #122 (v1.1.0) on TestFlight
- **tsc errors**: 0
- **ESLint warnings**: 0
- **Test suites**: 27 passed, 493 tests
- **i18n coverage**: EN 516 keys, KO 516, JA user-facing 0 missing

## Known Issues

1. **Operations Healer 간헐적 실패** — 만료 poll 59개 쌓여서 E2 task 타임아웃
   - Fix: Supabase SQL Editor에서 만료 poll 정리 필요
   - `UPDATE prediction_polls SET status = 'expired' WHERE status = 'active' AND deadline < now();`

2. **Sentry: GoogleGenerativeAI Error (33/week)** — Gemini API 간헐적 타임아웃
   - 코드 버그 아님, retry 로직으로 자동 복구
   - 모니터링 계속

3. **Sentry: authorization failed (26/week)** — Apple Sign In 취소
   - 사용자 행동, 코드로 해결 불가

## Decisions Made

| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-08 | ja.json nested → flat 호환 유지 | i18n-js가 nested를 자동 해석, 강제 변환 불필요 |
| 2026-03-08 | p_feature_ref_id → null | DB 스키마 변경 대신 클라이언트에서 null 전달 |
| 2026-03-08 | Admin i18n 후순위 | 일본 사용자가 admin 접근 안 함 |
| 2026-03-08 | Gemini AI 프롬프트의 Won 표기 유지 | AI에게 KRW 환산 지시하는 텍스트는 locale 무관 |
| 2026-03-08 | en.json/ja.json의 ₩ 유지 | KRW 금액 맥락이라 로케일 무관하게 원화 표시 의도적 |
| 2026-03-08 | guruSpecialDays/brandWorldConfig 한국어 유지 | 이미 Ko/En 쌍 구조, 컴포넌트에서 isKo 분기 |
| 2026-03-08 | DeepDiveSimulator 한국어 유지 | 개발 전용 테스트 화면, 사용자 미노출 |
| 2026-03-08 | 서피스 색상 53건은 별도 작업 분리 | 변경 범위 크고 시각적 테스트 필요 |
