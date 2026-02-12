# Deep Dive 투자심사보고서 UI 컴포넌트 가이드

Agent 3가 구현한 Business Model & Financial Analysis 컴포넌트입니다.

---

## 1. BusinessModel 컴포넌트

**위치**: `src/components/deep-dive/BusinessModel.tsx`

**역할**: 기업의 사업 모델을 분석하여 표시합니다.

### Props

```typescript
interface BusinessModelProps {
  revenueModel: string;      // 수익 구조 설명
  moat: string[];            // 핵심 경쟁력 목록
  tam: string;               // 시장 규모 (TAM) 설명
  growthStrategy: string[];  // 성장 전략 목록
  notes?: string;            // 추가 설명 (선택)
}
```

### 사용 예시

```tsx
import { BusinessModel } from '@/components/deep-dive';

<BusinessModel
  revenueModel="광고 수익 85%, 구독 수익 15%로 구성. 광고는 검색광고와 디스플레이로 나뉨."
  moat={[
    "네트워크 효과: 30억 월간 활성 사용자",
    "데이터 우위: 15년간 축적된 사용자 행동 데이터",
    "브랜드 인지도: 글로벌 Top 3 소셜미디어",
    "기술 장벽: 머신러닝 알고리즘 특허 500건+",
  ]}
  tam="글로벌 디지털 광고 시장 $800B (2024), 연평균 성장률 8%"
  growthStrategy={[
    "신흥 시장 진출: 인도, 동남아시아 사용자 기반 확대",
    "AI 기능 강화: 생성형 AI 통합으로 사용자 경험 개선",
    "커머스 확장: 쇼핑 기능 강화로 광고주 매력도 증가",
    "메타버스 투자: VR/AR 기기 보급으로 차세대 플랫폼 선점",
  ]}
  notes="2024년 광고 수익 성장률 둔화 중이나, AI 광고 자동화로 마진 개선 중"
/>
```

### 화면 구성

- 💰 **수익 구조**: 카드 형식, 텍스트 설명
- 🏰 **핵심 경쟁력**: 보라색 불릿 포인트 리스트
- 🌍 **시장 규모**: 카드 형식, TAM 수치
- 📈 **성장 전략**: 초록색 불릿 포인트 리스트
- ℹ️ **추가 노트**: 회색 인포 박스 (선택)

---

## 2. FinancialAnalysis 컴포넌트

**위치**: `src/components/deep-dive/FinancialAnalysis.tsx`

**역할**: 기업의 재무 실적과 핵심 지표를 테이블로 표시합니다.

### Props

```typescript
interface YearlyFinancialData {
  year: string;
  revenue: number;          // 매출액 (원)
  operatingIncome: number;  // 영업이익 (원)
  netIncome: number;        // 순이익 (원)
}

interface KeyMetrics {
  roe: number;      // ROE (%)
  roic: number;     // ROIC (%)
  debtRatio: number; // 부채비율 (%)
}

interface FinancialAnalysisProps {
  yearlyData: YearlyFinancialData[];  // 최근 3년 재무 데이터
  keyMetrics: KeyMetrics;             // 핵심 지표
  cashFlowSummary: string;            // 현금흐름 요약
}
```

### 사용 예시

```tsx
import { FinancialAnalysis } from '@/components/deep-dive';

<FinancialAnalysis
  yearlyData={[
    {
      year: '2022',
      revenue: 100_000_000_000_000,      // 100조
      operatingIncome: 20_000_000_000_000, // 20조
      netIncome: 15_000_000_000_000,     // 15조
    },
    {
      year: '2023',
      revenue: 120_000_000_000_000,      // 120조
      operatingIncome: 25_000_000_000_000, // 25조
      netIncome: 18_000_000_000_000,     // 18조
    },
    {
      year: '2024',
      revenue: 150_000_000_000_000,      // 150조
      operatingIncome: 30_000_000_000_000, // 30조
      netIncome: 22_000_000_000_000,     // 22조
    },
  ]}
  keyMetrics={{
    roe: 22.5,       // ROE 22.5%
    roic: 18.3,      // ROIC 18.3%
    debtRatio: 35.2, // 부채비율 35.2%
  }}
  cashFlowSummary="영업활동현금흐름은 연평균 25조로 안정적이며, 자본지출은 신규 데이터센터 건설로 증가 중. 잉여현금흐름(FCF)은 15조 수준을 유지하여 배당 및 자사주 매입 여력 충분."
/>
```

### 화면 구성

#### 💼 실적 추이 테이블
- 가로 스크롤 지원
- 헤더 배경색: 보라색 반투명 (#9333EA20)
- 증감률 표시: 초록(+), 빨강(-)
- 숫자 포맷: 조/억 단위 자동 변환

| 항목     | 2022 | 2023      | 2024      |
|----------|------|-----------|-----------|
| 매출액   | 100조 | 120조 (+20.0%) | 150조 (+25.0%) |
| 영업이익 | 20조  | 25조 (+25.0%)  | 30조 (+20.0%)  |
| 순이익   | 15조  | 18조 (+20.0%)  | 22조 (+22.2%)  |

#### 🎯 핵심 지표
- 3개 카드 레이아웃 (ROE, ROIC, 부채비율)
- 초록색 강조 (#10B981)

#### 💵 현금흐름
- 텍스트 설명 카드

---

## 3. 통합 예시: Deep Dive 화면

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { BusinessModel, FinancialAnalysis } from '@/components/deep-dive';

export default function DeepDiveScreen() {
  const [activeTab, setActiveTab] = useState<'business' | 'financial'>('business');

  return (
    <View style={styles.container}>
      {/* 탭 네비게이션 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'business' && styles.tabActive]}
          onPress={() => setActiveTab('business')}
        >
          <Text style={styles.tabText}>비즈니스 모델</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'financial' && styles.tabActive]}
          onPress={() => setActiveTab('financial')}
        >
          <Text style={styles.tabText}>재무 분석</Text>
        </TouchableOpacity>
      </View>

      {/* 컴포넌트 렌더링 */}
      {activeTab === 'business' ? (
        <BusinessModel
          revenueModel="광고 수익 85%, 구독 수익 15%"
          moat={["네트워크 효과", "데이터 우위", "브랜드 인지도"]}
          tam="글로벌 광고 시장 $800B"
          growthStrategy={["신흥 시장 진출", "AI 기능 강화"]}
        />
      ) : (
        <FinancialAnalysis
          yearlyData={[/* ... */]}
          keyMetrics={{ roe: 22.5, roic: 18.3, debtRatio: 35.2 }}
          cashFlowSummary="영업활동현금흐름 안정적"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#9333EA',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
```

---

## 4. 스타일 가이드

### 색상 팔레트
- **배경**: `#121212` (메인), `#1F1F1F` (카드)
- **텍스트**: `#FFF` (헤더), `#E5E7EB` (본문), `#9CA3AF` (보조)
- **강조**: `#9333EA` (보라), `#10B981` (초록), `#EF4444` (빨강)
- **테두리**: `#2A2A2A`

### 타이포그래피
- **헤더**: 22px, 800 weight
- **섹션 타이틀**: 16px, 700 weight
- **본문**: 14px, 400 weight
- **테이블 헤더**: 13px, 700 weight
- **테이블 값**: 14px, 700 weight

### 간격
- **섹션 간격**: 24px
- **카드 내부 패딩**: 16px
- **리스트 아이템 간격**: 12px

---

## 5. 숫자 포맷팅

### formatKRW 함수 사용
```typescript
import { formatKRW } from '@/utils/formatters';

formatKRW(100_000_000_000_000, true); // "100조"
formatKRW(1_500_000_000_000, true);   // "1.5조"
formatKRW(50_000_000_000, true);      // "500억"
formatKRW(1_000_000, false);          // "₩1,000,000"
```

### 증감률 색상
- **양수 (+)**: 초록 `#10B981`
- **음수 (-)**: 빨강 `#EF4444`
- **0**: 회색 `#6B7280`

---

## 6. 테이블 구현 방법

**React Native Table 라이브러리를 사용하지 않고 View로 직접 구현:**

```tsx
<View style={styles.table}>
  {/* 헤더 행 */}
  <View style={styles.tableRow}>
    <View style={[styles.tableCell, styles.tableCellHeader]}>
      <Text>항목</Text>
    </View>
    {/* ... */}
  </View>

  {/* 데이터 행 */}
  <View style={styles.tableRow}>
    <View style={styles.tableCell}>
      <Text>매출액</Text>
    </View>
    {/* ... */}
  </View>
</View>
```

**핵심 스타일:**
- `flexDirection: 'row'` (가로 배치)
- `borderBottomWidth: 1` (행 구분선)
- `borderRightWidth: 1` (열 구분선)
- `width: 100` (고정 너비)

---

## 7. 완료 체크리스트

- ✅ `BusinessModel.tsx` 생성
- ✅ `FinancialAnalysis.tsx` 생성
- ✅ `index.ts` export 정리
- ✅ TypeScript 에러 0개
- ✅ 테이블 가로 스크롤 지원
- ✅ 숫자 포맷팅 (조/억 단위)
- ✅ 증감률 색상 표시 (초록/빨강)
- ✅ 아이콘 추가 (💰, 🏰, 🌍, 📈, 💼, 🎯, 💵)
- ✅ ScrollView 래핑

---

**Agent 3 작업 완료** ✨

두 컴포넌트 모두 TypeScript 에러 없이 완성되었습니다!
