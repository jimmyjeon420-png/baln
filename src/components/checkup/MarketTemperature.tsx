/**
 * MarketTemperature - 시장 온도계
 *
 * 달리오: "외부 맥락" — AI macroSummary.marketSentiment 기반으로
 * 시장 분위기를 직관적인 온도계로 표시. 중급+고급 전용.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

function SkeletonLine({ width }: { width: number }) {
  return (
    <View style={[sk.line, { width }]} />
  );
}

export default function MarketTemperature({ morningBriefing, isAILoading }: MarketTemperatureProps) {
  // AI 로딩 중: 스켈레톤
  if (isAILoading) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>시장 온도계</Text>
        <View style={sk.container}>
          <SkeletonLine width={80} />
          <SkeletonLine width={200} />
          <SkeletonLine width={160} />
        </View>
      </View>
    );
  }

  // 데이터 없음
  if (!morningBriefing) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>시장 온도계</Text>
        <Text style={s.emptyText}>시장 데이터 준비 중</Text>
      </View>
    );
  }

  const sentiment = morningBriefing.macroSummary.marketSentiment;
  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.NEUTRAL;
  const title = morningBriefing.macroSummary.title;
  const highlight = morningBriefing.macroSummary.highlights?.[0] ?? '';

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>시장 온도계</Text>

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
                isActive && { backgroundColor: cfg.bg, borderColor: cfg.color, borderWidth: 1 },
              ]}
            >
              <Text style={[s.gaugeEmoji, { fontSize: isActive ? 24 : 18 }]}>
                {cfg.emoji}
              </Text>
              <Text style={[s.gaugeLabel, isActive && { color: cfg.color, fontWeight: '700' }]}>
                {cfg.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 요약 */}
      <View style={s.summaryBox}>
        <Text style={s.summaryTitle}>{title}</Text>
        {highlight ? <Text style={s.summaryHighlight}>{highlight}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#808080',
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
    backgroundColor: '#1A1A1A',
  },
  gaugeEmoji: {
    marginBottom: 4,
  },
  gaugeLabel: {
    fontSize: 12,
    color: '#808080',
    fontWeight: '500',
  },
  summaryBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  summaryHighlight: {
    fontSize: 13,
    color: '#B0B0B0',
    lineHeight: 20,
  },
});

const sk = StyleSheet.create({
  container: { gap: 10 },
  line: {
    height: 14,
    backgroundColor: '#2A2A2A',
    borderRadius: 7,
  },
});
