/**
 * Journal Tab - 과거 일일 요약 및 거래 기록
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  SectionList,
  SafeAreaView,
} from 'react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../src/styles/theme';
import i18n from '../../src/i18n';

interface DailySummary {
  id: string;
  date: string;
  sentimentScore: number; // -100 ~ 100
  portfolioValue: number;
  dayChange: number;
  recommendation: string;
  transactions: number;
}

// 목 데이터 (나중에 Supabase에서 가져올 예정)
const MOCK_DAILY_SUMMARIES: DailySummary[] = [
  {
    id: '1',
    date: '2025-01-31',
    sentimentScore: 45,
    portfolioValue: 1250000,
    dayChange: 2.5,
    recommendation: '긍정적 신호. 핵심 포지션 유지.',
    transactions: 2,
  },
  {
    id: '2',
    date: '2025-01-30',
    sentimentScore: 10,
    portfolioValue: 1220000,
    dayChange: -0.8,
    recommendation: '중립. 변동성 높음. 추가 진입 자제.',
    transactions: 0,
  },
  {
    id: '3',
    date: '2025-01-29',
    sentimentScore: -30,
    portfolioValue: 1230000,
    dayChange: 1.2,
    recommendation: '약세 신호. 수익 실현 검토.',
    transactions: 1,
  },
];

// 감정 점수에 따른 색상
const getSentimentColor = (score: number): string => {
  if (score > 30) return COLORS.buy;
  if (score < -30) return COLORS.sell;
  return COLORS.neutral;
};

// 요약 카드 컴포넌트
const SummaryCard: React.FC<{ summary: DailySummary }> = ({ summary }) => (
  <TouchableOpacity
    style={[styles.card, { borderLeftColor: getSentimentColor(summary.sentimentScore) }]}
  >
    <View style={styles.cardHeader}>
      <Text style={styles.dateText}>{summary.date}</Text>
      <View
        style={[
          styles.sentimentBadge,
          { backgroundColor: getSentimentColor(summary.sentimentScore) },
        ]}
      >
        <Text style={styles.sentimentText}>{summary.sentimentScore > 0 ? '+' : ''}{summary.sentimentScore}</Text>
      </View>
    </View>

    <View style={styles.cardBody}>
      <View style={styles.statRow}>
        <Text style={styles.label}>포트폴리오 가치</Text>
        <Text style={styles.value}>₩{summary.portfolioValue.toLocaleString()}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.label}>일일 변화</Text>
        <Text
          style={[
            styles.value,
            { color: summary.dayChange > 0 ? COLORS.buy : COLORS.sell },
          ]}
        >
          {summary.dayChange > 0 ? '+' : ''}{summary.dayChange}%
        </Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.label}>거래</Text>
        <Text style={styles.value}>{summary.transactions}건</Text>
      </View>
    </View>

    <View style={styles.recommendationBox}>
      <Text style={styles.recommendationLabel}>📊 진단</Text>
      <Text style={styles.recommendationText}>{summary.recommendation}</Text>
    </View>
  </TouchableOpacity>
);

export default function JournalScreen() {
  const [summaries] = useState<DailySummary[]>(MOCK_DAILY_SUMMARIES);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>포트폴리오 기록</Text>
        <Text style={styles.headerSubtitle}>과거 일일 요약 및 거래 기록</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.summaryList}>
          {summaries.map((summary) => (
            <SummaryCard key={summary.id} summary={summary} />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 모든 데이터는 암호화되어 저장됩니다
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.headingLarge,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  summaryList: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    gap: SIZES.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rLg,
    padding: SIZES.lg,
    borderLeftWidth: 4,
    gap: SIZES.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.textPrimary,
  },
  sentimentBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.rFull,
  },
  sentimentText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  cardBody: {
    gap: SIZES.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
  },
  value: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  recommendationBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SIZES.rMd,
    padding: SIZES.md,
    marginTop: SIZES.sm,
  },
  recommendationLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  recommendationText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
    alignItems: 'center',
  },
  footerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
