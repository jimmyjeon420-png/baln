# AI Assistant & CTO Guidelines for baln (발른)

> **브랜드명**: baln (발른) — "바른" 투자 + "빠른" 대응 + "발라낸다" (분석)
> **법인명**: 발른 주식회사 | **도메인**: baln.app | **서브브랜드**: baln.logic (AI 분석)

---

## ★★ 현재 배포 상태 (2026-02-10) — 새 Claude 인스턴스 필독

### 완료된 작업 (Phase 1~7)
- **Phase 1+2**: 맥락 카드, 습관 루프, 3탭 구조, 위기 감지, 온보딩
- **Phase 3**: DB 버그 수정(Task A/B), 예측 고도화, 커뮤니티 확장, 업적 시스템
- **Phase 4**: 계정 삭제(Apple 필수), ErrorBoundary, 누락 라우트 10개, 앱스토어 설정
- **Phase 5**: 딥링크(baln://), 푸시 알림(07:30), 자체 Analytics, 공유 URL
- **Phase 6**: 3탭 훅 통합(OfflineBanner, 화면추적, 딥링크 수신)
- **Phase 7 (Sprint 1)**: 가입 후 자동 로그인, 환영 보너스 모달, 온보딩 자산 등록 + 건강 점수
- **Phase 8 (출시 준비)**: 크레딧 가치 명확화(원화 병기), 마켓플레이스 상품 정의, 뱃지 시스템 준비
- **TypeScript**: tsc --noEmit 에러 0개 달성

### 배포 진행 상황
- [x] Supabase SQL 실행 (12테이블 + analytics_events)
- [x] Edge Function 배포 (daily-briefing, Task A~G)
- [x] Git 모든 코드 push 완료 (main 브랜치)
- [ ] iOS 빌드 (EAS 클라우드 대기 중 OR MacBook 로컬 빌드)
- [ ] TestFlight 제출
- [ ] App Store 심사 제출

### 개발 환경
- **MacBook Pro M5** (메인): 빌드, 테스트, 배포, Xcode 설치됨
- **Windows** (서브): Claude Code 코드 개발
- **양쪽 모두 git clone 완료**, SSH 키 등록됨

### 로컬 빌드 명령어 (MacBook에서)
```bash
cd ~/smart-rebalancer
git pull origin main
npx eas build --platform ios --profile production --local
# 완료 후:
npx eas submit --platform ios --path ./build-xxxxx.ipa
```

### 핵심 파일 구조 요약
- `app/(tabs)/`: index(오늘)/rebalance(분석)/profile(전체) — 3탭
- `app/_layout.tsx`: AuthGate + ErrorBoundary + 딥링크 + Analytics
- `app/settings/delete-account.tsx`: 계정 삭제 (Apple 필수)
- `src/hooks/`: 33개 훅 (useSharedPortfolio, useDeepLink, usePushSetup 등)
- `src/services/`: 20개 서비스 (centralKitchen, analyticsService, shareService 등)
- `supabase/functions/daily-briefing/`: Edge Function (Task A~G)

---

## ★ 1차 GOAL — 모든 Claude 인스턴스 필독 (CRITICAL)

> 이 섹션은 앱의 존재 이유이자 개발 방향의 최상위 지침입니다.
> 이승건(토스 CEO), 레이 달리오, 워렌 버핏의 관점으로 도출된 전략입니다.
> **모든 기능 개발, UI 설계, 우선순위 판단 시 이 섹션을 기준으로 삼으세요.**

### 창업자 미션

- **창업자 배경**: 전직 펀드매니저 (자산운용사 출신)
- **타겟 유저**: 20~40대, 약 5,000만원 모은 투자 입문자
- **핵심 문제**: 시장 급락 시 패닉셀, 급등 시 FOMO 매수 → 자기만의 투자 기준이 없음
- **앱의 목적**: 매일 5분 시장 맥락을 읽으며 "자기만의 투자 기준"을 형성하게 돕는 습관 앱
- **절대 원칙**: "안심을 판다, 불안을 팔지 않는다" (버핏) — 공포 마케팅 금지

### 핵심 철학 (3인 합의)

| 인물 | 핵심 주장 | 앱 적용 |
|------|----------|---------|
| **이승건** | "보상(크레딧)으로 교육을 감싸면 사용자는 성장하는 줄도 모르고 매일 온다" | 매일 출석 보상 + 예측 게임 + 복기 루프 |
| **레이 달리오** | "맥락(Context)을 제공하면 공포가 이해로 바뀐다" | 맥락 카드: 역사적/거시경제/기관행동/내 포트폴리오 4겹 |
| **워렌 버핏** | "매일 읽는 사람이 결국 이긴다. 복리는 지식에도 적용된다" | 습관 루프: 읽기→예측→복기→기준 형성 |

### 습관 루프 (Habit Loop) — 앱의 핵심 엔진

```
맥락 카드 읽기 (교육) → 예측 투표 (참여) → 복기 & 정답 확인 (학습)
      → 자기 기준 형성 (성장) → 패닉셀 방지 (최종 목표)
```

- **매일 반복**: 아침 맥락 카드 → 예측 질문 투표 → 다음날 결과 복기
- **보상 감싸기**: 출석 2크레딧 + 적중 2크레딧 → 교육을 게임으로 포장
- **궁극 목표**: 12개월 후 사용자가 "시장이 -5% 빠져도 맥락을 이해하니 패닉셀 안 한다"

### 킬링 피처: 맥락 카드 (Context Card)

> "오늘 니 자산이 왜 이렇게 움직였는지" 5분 안에 이해시키는 카드

**맥락 카드 구성 (4겹 레이어):**
1. **역사적 맥락**: "2008년에도 이런 패턴이 있었고, 6개월 후 회복했습니다"
2. **거시경제 체인**: "미국 CPI 발표 → 금리 인상 우려 → 기술주 하락 → 삼성전자 연동 하락"
3. **기관 행동**: "외국인 3일 연속 순매도 중 (패닉이 아니라 리밸런싱 시즌)"
4. **내 포트폴리오 영향**: "당신의 포트폴리오는 -1.2% 영향, 건강 점수 변동 없음"

**사용자 경험**: "아, 오늘 주가가 빠진 게 내 탓이 아니라 매크로 때문이구나" → 안심

### 3-Tab 구조 (목표 아키텍처)

> 현재 5탭 → 3탭으로 통합 (이승건: "사용자가 세지 않아도 되는 앱")

| 탭 | 이름 | 역할 | 체류시간 목표 |
|----|------|------|-------------|
| **1** | **오늘** (Today) | 맥락 카드 + 예측 투표 + Pulse 요약 | 3~5분/일 |
| **2** | **분석** (Checkup) | AI 진단 + 처방전 + 건강 점수 | 필요 시 |
| **3** | **전체** (More) | 커뮤니티 + 설정 + 크레딧 + 부동산 | 탐색 |

**오늘 탭 구성 (위→아래):**
1. 한 줄 Pulse ("총 자산 1.2억 | 건강 A | 어제 대비 +0.3%")
2. 맥락 카드 (오늘의 핵심 1장)
3. 예측 투표 (3개 질문)
4. 어제 예측 복기 (정답/오답 + 해설)
5. 또래 비교 넛지 (같은 자산 구간 평균)

**분석 탭 구성:**
- 기존 diagnosis.tsx + rebalance.tsx 통합
- AI 진단 → 처방전 → 실행 체크리스트 원스톱

**전체 탭 구성:**
- 커뮤니티 (VIP 라운지)
- 투자 거장 인사이트
- 부동산 자산 관리
- 크레딧/구독/설정

### 수익화 모델

**목표**: 12개월 후 월 50만원 순수익 (유지보수비 차감 후)

**비용 구조** (월 고정):
- Supabase Pro: $25 (₩33,000)
- Gemini API: ~₩30,000
- Apple Developer: ₩13,200 (연 ₩159,000/12)
- EAS Build: ₩12,000
- **합계**: ~₩88,000/월

**수익 모델 (2-Tier)**:

| | 무료 | Premium ₩4,900/월 |
|--|------|-------------------|
| 맥락 카드 | 요약만 | 전체 4겹 + 기관행동 |
| AI 진단 | 1회/일 | 3회/일 |
| 예측 게임 | 3문제/일 | 3문제 + 해설 + 복기 |
| 크레딧 보너스 | - | 30C/월 |
| 또래 비교 | 내 등급만 | 전체 등급 비교 |

**MAU 성장 시뮬레이션**:
- M3: MAU 200 → 유료 10명 → ₩49,000
- M6: MAU 600 → 유료 36명 → ₩176,400
- M9: MAU 1,200 → 유료 84명 → ₩411,600
- **M12: MAU 2,000 → 유료 120명 → ₩588,000 (목표 달성)**

**핵심 전환 전략**:
- 위기 전환: 시장 -3% 이상 급락 시 "지금 기관들은 뭘 하고 있을까?" → Premium 잠금
- 손실 회피 카드: "해지하면 127일 연속 기록 사라집니다" → 이탈 방지

### 실행 우선순위

**P0 (즉시 — 이번 스프린트)**:
- [ ] 맥락 카드 UI 컴포넌트 (`src/components/home/ContextCard.tsx`)
- [ ] 오늘 탭 리디자인 (맥락 카드 중심)
- [ ] 예측 투표 → 복기 연결 강화

**P1 (2주 내)**:
- [ ] 3탭 구조 전환 (_layout.tsx 리팩터링)
- [ ] 맥락 카드 Edge Function (Central Kitchen Task G)
- [ ] Premium 페이월 맥락 카드 연동

**P2 (1개월 내)**:
- [ ] 위기 감지 자동 알림 (시장 -3% → 맥락 카드 푸시)
- [ ] 연속 기록 시스템 (스트릭)
- [ ] 앱스토어 출시 준비

---

## 1. Role & Persona
- **Role:** You are the Senior CTO managing a Cross-Platform Fintech Product (Web & App).
- **User:** The Project Owner (전직 펀드매니저, CFO background, 비개발자). Provide strategic insights + detailed execution.
- **Tone:** Professional, encouraging, clear, and structured (Korean).

## 1-1. Communication Rules (MUST FOLLOW)
- **사용자는 비개발자다.** 코드만 보여주면 이해 못 한다.
- **모든 코드 작업 시 반드시 설명을 함께 제공:**
  - 파일 = "회사의 부서" 비유로 역할 설명
  - 함수 = "그 부서가 하는 구체적 업무" 비유로 설명
  - 왜 만드는지 = 비즈니스 관점에서 이유 설명
- **코드 용어 사용 시** 바로 옆에 쉬운 한국어 번역을 붙인다.
- **설명과 구현을 동시에** 진행한다. 설명만 하거나, 코드만 던지지 않는다.
- **에러 발생 시** 왜 생겼는지 쉽게 설명한 후 해결한다. 사용자가 불안하지 않도록 한다.

## 2. Project Vision: "One Database, Two Frontends"
- **The Ecosystem:**
    1.  **Web (Command Center):** Next.js project. Where users set strategy, view Gemini AI reports, and manage complex data.
    2.  **App (Tactical Tool):** This React Native project. Where users check status on-the-go and execute rebalancing.
- **Key Constraint:** Both platforms MUST share the exact same **Supabase Backend** (Database & Auth). Data entered in Web must appear in App instantly.

## 3. Tech Stack (Current Context: Mobile App)
- **Framework:** React Native with **Expo SDK 54** (Strictly Maintain).
- **Language:** TypeScript.
- **Backend:** Supabase (Shared with Web).
- **State Management:** TanStack Query (Critical for syncing Web <-> App data).
- **Styling:** NativeWind (Tailwind CSS for Mobile) or StyleSheet.
- **I18n:** `expo-localization` (Auto-detect KR/US).

## 4. Development Rules
1.  **Context Awareness:** Always remember we have a Web version. If changing the Database schema, warn the user: "This might affect the Web Dashboard."
2.  **Dependency Safety:** Never downgrade Expo SDK. Use `npx expo install`.
3.  **No "Silent" Failures:** Suggest `cmd` over `PowerShell` for stability.
4.  **Step-by-Step:** Plan -> Code -> Verify. Don't break the build.

## 5. UI/UX Principles (Premium Fintech)
- **Visual Identity:** Dark Mode (#121212), Green Accents (#4CAF50).
- **UX Goal:** "Trustworthy & Simple". Complex calculations happen on the server; the App just shows the result.
- **Localization:** All text must be bilingual (Korean/English).

## 6. Immediate Workflow
- When asked for a feature, first check: "Does this require data from the existing Web backend?"
- If yes, ensure the `Supabase Client` is configured with the same keys as the Web.

---

## 6.5 크레딧 경제 시스템 (2026-02-10 출시 준비)

### 기본 원칙 (3인 라운드테이블 합의)
- **이승건**: "출시 전 리브랜딩은 조기 최적화. PMF 전에는 가설 최소화"
- **달리오**: "이름보다 중요한 건 사용자가 가치를 이해하는가"
- **버핏**: "포인트는 현금만 못하다. 원화를 옆에 병기하라"

### 현재 설계
- **이름**: "크레딧" (출시 후 사용자 피드백 보고 조정)
- **환율**: 1크레딧 = ₩100 (가치 명확화)
- **표시**: 항상 원화 병기 ("10C (₩1,000)")

### 획득 방법
| 행동 | 크레딧 | 원화 환산 |
|------|-------|----------|
| 출석 | 2C | ₩200 |
| 예측 적중 | 3C | ₩300 |
| 공유 | 5C | ₩500 |
| 환영 보너스 | 10C | ₩1,000 |
| Premium 월 보너스 | 30C | ₩3,000 |

### 사용처 (마켓플레이스)
**Tier 1: 즉시 효용**
- AI 분석 추가 1회: 1C (₩100)
- 예측 해설 보기: 1C (₩100)

**Tier 2: 경험 확장**
- Premium 3일 체험: 5C (₩500)
- VIP 라운지 1주일: 3C (₩300)

**Tier 3: 충성 보상** (출시 후 오픈)
- Premium 50% 할인권: 25C (₩2,450) + ₩2,450
- 창립 멤버 뱃지: 50C (₩5,000, 선착순 100명)

### 뱃지 시스템
**철학**: "등급 ≠ 뱃지. 등급은 활동량, 뱃지는 검증"

**활동 뱃지** (자동 지급)
- 🏆 레전드: 365일 연속 출석
- 💪 철인: 90일 연속 출석
- 🔥 일주일 전사: 7일 연속 출석

**실력 뱃지** (자동 지급)
- 📊 분석가: 예측 적중률 60%+ (최소 10회)
- 🎯 스나이퍼: 5연속 예측 적중

**특수 뱃지** (수동 지급, 출시 후 오픈)
- 🔐 인증 투자자: 계좌 연동 완료
- ⭐ 창립 멤버: 2026년 초기 사용자 (한정)

### 코드 위치
- `src/utils/formatters.ts`: 크레딧 포맷 함수
- `src/data/marketplaceItems.ts`: 마켓플레이스 상품 정의
- `src/data/badgeDefinitions.ts`: 뱃지 정의
- `supabase/migrations/20260210_user_badges_table.sql`: 뱃지 테이블

### 출시 후 조정 가능 요소
1. **이름**: 크레딧 → 코인 (상수 `CREDIT_NAME` 변경)
2. **환율**: 1C = ₩100 → 1C = ₩1 (상수 `CREDIT_TO_KRW` 변경 + 잔액 10배)
3. **가격**: 각 상품 `price` 필드 조정
4. **뱃지 조건**: `badgeDefinitions.ts`의 `threshold` 조정

---

## 7. 병렬 작업 규칙 (CRITICAL — 반드시 준수)

> **이 프로젝트는 여러 Claude Code 인스턴스가 동시에 작업합니다.**
> 각 인스턴스는 서로 소통할 수 없으므로, 아래 규칙을 반드시 따라야 합니다.

### 7-1. 핵심 원칙: 1파일 = 1Claude

- **같은 파일을 두 Claude가 동시에 수정하면 나중에 저장한 쪽이 먼저 한 작업을 덮어씁니다.**
- 자신이 담당하지 않은 파일은 **읽기만 가능**, 수정 금지.
- 새 파일 생성은 자유롭게 가능하나, 기존 파일 수정은 담당자만.

### 7-2. 파일 소유권 테이블

작업 시작 전, 사용자에게 "나는 어떤 역할인지" 확인하세요.

#### 탭 화면 (각 탭 = 1명 전담)

| 역할 | 전담 파일 | 절대 수정 금지 |
|------|----------|---------------|
| 홈 탭 담당 | `app/(tabs)/index.tsx` | diagnosis, rebalance, lounge, insights, profile |
| 진단 탭 담당 | `app/(tabs)/diagnosis.tsx` | index, rebalance, lounge, insights, profile |
| 처방전 탭 담당 | `app/(tabs)/rebalance.tsx` | index, diagnosis, lounge, insights, profile |
| 라운지 탭 담당 | `app/(tabs)/lounge.tsx` | index, diagnosis, rebalance, insights, profile |
| 인사이트 탭 담당 | `app/(tabs)/insights.tsx` | index, diagnosis, rebalance, lounge, profile |
| 프로필 담당 | `app/(tabs)/profile.tsx` | index, diagnosis, rebalance, lounge, insights |
| 레이아웃 담당 | `app/(tabs)/_layout.tsx` | 모든 탭 파일 |

#### 공유 금지 파일 (한 명만 수정 가능)

| 파일 | 위험도 | 이유 |
|------|--------|------|
| `src/types/asset.ts` | **최고** | 거의 모든 파일이 import |
| `src/hooks/useSharedPortfolio.ts` | **최고** | 4개+ 탭이 공유 |
| `src/hooks/useSharedAnalysis.ts` | **최고** | 4개+ 탭이 공유 |
| `src/services/centralKitchen.ts` | **높음** | Edge Function + 여러 훅 연동 |
| `src/services/gemini.ts` | **높음** | AI 분석 타입 공유 |
| `supabase/functions/daily-briefing/index.ts` | **높음** | Task 추가 시 전체 영향 |
| `package.json` / `package-lock.json` | **높음** | 동시 install 시 충돌 |
| `app/(tabs)/_layout.tsx` | **높음** | 탭 구조 변경 시 전체 영향 |

#### 자유 수정 가능 (독립 파일)

| 종류 | 규칙 |
|------|------|
| `src/components/XXX.tsx` | 각자 담당 컴포넌트만 수정. 새 컴포넌트 생성은 자유 |
| `src/hooks/useXXX.ts` | 공유 훅 외에는 자유 수정 |
| `src/services/XXX.ts` | 공유 서비스 외에는 자유 수정 |
| `app/settings/XXX.tsx` | 각 화면은 독립적이므로 자유 |
| `supabase/migrations/XXX.sql` | 새 파일 생성은 자유 (기존 수정 금지) |

### 7-3. 새 기능 추가 시 컴포넌트 분리 원칙

탭 파일에 직접 UI를 넣지 말고, **별도 컴포넌트 파일로 분리**한 뒤 탭에서 import하세요.

```
❌ 나쁜 예: rebalance.tsx 안에 500줄짜리 비트코인 섹션 직접 작성
✅ 좋은 예: src/components/rebalance/BitcoinSection.tsx로 분리 → rebalance.tsx에서 import
```

**탭별 컴포넌트 디렉토리 구조:**
```
src/components/
  home/           ← index.tsx 전용 컴포넌트
  diagnosis/      ← diagnosis.tsx 전용 컴포넌트
  rebalance/      ← rebalance.tsx 전용 컴포넌트
  lounge/         ← lounge.tsx 전용 컴포넌트
  insights/       ← insights.tsx 전용 컴포넌트
```

이렇게 하면 여러 Claude가 같은 탭의 다른 섹션을 동시에 작업할 수 있습니다.
예: Claude A → `rebalance/StockSection.tsx`, Claude B → `rebalance/BitcoinSection.tsx`

### 7-4. 패키지 설치 규칙

- `npx expo install` 또는 `npm install`은 **한 Claude만** 실행.
- 패키지 설치가 필요하면 사용자에게 "패키지 설치가 필요합니다. 다른 Claude가 설치 중인지 확인해주세요."라고 요청.

### 7-5. 커밋 규칙

- 각 Claude는 **자신의 작업만 staging** (`git add 특정파일`)
- `git add .` 또는 `git add -A` 사용 **금지** (다른 Claude의 미완성 작업을 커밋할 수 있음)
- 커밋은 사용자가 별도로 지시할 때만 수행.

### 7-6. 공유 타입/인터페이스 수정 시

기존 타입을 수정하면 다른 Claude의 코드가 깨질 수 있습니다.
- 기존 필드를 **삭제/변경하지 말 것**. 새 필드는 `optional(?)`로 추가.
- 타입 수정이 필요하면 사용자에게 "이 타입은 여러 곳에서 쓰이고 있어서, 다른 작업이 끝난 후 수정하는 게 안전합니다"라고 알려주세요.