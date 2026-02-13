/**
 * TaxReportCard - 세금 최적화 리포트 결과 카드
 * 세금 요약 + 절세 전략 + 매도 타이밍 + 연간 플랜
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TaxReportResult } from '../types/marketplace';

interface Props {
  result: TaxReportResult;
}

export default function TaxReportCard({ result }: Props) {
  // null 안전: AI 응답이 부분적일 수 있으므로 기본값 적용
  const taxSummary = result.taxSummary ?? { estimatedCapitalGainsTax: 0, estimatedIncomeTax: 0, totalTaxBurden: 0, effectiveTaxRate: 0 };

  return (
    <View style={styles.container}>
      {/* 세금 요약 */}
      <View style={styles.summaryCard}>
        <Ionicons name="receipt" size={28} color="#FFA726" />
        <Text style={styles.cardTitle}>세금 요약</Text>
        <Text style={styles.residency}>
          {result.residency === 'KR' ? '한국 거주자' : '미국 거주자'}
        </Text>

        <View style={styles.taxGrid}>
          <View style={styles.taxItem}>
            <Text style={styles.taxLabel}>양도소득세</Text>
            <Text style={styles.taxValue}>
              ₩{Math.floor(taxSummary.estimatedCapitalGainsTax).toLocaleString()}
            </Text>
          </View>
          <View style={styles.taxItem}>
            <Text style={styles.taxLabel}>소득세</Text>
            <Text style={styles.taxValue}>
              ₩{Math.floor(taxSummary.estimatedIncomeTax).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>총 세금 부담</Text>
          <Text style={styles.totalValue}>
            ₩{Math.floor(taxSummary.totalTaxBurden).toLocaleString()}
          </Text>
        </View>
        <View style={styles.effectiveRateRow}>
          <Text style={styles.effectiveLabel}>실효 세율</Text>
          <Text style={styles.effectiveValue}>
            {taxSummary.effectiveTaxRate.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* 절세 전략 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>절세 전략</Text>
        {(result.strategies ?? []).map((strategy, i) => {
          const priorityColor = {
            HIGH: '#CF6679',
            MEDIUM: '#FFA726',
            LOW: '#4CAF50',
          }[strategy.priority];

          return (
            <View key={i} style={styles.strategyItem}>
              <View style={styles.strategyHeader}>
                <Text style={styles.strategyTitle}>{strategy.title}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
                  <Text style={[styles.priorityText, { color: priorityColor }]}>
                    {strategy.priority === 'HIGH' ? '긴급' : strategy.priority === 'MEDIUM' ? '권장' : '참고'}
                  </Text>
                </View>
              </View>
              <Text style={styles.strategyDesc}>{strategy.description}</Text>
              <View style={styles.savingRow}>
                <Ionicons name="cash" size={14} color="#4CAF50" />
                <Text style={styles.savingText}>
                  예상 절세: ₩{Math.floor(strategy.potentialSaving).toLocaleString()}
                </Text>
              </View>
              {(strategy.actionItems ?? []).map((action, j) => (
                <Text key={j} style={styles.actionItem}>
                  <Text style={{ color: '#4CAF50' }}>+</Text> {action}
                </Text>
              ))}
            </View>
          );
        })}
      </View>

      {/* 매도 타이밍 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>종목별 매도 타이밍</Text>
        {(result.sellTimeline ?? []).map((item, i) => {
          const actionColor = {
            SELL_NOW: '#CF6679',
            HOLD_FOR_TAX: '#FFA726',
            TAX_LOSS_HARVEST: '#4CAF50',
          }[item.suggestedAction];

          const actionLabel = {
            SELL_NOW: '즉시 매도',
            HOLD_FOR_TAX: '세금 목적 보유',
            TAX_LOSS_HARVEST: '손실 확정 매도',
          }[item.suggestedAction];

          return (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <Text style={styles.timelineTicker}>{item.ticker}</Text>
                <Text style={styles.timelineName}>{item.name}</Text>
              </View>
              <View style={styles.timelineRight}>
                <View style={[styles.actionBadge, { backgroundColor: actionColor + '20' }]}>
                  <Text style={[styles.actionLabel, { color: actionColor }]}>{actionLabel}</Text>
                </View>
                <Text style={styles.timing}>{item.optimalTiming}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* 연간 플랜 */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>연간 세금 플랜</Text>
        {(result.annualPlan ?? []).map((quarter, i) => (
          <View key={i} style={styles.quarterItem}>
            <View style={styles.quarterBadge}>
              <Text style={styles.quarterText}>{quarter.quarter}</Text>
            </View>
            {(quarter.actions ?? []).map((action, j) => (
              <Text key={j} style={styles.quarterAction}>- {action}</Text>
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        본 리포트는 AI 분석 기반 참고 자료이며, 세무 전문가와 상담을 권장합니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  summaryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 8 },
  residency: { color: '#888', fontSize: 13, marginTop: 4 },
  taxGrid: { flexDirection: 'row', gap: 16, marginTop: 16, width: '100%' },
  taxItem: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#252525', borderRadius: 10 },
  taxLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  taxValue: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  totalLabel: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  totalValue: { color: '#CF6679', fontSize: 18, fontWeight: '800' },
  effectiveRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  effectiveLabel: { color: '#888', fontSize: 13 },
  effectiveValue: { color: '#FFA726', fontSize: 14, fontWeight: '700' },
  sectionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  strategyItem: {
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strategyTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  strategyDesc: { color: '#AAA', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  savingText: { color: '#4CAF50', fontSize: 13, fontWeight: '700' },
  actionItem: { color: '#CCC', fontSize: 12, lineHeight: 18 },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  timelineLeft: {},
  timelineTicker: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  timelineName: { color: '#666', fontSize: 11 },
  timelineRight: { alignItems: 'flex-end' },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionLabel: { fontSize: 11, fontWeight: '700' },
  timing: { color: '#888', fontSize: 11, marginTop: 2 },
  quarterItem: { marginBottom: 12 },
  quarterBadge: {
    backgroundColor: '#7C4DFF20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  quarterText: { color: '#7C4DFF', fontSize: 12, fontWeight: '700' },
  quarterAction: { color: '#CCC', fontSize: 13, lineHeight: 20 },
  disclaimer: { color: '#555', fontSize: 10, textAlign: 'center', marginTop: 4 },
});
