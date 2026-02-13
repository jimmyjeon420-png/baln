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
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>처방전 히스토리</Text>
            <Text style={s.headerSubtitle}>AI 제안 vs 실제 실행 vs 결과</Text>
          </View>
        </View>

        {/* 기간 선택 */}
        <View style={s.periodSelector}>
          <TouchableOpacity
            style={[s.periodButton, period === 30 && s.periodButtonActive]}
            onPress={() => setPeriod(30)}
          >
            <Text style={[s.periodButtonText, period === 30 && s.periodButtonTextActive]}>30일</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.periodButton, period === 90 && s.periodButtonActive]}
            onPress={() => setPeriod(90)}
          >
            <Text style={[s.periodButtonText, period === 90 && s.periodButtonTextActive]}>90일</Text>
          </TouchableOpacity>
        </View>

        {/* 전체 통계 */}
        <View style={s.statsCard}>
          <Text style={s.statsTitle}>전체 요약</Text>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{overallStats.totalDays}일</Text>
              <Text style={s.statLabel}>처방전 받음</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{overallStats.totalActions}건</Text>
              <Text style={s.statLabel}>AI 제안</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: '#4CAF50' }]}>{overallStats.totalExecutions}건</Text>
              <Text style={s.statLabel}>실제 실행</Text>
            </View>
          </View>
          <View style={s.executionRateRow}>
            <Text style={s.executionRateLabel}>실행률</Text>
            <View style={s.executionRateBar}>
              <View style={[s.executionRateFill, { width: `${Math.min(overallStats.overallExecutionRate, 100)}%` }]} />
            </View>
            <Text style={s.executionRateValue}>{overallStats.overallExecutionRate.toFixed(0)}%</Text>
          </View>
          {overallStats.totalExecutions > 0 && (
            <View style={s.resultRow}>
              <View style={s.resultItem}>
                <Ionicons name="trending-up" size={16} color="#4CAF50" />
                <Text style={[s.resultText, { color: '#4CAF50' }]}>{overallStats.profitableCount}건 수익</Text>
              </View>
              <View style={s.resultItem}>
                <Ionicons name="trending-down" size={16} color="#CF6679" />
                <Text style={[s.resultText, { color: '#CF6679' }]}>{overallStats.lossMakingCount}건 손실</Text>
              </View>
            </View>
          )}
        </View>

        {/* 로딩 */}
        {isLoading && (
          <View style={s.card}>
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
            <Ionicons name="calendar-outline" size={48} color="#444" />
            <Text style={s.emptyTitle}>처방전 기록이 없습니다</Text>
            <Text style={s.emptyDesc}>AI 제안을 받으면 여기에 기록됩니다</Text>
          </View>
        )}

        {!isLoading && history && history.map(item => (
          <View key={item.date} style={s.historyCard}>
            {/* 날짜 헤더 */}
            <View style={s.historyHeader}>
              <Text style={s.historyDate}>
                {new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
              </Text>
              {item.stats.executedActions > 0 && (
                <View style={s.executedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  <Text style={s.executedBadgeText}>{item.stats.executedActions}건 실행</Text>
                </View>
              )}
            </View>

            {/* AI 제안 요약 */}
            {item.prescription.morningBriefing && (
              <View style={s.prescriptionSummary}>
                <Text style={s.prescriptionLabel}>AI 제안</Text>
                <Text style={s.prescriptionValue}>
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
                    <View key={idx} style={s.executionItem}>
                      <View style={[s.actionBadge, {
                        backgroundColor: exec.action_type === 'BUY' ? 'rgba(76,175,80,0.15)' : 'rgba(207,102,121,0.15)',
                      }]}>
                        <Text style={[s.actionBadgeText, {
                          color: exec.action_type === 'BUY' ? '#4CAF50' : '#CF6679',
                        }]}>
                          {exec.action_type === 'BUY' ? '매수' : '매도'}
                        </Text>
                      </View>
                      <View style={s.executionInfo}>
                        <Text style={s.executionTicker}>{exec.action_ticker}</Text>
                        <Text style={s.executionDetail}>
                          {exec.executed_qty}주 @ ₩{Math.floor(exec.executed_price).toLocaleString()}
                        </Text>
                      </View>
                      {hasResult && (
                        <View style={[s.resultBadge, { backgroundColor: isProfit ? 'rgba(76,175,80,0.1)' : 'rgba(207,102,121,0.1)' }]}>
                          <Text style={[s.resultBadgeText, { color: isProfit ? '#4CAF50' : '#CF6679' }]}>
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
                <Ionicons name="alert-circle-outline" size={14} color="#666" />
                <Text style={s.noExecutionText}>이날 제안은 실행하지 않았습니다</Text>
              </View>
            )}
          </View>
        ))}

        {/* 안내 */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#64B5F6" />
          <Text style={s.infoText}>
            "실행 완료 기록"을 통해 직접 입력한 매매만 여기에 표시됩니다. AI 제안 성과를 추적하려면 실행 후 꼭 기록해주세요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },

  // 기간 선택
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#141414',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  periodButtonActive: { backgroundColor: 'rgba(76,175,80,0.1)', borderColor: '#4CAF50' },
  periodButtonText: { fontSize: 14, color: '#888', fontWeight: '600' },
  periodButtonTextActive: { color: '#4CAF50' },

  // 전체 통계
  statsCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  statsTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#2A2A2A' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#666' },
  executionRateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  executionRateLabel: { fontSize: 12, color: '#888', width: 50 },
  executionRateBar: { flex: 1, height: 8, backgroundColor: '#1A1A1A', borderRadius: 4, overflow: 'hidden' },
  executionRateFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  executionRateValue: { fontSize: 13, fontWeight: '700', color: '#4CAF50', width: 40, textAlign: 'right' },
  resultRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1E1E1E' },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultText: { fontSize: 12, fontWeight: '600' },

  // 히스토리 카드
  card: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  historyCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyDate: { fontSize: 15, fontWeight: '700', color: '#FFF' },
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
  prescriptionLabel: { fontSize: 12, color: '#888' },
  prescriptionValue: { fontSize: 12, color: '#CCC', fontWeight: '600', flex: 1 },
  prescriptionRate: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  executionsList: { gap: 8 },
  executionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionBadgeText: { fontSize: 11, fontWeight: '800' },
  executionInfo: { flex: 1 },
  executionTicker: { fontSize: 13, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  executionDetail: { fontSize: 11, color: '#888' },
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
  noExecutionText: { fontSize: 11, color: '#666' },

  // 빈 상태
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#888', marginTop: 16, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#555', textAlign: 'center' },

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
