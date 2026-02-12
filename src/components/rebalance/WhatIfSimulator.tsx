/**
 * What-if 시뮬레이터 — "만약 삼성전자를 50% 더 사면?" 시뮬레이션
 *
 * 역할 (비유): "투자 시뮬레이터" — 자산 비중을 가상으로 조정해서 건강 점수 변화 예측
 * 사용자 흐름: 슬라이더로 비중 조정 → 건강 점수 변화 확인 → [AI 분석] 버튼 → 유료 분석
 *
 * 데이터 흐름:
 * 1. 현재 포트폴리오 → 슬라이더로 비중 조정
 * 2. 조정된 포트폴리오 → calculateHealthScore 재계산
 * 3. before/after 건강 점수 비교
 * 4. [AI 분석 받기] → /marketplace?feature=what_if (3크레딧)
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, InteractionManager, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Asset } from '../../types/asset';
import { calculateHealthScore } from '../../services/rebalanceScore';
import { generateOptimalAllocation, type PortfolioAsset } from '../../services/gemini';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';
import { useMyCredits, useSpendCredits } from '../../hooks/useCredits';
import { FEATURE_COSTS } from '../../types/marketplace';

interface WhatIfSimulatorProps {
  assets: Asset[];
  totalAssets: number;
  currentHealthScore: number;
}

export default function WhatIfSimulator({ assets, totalAssets, currentHealthScore }: WhatIfSimulatorProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: credits } = useMyCredits();
  const spendMutation = useSpendCredits();
  const [showSimulator, setShowSimulator] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false); // 추천 조정 계산 중

  // 자산별 비중 조정 (퍼센트) — 초기값 0% (변화 없음)
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  // 시뮬레이션된 포트폴리오 (비중 조정 적용)
  // currentValue + currentPrice 모두 조정해야 calculateHealthScore의 getAssetValue()가 반영
  const simulatedAssets = useMemo(() => {
    return assets.map(asset => {
      const key = asset.ticker || asset.id;
      const adjustment = adjustments[key] || 0;
      const multiplier = 1 + adjustment / 100;
      const adjustedValue = (asset.currentValue || 0) * multiplier;
      const adjustedPrice = (asset.currentPrice ?? 0) > 0
        ? (asset.currentPrice as number) * multiplier
        : undefined;
      return {
        ...asset,
        currentValue: adjustedValue,
        ...(adjustedPrice !== undefined && { currentPrice: adjustedPrice }),
      };
    });
  }, [assets, adjustments]);

  // 시뮬레이션된 총자산 (NaN 방어)
  const simulatedTotal = useMemo(() => {
    const total = simulatedAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
    return Number.isFinite(total) ? total : 0;
  }, [simulatedAssets]);

  // 시뮬레이션된 건강 점수 (에러 방어)
  const simulatedHealthScore = useMemo(() => {
    if (simulatedTotal === 0) return currentHealthScore;
    try {
      return calculateHealthScore(simulatedAssets, simulatedTotal).totalScore;
    } catch {
      return currentHealthScore;
    }
  }, [simulatedAssets, simulatedTotal, currentHealthScore]);

  // 건강 점수 변화
  const healthDelta = simulatedHealthScore - currentHealthScore;

  // 총자산 변화량
  const totalDelta = simulatedTotal - totalAssets;

  // 조정이 있는지 확인
  const hasAdjustments = Object.values(adjustments).some(v => v !== 0);

  // 리셋
  const handleReset = () => {
    setAdjustments({});
  };

  // AI 분석 받기
  const handleAIAnalysis = () => {
    router.push({
      pathname: '/marketplace',
      params: {
        feature: 'what_if',
        adjustments: JSON.stringify(adjustments),
      },
    });
  };

  // 추천 조정 (AI 기반 최적 배분 계산) — 1크레딧 소모
  const cost = FEATURE_COSTS.what_if; // 1C
  const currentBalance = credits?.balance ?? 0;

  const handleRecommendedAdjustment = async () => {
    // 잔액 부족 체크
    if (currentBalance < cost) {
      Alert.alert(
        '크레딧 부족',
        `AI 배분 최적화에는 ${cost}C가 필요합니다.\n현재 잔액: ${currentBalance}C`,
        [
          { text: '취소', style: 'cancel' },
          { text: '충전하기', onPress: () => router.push('/marketplace/credits') },
        ]
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsOptimizing(true);

      // 크레딧 차감 (AI 호출 전에 먼저 차감)
      await spendMutation.mutateAsync({
        amount: cost,
        featureType: 'what_if',
        featureRefId: `whatif_optimize_${Date.now()}`,
      });

      // UI 렌더 완료 후 AI 계산 시작
      await new Promise<void>(resolve => {
        InteractionManager.runAfterInteractions(() => resolve());
      });

      // Asset[] → PortfolioAsset[] 변환
      const portfolioAssets: PortfolioAsset[] = assets.map(a => ({
        ticker: a.ticker || 'UNKNOWN',
        name: a.name || 'Unknown Asset',
        quantity: a.quantity || 1,
        avgPrice: a.avgPrice || 0,
        currentPrice: (a.currentPrice as number) || 0,
        currentValue: a.currentValue || 0,
        allocation: totalAssets > 0 ? ((a.currentValue || 0) / totalAssets) * 100 : 0,
      }));

      // Gemini AI 호출
      const result = await generateOptimalAllocation({
        assets: portfolioAssets,
        currentHealthScore,
      });

      // AI 제안을 adjustments로 변환
      const aiAdjustments: Record<string, number> = {};
      for (const rec of result.recommendations) {
        const asset = assets.find(a => a.ticker === rec.ticker || a.name === rec.name);
        if (asset) {
          const key = asset.ticker || asset.id;
          aiAdjustments[key] = rec.adjustmentPercent;
        }
      }

      // 조정 적용
      if (Object.keys(aiAdjustments).length > 0) {
        setAdjustments(aiAdjustments);
        // 성공 햅틱
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // 개선 여지가 없으면 가벼운 햅틱
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('AI 배분 최적화 실패:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 자산 없으면 표시 안 함
  if (assets.length === 0) return null;

  const s = createStyles(colors);

  return (
    <View style={[s.card, { backgroundColor: colors.inverseSurface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={() => setShowSimulator(!showSimulator)}
        activeOpacity={0.7}
      >
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

      {/* 접힌 상태: 간단 설명 */}
      {!showSimulator && (
        <Text style={s.collapsedDesc}>
          자산 비중을 가상으로 조정해서 건강 점수 변화를 미리 확인하세요
        </Text>
      )}

      {/* 펼친 상태: 시뮬레이터 */}
      {showSimulator && (
        <View style={s.simulatorContainer}>
          {/* 건강 점수 변화 미리보기 */}
          <View style={[s.healthPreview, { backgroundColor: colors.surfaceElevated }]}>
            <View style={s.healthItem}>
              <Text style={s.healthLabel}>현재</Text>
              <Text style={[s.healthValue, { color: colors.textTertiary }]}>{currentHealthScore}</Text>
            </View>

            {/* 동적 화살표 */}
            <Ionicons
              name={
                healthDelta > 2 ? 'arrow-up' :
                healthDelta < -2 ? 'arrow-down' :
                'arrow-forward'
              }
              size={20}
              color={
                healthDelta > 2 ? colors.success :
                healthDelta < -2 ? colors.error :
                colors.textTertiary
              }
            />

            <View style={s.healthItem}>
              <Text style={s.healthLabel}>예상</Text>
              <Text style={[
                s.healthValue,
                { color: healthDelta > 0 ? colors.success : healthDelta < 0 ? colors.error : colors.textTertiary },
              ]}>
                {simulatedHealthScore}
              </Text>
            </View>

            {/* 점수 변화 + 개선/악화 텍스트 */}
            {healthDelta !== 0 && (
              <View style={[
                s.healthDelta,
                { backgroundColor: healthDelta > 0 ? `${colors.success}20` : `${colors.error}20` },
              ]}>
                <Text style={[
                  s.healthDeltaText,
                  { color: healthDelta > 0 ? colors.success : colors.error },
                ]}>
                  {healthDelta > 0 ? '+' : ''}{healthDelta.toFixed(0)}점 {healthDelta > 0 ? '개선' : '악화'}
                </Text>
              </View>
            )}
          </View>

          {/* 총자산 변화량 표시 */}
          {hasAdjustments && totalDelta !== 0 && (
            <View style={[s.totalDeltaRow, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="cash-outline" size={14} color={colors.textTertiary} />
              <Text style={s.totalDeltaText}>
                총자산 {totalDelta > 0 ? '+' : ''}
                {totalDelta.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })}{' '}
                {totalDelta > 0 ? '증가' : '감소'} 예상
              </Text>
            </View>
          )}

          {/* 추천 조정 버튼 */}
          <TouchableOpacity
            style={s.recommendButton}
            onPress={handleRecommendedAdjustment}
            activeOpacity={0.7}
            disabled={isOptimizing}
          >
            {isOptimizing ? (
              <ActivityIndicator size="small" color={colors.inverseText} />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={16} color={colors.inverseText} />
                <Text style={s.recommendButtonText}>AI 배분 최적화 ({cost}C)</Text>
              </>
            )}
          </TouchableOpacity>

          {/* 자산별 슬라이더 */}
          <ScrollView style={s.assetsScroll} nestedScrollEnabled>
            {assets.slice(0, 5).map(asset => {
              const key = asset.ticker || asset.id;
              const displayName = asset.ticker || asset.name || 'unknown';
              const currentWeight = totalAssets > 0 ? ((asset.currentValue || 0) / totalAssets) * 100 : 0;
              const adjustment = adjustments[key] || 0;
              const simulatedWeight = simulatedTotal > 0
                ? (((asset.currentValue || 0) * (1 + adjustment / 100)) / simulatedTotal) * 100
                : 0;

              return (
                <View key={asset.id} style={s.assetRow}>
                  <View style={s.assetHeader}>
                    <Text style={s.assetTicker}>{displayName}</Text>
                    <Text style={s.assetWeight}>
                      {currentWeight.toFixed(1)}% → {simulatedWeight.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={s.sliderRow}>
                    <Text style={s.sliderLabel}>-50%</Text>
                    <Slider
                      style={s.slider}
                      minimumValue={-50}
                      maximumValue={100}
                      step={5}
                      value={adjustment}
                      onValueChange={(val) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAdjustments(prev => ({ ...prev, [key]: val }));
                      }}
                      minimumTrackTintColor={colors.premium.purple}
                      maximumTrackTintColor={colors.borderStrong}
                      thumbTintColor={colors.premium.purple}
                    />
                    <Text style={s.sliderLabel}>+100%</Text>
                  </View>
                  {/* 조정값 + 금액 변화 */}
                  <View style={s.adjustmentRow}>
                    <Text style={s.adjustmentValue}>
                      {adjustment > 0 ? '+' : ''}{adjustment.toFixed(0)}%
                    </Text>
                    {adjustment !== 0 && (
                      <Text style={s.adjustmentAmount}>
                        ({adjustment > 0 ? '+' : ''}
                        {(asset.currentValue * adjustment / 100).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원)
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* 버튼 그룹 */}
          <View style={s.buttonGroup}>
            {hasAdjustments && (
              <TouchableOpacity style={s.resetButton} onPress={handleReset} activeOpacity={0.7}>
                <Ionicons name="refresh" size={14} color={colors.textTertiary} />
                <Text style={s.resetButtonText}>초기화</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.aiButton, !hasAdjustments && s.aiButtonDisabled]}
              onPress={handleAIAnalysis}
              activeOpacity={0.7}
              disabled={!hasAdjustments}
            >
              <Ionicons name="sparkles" size={14} color={hasAdjustments ? colors.inverseText : colors.disabledText} />
              <Text style={[s.aiButtonText, !hasAdjustments && s.aiButtonTextDisabled]}>
                AI 분석 받기 (3C)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 안내 */}
          <Text style={s.hint}>
            AI 배분 최적화 버튼을 누르면 건강 점수를 최대화하는 배분을 자동으로 제안합니다
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardLabelEn: { fontSize: 10, color: colors.textTertiary, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
  activeBadge: { backgroundColor: `${colors.premium.purple}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { fontSize: 10, color: colors.premium.purple, fontWeight: '700' },
  collapsedDesc: { marginTop: 8, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  // 시뮬레이터
  simulatorContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 14 },

  // 건강 점수 미리보기
  healthPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  healthItem: { alignItems: 'center' },
  healthLabel: { fontSize: 10, color: colors.textTertiary, marginBottom: 4 },
  healthValue: { fontSize: 22, fontWeight: '800' },
  healthDelta: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  healthDeltaText: { fontSize: 12, fontWeight: '700' },

  // 총자산 변화량
  totalDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  totalDeltaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  // 추천 조정 버튼
  recommendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  recommendButtonText: { fontSize: 14, color: colors.inverseText, fontWeight: '700' },

  // 자산 리스트
  assetsScroll: { maxHeight: 300 },
  assetRow: { marginBottom: 16, backgroundColor: colors.surfaceElevated, borderRadius: 10, padding: 12 },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  assetTicker: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  assetWeight: { fontSize: 11, color: colors.premium.purple, fontWeight: '600' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { fontSize: 10, color: colors.textTertiary, width: 36, textAlign: 'center' },
  slider: { flex: 1, height: 32 },
  adjustmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, gap: 6 },
  adjustmentValue: { fontSize: 13, color: colors.premium.purple, fontWeight: '700' },
  adjustmentAmount: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },

  // 버튼
  buttonGroup: { flexDirection: 'row', gap: 8 },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  resetButtonText: { fontSize: 13, color: colors.textTertiary, fontWeight: '600' },
  aiButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.premium.purple,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  aiButtonDisabled: { backgroundColor: colors.disabled },
  aiButtonText: { fontSize: 13, color: colors.inverseText, fontWeight: '700' },
  aiButtonTextDisabled: { color: colors.disabledText },

  // 안내
  hint: { fontSize: 11, color: colors.textTertiary, lineHeight: 16, textAlign: 'center' },
});
