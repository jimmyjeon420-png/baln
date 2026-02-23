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

const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  stock: { icon: 'trending-up-outline', color: '#2196F3', label: '주식' },
  crypto: { icon: 'logo-bitcoin', color: '#FF9800', label: '암호화폐' },
  macro: { icon: 'stats-chart-outline', color: '#9C27B0', label: '거시경제' },
};

// ============================================================================
// 고래 시그널 설정
// ============================================================================

function getWhaleConfig(signal: PredictionItem['whale_signal']): {
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
} | null {
  if (!signal) return null;
  if (signal.score >= 60 && signal.direction === 'YES') {
    return { label: '고래 매수 중', color: '#4CAF50', icon: 'fish-outline' };
  }
  if (signal.score >= 60 && signal.direction === 'NO') {
    return { label: '고래 매도 중', color: '#F44336', icon: 'fish-outline' };
  }
  return { label: '고래 활동 보통', color: '#9E9E9E', icon: 'fish-outline' };
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

  const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.macro;
  const timeUntilEnd = getTimeUntilEnd(item.end_date);
  const volumeText = formatVolume(item.volume_usd);
  const whaleConfig = getWhaleConfig(item.whale_signal);

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
            {catConfig.label}
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
});
