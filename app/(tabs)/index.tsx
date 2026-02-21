/**
 * index.tsx - 홈 탭 (습관 루프 강화 Phase 3)
 *
 * 역할: "투자 신호등 메인 화면"
 * - 3개 카드 스와이프 (건강/맥락/예측) — 풀스크린
 * - 총 자산 Pulse + 전일 대비 변동
 *
 * Anti-Toss 5원칙:
 * 1. Gateway: 3장 스와이프 → 30초 → 퇴장
 * 2. Heart/Like: 가격 없음, 건강 점수만
 * 3. 빼기 전략: 핵심 정보만 노출
 * 4. One Page One Card: 한 화면에 카드 1장
 * 5. 보험 BM: 신호등 무료, 상세 프리미엄
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

// 3카드 시스템
import CardSwipeContainer from '../../src/components/home/CardSwipeContainer';
import HealthSignalCard from '../../src/components/home/HealthSignalCard';
import ContextBriefCard from '../../src/components/home/ContextBriefCard';
import PredictionVoteCard from '../../src/components/home/PredictionVoteCard';
import { ErrorBoundary, Toast, ToastType } from '../../src/components/common';

// 진단용 (Supabase 연결 상태 확인 — 문제 해결 후 제거)
import ConnectionStatus from '../../src/components/common/ConnectionStatus';

// 크로스탭 연동 배너 (투자 철학 변경 / 뱃지 획득 / 투자 기준 리마인더)
import CrossTabBanners from '../../src/components/home/CrossTabBanners';

// P0.1: 복기 카드 (4번째 스와이프 — 습관 루프 완성)
import YesterdayReviewCard from '../../src/components/home/YesterdayReviewCard';

// P0.2: 스트릭 + 습관 루프 진행률 배너
import DailyProgressBanner from '../../src/components/home/DailyProgressBanner';
import { useHabitLoopTracking } from '../../src/hooks/useHabitLoopTracking';

// P0.3: 시장 위기 배너
import CrisisBanner from '../../src/components/home/CrisisBanner';
import { useCrisisAlert } from '../../src/hooks/useCrisisAlert';

// 스트릭 복구 & 마일스톤 축하
import StreakRecoveryModal from '../../src/components/common/StreakRecoveryModal';
import MilestoneCelebration from '../../src/components/common/MilestoneCelebration';

// 맥락 카드 전체 모달
import ContextCard from '../../src/components/home/ContextCard';

// 데이터 훅
import { useHeartAssets } from '../../src/hooks/useHeartAssets';
import { useContextCard } from '../../src/hooks/useContextCard';
import ContextShareCard from '../../src/components/home/ContextShareCard';
import {
  usePersonalizedPolls,
  useMyVotes,
  useResolvedPolls,
  useSubmitVote,
  useMyPredictionStats,
  useGlobalPredictionStats,
  useResolvedPollNotification,
} from '../../src/hooks/usePredictions';
import { useSubscriptionStatus } from '../../src/hooks/useSubscription';
import { useMyCredits } from '../../src/hooks/useCredits';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { usePrices } from '../../src/hooks/usePrices';

// 신호등 변환 서비스
import {
  convertContextToBriefing,
} from '../../src/services/trafficLightScore';
import { convertToContextCardData } from '../../src/services/contextCardService';
import { useScreenTracking } from '../../src/hooks/useAnalytics';
import { usePushSetup, PUSH_PERMISSION_ELIGIBLE_KEY } from '../../src/hooks/usePushSetup';
import { useTheme } from '../../src/hooks/useTheme';
import { useStreak } from '../../src/hooks/useStreak';
import { useStreakRecovery } from '../../src/hooks/useStreakRecovery';

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function HomeScreen() {
  // 화면 진입 추적 + Push 알림 초기화
  useScreenTracking('today');
  usePushSetup();

  // P1.2: 예측 결과 알림 (어제 결과 나온 투표가 있으면 로컬 알림 발송, 하루 1회)
  useResolvedPollNotification();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  // ──────────────────────────────────────────────────────────────────────
  // 스트릭 복구 & 마일스톤 축하
  // ──────────────────────────────────────────────────────────────────────
  const { currentStreak, isNewStreak } = useStreak();
  const {
    daysMissed,
    previousStreak,
    recoverStreak,
    showRecoveryModal,
    dismissRecoveryModal,
  } = useStreakRecovery();

  // P0.2: 습관 루프 진행률 추적
  const { todayProgress } = useHabitLoopTracking();

  // P0.3: 시장 위기 감지
  const crisisAlert = useCrisisAlert();

  // 마일스톤 축하 상태
  const [milestoneToShow, setMilestoneToShow] = useState<number | null>(null);

  // 마일스톤 체크: 7, 30, 90, 365일 달성 시 축하 모달 표시
  const STREAK_MILESTONES = [7, 30, 90, 365];
  const MILESTONE_SHOWN_KEY = '@baln:milestone_shown';

  useEffect(() => {
    if (!isNewStreak || currentStreak === 0) return;

    // 현재 스트릭이 마일스톤에 해당하는지 확인
    if (!STREAK_MILESTONES.includes(currentStreak)) return;

    // AsyncStorage에서 이미 표시한 마일스톤인지 확인
    const checkMilestone = async () => {
      try {
        const shownRaw = await AsyncStorage.getItem(MILESTONE_SHOWN_KEY);
        const shownSet: number[] = shownRaw ? JSON.parse(shownRaw) : [];

        if (!shownSet.includes(currentStreak)) {
          // 아직 표시하지 않은 마일스톤 → 축하 모달 표시
          setMilestoneToShow(currentStreak);

          // 표시 완료 기록
          shownSet.push(currentStreak);
          await AsyncStorage.setItem(MILESTONE_SHOWN_KEY, JSON.stringify(shownSet));
        }
      } catch (error) {
        console.warn('[HomeScreen] 마일스톤 체크 에러:', error);
      }
    };

    checkMilestone();
  }, [currentStreak, isNewStreak]);

  // 스트릭 복구 핸들러 (StreakRecoveryModal의 onRecover 시그니처에 맞춤)
  const handleStreakRecover = React.useCallback(async (_cost: number) => {
    await recoverStreak();
  }, [recoverStreak]);

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
  const { assets: allPortfolioAssets, totalAssets } = useSharedPortfolio();

  // 유동 자산만 필터링 (부동산 제외)
  const liquidAssetsForHome = React.useMemo(
    () => allPortfolioAssets.filter(a => a.ticker && !a.ticker.startsWith('RE_')),
    [allPortfolioAssets]
  );

  // 라이브 가격 조회 — 24h 변화율 포함 (TanStack Query 캐시로 분석탭과 공유)
  const { prices: homeLivePrices } = usePrices(liquidAssetsForHome, { currency: 'KRW' });

  // 전일 대비 수익률: 보유 자산별 24h 변화율(percentChange24h) × 포트폴리오 비중 가중합
  // ─ 스냅샷(DB 원가 기반)은 시장가 반영 안 됨 → percentChange24h 사용
  const dailyChangeRate = React.useMemo(() => {
    if (!liquidAssetsForHome.length || totalAssets <= 0) return null;

    const liquidTotal = liquidAssetsForHome.reduce((s, a) => s + (a.currentValue || 0), 0);
    if (liquidTotal <= 0) return null;

    let weightedChange = 0;
    let weightCovered = 0;

    for (const asset of liquidAssetsForHome) {
      if (!asset.ticker) continue;
      const priceData = homeLivePrices[asset.ticker];
      if (priceData?.percentChange24h == null) continue;
      const w = (asset.currentValue || 0) / liquidTotal;
      weightedChange += w * priceData.percentChange24h;
      weightCovered += w;
    }

    // 포트폴리오의 30% 이상이 가격 데이터로 커버될 때만 표시 (신뢰도 기준)
    if (weightCovered < 0.3) return null;
    return weightedChange;
  }, [liquidAssetsForHome, homeLivePrices, totalAssets]);

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
        onAnalysisPress: () => router.push('/(tabs)/rebalance'),
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
      onAnalysisPress: () => router.push('/(tabs)/rebalance'),
      onAssetPress: (name: string) => router.push('/(tabs)/rebalance'),
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
  const { data: contextData, isLoading: contextLoading, effectiveData: contextEffective, updateTimeLabel } = useContextCard();
  const { isPremium } = useSubscriptionStatus();
  const { data: creditBalance } = useMyCredits();
  const [shareModalVisible, setShareModalVisible] = React.useState(false);

  const contextBriefProps = React.useMemo(() => {
    if (!contextData) {
      // DB 데이터 없어도 effectiveData(폴백 포함)를 사용해 빈 화면 방지
      const fallbackCard = contextEffective?.card;
      const fallbackImpact = contextEffective?.userImpact;
      const fallbackBriefing = fallbackCard ? convertContextToBriefing({
        headline: fallbackCard.headline || '시장은 늘 변동합니다',
        macroChain: fallbackCard.macro_chain || [],
        portfolioImpact: { message: fallbackImpact?.impact_message || '' },
        sentiment: fallbackCard.sentiment || 'calm',
      }) : null;

      return {
        fact: fallbackBriefing?.fact || '시장은 늘 변동하지만, 맥락을 알면 불안은 줄어듭니다',
        mechanism: fallbackBriefing?.mechanism || '매일 아침 7시, 새로운 시장 분석이 도착합니다',
        impact: fallbackBriefing?.impact || null,
        sentiment: (fallbackBriefing?.sentiment || 'calm') as 'calm' | 'caution' | 'alert',
        sentimentLabel: fallbackBriefing?.sentimentLabel || '안정',
        date: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
        onLearnMore: () => router.push('/marketplace'),
        isPremium: isPremium || false,
        onShare: undefined,
        isLoading: contextLoading,
        updateTimeLabel,
        // 5겹 레이어 데이터 (effectiveData에서 추출)
        historicalContext: fallbackCard?.historical_context,
        macroChain: fallbackCard?.macro_chain,
        politicalContext: fallbackCard?.political_context,
        institutionalBehavior: fallbackCard?.institutional_behavior,
        portfolioImpact: fallbackImpact ? {
          percentChange: fallbackImpact.percent_change ?? 0,
          healthScoreChange: fallbackImpact.health_score_change ?? 0,
          message: fallbackImpact.impact_message || '오늘의 시장 변동에 따른 영향을 분석했습니다.',
          isCalculating: false,
        } : null,
      };
    }

    // contextData = { card: ContextCard, userImpact: UserContextImpact | null }
    const { card, userImpact } = contextData;

    // 4겹 맥락카드 → 3줄 브리핑 변환
    const briefing = convertContextToBriefing({
      headline: card.headline || '오늘의 시장 분석',
      macroChain: card.macro_chain || [],
      portfolioImpact: { message: userImpact?.impact_message || '' },
      sentiment: card.sentiment || 'calm',
    });

    return {
      fact: briefing.fact,
      mechanism: briefing.mechanism,
      impact: briefing.impact,
      sentiment: briefing.sentiment,
      sentimentLabel: briefing.sentimentLabel,
      date: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
      onLearnMore: () => {
        setContextModalVisible(true);
        // P1.1: 맥락 카드를 처음 열면 알림 권한 요청 자격 부여
        // 이후 앱 재실행 시 usePushSetup이 이 키를 확인해 권한 팝업을 표시함
        AsyncStorage.setItem(PUSH_PERMISSION_ELIGIBLE_KEY, 'true').catch(() => {});
      },
      isPremium: isPremium || false,
      onShare: () => setShareModalVisible(true),
      isLoading: contextLoading,
      updateTimeLabel,
      // 5겹 레이어 데이터 전달
      historicalContext: card.historical_context,
      macroChain: card.macro_chain,
      politicalContext: card.political_context,
      institutionalBehavior: card.institutional_behavior,
      portfolioImpact: userImpact ? {
        percentChange: userImpact.percent_change ?? 0,
        healthScoreChange: userImpact.health_score_change ?? 0,
        message: userImpact.impact_message || '오늘의 시장 변동에 따른 영향을 분석했습니다.',
        isCalculating: false,
      } : null,
    };
  }, [contextData, contextEffective, contextLoading, isPremium, router, showToast, updateTimeLabel]);

  // ──────────────────────────────────────────────────────────────────────
  // 3. 예측 투표 카드 데이터 (3개 질문 지원)
  // ──────────────────────────────────────────────────────────────────────
  // 포트폴리오 자산 기반 맞춤 정렬 — allPortfolioAssets는 위 183번 라인에서 이미 조회됨
  const { data: activePolls = [] } = usePersonalizedPolls(allPortfolioAssets);
  const { data: resolvedPolls = [] } = useResolvedPolls(10);
  const { mutate: submitVote, isPending: isVoting } = useSubmitVote();
  const { data: myStats } = useMyPredictionStats();
  const { data: globalStats } = useGlobalPredictionStats();

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
    const yesPercentage = totalVotes > 0 && currentPoll
      ? (currentPoll.yes_count / totalVotes) * 100
      : 0;
    const noPercentage = totalVotes > 0 && currentPoll
      ? (currentPoll.no_count / totalVotes) * 100
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
              showToast('🎯 투표 완료! 적중하면 +3C 획득', 'success');
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
              showToast('🎯 투표 완료! 적중하면 +3C 획득', 'success');
            },
            onError: (error: any) => {
              showToast(error?.message || '투표에 실패했습니다.', 'error');
            },
          }
        );
      },
      onViewHistory: () => router.push('/games/predictions'),
      onViewContext: () => setContextModalVisible(true),
      isLoading: false,
      isVoting,
      // AI 트랙레코드 배너
      globalAccuracy: globalStats?.accuracy ?? null,
      globalResolvedCount: globalStats?.resolvedCount ?? 0,
      onTrackRecordPress: () => router.push('/games/predictions'),
    };
  }, [currentPoll, pollsForCard, myVote, myVotesChoiceMap, recentResults, myStats, globalStats, router, submitVote, showToast, isVoting]);

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
  const handleCardChange = React.useCallback((_index: number) => {
    // 프로덕션에서 불필요한 console.log 제거 (성능 개선)
  }, []);

  // 모달 콜백 (매 렌더 시 새 함수 생성 방지)
  const handleModalClose = React.useCallback(() => setContextModalVisible(false), []);
  const handlePressPremium = React.useCallback(() => {
    setContextModalVisible(false);
    router.push('/subscription/paywall');
  }, [router]);
  const handleToastHide = React.useCallback(() => setToastVisible(false), []);

  // ──────────────────────────────────────────────────────────────────────
  // 렌더링
  // ──────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 진단용: Supabase 연결 상태 (개발 모드에서만 표시) */}
      {__DEV__ && <ConnectionStatus />}

      {/* 크로스탭 연동 배너 (투자 철학 변경 / 뱃지 / 투자 기준) */}
      <CrossTabBanners />

      {/* P0.2: 스트릭 + 오늘 습관 루프 진행률 */}
      <DailyProgressBanner
        currentStreak={currentStreak}
        todayProgress={todayProgress}
        creditBalance={creditBalance?.balance ?? null}
      />

      {/* P0.3: 시장 위기 배너 (위기 감지 시만 표시) */}
      <CrisisBanner
        crisisLevel={crisisAlert.crisisLevel}
        crisisMessage={crisisAlert.crisisMessage}
        primaryMarket={crisisAlert.primaryMarket}
        primaryChange={crisisAlert.primaryChange}
        onViewContext={() => setContextModalVisible(true)}
      />

      <CardSwipeContainer
        labels={['내 자산', '오늘 시장', '내 예측', '어제 결과']}
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
          <ContextBriefCard {...contextBriefProps} />
        </ErrorBoundary>

        {/* 카드 3: 예측 투표 (3개 질문 수평 스크롤) */}
        <ErrorBoundary>
          <PredictionVoteCard {...predictionVoteProps} />
        </ErrorBoundary>

        {/* 카드 4: 어제 예측 복기 (습관 루프 완성) */}
        <ErrorBoundary>
          <YesterdayReviewCard
            results={recentResults}
            accuracyRate={myStats?.accuracy_rate ?? null}
            onViewHistory={() => router.push('/games/predictions')}
            onStartPrediction={() => router.push('/games/predictions')}
          />
        </ErrorBoundary>
      </CardSwipeContainer>

      {/* 맥락 카드 전체 모달 (4겹 레이어) */}
      <Modal
        visible={contextModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {fullContextCardData && (
            <ContextCard
              data={fullContextCardData}
              isPremium={isPremium || false}
              onPressPremium={handlePressPremium}
              onClose={handleModalClose}
            />
          )}
        </View>
      </Modal>

      {/* 스트릭 복구 모달 */}
      <StreakRecoveryModal
        visible={showRecoveryModal}
        onClose={dismissRecoveryModal}
        daysMissed={daysMissed}
        previousStreak={previousStreak}
        onRecover={handleStreakRecover}
      />

      {/* 마일스톤 축하 모달 */}
      <MilestoneCelebration
        milestone={milestoneToShow ?? 7}
        visible={milestoneToShow !== null}
        onClose={() => setMilestoneToShow(null)}
      />

      {/* 맥락 카드 공유 모달 (인스타 스토리 포맷) */}
      {fullContextCardData && (
        <ContextShareCard
          data={fullContextCardData}
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
        />
      )}

      {/* Toast 알림 */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={handleToastHide}
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
  modalContainer: {
    flex: 1,
    // backgroundColor는 동적으로 적용됨
    paddingTop: 60, // Safe area
  },
});
