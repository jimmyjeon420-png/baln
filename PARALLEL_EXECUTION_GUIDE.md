# 병렬 작업 실행 가이드 (5 Claude Instances)

## 🎯 목표
CLAUDE.md에 정의된 모든 기능을 **5개의 Claude Code 인스턴스가 병렬로 작업**하여 빠르게 구현합니다.

---

## 📊 작업 분담표

| Agent | 담당 영역 | 예상 시간 | 충돌 위험도 | 시작 가능 시점 |
|-------|----------|----------|-----------|-------------|
| **Agent 1** | 맥락 카드 시스템 | 1~2시간 | ⭕️ 낮음 | 즉시 시작 가능 |
| **Agent 2** | 예측 투표 & 복기 | 1~2시간 | ⭕️ 낮음 | 즉시 시작 가능 |
| **Agent 3** | 크레딧 & 마켓플레이스 | 1~1.5시간 | ⭕️ 낮음 | 즉시 시작 가능 |
| **Agent 4** | AI 분석 도구 4종 | 2~3시간 | ⭕️ 낮음 | 즉시 시작 가능 |
| **Agent 5** | 3탭 구조 전환 | 1시간 | ⚠️ **높음** | **Agent 1~4 완료 후** |

---

## 🚀 실행 절차

### Phase 1: 병렬 작업 (Agent 1~4 동시 실행)

#### 1-1. Claude Code 인스턴스 4개 띄우기

**MacBook (M5)에서:**
```bash
# 터미널 4개 띄우기 (CMD+T로 탭 추가)

# 탭 1: Agent 1
cd ~/smart-rebalancer
code .

# 탭 2: Agent 2
cd ~/smart-rebalancer
code .

# 탭 3: Agent 3
cd ~/smart-rebalancer
code .

# 탭 4: Agent 4
cd ~/smart-rebalancer
code .
```

**Windows에서:**
```powershell
# PowerShell 4개 띄우기

# 창 1: Agent 1
cd C:\Users\...\smart-rebalancer
claude-code

# 창 2: Agent 2
cd C:\Users\...\smart-rebalancer
claude-code

# 창 3: Agent 3
cd C:\Users\...\smart-rebalancer
claude-code

# 창 4: Agent 4
cd C:\Users\...\smart-rebalancer
claude-code
```

#### 1-2. 각 Agent에게 프롬프트 전달

**Agent 1에게:**
```
다음 파일을 읽고 지시에 따라 작업해줘:
AGENT_1_CONTEXT_CARD.md

요약: 맥락 카드 시스템을 만들어야 해. 4겹 레이어 UI를 구현하고, 기존 useContextCard 훅을 활용해.
다른 Agent와 충돌하지 않도록 새 파일만 만들어.
```

**Agent 2에게:**
```
다음 파일을 읽고 지시에 따라 작업해줘:
AGENT_2_PREDICTION_GAME.md

요약: 예측 투표 시스템을 만들어야 해. 투표 UI, 복기 섹션, 리더보드를 구현하고, usePredictions 훅을 활용해.
src/components/predictions/ 폴더에 컴포넌트를 만들어.
```

**Agent 3에게:**
```
다음 파일을 읽고 지시에 따라 작업해줘:
AGENT_3_CREDIT_MARKETPLACE.md

요약: 크레딧 시스템과 마켓플레이스를 만들어야 해. 1C = ₩100을 명확히 표시하고, 3 Tier 상품 구조를 구현해.
src/components/marketplace/ 폴더에 컴포넌트를 만들어.
```

**Agent 4에게:**
```
다음 파일을 읽고 지시에 따라 작업해줘:
AGENT_4_AI_TOOLS.md

요약: AI 분석 도구 4개를 만들어야 해. 종목 딥다이브, What-If 시뮬, 세금 리포트, AI CFO 채팅.
app/analysis/ 폴더에 화면을 만들고, Gemini API를 활용해.
```

#### 1-3. 병렬 작업 모니터링

**체크리스트 (각 Agent별로 확인):**
- [ ] Agent 1: `src/components/home/ContextCard.tsx` 생성됨
- [ ] Agent 2: `src/components/predictions/PredictionPollCard.tsx` 생성됨
- [ ] Agent 3: `src/components/marketplace/MarketplaceGrid.tsx` 생성됨
- [ ] Agent 4: `app/analysis/deep-dive.tsx` 생성됨

**중간 점검 (1시간 후):**
- 각 Agent에게 "진행 상황 요약해줘" 요청
- TypeScript 에러 확인: `npx tsc --noEmit`

---

### Phase 2: 통합 작업 (Agent 5)

#### 2-1. Agent 1~4 완료 확인

**모든 Agent에게 물어보기:**
```
작업 완료했어? TypeScript 에러 없어?
```

**전체 빌드 확인:**
```bash
npx tsc --noEmit
```

#### 2-2. Agent 5 시작

**새 Claude Code 인스턴스 띄우기:**
```bash
cd ~/smart-rebalancer
code .
```

**Agent 5에게:**
```
다음 파일을 읽고 지시에 따라 작업해줘:
AGENT_5_TAB_ARCHITECTURE.md

⚠️ 중요: Agent 1~4가 모두 완료되었어. 이제 3탭 구조로 전환해줘.
기존 탭 파일들을 백업한 후, app/(tabs)/_layout.tsx를 수정하고,
index.tsx, checkup.tsx, more.tsx를 새로 만들어.
```

#### 2-3. 백업 먼저 실행

```bash
mkdir -p app/\(tabs\)/backup
cp app/\(tabs\)/*.tsx app/\(tabs\)/backup/
```

#### 2-4. Agent 5 작업 완료 확인

- [ ] `app/(tabs)/_layout.tsx` 수정됨 (3개 탭)
- [ ] `app/(tabs)/index.tsx` 리팩터링됨 (오늘 탭)
- [ ] `app/(tabs)/checkup.tsx` 생성됨 (분석 탭)
- [ ] `app/(tabs)/more.tsx` 생성됨 (전체 탭)
- [ ] 빌드 성공: `npx expo start`

---

## 🔧 충돌 해결 전략

### 상황 1: 두 Agent가 같은 파일을 수정함
**증상:**
```
Agent 1이 index.tsx를 수정했는데, Agent 5도 수정함
→ Git conflict 발생
```

**해결:**
```bash
# 1. 최신 상태 확인
git status

# 2. 충돌 파일 확인
git diff index.tsx

# 3. 수동 병합 (VSCode에서 Merge Conflict 해결)
code app/(tabs)/index.tsx

# 4. 병합 후 테스트
npx expo start
```

### 상황 2: TypeScript 에러 폭발
**증상:**
```
Agent 3이 타입을 잘못 정의해서 다른 Agent 코드도 에러남
```

**해결:**
```bash
# 1. 에러 목록 확인
npx tsc --noEmit | grep "error TS"

# 2. 문제 Agent에게 수정 요청
"Agent 3, src/types/credit.ts에서 타입 에러가 발생했어. 수정해줘"

# 3. 전체 재확인
npx tsc --noEmit
```

### 상황 3: 패키지 충돌
**증상:**
```
Agent 2와 Agent 4가 동시에 npm install 실행
→ package-lock.json 충돌
```

**해결:**
```bash
# 1. package-lock.json 삭제
rm package-lock.json

# 2. 재설치
npm install

# 3. 재확인
npm install --dry-run
```

---

## 📦 최종 커밋 전략

### 단계별 커밋 (권장)

#### 1. Agent 1~4 작업 커밋
```bash
# Agent 1
git add src/components/home/*.tsx
git commit -m "feat: 맥락 카드 시스템 구현 (Agent 1)"

# Agent 2
git add src/components/predictions/*.tsx
git commit -m "feat: 예측 투표 시스템 구현 (Agent 2)"

# Agent 3
git add src/components/marketplace/*.tsx src/data/marketplaceItems.ts
git commit -m "feat: 크레딧 & 마켓플레이스 구현 (Agent 3)"

# Agent 4
git add app/analysis/*.tsx src/hooks/useDeepDive.ts
git commit -m "feat: AI 분석 도구 4종 구현 (Agent 4)"
```

#### 2. Agent 5 작업 커밋 (마지막)
```bash
git add app/\(tabs\)/_layout.tsx app/\(tabs\)/index.tsx app/\(tabs\)/checkup.tsx app/\(tabs\)/more.tsx
git commit -m "refactor: 3탭 구조 전환 (Agent 5)

- 12개 탭 → 3개 탭 (오늘/분석/전체)
- Agent 1~4 컴포넌트 통합
- 기존 탭 파일 backup 폴더로 이동
"
```

#### 3. 최종 Push
```bash
git push origin main
```

---

## 🧪 테스트 체크리스트

### Phase 1 완료 후 (Agent 1~4)
- [ ] TypeScript 에러 0개: `npx tsc --noEmit`
- [ ] 각 컴포넌트 import 가능: `import { ContextCard } from '@/src/components/home/ContextCard'`
- [ ] 훅 동작 확인: `useContextCard()`, `usePredictions()`, `useCredits()`

### Phase 2 완료 후 (Agent 5)
- [ ] 앱 실행: `npx expo start`
- [ ] iOS 시뮬레이터에서 3개 탭 확인
- [ ] 오늘 탭: 맥락 카드 + 예측 투표 보임
- [ ] 분석 탭: AI 진단 + 처방전 전환 가능
- [ ] 전체 탭: 크레딧 + 뱃지 + 메뉴 보임
- [ ] Pull-to-refresh 동작
- [ ] 다크 모드 전환 (Settings → Appearance)

---

## 📊 예상 타임라인

| 시간 | 작업 | 담당 |
|------|------|------|
| **00:00** | Agent 1~4 동시 시작 | 병렬 |
| 00:30 | 중간 점검 (진행 상황 확인) | 사용자 |
| **01:30** | Agent 1, 3 완료 예상 | Agent 1, 3 |
| **02:00** | Agent 2 완료 예상 | Agent 2 |
| **02:30** | Agent 4 완료 예상 | Agent 4 |
| 02:40 | TypeScript 전체 확인 | 사용자 |
| **03:00** | Agent 5 시작 (3탭 전환) | Agent 5 |
| **04:00** | 전체 완료 + 테스트 | 사용자 |

**총 예상 시간: 약 4시간**

---

## 🎯 성공 기준

✅ **모든 Agent가 에러 없이 작업 완료**
✅ **TypeScript 에러 0개**
✅ **앱이 3개 탭으로 실행됨**
✅ **CLAUDE.md의 핵심 기능들이 모두 동작함:**
   - 맥락 카드 4겹 레이어
   - 예측 투표 & 복기
   - 크레딧 시스템 (원화 병기)
   - AI 분석 도구 4종
   - 3탭 구조

---

## 🆘 문제 발생 시

**Slack/Discord에 즉시 공유:**
```
Agent X에서 에러 발생:
- 파일: xxx.tsx
- 에러 메시지: [붙여넣기]
- 상황: [설명]
```

**또는 각 Agent에게:**
```
에러가 발생했어:
[에러 메시지]

어떻게 해결할 수 있어?
```

---

## 📚 참고 자료

- **CLAUDE.md**: 프로젝트 전체 가이드
- **병렬 작업 규칙 (섹션 7)**: 파일 충돌 방지 규칙
- **각 Agent 프롬프트 파일**: `AGENT_X_*.md`

---

**준비됐으면 시작하세요! 🚀**
