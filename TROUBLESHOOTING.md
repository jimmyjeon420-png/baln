# 트러블슈팅 가이드

> c2, c3, c4, c5 작업 중 자주 발생하는 이슈와 해결 방법

---

## 🚨 공통 이슈

### 1. TypeScript 타입 에러: "Property does not exist on type"

**증상**:
```
Property 'assetType' does not exist on type 'PortfolioAsset'
```

**원인**:
- `PortfolioAsset` (gemini.ts)와 `Asset` (asset.ts) 타입이 다름
- 잘못된 타입 import

**해결**:
```typescript
// ❌ 잘못된 예
import { PortfolioAsset } from '../services/gemini';
const assets: PortfolioAsset[] = useSharedPortfolio().assets; // assets는 Asset[]

// ✅ 올바른 예
import { Asset } from '../types/asset';
const assets: Asset[] = useSharedPortfolio().assets;
```

---

### 2. Hook 콜백 에러: "Expected 0 arguments"

**증상**:
```
Expected 0 arguments, but got 1.
```

**원인**:
- TanStack Query v5 패턴 변경
- 콜백을 훅 호출 시가 아닌 mutation 실행 시 전달해야 함

**해결**:
```typescript
// ❌ 잘못된 예
const submitVote = useSubmitVote({
  onSuccess: () => console.log('성공'),
});

// ✅ 올바른 예
const submitVote = useSubmitVote();
// ... later
submitVote(data, {
  onSuccess: () => console.log('성공'),
  onError: (error) => console.error(error),
});
```

---

### 3. Supabase RPC 에러: "function does not exist"

**증상**:
```
ERROR: function public.toggle_post_like(uuid) does not exist
```

**원인**:
- RPC 함수가 DB에 생성되지 않음
- 마이그레이션 파일 실행 안 됨

**해결**:
```bash
# Supabase CLI로 로컬 마이그레이션 실행
npx supabase db reset

# 또는 원격 DB에 직접 SQL 실행
# Supabase Dashboard → SQL Editor → 마이그레이션 SQL 붙여넣기
```

---

### 4. 무한 리렌더링

**증상**:
- 앱이 느려지거나 멈춤
- Console에 수백 개의 동일한 로그

**원인**:
- useEffect 의존성 배열에 객체/배열 직접 전달
- 훅 내부에서 상태 업데이트 무한 루프

**해결**:
```typescript
// ❌ 잘못된 예
useEffect(() => {
  fetchData();
}, [{ id: 1 }]); // 매번 새 객체 생성 → 무한 루프

// ✅ 올바른 예
const id = 1;
useEffect(() => {
  fetchData();
}, [id]); // primitive 값 사용

// 또는
const config = useMemo(() => ({ id: 1 }), []);
useEffect(() => {
  fetchData();
}, [config]);
```

---

### 5. "Cannot read property 'map' of undefined"

**증상**:
```
TypeError: Cannot read property 'map' of undefined
```

**원인**:
- TanStack Query 데이터 로딩 중 undefined
- optional chaining 누락

**해결**:
```typescript
// ❌ 잘못된 예
const { data } = useQuery(...);
return data.items.map(...); // data가 undefined면 크래시

// ✅ 올바른 예
const { data, isLoading } = useQuery(...);
if (isLoading) return <Spinner />;
return (data?.items ?? []).map(...);
```

---

## 📦 Instance별 특정 이슈

### Instance 2 (분석 탭)

#### 문제: WhatIfSimulator 슬라이더 느림
**원인**: 매 슬라이더 변경마다 전체 포트폴리오 재계산

**해결**:
```typescript
// useMemo로 계산 결과 캐싱
const simulatedHealthScore = useMemo(() => {
  return calculateHealthScore(simulatedAssets, simulatedTotal).totalScore;
}, [simulatedAssets, simulatedTotal]);
```

#### 문제: 건강 점수 툴팁이 화면 밖으로 나감
**해결**:
```typescript
// 툴팁 위치를 동적으로 계산
const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
onLayout={(e) => {
  const { x, y } = e.nativeEvent.layout;
  setTooltipPosition({ x, y: y - 50 }); // 위로 50px
}}
```

---

### Instance 3 (커뮤니티)

#### 문제: 이미지 업로드 실패
**원인**: Supabase Storage 버킷 RLS 정책 누락

**해결**:
```sql
-- Supabase Dashboard → Storage → community-images → Policies

-- INSERT 정책
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- SELECT 정책
CREATE POLICY "Images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'community-images');
```

#### 문제: 댓글 VirtualizedList 스크롤 위치 초기화됨
**해결**:
```typescript
// keyExtractor를 안정적인 ID로 변경
<VirtualizedList
  keyExtractor={(item) => item.id} // ✅ stable ID
  // NOT: keyExtractor={(item, index) => index} ❌
/>
```

---

### Instance 4 (백엔드)

#### 문제: Edge Function Timeout (60초 초과)
**원인**: Gemini API 호출이 순차적으로 실행됨

**해결**:
```typescript
// Promise.all로 병렬 실행
const [macroResult, stocksResult, gurusResult] = await Promise.all([
  generateMacroAnalysis(),
  generateStockReports(),
  generateGuruInsights(),
]);
```

#### 문제: Cron이 실행되지 않음
**확인 사항**:
1. Supabase Dashboard → Edge Functions → Cron Jobs에 등록되었는지 확인
2. UTC 시간 변환 확인 (KST 07:00 = UTC 22:00 전날)
   ```
   # 매일 07:00 KST = 22:00 UTC 전날
   0 22 * * *
   ```
3. Edge Function이 배포되었는지 확인
   ```bash
   npx supabase functions list
   ```

---

### Instance 5 (예측 게임)

#### 문제: 차트가 렌더링되지 않음
**원인**: react-native-svg 미설치 또는 버전 불일치

**해결**:
```bash
npx expo install react-native-svg
```

#### 문제: 공유 기능 iOS에서만 작동
**원인**: Android는 expo-sharing 대신 Linking 사용 필요

**해결**:
```typescript
if (Platform.OS === 'ios') {
  await Sharing.shareAsync(uri);
} else {
  // Android는 Intent 사용
  await Share.share({ url: uri });
}
```

---

## 🔧 디버깅 팁

### 1. TanStack Query Devtools (개발용)

```typescript
// app/_layout.tsx에 추가 (개발 모드만)
if (__DEV__) {
  import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => {
    // 웹 버전만 지원, 모바일은 Flipper 사용
  });
}
```

### 2. Console.log보다 나은 방법

```typescript
// ❌ 피할 것
console.log('data:', data);

// ✅ 구조화된 로깅
console.log('[WhatIfSimulator] Adjustment changed:', {
  ticker,
  oldValue: adjustments[ticker],
  newValue: value,
  timestamp: new Date().toISOString(),
});
```

### 3. React Native Debugger

```bash
# 설치
npm install -g react-devtools

# 실행
npx react-devtools

# Expo 앱에서 개발자 메뉴 열기 (Ctrl+M / Cmd+D)
# → "Toggle Element Inspector" 선택
```

### 4. Supabase Logs 실시간 확인

```bash
# Supabase CLI로 로그 스트리밍
npx supabase functions logs daily-briefing --tail
```

---

## 📞 에스컬레이션

아래 이슈는 c1(Integration Testing)에 즉시 보고:

1. **타입 에러 5개 이상 발생** → 공유 타입 정의 문제일 가능성
2. **Edge Function 배포 실패** → Supabase 설정 이슈
3. **크레딧 차감이 2번 발생** → RPC 함수 버그 (critical)
4. **앱 크래시 (React Native 레드 스크린)** → 즉시 롤백 필요
5. **보안 취약점 발견** (SQL Injection, XSS 등) → 최우선 수정

---

**업데이트**: 2026-02-09 | c1 (Instance 1 - Integration Testing)
