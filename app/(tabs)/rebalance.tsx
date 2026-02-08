/**
 * 처방전 화면 — "아침에 가장 먼저 보고 싶은 화면"
 *
 * [아키텍처] 오케스트레이터 패턴
 * 이 파일은 데이터를 수집하고, 6개 독립 섹션 컴포넌트에 전달하는 역할만 합니다.
 * 각 섹션은 src/components/rebalance/ 에 독립 파일로 존재합니다.
 *
 * 섹션 목록:
 * 1. HeroSection — 총자산 + 전일 변동 + CFO 코멘트
 * 2. MarketWeatherSection — 시장 날씨 카드
 * 3. KostolanyEggCard — 금리 사이클 나침반 (기존 컴포넌트)
 * 4. TodayActionsSection — BUY/SELL/WATCH 액션
 * 5. RiskDashboardSection — Panic Shield + FOMO Vaccine
 * 6. BitcoinConvictionCard — BTC 확신 점수 (기존 컴포넌트)
 * 7. HoldingsSection — 보유 자산 리스트
 * 8. 맞춤 전략 배너 + AI 조언 + 마켓플레이스 배너 + 면책
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  AppState,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DiagnosisSkeletonLoader, SkeletonBlock } from '../../src/components/SkeletonLoader';
import BitcoinConvictionCard from '../../src/components/BitcoinConvictionCard';
import KostolanyEggCard from '../../src/components/KostolanyEggCard';
import { KostolanyLogic } from '../../src/services/KostolanyLogic';
import { TIER_LABELS } from '../../src/hooks/useGatherings';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { useSharedAnalysis, useSharedBitcoin, useBitcoinPrice } from '../../src/hooks/useSharedAnalysis';
import { usePeerPanicScore, getAssetBracket, useMySnapshots } from '../../src/hooks/usePortfolioSnapshots';
import { TIER_STRATEGIES } from '../../src/constants/tierStrategy';
import FreePeriodBanner from '../../src/components/FreePeriodBanner';
import { isFreePeriod } from '../../src/config/freePeriod';
import { usePrices } from '../../src/hooks/usePrices';
import { AssetType } from '../../src/types/asset';
import { calculateHealthScore } from '../../src/services/rebalanceScore';

// ── 분리된 섹션 컴포넌트 ──
import HeroSection from '../../src/components/rebalance/HeroSection';
import MarketWeatherSection from '../../src/components/rebalance/MarketWeatherSection';
import TodayActionsSection from '../../src/components/rebalance/TodayActionsSection';
import RiskDashboardSection from '../../src/components/rebalance/RiskDashboardSection';
import HoldingsSection from '../../src/components/rebalance/HoldingsSection';
import HealthScoreSection from '../../src/components/rebalance/HealthScoreSection';
import AllocationDriftSection from '../../src/components/rebalance/AllocationDriftSection';
import AssetTrendSection from '../../src/components/rebalance/AssetTrendSection';
import CorrelationHeatmapSection from '../../src/components/rebalance/CorrelationHeatmapSection';

// 요일 이름
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 새로고침 완료 토스트 (페이드인/아웃)
function RefreshToast({ visible }: { visible: boolean }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      RNAnimated.sequence([
        RNAnimated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.delay(1500),
        RNAnimated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <RNAnimated.View style={[toastStyles.container, { opacity }]}>
      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
      <Text style={toastStyles.text}>최신 데이터로 갱신됨</Text>
    </RNAnimated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,20,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
  },
  text: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
});

// 포그라운드 복귀 자동 갱신 최소 간격 (5분)
const AUTO_REFRESH_THRESHOLD = 5 * 60 * 1000;

export default function RebalanceScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const lastRefreshRef = useRef(Date.now());
  const toastKeyRef = useRef(0);

  // ══════════════════════════════════════════
  // 데이터 수집 (공유 훅)
  // ══════════════════════════════════════════

  const {
    assets: allAssets,
    portfolioAssets: portfolio,
    totalAssets,
    userTier,
    isLoading: portfolioLoading,
    isFetched: initialCheckDone,
    hasAssets,
    refresh: refreshPortfolio,
  } = useSharedPortfolio();

  const {
    morningBriefing,
    riskAnalysis: analysisResult,
    isFetched: analysisReady,
    refresh: refreshAnalysis,
  } = useSharedAnalysis(portfolio);

  const { data: bitcoinIntelligence } = useSharedBitcoin();
  const { data: btcLivePrice } = useBitcoinPrice();

  const myBracket = getAssetBracket(totalAssets);
  const { data: peerPanicData } = usePeerPanicScore(myBracket);

  // 자산 추이 차트용 스냅샷 (최근 90일)
  const { data: trendSnapshots, isLoading: trendLoading } = useMySnapshots(90);

  const onRefresh = useCallback(async (showRefreshToast = true) => {
    setRefreshing(true);
    await Promise.all([refreshPortfolio(), refreshAnalysis()]);
    lastRefreshRef.current = Date.now();
    setRefreshing(false);
    if (showRefreshToast) {
      toastKeyRef.current += 1;
      setShowToast(false);
      // 약간의 딜레이 후 토스트 표시 (상태 리셋 보장)
      setTimeout(() => setShowToast(true), 50);
    }
  }, [refreshPortfolio, refreshAnalysis]);

  // 포그라운드 복귀 시 5분 이상 경과하면 자동 갱신
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const elapsed = Date.now() - lastRefreshRef.current;
        if (elapsed >= AUTO_REFRESH_THRESHOLD) {
          onRefresh(true);
        }
      }
    });
    return () => sub.remove();
  }, [onRefresh]);

  // ══════════════════════════════════════════
  // 로딩 / 빈 상태
  // ══════════════════════════════════════════

  const isPortfolioLoading = !initialCheckDone || portfolioLoading;
  const isAILoading = hasAssets && !analysisReady;
  const analysisFailed = analysisReady && hasAssets && !morningBriefing && !analysisResult;

  if (isPortfolioLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ScrollView><DiagnosisSkeletonLoader /></ScrollView>
      </SafeAreaView>
    );
  }

  if (initialCheckDone && totalAssets === 0 && portfolio.length === 0) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.emptyContainer}>
          <View style={s.emptyIcon}>
            <Ionicons name="scan-outline" size={48} color="#4CAF50" />
          </View>
          <Text style={s.emptyTitle}>포트폴리오를 등록해주세요</Text>
          <Text style={s.emptyDesc}>
            보유 자산을 등록하시면{'\n'}
            <Text style={{ color: '#4CAF50', fontWeight: '700' }}>매일 아침 맞춤 브리핑</Text>을 받아보실 수 있습니다
          </Text>
          <TouchableOpacity style={s.emptyButton} onPress={() => router.push('/add-asset')}>
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text style={s.emptyButtonText}>자산 등록하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════
  // 파생 데이터
  // ══════════════════════════════════════════

  const now = new Date();
  const dateString = `${now.getMonth() + 1}월 ${now.getDate()}일 (${DAY_NAMES[now.getDay()]})`;

  // 손익: 클라이언트 즉시 계산 (AI 의존 제거)
  // 이전: Gemini 결과(3-8초) 도착 전에는 0으로 표시되는 버그
  // 수정: portfolioAssets의 avgPrice/currentPrice로 즉시 계산
  const { clientGainLoss, clientGainPercent } = useMemo(() => {
    if (portfolio.length === 0) return { clientGainLoss: 0, clientGainPercent: 0 };
    const totalInvested = portfolio.reduce((sum, a) => sum + (a.avgPrice * a.quantity), 0);
    const gl = portfolio.reduce((sum, a) => sum + ((a.currentPrice - a.avgPrice) * a.quantity), 0);
    const pct = totalInvested > 0 ? (gl / totalInvested) * 100 : 0;
    return { clientGainLoss: gl, clientGainPercent: pct };
  }, [portfolio]);

  const snapshot = analysisResult?.portfolioSnapshot;
  const totalGainLoss = clientGainLoss;
  const gainPercent = clientGainPercent;

  const tierStrategy = TIER_STRATEGIES[userTier];

  // 6팩터 건강 점수 (순수 함수, AI 미사용, 즉시 계산)
  const healthScore = useMemo(() => calculateHealthScore(allAssets, totalAssets), [allAssets, totalAssets]);

  // 액션 정렬: HIGH → MEDIUM → LOW, SELL/WATCH → BUY → HOLD
  const sortedActions = useMemo(() =>
    [...(morningBriefing?.portfolioActions ?? [])].sort((a, b) => {
      const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const actionOrder: Record<string, number> = { SELL: 0, WATCH: 1, BUY: 2, HOLD: 3 };
      const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return (actionOrder[a.action] ?? 3) - (actionOrder[b.action] ?? 3);
    }),
  [morningBriefing]);

  // 코스톨라니 달걀 분석
  const eggAnalysis = useMemo(() => {
    if (!morningBriefing) return null;
    const logic = KostolanyLogic.getInstance();
    return logic.analyzeFromBriefing({
      interestRateProbability: morningBriefing.macroSummary.interestRateProbability,
      marketSentiment: morningBriefing.macroSummary.marketSentiment,
    });
  }, [morningBriefing]);

  // 오늘의 액션 종목: 실시간 가격 조회
  const priceTargets = useMemo(() => {
    if (sortedActions.length === 0) return [];
    const seen = new Set<string>();
    return sortedActions
      .filter(a => {
        if (!a.ticker || seen.has(a.ticker)) return false;
        seen.add(a.ticker);
        return true;
      })
      .map(a => ({
        id: a.ticker,
        name: a.name || a.ticker,
        ticker: a.ticker,
        currentValue: 0,
        targetAllocation: 0,
        createdAt: Date.now(),
        assetType: AssetType.LIQUID,
      }));
  }, [sortedActions]);

  const { prices: livePrices } = usePrices(priceTargets, {
    currency: 'KRW',
    autoRefreshMs: 300000,
  });

  // ══════════════════════════════════════════
  // 렌더 — 섹션 컴포넌트 조합
  // ══════════════════════════════════════════

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* 새로고침 완료 토스트 */}
      <RefreshToast key={toastKeyRef.current} visible={showToast} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => onRefresh(true)} tintColor="#4CAF50" />}
      >

        {/* 무료 기간 배너 */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <FreePeriodBanner compact={true} />
        </View>

        {/* 1. 히어로 */}
        <HeroSection
          dateString={dateString}
          tierLabel={TIER_LABELS[userTier]}
          tierColor={tierStrategy.color}
          totalAssets={totalAssets}
          totalGainLoss={totalGainLoss}
          gainPercent={gainPercent}
          cfoWeather={morningBriefing?.cfoWeather}
        />

        {/* 1.3. 처방 히스토리 버튼 */}
        {hasAssets && (
          <TouchableOpacity
            style={s.historyButton}
            onPress={() => router.push('/rebalance-history')}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={16} color="#64B5F6" />
            <Text style={s.historyButtonText}>처방 히스토리</Text>
            <Ionicons name="chevron-forward" size={16} color="#64B5F6" />
          </TouchableOpacity>
        )}

        {/* 1.4. 자산 추이 차트 */}
        {hasAssets && (
          <AssetTrendSection
            snapshots={trendSnapshots ?? []}
            isLoading={trendLoading}
            currentTotal={totalAssets}
          />
        )}

        {/* 1.5. 건강 점수 (6팩터, AI 없이 즉시 표시) */}
        {hasAssets && <HealthScoreSection healthScore={healthScore} />}

        {/* 1.6. 배분 이탈도 (목표 vs 현재) */}
        {hasAssets && <AllocationDriftSection assets={allAssets} totalAssets={totalAssets} />}

        {/* 1.7. 상관관계 히트맵 (자산 궁합 차트) */}
        {hasAssets && <CorrelationHeatmapSection assets={allAssets} totalAssets={totalAssets} />}

        {/* AI 로딩 배너 */}
        {isAILoading && (
          <View style={s.aiLoadingBanner}>
            <View style={s.aiLoadingDot} />
            <Text style={s.aiLoadingText}>AI가 시장을 분석하고 있습니다...</Text>
          </View>
        )}

        {/* AI 분석 실패 */}
        {analysisFailed && (
          <View style={s.aiErrorBanner}>
            <Ionicons name="alert-circle" size={16} color="#CF6679" />
            <Text style={s.aiErrorText}>AI 분석 실패</Text>
            <TouchableOpacity onPress={() => onRefresh(true)} style={s.aiRetryButton}>
              <Text style={s.aiRetryText}>재시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. 시장 날씨 */}
        <MarketWeatherSection
          morningBriefing={morningBriefing}
          isAILoading={isAILoading}
        />

        {/* 2.5. 코스톨라니 달걀 */}
        {eggAnalysis && (
          <KostolanyEggCard
            analysis={eggAnalysis}
            interestRateText={morningBriefing?.macroSummary.interestRateProbability}
          />
        )}

        {/* 달걀 스켈레톤 */}
        {isAILoading && !eggAnalysis && (
          <View style={s.skeletonCard}>
            <SkeletonBlock width={140} height={16} />
            <View style={{ marginTop: 14, flexDirection: 'row', gap: 12 }}>
              <SkeletonBlock width={150} height={120} style={{ borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
                <SkeletonBlock width={80} height={14} />
                <SkeletonBlock width="100%" height={14} />
                <SkeletonBlock width={100} height={28} style={{ borderRadius: 8 }} />
              </View>
            </View>
          </View>
        )}

        {/* 3. 오늘의 액션 */}
        <TodayActionsSection
          sortedActions={sortedActions}
          portfolio={portfolio}
          livePrices={livePrices}
          totalAssets={totalAssets}
          isAILoading={isAILoading}
        />

        {/* 4. 리스크 대시보드 */}
        <RiskDashboardSection
          analysisResult={analysisResult}
          peerPanicData={peerPanicData}
          isAILoading={isAILoading}
        />

        {/* 5. Bitcoin Conviction Score */}
        {bitcoinIntelligence ? (
          <BitcoinConvictionCard data={bitcoinIntelligence} livePrice={btcLivePrice} />
        ) : isAILoading ? (
          <View style={s.skeletonCard}>
            <SkeletonBlock width={160} height={16} />
            <View style={{ marginTop: 14, alignItems: 'center', gap: 10 }}>
              <SkeletonBlock width={120} height={120} style={{ borderRadius: 60 }} />
              <SkeletonBlock width={80} height={14} />
              <SkeletonBlock width="90%" height={12} />
            </View>
          </View>
        ) : null}

        {/* 6. 보유 자산 */}
        <HoldingsSection
          portfolio={portfolio}
          totalAssets={totalAssets}
          snapshot={snapshot}
        />

        {/* 7. 맞춤 전략 배너 */}
        <TouchableOpacity
          style={[s.strategyBanner, { borderColor: tierStrategy.color + '30' }]}
          onPress={() => router.push('/tier-strategy')}
          activeOpacity={0.7}
        >
          <View style={[s.strategyBannerIcon, { backgroundColor: tierStrategy.color + '15' }]}>
            <Ionicons name="bulb" size={20} color={tierStrategy.color} />
          </View>
          <View style={s.strategyBannerText}>
            <Text style={s.strategyBannerLabel}>{TIER_LABELS[userTier]} 맞춤 전략</Text>
            <Text style={[s.strategyBannerTitle, { color: tierStrategy.color }]}>{tierStrategy.title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#666" />
        </TouchableOpacity>

        {/* 8. AI 맞춤 조언 */}
        {analysisResult && analysisResult.personalizedAdvice.length > 0 && (
          <>
            <TouchableOpacity
              style={s.collapsibleHeader}
              onPress={() => setShowAdvice(!showAdvice)}
              activeOpacity={0.7}
            >
              <View style={s.collapsibleLeft}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#4CAF50" />
                <Text style={s.collapsibleTitle}>AI 맞춤 조언</Text>
                <Text style={s.collapsibleCount}>{analysisResult.personalizedAdvice.length}건</Text>
              </View>
              <Ionicons name={showAdvice ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
            </TouchableOpacity>

            {showAdvice && (
              <View style={s.collapsibleBody}>
                {analysisResult.personalizedAdvice.map((advice: string, idx: number) => (
                  <View key={idx} style={s.adviceItem}>
                    <View style={s.adviceNumber}>
                      <Text style={s.adviceNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={s.adviceText}>{advice}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* 9. AI 마켓플레이스 배너 */}
        <TouchableOpacity
          style={s.marketplaceBanner}
          onPress={() => router.push('/marketplace')}
          activeOpacity={0.7}
        >
          <View style={s.marketplaceBannerLeft}>
            <Ionicons name="sparkles" size={20} color="#7C4DFF" />
            <View>
              <Text style={s.marketplaceBannerTitle}>
                {isFreePeriod() ? 'AI 프리미엄 마켓 \u00B7 지금 무료!' : 'AI 프리미엄 마켓'}
              </Text>
              <Text style={s.marketplaceBannerDesc}>종목 딥다이브 · What-If · 세금 리포트 · AI CFO</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#666" />
        </TouchableOpacity>

        {/* 면책 문구 */}
        <View style={s.disclaimerBox}>
          <Text style={s.disclaimer}>
            본 서비스는 금융위원회에 등록된 투자자문업·투자일임업이 아니며, 제공되는 정보는 투자 권유가 아닙니다. AI 분석 결과는 과거 데이터 기반이며 미래 수익을 보장하지 않습니다. 투자 원금의 일부 또는 전부를 잃을 수 있으며, 투자 결정은 전적으로 본인의 판단과 책임 하에 이루어져야 합니다. 본 서비스는 예금자보호법에 따른 보호 대상이 아닙니다.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════
// 스타일 (오케스트레이터 전용 — 섹션별 스타일은 각 컴포넌트에 내장)
// ══════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { paddingBottom: 100 },

  // 스켈레톤 카드
  skeletonCard: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },

  // AI 로딩/에러 배너
  aiLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.06)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.1)',
  },
  aiLoadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  aiLoadingText: { fontSize: 13, color: '#4CAF50', fontWeight: '500' },
  aiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(207,102,121,0.06)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,102,121,0.1)',
  },
  aiErrorText: { flex: 1, fontSize: 13, color: '#CF6679', fontWeight: '500' },
  aiRetryButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(207,102,121,0.15)' },
  aiRetryText: { fontSize: 12, color: '#CF6679', fontWeight: '600' },

  // 맞춤 전략 배너
  strategyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  strategyBannerIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  strategyBannerText: { flex: 1 },
  strategyBannerLabel: { fontSize: 11, color: '#888', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  strategyBannerTitle: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  // 접기/펼치기 공통
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#141414',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  collapsibleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapsibleTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  collapsibleCount: { fontSize: 12, color: '#666' },
  collapsibleBody: {
    marginHorizontal: 16,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    marginTop: -4,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },

  // AI 조언
  adviceItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  adviceNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  adviceNumberText: { fontSize: 11, fontWeight: '700', color: '#000' },
  adviceText: { flex: 1, fontSize: 13, color: '#BBB', lineHeight: 20 },

  // 빈 상태
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(76,175,80,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8, marginTop: 28 },
  emptyButtonText: { fontSize: 15, fontWeight: '700', color: '#000' },

  // 마켓플레이스 배너
  marketplaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7C4DFF30',
  },
  marketplaceBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marketplaceBannerTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  marketplaceBannerDesc: { color: '#888', fontSize: 11, marginTop: 2 },

  // 히스토리 버튼
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100,181,246,0.08)',
    marginHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.15)',
  },
  historyButtonText: { fontSize: 13, color: '#64B5F6', fontWeight: '600' },

  // 면책
  disclaimerBox: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  disclaimer: { fontSize: 10, color: '#555', textAlign: 'center', lineHeight: 16 },
});
