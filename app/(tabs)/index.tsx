/**
 * index.tsx - 홈 탭 (Anti-Toss 리디자인)
 *
 * 역할: "투자 신호등 메인 화면"
 * - 기존 10개 카드 제거 → 3개 카드 스와이프로 교체
 * - 가격 표시 없음, 건강 점수 중심
 * - 30초 안에 모든 정보 확인 (Gateway 원칙)
 *
 * Anti-Toss 5원칙:
 * 1. Gateway: 3장 스와이프 → 30초 → 퇴장
 * 2. Heart/Like: 가격 없음, 건강 점수만
 * 3. 빼기 전략: ScrollView 제거, 탭바 제거
 * 4. One Page One Card: 한 화면에 카드 1장
 * 5. 보험 BM: 신호등 무료, 상세 프리미엄
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// 새 3카드 시스템
import CardSwipeContainer from '../../src/components/home/CardSwipeContainer';
import HealthSignalCard from '../../src/components/home/HealthSignalCard';
import ContextBriefCard from '../../src/components/home/ContextBriefCard';
import PredictionVoteCard from '../../src/components/home/PredictionVoteCard';

// 데이터 훅
import { useHeartAssets } from '../../src/hooks/useHeartAssets';
import { useContextCard, useShareContextCard } from '../../src/hooks/useContextCard';
import {
  useActivePolls,
  useMyVotes,
  useResolvedPolls,
  useSubmitVote,
  useMyPredictionStats,
} from '../../src/hooks/usePredictions';
import { useSubscriptionStatus } from '../../src/hooks/useSubscription';

// 신호등 변환 서비스
import {
  getTrafficLight,
  getAssetSignals,
  convertContextToBriefing,
  getEmptyTrafficLight,
} from '../../src/services/trafficLightScore';
import { COLORS } from '../../src/styles/theme';

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function HomeScreen() {
  const router = useRouter();
  const contextCardRef = React.useRef(null);

  // ──────────────────────────────────────────────────────────────────────
  // 1. 건강 신호등 카드 데이터
  // ──────────────────────────────────────────────────────────────────────
  const {
    heartAssets,
    heartAssetsWithSignal,
    hasAssets,
    portfolioHealthScore,
    portfolioGrade,
    portfolioGradeLabel,
    isLoading: heartLoading,
  } = useHeartAssets();

  // 건강 점수 → 신호등 변환
  const healthSignalProps = React.useMemo(() => {
    if (!hasAssets || portfolioHealthScore === null) {
      // Empty 상태
      return {
        healthScore: null,
        healthGrade: null,
        gradeLabel: null,
        assetSignals: [],
        hasAssets: false,
        isLoading: heartLoading,
        onAddAssets: () => router.push('/add-asset'),
      };
    }

    // 데이터 상태
    const assetSignals = heartAssetsWithSignal.slice(0, 5).map(a => ({
      name: a.name,
      signal: a.signal,
    }));

    return {
      healthScore: portfolioHealthScore,
      healthGrade: portfolioGrade,
      gradeLabel: portfolioGradeLabel,
      assetSignals,
      hasAssets: true,
      isLoading: heartLoading,
      onAddAssets: () => router.push('/add-asset'),
    };
  }, [
    hasAssets,
    portfolioHealthScore,
    portfolioGrade,
    portfolioGradeLabel,
    heartAssetsWithSignal,
    heartLoading,
    router,
  ]);

  // ──────────────────────────────────────────────────────────────────────
  // 2. 맥락 브리핑 카드 데이터
  // ──────────────────────────────────────────────────────────────────────
  const { data: contextData, isLoading: contextLoading } = useContextCard();
  const { isPremium } = useSubscriptionStatus();
  const { mutate: shareContext } = useShareContextCard();

  const contextBriefProps = React.useMemo(() => {
    if (!contextData) {
      return {
        fact: null,
        mechanism: null,
        impact: null,
        sentiment: 'calm' as const,
        sentimentLabel: '안정',
        date: '',
        onLearnMore: () => router.push('/marketplace'),
        isPremium: isPremium || false,
        onShare: undefined,
        isLoading: contextLoading,
      };
    }

    // 4겹 맥락카드 → 3줄 브리핑 변환
    const briefing = convertContextToBriefing({
      headline: (contextData as any).headline,
      macroChain: (contextData as any).macroChain,
      portfolioImpact: (contextData as any).portfolioImpact,
      sentiment: (contextData as any).sentiment || 'calm',
    });

    return {
      fact: briefing.fact,
      mechanism: briefing.mechanism,
      impact: briefing.impact,
      sentiment: briefing.sentiment,
      sentimentLabel: briefing.sentimentLabel,
      date: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
      onLearnMore: () => router.push('/marketplace'),
      isPremium: isPremium || false,
      onShare: () => shareContext({ viewRef: contextCardRef }),
      isLoading: contextLoading,
    };
  }, [contextData, contextLoading, isPremium, router]);

  // ──────────────────────────────────────────────────────────────────────
  // 3. 예측 투표 카드 데이터
  // ──────────────────────────────────────────────────────────────────────
  const { data: activePolls = [] } = useActivePolls();
  const { data: resolvedPolls = [] } = useResolvedPolls(10);
  const { mutate: submitVote, isPending: isVoting } = useSubmitVote();
  const { data: myStats } = useMyPredictionStats();

  // 오늘의 투표 (1개만)
  const currentPoll = activePolls.length > 0 ? activePolls[0] : null;

  // 내 투표 조회
  const allPollIds = [
    ...(currentPoll ? [currentPoll.id] : []),
    ...resolvedPolls.map(p => p.id),
  ];
  const { data: myVotesArray = [] } = useMyVotes(allPollIds);

  // 배열 → Map 변환
  const myVotesMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    myVotesArray.forEach(vote => {
      map[vote.poll_id] = vote;
    });
    return map;
  }, [myVotesArray]);

  const myVote = currentPoll && myVotesMap[currentPoll.id]
    ? myVotesMap[currentPoll.id].vote
    : null;

  // 지난주 복기 (최대 3개)
  const recentResults = React.useMemo(() => {
    if (!resolvedPolls || resolvedPolls.length === 0) return [];

    return resolvedPolls.slice(0, 3).map(poll => {
      const vote = myVotesMap[poll.id];
      const isCorrect = vote ? vote.vote === poll.correct_answer : false;
      const reward = isCorrect ? (isPremium ? 4 : 2) : 0;

      return {
        question: poll.question,
        myVote: vote?.vote || 'YES',
        correctAnswer: poll.correct_answer || 'YES',
        isCorrect,
        reward,
      };
    });
  }, [resolvedPolls, myVotesMap, isPremium]);

  const predictionVoteProps = React.useMemo(() => {
    // yes/no 비율 계산
    const totalVotes = currentPoll
      ? (currentPoll.yes_count + currentPoll.no_count)
      : 0;
    const yesPercentage = totalVotes > 0
      ? (currentPoll!.yes_count / totalVotes) * 100
      : 0;
    const noPercentage = totalVotes > 0
      ? (currentPoll!.no_count / totalVotes) * 100
      : 0;

    return {
      currentPoll: currentPoll ? {
        id: currentPoll.id,
        question: currentPoll.question,
        category: currentPoll.category,
        yesPercentage,
        noPercentage,
        totalVotes,
        deadline: currentPoll.deadline,
      } : null,
      myVote,
      recentResults,
      accuracyRate: myStats?.accuracy_rate ?? null,
      onVote: (choice: 'YES' | 'NO') => {
        if (!currentPoll) return;
        submitVote({ pollId: currentPoll.id, vote: choice });
      },
      onViewHistory: () => router.push('/games/predictions'),
      isLoading: false,
      isVoting,
    };
  }, [currentPoll, myVote, recentResults, router]);

  // ──────────────────────────────────────────────────────────────────────
  // 렌더링
  // ──────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CardSwipeContainer
        labels={['건강', '맥락', '예측']}
        onSettingsPress={() => router.push('/settings/profile')}
        initialIndex={0}
        onCardChange={(index) => {
          console.log('[CardSwipe] 카드 전환:', index);
        }}
      >
        {/* 카드 1: 건강 신호등 */}
        <HealthSignalCard {...healthSignalProps} />

        {/* 카드 2: 맥락 브리핑 */}
        <View ref={contextCardRef} style={{ flex: 1 }}>
          <ContextBriefCard {...contextBriefProps} />
        </View>

        {/* 카드 3: 예측 투표 */}
        <PredictionVoteCard {...predictionVoteProps} />
      </CardSwipeContainer>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
