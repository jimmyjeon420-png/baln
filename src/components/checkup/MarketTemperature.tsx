/**
 * MarketTemperature - 시장 온도계
 *
 * 달리오: "외부 맥락" — AI macroSummary.marketSentiment 기반으로
 * 시장 분위기를 직관적인 온도계로 표시. 중급+고급 전용.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import type { ThemeColors } from '../../styles/colors';
import type { MorningBriefingResult } from '../../services/gemini';

interface MarketTemperatureProps {
  morningBriefing: MorningBriefingResult | null;
  isAILoading: boolean;
}

/**
 * 센티먼트별 색상을 테마 토큰에서 가져옴.
 * 활성 상태에서는 색상을 배경으로 사용하고 텍스트는 흰색으로 처리하여
 * 라이트 모드에서도 대비 확보.
 */
function getSentimentConfig(colors: ThemeColors, t: (key: string) => string) {
  return {
    BULLISH: { emoji: '🔥', label: t('market_temperature.sentiment_overheat'), color: colors.error, bg: `${colors.error}20` },
    NEUTRAL: { emoji: '😐', label: t('market_temperature.sentiment_normal'), color: colors.warning, bg: `${colors.warning}20` },
    BEARISH: { emoji: '🧊', label: t('market_temperature.sentiment_cold'), color: colors.info, bg: `${colors.info}20` },
  } as const;
}

function SkeletonLine({ width, backgroundColor }: { width: number; backgroundColor: string }) {
  return (
    <View style={[sk.line, { width, backgroundColor }]} />
  );
}

export default function MarketTemperature({ morningBriefing, isAILoading }: MarketTemperatureProps) {
  const { colors, shadows } = useTheme();
  const { t } = useLocale();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const SENTIMENT_CONFIG = useMemo(() => getSentimentConfig(colors, t), [colors, t]);

  // AI 로딩 중: 스켈레톤
  if (isAILoading) {
    return (
      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.cardTitle}>{t('market_temperature.title')}</Text>
        <View style={sk.container}>
          <SkeletonLine width={80} backgroundColor={colors.inverseSurface} />
          <SkeletonLine width={200} backgroundColor={colors.inverseSurface} />
          <SkeletonLine width={160} backgroundColor={colors.inverseSurface} />
        </View>
      </View>
    );
  }

  // 데이터 없음 (AI 분석 실패 또는 데이터 미생성)
  if (!morningBriefing) {
    return (
      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.cardTitle}>{t('market_temperature.title')}</Text>
        <Text style={styles.emptyText}>{t('market_temperature.empty_text')}</Text>
        <Text style={styles.emptySubText}>{t('market_temperature.empty_sub_text')}</Text>
      </View>
    );
  }

  const sentiment = morningBriefing.macroSummary.marketSentiment;
  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.NEUTRAL;
  const title = morningBriefing.macroSummary.title;
  const highlight = morningBriefing.macroSummary.highlights?.[0] ?? '';

  return (
    <View style={[styles.card, shadows.sm]}>
      <Text style={styles.cardTitle}>{t('market_temperature.title')}</Text>

      {/* 온도계 인디케이터 */}
      <View style={styles.gaugeRow}>
        {(['BEARISH', 'NEUTRAL', 'BULLISH'] as const).map((level) => {
          const cfg = SENTIMENT_CONFIG[level];
          const isActive = level === sentiment;
          return (
            <View
              key={level}
              style={[
                styles.gaugeItem,
                isActive && {
                  backgroundColor: cfg.color,
                  borderColor: cfg.color,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.gaugeEmoji, { fontSize: isActive ? 24 : 18 }]}>
                {cfg.emoji}
              </Text>
              <Text style={[
                styles.gaugeLabel,
                isActive && {
                  color: colors.textPrimary,
                  fontWeight: '700',
                },
              ]}>
                {cfg.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 요약 */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>{title}</Text>
        {highlight ? <Text style={styles.summaryHighlight}>{highlight}</Text> : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 4,
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
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gaugeEmoji: {
    marginBottom: 4,
  },
  gaugeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  summaryHighlight: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
});

const sk = StyleSheet.create({
  container: { gap: 10 },
  line: {
    height: 14,
    borderRadius: 7,
  },
});
