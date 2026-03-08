# Current Sprint Plans

> 마일스톤 순서대로 실행. 각 마일스톤의 Acceptance Criteria가 모두 통과해야 다음으로.
> 완료된 마일스톤은 [x]로 표시하고 docs/status.md에 기록.

## Sprint: 2026-03-08 — App Store 재심사 준비

### [x] M1: i18n 전체 대응 (EN/KO/JA)
**Goal**: 모든 사용자 화면에서 하드코딩 텍스트 0개
**Acceptance Criteria**:
- [ ] `npx tsc --noEmit` = 0 errors
- [ ] `npx eslint --max-warnings=0` on all changed files
- [ ] `node scripts/check-locale-real.js` → user-facing missing = 0
- [ ] grep hardcoded Korean in JSX = 0 (admin 제외)
**Status**: DONE (commit f7b1ea8, 2172e37)

### [x] M2: 통화 표기 로케일 대응 (KO=Won, EN=$, JA=Yen)
**Goal**: 모든 금액 표시가 로케일에 맞는 통화 기호 사용
**Acceptance Criteria**:
- [ ] `grep -rn "₩" src/components/ src/screens/` → UI 표시용 0 (regex/comment 제외)
- [ ] formatters.ts에 formatJPY + isJapaneseLocale 존재
- [ ] tsc + eslint 통과
**Status**: DONE (commit 0280e45)

### [x] M3: Sentry 에러 수정 (spend_credits UUID)
**Goal**: spend_credits RPC에 UUID가 아닌 문자열 전달 버그 수정
**Acceptance Criteria**:
- [ ] p_feature_ref_id에 non-UUID 문자열 전달하는 곳 = 0
- [ ] tsc 통과
**Status**: DONE (commit 2f48858)

### [ ] M4: Operations Healer 안정화
**Goal**: GitHub Actions healer 실패율 0%
**Acceptance Criteria**:
- [ ] Supabase에서 만료 poll 정리 (SQL 실행)
- [ ] healer 워크플로우 최근 5회 중 실패 0회
**Blockers**: Supabase SQL Editor 접근 필요 (사용자 실행)

### [x] M5: 자동 검증 스크립트 강화
**Goal**: TestFlight 제출 전 자동으로 잡을 수 있는 문제를 최대화
**Acceptance Criteria**:
- [x] `npm run verify:full` 명령 하나로 Level 1~5 전체 실행
- [x] i18n 커버리지 체크 자동 포함
- [x] 하드코딩 통화/한국어 grep 자동 포함
- [x] 실패 시 구체적 에러 메시지 출력
**Status**: DONE (verify-full.js 이미 구현 완료, check-locale-real.js 연동)

### [ ] M6: 종합 QA — 하드코딩 통화/색상/크래시 수정
**Goal**: 3개 로케일(KO/EN/JA)에서 UI 통화/색상 일관성 + 크래시 방지
**Acceptance Criteria**:
- [x] 하드코딩 ₩ 제거 (15파일 29건 → getCurrencySymbol/formatLocalAmount)
- [ ] JSON.parse 크래시 방지 (4 서비스 파일)
- [ ] 레거시 배경색 #121212 → colors.background (7파일)
- [ ] tsc + eslint + tests 전체 통과
- [ ] verify:full PASS

### [ ] M7: (다음 스프린트에서 결정)
**Candidates**:
- 서피스 색상 #1E1E1E/#2A2A2A 통일 (32파일 53건)
- lounge.tsx 에러 바운더리 i18n
- RevenueCat 구독 연동
- 위기 감지 알림 (시장 -3% 시 푸시)
- 마을 캐릭터 인터랙션 고도화
