/**
 * AIOpinionCard.tsx - AI 종합 의견 카드
 *
 * 역할: "AI가 분석한 투자 의견을 시각적으로 전달"
 * - 요약 텍스트 박스
 * - 강세 vs 약세 시나리오 비교 레이아웃
 * - 목표가 + 투자기간 뱃지
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// 타입 정의
// ============================================================================

export interface AIOpinionCardProps {
  summary: string;
  bullCase: string[];
  bearCase: string[];
  targetPrice: string;
  timeHorizon: string;
}

// ============================================================================
// 컴포넌트
// ============================================================================

const AIOpinionCard: React.FC<AIOpinionCardProps> = ({
  summary,
  bullCase,
  bearCase,
  targetPrice,
  timeHorizon,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>AI 종합 의견</Text>
      </View>

      {/* 요약 */}
      <View style={[styles.summaryBox, { backgroundColor: colors.background }]}>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {summary}
        </Text>
      </View>

      {/* 강세 vs 약세 비교 */}
      <View style={styles.scenarioContainer}>
        {/* 강세 시나리오 */}
        <View style={[styles.scenarioBox, { backgroundColor: '#10B98115' }]}>
          <Text style={[styles.scenarioTitle, { color: '#10B981' }]}>강세 시나리오</Text>
          {bullCase.map((item, idx) => (
            <View key={idx} style={styles.scenarioRow}>
              <Text style={[styles.scenarioIcon, { color: '#10B981' }]}>{'▲'}</Text>
              <Text style={[styles.scenarioText, { color: colors.textPrimary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* 약세 시나리오 */}
        <View style={[styles.scenarioBox, { backgroundColor: '#EF444415' }]}>
          <Text style={[styles.scenarioTitle, { color: '#EF4444' }]}>약세 시나리오</Text>
          {bearCase.map((item, idx) => (
            <View key={idx} style={styles.scenarioRow}>
              <Text style={[styles.scenarioIcon, { color: '#EF4444' }]}>{'▼'}</Text>
              <Text style={[styles.scenarioText, { color: colors.textPrimary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 하단: 목표가 + 투자기간 */}
      <View style={styles.footer}>
        {/* 목표가 */}
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>목표 주가</Text>
          <Text style={[styles.targetPrice, { color: colors.textPrimary }]}>
            {targetPrice}
          </Text>
        </View>

        {/* 투자기간 뱃지 */}
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>투자 기간</Text>
          <View style={[styles.horizonBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={[styles.horizonText, { color: colors.primary }]}>
              {timeHorizon}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 23,
  },
  scenarioContainer: {
    gap: 12,
    marginBottom: 20,
  },
  scenarioBox: {
    borderRadius: 12,
    padding: 14,
  },
  scenarioTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  scenarioIcon: {
    fontSize: 13,
    lineHeight: 21,
  },
  scenarioText: {
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerItem: {
    gap: 6,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  targetPrice: {
    fontSize: 23,
    fontWeight: '800',
  },
  horizonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  horizonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AIOpinionCard;
