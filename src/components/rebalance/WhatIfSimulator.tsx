/**
 * What-if 시뮬레이터 — 자산군 카테고리 단위 배분 시뮬레이션
 *
 * 역할: "만약 주식을 10% 더 늘리면?" 카테고리 단위로 배분 조정 → 건강 점수 변화 예측
 *
 * 개선 사항:
 * - 부동산(비유동) 제거 — 리밸런싱 불가 자산
 * - 개별 종목 슬라이더 → 7개 자산군 카테고리 슬라이더
 * - 선택된 철학(달리오/합의/버핏)과 연동 — philosophyTarget prop
 * - 시뮬레이션: 각 카테고리 내 자산을 비율적으로 스케일
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, InteractionManager, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Asset } from '../../types/asset';
import { calculateHealthScore, classifyAsset, AssetCategory, DEFAULT_TARGET } from '../../services/rebalanceScore';
import { generateOptimalAllocation, type PortfolioAsset } from '../../services/gemini';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';
import { useMyCredits, useSpendCredits } from '../../hooks/useCredits';
import { FEATURE_COSTS } from '../../types/marketplace';

// ── 카테고리 표시 설정 (부동산 제외) ──
interface CatConfig { key: AssetCategory; label: string; icon: string; color: string }
const SIM_CATEGORIES: CatConfig[] = [
  { key: 'large_cap', label: '주식',     icon: '📈', color: '#4CAF50' },
  { key: 'bond',      label: '채권',     icon: '🏛️', color: '#64B5F6' },
  { key: 'bitcoin',   label: '비트코인', icon: '₿',  color: '#F7931A' },
  { key: 'gold',      label: '금/귀금속',icon: '🥇', color: '#FFD700' },
  { key: 'commodity', label: '원자재',   icon: '🛢️', color: '#FF8A65' },
  { key: 'altcoin',   label: '알트코인', icon: '🪙', color: '#9C27B0' },
  { key: 'cash',      label: '현금',     icon: '💵', color: '#78909C' },
];

interface WhatIfSimulatorProps {
  assets: Asset[];
  totalAssets: number;
  currentHealthScore: number;
  philosophyTarget?: Record<AssetCategory, number>; // AllocationDriftSection에서 선택된 목표
}

export default function WhatIfSimulator({
  assets,
  totalAssets,
  currentHealthScore,
  philosophyTarget,
}: WhatIfSimulatorProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: credits } = useMyCredits();
  const spendMutation = useSpendCredits();
  const [showSimulator, setShowSimulator] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 유동 자산만 (부동산 제외)
  const liquidAssets = useMemo(
    () => assets.filter(a => classifyAsset(a) !== 'realestate'),
    [assets],
  );
  const liquidTotal = useMemo(
    () => liquidAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0),
    [liquidAssets],
  );

  // 현재 카테고리별 실제 비중 (%)
  const currentCatPct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of SIM_CATEGORIES) map[cat.key] = 0;
    if (liquidTotal <= 0) return map;
    for (const asset of liquidAssets) {
      const cat = classifyAsset(asset);
      if (cat !== 'realestate') {
        map[cat] = (map[cat] || 0) + (asset.currentValue || 0) / liquidTotal * 100;
      }
    }
    return map;
  }, [liquidAssets, liquidTotal]);

  // philosophyTarget이 바뀌면 catTargets 업데이트
  const baseTarget = philosophyTarget ?? DEFAULT_TARGET;

  // 카테고리 목표 비중 (슬라이더로 조정)
  const [catTargets, setCatTargets] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const cat of SIM_CATEGORIES) init[cat.key] = baseTarget[cat.key] ?? 0;
    return init;
  });

  // philosophyTarget이 변경되면 catTargets도 동기화
  useEffect(() => {
    const newTargets: Record<string, number> = {};
    for (const cat of SIM_CATEGORIES) newTargets[cat.key] = baseTarget[cat.key] ?? 0;
    setCatTargets(newTargets);
  }, [philosophyTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  // 합계
  const catSum = useMemo(
    () => SIM_CATEGORIES.reduce((sum, c) => sum + (catTargets[c.key] || 0), 0),
    [catTargets],
  );

  // 조정이 있는지: catTargets vs currentCatPct
  const hasAdjustments = useMemo(
    () => SIM_CATEGORIES.some(c => Math.abs((catTargets[c.key] || 0) - (currentCatPct[c.key] || 0)) > 0.5),
    [catTargets, currentCatPct],
  );

  // 시뮬레이션된 포트폴리오: 유동자산 총액 고정 + 카테고리 비율로 재배분
  // catTargets 합계가 100%가 아닐 경우 정규화하여 항상 liquidTotal을 유지
  const simulatedAssets = useMemo(() => {
    if (liquidTotal <= 0) return assets;
    const norm = catSum > 0 ? 100 / catSum : 1; // 정규화 계수 (합계 100% 강제)
    return assets.map(asset => {
      const cat = classifyAsset(asset);
      if (cat === 'realestate') return asset; // 부동산 변경 없음

      const curPct = currentCatPct[cat] || 0;
      const tgtPct = (catTargets[cat] || 0) * norm; // 정규화된 목표 비중
      const ratio = curPct > 0 ? tgtPct / curPct : 0;
      const newValue = (asset.currentValue || 0) * ratio;
      const newPrice = (asset.currentPrice != null && (asset.currentPrice as number) > 0)
        ? (asset.currentPrice as number) * ratio
        : asset.currentPrice;
      return { ...asset, currentValue: newValue, currentPrice: newPrice };
    });
  }, [assets, catTargets, currentCatPct, liquidTotal, catSum]);

  // 시뮬레이션된 총자산
  const simulatedTotal = useMemo(
    () => simulatedAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0),
    [simulatedAssets],
  );

  // 시뮬레이션된 건강 점수
  const simulatedHealthScore = useMemo(() => {
    if (simulatedTotal === 0 || catSum < 95 || catSum > 105) return currentHealthScore;
    try {
      return calculateHealthScore(simulatedAssets, simulatedTotal, philosophyTarget).totalScore;
    } catch {
      return currentHealthScore;
    }
  }, [simulatedAssets, simulatedTotal, currentHealthScore, catSum, philosophyTarget]);

  const healthDelta = simulatedHealthScore - currentHealthScore;

  // 초기화
  const handleReset = useCallback(() => {
    const init: Record<string, number> = {};
    for (const cat of SIM_CATEGORIES) init[cat.key] = baseTarget[cat.key] ?? 0;
    setCatTargets(init);
  }, [baseTarget]);

  // AI 분석
  const handleAIAnalysis = () => {
    router.push({
      pathname: '/marketplace',
      params: {
        feature: 'what_if',
        adjustments: JSON.stringify(catTargets),
      },
    });
  };

  // AI 최적 배분
  const cost = FEATURE_COSTS.what_if;
  const currentBalance = credits?.balance ?? 0;

  const handleRecommendedAdjustment = async () => {
    if (currentBalance < cost) {
      Alert.alert('크레딧 부족', `AI 배분 최적화에는 ${cost}C가 필요합니다.\n현재 잔액: ${currentBalance}C`, [
        { text: '취소', style: 'cancel' },
        { text: '충전하기', onPress: () => router.push('/marketplace/credits') },
      ]);
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsOptimizing(true);
      await spendMutation.mutateAsync({
        amount: cost,
        featureType: 'what_if',
        featureRefId: `whatif_optimize_${Date.now()}`,
      });
      await new Promise<void>(resolve => { InteractionManager.runAfterInteractions(() => resolve()); });

      const portfolioAssets: PortfolioAsset[] = liquidAssets.map(a => ({
        ticker: a.ticker || 'UNKNOWN',
        name: a.name || 'Unknown Asset',
        quantity: a.quantity || 1,
        avgPrice: a.avgPrice || 0,
        currentPrice: (a.currentPrice as number) || 0,
        currentValue: a.currentValue || 0,
        allocation: liquidTotal > 0 ? ((a.currentValue || 0) / liquidTotal) * 100 : 0,
      }));

      const result = await generateOptimalAllocation({ assets: portfolioAssets, currentHealthScore });

      // AI 제안 → 카테고리 목표로 변환 (baseTarget에서 시작 — philosophyTarget 기준)
      const aiCatTargets: Record<string, number> = {};
      for (const cat of SIM_CATEGORIES) aiCatTargets[cat.key] = baseTarget[cat.key] ?? 0;
      for (const rec of result.recommendations) {
        const asset = liquidAssets.find(a => a.ticker === rec.ticker || a.name === rec.name);
        if (asset) {
          const cat = classifyAsset(asset);
          if (cat !== 'realestate') {
            const curW = liquidTotal > 0 ? (asset.currentValue || 0) / liquidTotal * 100 : 0;
            aiCatTargets[cat] = Math.max(0, Math.min(100, (aiCatTargets[cat] || 0) + rec.adjustmentPercent * curW / 100));
          }
        }
      }
      // AI 제안 후 합계가 100%가 아닐 수 있으므로 정규화
      const aiSum = SIM_CATEGORIES.reduce((s, c) => s + (aiCatTargets[c.key] || 0), 0);
      if (aiSum > 0 && Math.abs(aiSum - 100) > 0.5) {
        const normFactor = 100 / aiSum;
        SIM_CATEGORIES.forEach(c => {
          aiCatTargets[c.key] = Math.round((aiCatTargets[c.key] || 0) * normFactor);
        });
        // 반올림 오차 보정 — 가장 큰 카테고리에 적용
        const finalSum = SIM_CATEGORIES.reduce((s, c) => s + (aiCatTargets[c.key] || 0), 0);
        if (finalSum !== 100) {
          const maxCat = SIM_CATEGORIES.reduce((a, b) =>
            (aiCatTargets[a.key] || 0) >= (aiCatTargets[b.key] || 0) ? a : b
          );
          aiCatTargets[maxCat.key] = (aiCatTargets[maxCat.key] || 0) + (100 - finalSum);
        }
      }
      setCatTargets(aiCatTargets);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('AI 배분 최적화 실패:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (liquidAssets.length === 0) return null;

  const s = createStyles(colors);
  const sumOk = catSum >= 98 && catSum <= 102;

  return (
    <View style={[s.card, { backgroundColor: colors.inverseSurface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <TouchableOpacity style={s.headerRow} onPress={() => setShowSimulator(!showSimulator)} activeOpacity={0.7}>
        <View>
          <View style={s.titleRow}>
            <Ionicons name="flask-outline" size={16} color={colors.premium.purple} />
            <Text style={s.cardLabel}>What-if 시뮬레이터</Text>
          </View>
          <Text style={s.cardLabelEn}>Portfolio Simulation</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {hasAdjustments && (
            <View style={s.activeBadge}>
              <Text style={s.activeBadgeText}>조정 중</Text>
            </View>
          )}
          <Ionicons name={showSimulator ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>

      {!showSimulator && (
        <Text style={s.collapsedDesc}>
          자산군 비중을 가상으로 조정해서 건강 점수 변화를 미리 확인하세요
        </Text>
      )}

      {showSimulator && (
        <View style={s.simulatorContainer}>
          {/* 건강 점수 미리보기 */}
          <View style={[s.healthPreview, { backgroundColor: colors.surfaceElevated }]}>
            <View style={s.healthItem}>
              <Text style={s.healthLabel}>현재</Text>
              <Text style={[s.healthValue, { color: colors.textTertiary }]}>{currentHealthScore}</Text>
            </View>
            <Ionicons
              name={healthDelta > 2 ? 'arrow-up' : healthDelta < -2 ? 'arrow-down' : 'arrow-forward'}
              size={20}
              color={healthDelta > 2 ? colors.success : healthDelta < -2 ? colors.error : colors.textTertiary}
            />
            <View style={s.healthItem}>
              <Text style={s.healthLabel}>예상</Text>
              <Text style={[s.healthValue, { color: healthDelta > 0 ? colors.success : healthDelta < 0 ? colors.error : colors.textTertiary }]}>
                {simulatedHealthScore}
              </Text>
            </View>
            {healthDelta !== 0 && (
              <View style={[s.healthDelta, { backgroundColor: healthDelta > 0 ? `${colors.success}20` : `${colors.error}20` }]}>
                <Text style={[s.healthDeltaText, { color: healthDelta > 0 ? colors.success : colors.error }]}>
                  {healthDelta > 0 ? '+' : ''}{healthDelta.toFixed(0)}점 {healthDelta > 0 ? '개선' : '악화'}
                </Text>
              </View>
            )}
          </View>

          {/* 리밸런싱 가이드 — 유동자산 총액 유지, 카테고리 간 매수/매도 금액 표시 */}
          {hasAdjustments && sumOk && (
            <View style={[s.tradeGuideSection, { backgroundColor: colors.surfaceElevated }]}>
              <View style={s.tradeGuideHeader}>
                <Ionicons name="swap-horizontal-outline" size={13} color={colors.textSecondary} />
                <Text style={[s.tradeGuideTitle, { color: colors.textSecondary }]}>리밸런싱 가이드</Text>
                <Text style={[s.tradeGuideSub, { color: colors.textTertiary }]}>유동자산 총액 유지</Text>
              </View>
              {SIM_CATEGORIES.map(cat => {
                const curAmt = liquidTotal * (currentCatPct[cat.key] || 0) / 100;
                const tgtAmt = liquidTotal * (catTargets[cat.key] || 0) / 100;
                const delta = tgtAmt - curAmt;
                if (Math.abs(delta) < liquidTotal * 0.003) return null; // 0.3% 미만 무시
                const amtStr = Math.abs(delta) >= 100000000
                  ? `${(Math.abs(delta) / 100000000).toFixed(1)}억`
                  : `${Math.round(Math.abs(delta) / 10000)}만원`;
                return (
                  <View key={cat.key} style={s.tradeRow}>
                    <Text style={s.tradeIcon}>{cat.icon}</Text>
                    <Text style={[s.tradeName, { color: colors.textSecondary }]}>{cat.label}</Text>
                    <Text style={[s.tradeAmount, { color: delta > 0 ? colors.success : colors.error }]}>
                      {delta > 0 ? '▲ 매수' : '▼ 매도'} {amtStr}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* AI 최적화 버튼 */}
          <TouchableOpacity style={s.recommendButton} onPress={handleRecommendedAdjustment} activeOpacity={0.7} disabled={isOptimizing}>
            {isOptimizing ? (
              <ActivityIndicator size="small" color={colors.inverseText} />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={16} color={colors.inverseText} />
                <Text style={s.recommendButtonText}>AI 배분 최적화 ({cost}C)</Text>
              </>
            )}
          </TouchableOpacity>

          {/* 합계 표시 */}
          <View style={[s.sumRow, { backgroundColor: sumOk ? `${colors.success}15` : `${colors.warning}15` }]}>
            <Text style={[s.sumLabel, { color: colors.textSecondary }]}>목표 합계</Text>
            <Text style={[s.sumValue, { color: sumOk ? colors.success : colors.warning }]}>
              {catSum.toFixed(0)}% {sumOk ? '✓' : '⚠️ 100%가 되어야 해요'}
            </Text>
          </View>

          {/* 카테고리 슬라이더 */}
          <ScrollView style={s.assetsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {SIM_CATEGORIES.map(cat => {
              const curPct = currentCatPct[cat.key] || 0;
              const tgtPct = catTargets[cat.key] || 0;
              const delta = tgtPct - curPct;

              return (
                <View key={cat.key} style={s.catRow}>
                  <View style={s.catHeader}>
                    <View style={s.catNameRow}>
                      <Text style={s.catIcon}>{cat.icon}</Text>
                      <Text style={[s.catLabel, { color: colors.textPrimary }]}>{cat.label}</Text>
                    </View>
                    <View style={s.catWeightRow}>
                      <Text style={[s.catCurrentPct, { color: colors.textTertiary }]}>
                        현재 {curPct.toFixed(0)}%
                      </Text>
                      <Text style={[s.catArrow, { color: colors.textTertiary }]}> → </Text>
                      <Text style={[s.catTargetPct, { color: cat.color, fontWeight: '700' }]}>
                        목표 {tgtPct.toFixed(0)}%
                      </Text>
                      {delta !== 0 && (
                        <Text style={[s.catDelta, { color: delta > 0 ? colors.success : colors.error }]}>
                          {' '}({delta > 0 ? '+' : ''}{delta.toFixed(0)}%p)
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={s.sliderRow}>
                    <Text style={s.sliderLabel}>0%</Text>
                    <Slider
                      style={s.slider}
                      minimumValue={0}
                      maximumValue={100}
                      step={1}
                      value={tgtPct}
                      onValueChange={val => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCatTargets(prev => ({ ...prev, [cat.key]: val }));
                      }}
                      minimumTrackTintColor={cat.color}
                      maximumTrackTintColor={colors.borderStrong}
                      thumbTintColor={cat.color}
                    />
                    <Text style={s.sliderLabel}>100%</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* 버튼 그룹 */}
          <View style={s.buttonGroup}>
            <TouchableOpacity style={s.resetButton} onPress={handleReset} activeOpacity={0.7}>
              <Ionicons name="refresh" size={14} color={colors.textTertiary} />
              <Text style={s.resetButtonText}>초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.aiButton, (!hasAdjustments || !sumOk) && s.aiButtonDisabled]}
              onPress={handleAIAnalysis}
              activeOpacity={0.7}
              disabled={!hasAdjustments || !sumOk}
            >
              <Ionicons name="sparkles" size={14} color={(hasAdjustments && sumOk) ? colors.inverseText : colors.disabledText} />
              <Text style={[s.aiButtonText, (!hasAdjustments || !sumOk) && s.aiButtonTextDisabled]}>
                AI 분석 받기 (3C)
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            슬라이더로 목표 비중을 조정하고 합계를 100%로 맞추면 건강 점수 변화를 확인할 수 있어요
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardLabelEn: { fontSize: 10, color: colors.textTertiary, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
  activeBadge: { backgroundColor: `${colors.premium.purple}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { fontSize: 10, color: colors.premium.purple, fontWeight: '700' },
  collapsedDesc: { marginTop: 8, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  simulatorContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },

  // 건강 점수
  healthPreview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, padding: 16, gap: 12,
  },
  healthItem: { alignItems: 'center' },
  healthLabel: { fontSize: 10, color: colors.textTertiary, marginBottom: 4 },
  healthValue: { fontSize: 22, fontWeight: '800' },
  healthDelta: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  healthDeltaText: { fontSize: 12, fontWeight: '700' },

  // 리밸런싱 가이드
  tradeGuideSection: {
    borderRadius: 10, padding: 12, gap: 8,
  },
  tradeGuideHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4,
  },
  tradeGuideTitle: { fontSize: 12, fontWeight: '700' },
  tradeGuideSub: { fontSize: 10, marginLeft: 'auto' },
  tradeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  tradeIcon: { fontSize: 13, width: 20, textAlign: 'center' },
  tradeName: { fontSize: 12, flex: 1 },
  tradeAmount: { fontSize: 12, fontWeight: '700' },

  recommendButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  recommendButtonText: { fontSize: 14, color: colors.inverseText, fontWeight: '700' },

  // 합계 표시
  sumRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  sumLabel: { fontSize: 12, fontWeight: '600' },
  sumValue: { fontSize: 12, fontWeight: '700' },

  // 카테고리 슬라이더
  assetsScroll: { maxHeight: 420 },
  catRow: {
    marginBottom: 12, backgroundColor: colors.surfaceElevated,
    borderRadius: 10, padding: 12,
  },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIcon: { fontSize: 16 },
  catLabel: { fontSize: 14, fontWeight: '700' },
  catWeightRow: { flexDirection: 'row', alignItems: 'center' },
  catCurrentPct: { fontSize: 11 },
  catArrow: { fontSize: 11 },
  catTargetPct: { fontSize: 12 },
  catDelta: { fontSize: 11, fontWeight: '600' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { fontSize: 10, color: colors.textTertiary, width: 30, textAlign: 'center' },
  slider: { flex: 1, height: 32 },

  // 버튼
  buttonGroup: { flexDirection: 'row', gap: 8 },
  resetButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceElevated, paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  resetButtonText: { fontSize: 13, color: colors.textTertiary, fontWeight: '600' },
  aiButton: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.premium.purple, paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  aiButtonDisabled: { backgroundColor: colors.disabled },
  aiButtonText: { fontSize: 13, color: colors.inverseText, fontWeight: '700' },
  aiButtonTextDisabled: { color: colors.disabledText },

  hint: { fontSize: 11, color: colors.textTertiary, lineHeight: 16, textAlign: 'center' },
});
