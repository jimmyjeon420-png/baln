/**
 * index.tsx - 홈 탭 (습관 루프 강화 Phase 3)
 *
 * 역할: "투자 신호등 메인 화면"
 * - 3개 카드 스와이프 (건강/맥락/예측)
 * - 어제 예측 복기 카드 (습관 루프 핵심)
 * - 총 자산 Pulse + 전일 대비 변동
 * - 3개 예측 질문 수평 스크롤
 *
 * Anti-Toss 5원칙:
 * 1. Gateway: 3장 스와이프 → 30초 → 퇴장
 * 2. Heart/Like: 가격 없음, 건강 점수만
 * 3. 빼기 전략: 핵심 정보만 노출
 * 4. One Page One Card: 한 화면에 카드 1장
 * 5. 보험 BM: 신호등 무료, 상세 프리미엄
 */

import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

// 3카드 시스템
import CardSwipeContainer from '../../src/components/home/CardSwipeContainer';
import HealthSignalCard from '../../src/components/home/HealthSignalCard';
import ContextBriefCard from '../../src/components/home/ContextBriefCard';
import PredictionVoteCard from '../../src/components/home/PredictionVoteCard';
import StreakBanner from '../../src/components/home/StreakBanner';
import YesterdayReviewCard from '../../src/components/home/YesterdayReviewCard';
import PredictionVote from '../../src/components/home/PredictionVote';
import PredictionReview from '../../src/components/home/PredictionReview';
import { ErrorBoundary, Toast, ToastType, OfflineBanner } from '../../src/components/common';

// 맥락 카드 전체 모달
import ContextCard from '../../src/components/home/ContextCard';

// 데이터 훅
import { useHeartAssets } from '../../src/hooks/useHeartAssets';
import { useContextCard, useShareContextCard } from '../../src/hooks/useContextCard';
import {
  useActivePolls,
  useMyVotes,
  useResolvedPolls,
  useSubmitVote,
  useMyPredictionStats,
  useYesterdayReview,
} from '../../src/hooks/usePredictions';
import { useSubscriptionStatus } from '../../src/hooks/useSubscription';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { useMySnapshots } from '../../src/hooks/usePortfolioSnapshots';

// 신호등 변환 서비스
import {
  convertContextToBriefing,
} from '../../src/services/trafficLightScore';
import { convertToContextCardData } from '../../src/services/contextCardService';
import { useScreenTracking } from '../../src/hooks/useAnalytics';
import { usePushSetup } from '../../src/hooks/usePushSetup';
import { useTheme } from '../../src/hooks/useTheme';

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function HomeScreen() {
  // 화면 진입 추적 + Push 알림 초기화
  useScreenTracking('today');
  usePushSetup();

  const router = useRouter();
  const queryClient = useQueryClient();
  const contextCardRef = React.useRef(null);
  const { colors } = useTheme();

  // 맥락 카드 전체 모달 상태
  const [contextModalVisible, setContextModalVisible] = React.useState(false);

  // Pull-to-refresh 상태
  const [refreshing, setRefreshing] = React.useState(false);

  // Toast 상태
  const [toastVisible, setToastVisible] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<ToastType>('info');

  // Pull-to-refresh 핸들러
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // 모든 쿼리 무효화 (전체 데이터 새로고침)
      await queryClient.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  // Toast 표시 함수
  const showToast = React.useCallback((message: string, type: ToastType = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  // ──────────────────────────────────────────────────────────────────────
  // 0. 포트폴리오 데이터 (총자산 Pulse용)
  // ──────────────────────────────────────────────────────────────────────
  const { totalAssets } = useSharedPortfolio();
  const { data: snapshots } = useMySnapshots(2); // 최근 2일 스냅샷

  // 전일 대비 수익률 계산
  const dailyChangeRate = React.useMemo(() => {
    if (!snapshots || snapshots.length < 2) return null;
    const yesterday = snapshots[snapshots.length - 2];
    const today = snapshots[snapshots.length - 1];
    if (!yesterday || !today || yesterday.total_assets <= 0) return null;
    const deposit = today.net_deposit_since_last || 0;
    return ((today.total_assets - yesterday.total_assets - deposit) / yesterday.total_assets) * 100;
  }, [snapshots]);

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

  // 건강 점수 → 신호등 변환 + 총자산 Pulse
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
        totalAssets: 0,
        dailyChangeRate: null,
      };
    }

    // 데이터 상태 (null 안전 필터링)
    const assetSignals = (heartAssetsWithSignal || [])
      .filter(a => a?.name)
      .slice(0, 5)
      .map(a => ({
        name: a.name ?? 'Unknown',
        signal: a.signal ?? 'neutral',
      }));

    return {
      healthScore: portfolioHealthScore,
      healthGrade: portfolioGrade,
      gradeLabel: portfolioGradeLabel,
      assetSignals,
      hasAssets: true,
      isLoading: heartLoading,
      onAddAssets: () => router.push('/add-asset'),
      totalAssets,
      dailyChangeRate,
    };
  }, [
    hasAssets,
    portfolioHealthScore,
    portfolioGrade,
    portfolioGradeLabel,
    heartAssetsWithSignal,
    heartLoading,
    router,
    totalAssets,
    dailyChangeRate,
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

    // 4겹 맥락카드 → 3줄 브리핑 변환 (타입 안전 캐스팅)
    const typedContext = contextData as {
      headline?: string;
      macroChain?: string[];
      portfolioImpact?: { message?: string };
      sentiment?: 'calm' | 'caution' | 'alert';
    } | null;
    const briefing = convertContextToBriefing({
      headline: typedContext?.headline || '오늘의 시장 분석',
      macroChain: typedContext?.macroChain || [],
      portfolioImpact: typedContext?.portfolioImpact || { message: '' },
      sentiment: typedContext?.sentiment || 'calm',
    });

    return {
      fact: briefing.fact,
      mechanism: briefing.mechanism,
      impact: briefing.impact,
      sentiment: briefing.sentiment,
      sentimentLabel: briefing.sentimentLabel,
      date: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
      onLearnMore: () => setContextModalVisible(true), // 모달 열기
      isPremium: isPremium || false,
      onShare: () => {
        shareContext(
          { viewRef: contextCardRef },
          {
            onSuccess: () => {
              showToast('맥락 카드를 공유했습니다!', 'success');
            },
            onError: () => {
              showToast('공유에 실패했습니다. 다시 시도해주세요.', 'error');
            },
          }
        );
      },
      isLoading: contextLoading,
    };
  }, [contextData, contextLoading, isPremium, router, shareContext, showToast]);

  // ──────────────────────────────────────────────────────────────────────
  // 3. 예측 투표 카드 데이터 (3개 질문 지원)
  // ──────────────────────────────────────────────────────────────────────
  const { data: activePolls = [] } = useActivePolls();
  const { data: resolvedPolls = [] } = useResolvedPolls(10);
  const { mutate: submitVote, isPending: isVoting } = useSubmitVote();
  const { data: myStats } = useMyPredictionStats();

  // 오늘의 투표 (최대 3개)
  const todayPolls = activePolls.slice(0, 3);

  // 하위호환: 첫 번째 질문
  const currentPoll = todayPolls.length > 0 ? todayPolls[0] : null;

  // 내 투표 조회 (활성 + 종료 모두)
  const allPollIds = [
    ...todayPolls.map(p => p.id),
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

  // 다중 질문용 myVotesMap (pollId → 'YES'|'NO')
  const myVotesChoiceMap = React.useMemo(() => {
    const map: Record<string, 'YES' | 'NO'> = {};
    myVotesArray.forEach(vote => {
      map[vote.poll_id] = vote.vote;
    });
    return map;
  }, [myVotesArray]);

  const myVote = currentPoll && myVotesMap[currentPoll.id]
    ? myVotesMap[currentPoll.id].vote
    : null;

  // 지난주 복기 (최대 3개) + 해설 데이터
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
        description: poll.description || undefined,
        source: poll.source || undefined,
      };
    });
  }, [resolvedPolls, myVotesMap, isPremium]);

  // 3개 질문 → PollItem 배열로 변환
  const pollsForCard = React.useMemo(() => {
    return todayPolls.map(poll => {
      const total = poll.yes_count + poll.no_count;
      return {
        id: poll.id,
        question: poll.question,
        category: poll.category,
        yesPercentage: total > 0 ? (poll.yes_count / total) * 100 : 0,
        noPercentage: total > 0 ? (poll.no_count / total) * 100 : 0,
        totalVotes: total,
        deadline: poll.deadline,
      };
    });
  }, [todayPolls]);

  const predictionVoteProps = React.useMemo(() => {
    // 하위호환용 첫 번째 질문 비율
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
      // 다중 질문 지원
      polls: pollsForCard.length > 0 ? pollsForCard : undefined,
      myVote,
      myVotesMap: myVotesChoiceMap,
      recentResults,
      accuracyRate: myStats?.accuracy_rate ?? null,
      // 하위호환 단일 투표
      onVote: (choice: 'YES' | 'NO') => {
        if (!currentPoll) return;
        submitVote(
          { pollId: currentPoll.id, vote: choice },
          {
            onSuccess: () => {
              showToast('투표 완료! 내일 결과를 확인하세요', 'success');
            },
            onError: (error: any) => {
              showToast(error?.message || '투표에 실패했습니다. 다시 시도해주세요.', 'error');
            },
          }
        );
      },
      // 다중 질문 투표
      onVotePoll: (pollId: string, choice: 'YES' | 'NO') => {
        submitVote(
          { pollId, vote: choice },
          {
            onSuccess: () => {
              showToast('투표 완료!', 'success');
            },
            onError: (error: any) => {
              showToast(error?.message || '투표에 실패했습니다.', 'error');
            },
          }
        );
      },
      onViewHistory: () => router.push('/games/predictions'),
      isLoading: false,
      isVoting,
    };
  }, [currentPoll, pollsForCard, myVote, myVotesChoiceMap, recentResults, myStats, router, submitVote, showToast, isVoting]);

  // ──────────────────────────────────────────────────────────────────────
  // 4. 어제 예측 복기 데이터 (YesterdayReviewCard)
  // ──────────────────────────────────────────────────────────────────────
  const {
    data: yesterdayPolls,
    isLoading: yesterdayLoading,
    summary: yesterdaySummary,
  } = useYesterdayReview();

  // 어제 복기 결과 변환
  const yesterdayResults = React.useMemo(() => {
    if (!yesterdayPolls || yesterdayPolls.length === 0) return [];

    return yesterdayPolls.map(poll => {
      const reward = poll.myIsCorrect ? (isPremium ? 4 : 2) : 0;
      return {
        question: poll.question,
        myVote: (poll.myVote || 'YES') as 'YES' | 'NO',
        correctAnswer: (poll.correct_answer || 'YES') as 'YES' | 'NO',
        isCorrect: poll.myIsCorrect === true,
        reward,
        description: poll.description || undefined,
        source: poll.source || undefined,
      };
    });
  }, [yesterdayPolls, isPremium]);

  // ──────────────────────────────────────────────────────────────────────
  // 4-1. 새 PredictionVote / PredictionReview 데이터 어댑터
  // ──────────────────────────────────────────────────────────────────────
  const adaptedQuestions = React.useMemo(() => {
    return todayPolls.map(poll => ({
      id: poll.id,
      text: poll.question,
      options: ['YES', 'NO'],
      votedOption: myVotesChoiceMap[poll.id] || undefined,
    }));
  }, [todayPolls, myVotesChoiceMap]);

  const adaptedReviews = React.useMemo(() => {
    return yesterdayResults.map((r, i) => ({
      id: `review-${i}`,
      question: r.question,
      myAnswer: r.myVote,
      correctAnswer: r.correctAnswer,
      isCorrect: r.isCorrect,
      explanation: r.description || '해설이 아직 준비되지 않았습니다.',
    }));
  }, [yesterdayResults]);

  const predictionCreditsEarned = React.useMemo(() => {
    return adaptedQuestions.filter(q => q.votedOption).length * 2;
  }, [adaptedQuestions]);

  const reviewCreditsEarned = React.useMemo(() => {
    return adaptedReviews.filter(r => r.isCorrect).length * 3;
  }, [adaptedReviews]);

  // ──────────────────────────────────────────────────────────────────────
  // 맥락 카드 전체 데이터 (모달용)
  // ──────────────────────────────────────────────────────────────────────
  const fullContextCardData = React.useMemo(() => {
    if (!contextData) return null;
    return convertToContextCardData(contextData);
  }, [contextData]);

  // ──────────────────────────────────────────────────────────────────────
  // 메모이제이션된 콜백
  // ──────────────────────────────────────────────────────────────────────
  const handleSettingsPress = React.useCallback(() => {
    router.push('/settings/profile');
  }, [router]);

  const handleCardChange = React.useCallback((index: number) => {
    console.log('[CardSwipe] 카드 전환:', index);
  }, []);

  const handleViewHistory = React.useCallback(() => {
    router.push('/games/predictions');
  }, [router]);

  // ──────────────────────────────────────────────────────────────────────
  // 렌더링
  // ──────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 네트워크 끊김 감지 배너 (최상단) */}
      <OfflineBanner />

      {/* 연속 방문 배너 (상단 고정) */}
      <View style={styles.streakContainer}>
        <StreakBanner />
      </View>

      <CardSwipeContainer
        labels={['건강', '맥락', '예측']}
        onSettingsPress={handleSettingsPress}
        initialIndex={0}
        onCardChange={handleCardChange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      >
        {/* 카드 1: 건강 신호등 + 총자산 Pulse */}
        <ErrorBoundary>
          <HealthSignalCard {...healthSignalProps} />
        </ErrorBoundary>

        {/* 카드 2: 맥락 브리핑 */}
        <ErrorBoundary>
          <ContextBriefCard ref={contextCardRef} {...contextBriefProps} />
        </ErrorBoundary>

        {/* 카드 3: 예측 투표 (3개 질문 수평 스크롤) */}
        <ErrorBoundary>
          <PredictionVoteCard {...predictionVoteProps} />
        </ErrorBoundary>
      </CardSwipeContainer>

      {/* 어제 예측 복기 카드 (스와이프 아래 배치, 데이터 있을 때만) */}
      {yesterdayResults.length > 0 && (
        <View style={styles.reviewSection}>
          <YesterdayReviewCard
            results={yesterdayResults}
            accuracyRate={myStats?.accuracy_rate ?? null}
            onViewHistory={handleViewHistory}
          />
        </View>
      )}

      {/* 새 예측 투표 카드 (다중 옵션 + 크레딧 애니메이션) */}
      {adaptedQuestions.length > 0 && (
        <View style={styles.reviewSection}>
          <PredictionVote
            questions={adaptedQuestions}
            onVote={(questionId, option) => {
              submitVote(
                { pollId: questionId, vote: option as 'YES' | 'NO' },
                {
                  onSuccess: () => showToast('투표 완료! +2C (₩200)', 'success'),
                  onError: (err: any) => showToast(err?.message || '투표 실패', 'error'),
                }
              );
            }}
            creditsEarned={predictionCreditsEarned}
          />
        </View>
      )}

      {/* 새 예측 복기 카드 (아코디언 + 스트릭) */}
      {adaptedReviews.length > 0 && (
        <View style={styles.reviewSection}>
          <PredictionReview
            reviews={adaptedReviews}
            streak={myStats?.current_streak ?? 0}
            accuracy={myStats?.accuracy_rate ?? 0}
            creditsEarned={reviewCreditsEarned}
          />
        </View>
      )}

      {/* 맥락 카드 전체 모달 (4겹 레이어) */}
      <Modal
        visible={contextModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setContextModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {fullContextCardData && (
            <ContextCard
              data={fullContextCardData}
              isPremium={isPremium || false}
              onPressPremium={() => {
                setContextModalVisible(false);
                router.push('/paywall');
              }}
              onClose={() => setContextModalVisible(false)}
            />
          )}
        </View>
      </Modal>

      {/* Toast 알림 */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor는 동적으로 적용됨
  },
  streakContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  reviewSection: {
    // 복기 카드는 CardSwipeContainer 바로 아래에 배치
    // 카드 스와이프와 겹치지 않도록 absolute가 아닌 일반 flow
    paddingBottom: 16,
  },
  modalContainer: {
    flex: 1,
    // backgroundColor는 동적으로 적용됨
    paddingTop: 60, // Safe area
  },
});
