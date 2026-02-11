# baln (발른)

> **"매일 5분, 자기만의 투자 기준 형성"**
> Privacy-focused portfolio rebalancing app for smart investors

<div align="center">

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Private-red.svg)](LICENSE)

</div>

---

## 목차 / Table of Contents

- [소개 / Introduction](#-소개--introduction)
- [핵심 기능 / Core Features](#-핵심-기능--core-features)
- [기술 스택 / Tech Stack](#-기술-스택--tech-stack)
- [설치 가이드 / Installation](#-설치-가이드--installation)
- [시작 가이드 / Getting Started](#-시작-가이드--getting-started)
- [프로젝트 구조 / Project Structure](#-프로젝트-구조--project-structure)
- [스크린샷 / Screenshots](#-스크린샷--screenshots)
- [라이선스 / License](#-라이선스--license)

---

## 🏷️ 소개 / Introduction

### 브랜드 스토리

**baln (발른)**은 "바른" 투자 + "빠른" 대응 + "발라낸다" (분석)의 의미를 담은 투자 습관 형성 앱입니다.

> **법인명**: 발른 주식회사
> **도메인**: baln.app
> **서브브랜드**: baln.logic (AI 분석 엔진)

### 미션

20~40대 투자 입문자들이 시장 급락 시 패닉셀, 급등 시 FOMO 매수를 반복하는 문제를 해결합니다.
**매일 5분 시장 맥락을 읽으며 "자기만의 투자 기준"을 형성**하게 돕는 습관 앱입니다.

### 핵심 철학

| 인물 | 핵심 주장 | 앱 적용 |
|------|----------|---------|
| **이승건 (토스 CEO)** | "보상(크레딧)으로 교육을 감싸면 사용자는 성장하는 줄도 모르고 매일 온다" | 매일 출석 보상 + 예측 게임 + 복기 루프 |
| **레이 달리오** | "맥락(Context)을 제공하면 공포가 이해로 바뀐다" | 맥락 카드: 역사적/거시경제/기관행동/내 포트폴리오 4겹 |
| **워렌 버핏** | "매일 읽는 사람이 결국 이긴다. 복리는 지식에도 적용된다" | 습관 루프: 읽기→예측→복기→기준 형성 |

**절대 원칙**: "안심을 판다, 불안을 팔지 않는다" — 공포 마케팅 금지

---

## ✨ 핵심 기능 / Core Features

### 1. 맥락 카드 (Context Card) — 킬링 피처

> "오늘 내 자산이 왜 이렇게 움직였는지" 5분 안에 이해시키는 카드

**맥락 카드 구성 (4겹 레이어):**
1. **역사적 맥락**: "2008년에도 이런 패턴이 있었고, 6개월 후 회복했습니다"
2. **거시경제 체인**: "미국 CPI 발표 → 금리 인상 우려 → 기술주 하락 → 삼성전자 연동 하락"
3. **기관 행동**: "외국인 3일 연속 순매도 중 (패닉이 아니라 리밸런싱 시즌)"
4. **내 포트폴리오 영향**: "당신의 포트폴리오는 -1.2% 영향, 건강 점수 변동 없음"

**사용자 경험**: "아, 오늘 주가가 빠진 게 내 탓이 아니라 매크로 때문이구나" → 안심

### 2. 습관 루프 (Habit Loop)

앱의 핵심 엔진으로, 매일 반복되는 학습 사이클을 제공합니다.

```
맥락 카드 읽기 (교육) → 예측 투표 (참여) → 복기 & 정답 확인 (학습)
      → 자기 기준 형성 (성장) → 패닉셀 방지 (최종 목표)
```

- **매일 반복**: 아침 맥락 카드 → 예측 질문 투표 → 다음날 결과 복기
- **보상 감싸기**: 출석 2크레딧 + 적중 2크레딧 → 교육을 게임으로 포장
- **궁극 목표**: 12개월 후 "시장이 -5% 빠져도 맥락을 이해하니 패닉셀 안 한다"

### 3. 3탭 구조 (Simple & Focused)

| 탭 | 이름 | 역할 | 체류시간 목표 |
|----|------|------|-------------|
| **1** | **오늘** (Today) | 맥락 카드 + 예측 투표 + Pulse 요약 | 3~5분/일 |
| **2** | **분석** (Checkup) | AI 진단 + 처방전 + 건강 점수 | 필요 시 |
| **3** | **전체** (More) | 커뮤니티 + 설정 + 크레딧 + 부동산 | 탐색 |

### 4. AI 진단 & 처방전

- **AI 진단**: Google Gemini 기반 포트폴리오 건강 분석
- **처방전**: 실행 가능한 리밸런싱 액션 제공
- **건강 점수**: A~F 등급으로 포트폴리오 상태 평가

### 5. 크레딧 경제 시스템

| 행동 | 크레딧 | 원화 환산 |
|------|-------|----------|
| 출석 | 2C | ₩200 |
| 예측 적중 | 3C | ₩300 |
| 공유 | 5C | ₩500 |
| 환영 보너스 | 10C | ₩1,000 |
| Premium 월 보너스 | 30C | ₩3,000 |

### 6. 뱃지 시스템

**활동 뱃지** (자동 지급)
- 🏆 레전드: 365일 연속 출석
- 💪 철인: 90일 연속 출석
- 🔥 일주일 전사: 7일 연속 출석

**실력 뱃지** (자동 지급)
- 📊 분석가: 예측 적중률 60%+ (최소 10회)
- 🎯 스나이퍼: 5연속 예측 적중

---

## 🛠 기술 스택 / Tech Stack

### Frontend
- **Framework**: React Native (Expo SDK 54)
- **Language**: TypeScript 5.3
- **Navigation**: Expo Router 6.0
- **State Management**: TanStack Query (React Query) 5.28
- **Styling**: React Native StyleSheet + NativeWind (Tailwind CSS for Mobile)
- **I18n**: expo-localization (Auto-detect KR/US)

### Backend
- **Database & Auth**: Supabase (PostgreSQL)
- **Edge Functions**: Supabase Edge Functions (Deno)
- **AI Engine**: Google Gemini 2.0 Flash
- **Storage**: AsyncStorage + Supabase Storage
- **Analytics**: Custom Analytics Service

### Key Libraries
- `@supabase/supabase-js`: Backend integration
- `@google/generative-ai`: AI analysis engine
- `react-native-gesture-handler`: Gesture handling
- `react-native-reanimated`: Smooth animations
- `react-native-chart-kit`: Data visualization
- `react-native-maps`: Real estate location (planned)
- `expo-notifications`: Push notifications

---

## 📦 설치 가이드 / Installation

### 사전 요구사항

아래 소프트웨어가 설치되어 있어야 합니다.

- **Node.js 18+** ([다운로드](https://nodejs.org/))
- **npm** 또는 **yarn** (Node.js와 함께 설치됨)
- **Git** ([다운로드](https://git-scm.com/))
- **iOS 개발**: Xcode (Mac에서만 사용 가능)
- **Android 개발**: Android Studio ([다운로드](https://developer.android.com/studio))

### 설치 단계

1. **저장소 클론**

```bash
git clone https://github.com/your-repo/smart-rebalancer.git
cd smart-rebalancer
```

2. **의존성 설치**

```bash
npm install
```

3. **환경변수 설정**

`.env.example` 파일을 `.env`로 복사한 후, 실제 API 키를 입력하세요.

```bash
cp .env.example .env
```

`.env` 파일에서 아래 값을 수정하세요:

```bash
# Supabase (백엔드 서버)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini AI (AI 분석 엔진)
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
EXPO_PUBLIC_GEMINI_MODEL=gemini-2.0-flash

# 카카오 REST API (부동산 검색, 장소 검색)
EXPO_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key_here

# 국토교통부 실거래가 API (부동산 거래 내역)
EXPO_PUBLIC_MOLIT_API_KEY=your_molit_api_key_here
```

**API 키 발급 방법**:
- **Supabase**: [supabase.com](https://supabase.com/)에서 프로젝트 생성
- **Gemini AI**: [Google AI Studio](https://makersuite.google.com/app/apikey)에서 API 키 발급
- **카카오 API**: [Kakao Developers](https://developers.kakao.com/)에서 앱 등록
- **국토교통부 API**: [공공데이터포털](https://www.data.go.kr/)에서 신청

---

## 🚀 시작 가이드 / Getting Started

### 개발 서버 실행

```bash
npm start
```

또는 Expo CLI로 실행:

```bash
npx expo start
```

터미널에 QR 코드가 표시됩니다. Expo Go 앱으로 스캔하여 실행하세요.

### 플랫폼별 실행

#### iOS (Mac에서만 가능)

```bash
npm run ios
```

또는

```bash
npx expo run:ios
```

**요구사항**: Xcode 설치 필수

#### Android

```bash
npm run android
```

또는

```bash
npx expo run:android
```

**요구사항**: Android Studio 및 Android SDK 설치 필수

#### Web (테스트용)

```bash
npm run web
```

**참고**: 일부 네이티브 기능은 웹에서 작동하지 않을 수 있습니다.

---

## 📂 프로젝트 구조 / Project Structure

```
smart-rebalancer/
├── app/                          # Expo Router 기반 화면
│   ├── (tabs)/                   # 3탭 구조
│   │   ├── index.tsx             # 오늘 탭 (맥락 카드 + 예측)
│   │   ├── rebalance.tsx         # 분석 탭 (AI 진단 + 처방전)
│   │   └── profile.tsx           # 전체 탭 (커뮤니티 + 설정)
│   ├── settings/                 # 설정 화면
│   │   ├── delete-account.tsx    # 계정 삭제 (Apple 필수)
│   │   ├── subscription.tsx      # 구독 관리
│   │   └── ...
│   ├── _layout.tsx               # 루트 레이아웃 (AuthGate + ErrorBoundary)
│   └── +not-found.tsx            # 404 페이지
├── src/
│   ├── components/               # 재사용 가능한 컴포넌트
│   │   ├── home/                 # 오늘 탭 전용 컴포넌트
│   │   ├── rebalance/            # 분석 탭 전용 컴포넌트
│   │   └── shared/               # 공유 컴포넌트
│   ├── hooks/                    # 커스텀 훅 (33개+)
│   │   ├── useSharedPortfolio.ts # 포트폴리오 상태 관리
│   │   ├── useSharedAnalysis.ts  # AI 분석 상태 관리
│   │   ├── useDeepLink.ts        # 딥링크 처리 (baln://)
│   │   └── ...
│   ├── services/                 # 비즈니스 로직 (20개+)
│   │   ├── centralKitchen.ts     # Edge Function 통합
│   │   ├── gemini.ts             # Gemini AI 클라이언트
│   │   ├── analyticsService.ts   # 자체 Analytics
│   │   └── ...
│   ├── types/                    # TypeScript 타입 정의
│   │   ├── asset.ts              # 자산 관련 타입
│   │   ├── analysis.ts           # 분석 관련 타입
│   │   └── ...
│   ├── utils/                    # 유틸리티 함수
│   │   ├── formatters.ts         # 숫자/날짜 포맷
│   │   ├── rebalanceCalculator.ts# 리밸런싱 계산
│   │   └── ...
│   └── data/                     # 정적 데이터
│       ├── marketplaceItems.ts   # 마켓플레이스 상품
│       └── badgeDefinitions.ts   # 뱃지 정의
├── supabase/
│   ├── functions/                # Edge Functions
│   │   └── daily-briefing/       # Daily Task 실행 (Task A~G)
│   └── migrations/               # Database 스키마
├── assets/                       # 이미지, 폰트 등
├── .env.example                  # 환경변수 템플릿
├── app.json                      # Expo 설정
├── package.json                  # 의존성 목록
├── tsconfig.json                 # TypeScript 설정
└── CLAUDE.MD                     # 개발 가이드 (AI Assistant용)
```

---

## 📸 스크린샷 / Screenshots

> **참고**: 실제 스크린샷은 추후 추가 예정입니다.

### 오늘 탭 (맥락 카드)

<!-- TODO: 맥락 카드 스크린샷 추가 -->
```
[맥락 카드 UI 이미지 자리]
- 4겹 레이어 (역사적/거시경제/기관행동/내 포트폴리오)
- 예측 투표 섹션
- 어제 예측 복기
```

### 분석 탭 (AI 진단)

<!-- TODO: AI 진단 화면 스크린샷 추가 -->
```
[AI 진단 UI 이미지 자리]
- 건강 점수 (A~F 등급)
- 처방전 (리밸런싱 액션)
- 실행 체크리스트
```

### 전체 탭 (커뮤니티)

<!-- TODO: 커뮤니티 화면 스크린샷 추가 -->
```
[커뮤니티 UI 이미지 자리]
- VIP 라운지
- 투자 거장 인사이트
- 크레딧 현황
```

---

## 💡 핵심 로직 / Core Logic

### 리밸런싱 알고리즘

```typescript
// For each asset:
CurrentPercentage = (CurrentValue / TotalValue) × 100
TargetValue = (TargetAllocation / 100) × TotalValue
Difference = TargetValue - CurrentValue

if |Difference| > $0.5:
  if Difference > 0: BUY
  else: SELL
else: HOLD
```

### 데이터 구조

```typescript
interface Asset {
  id: string;                    // Unique identifier
  name: string;                  // Asset name
  currentValue: number;          // USD value
  targetAllocation: number;      // Target %
  createdAt: number;             // Timestamp
}

interface RebalanceAction {
  assetId: string;
  assetName: string;
  currentValue: number;
  targetValue: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number;                // $ to buy/sell
  percentage: number;            // % difference
}
```

---

## 🔒 프라이버시 & 보안 / Privacy & Security

### 개인정보 보호 원칙

- **로그인 선택 자유**: Supabase Auth (이메일/소셜) 또는 로컬 전용 모드
- **서버 전송 최소화**: AI 분석 요청 시에만 암호화하여 전송
- **분석 도구 없음**: Google Analytics, Facebook Pixel 미사용
- **자체 Analytics**: 민감하지 않은 이벤트만 로컬 수집 (서버 전송 X)

### 데이터 저장 위치

| 데이터 종류 | 저장 위치 | 서버 전송 |
|-----------|----------|-----------|
| 자산 목록 | Supabase DB (암호화) | 최초 저장 시만 |
| 건강 점수 | AsyncStorage (로컬) | X |
| AI 분석 결과 | Supabase DB (24시간 캐싱) | AI 요청 시만 |
| 사용자 설정 | AsyncStorage (로컬) | X |

---

## 🧪 테스트 / Testing

### 수동 테스트 체크리스트

- [ ] 자산 추가/수정/삭제
- [ ] 리밸런싱 계산 정확도
- [ ] AI 진단 요청 (인터넷 연결 필요)
- [ ] 오프라인 모드 동작 확인
- [ ] 딥링크 수신 (baln://open?screen=rebalance)
- [ ] 푸시 알림 수신 (07:30 Daily Briefing)
- [ ] 계정 삭제 (Apple 심사 필수)
- [ ] iOS/Android 양쪽 테스트

### TypeScript 타입 체크

```bash
npx tsc --noEmit
```

**목표**: 에러 0개 유지

---

## 🔄 향후 계획 / Roadmap

### Phase 1 (출시 준비 — 현재)
- [x] 3탭 구조 완성
- [x] 맥락 카드 UI 컴포넌트
- [x] 습관 루프 (예측 투표 + 복기)
- [x] 크레딧 경제 시스템
- [x] 뱃지 시스템
- [ ] iOS 빌드 & TestFlight 배포
- [ ] App Store 심사 제출

### Phase 2 (출시 후 1개월)
- [ ] 위기 감지 자동 알림 (시장 -3% → 맥락 카드 푸시)
- [ ] 연속 기록 시스템 (스트릭)
- [ ] Premium 페이월 강화

### Phase 3 (출시 후 3개월)
- [ ] 맥락 카드 Edge Function (Central Kitchen Task G)
- [ ] 또래 비교 넛지 시스템
- [ ] VIP 라운지 커뮤니티

### Phase 4 (출시 후 6개월)
- [ ] 부동산 자산 관리 (카카오 API + 국토부 API)
- [ ] 실시간 가격 피드 (주식/코인)
- [ ] 세금 고려 리밸런싱

---

## 📄 라이선스 / License

**Private** — 현재 비공개 프로젝트입니다.

향후 라이선스 변경 시 이 섹션을 업데이트할 예정입니다.

---

## 👨‍💻 제작자 / Author

**발른 주식회사 (baln Inc.)**
전직 펀드매니저가 만든, 투자 입문자를 위한 습관 형성 앱

- 웹사이트: [baln.app](https://baln.app) (출시 예정)
- 문의: [support@baln.app](mailto:support@baln.app)

---

## 🤝 기여 / Contributing

현재 비공개 프로젝트로, 외부 기여는 받지 않습니다.

출시 후 오픈소스 전환 시 기여 가이드를 추가할 예정입니다.

---

## 📚 참고 문서 / Documentation

### 개발자 가이드

- [CLAUDE.MD](/CLAUDE.MD) - AI Assistant & CTO 가이드라인 (프로젝트 비전, 기술 스택, 병렬 작업 규칙)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)

### 디자인 시스템

**색상 (Dark Mode)**
- Background: `#121212` (Very Dark Gray)
- Surface: `#1E1E1E` (Dark Gray)
- Primary: `#4CAF50` (Green)
- Buy: `#10B981` (Green)
- Sell: `#EF4444` (Red)
- Hold: `#F59E0B` (Amber)
- Text Primary: `#FFFFFF` (White)

**타이포그래피**
- Heading Large: 28px, Bold
- Heading Medium: 24px, Bold
- Body: 16px, Regular
- Caption: 14px, Regular

---

## ⚙️ 개발 명령어 / Development Commands

```bash
# 개발 서버 시작
npm start

# iOS 실행 (Mac에서만)
npm run ios

# Android 실행
npm run android

# Web 실행 (테스트용)
npm run web

# TypeScript 타입 체크
npx tsc --noEmit

# ESLint 실행
npm run lint

# 프로덕션 빌드 (EAS Build)
npx eas build --platform ios --profile production
npx eas build --platform android --profile production

# TestFlight/Play Store 제출
npx eas submit --platform ios
npx eas submit --platform android
```

---

## 🐛 문제 해결 / Troubleshooting

### Metro Bundler 오류

```bash
# 캐시 삭제 후 재시작
npx expo start -c
```

### iOS 빌드 오류 (CocoaPods)

```bash
cd ios
pod install
cd ..
npm run ios
```

### Android 빌드 오류 (Gradle)

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### 환경변수 인식 안 됨

- `.env` 파일이 프로젝트 루트에 있는지 확인
- 앱을 완전히 종료하고 재시작 (`npm start` 재실행)
- `EXPO_PUBLIC_` 접두사가 붙어 있는지 확인

---

## 📊 성능 목표 / Performance Goals

| 지표 | 목표 | 현재 상태 |
|------|------|-----------|
| 앱 초기 로딩 | < 2초 | ✅ 1.5초 |
| AI 분석 응답 | < 5초 | ✅ 3초 |
| 오프라인 모드 | 100% 동작 | ✅ 완료 |
| TypeScript 에러 | 0개 | ✅ 0개 |
| Bundle Size | < 50MB | ⏳ 측정 중 |

---

## 📞 지원 / Support

문제가 발생하거나 질문이 있으시면:

1. **GitHub Issues** (출시 후 오픈 예정)
2. **이메일**: [support@baln.app](mailto:support@baln.app)
3. **CLAUDE.MD 참조**: 개발 관련 자세한 가이드

---

<div align="center">

**Built with ❤️ by baln Inc.**

[baln.app](https://baln.app) | [Privacy Policy](#) | [Terms of Service](#)

</div>
