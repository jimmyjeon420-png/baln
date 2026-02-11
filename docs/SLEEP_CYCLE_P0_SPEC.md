# baln Sleep Cycle P0 기술 스펙 (v1.2)

**작성일**: 2026-02-11
**작성자**: Agent 4 (Technical Architect)
**목적**: P0-1~5 전체 기술 스펙 (컴포넌트별)
**버전**: 1.0 (v1.2 Sleep Cycle 전략 기반)

---

## 📋 목차

1. [전략 개요](#1-전략-개요)
2. [P0-1: 비주얼 피드백 시스템](#2-p0-1-비주얼-피드백-시스템)
3. [P0-2: 명확한 목표 설정](#3-p0-2-명확한-목표-설정)
4. [P0-3: 또래 비교 시스템](#4-p0-3-또래-비교-시스템-잠금)
5. [P0-4: 공포-탐욕 지수](#5-p0-4-공포-탐욕-지수-잠금)
6. [P0-5: Feature Flag 시스템](#6-p0-5-feature-flag-시스템)
7. [TypeScript 타입 정의](#7-typescript-타입-정의)
8. [Supabase 테이블 스키마](#8-supabase-테이블-스키마)
9. [개발 순서 가이드](#9-개발-순서-가이드)

---

## 1. 전략 개요

### v1.2 핵심 전략: 자동 잠금 해제

**문제**: "커뮤니티 기능을 나중에 개발하면, MAU 200 도달 시 즉각 대응 못할 수 있다"
**해결**: 출시 전 모든 기능을 개발(잠금 상태) → 임계값 도달 시 자동 활성화

```typescript
// 출시 전 개발 (잠금 상태)
- 또래 비교 UI + 로직 완성
- 공포-탐욕 지수 UI + 로직 완성
- feature_flags 테이블에 enabled = false

// Daily Briefing Task I (매일 07:00 실행)
if (MAU >= 200 && !peerComparison.enabled) {
  1. DB 업데이트: enabled = true
  2. 모든 유저에게 푸시: "🎉 200명 달성! 또래 비교 활성화"
  3. 축하 크레딧 10C 지급
  4. Analytics 이벤트 로그
}
```

### P0 범위 (출시 전 필수)

| 기능 | 출시 시 상태 | 활성화 조건 | 예상 효과 |
|------|-------------|------------|----------|
| P0-1: 비주얼 피드백 | ✅ 즉시 활성화 | - | 리텐션 +10~15% |
| P0-2: 명확한 목표 | ✅ 즉시 활성화 | - | 전환율 +15~20% |
| P0-3: 또래 비교 | 🔒 잠금 | MAU ≥ 200 자동 해제 | 참여도 +20~25% |
| P0-4: 공포-탐욕 지수 | 🔒 잠금 | MAU ≥ 200 + 투표 500개 | 바이럴 +30~40% |
| P0-5: Feature Flag | ✅ 즉시 활성화 | - | 자동 해제 인프라 |

---

## 2. P0-1: 비주얼 피드백 시스템

### 목표
사용자 진전 시각화로 리텐션 +10~15% 달성 (Duolingo 스트릭 사례)

### 컴포넌트 1: 건강 점수 추이 그래프

#### 📁 파일 위치
```
src/components/insights/HealthScoreTrendChart.tsx
```

#### 🔧 기술 스택
- **차트 라이브러리**: `react-native-chart-kit` (이미 설치됨)
- **이유**: Expo SDK 54 공식 지원, victory-native보다 설정 간단

#### 📐 Props 인터페이스
```typescript
interface HealthScoreTrendChartProps {
  /** 90일 히스토리 데이터 */
  data: {
    date: string; // 'YYYY-MM-DD'
    score: 'A' | 'B' | 'C' | 'D' | 'F';
  }[];

  /** 로딩 상태 */
  isLoading?: boolean;

  /** 데이터 없을 때 메시지 */
  emptyMessage?: string;
}
```

#### 💻 구현 예시 (핵심 로직)

```typescript
import { LineChart } from 'react-native-chart-kit';

// 등급 → 숫자 변환 (그래프 표시용)
const SCORE_MAP: Record<string, number> = {
  A: 5, B: 4, C: 3, D: 2, F: 1
};

// 차트 데이터 변환
const chartData = {
  labels: data.slice(-7).map(d => `${new Date(d.date).getMonth()+1}/${new Date(d.date).getDate()}`),
  datasets: [{
    data: data.map(d => SCORE_MAP[d.score]),
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    strokeWidth: 2,
  }],
};
```

#### 🔌 데이터 소스 (Hook)
```typescript
// src/hooks/useHealthScoreHistory.ts
export function useHealthScoreHistory(days: number = 90) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['health-score-history', user?.id, days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_score_history')
        .select('created_at, health_score')
        .eq('user_id', user?.id)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(row => ({
        date: row.created_at.split('T')[0],
        score: row.health_score as 'A' | 'B' | 'C' | 'D' | 'F',
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}
```

#### 🏠 홈 탭 통합
```typescript
// app/(tabs)/index.tsx (참고만, 수정 금지)
import HealthScoreTrendChart from '@/components/insights/HealthScoreTrendChart';
import { useHealthScoreHistory } from '@/hooks/useHealthScoreHistory';

const { data: scoreHistory, isLoading } = useHealthScoreHistory(90);

<HealthScoreTrendChart data={scoreHistory || []} isLoading={isLoading} />
```

---

### 컴포넌트 2: 예측 적중 히트맵

#### 📁 파일 위치
```
src/components/predictions/PredictionHeatmap.tsx
```

#### 📐 Props 인터페이스
```typescript
interface PredictionHeatmapProps {
  /** 최근 7일 예측 결과 */
  predictions: {
    date: string; // 'YYYY-MM-DD'
    result: 'correct' | 'incorrect' | 'pending';
  }[];

  /** 클릭 시 상세 보기 콜백 */
  onDayPress?: (date: string) => void;
}
```

#### 🎨 UI 디자인
```
┌─────────────────────────────────┐
│ 이번 주 예측 기록                │
├─────────────────────────────────┤
│ 월  화  수  목  금  토  일       │
│ ✅  ✅  ❌  ✅  ✅  ⬜  ⬜      │
└─────────────────────────────────┘
│ ✅ 적중  ❌ 오답  ⬜ 미참여   │
```

#### 💻 핵심 로직
```typescript
const RESULT_EMOJI: Record<string, string> = {
  correct: '✅',
  incorrect: '❌',
  pending: '⬜',
};

const RESULT_COLOR: Record<string, string> = {
  correct: '#4CAF50',
  incorrect: '#CF6679',
  pending: '#757575',
};
```

---

### 컴포넌트 3: 맥락 카드 타임라인

#### 📁 파일 위치
```
src/components/context/ContextTimeline.tsx
```

#### 🎨 UI 디자인
```
┌─────────────────────────────────┐
│ 지난 맥락 카드                   │
├─────────────────────────────────┤
│ 2/10 (월) 📈                    │
│ 미국 CPI 예상 상회, 금리 인상    │
├─────────────────────────────────┤
│ 2/9 (일) 📉                     │
│ 비트코인 -3.2% 하락               │
└─────────────────────────────────┘
```

---

### 컴포넌트 4: 위기 대응 기록

#### 📁 파일 위치
```
src/components/insights/CrisisResponseLog.tsx
```

#### 🎨 UI 디자인
```
┌─────────────────────────────────┐
│ 위기 대응 기록                   │
├─────────────────────────────────┤
│ 2026-01-15 | 시장 -5.2%         │
│ → 맥락 카드 읽음 ✅              │
│ → 행동: HOLD (보유)              │
│ 💪 당신의 기준이 작동했습니다     │
└─────────────────────────────────┘
```

---

## 3. P0-2: 명확한 목표 설정

### 목표
온보딩 전환율 +15~20% 달성 (Headspace 목표 선택 사례)

### 온보딩 목표 선택 화면

#### 📁 파일 위치
```
app/onboarding/goals.tsx
```

#### 🎯 4가지 목표
```typescript
const GOALS: Goal[] = [
  {
    type: 'panic_sell',
    title: '패닉셀 방지',
    description: '시장 급락 시 HOLD할 수 있도록',
    icon: 'shield-checkmark',
  },
  {
    type: 'fomo',
    title: 'FOMO 방지',
    description: '시장 급등 시 추격 매수 방지',
    icon: 'hand-left',
  },
  {
    type: 'context',
    title: '맥락 이해',
    description: '예측 적중률 향상',
    icon: 'book',
  },
  {
    type: 'management',
    title: '체계적 관리',
    description: '포트폴리오 건강 점수 개선',
    icon: 'analytics',
  },
];
```

#### 💾 데이터 저장
```typescript
// user_goals 테이블에 저장
const { error } = await supabase.from('user_goals').insert({
  user_id: user.id,
  goal_type: selectedGoal,
});
```

---

## 4. P0-3: 또래 비교 시스템 (잠금)

### 목표
커뮤니티 기능을 출시 전 개발, MAU 200 도달 시 자동 활성화

### 컴포넌트: PeerComparisonCard

#### 📁 파일 위치
```
src/components/peer/PeerComparisonCard.tsx
```

#### 🎨 잠금 상태 UI
```
┌─────────────────────────────────┐
│ 🔒 또래 비교                    │
├─────────────────────────────────┤
│ 200명이 모이면 활성화됩니다      │
│ 현재 25%                         │
│ ████░░░░░░                       │
└─────────────────────────────────┘
```

#### 🎨 활성화 후 UI
```
┌─────────────────────────────────┐
│ 📈 또래 비교                    │
├─────────────────────────────────┤
│ 당신은 상위 23%                  │
│                                  │
│ 나의 맥락 이해도: 67.3점         │
│ 또래 평균: 54.2점                │
│                                  │
│ 평균보다 13.1점 높습니다 👍      │
└─────────────────────────────────┘
```

### bracket 할당 로직

#### 📁 파일 위치
```
src/services/peerComparisonService.ts
```

#### 💻 핵심 로직
```typescript
export type Bracket = 'B1' | 'B2' | 'B3' | 'B4' | 'B5';

/**
 * 자산 총액 → bracket 할당
 */
export function getBracket(totalAssets: number): Bracket {
  if (totalAssets < 10_000_000) return 'B1'; // 1천만 미만
  if (totalAssets < 30_000_000) return 'B2'; // 3천만 미만
  if (totalAssets < 50_000_000) return 'B3'; // 5천만 미만
  if (totalAssets < 100_000_000) return 'B4'; // 1억 미만
  return 'B5'; // 1억 이상
}

/**
 * 맥락 이해도 점수 계산
 * = (예측 적중률 50% + 복기 완료율 50%)
 */
export function calculateContextUnderstanding(
  accuracyRate: number, // 0~100
  reviewCompletionRate: number // 0~100
): number {
  return (accuracyRate * 0.5 + reviewCompletionRate * 0.5);
}
```

#### ⚠️ 절대 금지 사항
```typescript
// ⚠️ 경고: 수익률, 자산 규모 비교 절대 금지 (버핏 원칙)
// 측정 대상: 맥락 이해도만 (예측 적중률 + 복기 완료율)
```

---

## 5. P0-4: 공포-탐욕 지수 (잠금)

### 목표
커뮤니티 심리 데이터를 출시 전 개발, MAU 200 + 투표 500 시 자동 활성화

### 컴포넌트: FearGreedIndex

#### 📁 파일 위치
```
src/components/community/FearGreedIndex.tsx
```

#### 🎨 잠금 상태 UI
```
┌─────────────────────────────────┐
│ 🔒 baln 공포-탐욕 지수          │
├─────────────────────────────────┤
│ 200명 + 투표 500개 달성 시 활성화│
│                                  │
│ MAU: 25%   ████░░░░░░           │
│ 투표: 40%  ████░░░░░░           │
└─────────────────────────────────┘
```

#### 🎨 활성화 후 UI
```
┌─────────────────────────────────┐
│ 📊 baln 공포-탐욕 지수          │
├─────────────────────────────────┤
│           70                     │
│          탐욕                    │
│                                  │
│ ███████░░░                       │
│                                  │
│ 0 (공포) ← 50 → 100 (탐욕)      │
└─────────────────────────────────┘
```

### 지수 계산 공식

#### 📁 파일 위치
```
src/services/fearGreedService.ts
```

#### 💻 핵심 로직
```typescript
/**
 * baln 공포-탐욕 지수 계산
 * 공식: ((매수% - 매도%) / 2) + 50
 *
 * 예: 매수 60%, 매도 20% → (60-20)/2 + 50 = 70 (탐욕)
 */
export async function calculateFearGreedIndex(): Promise<number | null> {
  // 최근 24시간 투표 집계
  const { data, error } = await supabase
    .from('prediction_votes')
    .select('sentiment')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error || !data || data.length === 0) return null;

  // 매수/관망/매도 카운트
  const buyCount = data.filter(v => v.sentiment === 'BUY').length;
  const sellCount = data.filter(v => v.sentiment === 'SELL').length;
  const totalCount = data.length;

  if (totalCount === 0) return null;

  const buyPct = (buyCount / totalCount) * 100;
  const sellPct = (sellCount / totalCount) * 100;

  const index = ((buyPct - sellPct) / 2) + 50;

  // 0~100 범위로 클램프
  return Math.max(0, Math.min(100, Math.round(index)));
}
```

---

## 6. P0-5: Feature Flag 시스템

### 목표
v1.2 핵심 인프라: 자동 잠금 해제 시스템 구현

### Hook: useFeatureFlag

#### 📁 파일 위치
```
src/hooks/useFeatureFlag.ts
```

#### 💻 핵심 로직
```typescript
export interface FeatureFlag {
  enabled: boolean;
  progress: number; // 0~100
  message: string;
}

export function useFeatureFlag(featureName: string): FeatureFlag {
  const { data, refetch } = useQuery({
    queryKey: ['feature-flag', featureName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('name', featureName)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Realtime 구독 (enabled 상태 변경 감지)
  useEffect(() => {
    const channel = supabase
      .channel(`feature-flag-${featureName}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'feature_flags',
        filter: `name=eq.${featureName}`,
      }, () => {
        refetch(); // 변경 감지 시 재조회
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [featureName, refetch]);

  return {
    enabled: data?.enabled || false,
    progress: /* MAU 진행률 계산 */,
    message: data?.enabled ? '활성화됨' : `곧 공개됩니다`,
  };
}
```

### Daily Briefing Task I (자동 잠금 해제 로직)

#### 📁 파일 위치
```
supabase/functions/daily-briefing/task-i-feature-unlock.ts
```

#### 💻 핵심 로직
```typescript
export async function executeTaskI(supabase: SupabaseClient): Promise<void> {
  // 1. MAU 계산 (최근 30일 유니크 유저)
  const { data: mauData } = await supabase.rpc('calculate_mau');
  const currentMAU = mauData || 0;

  // 2. 투표 수 계산
  const { count: totalVotes } = await supabase
    .from('prediction_votes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // 3. Feature Flag 조회 (잠금 상태만)
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('enabled', false);

  // 4. 임계값 체크 & 자동 해제
  for (const flag of flags || []) {
    let shouldUnlock = false;

    if (flag.name === 'peerComparison') {
      shouldUnlock = currentMAU >= (flag.threshold_mau || 200);
    } else if (flag.name === 'fearGreedIndex') {
      shouldUnlock = currentMAU >= 200 && totalVotes >= 500;
    }

    if (shouldUnlock) {
      // 4-1. enabled = true 업데이트
      await supabase
        .from('feature_flags')
        .update({ enabled: true, unlocked_at: new Date().toISOString() })
        .eq('name', flag.name);

      // 4-2. 푸시 알림 발송
      await sendCelebrationPush(supabase, flag.name);

      // 4-3. 축하 크레딧 10C 지급
      await grantCreditToAllUsers(supabase, 10, `${flag.name} unlock bonus`);

      // 4-4. Analytics 이벤트 로그
      await supabase.from('analytics_events').insert({
        event_type: 'feature_unlocked',
        event_data: { feature: flag.name, mau: currentMAU, votes: totalVotes },
      });
    }
  }
}
```

---

## 7. TypeScript 타입 정의

### 파일 위치
```
src/types/behavior-tracking.ts
src/types/feature-flag.ts
```

### 타입 정의

```typescript
// src/types/behavior-tracking.ts

/** 시장 급락 시 사용자 행동 추적 */
export interface PanicSellEvent {
  id: string;
  user_id: string;
  date: string;
  market_change: number; // -5.2%
  user_action: 'SELL' | 'HOLD' | 'BUY';
  context_card_read: boolean;
  time_since_card_read: number | null; // 분 단위
  created_at: string;
}

/** FOMO 매수 이벤트 */
export interface FOMOBuyEvent {
  id: string;
  user_id: string;
  date: string;
  market_change: number; // +5.8%
  user_action: 'BUY' | 'HOLD' | 'SELL';
  context_card_read: boolean;
  created_at: string;
}

/** 예측 적중률 추이 */
export interface PredictionAccuracy {
  user_id: string;
  period: '7d' | '30d' | '90d';
  accuracy_rate: number; // 0~100
  total_votes: number;
  correct_votes: number;
}
```

```typescript
// src/types/feature-flag.ts

export interface FeatureFlagDB {
  id: string;
  name: string;
  enabled: boolean;
  threshold_mau: number | null;
  threshold_votes: number | null;
  threshold_rating: number | null;
  unlocked_at: string | null;
  created_at: string;
}

export type FeatureName = 'peerComparison' | 'fearGreedIndex' | 'accountLinking';
```

---

## 8. Supabase 테이블 스키마

### 파일 위치
```
supabase/migrations/20260211_sleep_cycle_tables.sql
```

### SQL 스키마

```sql
-- ============================================================================
-- 1. user_goals: 사용자 목표 선택
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('panic_sell', 'fomo', 'context', 'management')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_goals_select" ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_goals_insert" ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. bracket_performance: 또래 비교 bracket 성과
-- ============================================================================
CREATE TABLE IF NOT EXISTS bracket_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bracket TEXT NOT NULL CHECK (bracket IN ('B1', 'B2', 'B3', 'B4', 'B5')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  context_understanding_score FLOAT DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bracket_performance_bracket ON bracket_performance(bracket);

-- 집계 뷰
CREATE OR REPLACE VIEW bracket_averages AS
SELECT
  bracket,
  AVG(context_understanding_score) AS avg_context_understanding,
  COUNT(*) AS user_count
FROM bracket_performance
GROUP BY bracket;

ALTER TABLE bracket_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bracket_performance_select" ON bracket_performance
  FOR SELECT USING (true);

-- ============================================================================
-- 3. feature_flags: Feature Flag 시스템
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  threshold_mau INT,
  threshold_votes INT,
  threshold_rating FLOAT,
  unlocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 초기 데이터
INSERT INTO feature_flags (name, threshold_mau, threshold_votes) VALUES
  ('peerComparison', 200, NULL),
  ('fearGreedIndex', 200, 500),
  ('accountLinking', 500, NULL)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select" ON feature_flags FOR SELECT USING (true);

-- ============================================================================
-- 4. prediction_votes 테이블에 sentiment 필드 추가
-- ============================================================================
ALTER TABLE prediction_votes
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('BUY', 'HOLD', 'SELL'));

UPDATE prediction_votes SET sentiment = 'HOLD' WHERE sentiment IS NULL;

-- ============================================================================
-- 5. health_score_history: 건강 점수 히스토리
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  health_score TEXT NOT NULL CHECK (health_score IN ('A', 'B', 'C', 'D', 'F')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_score_history_user_id ON health_score_history(user_id);
CREATE INDEX idx_health_score_history_created_at ON health_score_history(created_at);

ALTER TABLE health_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_score_history_select" ON health_score_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "health_score_history_insert" ON health_score_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. calculate_mau() RPC 함수
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_mau()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  mau_count INT;
BEGIN
  SELECT COUNT(DISTINCT user_id)
  INTO mau_count
  FROM analytics_events
  WHERE timestamp > NOW() - INTERVAL '30 days';

  RETURN COALESCE(mau_count, 0);
END;
$$;
```

---

## 9. 개발 순서 가이드

### Day 0: DB 마이그레이션 (0.5일)

```bash
# 1. SQL 파일 실행
cd /Users/nicenoodle/smart-rebalancer
supabase db push

# 2. Supabase Dashboard에서 테이블 확인
# - user_goals ✅
# - bracket_performance ✅
# - feature_flags ✅
# - health_score_history ✅

# 3. RLS 정책 확인
```

### Day 1-3: P0-1 비주얼 피드백 (3.0일, 병렬 가능)

**작업 순서**:
1. Hook 작성: `src/hooks/useHealthScoreHistory.ts`
2. 컴포넌트 작성 (4개 병렬):
   - `HealthScoreTrendChart.tsx` (1.0일)
   - `PredictionHeatmap.tsx` (0.8일)
   - `ContextTimeline.tsx` (0.7일)
   - `CrisisResponseLog.tsx` (0.5일)
3. 홈 탭 통합

**검증**:
- [ ] TypeScript 에러 0개
- [ ] 각 컴포넌트 정상 렌더링
- [ ] 데이터 없을 때 안내 메시지 표시

### Day 4-5: P0-2 명확한 목표 (2.0일)

**작업 순서**:
1. 타입 정의: `src/types/behavior-tracking.ts`
2. 온보딩 화면: `app/onboarding/goals.tsx`
3. 목표별 카드: `src/components/goals/`
4. 추적 로직: PanicSellEvent 감지

**검증**:
- [ ] 온보딩 플로우 정상 작동
- [ ] user_goals 테이블에 저장 확인
- [ ] 홈 탭에 목표별 카드 표시

### Day 6-9: P0-3 또래 비교 (4.0일)

**작업 순서**:
1. 서비스: `src/services/peerComparisonService.ts`
2. 컴포넌트: `src/components/peer/PeerComparisonCard.tsx`
3. Hook: `src/hooks/usePeerComparison.ts`
4. 홈 탭 통합

**검증**:
- [ ] 잠금 상태 UI 정상 표시
- [ ] bracket 할당 정확
- [ ] 백분위 계산 정확
- [ ] **수익률 비교 금지 확인 ⚠️**

### Day 10-11: P0-4 공포-탐욕 지수 (2.0일)

**작업 순서**:
1. 서비스: `src/services/fearGreedService.ts`
2. 컴포넌트: `src/components/community/FearGreedIndex.tsx`
3. Hook: `src/hooks/useFearGreedIndex.ts`
4. 홈 탭 통합

**검증**:
- [ ] 잠금 상태 UI 정상 표시
- [ ] 지수 계산 정확 (0~100 범위)
- [ ] sentiment 필드 정상 저장

### Day 12-14: P0-5 Feature Flag 시스템 (2.5일)

**작업 순서**:
1. Hook: `src/hooks/useFeatureFlag.ts`
2. Daily Briefing Task I: `task-i-feature-unlock.ts`
3. Edge Function 배포
4. Supabase Cron 설정 (매일 07:00)

**검증**:
- [ ] useFeatureFlag 훅 정상 작동
- [ ] MAU 계산 정확
- [ ] 임계값 도달 시 enabled = true
- [ ] 푸시 알림 발송 테스트

### Day 16: 통합 테스트

**Feature Flag 자동 해제 시뮬레이션**:
```sql
-- 1. 임계값 조작 (테스트용)
UPDATE feature_flags SET threshold_mau = 1 WHERE name = 'peerComparison';

-- 2. Daily Briefing Task I 수동 실행
-- (Supabase Dashboard > Edge Functions > daily-briefing > Invoke)

-- 3. 확인
SELECT * FROM feature_flags WHERE name = 'peerComparison';
-- enabled = true 확인

-- 4. 원복
UPDATE feature_flags SET threshold_mau = 200 WHERE name = 'peerComparison';
```

---

## 📚 참고 자료

### 문서
- **Sleep Cycle 전략 문서**: `/Users/nicenoodle/baln_sleep_cycle_strategy.md`
- **스프린트 로드맵**: `/Users/nicenoodle/baln_sprint_roadmap.md`
- **우선순위 매트릭스**: `/Users/nicenoodle/baln_priority_matrix.md`

### 기존 컴포넌트 (패턴 참고)
- `src/components/home/ContextCard.tsx`
- `src/components/home/PredictionVoteCard.tsx`
- `src/components/home/HealthSignalCard.tsx`

### 라이브러리
- **react-native-chart-kit**: [GitHub](https://github.com/indiespirit/react-native-chart-kit) ✅ 이미 설치됨
- **victory-native**: [공식 문서](https://nearform.com/open-source/victory-native/) (대체안)

### 차트 라이브러리 비교

| 라이브러리 | Expo SDK 54 | Peer Dependencies | 설정 복잡도 | 권장 |
|-----------|-------------|-------------------|------------|------|
| react-native-chart-kit | ✅ 지원 | 0개 | 낮음 | ✅ 권장 |
| victory-native | ✅ 지원 | 3개 (Reanimated, Gesture, Skia) | 높음 | 대체안 |

**Sources**:
- [Using Victory Native for Charts in Expo](https://kushabhi5.medium.com/using-victory-native-for-charts-in-an-expo-react-native-project-bd57d805cb8c)
- [Top React Native Chart Libraries 2025](https://blog.openreplay.com/react-native-chart-libraries-2025/)
- [Victory Native Official Docs](https://nearform.com/open-source/victory/docs/introduction/native/)

---

**작성**: Agent 4 (Technical Architect)
**업데이트**: 2026-02-11
**다음 리뷰**: 출시 7일 전 (Day 13, 최종 조정)
