# Agent 4: AI 분석 도구 구현

## 🎯 당신의 미션
스크린샷에 보이는 **4가지 AI 분석 도구**를 실제로 동작하게 만드세요:
1. 📈 **종목 딥다이브** (개별 주식 심층 분석)
2. 🧪 **What-If 시뮬레이션** (시장 폭락 시나리오)
3. 🧾 **세금 리포트** (절세 전략)
4. 💬 **AI CFO 채팅** (실시간 대화형 조언)

## 📌 역할 (Role)
- **당신은 "AI 도구 전문가"입니다.**
- **다른 Agent와 겹치는 파일은 절대 수정하지 마세요.**
- **새 파일만 생성**하거나, 아래 "전담 파일"만 수정하세요.

---

## ✅ 전담 파일 (수정 가능)
- `app/analysis/deep-dive.tsx` ← **새로 만들기** (종목 딥다이브 화면)
- `app/analysis/what-if.tsx` ← **새로 만들기** (시나리오 시뮬레이션 화면)
- `app/analysis/tax-report.tsx` ← **새로 만들기** (세금 리포트 화면)
- `app/analysis/cfo-chat.tsx` ← **새로 만들기** (AI CFO 채팅 화면)
- `src/components/analysis/ScenarioCard.tsx` ← **새로 만들기**
- `src/components/analysis/TaxSummaryCard.tsx` ← **새로 만들기**
- `src/components/analysis/ChatMessage.tsx` ← **새로 만들기**

## ❌ 절대 수정 금지 파일
- `app/(tabs)/index.tsx` ← Agent 5가 통합
- `src/hooks/useSharedAnalysis.ts` ← 공유 훅
- `src/services/gemini.ts` ← AI 서비스 (필요하면 읽기만)
- `package.json` ← 패키지 설치 금지

---

## 🏗️ 구현해야 할 것

### 1. app/analysis/deep-dive.tsx (종목 딥다이브)

#### 기능 요구사항
- **종목 검색**: 티커 or 한글 이름 입력
- **AI 분석 실행**: Gemini API로 심층 분석
- **분석 결과**:
  - 📊 **기업 개요**: 업종, 시가총액, PER, PBR
  - 📈 **최근 3개월 흐름**: 주가 차트 + 핵심 이벤트
  - 💰 **재무 건강도**: 매출, 영업이익, 부채비율
  - ⚠️ **리스크 요인**: 업종 리스크, 경쟁사, 규제
  - 🎯 **투자 의견**: 매수/중립/매도 + 이유

#### UI 디자인
```typescript
<ScrollView className="bg-gray-50 dark:bg-black p-4">
  {/* 검색 바 */}
  <SearchBar
    placeholder="종목 검색 (예: 삼성전자, AAPL)"
    onSubmit={handleSearch}
  />

  {/* 로딩 */}
  {isLoading && <LoadingSpinner text="AI가 분석 중..." />}

  {/* 분석 결과 */}
  {result && (
    <View>
      {/* 헤더: 종목명 + 현재가 */}
      <StockHeader
        name={result.name}
        ticker={result.ticker}
        price={result.currentPrice}
        change={result.change}
      />

      {/* 기업 개요 */}
      <SectionCard title="📊 기업 개요">
        <Text>{result.overview}</Text>
        <KeyMetrics
          marketCap={result.marketCap}
          per={result.per}
          pbr={result.pbr}
        />
      </SectionCard>

      {/* 최근 흐름 */}
      <SectionCard title="📈 최근 3개월">
        <MiniChart data={result.priceHistory} />
        <Text>{result.recentTrend}</Text>
      </SectionCard>

      {/* 재무 건강도 */}
      <SectionCard title="💰 재무 건강도">
        <HealthMeter score={result.financialHealth} />
        <Text>{result.financialAnalysis}</Text>
      </SectionCard>

      {/* 리스크 */}
      <SectionCard title="⚠️ 리스크">
        <RiskBadge level={result.riskLevel} />
        <Text>{result.risks}</Text>
      </SectionCard>

      {/* 투자 의견 */}
      <SectionCard title="🎯 AI 의견">
        <RecommendationBadge action={result.recommendation} />
        <Text>{result.reason}</Text>
      </SectionCard>
    </View>
  )}
</ScrollView>
```

#### 데이터 구조
```typescript
import { useDeepDive } from '../../hooks/useDeepDive';

const { mutate: analyze, isLoading, data: result } = useDeepDive();

const handleSearch = (ticker: string) => {
  analyze({ ticker });
};

// result 구조:
// {
//   name, ticker, currentPrice, change,
//   overview, marketCap, per, pbr,
//   recentTrend, priceHistory,
//   financialHealth, financialAnalysis,
//   riskLevel, risks,
//   recommendation, reason
// }
```

### 2. app/analysis/what-if.tsx (What-If 시뮬레이션)

#### 기능 요구사항
- **시나리오 선택**: 시장 급락 -10% / -20% / -30%
- **맞춤 시나리오**: "비트코인 $50K 붕괴" 등 직접 입력
- **시뮬레이션 결과**:
  - 💥 **내 자산 영향**: 총 손실액 (원화)
  - 📊 **자산별 타격도**: 주식 -15%, 코인 -40%, 부동산 0%
  - 🛡️ **방어력 평가**: "현재 포트폴리오는 폭락에 취약합니다"
  - 💡 **대응 전략**: 헤지 방법, 리밸런싱 제안

#### UI 디자인
```typescript
<ScrollView className="bg-gray-50 dark:bg-black p-4">
  {/* 시나리오 선택 */}
  <Text className="text-xl font-bold mb-3">🧪 위기 시나리오</Text>
  <View className="grid grid-cols-2 gap-3 mb-4">
    {SCENARIOS.map(scenario => (
      <ScenarioCard
        key={scenario.id}
        title={scenario.title}
        description={scenario.description}
        severity={scenario.severity}
        onPress={() => handleSimulate(scenario)}
      />
    ))}
  </View>

  {/* 맞춤 시나리오 */}
  <CustomScenarioInput onSubmit={handleCustomSimulate} />

  {/* 시뮬레이션 결과 */}
  {result && (
    <View className="mt-6">
      {/* 총 손실 */}
      <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 mb-4">
        <Text className="text-sm text-gray-600">예상 총 손실</Text>
        <Text className="text-4xl font-bold text-red-600 mt-2">
          {formatKRW(result.totalLoss)}
        </Text>
        <Text className="text-sm text-gray-600 mt-1">
          ({formatPercent(result.totalLossPercent)})
        </Text>
      </View>

      {/* 자산별 타격도 */}
      <SectionCard title="📊 자산별 타격도">
        {result.assetImpacts.map(impact => (
          <ImpactRow
            key={impact.assetType}
            assetType={impact.assetType}
            loss={impact.loss}
            lossPercent={impact.lossPercent}
          />
        ))}
      </SectionCard>

      {/* 방어력 평가 */}
      <SectionCard title="🛡️ 방어력 평가">
        <DefenseScore score={result.defenseScore} />
        <Text>{result.analysis}</Text>
      </SectionCard>

      {/* 대응 전략 */}
      <SectionCard title="💡 AI 대응 전략">
        <Text>{result.strategy}</Text>
      </SectionCard>
    </View>
  )}
</ScrollView>
```

#### 시나리오 상수
```typescript
const SCENARIOS = [
  {
    id: 'market-drop-10',
    title: '시장 급락 -10%',
    description: '주요 지수 동반 하락',
    severity: 'medium',
    params: { marketDrop: 0.1 },
  },
  {
    id: 'market-drop-20',
    title: '시장 폭락 -20%',
    description: '블랙먼데이 수준',
    severity: 'high',
    params: { marketDrop: 0.2 },
  },
  {
    id: 'crypto-crash',
    title: '암호화폐 붕괴',
    description: '비트코인 -50%',
    severity: 'high',
    params: { cryptoDrop: 0.5 },
  },
  {
    id: 'rate-hike',
    title: '금리 급등',
    description: '기준금리 +2%p',
    severity: 'medium',
    params: { rateHike: 2.0 },
  },
];
```

### 3. app/analysis/tax-report.tsx (세금 리포트)

#### 기능 요구사항
- **올해 예상 세금**: 양도소득세, 배당소득세 합계
- **자산별 세금 분해**: 주식, 코인, 부동산
- **절세 전략**: "연말 전 손실 실현으로 ₩XXX 절세 가능"

#### UI 디자인
```typescript
<ScrollView className="bg-gray-50 dark:bg-black p-4">
  <Text className="text-xl font-bold mb-4">🧾 2026년 세금 리포트</Text>

  {/* 총 예상 세금 */}
  <View className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-5 mb-4">
    <Text className="text-sm text-gray-600">올해 예상 세금</Text>
    <Text className="text-4xl font-bold text-orange-600 mt-2">
      {formatKRW(taxReport.totalTax)}
    </Text>
  </View>

  {/* 자산별 세금 */}
  <SectionCard title="📊 자산별 세금">
    <TaxBreakdown items={taxReport.breakdown} />
  </SectionCard>

  {/* 절세 전략 */}
  <SectionCard title="💡 절세 전략">
    <Text>{taxReport.savingsStrategy}</Text>
    <Text className="text-green-600 font-bold mt-2">
      예상 절세액: {formatKRW(taxReport.potentialSavings)}
    </Text>
  </SectionCard>
</ScrollView>
```

### 4. app/analysis/cfo-chat.tsx (AI CFO 채팅)

#### 기능 요구사항
- **실시간 채팅**: 사용자 메시지 → Gemini API → AI 응답
- **컨텍스트 유지**: 대화 히스토리 저장
- **미리보기 질문**: "지금 삼성전자 사도 될까요?" 버튼

#### UI 디자인
```typescript
<View className="flex-1 bg-gray-50 dark:bg-black">
  {/* 채팅 메시지 리스트 */}
  <FlatList
    data={messages}
    renderItem={({ item }) => (
      <ChatMessage
        message={item.text}
        isUser={item.role === 'user'}
        timestamp={item.timestamp}
      />
    )}
    inverted
  />

  {/* 입력창 */}
  <View className="bg-white dark:bg-gray-900 p-4 border-t">
    <TextInput
      value={inputText}
      onChangeText={setInputText}
      placeholder="AI CFO에게 물어보세요..."
      className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3"
    />
    <TouchableOpacity
      onPress={handleSend}
      className="bg-purple-600 rounded-xl py-3 mt-2"
    >
      <Text className="text-white text-center font-semibold">
        {isLoading ? '생각 중...' : '전송'}
      </Text>
    </TouchableOpacity>
  </View>

  {/* 미리보기 질문 (첫 화면) */}
  {messages.length === 0 && (
    <View className="absolute bottom-20 left-4 right-4">
      <Text className="text-sm text-gray-600 mb-3">💬 이렇게 물어보세요</Text>
      {EXAMPLE_QUESTIONS.map(q => (
        <TouchableOpacity
          key={q}
          onPress={() => handleQuickQuestion(q)}
          className="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-3 mb-2"
        >
          <Text>{q}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>
```

#### 미리보기 질문
```typescript
const EXAMPLE_QUESTIONS = [
  '지금 삼성전자 사도 될까요?',
  '내 포트폴리오 위험도는?',
  '암호화폐 비중 늘려야 할까요?',
  '절세 방법 알려주세요',
];
```

---

## 🎨 디자인 가이드

### 분석 결과 카드
- **배경**: bg-white dark:bg-gray-900
- **라운드**: rounded-2xl
- **패딩**: p-5
- **그림자**: shadow-md

### 심각도별 색상
- **Low**: bg-green-50, text-green-700
- **Medium**: bg-yellow-50, text-yellow-700
- **High**: bg-red-50, text-red-700

### 추천 배지
- **매수**: bg-green-600 text-white
- **중립**: bg-gray-600 text-white
- **매도**: bg-red-600 text-white

---

## ✅ 완료 체크리스트

- [ ] `app/analysis/deep-dive.tsx` 생성
- [ ] `app/analysis/what-if.tsx` 생성
- [ ] `app/analysis/tax-report.tsx` 생성
- [ ] `app/analysis/cfo-chat.tsx` 생성
- [ ] AI 호출 로직 (Gemini API 활용)
- [ ] 로딩 상태 처리
- [ ] 에러 핸들링 (API 실패 시 폴백)
- [ ] 다크 모드 대응
- [ ] TypeScript 에러 0개 확인

---

## 🚨 주의사항

1. **다른 Agent와 파일 충돌 방지**
   - `app/analysis/` 폴더는 당신만의 영역입니다.
   - 자유롭게 파일을 만드세요.

2. **AI 서비스 활용**
   - `src/services/gemini.ts`에 Gemini API 호출 로직이 있습니다.
   - 읽어보고 활용하세요. 수정은 금지.

3. **훅 생성 가능**
   - `src/hooks/useDeepDive.ts` 등 AI 도구 전용 훅은 자유롭게 만들어도 됩니다.
   - 단, `useSharedAnalysis.ts` 같은 공유 훅은 수정 금지.

4. **커밋 금지**
   - 코드만 작성하고, 커밋은 사용자가 합니다.

---

## 📚 참고 파일

- `src/services/gemini.ts` (AI 호출 로직)
- `src/hooks/useDiagnosis.ts` (AI 분석 패턴 참고)
- `app/(tabs)/diagnosis.tsx` (기존 AI 진단 화면)

---

## 🎯 성공 기준

**사용자가 "이거 진짜 AI가 분석한 거야? 정확하네"라고 느끼면 성공입니다.**

시작하세요! 🤖
