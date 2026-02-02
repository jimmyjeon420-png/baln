# Berkshire Hathaway 철학 기반 5-Tab 아키텍처

## 🏛️ 아키텍처 개요

**"Value + Timing" 하이브리드 시스템**

기존의 단순한 시장 타이밍(Kostolany Egg) 분석에 **가치 투자(Buffett 철학)**를 결합하여, 더욱 깊이 있는 투자 의사결정을 지원합니다.

```
Kostolany Timing Logic (타이밍)
        ↓
    하이브리드 분석 ← ValueLogic (안전도)
        ↓
   최종 액션 제시
```

---

## 📱 5-Tab 구조

### **Tab 1: Insight 🧠 (시장 심리)**

**목적**: 시장의 감정 상태를 이해하고, 오늘의 투자 질문으로 자기 성찰

**구성**:
- **Fear & Greed Index** (Mock): 0-100 스케일로 현재 시장 심리 표시
  - FEAR (20) → 기회
  - CAUTIOUS (40)
  - NEUTRAL (50)
  - OPTIMISTIC (70)
  - GREED (90) → 위험
- **Today's Question**: 매일 다른 질문을 제시
  - "당신의 포트폴리오에서 가장 위험한 자산은?"
  - "지난 3개월간 최고의 결정은?"
  - "당신의 매수/매도 규칙이 정말 작동하고 있나?"

**UI**:
- 큰 감정 이모지 (😨 🤑 등)
- 강도 시각화 (프로그레스 바)
- 포트폴리오 요약

---

### **Tab 2: My Moat 🛡️ (자산 분류 + 안전도)**

**목적**: 포트폴리오를 "공격형(성장)"과 "방어형(가치/현금)"로 분류하고, Safety Margin Score 표시

**핵심 개념**:
- **Moat (해자)**: Buffett이 강조하는 경쟁 우위. 여기서는 포트폴리오의 "방어력"
- **Safety Margin**: 현재 포트폴리오의 안전도 - 필요 안전도 = 여유도

**구성**:
```
📊 Safety Margin Score: +15
  (목표: 55, 현재: 70)

⚔️ Offense (공격형): 40%
  - Bitcoin (위험도: 20)
  - Tesla Stock (위험도: 40)

🛡️ Defense (방어형): 60%
  - Cash (안전도: 100)
  - Bonds (안전도: 80)
```

**자산 안전도 점수**:
```
극도 위험 (20)    : 암호화폐
높은 위험 (40)    : 성장주, 기술주 (AAPL, NVIDIA, TSLA)
중간 (60)        : 배당주, 혼합 펀드
낮은 위험 (80)   : 채권, ETF
최대 안전 (100)  : 현금, 스테이블코인
```

**권장**:
- 보수적 사용자: Safety Score >= 70
- 중도 사용자: Safety Score >= 55
- 공격적 사용자: Safety Score >= 40

---

### **Tab 3: The Brain 🧬 (Timing + Value 하이브리드)**

**목적**: KostolanyLogic(타이밍)과 ValueLogic(가치)을 통합하여 최종 액션 제시

**하이브리드 분석 매트릭스**:

| Timing | Value 안전도 | 최종 액션 | 설명 |
|--------|-------------|---------|------|
| **SELL** | 높음 (70+) | **보유 (좋은 자산)** | 시장 과열이지만, 자산은 좋음 |
| SELL | 낮음 (<50) | **즉시 매도** | 시장 과열 + 포트폴리오 위험 |
| SELL | 중간 (50-70) | **점진적 매도** | 이익 실현 고려 |
| **BUY** | 높음 (70+) | **공격적 매수** | 금리 고점 + 좋은 자산 = 최고 기회 |
| BUY | 낮음 (<50) | **신중 매수** | 기회지만 포트폴리오 위험 |
| BUY | 중간 (50-70) | **정상 매수** | 적립식 추천 |
| **HOLD** | 낮음 (<50) | **지금 리밸런싱** | 시장 중립이지만 포트폴리오 위험 |
| HOLD | 중간+ (50+) | **보유 유지** | 건강한 상태 |

**UI Flow**:
1. 사용자가 금리 추세 선택 (고점/하락/저점/상승)
2. Timing 분석 (Egg 단계)
3. Value 분석 (안전도 점수)
4. **하이브리드 신호 생성** + 최종 액션
5. **"Action Button"** → Tab 4로 이동

**우선순위 표시**:
- 🚨 CRITICAL: 즉시 조치 필요
- 🔴 HIGH: 빠른 조치 권장
- 🟡 MEDIUM: 검토 권장
- 🟢 LOW: 모니터링

---

### **Tab 4: Action ⚙️ (리밸런싱 실행)**

**목적**: Tab 3에서 제안된 액션을 구체적인 리밸런싱 계획으로 변환

**기능**:
- 현재 배분 vs 목표 배분 비교
- 각 자산별 매수/매도 금액 제시
- **시뮬레이션**: 변경 전에 미리 확인
- **Apply**: 제안된 리밸런싱 저장

**예시**:
```
💚 Bitcoin 매수 $1,500
   현재 30% → 목표 40%

❤️ Tesla 매도 $800
   현재 25% → 목표 15%

🟡 Cash 보유
   현재 45% → 목표 45%
```

**특징**:
- **Tab 3에서 자동 전달**: "⚙️ 매수하기 →" 버튼 클릭 시 자동으로 제안됨
- Modal로 상세 확인 가능
- 실행 전 시뮬레이션으로 검증

---

### **Tab 5: My Principles 📜 (투자 Constitution)**

**목적**: 사용자가 자신의 투자 규칙을 정의하고 저장. 시장 변동에 흔들리지 않기 위한 "헌법"

**구성**:
1. **위험 허용도 선택**
   - 🛡️ 보수적 (Safety Score >= 70)
   - ⚖️ 중도 (Safety Score >= 55)
   - ⚔️ 공격적 (Safety Score >= 40)

2. **포트폴리오 제약**
   - 최대 암호화폐 비중 (기본: 30%)
   - 최소 현금 비중 (기본: 10%)
   - 배당금 우선 (Toggle)

3. **투자 규칙** (자유 입력)
   - **매수 규칙**: "금리가 고점일 때, VIX > 30"
   - **매도 규칙**: "수익 30% 이상, 기본 이야기 깨짐"
   - **보유 규칙**: "기본 이야기가 유지되는 한"

**사용 방식**:
- AsyncStorage에 저장 (앱 재시작 후에도 유지)
- 매일 아침 읽고 오늘 결정 점검
- 시장이 격변할 때 원칙으로 돌아가기

**예시 (Warren Buffett 스타일)**:
```
📋 나의 투자 헌법

위험 허용도: ⚖️ 중도

포트폴리오 제약:
- 최대 암호화폐: 20%
- 최소 현금: 15%
- 배당금 우선: YES

💚 나의 매수 규칙:
1. 금리가 고점(Fed Funds > 5%)
2. VIX > 30 (시장 공포)
3. S&P 500이 200일 MA 아래
4. 최소한 2주 동안 하락 추세

❤️나의 매도 규칙:
1. 수익이 30% 이상
2. PER이 시장 평균보다 40% 높음
3. 기본 이야기가 깨짐 (실적 악화)
4. 더 나은 기회 발견

🟡 나의 보유 규칙:
- 기본 이야기가 유지되는 동안
- 위험 허용도 범위 내
```

---

## 🔄 데이터 흐름

```
사용자 입력 (금리 추세)
    ↓
┌───────────────────────────────────────┐
│                                       │
│  Tab 3: The Brain (하이브리드 분석)   │
│                                       │
│  ├─ KostolanyLogic                   │
│  │  └─ Egg 단계 결정 (매수/보유/매도)  │
│  │                                   │
│  ├─ ValueLogic                       │
│  │  ├─ 자산별 안전도 계산            │
│  │  ├─ 포트폴리오 안전도 (가중평균)  │
│  │  └─ Safety Margin 계산            │
│  │                                   │
│  └─ HybridSignal                     │
│     └─ 최종 액션 (CRITICAL~LOW)     │
│                                       │
└───────────────────────────────────────┘
        ↓ [Action Button]
┌───────────────────────────────────────┐
│                                       │
│  Tab 4: Action (리밸런싱 실행)       │
│                                       │
│  ├─ 현재 vs 목표 배분 비교           │
│  ├─ 매수/매도 금액 제시              │
│  └─ 시뮬레이션 & 적용                │
│                                       │
└───────────────────────────────────────┘
```

---

## 🔧 기술 스택

### 새 파일들

#### **타입**
- `src/types/kostolany.ts` ✅ (기존)
- `src/types/coaching.ts` ✅ (기존)

#### **서비스 - 핵심**
- `src/services/KostolanyLogic.ts` ✅ (기존 - Timing)
- `src/services/ValueLogic.ts` ✨ **신규** (Value 분석)
- `src/services/CoachingService.ts` ✅ (기존)
- `src/services/mockMarketData.ts` ✅ (기존)

#### **탭 화면**
- `app/(tabs)/_layout.tsx` ✨ **신규** - 탭 네비게이션
- `app/(tabs)/index.tsx` ✨ **신규** - Tab 1: Insight
- `app/(tabs)/portfolio.tsx` ✨ **신규** - Tab 2: My Moat
- `app/(tabs)/coach.tsx` ✨ **신규** - Tab 3: The Brain
- `app/(tabs)/rebalance.tsx` ✨ **신규** - Tab 4: Action
- `app/(tabs)/settings.tsx` ✨ **신규** - Tab 5: My Principles

#### **Expo Router**
- `app/_layout.tsx` ✨ **신규** - Root layout

### 의존성
- `expo-router`: 파일 기반 라우팅
- `expo-status-bar`: 상태바
- `@react-native-async-storage/async-storage`: 원칙 저장

---

## 🎯 ValueLogic 상세 설명

### 1️⃣ **자산 안전도 매핑**
```typescript
Bitcoin/Ethereum     → 20 (극도 위험)
Tech Stocks (AAPL)   → 40 (높은 위험)
Dividend Stocks      → 60 (중간)
Bonds/ETF            → 80 (낮은 위험)
Cash                 → 100 (최대 안전)
```

### 2️⃣ **포트폴리오 안전도 계산**
```typescript
Portfolio Safety Score = Σ(자산안전도 × 비중)

예: 30% Bitcoin(20) + 70% Cash(100)
  = 0.3 × 20 + 0.7 × 100 = 76
```

### 3️⃣ **Safety Margin**
```typescript
Safety Margin = 현재 안전도 - 필요 안전도

보수적 (CONSERVATIVE): 필요 70 이상
중도 (MODERATE): 필요 55 이상
공격적 (AGGRESSIVE): 필요 40 이상

예: 현재 76, 필요 55 → Margin = +21 (매우 안전)
```

### 4️⃣ **하이브리드 신호**
```typescript
예시 1: Timing "SELL" + Value "High(70+)"
  → 최종: "HOLD_GOOD_ASSETS"
  → 설명: "시장 과열이지만 자산은 좋음. 우량 자산은 보유"

예시 2: Timing "BUY" + Value "High(70+)"
  → 최종: "BUY_AGGRESSIVE"
  → 설명: "금리 고점 + 좋은 자산 = 최고의 기회"

예시 3: Timing "HOLD" + Value "Low(<50)"
  → 최종: "REBALANCE_NOW"
  → 설명: "시장은 중립이지만 포트폴리오가 위험. 리밸런싱 필요"
```

---

## 💡 사용 시나리오

### **시나리오 1: Bear Market (2008년 금융위기 같은 상황)**

```
1️⃣ Insight: 시장 심리 = FEAR (20)
   "다른 사람들이 도망칠 때 매수하기 좋은 시점입니다"

2️⃣ My Moat: 포트폴리오 안전도 = 75 (건강)

3️⃣ The Brain:
   입력: 금리 추세 = PEAK (고점)
   → Timing: BUY (금리 고점 = 매수 신호)
   → Value: 75 (좋은 자산들)
   → 최종: BUY_AGGRESSIVE (공격적 매수)
   → 우선순위: HIGH

4️⃣ Action:
   - Bitcoin 10% 매수 ($5,000)
   - Tech Stock 5% 매수 ($2,500)
   - 시뮬레이션 확인 후 실행

5️⃣ My Principles:
   - 원칙 확인: "금리 고점일 때 매수" ✅
   - 오늘의 질문: "포트폴리오가 충격에 견디나?" ✅ (Yes)
   - 매도 규칙: 아직 적용 안 함 (수익 0%)
```

### **시나리오 2: Bull Market (탐욕 시장)**

```
1️⃣ Insight: 시장 심리 = GREED (90)
   "시장이 탐욕으로 가득 차 있습니다. 이익을 실현할 시점입니다"

2️⃣ My Moat: 포트폴리오 안전도 = 35 (위험)
   Safety Margin: -20 (목표 55보다 부족)

3️⃣ The Brain:
   입력: 금리 추세 = BOTTOM (저점)
   → Timing: SELL (금리 저점 = 매도 신호)
   → Value: 35 (위험한 포트폴리오)
   → 최종: SELL_URGENT (즉시 매도)
   → 우선순위: CRITICAL 🚨

4️⃣ Action:
   - Bitcoin 20% 매도 ($10,000)
   - Tech Stock 30% 매도 ($15,000)
   - Cash 비중 증가 (45% → 65%)

5️⃣ My Principles:
   - 원칙 확인: "수익 30% 이상 달성" ✅
   - 원칙 확인: "시장 심리 GREED" ✅
   - 매도 규칙 적용: 지금 매도
```

---

## 📊 테스트 케이스

### **Test 1: Conservative User + Crypto 위험**
```
입력:
- 자산: 50% Bitcoin, 40% AAPL, 10% Cash
- 금리 추세: FALLING (하락 중)
- 위험 허용도: CONSERVATIVE

기대 결과:
- Value Score: 35 (위험)
- Safety Margin: -35 (심각)
- Hybrid Signal: "REBALANCE_NOW (CRITICAL)"
- 경고: "포트폴리오가 보수적 기준에 맞지 않음"
```

### **Test 2: Aggressive User + Smart Action**
```
입력:
- 자산: 80% Cash, 20% Bonds
- 금리 추세: PEAK (고점)
- 위험 허용도: AGGRESSIVE

기대 결과:
- Value Score: 95 (매우 안전)
- Safety Margin: +55 (초과)
- Hybrid Signal: "BUY_AGGRESSIVE"
- 설명: "현금이 충분하고 기회가 왔습니다"
```

### **Test 3: Balanced Portfolio**
```
입력:
- 자산: 30% Crypto, 40% Stocks, 20% Bonds, 10% Cash
- 금리 추세: NEUTRAL
- 위험 허용도: MODERATE

기대 결과:
- Value Score: 55-60 (중간)
- Safety Margin: 0-5 (목표 근처)
- Hybrid Signal: "HOLD_STEADY"
- 설명: "현재 포지션 유지"
```

---

## 🚀 향후 확장

### **Phase 3: Real Data Integration**
- CoinGecko API → 실제 암호화폐 가격
- Stock Market API → 실제 주식 데이터
- Federal Reserve API → 실제 금리 데이터

### **Phase 4: ML/AI 강화**
- Sentiment Analysis → 뉴스 기반 시장 심리 자동 계산
- Price Prediction → 역사적 데이터 기반 가격 전망
- Portfolio Optimization → 리스크-수익 최적화

### **Phase 5: Supabase 백엔드 (Web ↔ App 동기화)**
- 사용자 원칙 클라우드 저장
- 진단 히스토리 동기화
- 협력 투자 (다중 사용자)

### **Phase 6: Gamification**
- 매일 질문 답변으로 "Philosophy Score" 획득
- "규칙 준수율" 추적
- 투자 성과 기록 (수익률, 거래 횟수 등)

---

## ✨ Berkshire Hathaway 철학 반영

### **1. Rule #1: Never Lose Money**
- ValueLogic의 Safety Margin Score
- 최소 현금 비중 강제

### **2. Rule #2: Remember Rule #1**
- My Principles 탭으로 규칙 상기
- 매일 "오늘의 질문"

### **3. Only Buy Understandable Businesses**
- "기본 이야기가 깨졌을 때 매도" 규칙

### **4. Buy When Others Are Fearful**
- Insight 탭의 Fear & Greed Index
- Tab 3에서 공포 시점에 매수 권장

### **5. Sell When Others Are Greedy**
- Tab 3에서 탐욕 신호 시 매도 권장

### **6. Have a Margin of Safety**
- Safety Margin Score가 핵심
- 필요 안전도보다 여유 있게 운영

---

## 📝 종합 평가

| 항목 | 평가 |
|------|------|
| **Timing (Kostolany)** | ✅ 시장 사이클 분석 |
| **Value (Buffett)** | ✅ 자산 안전도 평가 |
| **Hybrid 통합** | ✅ 충돌 해결 논리 |
| **User Constitution** | ✅ 규칙 기반 투자 |
| **Actionability** | ✅ Tab 3 → Tab 4 자동 연결 |
| **Accessibility** | ✅ 일반인도 이해 가능 |
| **Scalability** | ✅ Real API로 확장 가능 |

---

## 🎉 완성!

이제 **Buffett의 가치 투자** + **Kostolany의 시장 타이밍** = **최강의 하이브리드 시스템**이 준비되었습니다!

매일 Insight 탭에서 시장 심리를 읽고, The Brain 탭에서 하이브리드 분석을 받고, Action 탭에서 구체적인 리밸런싱을 실행하고, My Principles 탭에서 자신의 규칙을 상기하면서 장기 투자의 길을 걸어가세요.

**"Market Timing + Value Investing = Buffett이 원한 투자"** 🚀
