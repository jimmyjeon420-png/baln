# Agent 5: 3탭 구조 전환 (Architecture Refactoring)

## 🎯 당신의 미션
**현재 12개 탭 → 3개 탭**으로 앱 구조를 대폭 단순화하세요.
이것은 **가장 중요하면서도 위험한 작업**입니다.

⚠️ **경고**: 이 작업은 **Agent 1~4가 모두 완료된 후 마지막에 실행**되어야 합니다.

## 📌 역할 (Role)
- **당신은 "아키텍처 총괄"입니다.**
- **이 작업은 다른 Agent들과 충돌 위험이 가장 높습니다.**
- **반드시 사용자에게 "Agent 1~4 작업이 완료되었나요?"를 확인하세요.**

---

## ✅ 전담 파일 (수정 가능)
- `app/(tabs)/_layout.tsx` ← **핵심 파일** (탭 구조 정의)
- `app/(tabs)/index.tsx` ← **오늘 탭** (Agent 1, 2의 컴포넌트 통합)
- `app/(tabs)/checkup.tsx` ← **분석 탭** (새로 만들기, diagnosis + rebalance 통합)
- `app/(tabs)/more.tsx` ← **전체 탭** (새로 만들기, 나머지 통합)

## ❌ 절대 수정 금지 파일
- `src/components/**/*.tsx` ← Agent 1~4가 만든 컴포넌트 (읽기만 가능)
- `src/hooks/*.ts` ← 공유 훅 (수정 금지)
- `src/types/*.ts` ← 공유 타입 (수정 금지)

---

## 🏗️ 현재 상태 → 목표 상태

### 현재 (12개 탭)
```
app/(tabs)/
  ├── index.tsx         (홈)
  ├── diagnosis.tsx     (진단)
  ├── rebalance.tsx     (처방전)
  ├── lounge.tsx        (라운지)
  ├── insights.tsx      (인사이트)
  ├── profile.tsx       (프로필)
  ├── journal.tsx       (감정 일지)
  ├── invest.tsx        (투자)
  ├── menu.tsx          (메뉴)
  ├── scan.tsx          (스캔)
  └── strategy.tsx      (전략)
```

### 목표 (3개 탭)
```
app/(tabs)/
  ├── index.tsx         ← 오늘 탭 (Today)
  ├── checkup.tsx       ← 분석 탭 (Checkup)
  └── more.tsx          ← 전체 탭 (More)
```

---

## 🏗️ 구현해야 할 것

### 1. app/(tabs)/_layout.tsx (탭 레이아웃)

#### 기능 요구사항
- **3개 탭만 표시**: 오늘 / 분석 / 전체
- **탭바 아이콘**: 홈, 차트, 메뉴
- **배지**: 위기 감지 시 "오늘" 탭에 빨간 점

#### 코드 구조
```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10b981', // 초록
        tabBarInactiveTintColor: '#6b7280', // 회색
        tabBarStyle: {
          backgroundColor: '#121212', // 다크
          borderTopWidth: 0,
        },
      }}
    >
      {/* 오늘 탭 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 분석 탭 */}
      <Tabs.Screen
        name="checkup"
        options={{
          title: '분석',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 전체 탭 */}
      <Tabs.Screen
        name="more"
        options={{
          title: '전체',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 2. app/(tabs)/index.tsx (오늘 탭)

#### 구성 (위→아래)
1. **Pulse 요약**: "총 자산 1.2억 | 건강 A | 어제 대비 +0.3%"
2. **맥락 카드** (Agent 1): `<ContextCard />`
3. **예측 투표** (Agent 2): `<PredictionPollCard />` × 3
4. **어제 복기** (Agent 2): `<YesterdayReviewSection />`
5. **또래 비교**: "당신은 상위 23%입니다"

#### 코드 구조
```typescript
import { ScrollView, RefreshControl } from 'react-native';
import { ContextCard } from '@/src/components/home/ContextCard';
import { PredictionPollCard } from '@/src/components/predictions/PredictionPollCard';
import { YesterdayReviewSection } from '@/src/components/predictions/YesterdayReviewSection';
import { PulseHeader } from '@/src/components/home/PulseHeader';
import { PeerComparisonCard } from '@/src/components/home/PeerComparisonCard';

import { useContextCard } from '@/src/hooks/useContextCard';
import { usePollsWithMyVotes } from '@/src/hooks/usePredictions';

export default function TodayTab() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: contextCard, refetch: refetchContext } = useContextCard();
  const { data: polls, refetch: refetchPolls } = usePollsWithMyVotes();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchContext(), refetchPolls()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      className="bg-gray-50 dark:bg-black"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Pulse 헤더 */}
      <PulseHeader />

      {/* 맥락 카드 */}
      <View className="px-4 mt-4">
        <ContextCard data={contextCard} />
      </View>

      {/* 예측 투표 */}
      <View className="px-4 mt-6">
        <Text className="text-xl font-bold mb-3">🎯 오늘의 예측</Text>
        {polls?.slice(0, 3).map(poll => (
          <PredictionPollCard key={poll.id} poll={poll} />
        ))}
      </View>

      {/* 어제 복기 */}
      <View className="px-4 mt-6">
        <YesterdayReviewSection />
      </View>

      {/* 또래 비교 */}
      <View className="px-4 mt-6 mb-8">
        <PeerComparisonCard />
      </View>
    </ScrollView>
  );
}
```

### 3. app/(tabs)/checkup.tsx (분석 탭)

#### 구성
- **기존 diagnosis.tsx + rebalance.tsx 통합**
- **상단 탭**: "AI 진단" / "처방전" 전환
- **AI 분석 도구 바로가기** (Agent 4):
  - 종목 딥다이브
  - What-If 시뮬
  - 세금 리포트
  - AI CFO 채팅

#### 코드 구조
```typescript
import { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

// 기존 컴포넌트 재사용
import DiagnosisContent from './diagnosis'; // 기존 파일에서 export
import RebalanceContent from './rebalance'; // 기존 파일에서 export

export default function CheckupTab() {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'rebalance'>('diagnosis');

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      {/* 상단 탭 스위처 */}
      <View className="flex-row bg-white dark:bg-gray-900 px-4 pt-4">
        <TabButton
          label="AI 진단"
          active={activeTab === 'diagnosis'}
          onPress={() => setActiveTab('diagnosis')}
        />
        <TabButton
          label="처방전"
          active={activeTab === 'rebalance'}
          onPress={() => setActiveTab('rebalance')}
        />
      </View>

      {/* 콘텐츠 */}
      {activeTab === 'diagnosis' ? (
        <DiagnosisContent />
      ) : (
        <RebalanceContent />
      )}

      {/* AI 도구 바로가기 (하단 고정) */}
      <View className="bg-white dark:bg-gray-900 p-4 border-t">
        <Text className="text-sm font-bold mb-3">🤖 AI 심화 분석</Text>
        <View className="grid grid-cols-2 gap-2">
          <AIToolButton
            icon="📈"
            label="종목 딥다이브"
            onPress={() => router.push('/analysis/deep-dive')}
          />
          <AIToolButton
            icon="🧪"
            label="What-If 시뮬"
            onPress={() => router.push('/analysis/what-if')}
          />
          <AIToolButton
            icon="🧾"
            label="세금 리포트"
            onPress={() => router.push('/analysis/tax-report')}
          />
          <AIToolButton
            icon="💬"
            label="AI CFO"
            onPress={() => router.push('/analysis/cfo-chat')}
          />
        </View>
      </View>
    </View>
  );
}
```

### 4. app/(tabs)/more.tsx (전체 탭)

#### 구성
- **크레딧 표시** (Agent 3): `<CreditDisplay />`
- **뱃지 진열장** (Agent 3): `<BadgeShowcase />`
- **커뮤니티 바로가기**: VIP 라운지, 투자 거장 인사이트
- **부동산 자산 관리**
- **설정**: 알림, 프로필, 구독, 계정 삭제

#### 코드 구조
```typescript
import { ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { CreditDisplay } from '@/src/components/common/CreditDisplay';
import { BadgeShowcase } from '@/src/components/profile/BadgeShowcase';

export default function MoreTab() {
  return (
    <ScrollView className="bg-gray-50 dark:bg-black p-4">
      {/* 크레딧 */}
      <CreditDisplay />

      {/* 뱃지 */}
      <View className="mt-6">
        <BadgeShowcase />
      </View>

      {/* 커뮤니티 */}
      <SectionHeader title="🏆 커뮤니티" />
      <MenuButton
        icon="💎"
        label="VIP 라운지"
        badge="Premium"
        onPress={() => router.push('/settings/lounge')}
      />
      <MenuButton
        icon="📚"
        label="투자 거장 인사이트"
        onPress={() => router.push('/settings/gurus')}
      />

      {/* 자산 관리 */}
      <SectionHeader title="🏠 자산 관리" />
      <MenuButton
        icon="🏡"
        label="부동산"
        onPress={() => router.push('/realestate')}
      />

      {/* 설정 */}
      <SectionHeader title="⚙️ 설정" />
      <MenuButton
        icon="🔔"
        label="알림 설정"
        onPress={() => router.push('/settings/notifications')}
      />
      <MenuButton
        icon="👤"
        label="프로필"
        onPress={() => router.push('/settings/profile')}
      />
      <MenuButton
        icon="⭐"
        label="Premium 구독"
        badge="₩4,900/월"
        onPress={() => router.push('/settings/subscription')}
      />
      <MenuButton
        icon="❓"
        label="고객센터"
        onPress={() => router.push('/settings/help')}
      />
      <MenuButton
        icon="🗑️"
        label="계정 삭제"
        destructive
        onPress={() => router.push('/settings/delete-account')}
      />
    </ScrollView>
  );
}
```

---

## 🚨 중요 주의사항

### 1. 실행 순서 (CRITICAL)
```
1. Agent 1 완료 확인 → ContextCard 컴포넌트 존재
2. Agent 2 완료 확인 → Prediction 컴포넌트들 존재
3. Agent 3 완료 확인 → Credit 컴포넌트들 존재
4. Agent 4 완료 확인 → AI 도구 화면들 존재
5. ✅ Agent 5 시작 (당신)
```

**반드시 사용자에게 "Agent 1~4가 완료되었나요?"를 확인하세요.**

### 2. 기존 파일 백업
```bash
# 작업 전 기존 탭 파일들 백업 (사용자에게 실행하라고 안내)
mkdir -p app/\(tabs\)/backup
cp app/\(tabs\)/*.tsx app/\(tabs\)/backup/
```

### 3. 마이그레이션 전략
- **한 번에 하지 말고 단계별로**:
  1. `_layout.tsx` 먼저 수정 (3개 탭으로 변경)
  2. `index.tsx` 리팩터링 (Agent 1, 2 컴포넌트 통합)
  3. `checkup.tsx` 생성 (diagnosis + rebalance 통합)
  4. `more.tsx` 생성 (나머지 통합)

### 4. 테스트
- **각 단계마다 빌드 확인**:
  ```bash
  npx expo start
  ```
- **TypeScript 에러 0개 확인**:
  ```bash
  npx tsc --noEmit
  ```

### 5. 기존 라우팅 유지
- `/settings/*` 화면들은 그대로 유지
- `app/analysis/*` (Agent 4가 만든 화면) 유지
- 탭만 3개로 줄이고, 하위 화면은 건드리지 않기

---

## ✅ 완료 체크리스트

- [ ] Agent 1~4 완료 확인 (사용자에게 질문)
- [ ] 기존 탭 파일 백업
- [ ] `_layout.tsx` 수정 (3개 탭)
- [ ] `index.tsx` 리팩터링 (오늘 탭)
- [ ] `checkup.tsx` 생성 (분석 탭)
- [ ] `more.tsx` 생성 (전체 탭)
- [ ] 빌드 확인 (`npx expo start`)
- [ ] TypeScript 에러 0개 확인
- [ ] Pull-to-refresh 동작 확인
- [ ] 다크 모드 확인

---

## 🎯 성공 기준

**사용자가 "탭이 3개밖에 없으니까 훨씬 깔끔하네"라고 느끼면 성공입니다.**

⚠️ **다시 한번**: 반드시 Agent 1~4가 완료된 후 시작하세요!

시작하세요! 🏗️
