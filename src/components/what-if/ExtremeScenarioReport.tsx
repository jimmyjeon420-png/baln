/**
 * ExtremeScenarioReport.tsx - 극한 시나리오 상세 리포트
 *
 * 역할: 선택된 시나리오의 전체 분석 보기
 * - 임팩트 체인 (화살표 연결)
 * - 시장 영향 (KOSPI, 원/달러, 섹터별)
 * - 역사적 선례 (비교 박스)
 * - 행동 가이드 (조언)
 * - 포트폴리오 시뮬레이션 CTA (2크레딧)
 * - AI 시뮬레이션 결과 표시
 */

import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../hooks/useTheme';
import { useShareReward } from '../../hooks/useRewards';
import { CATEGORY_COLORS, type ExtremeScenario } from '../../data/whatIfScenarios';
import { formatCredits } from '../../utils/formatters';
import { REWARD_AMOUNTS } from '../../services/rewardService';
import type { WhatIfResult } from '../../types/marketplace';

// ============================================================================
// 타입
// ============================================================================

export interface ExtremeScenarioReportProps {
  scenario: ExtremeScenario;
  /** 포트폴리오 시뮬레이션 결과 (AI 호출 후) */
  simulationResult: WhatIfResult | null;
  /** AI 분석 중 여부 */
  isSimulating: boolean;
  /** 시뮬레이션 에러 */
  simulationError: string | null;
  /** 포트폴리오 시뮬레이션 요청 (2크레딧) */
  onSimulate: () => void;
  /** 자산 등록 여부 */
  hasAssets: boolean;
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/** 임팩트 체인 시각화 */
const ImpactChainSection: React.FC<{
  chain: string[];
  colors: any;
}> = ({ chain, colors }) => (
  <View style={[sectionStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={sectionStyles.cardHeader}>
      <Ionicons name="git-network-outline" size={18} color={colors.primary} />
      <Text style={[sectionStyles.cardTitle, { color: colors.textPrimary }]}>임팩트 체인</Text>
    </View>
    <View style={sectionStyles.chainContainer}>
      {chain.map((step, idx) => (
        <View key={idx}>
          <View style={[sectionStyles.chainStep, { backgroundColor: colors.background }]}>
            <Text style={[sectionStyles.chainNumber, { color: colors.primary }]}>
              {idx + 1}
            </Text>
            <Text style={[sectionStyles.chainText, { color: colors.textPrimary }]}>
              {step}
            </Text>
          </View>
          {idx < chain.length - 1 && (
            <View style={sectionStyles.chainArrowContainer}>
              <Ionicons name="arrow-down" size={16} color={colors.textTertiary} />
            </View>
          )}
        </View>
      ))}
    </View>
  </View>
);

/** 시장 영향 섹션 */
const MarketImpactSection: React.FC<{
  marketImpact: ExtremeScenario['marketImpact'];
  colors: any;
}> = ({ marketImpact, colors }) => (
  <View style={[sectionStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={sectionStyles.cardHeader}>
      <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
      <Text style={[sectionStyles.cardTitle, { color: colors.textPrimary }]}>예상 시장 영향</Text>
    </View>

    {/* KOSPI + 원/달러 */}
    <View style={sectionStyles.metricsRow}>
      <View style={[sectionStyles.metricBox, { backgroundColor: '#EF444415' }]}>
        <Text style={[sectionStyles.metricLabel, { color: colors.textTertiary }]}>KOSPI</Text>
        <Text style={[sectionStyles.metricValue, { color: '#EF4444' }]}>
          {marketImpact.kospi}
        </Text>
      </View>
      <View style={[sectionStyles.metricBox, { backgroundColor: '#F59E0B15' }]}>
        <Text style={[sectionStyles.metricLabel, { color: colors.textTertiary }]}>원/달러</Text>
        <Text style={[sectionStyles.metricValue, { color: '#F59E0B' }]}>
          {marketImpact.usdkrw}
        </Text>
      </View>
    </View>

    {/* 수혜 섹터 */}
    <Text style={[sectionStyles.subTitle, { color: '#10B981' }]}>▲ 수혜 섹터</Text>
    {marketImpact.upSectors.map((s, i) => (
      <View key={i} style={sectionStyles.sectorRow}>
        <Text style={[sectionStyles.sectorName, { color: colors.textPrimary }]}>{s.name}</Text>
        <Text style={[sectionStyles.sectorChange, { color: '#10B981' }]}>{s.change}</Text>
      </View>
    ))}

    {/* 피해 섹터 */}
    <Text style={[sectionStyles.subTitle, { color: '#EF4444', marginTop: 12 }]}>▼ 피해 섹터</Text>
    {marketImpact.downSectors.map((s, i) => (
      <View key={i} style={sectionStyles.sectorRow}>
        <Text style={[sectionStyles.sectorName, { color: colors.textPrimary }]}>{s.name}</Text>
        <Text style={[sectionStyles.sectorChange, { color: '#EF4444' }]}>{s.change}</Text>
      </View>
    ))}
  </View>
);

/** 역사적 선례 섹션 */
const HistoricalSection: React.FC<{
  parallel: ExtremeScenario['historicalParallel'];
  colors: any;
}> = ({ parallel, colors }) => (
  <View style={[sectionStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={sectionStyles.cardHeader}>
      <Ionicons name="time-outline" size={18} color={colors.primary} />
      <Text style={[sectionStyles.cardTitle, { color: colors.textPrimary }]}>역사적 선례</Text>
    </View>

    <View style={[sectionStyles.parallelBox, { backgroundColor: colors.background }]}>
      <Text style={[sectionStyles.parallelEvent, { color: colors.textPrimary }]}>
        {parallel.event}
      </Text>
      <View style={sectionStyles.parallelMetrics}>
        <View style={sectionStyles.parallelMetric}>
          <Text style={[sectionStyles.parallelLabel, { color: colors.textTertiary }]}>초기 하락</Text>
          <Text style={[sectionStyles.parallelValue, { color: '#EF4444' }]}>{parallel.initialDrop}</Text>
        </View>
        <View style={sectionStyles.parallelMetric}>
          <Text style={[sectionStyles.parallelLabel, { color: colors.textTertiary }]}>회복 기간</Text>
          <Text style={[sectionStyles.parallelValue, { color: '#10B981' }]}>{parallel.recoveryTime}</Text>
        </View>
      </View>
    </View>

    <View style={[sectionStyles.lessonBox, { backgroundColor: '#10B98110' }]}>
      <Ionicons name="bulb-outline" size={16} color="#10B981" />
      <Text style={[sectionStyles.lessonText, { color: colors.textSecondary }]}>
        {parallel.lesson}
      </Text>
    </View>
  </View>
);

/** 행동 가이드 섹션 */
const ActionGuideSection: React.FC<{
  guide: string[];
  colors: any;
}> = ({ guide, colors }) => (
  <View style={[sectionStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={sectionStyles.cardHeader}>
      <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
      <Text style={[sectionStyles.cardTitle, { color: colors.textPrimary }]}>행동 가이드</Text>
    </View>
    {guide.map((item, idx) => (
      <View key={idx} style={sectionStyles.guideRow}>
        <View style={[sectionStyles.guideDot, { backgroundColor: colors.primary }]} />
        <Text style={[sectionStyles.guideText, { color: colors.textSecondary }]}>{item}</Text>
      </View>
    ))}
  </View>
);

/** 포트폴리오 시뮬레이션 결과 */
const SimulationResultSection: React.FC<{
  result: WhatIfResult;
  colors: any;
}> = ({ result, colors }) => (
  <View style={[sectionStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={sectionStyles.cardHeader}>
      <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
      <Text style={[sectionStyles.cardTitle, { color: colors.textPrimary }]}>
        내 포트폴리오 시뮬레이션
      </Text>
    </View>

    {/* 전체 영향 */}
    <View style={[sectionStyles.totalImpactBox, { backgroundColor: '#EF444410' }]}>
      <Text style={[sectionStyles.totalImpactLabel, { color: colors.textTertiary }]}>
        예상 총 영향
      </Text>
      <Text style={[sectionStyles.totalImpactValue, { color: '#EF4444' }]}>
        {result.totalImpact.changePercent > 0 ? '+' : ''}
        {result.totalImpact.changePercent.toFixed(1)}%
      </Text>
      <Text style={[sectionStyles.totalImpactAmount, { color: colors.textSecondary }]}>
        {result.totalImpact.changeAmount > 0 ? '+' : ''}
        {Math.round(result.totalImpact.changeAmount).toLocaleString()}원
      </Text>
    </View>

    {/* 종목별 영향 */}
    {result.assetImpacts.map((asset, idx) => {
      const impactColor =
        asset.impactLevel === 'HIGH' ? '#EF4444' :
        asset.impactLevel === 'MEDIUM' ? '#F59E0B' : '#10B981';

      return (
        <View key={idx} style={[sectionStyles.assetRow, { borderBottomColor: colors.borderLight }]}>
          <View style={sectionStyles.assetInfo}>
            <Text style={[sectionStyles.assetName, { color: colors.textPrimary }]}>
              {asset.name}
            </Text>
            <Text style={[sectionStyles.assetTicker, { color: colors.textTertiary }]}>
              {asset.ticker}
            </Text>
          </View>
          <View style={sectionStyles.assetImpact}>
            <Text style={[sectionStyles.assetChange, { color: impactColor }]}>
              {asset.changePercent > 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%
            </Text>
            <View style={[sectionStyles.impactBadge, { backgroundColor: impactColor + '20' }]}>
              <Text style={[sectionStyles.impactBadgeText, { color: impactColor }]}>
                {asset.impactLevel}
              </Text>
            </View>
          </View>
        </View>
      );
    })}

    {/* 요약 */}
    <View style={[sectionStyles.summaryBox, { backgroundColor: colors.background }]}>
      <Text style={[sectionStyles.summaryText, { color: colors.textSecondary }]}>
        {result.summary}
      </Text>
    </View>
  </View>
);

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export const ExtremeScenarioReport: React.FC<ExtremeScenarioReportProps> = ({
  scenario,
  simulationResult,
  isSimulating,
  simulationError,
  onSimulate,
  hasAssets,
}) => {
  const { colors } = useTheme();
  const catColor = CATEGORY_COLORS[scenario.category];
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const { rewarded, claimReward } = useShareReward();

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
        return;
      }
      if (!viewShotRef.current?.capture) {
        Alert.alert('오류', '캡처 영역을 찾을 수 없습니다.');
        return;
      }
      const uri = await viewShotRef.current.capture();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `baln 위기 시뮬레이터 — ${scenario.title}`,
        UTI: 'public.png',
      });
      // 공유 성공 → 크레딧 보상
      const result = await claimReward();
      if (result.success) {
        setRewardMessage(`+${result.creditsEarned} 크레딧 획득!`);
        setTimeout(() => setRewardMessage(null), 3000);
      }
    } catch (err) {
      console.error('[ExtremeShare] 공유 실패:', err);
    } finally {
      setSharing(false);
    }
  }, [scenario.title, claimReward]);

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1.0 }}
        style={{ backgroundColor: colors.background }}
      >
      {/* 시나리오 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.headerEmoji}>{scenario.emoji}</Text>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {scenario.title}
        </Text>
        <View style={[styles.headerBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.headerBadgeText, { color: catColor }]}>
            {scenario.categoryLabel}
          </Text>
        </View>
      </View>

      {/* 섹션들 (무료 열람) */}
      <ImpactChainSection chain={scenario.impactChain} colors={colors} />
      <MarketImpactSection marketImpact={scenario.marketImpact} colors={colors} />
      <HistoricalSection parallel={scenario.historicalParallel} colors={colors} />
      <ActionGuideSection guide={scenario.actionGuide} colors={colors} />

      {/* 포트폴리오 시뮬레이션 CTA */}
      {!simulationResult && !isSimulating && (
        <TouchableOpacity
          style={[
            styles.ctaButton,
            {
              backgroundColor: hasAssets ? colors.primary : colors.disabled,
            },
          ]}
          onPress={onSimulate}
          disabled={!hasAssets || isSimulating}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={20} color="#FFFFFF" />
          <Text style={styles.ctaText}>
            {hasAssets
              ? `내 포트폴리오 시뮬레이션 (${formatCredits(2, false)})`
              : '자산 등록 후 시뮬레이션 가능'}
          </Text>
        </TouchableOpacity>
      )}

      {/* 시뮬레이션 로딩 */}
      {isSimulating && (
        <View style={[styles.loadingBox, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
            AI가 포트폴리오를 분석하고 있습니다
          </Text>
        </View>
      )}

      {/* 시뮬레이션 에러 */}
      {simulationError && !isSimulating && (
        <View style={[styles.errorBox, { backgroundColor: '#EF444410' }]}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>
            {simulationError}
          </Text>
        </View>
      )}

      {/* 시뮬레이션 결과 */}
      {simulationResult && !isSimulating && (
        <SimulationResultSection result={simulationResult} colors={colors} />
      )}

      {/* 안심 메시지 (버핏 철학) */}
      <View style={[styles.reassureBox, { backgroundColor: '#10B98110' }]}>
        <Text style={[styles.reassureText, { color: colors.textSecondary }]}>
          💡 이 시뮬레이션은 교육 목적입니다. 극단적 시나리오를 미리 생각해두면
          실제 위기 시 패닉 대신 이해로 대응할 수 있습니다.
        </Text>
      </View>

      {/* baln 워터마크 (캡처용) */}
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>bal<Text style={{ color: '#4CAF50' }}>n</Text>.logic</Text>
      </View>
      </ViewShot>

      {/* 인스타 공유 버튼 */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.primary }]}
        onPress={handleShare}
        disabled={sharing}
        activeOpacity={0.8}
      >
        <Ionicons name="share-social" size={18} color="#FFFFFF" />
        <Text style={styles.shareButtonText}>
          {sharing ? '캡처 중...' : '인스타그램에 공유하기'}
        </Text>
        {!rewarded && (
          <View style={styles.rewardHint}>
            <Text style={styles.rewardHintText}>+{REWARD_AMOUNTS.shareCard}C</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 보상 토스트 */}
      {rewardMessage && (
        <View style={styles.rewardToast}>
          <Ionicons name="gift" size={14} color="#4CAF50" />
          <Text style={styles.rewardToastText}>{rewardMessage}</Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 48,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  reassureBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  reassureText: {
    fontSize: 13,
    lineHeight: 20,
  },
  watermark: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  watermarkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  rewardHint: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  rewardHintText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  rewardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 20,
  },
  rewardToastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
});

const sectionStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Impact Chain
  chainContainer: {
    gap: 0,
  },
  chainStep: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  chainNumber: {
    fontSize: 14,
    fontWeight: '800',
    width: 22,
    textAlign: 'center',
  },
  chainText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  chainArrowContainer: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  // Market Impact
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  sectorName: {
    fontSize: 14,
    flex: 1,
  },
  sectorChange: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Historical
  parallelBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  parallelEvent: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  parallelMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  parallelMetric: {
    flex: 1,
  },
  parallelLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  parallelValue: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  lessonBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  lessonText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  // Action Guide
  guideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  guideDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  guideText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  // Simulation Result
  totalImpactBox: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalImpactLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalImpactValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  totalImpactAmount: {
    fontSize: 14,
    marginTop: 4,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  assetInfo: {
    flex: 1,
    gap: 2,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  assetTicker: {
    fontSize: 12,
  },
  assetImpact: {
    alignItems: 'flex-end',
    gap: 4,
  },
  assetChange: {
    fontSize: 16,
    fontWeight: '700',
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  impactBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  summaryBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default ExtremeScenarioReport;
