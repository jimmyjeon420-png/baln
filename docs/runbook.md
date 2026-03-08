# Agent Runbook (How to Operate)

> 이 파일은 에이전트의 실행 규칙입니다.
> 모든 작업은 이 규칙을 따릅니다. 예외 없음.

## Source of Truth

- `docs/spec.md` = 무엇을 만드는가 (변경 금지)
- `docs/plans.md` = 현재 마일스톤 (순서대로 실행)
- `docs/status.md` = 현재 상태 + 결정 기록 (매 마일스톤 완료 시 업데이트)

## Execution Loop

```
1. Read docs/plans.md → 현재 마일스톤 확인
2. Read docs/status.md → 이전 상태 확인
3. Implement (코드 작성)
4. Verify (아래 검증 단계 전부 통과)
5. Update docs/status.md (무엇을 했고, 무엇이 변했는지)
6. Commit (마일스톤 단위로)
7. Next milestone or report blocker
```

## Verification Gate (매 마일스톤 후 반드시 실행)

```bash
# Level 1: 컴파일 (필수)
npx tsc --noEmit

# Level 2: 린트 (필수)
npx eslint --max-warnings=0 [changed files]

# Level 3: 테스트 (필수)
npm test

# Level 4: i18n 커버리지 (locale 파일 수정 시)
node scripts/check-locale-real.js

# Level 5: 화면 검증 (UI 변경 시)
# → Screen Checklist 실행 (아래 참조)
```

**Level 1~3이 하나라도 실패하면 다음 마일스톤으로 넘어가지 않는다.**
실패 시: 원인 파악 → 수정 → 재검증 → 최대 3회 반복 → 3회 실패 시 사용자에게 보고.

## Screen Checklist (TestFlight 전 자동 검증)

UI 변경이 포함된 마일스톤은 아래 체크리스트를 코드 레벨에서 검증:

### 공통 체크
- [ ] 하드코딩 한국어 없음: `grep -r "Text[^>]*>[가-힣]" src/components/` 결과 0
- [ ] 하드코딩 통화 없음: `grep -rn "₩" src/components/ src/screens/` 에서 UI 표시용 0
- [ ] 모든 `t()` 키가 en.json + ko.json + ja.json에 존재
- [ ] `getCurrencySymbol()` 사용: ko=Won, en=$, ja=Yen

### 탭별 체크
- [ ] 해당 탭 파일이 import하는 모든 컴포넌트가 존재
- [ ] 해당 탭의 훅이 에러 없이 타입 체크 통과
- [ ] 해당 탭에서 사용하는 locale 키가 3개 언어 모두 존재

## Scope Rules

- **docs/plans.md에 없는 작업은 하지 않는다**
- diff는 마일스톤 범위로 제한. 주변 코드 리팩토링 금지.
- 새 패키지 설치 시 사용자 확인 필요
- 공유 타입(asset.ts, character.ts) 수정 시 사용자 확인 필요

## Commit Rules

- 마일스톤 1개 = 커밋 1개
- 커밋 메시지: `[M{n}] {마일스톤 제목} — {변경 요약}`
- `git add` 는 변경 파일만 (절대 `git add .` 금지)
- 커밋 전 Level 1~3 검증 통과 확인

## Blocker Protocol

해결 불가능한 문제 발생 시:
1. docs/status.md에 blocker 기록
2. 시도한 것과 실패 원인 기록
3. 사용자에게 즉시 보고
4. 우회 방법 제안 (있으면)
