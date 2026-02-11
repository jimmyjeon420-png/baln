# 크레딧 & 마켓플레이스 컴포넌트 가이드

Agent 3가 구현한 크레딧 경제 시스템 컴포넌트입니다.

## 핵심 원칙

**"1크레딧 = ₩100을 명확히 보여준다"**

- 모든 크레딧 표시에 원화 병기
- 사용자가 가치를 즉시 이해할 수 있도록
- 출시 후 환율 조정 가능 (formatters.ts의 CREDIT_TO_KRW 상수 변경)

---

## 1. CreditDisplay (큰 크레딧 잔액 표시)

**위치**: `src/components/common/CreditDisplay.tsx`

**역할**: 프로필 화면 상단에 표시할 "내 지갑" 카드

**사용 예시**:
```tsx
import { CreditDisplay } from '@/components/common';

// 프로필 화면에서
<CreditDisplay />

// 커스텀 클릭 핸들러
<CreditDisplay onPress={() => console.log('클릭!')} />
```

**특징**:
- 그라데이션 배경 (보라색 → 핑크)
- 크레딧 잔액 + 원화 환산 표시
- 터치하면 마켓플레이스로 이동
- 로딩 상태 지원

---

## 2. CreditChip (작은 크레딧 보상 표시)

**위치**: `src/components/common/CreditChip.tsx`

**역할**: 보상 획득/차감 시 "+2C (₩200)" 표시

**사용 예시**:
```tsx
import { CreditChip } from '@/components/common';

// 출석 보상
<CreditChip amount={2} />  // +2C (₩200)

// 예측 적중 보상
<CreditChip amount={3} size="large" />  // +3C (₩300)

// 크레딧 차감 (AI 분석 사용)
<CreditChip amount={-1} />  // -1C (₩100)

// 원화 숨기기
<CreditChip amount={5} showKRW={false} />  // +5C
```

**Props**:
- `amount`: 크레딧 수량 (양수: 획득, 음수: 차감)
- `size`: 'small' | 'medium' | 'large'
- `showKRW`: 원화 표시 여부 (기본: true)
- `showIcon`: 아이콘 표시 여부 (기본: true)

---

## 3. MarketplaceCard (상품 카드)

**위치**: `src/components/marketplace/MarketplaceCard.tsx`

**역할**: 마켓플레이스 상품 하나를 표시

**사용 예시**:
```tsx
import { MarketplaceCard } from '@/components/marketplace';

<MarketplaceCard
  item={marketplaceItem}
  canAfford={currentBalance >= item.price}
  currentBalance={currentBalance}
  onPurchase={(itemId) => handlePurchase(itemId)}
/>
```

**특징**:
- 상품 아이콘, 이름, 설명
- 가격 (크레딧 + 원화 병기)
- 잔액 부족 시 회색 처리 + "N크레딧 부족" 표시
- 비활성화 상품 "🔐 곧 공개" 표시
- Tier 3 상품에 "충성 보상" 뱃지
- 한정 상품 재고 표시

---

## 4. MarketplaceGrid (마켓플레이스 메인)

**위치**: `src/components/marketplace/MarketplaceGrid.tsx`

**역할**: 마켓플레이스 전체 화면

**사용 예시**:
```tsx
import { MarketplaceGrid } from '@/components/marketplace';

// app/marketplace/index.tsx
export default function MarketplaceScreen() {
  return (
    <View style={{ flex: 1 }}>
      <MarketplaceGrid />
    </View>
  );
}
```

**구조**:
- **Tier 1 (즉시 효용)**: AI 분석 추가, 예측 해설
- **Tier 2 (경험 확장)**: Premium 체험, VIP 라운지
- **Tier 3 (충성 보상)**: 할인권, 창립 멤버 뱃지 (출시 후 오픈)

**구매 로직**:
- 잔액 부족 → "충전하기" 얼럿
- 비활성화 상품 → "곧 공개 예정" 얼럿
- 구매 확인 → 얼럿으로 재확인

---

## 5. BadgeShowcase (뱃지 진열장)

**위치**: `src/components/profile/BadgeShowcase.tsx`

**역할**: 사용자의 뱃지를 진열

**사용 예시**:
```tsx
import { BadgeShowcase } from '@/components/profile';

<BadgeShowcase
  ownedBadgeIds={['week_warrior', 'analyst_top10']}
  onBadgePress={(badge) => {
    Alert.alert(badge.name, badge.description);
  }}
/>
```

**특징**:
- 카테고리별 분류 (활동/실력/기여/특수)
- 획득 뱃지: 컬러풀 + 희귀도 뱃지
- 미획득 뱃지: 회색 + 잠금 아이콘 + 조건 표시
- 뱃지 클릭 시 상세 정보 모달

---

## 데이터 구조

### 마켓플레이스 상품

**파일**: `src/data/marketplaceItems.ts`

```typescript
export interface MarketplaceItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  price: number; // 크레딧
  priceKRW: number; // 원화 환산
  icon: string;
  tier: 'instant' | 'experience' | 'loyalty';
  category: 'analysis' | 'premium' | 'community' | 'badge';
  stock?: number; // 한정 상품
  enabled: boolean; // 출시 전 비활성화
}
```

**상품 조회**:
```typescript
import { MARKETPLACE_ITEMS, getItemsByTier } from '@/data/marketplaceItems';

const tier1Items = getItemsByTier('instant');
const tier2Items = getItemsByTier('experience');
```

### 뱃지 정의

**파일**: `src/data/badgeDefinitions.ts`

```typescript
export interface Badge {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  category: 'activity' | 'skill' | 'contribution' | 'special';
  condition: {
    type: 'streak' | 'prediction' | 'community' | 'manual';
    threshold?: number;
    metadata?: Record<string, any>;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  enabled: boolean;
}
```

**뱃지 조회**:
```typescript
import { BADGE_DEFINITIONS, getBadgesByCategory } from '@/data/badgeDefinitions';

const activityBadges = getBadgesByCategory('activity');
const skillBadges = getBadgesByCategory('skill');
```

---

## 출시 후 조정 가능한 항목

### 1. 크레딧 환율 변경

**파일**: `src/utils/formatters.ts`

```typescript
// 현재: 1C = ₩100
export const CREDIT_TO_KRW = 100;

// 변경 시나리오 1: 1C = ₩1 (10배 인플레이션)
export const CREDIT_TO_KRW = 1;
// + 모든 사용자 잔액 10배로 마이그레이션

// 변경 시나리오 2: 1C = ₩1,000 (10배 디플레이션)
export const CREDIT_TO_KRW = 1000;
// + 모든 사용자 잔액 1/10로 마이그레이션
```

### 2. 크레딧 이름 변경

**파일**: `src/utils/formatters.ts`

```typescript
// 현재
export const CREDIT_NAME = '크레딧';
export const CREDIT_SYMBOL = 'C';

// 변경 예시: "크레딧" → "코인"
export const CREDIT_NAME = '코인';
export const CREDIT_SYMBOL = 'C'; // 심볼은 유지
```

### 3. 상품 가격 조정

**파일**: `src/data/marketplaceItems.ts`

```typescript
// AI 분석 추가 1C → 2C로 인상
{
  id: 'ai_analysis_extra',
  price: 2,  // 변경
  priceKRW: 200,  // 변경
  // ...
}
```

### 4. 상품 활성화/비활성화

**파일**: `src/data/marketplaceItems.ts`

```typescript
// Tier 3 상품 오픈 (출시 3개월 후)
{
  id: 'badge_founder',
  enabled: true,  // false → true
  // ...
}
```

---

## 통합 예시: 프로필 화면

```tsx
// app/(tabs)/profile.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { CreditDisplay } from '@/components/common';
import { BadgeShowcase } from '@/components/profile';

export default function ProfileScreen() {
  // 사용자 뱃지 목록 (DB에서 조회)
  const ownedBadgeIds = ['week_warrior', 'analyst_top10'];

  return (
    <ScrollView style={styles.container}>
      {/* 크레딧 카드 */}
      <CreditDisplay />

      {/* 뱃지 진열장 */}
      <BadgeShowcase
        ownedBadgeIds={ownedBadgeIds}
        onBadgePress={(badge) => {
          // 뱃지 상세 모달 표시
          console.log(badge);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
});
```

---

## 완료 체크리스트

- ✅ CreditDisplay.tsx (큰 크레딧 표시)
- ✅ CreditChip.tsx (작은 보상 표시)
- ✅ MarketplaceCard.tsx (상품 카드)
- ✅ MarketplaceGrid.tsx (마켓플레이스 메인)
- ✅ BadgeShowcase.tsx (뱃지 진열장)
- ✅ marketplace/index.ts (export 정리)
- ✅ profile/index.ts (export 정리)
- ✅ common/index.ts (export 업데이트)
- ✅ TypeScript 에러 0개
- ✅ 원화 병기 (모든 컴포넌트)

---

## Agent 5 (프로필 탭 담당)에게

프로필 화면에서 위 컴포넌트들을 사용할 때:

1. **CreditDisplay**: 화면 상단에 배치
2. **BadgeShowcase**: 크레딧 카드 아래 배치
3. **ownedBadgeIds**: `user_badges` 테이블에서 조회

```sql
SELECT badge_id FROM user_badges WHERE user_id = ?
```

4. **뱃지 상세 모달**: `onBadgePress`에서 처리

---

**Agent 3 작업 완료** ✨
