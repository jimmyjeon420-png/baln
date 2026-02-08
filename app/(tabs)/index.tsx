import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AssetType } from '../../src/types/asset';
import { COLORS, SIZES } from '../../src/styles/theme';
import { HomeSkeletonLoader } from '../../src/components/SkeletonLoader';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { useSharedMarketData } from '../../src/hooks/useSharedAnalysis';
import { calculateHealthScore, classifyAsset } from '../../src/services/rebalanceScore';

// 홈 탭 전용 컴포넌트 (각 부서)
import HeroCard from '../../src/components/home/HeroCard';
import DailyBriefingCard from '../../src/components/home/DailyBriefingCard';
import ActionAlertsCard from '../../src/components/home/ActionAlertsCard';
import type { AlertItem } from '../../src/components/home/ActionAlertsCard';
import AssetDonutCard from '../../src/components/home/AssetDonutCard';
import type { DonutSlice } from '../../src/components/home/AssetDonutCard';
import TopMoversCard from '../../src/components/home/TopMoversCard';
import type { MoverItem } from '../../src/components/home/TopMoversCard';
import QuickActionsBar from '../../src/components/home/QuickActionsBar';
import MarketTicker from '../../src/components/insights/MarketTicker';

// ============================================================================
// 자산 카테고리별 색상 맵
// ============================================================================

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  large_cap: { label: '주식', color: '#4CAF50' },
  bond:      { label: '채권', color: '#2196F3' },
  realestate:{ label: '부동산', color: '#FF9800' },
  bitcoin:   { label: '비트코인', color: '#F7931A' },
  altcoin:   { label: '알트코인', color: '#9C27B0' },
  cash:      { label: '현금', color: '#607D8B' },
};

// ============================================================================
// 메인: 홈 탭 오케스트레이터
// ============================================================================

export default function HomeScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  // ── 데이터 소스 (기존 훅 재사용, 수정 없음) ──
  const {
    assets: allAssets,
    totalAssets,
    totalRealEstate,
    liquidTickers,
    isFetched: initialCheckDone,
    refresh: refreshPortfolio,
  } = useSharedPortfolio();

  const { data: marketData, isLoading: marketLoading } = useSharedMarketData(liquidTickers);
  const marketSentiment = marketData?.sentiment ?? null;
  const stockReports = marketData?.stockReports ?? [];

  // ── 유동 자산 필터 ──
  const liquidAssets = useMemo(
    () => allAssets.filter(a => a.assetType === AssetType.LIQUID),
    [allAssets]
  );

  // ── P&L 계산 ──
  const { totalPnL, totalPnLPercent } = useMemo(() => {
    let pnl = 0;
    let cost = 0;
    for (const asset of liquidAssets) {
      const cv = asset.quantity && asset.currentPrice
        ? asset.quantity * asset.currentPrice
        : asset.currentValue;
      const cb = asset.costBasis || asset.currentValue;
      pnl += cv - cb;
      cost += cb;
    }
    return { totalPnL: pnl, totalPnLPercent: cost > 0 ? (pnl / cost) * 100 : 0 };
  }, [liquidAssets]);

  // ── 건강 점수 ──
  const healthScore = useMemo(
    () => calculateHealthScore(allAssets, totalAssets),
    [allAssets, totalAssets]
  );

  // ── 파생: alerts (최대 3개) ──
  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];

    // 1) SELL/STRONG_SELL 종목 → danger
    for (const r of stockReports) {
      if (items.length >= 3) break;
      if (r.signal === 'SELL' || r.signal === 'STRONG_SELL') {
        items.push({
          type: 'danger',
          icon: '🔴',
          title: `${r.ticker} 매도 시그널`,
          subtitle: `밸류에이션 ${r.valuation_score}점`,
        });
      }
    }

    // 2) 건강 점수 팩터 중 40점 미만 → warning
    for (const f of healthScore.factors) {
      if (items.length >= 3) break;
      if (f.score < 40) {
        items.push({
          type: 'warning',
          icon: '🟡',
          title: `${f.label} 점검 필요`,
          subtitle: f.comment,
        });
      }
    }

    // 3) BUY/STRONG_BUY 종목 → opportunity
    for (const r of stockReports) {
      if (items.length >= 3) break;
      if (r.signal === 'BUY' || r.signal === 'STRONG_BUY') {
        items.push({
          type: 'opportunity',
          icon: '🟢',
          title: `${r.ticker} 매수 기회`,
          subtitle: `밸류에이션 ${r.valuation_score}점`,
        });
      }
    }

    return items.slice(0, 3);
  }, [stockReports, healthScore.factors]);

  // ── 파생: donutData ──
  const donutData = useMemo<DonutSlice[]>(() => {
    if (allAssets.length === 0 || totalAssets === 0) return [];
    const buckets: Record<string, number> = {};
    for (const asset of allAssets) {
      const cat = classifyAsset(asset);
      buckets[cat] = (buckets[cat] || 0) + asset.currentValue;
    }
    return Object.entries(buckets)
      .map(([cat, value]) => ({
        category: cat,
        label: CATEGORY_CONFIG[cat]?.label ?? cat,
        value,
        color: CATEGORY_CONFIG[cat]?.color ?? '#666',
        percent: (value / totalAssets) * 100,
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [allAssets, totalAssets]);

  // ── 파생: topMovers ──
  const { gainers, losers } = useMemo<{ gainers: MoverItem[]; losers: MoverItem[] }>(() => {
    if (liquidAssets.length === 0) return { gainers: [], losers: [] };

    const withPnl = liquidAssets.map(a => {
      const cv = a.quantity && a.currentPrice ? a.quantity * a.currentPrice : a.currentValue;
      const cb = a.costBasis || a.currentValue;
      const pct = cb > 0 ? ((cv - cb) / cb) * 100 : 0;
      return {
        ticker: a.ticker || a.name,
        name: a.name,
        gainLossPercent: pct,
        currentValue: cv,
      };
    });

    const sorted = [...withPnl].sort((a, b) => b.gainLossPercent - a.gainLossPercent);
    return {
      gainers: sorted.filter(m => m.gainLossPercent > 0).slice(0, 3),
      losers: sorted.filter(m => m.gainLossPercent < 0).slice(-3).reverse(),
    };
  }, [liquidAssets]);

  // ── Pull-to-Refresh ──
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPortfolio();
    setRefreshing(false);
  }, [refreshPortfolio]);

  // ── 네비게이션 ──
  const handleDiagnosis = useCallback(() => {
    haptics.lightTap();
    router.push('/(tabs)/diagnosis');
  }, [haptics, router]);

  const handleRebalance = useCallback(() => {
    haptics.lightTap();
    router.push('/(tabs)/rebalance');
  }, [haptics, router]);

  const handleAddAsset = useCallback(() => {
    haptics.lightTap();
    router.push('/add-asset');
  }, [haptics, router]);

  const handleRealEstate = useCallback(() => {
    haptics.lightTap();
    router.push('/add-realestate');
  }, [haptics, router]);

  const handlePrediction = useCallback(() => {
    haptics.lightTap();
    router.push('/games/predictions');
  }, [haptics, router]);

  // ── 로딩 중: 스켈레톤 ──
  if (!initialCheckDone) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeSkeletonLoader />
      </SafeAreaView>
    );
  }

  const hasAssets = allAssets.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 시장 현황 전광판 (KOSPI·NASDAQ·BTC 등 실시간) */}
      <MarketTicker />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {hasAssets ? (
          <>
            {/* ① 총자산 히어로 */}
            <HeroCard
              totalAssets={totalAssets}
              totalPnL={totalPnL}
              totalPnLPercent={totalPnLPercent}
              totalRealEstate={totalRealEstate}
              healthGrade={healthScore.grade}
              healthGradeColor={healthScore.gradeColor}
              healthGradeBgColor={healthScore.gradeBgColor}
              healthGradeLabel={healthScore.gradeLabel}
              healthScore={healthScore.totalScore}
              onDiagnosisPress={handleDiagnosis}
              onRealEstatePress={handleRealEstate}
            />

            {/* ② 오늘의 브리핑 */}
            <DailyBriefingCard
              cfoWeather={marketSentiment?.cfoWeather ?? null}
              sentiment={marketSentiment?.sentiment ?? null}
              isLoading={marketLoading}
            />

            {/* ③ 핵심 알림 */}
            <ActionAlertsCard
              alerts={alerts}
              onPressCTA={handleRebalance}
              isLoading={marketLoading}
            />

            {/* ④ 자산 배분 도넛 */}
            <AssetDonutCard
              slices={donutData}
              totalAssets={totalAssets}
            />

            {/* ⑤ 등락률 Top/Bottom */}
            <TopMoversCard
              gainers={gainers}
              losers={losers}
            />

            {/* ⑥ 퀵 액션 */}
            <QuickActionsBar
              onAddAsset={handleAddAsset}
              onRealEstate={handleRealEstate}
              onPrediction={handlePrediction}
            />
          </>
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="pie-chart-outline" size={56} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>자산 브리핑을 시작하세요</Text>
            <Text style={styles.emptyDesc}>
              증권사 앱 스크린샷을 캡처하면{'\n'}AI가 매일 아침 자산 현황을 분석해요
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleAddAsset}>
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>자산 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.lg, paddingBottom: 100 },

  // Empty State
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: 40,
    alignItems: 'center',
    marginTop: SIZES.xl,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(76,175,80,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
