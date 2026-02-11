# Agent 1: 맥락 카드 시스템 구현

## 🎯 당신의 미션
"오늘 내 자산이 왜 이렇게 움직였는지" 5분 안에 이해시키는 **맥락 카드 UI**를 만드세요.
이것은 앱의 **킬링 피처**이며, 사용자가 매일 돌아오게 만드는 핵심입니다.

## 📌 역할 (Role)
- **당신은 "맥락 카드 전문가"입니다.**
- **다른 Agent와 겹치는 파일은 절대 수정하지 마세요.**
- **새 파일만 생성**하거나, 아래 "전담 파일"만 수정하세요.

---

## ✅ 전담 파일 (수정 가능)
- `src/components/home/ContextCard.tsx` ← **새로 만들기**
- `src/components/home/ContextBriefCard.tsx` ← **기존 파일 개선**
- `src/components/home/ContextLayerTabs.tsx` ← **새로 만들기**
- `src/components/home/PortfolioImpactSection.tsx` ← **새로 만들기**

## ❌ 절대 수정 금지 파일
- `app/(tabs)/index.tsx` ← Agent 5가 나중에 통합
- `src/hooks/useContextCard.ts` ← 이미 완성됨
- `src/types/asset.ts` ← 공유 타입 (다른 Agent가 쓰는 중)
- `package.json` / `package-lock.json` ← 패키지 설치 금지

---

## 🏗️ 구현해야 할 것

### 1. ContextCard.tsx (메인 컴포넌트)

#### 기능 요구사항
- **4겹 레이어 탭**: 역사적 맥락 / 거시경제 체인 / 기관 행동 / 내 포트폴리오
- **탭 전환**: 스와이프 or 탭 버튼으로 전환
- **심리 상태 뱃지**: calm(초록) / caution(노랑) / alert(빨강)
- **공유 버튼**: 스크린샷 캡처 → SNS 공유

#### UI 디자인 (Apple/Stripe 스타일)
```typescript
<View className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg">
  {/* 헤더: 심리 상태 + 제목 */}
  <View className="flex-row items-center mb-4">
    <SentimentBadge sentiment={data.sentiment} />
    <Text className="text-xl font-bold ml-3">{data.headline}</Text>
  </View>

  {/* 4겹 탭 */}
  <ContextLayerTabs
    layers={data.layers}
    currentLayer={activeLayer}
    onLayerChange={setActiveLayer}
  />

  {/* 레이어별 콘텐츠 */}
  <LayerContent layer={data.layers[activeLayer]} />

  {/* 하단: 공유 버튼 */}
  <ShareButton onPress={handleShare} />
</View>
```

#### 데이터 구조 (이미 서비스에 있음)
```typescript
import { useContextCard } from '../../hooks/useContextCard';

const { data, isLoading, refetch } = useContextCard();

// data 구조:
// {
//   headline: "미국 CPI 발표로 전 세계 증시 동반 하락",
//   sentiment: "caution",
//   layers: {
//     historical: { title, content, stats },
//     macro: { title, chain, impact },
//     institution: { title, flow, interpretation },
//     portfolio: { myImpact, healthChange, advice }
//   },
//   created_at, card_date
// }
```

### 2. ContextLayerTabs.tsx (탭 컴포넌트)

#### 기능
- 4개 탭 버튼: 📜 역사 / 🌍 거시 / 🏦 기관 / 💼 내 자산
- 현재 활성 탭 강조 (언더라인 애니메이션)
- 접근성: VoiceOver 지원

```typescript
const LAYERS = [
  { id: 'historical', icon: '📜', label: '역사적 맥락' },
  { id: 'macro', icon: '🌍', label: '거시경제' },
  { id: 'institution', icon: '🏦', label: '기관 행동' },
  { id: 'portfolio', icon: '💼', label: '내 자산' },
] as const;
```

### 3. PortfolioImpactSection.tsx (내 포트폴리오 레이어)

#### 표시 내용
- **영향도**: `-1.2% (₩120,000)` ← 오늘 맥락이 내 자산에 미친 영향
- **건강 점수 변화**: `A → A` (변동 없음) or `B → C` (악화)
- **AI 조언**: "현재 수준의 변동은 정상 범위입니다. 패닉셀 하지 마세요."

```typescript
<View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
  <Text className="text-sm text-gray-600 dark:text-gray-400">
    오늘 맥락이 내 자산에 미친 영향
  </Text>
  <Text className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
    {formatPercent(data.myImpact)} ({formatKRW(data.myImpactKRW)})
  </Text>

  <HealthScoreChange
    before={data.healthBefore}
    after={data.healthAfter}
  />

  <Text className="text-sm mt-3">{data.advice}</Text>
</View>
```

---

## 🎨 디자인 가이드

### 컬러 시스템
- **Calm (안정)**: bg-green-50, text-green-700
- **Caution (주의)**: bg-yellow-50, text-yellow-700
- **Alert (위기)**: bg-red-50, text-red-700
- **다크 모드**: 각 색상에 `/20` 투명도 적용

### 타이포그래피
- **헤드라인**: text-xl font-bold
- **본문**: text-base leading-relaxed
- **수치**: text-3xl font-bold (강조)

### 간격
- 카드 패딩: p-6
- 섹션 간격: mb-4
- 라운드: rounded-2xl

---

## ✅ 완료 체크리스트

- [ ] `ContextCard.tsx` 생성 (4겹 레이어 전체)
- [ ] `ContextLayerTabs.tsx` 생성 (탭 전환)
- [ ] `PortfolioImpactSection.tsx` 생성 (내 자산 영향도)
- [ ] 심리 상태 뱃지 컴포넌트 (`SentimentBadge.tsx`)
- [ ] 공유 기능 (`useShareContextCard` 훅 활용)
- [ ] 다크 모드 대응 확인
- [ ] TypeScript 에러 0개 확인 (`npx tsc --noEmit`)

---

## 🚨 주의사항

1. **다른 Agent와 파일 충돌 방지**
   - `app/(tabs)/index.tsx`는 Agent 5가 나중에 통합합니다.
   - 당신은 **컴포넌트만 만들고**, 탭에 연결하는 건 Agent 5가 합니다.

2. **기존 훅 활용**
   - `useContextCard()` 훅은 이미 완성되어 있습니다. 그대로 import해서 쓰세요.
   - 데이터 페칭 로직을 새로 만들지 마세요.

3. **패키지 설치 금지**
   - 새 패키지가 필요하면 사용자에게 알려주세요.
   - 직접 `npm install` 하지 마세요.

4. **커밋 금지**
   - 코드만 작성하고, 커밋은 사용자가 합니다.

---

## 📚 참고 파일

읽어보면 도움될 파일:
- `src/hooks/useContextCard.ts` (데이터 구조 이해)
- `src/services/contextCardService.ts` (API 호출 로직)
- `src/components/home/ContextBriefCard.tsx` (기존 간단 버전)

---

## 🎯 성공 기준

**사용자가 이 카드를 보고 "아, 오늘 주가가 빠진 게 내 탓이 아니라 매크로 때문이구나"라고 안심하면 성공입니다.**

시작하세요! 💪
