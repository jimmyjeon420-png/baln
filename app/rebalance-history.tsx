/**
 * 처방전 히스토리 화면 — 과거 AI 제안 vs 실제 실행 vs 결과
 *
 * 진입: rebalance.tsx → "처방 히스토리" 버튼
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRebalanceHistory, useOverallStats } from '../src/hooks/useRebalanceHistory';
import { SkeletonBlock } from '../src/components/SkeletonLoader';
import { useTheme } from '../src/hooks/useTheme';

export default function RebalanceHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<30 | 90>(30);

  const { data: history, isLoading } = useRebalanceHistory(period);
  const overallStats = useOverallStats(period);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>처방전 히스토리</Text>
            <Text style={[s.headerSubtitle, { color: colors.textTertiary }]}>AI 제안 vs 실제 실행 vs 결과</Text>
          </View>
        </View>

        {/* 기간 선택 */}
        <View style={s.periodSelector}>
          <TouchableOpacity
            style={[s.periodButton, { backgroundColor: colors.surface, borderColor: colors.border }, period === 30 && s.periodButtonActive]}
            onPress={() => setPeriod(30)}
          >
            <Text style={[s.periodButtonText, { color: colors.textSecondary }, period === 30 && s.periodButtonTextActive]}>30일</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.periodButton, { backgroundColor: colors.surface, borderColor: colors.border }, period === 90 && s.periodButtonActive]}
            onPress={() => setPeriod(90)}
          >
            <Text style={[s.periodButtonText, { color: colors.textSecondary }, period === 90 && s.periodButtonTextActive]}>90일</Text>
          </TouchableOpacity>
        </View>

        {/* 전체 통계 */}
        <View style={[s.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statsTitle, { color: colors.textPrimary }]}>전체 요약</Text>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.textPrimary }]}>{overallStats.totalDays}일</Text>
              <Text style={[s.statLabel, { color: colors.textTertiary }]}>처방전 받음</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.textPrimary }]}>{overallStats.totalActions}건</Text>
              <Text style={[s.statLabel, { color: colors.textTertiary }]}>AI 제안</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.primary }]}>{overallStats.totalExecutions}건</Text>
              <Text style={[s.statLabel, { color: colors.textTertiary }]}>실제 실행</Text>
            </View>
          </View>
          <View style={s.executionRateRow}>
            <Text style={[s.executionRateLabel, { color: colors.textSecondary }]}>실행률</Text>
            <View style={[s.executionRateBar, { backgroundColor: colors.surfaceLight }]}>
              <View style={[s.executionRateFill, { width: `${Math.min(overallStats.overallExecutionRate, 100)}%` }]} />
            </View>
            <Text style={s.executionRateValue}>{overallStats.overallExecutionRate.toFixed(0)}%</Text>
          </View>
          {overallStats.totalExecutions > 0 && (
            <View style={[s.resultRow, { borderTopColor: colors.border }]}>
              <View style={s.resultItem}>
                <Ionicons name="trending-up" size={16} color={colors.buy} />
                <Text style={[s.resultText, { color: colors.buy }]}>{overallStats.profitableCount}건 수익</Text>
              </View>
              <View style={s.resultItem}>
                <Ionicons name="trending-down" size={16} color={colors.sell} />
                <Text style={[s.resultText, { color: colors.sell }]}>{overallStats.lossMakingCount}건 손실</Text>
              </View>
            </View>
          )}
        </View>

        {/* 로딩 */}
        {isLoading && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SkeletonBlock width="80%" height={16} />
            <View style={{ marginTop: 12, gap: 8 }}>
              {[1, 2, 3].map(i => (
                <SkeletonBlock key={i} width="100%" height={60} />
              ))}
            </View>
          </View>
        )}

        {/* 히스토리 리스트 */}
        {!isLoading && history && history.length === 0 && (
          <View style={s.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.textQuaternary} />
            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>처방전 기록이 없습니다</Text>
            <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>AI 제안을 받으면 여기에 기록됩니다</Text>
          </View>
        )}

        {!isLoading && history && history.map(item => (
          <View key={item.date} style={[s.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* 날짜 헤더 */}
            <View style={s.historyHeader}>
              <Text style={[s.historyDate, { color: colors.textPrimary }]}>
                {new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
              </Text>
              {item.stats.executedActions > 0 && (
                <View style={s.executedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                  <Text style={s.executedBadgeText}>{item.stats.executedActions}건 실행</Text>
                </View>
              )}
            </View>

            {/* AI 제안 요약 */}
            {item.prescription.morningBriefing && (
              <View style={s.prescriptionSummary}>
                <Text style={[s.prescriptionLabel, { color: colors.textSecondary }]}>AI 제안</Text>
                <Text style={[s.prescriptionValue, { color: colors.textSecondary }]}>
                  {item.stats.totalActions}건 (BUY/SELL/WATCH)
                </Text>
                {item.stats.totalActions > 0 && (
                  <Text style={s.prescriptionRate}>
                    실행률 {item.stats.executionRate.toFixed(0)}%
                  </Text>
                )}
              </View>
            )}

            {/* 실행 기록 */}
            {item.executions.length > 0 && (
              <View style={s.executionsList}>
                {item.executions.map((exec, idx) => {
                  const isProfit = exec.result_gain_pct && exec.result_gain_pct > 0;
                  const hasResult = exec.result_gain_pct != null;
                  return (
                    <View key={idx} style={[s.executionItem, { backgroundColor: colors.surfaceLight }]}>
                      <View style={[s.actionBadge, {
                        backgroundColor: exec.action_type === 'BUY' ? 'rgba(76,175,80,0.15)' : 'rgba(207,102,121,0.15)',
                      }]}>
                        <Text style={[s.actionBadgeText, {
                          color: exec.action_type === 'BUY' ? colors.buy : colors.sell,
                        }]}>
                          {exec.action_type === 'BUY' ? '매수' : '매도'}
                        </Text>
                      </View>
                      <View style={s.executionInfo}>
                        <Text style={[s.executionTicker, { color: colors.textPrimary }]}>{exec.action_ticker}</Text>
                        <Text style={[s.executionDetail, { color: colors.textSecondary }]}>
                          {exec.executed_qty}주 @ ₩{Math.floor(exec.executed_price).toLocaleString()}
                        </Text>
                      </View>
                      {hasResult && (
                        <View style={[s.resultBadge, { backgroundColor: isProfit ? 'rgba(76,175,80,0.1)' : 'rgba(207,102,121,0.1)' }]}>
                          <Text style={[s.resultBadgeText, { color: isProfit ? colors.buy : colors.sell }]}>
                            {isProfit ? '+' : ''}{exec.result_gain_pct?.toFixed(1)}%
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* 제안 있지만 실행 없음 */}
            {item.stats.totalActions > 0 && item.stats.executedActions === 0 && (
              <View style={s.noExecutionBanner}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.textTertiary} />
                <Text style={[s.noExecutionText, { color: colors.textTertiary }]}>이날 제안은 실행하지 않았습니다</Text>
              </View>
            )}
          </View>
        ))}

        {/* 안내 */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} />
          <Text style={[s.infoText, { color: colors.info }]}>
            "실행 완료 기록"을 통해 직접 입력한 매매만 여기에 표시됩니다. AI 제안 성과를 추적하려면 실행 후 꼭 기록해주세요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  // 기간 선택
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  periodButtonActive: { backgroundColor: 'rgba(76,175,80,0.1)', borderColor: '#4CAF50' },
  periodButtonText: { fontSize: 14, fontWeight: '600' },
  periodButtonTextActive: { color: '#4CAF50' },

  // 전체 통계
  statsCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  statsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11 },
  executionRateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  executionRateLabel: { fontSize: 12, width: 50 },
  executionRateBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  executionRateFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  executionRateValue: { fontSize: 13, fontWeight: '700', color: '#4CAF50', width: 40, textAlign: 'right' },
  resultRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 12, borderTopWidth: 1 },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultText: { fontSize: 12, fontWeight: '600' },

  // 히스토리 카드
  card: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
  },
  historyCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyDate: { fontSize: 15, fontWeight: '700' },
  executedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(76,175,80,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  executedBadgeText: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  prescriptionSummary: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prescriptionLabel: { fontSize: 12 },
  prescriptionValue: { fontSize: 12, fontWeight: '600', flex: 1 },
  prescriptionRate: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  executionsList: { gap: 8 },
  executionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionBadgeText: { fontSize: 11, fontWeight: '800' },
  executionInfo: { flex: 1 },
  executionTicker: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  executionDetail: { fontSize: 11 },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  resultBadgeText: { fontSize: 12, fontWeight: '700' },
  noExecutionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  noExecutionText: { fontSize: 11 },

  // 빈 상태
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center' },

  // 안내
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(100,181,246,0.06)',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.1)',
  },
  infoText: { flex: 1, fontSize: 11, color: '#64B5F6', lineHeight: 16 },
});
