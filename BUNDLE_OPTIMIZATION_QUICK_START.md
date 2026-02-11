# Bundle Optimization Quick Start Guide

> **목표**: 30분 안에 즉시 적용 가능한 최적화 실행
> **예상 효과**: -8 MB node_modules, -4~6 MB 프로덕션 번들

---

## Step 1: react-dom 제거 (5분)

### 1-1. 사용 여부 확인

```bash
cd /Users/nicenoodle/smart-rebalancer
grep -r "from 'react-dom'" src/
```

**결과**: 사용하지 않음 (0개 파일)

### 1-2. 제거 실행

```bash
npm uninstall react-dom
```

**예상 효과**:
- node_modules: -6.4 MB
- 프로덕션 번들: -2~3 MB

---

## Step 2: 번들 분석 실행 (10분)

### 2-1. 현재 번들 크기 측정

```bash
npm run analyze:bundle
```

**생성되는 파일**:
- `dist/bundles/*.js` - 프로덕션 번들
- `dist/bundles/*.map` - 소스맵

### 2-2. 번들 크기 확인

```bash
ls -lh dist/bundles/*.js
du -sh dist/bundles
```

**Baseline 기록**:
```
iOS 번들: _______ MB
Android 번들: _______ MB
```

### 2-3. 패키지 크기 분석

```bash
npm run analyze:size
```

---

## Step 3: metro.config.js 검증 (5분)

### 3-1. 현재 설정 확인

`/Users/nicenoodle/smart-rebalancer/metro.config.js` 파일 열기

**확인 사항**:
- ✅ `minifierConfig` 설정됨
- ✅ `drop_console: true` 설정됨
- ✅ `processModuleFilter` 설정됨

### 3-2. 테스트 빌드

```bash
# 개발 서버 재시작 (캐시 클리어)
npm start -- --clear
```

**확인 포인트**:
- Console.log가 프로덕션 빌드에서 제거되는지
- 테스트 파일이 번들에 포함되지 않는지

---

## Step 4: axios → fetch 전환 (30분 ~ 1시간)

### 4-1. 영향받는 파일 목록

총 4개 파일:
1. `src/services/priceProviders/YahooFinanceProvider.ts`
2. `src/services/priceProviders/CoinGeckoProvider.ts`
3. `src/services/kakaoLocalSearch.ts`
4. `src/services/marketData.ts`

### 4-2. 전환 템플릿

#### Before (axios)
```typescript
import axios, { AxiosError } from 'axios';

try {
  const response = await axios.get(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data;
} catch (error) {
  if (error instanceof AxiosError) {
    console.error('Error:', error.response?.status);
  }
  throw error;
}
```

#### After (fetch)
```typescript
// axios import 제거

try {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
} catch (error) {
  if (error instanceof TypeError) {
    console.error('Network Error:', error.message);
  }
  throw error;
}
```

### 4-3. 파일별 전환 체크리스트

#### 📄 File 1: `src/services/kakaoLocalSearch.ts`
- [ ] axios import 제거
- [ ] GET 요청을 fetch로 변경
- [ ] Headers 설정 확인
- [ ] 에러 핸들링 수정
- [ ] 테스트 실행

#### 📄 File 2: `src/services/marketData.ts`
- [ ] axios import 제거
- [ ] GET 요청을 fetch로 변경
- [ ] 에러 핸들링 수정
- [ ] 테스트 실행

#### 📄 File 3: `src/services/priceProviders/CoinGeckoProvider.ts`
- [ ] axios import 제거
- [ ] AxiosError 타입 제거
- [ ] GET 요청을 fetch로 변경
- [ ] 에러 핸들링 수정 (AxiosError → TypeError)
- [ ] 테스트 실행

#### 📄 File 4: `src/services/priceProviders/YahooFinanceProvider.ts`
- [ ] axios import 제거
- [ ] AxiosError 타입 제거
- [ ] GET 요청을 fetch로 변경
- [ ] 에러 핸들링 수정 (AxiosError → TypeError)
- [ ] 테스트 실행

### 4-4. 전환 완료 후

```bash
# axios 제거
npm uninstall axios

# 앱 재시작 및 테스트
npm start -- --clear

# iOS 시뮬레이터에서 테스트
npm run ios

# Android 에뮬레이터에서 테스트
npm run android
```

**테스트 시나리오**:
1. 가격 데이터 로딩 (Yahoo Finance, CoinGecko)
2. 카카오 로컬 검색
3. 마켓 데이터 로딩
4. 네트워크 에러 시나리오 (비행기 모드)

---

## Step 5: 결과 측정 (10분)

### 5-1. 최적화 후 번들 크기

```bash
npm run analyze:bundle
ls -lh dist/bundles/*.js
```

**After 기록**:
```
iOS 번들: _______ MB (이전 대비: ______ MB 감소)
Android 번들: _______ MB (이전 대비: ______ MB 감소)
```

### 5-2. node_modules 크기 확인

```bash
du -sh node_modules
```

**예상 결과**: ~506 MB (514 MB → -8 MB)

### 5-3. 성능 테스트

**측정 항목**:
- [ ] 앱 초기 로딩 시간
- [ ] 탭 전환 속도
- [ ] API 호출 속도 (fetch vs axios 비교)

---

## Step 6: 추가 Quick Wins (선택 사항)

### 6-1. 이미지 압축 (10-20분)

```bash
# 현재 이미지 크기 확인
find assets/images -type f \( -name "*.png" -o -name "*.jpg" \) -exec du -h {} \; | sort -hr

# ImageOptim 설치 (Mac)
brew install imageoptim-cli

# 압축 실행
imageoptim assets/images/**/*.png assets/images/**/*.jpg

# 결과 확인
find assets/images -type f \( -name "*.png" -o -name "*.jpg" \) -exec du -h {} \; | sort -hr
```

**예상 효과**: -1~3 MB

### 6-2. @expo/vector-icons 최적화 확인 (5분)

```bash
# 현재 사용 패턴 확인
grep -r "@expo/vector-icons" src/ --include="*.tsx"
```

**최적화 패턴 적용**:
```typescript
// ❌ Before
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';

// ✅ After
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
```

---

## 요약 체크리스트

### ✅ 완료 항목
- [ ] react-dom 제거 (-6.4 MB)
- [ ] Baseline 번들 크기 측정
- [ ] metro.config.js 검증
- [ ] axios → fetch 전환 (4개 파일)
- [ ] axios 패키지 제거 (-1.6 MB)
- [ ] 최적화 후 번들 크기 측정
- [ ] 성능 테스트 실행

### 📊 예상 결과
- **node_modules**: 514 MB → 506 MB (-8 MB, -1.6%)
- **프로덕션 번들**: -4~6 MB (iOS/Android 합산)
- **소요 시간**: 30분 ~ 1시간

---

## 다음 단계

이 Quick Start를 완료한 후:

1. **`BUNDLE_OPTIMIZATION.md`** 읽기 - 전체 최적화 가이드
2. **`DEPENDENCY_ANALYSIS_REPORT.md`** 읽기 - 상세 분석 보고서
3. **1주일 계획 수립** - Code splitting, Import 최적화 등

---

## 문제 해결

### Q1: axios → fetch 전환 후 에러 발생

**증상**: API 호출 실패, "TypeError: Failed to fetch"

**해결책**:
1. Headers 설정 확인 (Content-Type 누락?)
2. CORS 이슈 확인 (Web 빌드만 해당)
3. Network 로그 확인 (`console.log(response.status)`)

### Q2: 번들 크기가 예상보다 줄지 않음

**원인**:
- Metro bundler 캐시 문제
- Tree-shaking이 제대로 작동하지 않음

**해결책**:
```bash
# 캐시 완전 삭제
rm -rf node_modules/.cache
npx expo start --clear

# 프로덕션 빌드 재생성
npm run analyze:bundle
```

### Q3: react-dom 제거 후 Web 빌드 실패

**증상**: "Cannot find module 'react-dom'"

**해결책**:
- Web 빌드는 `react-native-web`이 처리하므로 문제 없어야 함
- 만약 에러 발생 시, `package.json`에 `peerDependencies`로 추가:
  ```json
  "peerDependencies": {
    "react-dom": "^19.1.0"
  }
  ```

---

**작성자**: Bundle Optimization Specialist
**작성일**: 2026-02-11
**예상 소요 시간**: 30분 ~ 1시간
