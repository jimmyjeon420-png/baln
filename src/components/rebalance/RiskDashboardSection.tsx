/**
 * 리스크 대시보드 섹션 — Panic Shield + FOMO Vaccine 요약/상세
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonBlock } from '../SkeletonLoader';
import PanicShieldCard from '../PanicShieldCard';
import FomoVaccineCard from '../FomoVaccineCard';
import { useTheme } from '../../hooks/useTheme';
import type { ThemeColors } from '../../styles/colors';
import type { RiskAnalysisResult } from '../../services/gemini';
import type { PeerComparison } from '../../types/rebalanceTypes';

interface RiskDashboardSectionProps {
  analysisResult: RiskAnalysisResult | null;
  peerPanicData?: PeerComparison | null;
  isAILoading?: boolean;
  /** 맥락 카드 센티먼트 (불일치 경고용) */
  contextSentiment?: 'calm' | 'caution' | 'alert' | null;
}

export default function RiskDashboardSection({
  analysisResult,
  peerPanicData,
  isAILoading,
  contextSentiment,
}: RiskDashboardSectionProps) {
  const { colors, shadows } = useTheme();
  const [showDetail, setShowDetail] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // AI 로딩 중 스켈레톤 (레이아웃 위치 확보 -> CLS 방지)
  if (isAILoading && !analysisResult) {
    return (
      <View style={styles.card}>
        <SkeletonBlock width={100} height={16} />
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
          <View style={[styles.skeletonBox]}>
            <SkeletonBlock width={24} height={24} style={{ borderRadius: 6 }} />
            <SkeletonBlock width={80} height={11} />
            <SkeletonBlock width={60} height={13} />
          </View>
          <View style={[styles.skeletonBox]}>
            <SkeletonBlock width={24} height={24} style={{ borderRadius: 6 }} />
            <SkeletonBlock width={80} height={11} />
            <SkeletonBlock width={60} height={13} />
          </View>
        </View>
      </View>
    );
  }

  if (!analysisResult) return null;

  const panicLevel = analysisResult.panicShieldLevel;
  const panicIndex = analysisResult.panicShieldIndex;
  const highFomoCount = (analysisResult.fomoAlerts ?? []).filter(a => a.severity === 'HIGH').length;

  /**
   * 요약 아이템 배경색: 충분한 알파값으로 라이트 모드에서도 가시성 확보
   */
  const getPanicBg = () => {
    if (panicLevel === 'DANGER') return `${colors.error}25`;
    if (panicLevel === 'CAUTION') return `${colors.warning}25`;
    return `${colors.success}25`;
  };

  const getFomoBg = () => {
    if (highFomoCount > 0) return `${colors.error}25`;
    return `${colors.success}25`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.cardLabel}>리스크 체크</Text>
          <Text style={styles.cardLabelEn}>Risk Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setShowDetail(!showDetail)}
        >
          <Text style={styles.expandButtonText}>{showDetail ? '접기' : '상세'}</Text>
          <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* 요약 2줄 */}
      <View style={styles.summaryRow}>
        {/* Panic Shield 요약 */}
        <View style={[styles.summaryItem, { backgroundColor: getPanicBg() }]}>
          <Ionicons name="shield" size={18} color={
            panicLevel === 'DANGER' ? colors.error : panicLevel === 'CAUTION' ? colors.warning : colors.success
          } />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Panic Shield</Text>
            <Text style={[styles.summaryValue, {
              color: panicLevel === 'DANGER' ? colors.error : panicLevel === 'CAUTION' ? colors.warning : (colors.primaryDark ?? colors.success)
            }]}>
              {panicIndex}/100 {panicLevel === 'SAFE' ? '안전' : panicLevel === 'CAUTION' ? '주의' : '위험'}
            </Text>
            {/* 패닉 실드 점수 이유 */}
            {analysisResult.panicShieldReason && (
              <Text style={styles.reasonText} numberOfLines={4}>
                {analysisResult.panicShieldReason}
              </Text>
            )}
          </View>
        </View>

        {/* FOMO Vaccine 요약 */}
        <View style={[styles.summaryItem, { backgroundColor: getFomoBg() }]}>
          <Ionicons name="medical" size={18} color={highFomoCount > 0 ? colors.error : colors.success} />
          <View>
            <Text style={styles.summaryLabel}>FOMO Vaccine</Text>
            <Text style={[styles.summaryValue, { color: highFomoCount > 0 ? colors.error : (colors.primaryDark ?? colors.success) }]}>
              {highFomoCount > 0 ? `경고 ${analysisResult.fomoAlerts.length}건` : '경고 없음'}
            </Text>
          </View>
        </View>
      </View>

      {/* 센티먼트 vs Panic Shield 불일치 경고 */}
      {contextSentiment && ((contextSentiment === 'calm' && panicLevel === 'DANGER') || (contextSentiment === 'alert' && panicLevel === 'SAFE')) && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 10,
          padding: 10,
          borderRadius: 10,
          backgroundColor: `${colors.warning}20`,
        }}>
          <Ionicons name="information-circle" size={16} color={colors.warning} />
          <Text style={{ flex: 1, fontSize: 11, lineHeight: 16, color: colors.textSecondary }}>
            {contextSentiment === 'calm' && panicLevel === 'DANGER'
              ? '시장 심리는 안정적이지만, 포트폴리오 위험 신호가 감지되었습니다. 배분 이탈도를 확인하세요.'
              : '시장에 경고 신호가 있지만, 당신의 포트폴리오는 안전합니다. 현재 기준을 유지하세요.'}
          </Text>
        </View>
      )}

      {/* 상세 펼침 */}
      {showDetail && (
        <View style={styles.detailContainer}>
          <PanicShieldCard
            index={analysisResult.panicShieldIndex}
            level={analysisResult.panicShieldLevel}
            stopLossGuidelines={analysisResult.stopLossGuidelines}
            subScores={analysisResult.panicSubScores}
            peerComparison={peerPanicData}
          />
          <FomoVaccineCard alerts={analysisResult.fomoAlerts} />
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  skeletonBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardLabelEn: {
    fontSize: 10,
    marginTop: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  expandButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandButtonText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 2,
    color: colors.textTertiary,
  },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  reasonText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
    color: colors.textTertiary,
  },
  detailContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
