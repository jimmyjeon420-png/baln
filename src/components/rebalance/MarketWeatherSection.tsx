/**
 * 시장 날씨 섹션 — 센티먼트 + 매크로 요약 + 부동산 인사이트 + CFO 상세
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonBlock } from '../SkeletonLoader';
import type { MorningBriefingData } from '../../types/rebalanceTypes';

interface MarketWeatherSectionProps {
  morningBriefing: MorningBriefingData | null;
  isAILoading: boolean;
}

export default function MarketWeatherSection({
  morningBriefing,
  isAILoading,
}: MarketWeatherSectionProps) {
  const [showDetail, setShowDetail] = useState(false);

  // AI 로딩 중 스켈레톤
  if (isAILoading && !morningBriefing) {
    return (
      <View style={s.card}>
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
  const sentimentColor = sentiment === 'BULLISH' ? '#4CAF50' : sentiment === 'BEARISH' ? '#CF6679' : '#FFC107';
  const sentimentLabel = sentiment === 'BULLISH' ? '낙관' : sentiment === 'BEARISH' ? '비관' : '중립';

  return (
    <View style={s.card}>
      <View style={s.marketHeader}>
        <View>
          <Text style={s.cardLabel}>시장 날씨</Text>
          <Text style={s.cardLabelEn}>Market Sentiment</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[s.sentimentChip, { backgroundColor: sentimentColor + '20' }]}>
            <View style={[s.sentimentDot, { backgroundColor: sentimentColor }]} />
            <Text style={[s.sentimentText, { color: sentimentColor }]}>{sentimentLabel}</Text>
          </View>
          <TouchableOpacity
            style={s.expandButton}
            onPress={() => setShowDetail(!showDetail)}
          >
            <Text style={s.expandButtonText}>{showDetail ? '접기' : '상세'}</Text>
            <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 매크로 요약 제목 */}
      {morningBriefing.macroSummary.title && (
        <Text style={s.marketTitle}>{morningBriefing.macroSummary.title}</Text>
      )}

      {/* 매크로 하이라이트 */}
      <View style={s.highlights}>
        {(showDetail
          ? morningBriefing.macroSummary.highlights
          : morningBriefing.macroSummary.highlights.slice(0, 3)
        ).map((h, i) => (
          <View key={i} style={s.highlightRow}>
            <Text style={s.highlightDot}>•</Text>
            <Text style={s.highlightText} numberOfLines={showDetail ? undefined : 2}>{h}</Text>
          </View>
        ))}
      </View>

      {/* 금리 전망 */}
      {morningBriefing.macroSummary.interestRateProbability && (
        <View style={s.rateBadge}>
          <Ionicons name="trending-up" size={12} color="#FFC107" />
          <Text style={s.rateText} numberOfLines={showDetail ? undefined : 1}>
            {morningBriefing.macroSummary.interestRateProbability}
          </Text>
        </View>
      )}

      {/* 상세 펼침 */}
      {showDetail && (
        <View style={s.detailContainer}>
          {/* 부동산 인사이트 */}
          {morningBriefing.realEstateInsight && (
            <View style={s.realEstateSection}>
              <View style={s.realEstateHeader}>
                <Ionicons name="home" size={14} color="#64B5F6" />
                <Text style={s.realEstateTitle}>{morningBriefing.realEstateInsight.title}</Text>
              </View>
              <Text style={s.realEstateAnalysis}>{morningBriefing.realEstateInsight.analysis}</Text>
              <View style={s.realEstateRecBadge}>
                <Ionicons name="bulb" size={12} color="#4CAF50" />
                <Text style={s.realEstateRecText}>{morningBriefing.realEstateInsight.recommendation}</Text>
              </View>
            </View>
          )}

          {/* CFO 날씨 상세 */}
          <View style={s.cfoDetailSection}>
            <View style={s.cfoDetailHeader}>
              <Text style={s.cfoDetailEmoji}>{morningBriefing.cfoWeather.emoji}</Text>
              <Text style={s.cfoDetailStatus}>{morningBriefing.cfoWeather.status}</Text>
            </View>
            <Text style={s.cfoDetailMessage}>{morningBriefing.cfoWeather.message}</Text>
          </View>

          {/* 생성 시간 */}
          <Text style={s.detailTime}>
            분석 시간: {new Date(morningBriefing.generatedAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}

      {/* 접힌 상태에서 "더보기" 힌트 */}
      {!showDetail && morningBriefing.macroSummary.highlights.length > 3 && (
        <TouchableOpacity
          style={s.showMoreHint}
          onPress={() => setShowDetail(true)}
        >
          <Text style={s.showMoreHintText}>
            +{morningBriefing.macroSummary.highlights.length - 3}개 항목 더보기
          </Text>
          <Ionicons name="chevron-down" size={12} color="#4CAF50" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cardLabelEn: { fontSize: 10, color: '#555', marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' },
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
  expandButtonText: { fontSize: 12, color: '#888' },
  marketTitle: { fontSize: 14, fontWeight: '700', color: '#DDD', marginBottom: 10 },
  highlights: { gap: 6, marginBottom: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  highlightDot: { color: '#4CAF50', fontSize: 13, lineHeight: 20 },
  highlightText: { flex: 1, fontSize: 13, color: '#BBB', lineHeight: 20 },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,193,7,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  rateText: { fontSize: 12, color: '#FFC107', fontWeight: '500', flex: 1 },
  detailContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#222', gap: 14 },
  realEstateSection: {
    backgroundColor: 'rgba(100,181,246,0.06)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.1)',
  },
  realEstateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  realEstateTitle: { fontSize: 13, fontWeight: '700', color: '#64B5F6' },
  realEstateAnalysis: { fontSize: 13, color: '#BBB', lineHeight: 20, marginBottom: 10 },
  realEstateRecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  realEstateRecText: { flex: 1, fontSize: 12, color: '#4CAF50', fontWeight: '500', lineHeight: 18 },
  cfoDetailSection: {
    backgroundColor: 'rgba(76,175,80,0.06)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.08)',
  },
  cfoDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cfoDetailEmoji: { fontSize: 20 },
  cfoDetailStatus: { fontSize: 14, fontWeight: '700', color: '#4CAF50' },
  cfoDetailMessage: { fontSize: 13, color: '#CCC', lineHeight: 20 },
  detailTime: { fontSize: 11, color: '#555', textAlign: 'right' },
  showMoreHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 4 },
  showMoreHintText: { fontSize: 12, color: '#4CAF50', fontWeight: '500' },
});
