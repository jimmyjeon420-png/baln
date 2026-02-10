# 하드코딩된 색상 일괄 수정 가이드

## 개요
라이트 모드에서 검정 배경이 남아있는 문제를 해결하기 위해 하드코딩된 색상을 테마 시스템으로 교체합니다.

## 이미 완료된 작업

### 1. 프리미엄 색상 팔레트 재설계 ✅
- `src/styles/colors.ts` 업데이트 완료
- 라이트 모드: 3단계 배경 레이어, 인버스 섹션 추가
- 다크 모드: 더 세련된 다크 블루 그레이

### 2. 그림자 시스템 추가 ✅
- `src/styles/shadows.ts` 새 파일 생성
- 라이트: 3단계 그림자 (sm/md/lg)
- 다크: 테두리로 대체

### 3. ThemeContext 업데이트 ✅
- `src/contexts/ThemeContext.tsx`에 shadows 추가
- useTheme() 훅에서 colors, shadows 반환

### 4. 주요 컴포넌트 업데이트 ✅
- `src/components/home/ContextCard.tsx` 완료

## 남은 작업

### 자동화 가능한 일괄 수정 패턴

아래 파일들에서 하드코딩된 색상을 찾아서 수정해야 합니다:

#### 패턴 1: 다크 배경 색상
```typescript
// 교체 대상
backgroundColor: '#121212'
backgroundColor: '#1E1E1E'
backgroundColor: '#1A1A1A'
backgroundColor: '#141414'
backgroundColor: '#0A0A0A'

// 교체 방법
// 1. 컴포넌트 상단에 추가:
import { useTheme } from '../../hooks/useTheme';

// 2. 컴포넌트 내부에 추가:
const { colors, shadows } = useTheme();

// 3. 스타일 적용:
<View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
```

#### 패턴 2: 텍스트 색상
```typescript
// 교체 대상
color: '#FFFFFF'  → colors.textPrimary
color: '#E0E0E0'  → colors.textPrimary
color: '#CCCCCC'  → colors.textSecondary
color: '#9E9E9E'  → colors.textTertiary
color: '#888888'  → colors.textTertiary
```

#### 패턴 3: 구분선
```typescript
// 교체 대상
borderColor: '#2A2A2A' → colors.border
borderColor: '#333333' → colors.border
borderTopColor: '#2A2A2A' → colors.border
```

### 우선순위 높은 파일들 (수동 수정 필요)

#### P0 - 즉시 수정
1. **app/(tabs)/diagnosis.tsx** (610, 672, 875, 915, 948, 1009줄)
   - 카드 배경: `backgroundColor: '#1E1E1E'` → `colors.surface`

2. **app/(tabs)/menu.tsx** (17줄)
   - 전체 배경: `backgroundColor: '#121212'` → `colors.background`

#### P1 - 중요 (사용자가 자주 보는 화면)
3. **src/components/checkup/AIAnalysisCTA.tsx** (120, 161줄)
4. **src/components/checkup/CheckupHeader.tsx** (137줄)
5. **src/components/checkup/EmotionCheck.tsx** (89, 129, 154줄)
6. **src/components/checkup/MarketTemperature.tsx** (98, 127, 138줄)

#### P2 - 일반 (덜 자주 보는 화면)
7. **src/components/rebalance/HealthScoreSection.tsx** (297, 320, 471줄)
8. **src/components/rebalance/TodayActionsSection.tsx** (288, 599, 704, 705줄)
9. **src/components/rebalance/AllocationDriftSection.tsx** (483, 558, 592줄)

### 수정 예시

#### Before (하드코딩)
```typescript
export default function MyComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>제목</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
  },
  title: {
    color: '#FFFFFF',
  },
});
```

#### After (테마 시스템)
```typescript
import { useTheme } from '../../hooks/useTheme';

export default function MyComponent() {
  const { colors, shadows } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>제목</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor는 동적으로 적용됨
  },
  title: {
    // color는 동적으로 적용됨
  },
});
```

## 자동화 스크립트 (선택 사항)

VSCode에서 정규식 검색/치환으로 일괄 수정 가능:

### 검색 패턴
```regex
backgroundColor:\s*['"]#[0-9A-F]{6}['"]
```

### 주의사항
- 브랜드 컬러 (#4CAF50 등)는 교체하지 말 것
- 투명도가 있는 색상 (rgba)은 케이스별로 판단
- 공유 컴포넌트 수정 시 다른 화면에 영향 확인

## 검증 방법

수정 완료 후:
1. 라이트 모드로 전환: Settings > 테마 설정 > 라이트 모드
2. 모든 주요 화면 확인 (오늘/분석/전체 탭)
3. 검정 섹션이 남아있는지 확인
4. TypeScript 에러 체크: `npx tsc --noEmit`
