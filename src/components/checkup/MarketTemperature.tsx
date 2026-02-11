/**
 * MarketTemperature - 시장 온도계
 *
 * 달리오: "외부 맥락" — AI macroSummary.marketSentiment 기반으로
 * 시장 분위기를 직관적인 온도계로 표시. 중급+고급 전용.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { MorningBriefingResult } from '../../services/gemini';

interface MarketTemperatureProps {
  morningBriefing: MorningBriefingResult | null;
  isAILoading: boolean;
}

const SENTIMENT_CONFIG = {
  BULLISH: { emoji: '🔥', label: '과열', color: '#CF6679', bg: 'rgba(207,102,121,0.12)' },
  NEUTRAL: { emoji: '😐', label: '보통', color: '#FFB74D', bg: 'rgba(255,183,77,0.12)' },
  BEARISH: { emoji: '🧊', label: '냉각', color: '#64B5F6', bg: 'rgba(100,181,246,0.12)' },
} as const;

function SkeletonLine({ width, backgroundColor }: { width: number; backgroundColor: string }) {
  return (
    <View style={[sk.line, { width, backgroundColor }]} />
  );
}

export default function MarketTemperature({ morningBriefing, isAILoading }: MarketTemperatureProps) {
  const { colors, shadows } = useTheme();

  // AI 로딩 중: 스켈레톤
  if (isAILoading) {
    return (
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}>
        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>시장 온도계</Text>
        <View style={sk.container}>
          <SkeletonLine width={80} backgroundColor={colors.inverseSurface} />
          <SkeletonLine width={200} backgroundColor={colors.inverseSurface} />
          <SkeletonLine width={160} backgroundColor={colors.inverseSurface} />
        </View>
      </View>
    );
  }

  // 데이터 없음
  if (!morningBriefing) {
    return (
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}>
        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>시장 온도계</Text>
        <Text style={[s.emptyText, { color: colors.textSecondary }]}>시장 데이터 준비 중</Text>
      </View>
    );
  }

  const sentiment = morningBriefing.macroSummary.marketSentiment;
  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.NEUTRAL;
  const title = morningBriefing.macroSummary.title;
  const highlight = morningBriefing.macroSummary.highlights?.[0] ?? '';

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}>
      <Text style={[s.cardTitle, { color: colors.textPrimary }]}>시장 온도계</Text>

      {/* 온도계 인디케이터 */}
      <View style={s.gaugeRow}>
        {(['BEARISH', 'NEUTRAL', 'BULLISH'] as const).map((level) => {
          const cfg = SENTIMENT_CONFIG[level];
          const isActive = level === sentiment;
          return (
            <View
              key={level}
              style={[
                s.gaugeItem,
                { backgroundColor: colors.inverseSurface },
                isActive && { backgroundColor: cfg.bg, borderColor: cfg.color, borderWidth: 1 },
              ]}
            >
              <Text style={[s.gaugeEmoji, { fontSize: isActive ? 24 : 18 }]}>
                {cfg.emoji}
              </Text>
              <Text style={[s.gaugeLabel, { color: colors.inverseText }, isActive && { color: cfg.color, fontWeight: '700' }]}>
                {cfg.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 요약 */}
      <View style={[s.summaryBox, { backgroundColor: colors.inverseSurface }]}>
        <Text style={[s.summaryTitle, { color: colors.inverseText }]}>{title}</Text>
        {highlight ? <Text style={[s.summaryHighlight, { color: colors.textSecondary }]}>{highlight}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    // backgroundColor: 동적 (colors.surface)
    borderRadius: 16,
    borderWidth: 1,
    // borderColor: 동적 (colors.border)
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    // color: 동적 (colors.textPrimary)
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    // color: 동적 (colors.textSecondary)
  },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  gaugeItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    // backgroundColor: 동적 (colors.inverseSurface)
  },
  gaugeEmoji: {
    marginBottom: 4,
  },
  gaugeLabel: {
    fontSize: 12,
    // color: 동적 (colors.inverseText 또는 cfg.color)
    fontWeight: '500',
  },
  summaryBox: {
    // backgroundColor: 동적 (colors.inverseSurface)
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    // color: 동적 (colors.inverseText)
    lineHeight: 20,
  },
  summaryHighlight: {
    fontSize: 13,
    // color: 동적 (colors.textSecondary)
    lineHeight: 20,
  },
});

const sk = StyleSheet.create({
  container: { gap: 10 },
  line: {
    height: 14,
    // backgroundColor: 동적 (colors.inverseSurface)
    borderRadius: 7,
  },
});
