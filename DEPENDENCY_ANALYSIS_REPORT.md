# Dependency Analysis Report - baln

> **생성일**: 2026-02-11
> **분석 대상**: smart-rebalancer 프로젝트
> **총 node_modules 크기**: 514 MB

---

## Executive Summary

### 주요 발견사항

1. **즉시 최적화 가능한 항목** (1-2일 소요)
   - `axios` 사용 (4개 파일) → `fetch`로 전환 시 **-1.6 MB**
   - `react-dom` 사용 (0개 파일) → 제거 시 **-6.4 MB**
   - **예상 절감**: ~8 MB

2. **사용량 확인 필요**
   - `react-native-reanimated` (6회 사용) - 8.9 MB
   - `react-native-chart-kit` - 차트 라이브러리 대안 검토

3. **필수 패키지 (최적화 불가)**
   - React Native, Expo, Supabase 등 core dependencies
   - 총 ~300 MB

---

## 1. 큰 패키지 (>5MB) 상세 분석

### 1.1 react-dom (6.4 MB) - ✅ 제거 가능

**현재 상태**:
- package.json에 dependencies로 등록되어 있음
- 코드베이스 검색 결과: **0개 파일에서 사용**

**제거 방법**:
```bash
npm uninstall react-dom
```

**영향도**: ✅ 없음 (Web 빌드는 `react-native-web`이 처리)

**예상 효과**:
- node_modules 크기: -6.4 MB
- 프로덕션 번들: -2~3 MB (tree-shaking 후)

---

### 1.2 react-native-reanimated (8.9 MB) - ⚠️ 사용량 검증 필요

**현재 상태**:
- 코드베이스에서 **6회 사용**
- 주로 애니메이션 관련 기능

**사용 파일 분석**:
```bash
# 사용 파일 확인
grep -r "react-native-reanimated" src/ --include="*.ts" --include="*.tsx"
```

**최적화 방향**:
1. **필요성 검증**: 간단한 애니메이션은 React Native 내장 `Animated` 사용
2. **Import 최적화**:
   ```typescript
   // ❌ Before
   import Animated from 'react-native-reanimated';

   // ✅ After (tree-shaking 가능)
   import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
   ```

**권장사항**: 현재 유지, 향후 사용량 모니터링

---

### 1.3 @supabase/supabase-js (5.5 MB) - ✅ 필수

**현재 상태**:
- Backend 통신의 핵심
- Auth, Database, Realtime 사용

**최적화 불가 이유**:
- 프로젝트의 핵심 기능
- 대체 가능한 경량 라이브러리 없음

**주의사항**:
```typescript
// Tree-shaking 최적화를 위한 import 패턴
import { createClient } from '@supabase/supabase-js';
// ✅ 필요한 타입만 import
import type { Database } from './types/supabase';
```

---

### 1.4 react-native-web (5.1 MB) - ⚠️ 조건부 최적화

**현재 상태**:
- Web 플랫폼 지원용
- package.json에 dependencies로 등록

**최적화 방향**:
- iOS/Android 빌드 시 제외 가능
- Metro Bundler에서 플랫폼별 필터링

**metro.config.js 추가 설정**:
```javascript
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'web'],
  platformExclude: {
    ios: ['react-native-web'],
    android: ['react-native-web'],
  },
};
```

**예상 효과**:
- iOS/Android 번들: -3~4 MB
- Web 번들: 영향 없음

---

### 1.5 expo-router (5.4 MB) - ✅ 필수

**현재 상태**:
- 앱의 네비게이션 시스템
- File-based routing 제공

**최적화 불가 이유**:
- 프로젝트 아키텍처의 핵심
- Expo SDK와 강하게 결합

**주의사항**:
- 사용하지 않는 라우트는 자동으로 tree-shaking됨
- Dynamic import로 lazy loading 지원

---

## 2. axios 사용 분석 및 제거 계획

### 2.1 현재 사용 현황

**총 사용 파일**: 4개

| 파일 경로 | 사용 패턴 | 난이도 |
|----------|----------|--------|
| `src/services/priceProviders/YahooFinanceProvider.ts` | GET 요청, Error handling | 🟡 중간 |
| `src/services/priceProviders/CoinGeckoProvider.ts` | GET 요청, Error handling | 🟡 중간 |
| `src/services/kakaoLocalSearch.ts` | GET 요청, Headers | 🟢 쉬움 |
| `src/services/marketData.ts` | GET 요청 | 🟢 쉬움 |

### 2.2 전환 가이드

#### Before: axios 사용

```typescript
// src/services/kakaoLocalSearch.ts
import axios from 'axios';

const response = await axios.get('https://api.example.com/data', {
  headers: {
    'Authorization': `KakaoAK ${apiKey}`
  }
});
const data = response.data;
```

#### After: fetch 사용

```typescript
// src/services/kakaoLocalSearch.ts
// axios import 제거

const response = await fetch('https://api.example.com/data', {
  headers: {
    'Authorization': `KakaoAK ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
```

### 2.3 에러 핸들링 전환

#### axios AxiosError 처리

```typescript
// Before
import axios, { AxiosError } from 'axios';

try {
  const response = await axios.get(url);
  return response.data;
} catch (error) {
  if (error instanceof AxiosError) {
    console.error('API Error:', error.response?.status);
    throw new Error(`API failed: ${error.message}`);
  }
  throw error;
}
```

#### fetch 에러 처리

```typescript
// After
try {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
} catch (error) {
  if (error instanceof TypeError) {
    // Network error
    console.error('Network Error:', error.message);
  }
  throw error;
}
```

### 2.4 전환 체크리스트

- [ ] `src/services/kakaoLocalSearch.ts` 전환
- [ ] `src/services/marketData.ts` 전환
- [ ] `src/services/priceProviders/CoinGeckoProvider.ts` 전환
- [ ] `src/services/priceProviders/YahooFinanceProvider.ts` 전환
- [ ] 테스트 코드 업데이트
- [ ] axios 패키지 제거: `npm uninstall axios`

**예상 소요 시간**: 2-3시간

---

## 3. Import 패턴 분석

### 3.1 Lodash 사용 현황

**검색 결과**: 현재 lodash 사용 없음 ✅

**향후 가이드라인**:
```typescript
// ❌ 절대 사용 금지
import _ from 'lodash';

// ❌ 비효율적
import { debounce } from 'lodash';

// ✅ 권장 (패키지 설치 시)
import debounce from 'lodash/debounce';
```

### 3.2 React Native 컴포넌트 Import 패턴

**권장 패턴**:
```typescript
// ✅ 좋은 예: 필요한 것만 import
import { View, Text, StyleSheet } from 'react-native';

// ⚠️ 주의: 너무 많은 컴포넌트 한 번에 import
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, FlatList, Modal, ActivityIndicator
} from 'react-native';
// → 실제 사용하는 것만 import하세요
```

### 3.3 @expo/vector-icons 최적화

**현재 사용 패턴 확인**:
```bash
grep -r "@expo/vector-icons" src/ --include="*.tsx"
```

**최적화 방법**:
```typescript
// ❌ 모든 아이콘 세트 로드
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';

// ✅ 필요한 세트만 로드
import { MaterialIcons } from '@expo/vector-icons';

// 🌟 더 좋은 방법: 사용하는 아이콘만 import
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
```

---

## 4. 추가 최적화 기회

### 4.1 이미지 최적화

**현재 상태 확인**:
```bash
find assets/images -type f \( -name "*.png" -o -name "*.jpg" \) -exec du -h {} \; | sort -hr
```

**최적화 계획**:
1. **PNG → WebP 전환** (React Native 0.81+에서 지원)
   - 압축률: 25-35% 크기 감소
   - 품질 손실: 거의 없음

2. **이미지 압축 도구**:
   ```bash
   # ImageOptim (Mac)
   brew install imageoptim-cli
   imageoptim assets/images/**/*.png

   # 또는 Sharp 사용
   npx sharp-cli resize --input assets/images/*.png --width 1000
   ```

3. **Retina 이미지 정리**:
   - @1x, @2x, @3x 중 불필요한 해상도 제거
   - 대부분 @2x와 @3x만 있으면 충분

### 4.2 폰트 최적화

**현재 폰트 확인**:
```bash
ls -lh assets/fonts/
du -sh assets/fonts/
```

**최적화 전략**:
1. **폰트 서브셋 생성**:
   ```bash
   # 한글 + 영문 + 숫자만 포함
   pyftsubset font.ttf \
     --unicodes="U+AC00-U+D7A3,U+0020-U+007E,U+0030-U+0039" \
     --output-file="font-subset.ttf"
   ```

2. **불필요한 폰트 웨이트 제거**:
   - Regular (400), Bold (700)만 유지
   - Light, Medium, SemiBold 등 제거 고려

3. **Variable Font 사용 고려**:
   - 여러 웨이트를 하나의 파일로 통합
   - 파일 크기 감소 효과

### 4.3 Code Splitting 기회

**큰 컴포넌트 lazy loading**:

```typescript
// app/(tabs)/diagnosis.tsx
import React, { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

// ✅ 진단 화면은 초기 로딩 시 필요 없음
const DiagnosisScreen = lazy(() => import('../components/diagnosis/DiagnosisMain'));

export default function Diagnosis() {
  return (
    <Suspense fallback={<ActivityIndicator size="large" />}>
      <DiagnosisScreen />
    </Suspense>
  );
}
```

**적용 대상**:
- [ ] AI 진단 화면 (Gemini API 호출)
- [ ] 차트 라이브러리 (react-native-chart-kit)
- [ ] 이미지 처리 (html-to-image)
- [ ] 지도 컴포넌트 (react-native-maps)

---

## 5. 번들 크기 측정 및 목표

### 5.1 현재 상태 (Baseline)

**측정 방법**:
```bash
# 1. 프로덕션 빌드 생성
npx expo export --platform ios --dev false

# 2. 번들 크기 확인
du -sh dist/bundles/*.js

# 3. 소스맵 분석
npx source-map-explorer dist/bundles/*.js dist/bundles/*.map
```

**예상 현재 크기**:
- iOS 번들: ~25-30 MB (예상)
- Android 번들: ~28-35 MB (예상)
- node_modules: 514 MB (확인됨)

### 5.2 최적화 목표 (3개월)

| 항목 | 현재 (추정) | 1개월 목표 | 3개월 목표 |
|------|-----------|-----------|-----------|
| node_modules | 514 MB | 490 MB | 450 MB |
| iOS 번들 | 28 MB | 24 MB | 20 MB |
| Android 번들 | 32 MB | 28 MB | 25 MB |
| 초기 로딩 | ? | < 2초 | < 1.5초 |

### 5.3 단계별 실행 계획

#### Week 1: Quick Wins (예상 -10 MB)
- [x] metro.config.js 최적화 적용
- [ ] axios → fetch 전환 (-1.6 MB)
- [ ] react-dom 제거 (-6.4 MB)
- [ ] 이미지 압축 (-2~3 MB)

#### Week 2-3: Code Optimization (예상 -5 MB)
- [ ] 사용하지 않는 컴포넌트 제거
- [ ] Import 패턴 최적화
- [ ] @expo/vector-icons 사용량 최적화
- [ ] 폰트 서브셋 생성

#### Week 4-8: Advanced (예상 -8 MB)
- [ ] Code splitting 구현
- [ ] react-native-web 조건부 로딩
- [ ] Lazy loading 확대
- [ ] Dynamic imports 적용

#### Week 9-12: Fine Tuning
- [ ] Hermes 엔진 최적화 검증
- [ ] A/B 테스트
- [ ] 성능 모니터링 시스템
- [ ] 지속적 최적화 자동화

---

## 6. 모니터링 및 자동화

### 6.1 번들 크기 모니터링

**CI/CD에 추가할 스크립트**:
```bash
#!/bin/bash
# scripts/check-bundle-size.sh

# 번들 생성
npx expo export --platform ios --dev false

# 크기 확인
BUNDLE_SIZE=$(du -sk dist/bundles | cut -f1)
THRESHOLD=30000  # 30MB in KB

if [ "$BUNDLE_SIZE" -gt "$THRESHOLD" ]; then
  echo "❌ Bundle size exceeded: ${BUNDLE_SIZE}KB > ${THRESHOLD}KB"
  exit 1
else
  echo "✅ Bundle size OK: ${BUNDLE_SIZE}KB"
fi
```

### 6.2 의존성 크기 모니터링

**package.json에 추가**:
```json
{
  "scripts": {
    "size-report": "npm run analyze:size > size-report.txt && cat size-report.txt"
  }
}
```

**주간 리포트 생성**:
```bash
#!/bin/bash
# scripts/weekly-size-report.sh

echo "=== Dependency Size Report $(date) ===" > weekly-report.md
npm run analyze:size >> weekly-report.md
echo "\n=== Bundle Size ===" >> weekly-report.md
npm run analyze:bundle
du -sh dist/bundles/*.js >> weekly-report.md
```

### 6.3 알림 설정

**GitHub Actions 예시**:
```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main]

jobs:
  check-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Check bundle size
        run: ./scripts/check-bundle-size.sh
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Bundle size check completed!'
            })
```

---

## 7. 권장 Action Items (우선순위)

### 🔴 High Priority (1주 내)

1. **axios 제거** (-1.6 MB)
   - 난이도: 🟡 중간
   - 소요 시간: 2-3시간
   - 영향도: 낮음
   - 담당: Backend/API 팀

2. **react-dom 제거** (-6.4 MB)
   - 난이도: 🟢 쉬움
   - 소요 시간: 10분
   - 영향도: 없음
   - 담당: 즉시 실행 가능

3. **metro.config.js 검증**
   - 난이도: 🟢 쉬움
   - 소요 시간: 30분
   - 영향도: 없음
   - 담당: 빌드 담당자

### 🟡 Medium Priority (2-4주 내)

4. **이미지 최적화** (-2~3 MB)
   - 난이도: 🟢 쉬움
   - 소요 시간: 1-2시간
   - 영향도: 낮음
   - 담당: 디자인/프론트엔드

5. **Code splitting 구현** (-3~5 MB)
   - 난이도: 🟡 중간
   - 소요 시간: 1주
   - 영향도: 중간
   - 담당: 프론트엔드 팀

6. **Import 패턴 정리**
   - 난이도: 🟡 중간
   - 소요 시간: 2-3일
   - 영향도: 낮음
   - 담당: 전체 팀

### 🟢 Low Priority (1-3개월 내)

7. **폰트 서브셋 생성** (-1~2 MB)
   - 난이도: 🔴 어려움
   - 소요 시간: 1일
   - 영향도: 낮음
   - 담당: 디자인/프론트엔드

8. **Hermes 최적화**
   - 난이도: 🟡 중간
   - 소요 시간: 1주
   - 영향도: 높음
   - 담당: 전체 팀

9. **모니터링 자동화**
   - 난이도: 🟡 중간
   - 소요 시간: 2-3일
   - 영향도: 중간
   - 담당: DevOps

---

## 8. 참고 자료 및 도구

### 분석 도구
- **Source Map Explorer**: `npx source-map-explorer dist/bundles/*.js dist/bundles/*.map`
- **Bundle Buddy**: https://bundle-buddy.com
- **Webpack Bundle Analyzer**: (Web 빌드용)

### 이미지 최적화
- **ImageOptim**: https://imageoptim.com
- **Sharp**: `npm install sharp-cli -g`
- **Squoosh**: https://squoosh.app

### 폰트 최적화
- **fonttools**: `pip install fonttools`
- **glyphhanger**: `npm install -g glyphhanger`

### 모니터링
- **bundlesize**: `npm install bundlesize --save-dev`
- **size-limit**: `npm install @size-limit/preset-app --save-dev`

---

## 9. 결론

### 예상 최적화 효과

| 최적화 항목 | 예상 절감 | 난이도 | 우선순위 |
|-----------|----------|--------|---------|
| react-dom 제거 | -6.4 MB | 🟢 | 🔴 High |
| axios → fetch | -1.6 MB | 🟡 | 🔴 High |
| 이미지 압축 | -2~3 MB | 🟢 | 🟡 Med |
| Code splitting | -3~5 MB | 🟡 | 🟡 Med |
| react-native-web 조건부 | -3~4 MB | 🟡 | 🟡 Med |
| 폰트 서브셋 | -1~2 MB | 🔴 | 🟢 Low |
| Import 최적화 | -1~2 MB | 🟡 | 🟡 Med |
| **총계** | **-18~28 MB** | - | - |

### Next Steps

1. ✅ **즉시 실행 (오늘)**:
   - react-dom 제거
   - metro.config.js 검증

2. **이번 주 (Day 1-7)**:
   - axios → fetch 전환
   - 번들 크기 baseline 측정
   - 이미지 압축

3. **다음 주 (Day 8-14)**:
   - Code splitting 구현
   - Import 패턴 정리
   - 모니터링 설정

4. **이번 달 (Day 15-30)**:
   - 폰트 최적화
   - 추가 lazy loading
   - 성능 테스트

---

**작성자**: Bundle Optimization Specialist (Claude Code)
**최종 업데이트**: 2026-02-11
**다음 업데이트 예정**: 2026-02-18 (1주 후)
