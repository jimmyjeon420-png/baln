# Agent 3: 크레딧 & 마켓플레이스 구현

## 🎯 당신의 미션
**"1크레딧 = ₩100"**을 사용자에게 명확히 이해시키고,
크레딧으로 뭘 살 수 있는지 보여주는 **마켓플레이스** UI를 만드세요.

## 📌 역할 (Role)
- **당신은 "크레딧 경제 전문가"입니다.**
- **다른 Agent와 겹치는 파일은 절대 수정하지 마세요.**
- **새 파일만 생성**하거나, 아래 "전담 파일"만 수정하세요.

---

## ✅ 전담 파일 (수정 가능)
- `src/components/common/CreditDisplay.tsx` ← **새로 만들기**
- `src/components/common/CreditBadge.tsx` ← **새로 만들기**
- `src/components/marketplace/MarketplaceCard.tsx` ← **새로 만들기**
- `src/components/marketplace/MarketplaceGrid.tsx` ← **새로 만들기**
- `src/components/profile/BadgeShowcase.tsx` ← **새로 만들기**
- `src/data/marketplaceItems.ts` ← **새로 만들기** (상수 파일)

## ❌ 절대 수정 금지 파일
- `app/(tabs)/profile.tsx` ← Agent 5가 통합
- `src/hooks/useCredits.ts` ← 이미 완성됨
- `src/utils/formatters.ts` ← 공유 유틸
- `package.json` ← 패키지 설치 금지

---

## 🏗️ 구현해야 할 것

### 1. CreditDisplay.tsx (크레딧 잔액 표시)

#### 기능 요구사항
- **크레딧 + 원화 병기**: "127C (₩12,700)"
- **애니메이션**: 크레딧 증가 시 카운트업 애니메이션
- **탭 가능**: 탭하면 마켓플레이스로 이동

#### UI 디자인
```typescript
<TouchableOpacity
  onPress={() => router.push('/marketplace')}
  className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg"
>
  <View className="flex-row items-center justify-between">
    <View>
      <Text className="text-white text-sm font-medium">내 크레딧</Text>
      <View className="flex-row items-baseline mt-1">
        <AnimatedNumber
          value={credits}
          className="text-white text-3xl font-bold"
          suffix="C"
        />
        <Text className="text-white/70 text-sm ml-2">
          ({formatKRW(credits * 100)})
        </Text>
      </View>
    </View>
    <Icon name="chevron-right" size={24} color="white" />
  </View>
</TouchableOpacity>
```

#### 데이터 구조
```typescript
import { useCredits } from '../../hooks/useCredits';

const { data: credits, isLoading } = useCredits();

// credits: number (예: 127)
// 원화 환산: credits * 100 (1C = ₩100)
```

### 2. MarketplaceGrid.tsx (마켓플레이스 메인 화면)

#### 기능 요구사항
- **3 Tier 구조**:
  - **Tier 1: 즉시 효용** (상단, 강조)
  - **Tier 2: 경험 확장** (중단)
  - **Tier 3: 충성 보상** (하단, 잠금 or "곧 공개")
- **구매 가능 여부 표시**: 잔액 부족 시 회색 처리
- **구매 후 즉시 반영**: Optimistic UI 업데이트

#### UI 디자인
```typescript
<ScrollView className="bg-gray-50 dark:bg-black p-4">
  {/* 헤더: 내 크레딧 */}
  <CreditDisplay credits={myCredits} />

  {/* Tier 1: 즉시 효용 */}
  <SectionHeader title="💎 즉시 효용" subtitle="지금 바로 사용 가능" />
  <View className="grid grid-cols-2 gap-3">
    {tier1Items.map(item => (
      <MarketplaceCard
        key={item.id}
        item={item}
        canAfford={myCredits >= item.price}
        onPurchase={handlePurchase}
      />
    ))}
  </View>

  {/* Tier 2: 경험 확장 */}
  <SectionHeader title="✨ 경험 확장" subtitle="더 많은 기능 체험" />
  <View className="grid grid-cols-2 gap-3">
    {tier2Items.map(item => (
      <MarketplaceCard key={item.id} item={item} />
    ))}
  </View>

  {/* Tier 3: 충성 보상 (출시 후 오픈) */}
  <SectionHeader title="🔐 충성 보상" subtitle="곧 공개됩니다" />
  <LockedTierPlaceholder />
</ScrollView>
```

### 3. MarketplaceCard.tsx (상품 카드)

#### 기능
- **상품 정보**: 아이콘, 이름, 설명, 가격 (크레딧 + 원화)
- **구매 가능 여부**: 잔액 부족 시 "크레딧 부족" 표시
- **구매 버튼**: 탭하면 확인 다이얼로그 → 구매 완료

```typescript
<View className={cn(
  "bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-md",
  !canAfford && "opacity-50"
)}>
  {/* 아이콘 */}
  <View className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full items-center justify-center mb-3">
    <Text className="text-3xl">{item.icon}</Text>
  </View>

  {/* 상품명 */}
  <Text className="text-base font-bold mb-1">{item.name}</Text>
  <Text className="text-xs text-gray-600 dark:text-gray-400 mb-3">
    {item.description}
  </Text>

  {/* 가격 */}
  <View className="flex-row items-baseline justify-between">
    <Text className="text-lg font-bold text-purple-600">
      {item.price}C
    </Text>
    <Text className="text-xs text-gray-500">
      {formatKRW(item.price * 100)}
    </Text>
  </View>

  {/* 구매 버튼 */}
  <TouchableOpacity
    onPress={() => onPurchase(item.id)}
    disabled={!canAfford}
    className={cn(
      "mt-3 py-2 rounded-xl",
      canAfford ? "bg-purple-600" : "bg-gray-300"
    )}
  >
    <Text className="text-center text-white font-semibold">
      {canAfford ? "구매하기" : "크레딧 부족"}
    </Text>
  </TouchableOpacity>
</View>
```

### 4. marketplaceItems.ts (상품 정의)

#### 상수 파일
```typescript
export type MarketplaceItem = {
  id: string;
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  icon: string;
  price: number; // 크레딧
  type: 'service' | 'unlock' | 'discount' | 'badge';
  action: string; // 구매 후 실행할 액션 (예: 'ai_analysis', 'premium_trial')
  isAvailable: boolean; // 출시 후 오픈 여부
};

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  // Tier 1: 즉시 효용
  {
    id: 'ai-analysis-extra',
    tier: 1,
    name: 'AI 분석 추가 1회',
    description: '오늘 AI 진단 횟수 +1',
    icon: '🤖',
    price: 1, // 1C = ₩100
    type: 'service',
    action: 'ai_analysis',
    isAvailable: true,
  },
  {
    id: 'prediction-explanation',
    tier: 1,
    name: '예측 해설 보기',
    description: '오답 이유 & 전문가 해설',
    icon: '💡',
    price: 1,
    type: 'unlock',
    action: 'unlock_explanation',
    isAvailable: true,
  },

  // Tier 2: 경험 확장
  {
    id: 'premium-trial-3days',
    tier: 2,
    name: 'Premium 3일 체험',
    description: '모든 기능 무제한',
    icon: '⭐',
    price: 5, // 5C = ₩500
    type: 'unlock',
    action: 'premium_trial',
    isAvailable: true,
  },
  {
    id: 'vip-lounge-1week',
    tier: 2,
    name: 'VIP 라운지 1주일',
    description: '거장 인사이트 + 토론',
    icon: '🏆',
    price: 3,
    type: 'unlock',
    action: 'vip_access',
    isAvailable: true,
  },

  // Tier 3: 충성 보상 (출시 후 오픈)
  {
    id: 'premium-discount-50',
    tier: 3,
    name: 'Premium 50% 할인권',
    description: '₩2,450에 Premium 1개월',
    icon: '🎫',
    price: 25, // 25C = ₩2,500
    type: 'discount',
    action: 'premium_discount',
    isAvailable: false, // 출시 후 오픈
  },
  {
    id: 'founder-badge',
    tier: 3,
    name: '창립 멤버 뱃지',
    description: '선착순 100명 한정',
    icon: '🔰',
    price: 50,
    type: 'badge',
    action: 'grant_founder_badge',
    isAvailable: false,
  },
];

// Tier별로 그룹핑
export const getTier1Items = () => MARKETPLACE_ITEMS.filter(i => i.tier === 1 && i.isAvailable);
export const getTier2Items = () => MARKETPLACE_ITEMS.filter(i => i.tier === 2 && i.isAvailable);
export const getTier3Items = () => MARKETPLACE_ITEMS.filter(i => i.tier === 3);
```

### 5. BadgeShowcase.tsx (뱃지 진열장)

#### 기능
- **획득한 뱃지 표시**: 크게, 컬러풀하게
- **미획득 뱃지**: 회색 실루엣 + "조건: 90일 연속 출석"
- **뱃지별 희귀도 표시**: 일반 / 레어 / 에픽 / 레전더리

```typescript
<View className="bg-white dark:bg-gray-900 rounded-2xl p-5">
  <Text className="text-xl font-bold mb-4">🏅 내 뱃지</Text>

  <View className="grid grid-cols-3 gap-4">
    {badges.map(badge => (
      <BadgeCard
        key={badge.id}
        badge={badge}
        isUnlocked={userBadges.includes(badge.id)}
      />
    ))}
  </View>
</View>

// BadgeCard
<View className="items-center">
  <View className={cn(
    "w-20 h-20 rounded-full items-center justify-center",
    isUnlocked ? "bg-gradient-to-br from-yellow-400 to-orange-500" : "bg-gray-300"
  )}>
    <Text className="text-4xl">{badge.icon}</Text>
  </View>
  <Text className="text-xs text-center mt-2">{badge.name}</Text>
  {!isUnlocked && (
    <Text className="text-xs text-gray-500 text-center">
      {badge.condition}
    </Text>
  )}
</View>
```

---

## 🎨 디자인 가이드

### 크레딧 컬러
- **그라데이션**: from-purple-500 to-pink-500
- **텍스트**: 크레딧 수는 굵게 (font-bold), 원화는 얇게 (font-normal)

### 마켓플레이스 카드
- **구매 가능**: bg-white, shadow-md, 활성 버튼
- **구매 불가**: opacity-50, 회색 버튼

### 뱃지 희귀도 색상
- **일반**: bg-gray-400
- **레어**: bg-blue-500
- **에픽**: bg-purple-500
- **레전더리**: from-yellow-400 to-orange-500

---

## ✅ 완료 체크리스트

- [ ] `CreditDisplay.tsx` 생성 (크레딧 표시)
- [ ] `MarketplaceGrid.tsx` 생성 (마켓플레이스 메인)
- [ ] `MarketplaceCard.tsx` 생성 (상품 카드)
- [ ] `marketplaceItems.ts` 생성 (상품 정의)
- [ ] `BadgeShowcase.tsx` 생성 (뱃지 진열장)
- [ ] 크레딧 증가 애니메이션
- [ ] 다크 모드 대응
- [ ] TypeScript 에러 0개 확인

---

## 🚨 주의사항

1. **다른 Agent와 파일 충돌 방지**
   - `app/(tabs)/profile.tsx`는 Agent 5가 통합합니다.
   - 당신은 **컴포넌트만** 만드세요.

2. **기존 훅 활용**
   - `useCredits()` 훅이 이미 있습니다. 그대로 쓰세요.
   - 새로운 API 호출을 만들지 마세요.

3. **환율 상수**
   - 1C = ₩100은 `src/utils/formatters.ts`에 상수로 정의되어 있을 수 있습니다.
   - 하드코딩하지 말고 상수를 import하세요.

4. **커밋 금지**
   - 코드만 작성하고, 커밋은 사용자가 합니다.

---

## 📚 참고 파일

- `src/hooks/useCredits.ts` (크레딧 데이터)
- `src/hooks/useAIMarketplace.ts` (마켓플레이스 구매 로직)
- `src/utils/formatters.ts` (크레딧/원화 포맷 함수)

---

## 🎯 성공 기준

**사용자가 "1크레딧 = 100원이구나. 5C 모아서 Premium 체험해봐야지"라고 생각하면 성공입니다.**

시작하세요! 💰
