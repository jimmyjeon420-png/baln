# 🤝 Contributing Guide / 기여 가이드

> **baln (발른)** — 바른 투자, 빠른 대응, 발라낸 분석

이 문서는 baln 프로젝트에 기여하는 개발자를 위한 상세 가이드입니다.
This document provides a detailed guide for developers contributing to the baln project.

---

## 📋 목차 / Table of Contents

1. [시작하기 / Getting Started](#-시작하기--getting-started)
2. [개발 환경 설정 / Development Setup](#-개발-환경-설정--development-setup)
3. [코드 스타일 가이드 / Code Style Guide](#-코드-스타일-가이드--code-style-guide)
4. [컴포넌트 분리 원칙 / Component Separation](#-컴포넌트-분리-원칙--component-separation-critical)
5. [병렬 작업 규칙 / Parallel Work Rules](#-병렬-작업-규칙--parallel-work-rules-critical)
6. [테스트 가이드 / Testing Guide](#-테스트-가이드--testing-guide)
7. [Git 워크플로우 / Git Workflow](#-git-워크플로우--git-workflow)
8. [PR 프로세스 / Pull Request Process](#-pr-프로세스--pull-request-process)

---

## 🚀 시작하기 / Getting Started

### 환영합니다! / Welcome!

baln은 오픈소스 프로젝트는 아니지만, 팀 협업을 위한 명확한 가이드를 제공합니다.
While baln is not an open-source project, we maintain clear guidelines for team collaboration.

**코드 품질 유지 원칙 / Code Quality Principles:**
- 안정성 우선 (Stability First): 신규 기능보다 기존 기능의 안정성 우선
- 타입 안전성 (Type Safety): TypeScript strict mode 준수
- 테스트 커버리지 (Test Coverage): 80% 이상 유지
- 문서화 (Documentation): 코드만큼 중요한 문서 작성

---

## 🛠 개발 환경 설정 / Development Setup

### 필수 요구사항 / Prerequisites

```bash
# Node.js 18+ 및 npm
node --version  # v18.0.0 이상 / v18.0.0 or higher
npm --version   # v9.0.0 이상 / v9.0.0 or higher

# Expo CLI
npm install -g expo-cli

# iOS 개발 (macOS만 / macOS only)
xcode-select --install
```

### 프로젝트 설정 / Project Setup

```bash
# 저장소 클론 / Clone repository
git clone <repository-url>
cd smart-rebalancer

# 의존성 설치 / Install dependencies
npm install

# 개발 서버 시작 / Start development server
npm start

# iOS 실행 (macOS만 / macOS only)
npm run ios

# Android 실행 / Run Android
npm run android
```

### 환경 변수 / Environment Variables

프로젝트 루트에 `.env` 파일 생성 (Create `.env` file in project root):

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

⚠️ **중요 / Important**: `.env` 파일은 절대 커밋하지 마세요 / Never commit `.env` files!

---

## 🎨 코드 스타일 가이드 / Code Style Guide

### TypeScript 컨벤션

#### 1️⃣ `interface` vs `type` 사용 기준

```typescript
// ✅ 좋은 예 / Good: 확장 가능한 객체 구조는 interface 사용
interface User {
  id: string;
  name: string;
  email: string;
}

interface PremiumUser extends User {
  subscriptionTier: string;
}

// ✅ 좋은 예 / Good: Union, Tuple, 함수 타입은 type 사용
type Status = 'pending' | 'active' | 'inactive';
type Point = [number, number];
type Callback = (data: string) => void;

// ❌ 나쁜 예 / Bad: 단순 객체를 type으로 정의
type UserBad = {
  id: string;
  name: string;
};
```

**규칙 요약 / Rule Summary:**
- 객체 구조 (Object structures) → `interface`
- Union/Intersection/Primitive types → `type`
- API 응답 타입 (API response types) → `interface`

#### 2️⃣ 함수형 컴포넌트 우선

```typescript
// ✅ 좋은 예 / Good: 함수형 컴포넌트 + TypeScript
interface Props {
  title: string;
  onPress: () => void;
}

export const CustomButton: React.FC<Props> = ({ title, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
};

// ❌ 나쁜 예 / Bad: 클래스 컴포넌트 (레거시 코드 제외)
class CustomButtonBad extends React.Component<Props> {
  render() {
    return <TouchableOpacity>...</TouchableOpacity>;
  }
}
```

### React Native 컨벤션

#### 1️⃣ 스타일링: NativeWind (Tailwind) 또는 StyleSheet

```typescript
// ✅ 방법 1: NativeWind (Tailwind CSS) - 권장
import { View, Text } from 'react-native';

export const Card = () => (
  <View className="bg-gray-900 p-4 rounded-lg">
    <Text className="text-white text-lg font-bold">제목</Text>
  </View>
);

// ✅ 방법 2: StyleSheet - 복잡한 스타일링 시 사용
import { StyleSheet, View, Text } from 'react-native';

export const Card = () => (
  <View style={styles.container}>
    <Text style={styles.title}>제목</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    padding: 16,
    borderRadius: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

// ❌ 나쁜 예 / Bad: 인라인 스타일 (성능 저하)
<View style={{ backgroundColor: '#121212', padding: 16 }}>
```

**스타일링 규칙 / Styling Rules:**
- 간단한 레이아웃 → NativeWind (Tailwind)
- 복잡한 애니메이션/동적 스타일 → StyleSheet
- 인라인 스타일 금지 (Avoid inline styles)

#### 2️⃣ 컴포넌트 및 파일 네이밍

```
✅ 컴포넌트 / Component: PascalCase
   - CustomButton.tsx
   - ContextCard.tsx
   - UserProfile.tsx

✅ 파일 / File: kebab-case
   - central-kitchen.ts
   - use-shared-portfolio.ts
   - analytics-service.ts

✅ 폴더 / Folder: kebab-case
   - src/components/home/
   - src/hooks/
   - app/(tabs)/
```

#### 3️⃣ import 순서

```typescript
// 1️⃣ React 및 React Native 코어
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// 2️⃣ 외부 라이브러리 (External libraries)
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@supabase/supabase-js';

// 3️⃣ 내부 모듈 (Internal modules)
import { useSharedPortfolio } from '@/hooks/useSharedPortfolio';
import { formatCurrency } from '@/utils/formatters';
import { ContextCard } from '@/components/home/ContextCard';

// 4️⃣ 타입 (Types)
import type { Asset, Portfolio } from '@/types/asset';
```

---

## 📁 컴포넌트 분리 원칙 / Component Separation (CRITICAL)

> **핵심 원칙 / Core Principle**: 탭 파일에 직접 UI 작성 금지!
> **Never write UI directly in tab files!**

### 🚨 왜 중요한가? / Why Is This Critical?

이 프로젝트는 **여러 Claude Code 인스턴스가 동시에 작업**합니다.
This project has **multiple Claude Code instances working in parallel**.

- 같은 파일을 두 Claude가 동시에 수정하면 → 충돌 발생 (Conflict occurs)
- 탭 파일은 "라우팅 전용" → UI는 별도 컴포넌트로 분리 (Tabs are for routing only)

### ✅ 올바른 구조 / Correct Structure

```
app/(tabs)/
  ├── index.tsx          ← "오늘" 탭 (라우팅만 / Routing only)
  ├── diagnosis.tsx      ← "진단" 탭 (라우팅만 / Routing only)
  ├── rebalance.tsx      ← "처방전" 탭 (라우팅만 / Routing only)

src/components/
  ├── home/              ← index.tsx 전용 컴포넌트
  │   ├── ContextCard.tsx
  │   ├── PredictionVote.tsx
  │   └── DailyReview.tsx
  ├── diagnosis/         ← diagnosis.tsx 전용 컴포넌트
  │   ├── HealthScore.tsx
  │   └── AIAnalysis.tsx
  ├── rebalance/         ← rebalance.tsx 전용 컴포넌트
  │   ├── StockSection.tsx
  │   └── BitcoinSection.tsx
```

### 예시: 탭 파일 작성법 / Example: Tab File Structure

```typescript
// ❌ 나쁜 예 / BAD: app/(tabs)/index.tsx
export default function HomeTab() {
  return (
    <ScrollView>
      {/* 500줄의 UI 코드 직접 작성 → 다른 Claude와 충돌! */}
      <View className="bg-gray-900 p-4">
        <Text>맥락 카드</Text>
        {/* 100줄 더... */}
      </View>
      <View className="mt-4">
        <Text>예측 투표</Text>
        {/* 200줄 더... */}
      </View>
    </ScrollView>
  );
}

// ✅ 좋은 예 / GOOD: app/(tabs)/index.tsx
import { ContextCard } from '@/components/home/ContextCard';
import { PredictionVote } from '@/components/home/PredictionVote';
import { DailyReview } from '@/components/home/DailyReview';

export default function HomeTab() {
  return (
    <ScrollView>
      <ContextCard />
      <PredictionVote />
      <DailyReview />
    </ScrollView>
  );
}

// ✅ 좋은 예 / GOOD: src/components/home/ContextCard.tsx
export const ContextCard: React.FC = () => {
  // 여기에 500줄의 UI 로직 작성
  return (
    <View className="bg-gray-900 p-4">
      <Text>맥락 카드 상세 UI</Text>
    </View>
  );
};
```

### 병렬 작업 시나리오 / Parallel Work Scenario

```
상황: 홈 탭에 2개 섹션 동시 개발
Scenario: Developing 2 sections on Home tab simultaneously

Claude A → src/components/home/ContextCard.tsx 작업
         Working on ContextCard component

Claude B → src/components/home/PredictionVote.tsx 작업
         Working on PredictionVote component

결과 → 충돌 없음! 각자 독립적인 파일 작업
Result → No conflicts! Independent file work
```

---

## ⚠️ 병렬 작업 규칙 / Parallel Work Rules (CRITICAL)

> **이 프로젝트는 여러 Claude Code 인스턴스가 동시에 작업합니다.**
> **Multiple Claude Code instances work on this project simultaneously.**

### 🔴 핵심 원칙: 1파일 = 1Claude

**같은 파일을 두 Claude가 동시에 수정하면 → 나중에 저장한 쪽이 먼저 한 작업을 덮어씁니다!**
**If two Claudes modify the same file → The last save overwrites previous work!**

**규칙 / Rules:**
- ✅ 자신이 담당한 파일만 수정 (Only modify files you own)
- ✅ 다른 파일은 읽기만 가능 (Other files: read-only)
- ✅ 새 파일 생성은 자유 (Free to create new files)
- ❌ 기존 파일 수정은 담당자만 (Existing files: assigned owner only)

### 📋 파일 소유권 테이블 / File Ownership Table

#### 탭 화면 / Tab Screens (각 탭 = 1명 전담 / 1 person per tab)

| 역할 / Role | 전담 파일 / Owned File | 절대 수정 금지 / Never Touch |
|------|----------|---------------|
| 홈 탭 담당 / Home Tab | `app/(tabs)/index.tsx` | diagnosis, rebalance, profile |
| 진단 탭 담당 / Diagnosis Tab | `app/(tabs)/diagnosis.tsx` | index, rebalance, profile |
| 처방전 탭 담당 / Rebalance Tab | `app/(tabs)/rebalance.tsx` | index, diagnosis, profile |
| 프로필 담당 / Profile Tab | `app/(tabs)/profile.tsx` | index, diagnosis, rebalance |
| 레이아웃 담당 / Layout | `app/(tabs)/_layout.tsx` | 모든 탭 파일 / All tab files |

#### 🚨 공유 금지 파일 / Shared Files (한 명만 수정 가능 / One person only)

| 파일 / File | 위험도 / Risk | 이유 / Reason |
|------|--------|------|
| `src/types/asset.ts` | **최고 / CRITICAL** | 거의 모든 파일이 import / Used everywhere |
| `src/hooks/useSharedPortfolio.ts` | **최고 / CRITICAL** | 4개+ 탭이 공유 / Shared by 4+ tabs |
| `src/hooks/useSharedAnalysis.ts` | **최고 / CRITICAL** | 4개+ 탭이 공유 / Shared by 4+ tabs |
| `src/services/centralKitchen.ts` | **높음 / HIGH** | Edge Function 연동 / Edge Function integration |
| `src/services/gemini.ts` | **높음 / HIGH** | AI 분석 타입 공유 / Shared AI types |
| `package.json` | **높음 / HIGH** | 동시 install 시 충돌 / Conflicts on install |
| `app/(tabs)/_layout.tsx` | **높음 / HIGH** | 탭 구조 전체 영향 / Affects all tabs |

#### ✅ 자유 수정 가능 / Free to Modify

| 종류 / Type | 규칙 / Rule |
|------|------|
| `src/components/XXX.tsx` | 각자 담당 컴포넌트만 / Your component only |
| `src/hooks/useXXX.ts` | 공유 훅 외에는 자유 / Free except shared hooks |
| `src/services/XXX.ts` | 공유 서비스 외에는 자유 / Free except shared services |
| `app/settings/XXX.tsx` | 각 화면 독립적 / Independent screens |
| `supabase/migrations/XXX.sql` | 새 파일만 / New files only |

### 🔧 패키지 설치 규칙 / Package Installation Rules

```bash
# ❌ 나쁜 예 / BAD: 여러 Claude가 동시에 실행
Claude A: npm install react-native-chart-kit
Claude B: npm install axios  # ← package.json 충돌!

# ✅ 좋은 예 / GOOD: 한 Claude만 실행
1. 사용자에게 확인 요청 / Ask user first
   "패키지 설치가 필요합니다. 다른 Claude가 설치 중인지 확인해주세요."
   "Package installation needed. Please check if another Claude is installing."

2. 확인 후 설치 / Install after confirmation
   npx expo install react-native-chart-kit
```

### 🌿 커밋 규칙 / Commit Rules

```bash
# ❌ 절대 금지 / NEVER DO THIS
git add .          # 다른 Claude의 작업까지 커밋됨!
git add -A         # All files including others' work!

# ✅ 올바른 방법 / CORRECT WAY
git add src/components/home/ContextCard.tsx
git add app/(tabs)/index.tsx
git commit -m "feat: Add ContextCard component to Home tab"

# 자신이 수정한 파일만 staging
# Stage only files you modified
```

### 🔄 공유 타입 수정 시 / Modifying Shared Types

```typescript
// ❌ 나쁜 예 / BAD: 기존 필드 삭제/변경
interface Asset {
  id: string;
  // name: string;  ← 삭제하면 다른 Claude 코드 깨짐!
  ticker: string;    // ← 이름 변경도 금지!
}

// ✅ 좋은 예 / GOOD: 새 필드는 optional로 추가
interface Asset {
  id: string;
  name: string;
  ticker?: string;  // ← optional(?) 추가만 가능
  newField?: number; // ← 새 필드도 optional
}

// 또는 사용자에게 확인 요청
// Or ask user first
"이 타입은 여러 곳에서 쓰이고 있어서,
다른 작업이 끝난 후 수정하는 게 안전합니다."

"This type is used in multiple places.
It's safer to modify after other work is complete."
```

---

## 🧪 테스트 가이드 / Testing Guide

### Jest 설정 확인 / Jest Configuration

프로젝트는 `jest-expo` 프리셋을 사용합니다.
Project uses `jest-expo` preset.

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(test|spec).ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
```

### 테스트 파일 구조 / Test File Structure

```
src/
  components/
    home/
      ContextCard.tsx
      __tests__/
        ContextCard.test.tsx  ← 테스트 파일
  hooks/
    useSharedPortfolio.ts
    __tests__/
      useSharedPortfolio.test.ts
```

### 테스트 작성 예시 / Test Examples

#### 1️⃣ 컴포넌트 테스트 / Component Test

```typescript
// src/components/home/__tests__/ContextCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ContextCard } from '../ContextCard';

describe('ContextCard', () => {
  it('should render context card with title', () => {
    render(<ContextCard title="오늘의 맥락" />);

    expect(screen.getByText('오늘의 맥락')).toBeTruthy();
  });

  it('should call onPress when card is tapped', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ContextCard testID="context-card" onPress={mockOnPress} />
    );

    fireEvent.press(getByTestId('context-card'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

#### 2️⃣ 훅 테스트 / Hook Test

```typescript
// src/hooks/__tests__/useSharedPortfolio.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSharedPortfolio } from '../useSharedPortfolio';

describe('useSharedPortfolio', () => {
  it('should fetch portfolio data', async () => {
    const { result } = renderHook(() => useSharedPortfolio('user-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.assets).toBeInstanceOf(Array);
  });
});
```

### 테스트 실행 / Running Tests

```bash
# 모든 테스트 실행 / Run all tests
npm test

# Watch 모드 / Watch mode
npm test -- --watch

# 커버리지 확인 / Check coverage
npm test -- --coverage

# 특정 파일만 / Specific file
npm test -- ContextCard.test.tsx
```

### 테스트 커버리지 목표 / Coverage Goals

- **전체 커버리지 / Overall**: 80% 이상 / 80%+
- **핵심 훅 / Core hooks**: 90% 이상 / 90%+
- **서비스 레이어 / Services**: 85% 이상 / 85%+
- **UI 컴포넌트 / Components**: 75% 이상 / 75%+

---

## 🌿 Git 워크플로우 / Git Workflow

### 브랜치 전략 / Branch Strategy

```
main                    ← 프로덕션 브랜치 / Production branch
  ├── feature/context-card       ← 새 기능 / New feature
  ├── feature/prediction-vote
  ├── fix/profile-crash          ← 버그 수정 / Bug fix
  └── refactor/shared-hooks      ← 리팩터링 / Refactoring
```

**브랜치 네이밍 / Branch Naming:**
```
feature/<기능명>    - 새 기능 추가 / New feature
fix/<버그명>       - 버그 수정 / Bug fix
refactor/<대상>    - 리팩터링 / Refactoring
docs/<문서명>      - 문서 작업 / Documentation
test/<테스트대상>  - 테스트 추가 / Adding tests
```

**예시 / Examples:**
```bash
git checkout -b feature/context-card-ui
git checkout -b fix/portfolio-sync-error
git checkout -b refactor/type-definitions
git checkout -b docs/contributing-guide
```

### 커밋 메시지 컨벤션 / Commit Message Convention

```
<타입>: <제목>

<본문 (선택사항)>

<꼬리말 (선택사항)>
```

**타입 / Types:**
- `feat`: 새 기능 추가 / New feature
- `fix`: 버그 수정 / Bug fix
- `docs`: 문서 변경 / Documentation
- `refactor`: 리팩터링 / Code refactoring
- `test`: 테스트 추가/수정 / Test changes
- `style`: 코드 포맷팅 (기능 변경 없음) / Code formatting
- `chore`: 빌드/설정 변경 / Build/config changes

**예시 / Examples:**

```bash
# 좋은 예 / Good
git commit -m "feat: Add ContextCard component with 4-layer structure"
git commit -m "fix: Resolve portfolio sync error on app startup"
git commit -m "docs: Update CONTRIBUTING.md with parallel work rules"
git commit -m "refactor: Extract shared types to asset.ts"
git commit -m "test: Add unit tests for useSharedPortfolio hook"

# 나쁜 예 / Bad
git commit -m "update"              # 너무 모호 / Too vague
git commit -m "fixed bug"           # 어떤 버그? / Which bug?
git commit -m "feat: wip"           # 미완성 커밋 금지 / No WIP commits
```

**자세한 커밋 메시지 / Detailed Commit Message:**

```bash
git commit -m "feat: Add ContextCard component with 4-layer structure

- Implemented historical context layer
- Added macro-economic chain visualization
- Integrated institutional behavior data
- Connected portfolio impact calculation

Resolves #123"
```

### 🚨 금지 사항 / Prohibited Actions

```bash
# ❌ 절대 금지 / NEVER DO THIS
git add .                    # 다른 Claude 작업 포함 / Includes others' work
git add -A                   # 모든 파일 추가 / Adds all files
git commit -am "update"      # 자동 staging + 모호한 메시지
git push --force main        # 강제 푸시 금지 / No force push to main
```

---

## 🔄 PR 프로세스 / Pull Request Process

### PR 생성 전 체크리스트 / Pre-PR Checklist

```bash
# 1️⃣ TypeScript 컴파일 확인 / Check TypeScript compilation
npx tsc --noEmit
# ✅ Found 0 errors 확인

# 2️⃣ ESLint 검사 / Run ESLint
npm run lint
# ✅ 에러 0개 확인 / Confirm 0 errors

# 3️⃣ 테스트 실행 / Run tests
npm test
# ✅ All tests passed 확인

# 4️⃣ 로컬 빌드 확인 (선택) / Local build check (optional)
npm run ios   # iOS
npm run android  # Android
```

### PR 템플릿 / PR Template

```markdown
## 📝 변경 사항 / Changes

### 🎯 목적 / Purpose
<!-- 이 PR의 목적을 간단히 설명 / Briefly describe the purpose -->
- 맥락 카드 컴포넌트 추가
- Add ContextCard component

### 🔨 변경 내용 / What Changed
<!-- 주요 변경 사항 나열 / List main changes -->
- [ ] `src/components/home/ContextCard.tsx` 신규 생성
- [ ] 4겹 레이어 구조 구현 (역사/거시경제/기관/포트폴리오)
- [ ] `app/(tabs)/index.tsx`에 통합

### 📸 스크린샷 / Screenshots
<!-- UI 변경 시 필수 / Required for UI changes -->
| Before | After |
|--------|-------|
| ![before](url) | ![after](url) |

### 🧪 테스트 / Testing
- [ ] 단위 테스트 추가 (`ContextCard.test.tsx`)
- [ ] 테스트 커버리지 80% 이상 유지
- [ ] iOS/Android 실기기 테스트 완료

### 📋 체크리스트 / Checklist
- [ ] TypeScript 컴파일 성공 (`tsc --noEmit`)
- [ ] ESLint 통과 (`npm run lint`)
- [ ] 테스트 통과 (`npm test`)
- [ ] 병렬 작업 규칙 준수 (자신의 파일만 수정)
- [ ] 커밋 메시지 컨벤션 준수

### 🔗 관련 이슈 / Related Issues
Closes #123
Related to #456
```

### PR 리뷰 가이드 / PR Review Guidelines

**리뷰어가 확인할 사항 / Reviewer Checklist:**

#### ✅ 코드 품질 / Code Quality
- [ ] 타입 안전성 (TypeScript strict mode 준수)
- [ ] 네이밍 컨벤션 준수 (PascalCase/kebab-case)
- [ ] import 순서 정리
- [ ] 불필요한 주석 제거
- [ ] console.log 제거 (디버깅용 제외)

#### ✅ 성능 / Performance
- [ ] 불필요한 re-render 방지 (useMemo/useCallback)
- [ ] 큰 데이터셋 가상화 (FlatList 사용)
- [ ] 이미지 최적화 (webp/압축)
- [ ] API 호출 캐싱 (TanStack Query)

#### ✅ 보안 / Security
- [ ] 민감한 데이터 하드코딩 금지
- [ ] API 키 환경 변수 사용
- [ ] 사용자 입력 검증
- [ ] SQL Injection 방지 (Supabase 쿼리 파라미터 사용)

#### ✅ 접근성 / Accessibility
- [ ] 스크린 리더 지원 (accessibilityLabel)
- [ ] 터치 영역 충분 (최소 44x44pt)
- [ ] 색상 대비 4.5:1 이상

### 리뷰 코멘트 예시 / Review Comment Examples

```markdown
# ✅ 승인 / Approved
LGTM! (Looks Good To Me)
ContextCard 컴포넌트 구현이 깔끔합니다.
테스트 커버리지도 90%로 우수합니다.

# 🔄 변경 요청 / Request Changes
**성능 이슈 / Performance Issue**
`map()` 대신 `FlatList`를 사용해주세요.
데이터가 100개 이상일 때 렌더링 성능 저하가 예상됩니다.

```typescript
// Before
{items.map(item => <Card key={item.id} />)}

// After
<FlatList
  data={items}
  renderItem={({ item }) => <Card item={item} />}
  keyExtractor={item => item.id}
/>
```

# 💬 제안 / Suggestion
**타입 안전성 개선 / Improve Type Safety**
`any` 타입 대신 명시적 interface를 사용하면 어떨까요?

```typescript
// Before
const data: any = fetchData();

// After
interface PortfolioData {
  assets: Asset[];
  totalValue: number;
}
const data: PortfolioData = fetchData();
```
```

---

## 🎓 추가 리소스 / Additional Resources

### 프로젝트 문서 / Project Documentation
- [CLAUDE.MD](/Users/nicenoodle/smart-rebalancer/CLAUDE.MD) - AI 어시스턴트 가이드
- [README.md](/Users/nicenoodle/smart-rebalancer/README.md) - 프로젝트 개요
- [ARCHITECTURE.md](/Users/nicenoodle/smart-rebalancer/ARCHITECTURE.md) - 아키텍처 설명

### 외부 문서 / External Documentation
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo SDK 54 Docs](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)

### 팀 협업 도구 / Team Collaboration Tools
- [Anthropic Team Agents Docs](https://docs.anthropic.com/en/docs/build-with-claude/agents) - Claude 팀 에이전트 베스트 프랙티스

---

## 📞 도움이 필요하신가요? / Need Help?

**문제 발생 시 / If You Encounter Issues:**

1. **CLAUDE.MD 확인** - 대부분의 가이드가 여기에 있습니다
2. **다른 Claude와 충돌 확인** - 같은 파일을 동시에 수정하지 않았는지 확인
3. **타입 에러** - `npx tsc --noEmit`로 전체 타입 체크
4. **빌드 에러** - 캐시 삭제 후 재시작
   ```bash
   npx expo start --clear
   rm -rf node_modules
   npm install
   ```

---

## ✨ 마무리 / Closing

**코드 품질 = 사용자 경험 / Code Quality = User Experience**

baln 프로젝트는 "바른 투자 습관"을 만들어가는 앱입니다.
우리의 코드도 "바른 개발 습관"으로 작성되어야 합니다.

The baln project helps users build "sound investment habits".
Our code should also be written with "sound development practices".

**Happy Coding!** 🚀

---

*Last Updated: 2026-02-11*
*Version: 1.0.0*
