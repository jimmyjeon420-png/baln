# Deep Dive Components 사용 가이드

투자심사보고서 UI 컴포넌트 라이브러리

---

## 📦 컴포넌트 목록

### 1. **ExecutiveSummary** - 투자 의견 요약
투자 추천 의견, 목표 주가, 핵심 근거를 표시하는 카드

### 2. **CompanyOverview** - 회사 개요
회사 기본 정보 (설립연도, CEO, 시가총액 등) 2-column 그리드

### 3. **BusinessModel** - 비즈니스 모델 분석
(다른 Agent 작업)

### 4. **FinancialAnalysis** - 재무 분석
(다른 Agent 작업)

---

## 🎨 사용 예시

### ExecutiveSummary 사용법

```typescript
import { ExecutiveSummary } from '@/src/components/deep-dive';

// 매수 추천 예시
<ExecutiveSummary
  recommendation="BUY"
  confidenceRating={4}
  currentPrice={85000}
  targetPrice={120000}
  keyPoints={[
    'AI 반도체 시장 점유율 1위 유지',
    '2024년 매출 35% 성장 예상',
    '신규 HBM3E 양산 개시로 마진 개선',
  ]}
  analystName="김철수 (삼성증권)"
  publishedDate="2024-01-15"
/>

// 매도 추천 예시
<ExecutiveSummary
  recommendation="SELL"
  confidenceRating={3}
  currentPrice={50000}
  targetPrice={35000}
  keyPoints={[
    '미국 금리 인상으로 밸류에이션 부담',
    '경쟁사 대비 영업이익률 저조',
    '주력 제품 판매 둔화',
  ]}
/>

// 보유 추천 예시
<ExecutiveSummary
  recommendation="HOLD"
  confidenceRating={3}
  currentPrice={100000}
  targetPrice={105000}
  keyPoints={[
    '단기 상승 모멘텀 부족',
    '장기 성장 잠재력은 유효',
    '배당 수익률 3.5% 양호',
  ]}
/>
```

---

### CompanyOverview 사용법

```typescript
import { CompanyOverview } from '@/src/components/deep-dive';

<CompanyOverview
  companyName="삼성전자"
  foundedYear={1969}
  ceo="한종희"
  headquarters="경기도 수원시"
  industry="반도체/전자"
  marketCap={400_000_000_000_000} // 400조
  employeeCount={267000}
  ipoDate="1975-06-11"
  ticker="005930"
  website="www.samsung.com"
/>

// 최소 정보만 제공
<CompanyOverview
  companyName="카카오"
  industry="인터넷 플랫폼"
  marketCap={25_000_000_000_000} // 25조
/>
```

---

## 🎨 Props 타입 정의

### ExecutiveSummaryProps

```typescript
interface ExecutiveSummaryProps {
  /** 투자 추천 (매수/매도/보유) */
  recommendation: 'BUY' | 'SELL' | 'HOLD';

  /** 신뢰도 별점 (1-5) */
  confidenceRating: 1 | 2 | 3 | 4 | 5;

  /** 현재 주가 */
  currentPrice: number;

  /** 목표 주가 */
  targetPrice: number;

  /** 핵심 근거 (최대 5개) */
  keyPoints: string[];

  /** 애널리스트 이름 (옵션) */
  analystName?: string;

  /** 발행일 (옵션) */
  publishedDate?: string;

  /** 초기 펼침 상태 (기본: true) */
  initiallyExpanded?: boolean;
}
```

### CompanyOverviewProps

```typescript
interface CompanyOverviewProps {
  /** 회사명 */
  companyName: string;

  /** 설립 연도 */
  foundedYear?: number;

  /** CEO */
  ceo?: string;

  /** 본사 위치 */
  headquarters?: string;

  /** 업종 */
  industry?: string;

  /** 시가총액 (원) */
  marketCap?: number;

  /** 직원 수 */
  employeeCount?: number;

  /** 상장일 */
  ipoDate?: string;

  /** 웹사이트 URL */
  website?: string;

  /** 티커 심볼 */
  ticker?: string;

  /** 초기 펼침 상태 (기본: true) */
  initiallyExpanded?: boolean;
}
```

---

## 🎨 스타일 특징

### 공통
- **카드 형식**: borderRadius 16, padding 20
- **다크모드 지원**: useTheme() 훅 사용
- **접기/펼치기**: LayoutAnimation으로 부드러운 전환
- **그림자 효과**: elevation 3 (Android), shadowRadius 4 (iOS)

### ExecutiveSummary 색상
- **매수 (BUY)**: 초록 (#4CAF50)
- **매도 (SELL)**: 빨강 (#CF6679)
- **보유 (HOLD)**: 노랑 (#FFD700)

### CompanyOverview 레이아웃
- **2-column 그리드**: 각 항목 47% 너비
- **아이콘 컬러**: 각 정보 유형별 고유 색상
- **시가총액 포맷**: 조/억 단위 자동 변환
- **직원 수 포맷**: 만명 단위 자동 변환

---

## 🧪 테스트

### TypeScript 검증
```bash
npx tsc --noEmit
# → deep-dive 컴포넌트 에러 없음 ✅
```

### 시뮬레이터에서 확인
```typescript
// 테스트 화면 예시
import { ExecutiveSummary, CompanyOverview } from '@/src/components/deep-dive';

export default function TestScreen() {
  return (
    <ScrollView style={{ padding: 16 }}>
      <ExecutiveSummary
        recommendation="BUY"
        confidenceRating={4}
        currentPrice={85000}
        targetPrice={120000}
        keyPoints={[
          'AI 반도체 시장 점유율 1위',
          '매출 35% 성장 예상',
          'HBM3E 양산 개시',
        ]}
      />

      <CompanyOverview
        companyName="삼성전자"
        foundedYear={1969}
        ceo="한종희"
        headquarters="경기도 수원시"
        industry="반도체/전자"
        marketCap={400_000_000_000_000}
        employeeCount={267000}
      />
    </ScrollView>
  );
}
```

---

## 📝 개발 노트

**개발자**: Agent 2 (UI 컴포넌트 개발자)
**작업일**: 2026-02-11
**파일 크기**:
- ExecutiveSummary.tsx: 11KB
- CompanyOverview.tsx: 9.0KB

**제약사항 준수**:
- ✅ TypeScript 엄격 모드
- ✅ useTheme() 다크모드 지원
- ✅ 파일 충돌 없음 (독립적 작업)
- ✅ Props 타입 export 완료
