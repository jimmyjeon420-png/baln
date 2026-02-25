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
import { View, Text, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '../../src/context/LocaleContext';
import { t as rawT } from '../../src/locales';

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

// 동물의숲 × 주토피아 — 구루 마을
import { GuruVillage } from '../../src/components/village/GuruVillage';

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
import { useGuruStyle } from '../../src/hooks/useGuruStyle';

// 마을 세계관 연동
import { useWeather } from '../../src/hooks/useWeather';
import { useMarketSentiment } from '../../src/hooks/useMarketSentiment';
import { getDailyQuote } from '../../src/data/guruQuoteBank';
import WeatherBadge from '../../src/components/common/WeatherBadge';

function extractTaggedLine(source: string | null | undefined, tag: string): string | null {
  if (!source) return null;
  const regex = new RegExp(`^${tag}:\\s*(.+)$`, 'm');
  const match = source.match(regex);
  return match?.[1]?.trim() || null;
}

function buildReviewDescription(
  description: string | null | undefined,
  source: string | null | undefined,
  myVote: 'YES' | 'NO' | null,
  isCorrect: boolean,
): string | undefined {
  const parts: string[] = [];
  if (description?.trim()) {
    parts.push(description.trim());
  }

  if (myVote) {
    // DB 저장 태그는 항상 한국어 (Edge Function 고정값)
    const scenario = extractTaggedLine(source, myVote === 'YES' ? 'YES 시나리오' : 'NO 시나리오');
    if (scenario) {
      parts.push(`${isCorrect ? rawT('home.review_description.success_reason') : rawT('home.review_description.fail_reason')}: ${scenario}`);
    }
  }

  const learning = extractTaggedLine(source, '학습포인트');
  if (learning) {
    parts.push(`${rawT('home.review_description.learning_point')}: ${learning}`);
  }

  if (parts.length === 0) return undefined;
  return parts.join('\n\n');
}

function buildReviewSource(source: string | null | undefined): string | undefined {
  if (!source) return undefined;

  // DB 저장 태그는 항상 한국어 (Edge Function 고정값)
  const observed = extractTaggedLine(source, '관측데이터');
  const check = extractTaggedLine(source, '조건검증');
  const reasoning = extractTaggedLine(source, '핵심근거');
  const refs = extractTaggedLine(source, '출처');

  const summaryLines = [
    observed ? `${rawT('home.review_source.observed')}: ${observed}` : null,
    check ? `${rawT('home.review_source.condition')}: ${check}` : null,
    reasoning ? `${rawT('home.review_source.reasoning')}: ${reasoning}` : null,
    refs ? `${rawT('home.review_source.source')}: ${refs}` : null,
  ].filter(Boolean) as string[];

  if (summaryLines.length === 0) return source;
  return summaryLines.join('\n');
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function HomeScreen() {
  const { t, language } = useLocale();

  // 화면 진입 추적 + Push 알림 초기화
  useScreenTracking('today');
  usePushSetup();

  // P1.2: 예측 결과 알림 (어제 결과 나온 투표가 있으면 로컬 알림 발송, 하루 1회)
  useResolvedPollNotification();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { guruStyle } = useGuruStyle();

  // 마을 연동: 날씨 + 시장 심리 + 오늘의 명언
  const { weather, clothingLevel } = useWeather();
  const { sentiment, setSentimentFromPortfolio } = useMarketSentiment();
  const dailyQuote = getDailyQuote();

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

  // 시장 심리 피드 (포트폴리오 변동률 → 마을 감정 연동)
  useEffect(() => {
    if (dailyChangeRate !== null && dailyChangeRate !== undefined) {
      setSentimentFromPortfolio(dailyChangeRate);
    }
  }, [dailyChangeRate, setSentimentFromPortfolio]);

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
        selectedGuruId: guruStyle,
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
      selectedGuruId: guruStyle,
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
    guruStyle,
  ]);

  // ──────────────────────────────────────────────────────────────────────
  // 2. 맥락 브리핑 카드 데이터
  // ──────────────────────────────────────────────────────────────────────
  const {
    data: contextData,
    isLoading: contextLoading,
    effectiveData: contextEffective,
    updateTimeLabel,
    isFallback: isContextFallback,
    isStale: isContextStale,
    freshnessLabel,
  } = useContextCard();
  const { isPremium } = useSubscriptionStatus();
  const { data: creditBalance } = useMyCredits();
  const [shareModalVisible, setShareModalVisible] = React.useState(false);

  const contextBriefProps = React.useMemo(() => {
    if (!contextData) {
      // DB 데이터 없어도 effectiveData(폴백 포함)를 사용해 빈 화면 방지
      const fallbackCard = contextEffective?.card;
      const fallbackImpact = contextEffective?.userImpact;
      const fallbackBriefing = fallbackCard ? convertContextToBriefing({
        headline: fallbackCard.headline || t('home.context_fallback.headline'),
        macroChain: fallbackCard.macro_chain || [],
        portfolioImpact: { message: fallbackImpact?.impact_message || '' },
        sentiment: fallbackCard.sentiment || 'calm',
      }) : null;

      const fallbackUpdateLabel = isContextFallback
        ? t('home.context_freshness.temp_data')
        : (isContextStale && freshnessLabel ? freshnessLabel : updateTimeLabel);

      return {
        fact: fallbackBriefing?.fact || t('home.context_fallback.fact'),
        mechanism: fallbackBriefing?.mechanism || t('home.context_fallback.mechanism'),
        impact: fallbackBriefing?.impact || null,
        sentiment: (fallbackBriefing?.sentiment || 'calm') as 'calm' | 'caution' | 'alert',
        sentimentLabel: fallbackBriefing?.sentimentLabel || t('home.context_sentiment.calm'),
        date: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
        onLearnMore: () => router.push('/marketplace'),
        isPremium: isPremium || false,
        onShare: undefined,
        isLoading: contextLoading,
        updateTimeLabel: fallbackUpdateLabel,
        dataSource: contextEffective?.dataSource ?? t('home.context_message.standard_fallback'),
        dataTimestamp: contextEffective?.dataTimestamp ?? fallbackCard?.created_at ?? null,
        confidenceNote: contextEffective?.confidenceNote ?? t('home.context_message.temp_card_estimate'),
        confidenceScore: isContextFallback ? 58 : (isContextStale ? 72 : 84),
        freshnessLabel: isContextFallback ? t('home.context_freshness.temp_data') : (isContextStale ? (freshnessLabel ?? t('home.context_freshness.previous_analysis')) : t('home.context_freshness.latest')),
        // 5겹 레이어 데이터 (effectiveData에서 추출)
        historicalContext: fallbackCard?.historical_context,
        macroChain: fallbackCard?.macro_chain,
        politicalContext: fallbackCard?.political_context,
        institutionalBehavior: fallbackCard?.institutional_behavior,
        portfolioImpact: fallbackImpact ? {
          percentChange: fallbackImpact.percent_change ?? 0,
          healthScoreChange: fallbackImpact.health_score_change ?? 0,
          message: fallbackImpact.impact_message || t('home.context_portfolio_impact.default'),
          isCalculating: false,
        } : null,
      };
    }

    // contextData = { card: ContextCard, userImpact: UserContextImpact | null }
    const { card, userImpact } = contextData;

    // 4겹 맥락카드 → 3줄 브리핑 변환
    const briefing = convertContextToBriefing({
      headline: card.headline || t('context_card.default_market_analysis'),
      macroChain: card.macro_chain || [],
      portfolioImpact: { message: userImpact?.impact_message || '' },
      sentiment: card.sentiment || 'calm',
    });

    const contextUpdateLabel = isContextFallback
      ? t('home.context_freshness.temp_data')
      : (isContextStale && freshnessLabel ? freshnessLabel : updateTimeLabel);

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
      updateTimeLabel: contextUpdateLabel,
      dataSource: contextData.dataSource ?? contextEffective?.dataSource ?? t('home.data_source.baln_engine'),
      dataTimestamp: contextData.dataTimestamp ?? card.created_at ?? null,
      confidenceNote: contextData.confidenceNote ?? t('context_card.confidence_live'),
      confidenceScore: isContextFallback ? 58 : (isContextStale ? 74 : 87),
      freshnessLabel: isContextFallback ? t('home.context_freshness.temp_data') : (isContextStale ? (freshnessLabel ?? t('home.context_freshness.previous_analysis')) : t('home.context_freshness.latest')),
      // 5겹 레이어 데이터 전달
      historicalContext: card.historical_context,
      macroChain: card.macro_chain,
      politicalContext: card.political_context,
      institutionalBehavior: card.institutional_behavior,
      portfolioImpact: userImpact ? {
        percentChange: userImpact.percent_change ?? 0,
        healthScoreChange: userImpact.health_score_change ?? 0,
        message: userImpact.impact_message || t('home.context_portfolio_impact.default'),
        isCalculating: false,
      } : null,
    };
  }, [
    contextData,
    contextEffective,
    contextLoading,
    isPremium,
    router,
    showToast,
    updateTimeLabel,
    isContextFallback,
    isContextStale,
    freshnessLabel,
    t,
  ]);

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
  // 🐛 FIX: 투표하지 않은 폴을 먼저 필터링 (미투표 폴이 'YES'로 표시되는 버그 수정)
  const recentResults = React.useMemo(() => {
    if (!resolvedPolls || resolvedPolls.length === 0) return [];

    return resolvedPolls
      .filter(poll => myVotesMap[poll.id]) // 내가 투표한 폴만
      .slice(0, 3)
      .map(poll => {
        const vote = myVotesMap[poll.id];
        const myVoteChoice = vote.vote;
        const isCorrect = vote.vote === poll.correct_answer;
        const reward = isCorrect ? (isPremium ? 4 : 2) : 0;

        return {
          question: poll.question,
          myVote: myVoteChoice,
          correctAnswer: poll.correct_answer || 'YES',
          isCorrect,
          reward,
          description: buildReviewDescription(poll.description, poll.source, myVoteChoice, isCorrect),
          source: buildReviewSource(poll.source),
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
        source: poll.source ?? undefined,
        createdAt: poll.created_at ?? undefined,
        upReason: poll.up_reason ?? undefined,
        downReason: poll.down_reason ?? undefined,
      };
    });
  }, [todayPolls]);

  const predictionTrustMeta = React.useMemo(() => {
    const firstPoll = todayPolls[0];
    const hasFallback = todayPolls.some((poll) => poll.source === 'fallback');
    const avgVotes = todayPolls.length > 0
      ? todayPolls.reduce((sum, poll) => sum + poll.yes_count + poll.no_count, 0) / todayPolls.length
      : 0;

    // 표본 크기 기반 보수적 추정 점수 (클라이언트 추정치)
    const estimatedConfidence = hasFallback
      ? 55
      : Math.min(92, 62 + Math.round(Math.log10(avgVotes + 1) * 18));

    let freshness = t('home.prediction.latest');
    if (firstPoll?.created_at) {
      const createdAtMs = new Date(firstPoll.created_at).getTime();
      if (Number.isFinite(createdAtMs)) {
        const ageHours = (Date.now() - createdAtMs) / (1000 * 60 * 60);
        if (ageHours >= 24) freshness = t('home.prediction.needs_update');
      }
    }

    return {
      sourceLabel: hasFallback ? t('home.prediction.fallback_source') : t('home.prediction.baln_engine_source'),
      generatedAt: firstPoll?.created_at ?? null,
      freshnessLabel: hasFallback ? t('home.prediction.fallback_freshness') : freshness,
      confidenceScore: estimatedConfidence,
    };
  }, [todayPolls, t]);

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
              showToast(t('home.toast.vote_success'), 'success');
            },
            onError: (error: any) => {
              showToast(error?.message || t('home.toast.vote_error'), 'error');
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
              showToast(t('home.toast.multi_vote_success'), 'success');
            },
            onError: (error: any) => {
              showToast(error?.message || t('home.toast.multi_vote_error'), 'error');
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
      isFallbackData: todayPolls.some((poll) => poll.source === 'fallback'),
      trustMeta: predictionTrustMeta,
    };
  }, [currentPoll, pollsForCard, myVote, myVotesChoiceMap, recentResults, myStats, globalStats, router, submitVote, showToast, isVoting, todayPolls, predictionTrustMeta, t]);

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

      {/* P0.2: 스트릭 + 오늘 습관 루프 진행률 */}
      <DailyProgressBanner
        currentStreak={currentStreak}
        todayProgress={todayProgress}
        creditBalance={creditBalance?.balance ?? null}
      />

      {/* 마을 날씨 배지 (compact — 스트릭 배너 아래, 좌측 정렬) */}
      <View style={styles.weatherRow}>
        <WeatherBadge
          weather={weather}
          clothingLevel={clothingLevel}
          compact
          colors={colors}
          locale={language}
        />
        {sentiment && (
          <View style={[styles.sentimentBadge, { backgroundColor: colors.surfaceLight }]}>
            <Text style={styles.sentimentEmoji}>{sentiment.emoji}</Text>
            <Text style={[styles.sentimentLabel, { color: colors.textSecondary }]}>
              {language === 'ko' ? sentiment.label : sentiment.labelEn}
            </Text>
          </View>
        )}
      </View>

      {/* 크로스탭 연동 배너는 일정 이상 습관이 형성된 사용자에게만 노출 */}
      {currentStreak >= 3 && <CrossTabBanners />}

      {/* P0.3: 시장 위기 배너 (위기 감지 시만 표시) */}
      <CrisisBanner
        crisisLevel={crisisAlert.crisisLevel}
        crisisMessage={crisisAlert.crisisMessage}
        primaryMarket={crisisAlert.primaryMarket}
        primaryChange={crisisAlert.primaryChange}
        onViewContext={() => setContextModalVisible(true)}
      />

      {/* 🏘️ 구루 마을 — 동물의숲 × 주토피아 (구루들이 살아 움직이는 마을) */}
      <GuruVillage
        height={240}
        onRoundtablePress={() => router.push('/roundtable')}
      />

      <CardSwipeContainer
        labels={[
          t('home.card_labels.my_assets'),
          t('home.card_labels.today_market'),
          t('home.card_labels.my_predictions'),
          t('home.card_labels.yesterday_review'),
        ]}
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

      {/* 오늘의 투자 명언 (구루 명언 은행 — 날짜 기반 결정론적 선택) */}
      {dailyQuote && (
        <View style={[styles.quoteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.quoteEmoji}>💬</Text>
          <Text style={[styles.quoteText, { color: colors.textSecondary }]}>
            "{language === 'ko' ? dailyQuote.quote : dailyQuote.quoteEn}"
          </Text>
          <Text style={[styles.quoteAuthor, { color: colors.textTertiary }]}>
            {(() => {
              const GURU_LABELS: Record<string, string> = {
                buffett: t('home.quote_author.buffett'),
                dalio: t('home.quote_author.dalio'),
                cathie_wood: t('home.quote_author.cathie_wood'),
                druckenmiller: t('home.quote_author.druckenmiller'),
                saylor: t('home.quote_author.saylor'),
                dimon: t('home.quote_author.dimon'),
                musk: t('home.quote_author.musk'),
                lynch: t('home.quote_author.lynch'),
                marks: t('home.quote_author.marks'),
                rogers: t('home.quote_author.rogers'),
              };
              return '— ' + (GURU_LABELS[dailyQuote.guruId] ?? dailyQuote.guruId);
            })()}
          </Text>
        </View>
      )}

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
  // ── 마을 날씨 배지 (WeatherBadge + 시장 심리) ──
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  sentimentEmoji: {
    fontSize: 13,
  },
  sentimentLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // ── 오늘의 투자 명언 카드 ──
  quoteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  quoteEmoji: {
    fontSize: 18,
  },
  quoteText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
});
