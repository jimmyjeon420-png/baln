# Bundle Optimization Guide for baln

> **목표**: 앱 번들 크기를 줄이고 로딩 속도를 개선하여 사용자 경험 향상

---

## 1. 번들 분석 실행 방법

### 1-1. 패키지 크기 분석

현재 설치된 패키지들의 크기를 확인합니다:

```bash
npm run analyze:size
```

**예상 출력**:
```
84M   react-native
21M   expo
21M   @react-native
19M   @expo
...
```

### 1-2. Expo 번들 분석 (Source Map 생성)

프로덕션 번들의 소스맵을 생성하여 어떤 코드가 번들에 포함되는지 분석합니다:

```bash
npm run analyze:bundle
```

이 명령어는 다음을 생성합니다:
- `dist/` 폴더에 번들 파일
- `*.map` 소스맵 파일들

**생성된 소스맵 분석**:
```bash
# 번들 크기 확인
ls -lh dist/bundles/*.js

# 특정 라이브러리가 얼마나 포함되었는지 확인
grep -o "node_modules/[^/]*" dist/bundles/*.map | sort | uniq -c | sort -nr | head -20
```

### 1-3. Metro Bundler 시각화 도구 (개발 중)

Metro Bundler는 Expo의 기본 번들러입니다. 실시간 번들링 과정을 확인하려면:

```bash
# 개발 서버 시작 (verbose 모드)
EXPO_DEBUG=true npx expo start --clear
```

**터미널에서 확인할 수 있는 정보**:
- 번들링 시간
- 변환된 모듈 수
- 캐시 히트율

---

## 2. 현재 의존성 분석 보고서

### 2-1. 주요 패키지 크기 (2026-02-11 기준)

| 패키지 | 크기 | 카테고리 | 최적화 가능성 |
|--------|------|----------|--------------|
| `react-native` | 84 MB | Core | ❌ 필수 |
| `expo` | 21 MB | Core | ❌ 필수 |
| `@react-native/*` | 21 MB | Core | ⚠️ 사용하는 모듈만 import |
| `@expo/*` | 19 MB | Core | ⚠️ 사용하는 모듈만 import |
| `react-devtools-core` | 16 MB | Dev | ✅ devDependencies로 이동 가능 |
| `@babel/*` | 15 MB | Dev | ❌ 필수 |
| `@typescript-eslint/*` | 9.6 MB | Dev | ✅ 이미 devDependencies |
| `react-native-reanimated` | 8.9 MB | Animation | ⚠️ 사용량 확인 필요 |
| `react-native-svg` | 8.0 MB | UI | ✅ 필수 (차트, 아이콘) |
| `@testing-library/*` | 7.2 MB | Dev | ✅ 이미 devDependencies |
| `react-native-gesture-handler` | 6.6 MB | UI | ✅ 필수 (상호작용) |
| `react-dom` | 6.4 MB | Web | ⚠️ Web 버전만 필요 |
| `react-native-screens` | 5.6 MB | Navigation | ✅ 필수 |
| `@supabase/supabase-js` | 5.5 MB | Backend | ✅ 필수 |
| `expo-router` | 5.4 MB | Navigation | ✅ 필수 |
| `react-native-web` | 5.1 MB | Web | ⚠️ Web 버전만 필요 |
| `@react-navigation/*` | 5.0 MB | Navigation | ✅ 필수 |
| `expo-updates` | 4.8 MB | Core | ✅ 필수 |
| `@tanstack/*` | 4.8 MB | Data | ✅ 필수 (React Query) |
| `expo-modules-core` | 4.1 MB | Core | ✅ 필수 |

**총 node_modules 크기**: 514 MB

### 2-2. 큰 패키지 (>5MB) 세부 분석

#### 🔴 `react-dom` (6.4 MB) - 최적화 대상 1순위

**문제점**:
- 모바일 앱에서는 거의 사용하지 않음
- `react-native-web`과 중복 기능

**해결책**:
```json
// package.json에서 확인
// Web 버전 빌드 시에만 필요한지 검증
```

**액션**:
1. 코드베이스에서 `react-dom` 직접 import 검색:
   ```bash
   grep -r "from 'react-dom'" src/
   grep -r "require('react-dom')" src/
   ```
2. 사용하지 않으면 제거 고려

#### ⚠️ `react-native-reanimated` (8.9 MB) - 사용량 확인 필요

**현재 사용 예상 위치**:
- 애니메이션
- 제스처 기반 상호작용
- Expo Router 전환 애니메이션

**최적화 방법**:
```typescript
// ❌ 나쁜 예: 전체 import
import Animated from 'react-native-reanimated';

// ✅ 좋은 예: 필요한 것만 import
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
```

**액션**:
1. 사용 빈도 확인:
   ```bash
   grep -r "react-native-reanimated" src/ --include="*.tsx" --include="*.ts" | wc -l
   ```
2. 간단한 애니메이션은 `Animated` (React Native 내장) 사용 고려

#### 🟡 `@supabase/supabase-js` (5.5 MB)

**현재 사용**: 필수 (Backend)

**최적화 불가 이유**:
- Core backend 통신
- Authentication
- Realtime subscriptions

**주의사항**:
- Tree-shaking 최대화를 위해 필요한 기능만 import

### 2-3. 대체 가능한 경량 라이브러리 제안

| 현재 패키지 | 크기 | 경량 대안 | 대안 크기 | 권장 여부 |
|------------|------|-----------|----------|----------|
| `axios` (1.6 MB) | 1.6 MB | `fetch` (내장) | 0 MB | ✅ 권장 |
| `react-native-chart-kit` | ? MB | `victory-native` | ? MB | ⚠️ 현재 검증 필요 |
| `html-to-image` | 1.1 MB | `react-native-view-shot` | 이미 사용 중 | ✅ 이미 최적화됨 |

#### 🎯 즉시 적용 가능: `axios` → `fetch` 전환

**현재 axios 사용 위치 확인**:
```bash
grep -r "from 'axios'" src/
grep -r "import axios" src/
```

**대체 코드 예시**:
```typescript
// ❌ Before (axios)
import axios from 'axios';

const response = await axios.get('https://api.example.com/data', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = response.data;

// ✅ After (fetch)
const response = await fetch('https://api.example.com/data', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

**장점**:
- 번들 크기 -1.6 MB
- 네이티브 API 사용 (별도 패키지 불필요)
- React Native에서 완전히 지원됨

**단점**:
- Interceptor 기능 없음 (직접 구현 필요)
- Progress 이벤트 제한적

---

## 3. 코드 레벨 최적화 기회

### 3-1. Import 최적화

#### 문제: Barrel Import (통 가져오기)

```typescript
// ❌ 나쁜 예: lodash 전체 가져오기
import _ from 'lodash';
_.debounce(fn, 100);

// ✅ 좋은 예: 필요한 함수만 가져오기
import debounce from 'lodash/debounce';
debounce(fn, 100);
```

**검사 명령어**:
```bash
# lodash 사용 패턴 확인
grep -r "from 'lodash'" src/

# 개선 기회가 있는 import 찾기
grep -r "import \* as" src/
```

#### React Native 컴포넌트 최적화

```typescript
// ❌ 나쁜 예
import { View, Text, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
// → 사용하지 않는 컴포넌트도 번들에 포함 가능성

// ✅ 좋은 예: 실제 사용하는 것만 import
import { View, Text } from 'react-native';
```

### 3-2. 동적 Import (Code Splitting)

Expo Router는 자동 code splitting을 지원하지만, 추가 최적화 가능:

```typescript
// ❌ 나쁜 예: 모든 아이콘을 한 번에 로드
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';

// ✅ 좋은 예: 필요할 때 동적으로 로드
import React, { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./components/HeavyComponent'));

function MyScreen() {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**적용 대상**:
- AI 분석 화면 (진단 화면)
- 차트 라이브러리
- 이미지 처리 라이브러리

### 3-3. 조건부 Import

플랫폼별로 다른 코드 로딩:

```typescript
// Platform-specific imports
import { Platform } from 'react-native';

const DatePicker = Platform.select({
  ios: () => require('./DatePicker.ios').default,
  android: () => require('./DatePicker.android').default,
})();
```

### 3-4. 사용하지 않는 코드 제거

**체크리스트**:
```bash
# 1. 사용하지 않는 컴포넌트 찾기
find src/components -name "*.tsx" -type f | while read file; do
  filename=$(basename "$file" .tsx)
  count=$(grep -r "from.*$filename" src/ --include="*.tsx" --include="*.ts" | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "Unused: $file"
  fi
done

# 2. 사용하지 않는 유틸리티 함수 찾기
find src/utils -name "*.ts" -type f | while read file; do
  filename=$(basename "$file" .ts)
  count=$(grep -r "from.*$filename" src/ --include="*.tsx" --include="*.ts" | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "Unused: $file"
  fi
done
```

---

## 4. Metro 설정 최적화 (이미 적용됨)

`/Users/nicenoodle/smart-rebalancer/metro.config.js` 파일에 다음 최적화가 적용되었습니다:

### 4-1. Minifier 설정

```javascript
config.transformer.minifierConfig = {
  compress: {
    drop_console: true,        // console.log 제거
    drop_debugger: true,        // debugger 문 제거
    pure_funcs: ['console.log', 'console.debug', 'console.info'],
  },
  mangle: {
    toplevel: false,           // 변수명 난독화
  },
  output: {
    beautify: false,           // 코드 압축
    comments: false,           // 주석 제거
  },
};
```

### 4-2. 모듈 필터링

```javascript
config.serializer = {
  processModuleFilter: (module) => {
    // 테스트 파일 제외
    if (module.path.includes('__tests__') ||
        module.path.includes('__mocks__') ||
        module.path.includes('.test.') ||
        module.path.includes('.spec.')) {
      return false;
    }
    return true;
  },
};
```

---

## 5. Babel 설정 최적화

### 5-1. 프로덕션 빌드에서 console 제거

`babel.config.js`에 이미 추가된 설정:

```javascript
// 프로덕션에서 console.log 자동 제거
const plugins = [
  // ... 다른 플러그인들
];

if (process.env.NODE_ENV === 'production') {
  plugins.push('transform-remove-console');
}
```

**설치된 패키지**: `babel-plugin-transform-remove-console` (이미 devDependencies에 추가됨)

---

## 6. 이미지 및 정적 자산 최적화

### 6-1. 이미지 압축

**권장 도구**:
```bash
# ImageOptim (Mac)
brew install imageoptim-cli

# 사용법
imageoptim assets/images/**/*.png
```

**압축 체크리스트**:
- [ ] PNG → WebP 변환 고려 (React Native 0.81+에서 지원)
- [ ] 불필요한 고해상도 이미지 다운스케일
- [ ] SVG 사용 확대 (react-native-svg)

### 6-2. 폰트 최적화

**현재 사용 폰트 확인**:
```bash
ls -lh assets/fonts/
```

**최적화 방법**:
- Subset 폰트 생성 (한글 + 영문 + 숫자만 포함)
- 사용하지 않는 폰트 웨이트 제거

**도구**:
```bash
# pyftsubset (fonttools)
pip install fonttools

# 한글 서브셋 생성
pyftsubset font.ttf \
  --unicodes="U+AC00-U+D7A3,U+0020-U+007E" \
  --output-file="font-subset.ttf"
```

---

## 7. 실행 체크리스트

### Phase 1: 분석 (1일)

- [x] `npm run analyze:size` 실행
- [x] `npm run analyze:bundle` 실행
- [ ] 큰 패키지 (>5MB) 사용량 검증
- [ ] 사용하지 않는 import 검색
- [ ] 사용하지 않는 컴포넌트/함수 검색

### Phase 2: Quick Wins (1주)

- [ ] axios → fetch 전환
- [ ] lodash barrel import 제거
- [ ] 사용하지 않는 @expo/* 패키지 제거
- [ ] react-dom 사용 여부 확인 및 제거 고려
- [ ] 이미지 압축 (PNG → WebP)
- [ ] 사용하지 않는 폰트 웨이트 제거

### Phase 3: Code Splitting (2주)

- [ ] 진단 화면 lazy loading
- [ ] 차트 라이브러리 lazy loading
- [ ] AI 분석 기능 lazy loading
- [ ] 플랫폼별 컴포넌트 분리

### Phase 4: 고급 최적화 (1개월)

- [ ] React Native 0.82+ 업그레이드 (Hermes 최적화)
- [ ] Hermes 엔진 활성화 검증
- [ ] 동적 Feature Flag 시스템
- [ ] A/B 테스트를 통한 번들 크기 vs 기능 트레이드오프 분석

---

## 8. 모니터링 및 목표

### 현재 상태 (2026-02-11)

- **node_modules 크기**: 514 MB
- **프로덕션 번들 크기**: (측정 필요)
- **iOS .ipa 크기**: (측정 필요)
- **Android .aab 크기**: (측정 필요)

### 목표 (3개월 내)

| 항목 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| node_modules | 514 MB | 450 MB | -12% |
| iOS 번들 | TBD | < 20 MB | TBD |
| Android 번들 | TBD | < 25 MB | TBD |
| 초기 로딩 시간 | TBD | < 2초 | TBD |

### 측정 명령어

```bash
# iOS 빌드 크기 확인
npx eas build --platform ios --profile production --local
ls -lh build-*.ipa

# Android 빌드 크기 확인
npx eas build --platform android --profile production --local
ls -lh build-*.aab

# 번들 크기 확인
npm run analyze:bundle
du -sh dist/bundles/*.js
```

---

## 9. 참고 자료

### 공식 문서
- [Expo Optimization](https://docs.expo.dev/guides/optimizing-updates/)
- [Metro Bundler](https://facebook.github.io/metro/)
- [React Native Performance](https://reactnative.dev/docs/performance)

### 유용한 도구
- [Bundle Buddy](https://github.com/samccone/bundle-buddy) - 번들 분석 시각화
- [Source Map Explorer](https://github.com/danvk/source-map-explorer) - 소스맵 분석
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) - 웹 번들 분석

### 커뮤니티 가이드
- [React Native Bundle Size Optimization Guide](https://reactnative.dev/docs/optimizing-javascript-loading)
- [Expo Performance Best Practices](https://docs.expo.dev/guides/performance/)

---

## 10. 문의 및 지원

**작성일**: 2026-02-11
**작성자**: Bundle Optimization Specialist (Claude Code)
**프로젝트**: baln (발른)
**버전**: 1.0.0

**문의 사항**:
- 추가 최적화 제안이 필요한 경우
- 특정 패키지 분석이 필요한 경우
- 성능 문제 해결이 필요한 경우

→ 이 문서를 계속 업데이트하며 최적화를 진행하세요.
