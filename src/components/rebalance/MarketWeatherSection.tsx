/**
 * 시장 날씨 섹션 — 센티먼트 + 매크로 요약 + 부동산 인사이트 + 투자 날씨 상세
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonBlock } from '../SkeletonLoader';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../styles/colors';
import type { MorningBriefingData } from '../../types/rebalanceTypes';

interface MarketWeatherSectionProps {
  morningBriefing: MorningBriefingData | null;
  isAILoading: boolean;
}

export default function MarketWeatherSection({
  morningBriefing,
  isAILoading,
}: MarketWeatherSectionProps) {
  const { colors } = useTheme();
  const [showDetail, setShowDetail] = useState(false);

  const styles = createStyles(colors);

  // AI 로딩 중 스켈레톤
  if (isAILoading && !morningBriefing) {
    return (
      <View style={styles.card}>
        <SkeletonBlock width={100} height={16} />
        <View style={{ marginTop: 12, gap: 8 }}>
          <SkeletonBlock width="90%" height={14} />
          <SkeletonBlock width="75%" height={14} />
          <SkeletonBlock width="80%" height={14} />
        </View>
      </View>
    );
  }

  if (!morningBriefing) return null;

  const sentiment = morningBriefing.macroSummary.marketSentiment;
  const sentimentColor = sentiment === 'BULLISH' ? colors.success : sentiment === 'BEARISH' ? colors.error : colors.warning;
  const sentimentLabel = sentiment === 'BULLISH' ? '낙관' : sentiment === 'BEARISH' ? '비관' : '중립';

  return (
    <View style={styles.card}>
      <View style={styles.marketHeader}>
        <View>
          <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>시장 날씨</Text>
          <Text style={[styles.cardLabelEn, { color: colors.textTertiary }]}>Market Sentiment</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.sentimentChip, { backgroundColor: sentimentColor + '20' }]}>
            <View style={[styles.sentimentDot, { backgroundColor: sentimentColor }]} />
            <Text style={[styles.sentimentText, { color: sentimentColor }]}>{sentimentLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setShowDetail(!showDetail)}
          >
            <Text style={[styles.expandButtonText, { color: colors.textTertiary }]}>{showDetail ? '접기' : '상세'}</Text>
            <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 매크로 요약 제목 */}
      {morningBriefing.macroSummary.title && (
        <Text style={[styles.marketTitle, { color: colors.textPrimary }]}>{morningBriefing.macroSummary.title}</Text>
      )}

      {/* 매크로 하이라이트 */}
      <View style={styles.highlights}>
        {(showDetail
          ? morningBriefing.macroSummary.highlights
          : morningBriefing.macroSummary.highlights.slice(0, 3)
        ).map((h, i) => (
          <View key={i} style={styles.highlightRow}>
            <Text style={[styles.highlightDot, { color: colors.primaryDark ?? colors.primary }]}>•</Text>
            <Text style={[styles.highlightText, { color: colors.textSecondary }]} numberOfLines={showDetail ? undefined : 2}>{h}</Text>
          </View>
        ))}
      </View>

      {/* 금리 전망 */}
      {morningBriefing.macroSummary.interestRateProbability && (
        <View style={[styles.rateBadge, { backgroundColor: `${colors.warning}14` }]}>
          <Ionicons name="trending-up" size={12} color={colors.warning} />
          <Text style={[styles.rateText, { color: colors.warning }]} numberOfLines={showDetail ? undefined : 2}>
            {morningBriefing.macroSummary.interestRateProbability}
          </Text>
        </View>
      )}

      {/* 상세 펼침 */}
      {showDetail && (
        <View style={[styles.detailContainer, { borderTopColor: colors.border }]}>
          {/* 부동산 인사이트 */}
          {morningBriefing.realEstateInsight && (
            <View style={[styles.realEstateSection, { backgroundColor: `${colors.info}0F`, borderColor: `${colors.info}1A` }]}>
              <View style={styles.realEstateHeader}>
                <Ionicons name="home" size={14} color={colors.info} />
                <Text style={[styles.realEstateTitle, { color: colors.info }]}>{morningBriefing.realEstateInsight.title}</Text>
              </View>
              <Text style={[styles.realEstateAnalysis, { color: colors.textSecondary }]}>{morningBriefing.realEstateInsight.analysis}</Text>
              <View style={[styles.realEstateRecBadge, { backgroundColor: `${colors.success}14` }]}>
                <Ionicons name="bulb" size={12} color={colors.primaryDark ?? colors.primary} />
                <Text style={[styles.realEstateRecText, { color: colors.primaryDark ?? colors.primary }]}>{morningBriefing.realEstateInsight.recommendation}</Text>
              </View>
            </View>
          )}

          {/* 투자 날씨 상세 */}
          <View style={[styles.cfoDetailSection, { backgroundColor: `${colors.success}0F`, borderColor: `${colors.success}14` }]}>
            <View style={styles.cfoDetailHeader}>
              <Text style={styles.cfoDetailEmoji}>{morningBriefing.cfoWeather.emoji}</Text>
              <Text style={[styles.cfoDetailStatus, { color: colors.primaryDark ?? colors.primary }]}>{morningBriefing.cfoWeather.status}</Text>
            </View>
            <Text style={[styles.cfoDetailMessage, { color: colors.textSecondary }]}>{morningBriefing.cfoWeather.message}</Text>
          </View>

          {/* 생성 시간 */}
          <Text style={[styles.detailTime, { color: colors.textTertiary }]}>
            분석 시간: {new Date(morningBriefing.generatedAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}

      {/* 접힌 상태에서 "더보기" 힌트 */}
      {!showDetail && morningBriefing.macroSummary.highlights.length > 3 && (
        <TouchableOpacity
          style={styles.showMoreHint}
          onPress={() => setShowDetail(true)}
        >
          <Text style={[styles.showMoreHintText, { color: colors.primaryDark ?? colors.primary }]}>
            +{morningBriefing.macroSummary.highlights.length - 3}개 항목 더보기
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.primaryDark ?? colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { fontSize: 15, fontWeight: '700' },
  cardLabelEn: { fontSize: 10, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sentimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  sentimentDot: { width: 6, height: 6, borderRadius: 3 },
  sentimentText: { fontSize: 12, fontWeight: '700' },
  expandButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandButtonText: { fontSize: 12 },
  marketTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  highlights: { gap: 6, marginBottom: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  highlightDot: { fontSize: 13, lineHeight: 20 },
  highlightText: { flex: 1, fontSize: 13, lineHeight: 20 },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  rateText: { fontSize: 12, fontWeight: '500', flex: 1 },
  detailContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 14 },
  realEstateSection: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  realEstateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  realEstateTitle: { fontSize: 13, fontWeight: '700' },
  realEstateAnalysis: { fontSize: 13, lineHeight: 20, marginBottom: 10 },
  realEstateRecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  realEstateRecText: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18 },
  cfoDetailSection: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  cfoDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cfoDetailEmoji: { fontSize: 20 },
  cfoDetailStatus: { fontSize: 14, fontWeight: '700' },
  cfoDetailMessage: { fontSize: 13, lineHeight: 20 },
  detailTime: { fontSize: 11, textAlign: 'right' },
  showMoreHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 4 },
  showMoreHintText: { fontSize: 12, fontWeight: '500' },
});
