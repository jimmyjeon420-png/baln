/**
 * PredictionCard — 예측 시장 카드 컴포넌트
 *
 * 역할: Polymarket 예측 한 건을 보여주는 카드 부서
 * - 카테고리 배지 + 마감 타이머
 * - 질문 텍스트
 * - 확률 바 (YES/NO)
 * - 거래량 + 고래 시그널 정보
 * - 내 포트폴리오 영향 배지
 *
 * 비유: 주식 시장 예측 카드 — "연준이 금리 인하할까?" 를 시각화한 카드
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import {
  type PredictionItem,
  formatVolume,
  getTimeUntilEnd,
} from '../../hooks/usePredictionFeed';
import ProbabilityBar from './ProbabilityBar';
import PortfolioImpactBadge from './PortfolioImpactBadge';

// ============================================================================
// 카테고리 설정
// ============================================================================

const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; labelKey: string }> = {
  stock: { icon: 'trending-up-outline', color: '#2196F3', labelKey: 'predictionCard.category_stock' },
  crypto: { icon: 'logo-bitcoin', color: '#FF9800', labelKey: 'predictionCard.category_crypto' },
  macro: { icon: 'stats-chart-outline', color: '#9C27B0', labelKey: 'predictionCard.category_macro' },
};

// ============================================================================
// 고래 시그널 설정
// ============================================================================

function getWhaleConfig(signal: PredictionItem['whale_signal'], t: (key: string) => string): {
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
} | null {
  if (!signal) return null;
  if (signal.score >= 60 && signal.direction === 'YES') {
    return { label: t('predictionCard.whale_buying'), color: '#4CAF50', icon: 'fish-outline' };
  }
  if (signal.score >= 60 && signal.direction === 'NO') {
    return { label: t('predictionCard.whale_selling'), color: '#F44336', icon: 'fish-outline' };
  }
  return { label: t('predictionCard.whale_normal'), color: '#9E9E9E', icon: 'fish-outline' };
}

// ============================================================================
// Props
// ============================================================================

interface PredictionCardProps {
  item: PredictionItem;
  onPress?: (item: PredictionItem) => void;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function PredictionCard({ item, onPress }: PredictionCardProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.macro;
  const timeUntilEnd = getTimeUntilEnd(item.end_date);
  const volumeText = formatVolume(item.volume_usd);
  const whaleConfig = getWhaleConfig(item.whale_signal, t);

  const handlePress = () => {
    onPress?.(item);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* 헤더: 카테고리 + 마감 타이머 */}
      <View style={styles.headerRow}>
        <View style={[styles.categoryChip, { backgroundColor: catConfig.color + '20' }]}>
          <Ionicons name={catConfig.icon} size={12} color={catConfig.color} />
          <Text style={[styles.categoryLabel, { color: catConfig.color }]}>
            {t(catConfig.labelKey)}
          </Text>
        </View>
        {timeUntilEnd.length > 0 && (
          <View style={styles.timerGroup}>
            <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.timerText, { color: colors.textTertiary }]}>
              {timeUntilEnd}
            </Text>
          </View>
        )}
      </View>

      {/* 질문 */}
      <Text style={[styles.question, { color: colors.textPrimary }]}>
        {item.question_ko}
      </Text>

      {/* 확률 바 */}
      <ProbabilityBar
        probability={item.probability}
        change24h={item.probability_change_24h}
        yesLabel={item.yes_label || 'YES'}
        noLabel={item.no_label || 'NO'}
      />

      {/* 거래량 + 고래 시그널 */}
      <View style={styles.infoRow}>
        {/* 거래량 */}
        <View style={styles.infoItem}>
          <Ionicons name="bar-chart-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {volumeText}
          </Text>
        </View>

        {/* 고래 시그널 */}
        {whaleConfig && (
          <View style={styles.infoItem}>
            <Ionicons name={whaleConfig.icon} size={13} color={whaleConfig.color} />
            <Text style={[styles.infoText, { color: whaleConfig.color, fontWeight: '600' }]}>
              {whaleConfig.label}
            </Text>
          </View>
        )}
      </View>

      {/* AI 컨센서스 배지 */}
      {item.ai_consensus && (
        <View style={[styles.aiConsensusBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.aiConsensusHeader}>
            <Text style={[styles.aiLabel, { color: colors.textSecondary }]}>{'🤖 '}{t('predictionCard.ai_opinion')}</Text>
            <View style={[
              styles.directionBadge,
              { backgroundColor: item.ai_consensus.direction === 'YES' ? '#4CAF5020' : '#CF667920' },
            ]}>
              <Text style={[
                styles.directionText,
                { color: item.ai_consensus.direction === 'YES' ? '#4CAF50' : '#CF6679' },
              ]}>
                {item.ai_consensus.direction}
              </Text>
            </View>
            <Text style={[styles.confidenceText, { color: colors.textTertiary }]}>
              {t('predictionCard.confidence', { rate: String(item.ai_consensus.confidence) })}
            </Text>
          </View>
          <Text style={[styles.reasoningText, { color: colors.textSecondary }]}>
            {item.ai_consensus.reasoning_ko}
          </Text>
        </View>
      )}

      {/* 포트폴리오 영향 배지 */}
      <PortfolioImpactBadge
        relatedTickers={item.related_tickers}
        impactAnalysis={item.impact_analysis}
      />
    </TouchableOpacity>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  timerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timerText: {
    fontSize: 12,
  },
  question: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
  },
  aiConsensusBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  aiConsensusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceText: {
    fontSize: 12,
  },
  reasoningText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
