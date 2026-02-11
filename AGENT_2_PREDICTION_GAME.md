# Agent 2: 예측 투표 시스템 구현

## 🎯 당신의 미션
**습관 루프의 핵심**: 매일 예측 → 투표 → 복기 → 기준 형성
사용자가 **교육받는 줄도 모르고 매일 오게** 만드는 게임 시스템을 완성하세요.

## 📌 역할 (Role)
- **당신은 "예측 게임 전문가"입니다.**
- **다른 Agent와 겹치는 파일은 절대 수정하지 마세요.**
- **새 파일만 생성**하거나, 아래 "전담 파일"만 수정하세요.

---

## ✅ 전담 파일 (수정 가능)
- `src/components/predictions/PredictionPollCard.tsx` ← **새로 만들기**
- `src/components/predictions/YesterdayReviewSection.tsx` ← **새로 만들기**
- `src/components/predictions/PollResultCard.tsx` ← **새로 만들기**
- `src/components/predictions/LeaderboardCard.tsx` ← **새로 만들기**
- `src/components/predictions/AccuracyBadge.tsx` ← **새로 만들기**

## ❌ 절대 수정 금지 파일
- `app/(tabs)/index.tsx` ← Agent 5가 통합
- `src/hooks/usePredictions.ts` ← 이미 완성됨
- `src/types/prediction.ts` ← 공유 타입
- `package.json` ← 패키지 설치 금지

---

## 🏗️ 구현해야 할 것

### 1. PredictionPollCard.tsx (활성 투표 카드)

#### 기능 요구사항
- **투표 전**: YES/NO 버튼 + 현재 투표 비율 (프로그레스 바)
- **투표 후**: 내 선택 강조 + "투표 완료!" 메시지 + 보상 크레딧 표시
- **마감 임박**: 마감 X시간 전이면 타이머 표시 (빨간색)

#### UI 디자인
```typescript
<View className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-md mb-4">
  {/* 카테고리 뱃지 */}
  <CategoryBadge category={poll.category} />

  {/* 질문 */}
  <Text className="text-lg font-bold mt-3 mb-2">{poll.question}</Text>
  <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
    {poll.description}
  </Text>

  {/* 투표 전: YES/NO 버튼 */}
  {!myVote && (
    <View className="flex-row gap-3">
      <VoteButton
        label={poll.yes_label}
        onPress={() => handleVote('YES')}
        color="green"
      />
      <VoteButton
        label={poll.no_label}
        onPress={() => handleVote('NO')}
        color="red"
      />
    </View>
  )}

  {/* 투표 후: 결과 표시 */}
  {myVote && (
    <View>
      <Text className="text-sm text-green-600 mb-2">✅ 투표 완료!</Text>
      <PollProgressBar
        yesCount={poll.yes_count}
        noCount={poll.no_count}
        myVote={myVote}
      />
      <Text className="text-xs text-gray-500 mt-2">
        +{poll.reward_credits}C 획득 예정 (정답 시)
      </Text>
    </View>
  )}

  {/* 마감 시간 */}
  <DeadlineTimer deadline={poll.deadline} />
</View>
```

#### 데이터 구조
```typescript
import { usePollsWithMyVotes, useSubmitVote } from '../../hooks/usePredictions';

const { data: polls, isLoading } = usePollsWithMyVotes();
const submitVote = useSubmitVote();

const handleVote = (choice: 'YES' | 'NO') => {
  submitVote.mutate({ pollId: poll.id, vote: choice });
};
```

### 2. YesterdayReviewSection.tsx (어제 복기 섹션)

#### 기능 요구사항
- **어제 투표한 질문들 + 정답 표시**
- **내 적중률 표시**: "어제 3문제 중 2개 적중 (67%)"
- **적중/오답별 색상 구분**: 적중(초록), 오답(빨강)
- **해설 보기 버튼**: Premium 유저만 or 1크레딧 소모

#### UI 디자인
```typescript
<View className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-5 mb-6">
  {/* 헤더 */}
  <Text className="text-xl font-bold mb-3">📊 어제 복기</Text>

  {/* 통계 */}
  <View className="flex-row justify-around mb-4">
    <StatBox label="투표" value={summary.totalVoted} />
    <StatBox label="적중" value={summary.totalCorrect} color="green" />
    <StatBox label="적중률" value={`${summary.accuracyRate}%`} />
  </View>

  {/* 어제 투표 목록 */}
  {yesterdayPolls.map(poll => (
    <PollResultCard
      key={poll.id}
      poll={poll}
      myVote={poll.myVote}
      isCorrect={poll.myIsCorrect}
    />
  ))}
</View>
```

#### 데이터 구조
```typescript
import { useYesterdayReview } from '../../hooks/usePredictions';

const { data: yesterdayPolls, summary, isLoading } = useYesterdayReview();

// yesterdayPolls: 어제 resolved + 내가 투표한 것만
// summary: { totalVoted, totalCorrect, accuracyRate }
```

### 3. PollResultCard.tsx (복기용 카드)

#### 기능
- **질문 + 내 선택 + 정답 표시**
- **적중 시**: 초록 배경 + "🎉 정답!" + 보상 크레딧
- **오답 시**: 빨간 배경 + "❌ 오답" + 해설 버튼

```typescript
<View className={cn(
  "p-4 rounded-xl mb-3",
  isCorrect ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
)}>
  {/* 질문 */}
  <Text className="text-sm font-semibold mb-2">{poll.question}</Text>

  {/* 내 선택 vs 정답 */}
  <View className="flex-row items-center gap-2 mb-2">
    <Text className="text-xs">내 선택: {myVote === 'YES' ? poll.yes_label : poll.no_label}</Text>
    <Text className="text-xs">정답: {poll.correct_answer === 'YES' ? poll.yes_label : poll.no_label}</Text>
  </View>

  {/* 결과 */}
  {isCorrect ? (
    <Text className="text-sm text-green-700 font-bold">
      🎉 정답! +{poll.reward_credits}C 획득
    </Text>
  ) : (
    <View>
      <Text className="text-sm text-red-700 font-bold mb-2">❌ 오답</Text>
      <ExplanationButton pollId={poll.id} />
    </View>
  )}
</View>
```

### 4. LeaderboardCard.tsx (리더보드)

#### 기능
- **상위 10명 + 내 순위**
- **적중률 순 정렬**
- **내 위치 하이라이트**

```typescript
<View className="bg-white dark:bg-gray-900 rounded-2xl p-5">
  <Text className="text-xl font-bold mb-4">🏆 리더보드</Text>

  {leaderboard.map(entry => (
    <LeaderboardRow
      key={entry.user_id}
      rank={entry.rank}
      displayName={entry.display_name}
      accuracyRate={entry.accuracy_rate}
      totalVotes={entry.total_votes}
      isMe={entry.isMe}
    />
  ))}
</View>
```

#### 데이터 구조
```typescript
import { useLeaderboard } from '../../hooks/usePredictions';

const { data: leaderboard, isLoading } = useLeaderboard();

// leaderboard: [
//   { rank, user_id, display_name, accuracy_rate, total_votes, isMe },
//   ...
// ]
```

### 5. AccuracyBadge.tsx (적중률 뱃지)

#### 기능
- **적중률에 따라 색상 변경**
  - 80%+: 금색 "📊 분석가"
  - 60~79%: 은색 "🎯 스나이퍼"
  - 40~59%: 동색 "🔰 입문자"
  - ~39%: 회색 "🌱 새싹"

```typescript
const getBadgeConfig = (accuracy: number) => {
  if (accuracy >= 80) return { emoji: '📊', label: '분석가', color: 'yellow' };
  if (accuracy >= 60) return { emoji: '🎯', label: '스나이퍼', color: 'gray' };
  if (accuracy >= 40) return { emoji: '🔰', label: '입문자', color: 'bronze' };
  return { emoji: '🌱', label: '새싹', color: 'gray' };
};
```

---

## 🎨 디자인 가이드

### 투표 버튼
- **YES**: bg-green-500 hover:bg-green-600
- **NO**: bg-red-500 hover:bg-red-600
- **크기**: h-12, rounded-xl, font-semibold

### 프로그레스 바
```typescript
<View className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
  <View
    className="absolute h-full bg-green-500"
    style={{ width: `${yesPercent}%` }}
  />
</View>
```

### 마감 타이머
- **24시간 이상**: 회색 "D-2"
- **24시간 미만**: 주황색 "12시간 남음"
- **1시간 미만**: 빨간색 "⏰ 45분 남음"

---

## ✅ 완료 체크리스트

- [ ] `PredictionPollCard.tsx` 생성 (활성 투표)
- [ ] `YesterdayReviewSection.tsx` 생성 (어제 복기)
- [ ] `PollResultCard.tsx` 생성 (복기 카드)
- [ ] `LeaderboardCard.tsx` 생성 (리더보드)
- [ ] `AccuracyBadge.tsx` 생성 (적중률 뱃지)
- [ ] 투표 애니메이션 (버튼 → 결과 전환)
- [ ] 다크 모드 대응
- [ ] TypeScript 에러 0개 확인

---

## 🚨 주의사항

1. **다른 Agent와 파일 충돌 방지**
   - `app/(tabs)/index.tsx`는 Agent 5가 통합합니다.
   - 당신은 **컴포넌트만** 만드세요.

2. **기존 훅 활용**
   - `usePredictions.ts`에 모든 데이터 로직이 있습니다.
   - 새로운 API 호출을 만들지 마세요.

3. **폴백 데이터**
   - `usePredictions` 훅에 폴백 데이터가 이미 있습니다.
   - DB가 비어있어도 3개 질문이 보입니다.

4. **커밋 금지**
   - 코드만 작성하고, 커밋은 사용자가 합니다.

---

## 📚 참고 파일

- `src/hooks/usePredictions.ts` (데이터 구조)
- `src/types/prediction.ts` (타입 정의)
- `supabase/migrations/20260208_predictions.sql` (DB 스키마)

---

## 🎯 성공 기준

**사용자가 "매일 3문제 푸는 게 재밌어서 자연스럽게 투자 공부가 되네?"라고 느끼면 성공입니다.**

시작하세요! 🎮
