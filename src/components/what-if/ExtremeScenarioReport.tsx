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
 *
 * [수정 2026-02-14] 인스타그램 공유 이미지 개선:
 * - 기존: ViewShot이 전체 리포트를 캡처 → 매우 긴 이미지
 * - 변경: 별도 9:16 (1080x1920) 공유 카드 모달로 분리
 * - 가장 흥미로운 데이터만 요약하여 인스타 스토리 최적화
 */

import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
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
    {(marketImpact.upSectors ?? []).map((s, i) => (
      <View key={i} style={sectionStyles.sectorRow}>
        <Text style={[sectionStyles.sectorName, { color: colors.textPrimary }]}>{s.name}</Text>
        <Text style={[sectionStyles.sectorChange, { color: '#10B981' }]}>{s.change}</Text>
      </View>
    ))}

    {/* 피해 섹터 */}
    <Text style={[sectionStyles.subTitle, { color: '#EF4444', marginTop: 12 }]}>▼ 피해 섹터</Text>
    {(marketImpact.downSectors ?? []).map((s, i) => (
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
        {(result.totalImpact?.changePercent ?? 0) > 0 ? '+' : ''}
        {(result.totalImpact?.changePercent ?? 0).toFixed(1)}%
      </Text>
      <Text style={[sectionStyles.totalImpactAmount, { color: colors.textSecondary }]}>
        {(result.totalImpact?.changeAmount ?? 0) > 0 ? '+' : ''}
        {Math.round(result.totalImpact?.changeAmount ?? 0).toLocaleString()}원
      </Text>
    </View>

    {/* 종목별 영향 */}
    {(result.assetImpacts ?? []).map((asset, idx) => {
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
// 9:16 인스타그램 스토리 공유 카드 (모달)
// ============================================================================

const ShareStoryModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  scenario: ExtremeScenario;
  simulationResult: WhatIfResult | null;
}> = ({ visible, onClose, scenario, simulationResult }) => {
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const { rewarded, claimReward } = useShareReward();
  const catColor = CATEGORY_COLORS[scenario.category];

  // 상위 수혜/피해 섹터 (각 2개씩만)
  const topUp = (scenario.marketImpact.upSectors ?? []).slice(0, 2);
  const topDown = (scenario.marketImpact.downSectors ?? []).slice(0, 2);

  // 시뮬레이션 결과가 있으면 핵심 수치 포함
  const hasSimResult = !!simulationResult;
  const simChangePercent = simulationResult?.totalImpact?.changePercent ?? 0;
  const simChangeAmount = simulationResult?.totalImpact?.changeAmount ?? 0;

  const handleShareCapture = useCallback(async () => {
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
      // 공유 성공 -> 크레딧 보상
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

  // 카드 콘텐츠 (캡처 대상 - 9:16 비율)
  const cardContent = (
    <View style={shareStyles.captureArea}>
      {/* 배경 글로우 */}
      <View style={[shareStyles.bgGlow, { backgroundColor: catColor, opacity: 0.06 }]} />
      <View style={[shareStyles.bgGlowBottom, { backgroundColor: '#10B981', opacity: 0.04 }]} />

      {/* 상단: baln.logic 로고 + 카테고리 */}
      <View style={shareStyles.topRow}>
        <View style={shareStyles.logoArea}>
          <View style={shareStyles.logoRow}>
            <Text style={shareStyles.logoBaln}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
            <Text style={shareStyles.logoDot}>.logic</Text>
          </View>
          <Text style={shareStyles.logoSub}>AI 위기 시뮬레이터</Text>
        </View>
        <View style={[shareStyles.catBadge, { backgroundColor: catColor + '25', borderColor: catColor + '50' }]}>
          <Text style={[shareStyles.catBadgeText, { color: catColor }]}>
            {scenario.categoryLabel}
          </Text>
        </View>
      </View>

      {/* 바이럴 훅 */}
      <View style={shareStyles.viralHookBox}>
        <Text style={shareStyles.viralHookText}>만약 이게 실제로 일어난다면?</Text>
      </View>

      {/* 시나리오 헤더: 이모지 + 제목 */}
      <View style={shareStyles.scenarioHeader}>
        <Text style={shareStyles.scenarioEmoji}>{scenario.emoji}</Text>
        <Text style={shareStyles.scenarioTitle}>{scenario.title}</Text>
        <Text style={shareStyles.scenarioSubtitle}>{scenario.subtitle}</Text>
      </View>

      {/* 구분선 */}
      <View style={shareStyles.divider} />

      {/* 핵심 시장 영향 (KOSPI + 환율) */}
      <View style={shareStyles.impactRow}>
        <View style={[shareStyles.impactBox, { backgroundColor: '#EF444412' }]}>
          <Text style={shareStyles.impactLabel}>KOSPI</Text>
          <Text style={[shareStyles.impactValue, { color: '#EF4444' }]}>
            {scenario.marketImpact.kospi}
          </Text>
        </View>
        <View style={[shareStyles.impactBox, { backgroundColor: '#F59E0B12' }]}>
          <Text style={shareStyles.impactLabel}>원/달러</Text>
          <Text style={[shareStyles.impactValue, { color: '#F59E0B' }]}>
            {scenario.marketImpact.usdkrw}
          </Text>
        </View>
      </View>

      {/* 수혜/피해 섹터 요약 */}
      <View style={shareStyles.sectorSummary}>
        <View style={shareStyles.sectorCol}>
          <Text style={[shareStyles.sectorHeader, { color: '#10B981' }]}>수혜 섹터</Text>
          {topUp.map((s, i) => (
            <View key={i} style={shareStyles.sectorItem}>
              <Text style={shareStyles.sectorName}>{s.name}</Text>
              <Text style={[shareStyles.sectorChange, { color: '#10B981' }]}>{s.change}</Text>
            </View>
          ))}
        </View>
        <View style={shareStyles.sectorDivider} />
        <View style={shareStyles.sectorCol}>
          <Text style={[shareStyles.sectorHeader, { color: '#EF4444' }]}>피해 섹터</Text>
          {topDown.map((s, i) => (
            <View key={i} style={shareStyles.sectorItem}>
              <Text style={shareStyles.sectorName}>{s.name}</Text>
              <Text style={[shareStyles.sectorChange, { color: '#EF4444' }]}>{s.change}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 포트폴리오 시뮬레이션 결과 (있는 경우에만) */}
      {hasSimResult && (
        <View style={shareStyles.simResultBox}>
          <Text style={shareStyles.simResultLabel}>내 포트폴리오 예상 영향</Text>
          <Text style={[shareStyles.simResultValue, { color: simChangePercent >= 0 ? '#10B981' : '#EF4444' }]}>
            {simChangePercent > 0 ? '+' : ''}{simChangePercent.toFixed(1)}%
          </Text>
          <Text style={shareStyles.simResultAmount}>
            {simChangeAmount > 0 ? '+' : ''}{Math.round(simChangeAmount).toLocaleString()}원
          </Text>
        </View>
      )}

      {/* 역사적 선례 요약 (시뮬레이션 결과 없을 때만 - 공간 확보) */}
      {!hasSimResult && (
        <View style={shareStyles.histBox}>
          <View style={shareStyles.histHeader}>
            <Ionicons name="time-outline" size={14} color="#4CAF50" />
            <Text style={shareStyles.histTitle}>역사적 선례</Text>
          </View>
          <Text style={shareStyles.histEvent}>{scenario.historicalParallel.event}</Text>
          <View style={shareStyles.histMetrics}>
            <View style={shareStyles.histMetric}>
              <Text style={shareStyles.histMetricLabel}>초기 하락</Text>
              <Text style={[shareStyles.histMetricValue, { color: '#EF4444' }]}>
                {scenario.historicalParallel.initialDrop}
              </Text>
            </View>
            <View style={shareStyles.histMetric}>
              <Text style={shareStyles.histMetricLabel}>회복 기간</Text>
              <Text style={[shareStyles.histMetricValue, { color: '#10B981' }]}>
                {scenario.historicalParallel.recoveryTime}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 안심 메시지 */}
      <View style={shareStyles.reassureBox}>
        <Text style={shareStyles.reassureText}>
          위기를 미리 시뮬레이션하면, 패닉 대신 이해로 대응할 수 있습니다.
        </Text>
      </View>

      {/* 하단 CTA */}
      <View style={shareStyles.ctaContainer}>
        <View style={shareStyles.ctaBox}>
          <Ionicons name="open-outline" size={16} color="#4CAF50" />
          <Text style={shareStyles.ctaText}>
            bal<Text style={{ color: '#4CAF50' }}>n</Text>.app에서 무료 시뮬레이션
          </Text>
        </View>
      </View>

      {/* 워터마크 */}
      <View style={shareStyles.watermarkRow}>
        <View style={shareStyles.watermarkLine} />
        <Text style={shareStyles.watermarkBaln}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        <Text style={shareStyles.watermarkDot}>.logic</Text>
        <View style={shareStyles.watermarkLine} />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={shareStyles.modalContainer}>
        {/* 모달 헤더 */}
        <View style={shareStyles.modalHeader}>
          <Text style={shareStyles.modalTitle}>인스타 스토리 공유</Text>
          <TouchableOpacity onPress={onClose} style={shareStyles.closeButton}>
            <Ionicons name="close" size={24} color="#888888" />
          </TouchableOpacity>
        </View>

        {/* 프리뷰 */}
        <View style={shareStyles.previewContainer}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1.0 }}
          >
            {cardContent}
          </ViewShot>
        </View>

        {/* 보상 토스트 */}
        {rewardMessage && (
          <View style={shareStyles.rewardToast}>
            <Ionicons name="gift" size={14} color="#4CAF50" />
            <Text style={shareStyles.rewardToastText}>{rewardMessage}</Text>
          </View>
        )}

        {/* 공유 버튼 */}
        <View style={shareStyles.buttonContainer}>
          <TouchableOpacity
            style={shareStyles.shareButton}
            onPress={handleShareCapture}
            disabled={sharing}
            activeOpacity={0.7}
          >
            {sharing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="share-social" size={18} color="#FFFFFF" />
                <Text style={shareStyles.shareButtonText}>인스타그램 공유</Text>
                {!rewarded && (
                  <View style={shareStyles.rewardHint}>
                    <Text style={shareStyles.rewardHintText}>+{REWARD_AMOUNTS.shareCard}C</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <View style={styles.container}>
      {/* 바이럴 훅 — 드라마틱한 질문 */}
      <View style={styles.viralHook}>
        <Text style={styles.viralHookText}>만약 이게 실제로 일어난다면?</Text>
      </View>

      {/* 시나리오 헤더 (바이럴 강화) */}
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
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          AI 위기 시뮬레이터가 분석한 결과
        </Text>
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
          이 시뮬레이션은 교육 목적입니다. 극단적 시나리오를 미리 생각해두면
          실제 위기 시 패닉 대신 이해로 대응할 수 있습니다.
        </Text>
      </View>

      {/* 인스타 공유 버튼 */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowShareModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="share-social" size={18} color="#FFFFFF" />
        <Text style={styles.shareButtonText}>인스타그램에 공유하기</Text>
      </TouchableOpacity>

      {/* 인스타 스토리 공유 모달 (9:16) */}
      <ShareStoryModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        scenario={scenario}
        simulationResult={simulationResult}
      />
    </View>
  );
};

// ============================================================================
// 스타일 (리포트 본문)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  viralHook: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#EF444415',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  viralHookText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  header: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 56,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
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
    fontSize: 17,
    fontWeight: '700',
  },
  loadingBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorBox: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  reassureBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  reassureText: {
    fontSize: 14,
    lineHeight: 21,
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
    fontSize: 16,
    fontWeight: '700',
  },
});

// ============================================================================
// 스타일 (9:16 인스타 스토리 공유 카드)
// ============================================================================

const shareStyles = StyleSheet.create({
  // ─── 모달 ───
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // ─── 캡처 영역 (9:16 인스타 스토리 비율) ───
  captureArea: {
    width: 320,
    aspectRatio: 9 / 16,
    backgroundColor: '#1A1F2C',
    borderRadius: 20,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  bgGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    borderRadius: 20,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    borderRadius: 20,
  },

  // ─── 상단: 로고 + 카테고리 ───
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    zIndex: 10,
  },
  logoArea: {},
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoBaln: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoDot: {
    fontSize: 21,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  logoSub: {
    fontSize: 9,
    color: '#666666',
    letterSpacing: 2,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ─── 바이럴 훅 ───
  viralHookBox: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#EF444412',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF444425',
    zIndex: 10,
  },
  viralHookText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.3,
  },

  // ─── 시나리오 헤더 ───
  scenarioHeader: {
    alignItems: 'center',
    marginBottom: 14,
    zIndex: 10,
  },
  scenarioEmoji: {
    fontSize: 48,
    marginBottom: 6,
  },
  scenarioTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  scenarioSubtitle: {
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
  },

  // ─── 구분선 ───
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },

  // ─── 핵심 시장 영향 ───
  impactRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    zIndex: 10,
  },
  impactBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    marginBottom: 4,
  },
  impactValue: {
    fontSize: 17,
    fontWeight: '800',
  },

  // ─── 섹터 요약 ───
  sectorSummary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    zIndex: 10,
  },
  sectorCol: {
    flex: 1,
  },
  sectorDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 10,
  },
  sectorHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  sectorItem: {
    marginBottom: 4,
  },
  sectorName: {
    fontSize: 11,
    color: '#CCCCCC',
    lineHeight: 15,
  },
  sectorChange: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ─── 포트폴리오 시뮬레이션 결과 ───
  simResultBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    zIndex: 10,
  },
  simResultLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    marginBottom: 4,
  },
  simResultValue: {
    fontSize: 29,
    fontWeight: '900',
  },
  simResultAmount: {
    fontSize: 13,
    color: '#BBBBBB',
    marginTop: 2,
  },

  // ─── 역사적 선례 ───
  histBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    zIndex: 10,
  },
  histHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  histTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCCCCC',
    marginLeft: 4,
  },
  histEvent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  histMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  histMetric: {
    flex: 1,
  },
  histMetricLabel: {
    fontSize: 10,
    color: '#888888',
    marginBottom: 2,
  },
  histMetricValue: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  // ─── 안심 메시지 ───
  reassureBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    zIndex: 10,
  },
  reassureText: {
    fontSize: 11,
    color: '#AAAAAA',
    lineHeight: 16,
    textAlign: 'center',
  },

  // ─── 하단 CTA ───
  ctaContainer: {
    marginTop: 'auto',
    paddingTop: 8,
    zIndex: 10,
  },
  ctaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 6,
  },

  // ─── 워터마크 ───
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
    zIndex: 10,
  },
  watermarkLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  watermarkBaln: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
  },
  watermarkDot: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3A7D3E',
    letterSpacing: 1,
  },

  // ─── 보상 토스트 ───
  rewardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 20,
  },
  rewardToastText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },

  // ─── 공유 버튼 ───
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rewardHint: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rewardHintText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
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
    fontSize: 17,
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
    fontSize: 15,
    fontWeight: '800',
    width: 22,
    textAlign: 'center',
  },
  chainText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 21,
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
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 21,
    fontWeight: '800',
  },
  subTitle: {
    fontSize: 15,
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
    fontSize: 15,
    flex: 1,
  },
  sectorChange: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Historical
  parallelBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  parallelEvent: {
    fontSize: 16,
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
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  parallelValue: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  lessonBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  lessonText: {
    fontSize: 14,
    lineHeight: 21,
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
    fontSize: 15,
    lineHeight: 21,
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
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalImpactValue: {
    fontSize: 33,
    fontWeight: '800',
  },
  totalImpactAmount: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '600',
  },
  assetTicker: {
    fontSize: 13,
  },
  assetImpact: {
    alignItems: 'flex-end',
    gap: 4,
  },
  assetChange: {
    fontSize: 17,
    fontWeight: '700',
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  impactBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 21,
  },
});

export default ExtremeScenarioReport;
