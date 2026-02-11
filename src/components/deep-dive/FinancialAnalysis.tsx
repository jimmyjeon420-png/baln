/**
 * FinancialAnalysis.tsx - 투자심사보고서: 재무 분석 섹션
 *
 * 역할: "재무 분석 부서"
 * - 최근 3년 실적 테이블 (매출, 영업이익, 순이익)
 * - 핵심 지표 (ROE, ROIC, 부채비율)
 * - 현금흐름 설명
 * - 증감률 표시 (초록/빨강)
 *
 * 사용 예:
 * <FinancialAnalysis
 *   yearlyData={[
 *     { year: '2022', revenue: 100000000000000, operatingIncome: 20000000000000, netIncome: 15000000000000 },
 *     { year: '2023', revenue: 120000000000000, operatingIncome: 25000000000000, netIncome: 18000000000000 },
 *     { year: '2024', revenue: 150000000000000, operatingIncome: 30000000000000, netIncome: 22000000000000 },
 *   ]}
 *   keyMetrics={{ roe: 22.5, roic: 18.3, debtRatio: 35.2 }}
 *   cashFlowSummary="영업활동현금흐름 안정적, 자본지출 증가 중"
 * />
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatKRW } from '../../utils/formatters';

interface YearlyFinancialData {
  year: string;
  revenue: number; // 매출액 (원)
  operatingIncome: number; // 영업이익 (원)
  netIncome: number; // 순이익 (원)
}

interface KeyMetrics {
  roe: number; // ROE (%)
  roic: number; // ROIC (%)
  debtRatio: number; // 부채비율 (%)
}

interface FinancialAnalysisProps {
  /** 최근 3년 재무 데이터 */
  yearlyData: YearlyFinancialData[];
  /** 핵심 지표 */
  keyMetrics: KeyMetrics;
  /** 현금흐름 요약 */
  cashFlowSummary: string;
}

export function FinancialAnalysis({
  yearlyData,
  keyMetrics,
  cashFlowSummary,
}: FinancialAnalysisProps) {
  // 증감률 계산
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // 증감률 포맷 (색상 포함)
  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return {
      text: `${sign}${growth.toFixed(1)}%`,
      color: growth >= 0 ? '#10B981' : '#EF4444',
    };
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={28} color="#9333EA" />
        <Text style={styles.headerTitle}>재무 분석</Text>
      </View>

      {/* 1. 최근 3년 실적 테이블 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>💼</Text>
          <Text style={styles.sectionTitle}>실적 추이 (최근 3년)</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            {/* 테이블 헤더 */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCellHeader, styles.tableCellFirst]}>
                <Text style={styles.tableCellHeaderText}>항목</Text>
              </View>
              {yearlyData.map((data, index) => (
                <View key={index} style={[styles.tableCell, styles.tableCellHeader]}>
                  <Text style={styles.tableCellHeaderText}>{data.year}</Text>
                </View>
              ))}
            </View>

            {/* 매출액 행 */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCellFirst]}>
                <Text style={styles.tableCellText}>매출액</Text>
              </View>
              {yearlyData.map((data, index) => {
                const growth = index > 0
                  ? calculateGrowth(data.revenue, yearlyData[index - 1].revenue)
                  : 0;
                const growthStyle = formatGrowth(growth);
                return (
                  <View key={index} style={styles.tableCell}>
                    <Text style={styles.tableCellValue}>{formatKRW(data.revenue, true)}</Text>
                    {index > 0 && (
                      <Text style={[styles.growthText, { color: growthStyle.color }]}>
                        {growthStyle.text}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* 영업이익 행 */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCellFirst]}>
                <Text style={styles.tableCellText}>영업이익</Text>
              </View>
              {yearlyData.map((data, index) => {
                const growth = index > 0
                  ? calculateGrowth(data.operatingIncome, yearlyData[index - 1].operatingIncome)
                  : 0;
                const growthStyle = formatGrowth(growth);
                return (
                  <View key={index} style={styles.tableCell}>
                    <Text style={styles.tableCellValue}>{formatKRW(data.operatingIncome, true)}</Text>
                    {index > 0 && (
                      <Text style={[styles.growthText, { color: growthStyle.color }]}>
                        {growthStyle.text}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* 순이익 행 */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCellFirst]}>
                <Text style={styles.tableCellText}>순이익</Text>
              </View>
              {yearlyData.map((data, index) => {
                const growth = index > 0
                  ? calculateGrowth(data.netIncome, yearlyData[index - 1].netIncome)
                  : 0;
                const growthStyle = formatGrowth(growth);
                return (
                  <View key={index} style={styles.tableCell}>
                    <Text style={styles.tableCellValue}>{formatKRW(data.netIncome, true)}</Text>
                    {index > 0 && (
                      <Text style={[styles.growthText, { color: growthStyle.color }]}>
                        {growthStyle.text}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 2. 핵심 지표 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>🎯</Text>
          <Text style={styles.sectionTitle}>핵심 지표</Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="ROE" value={keyMetrics.roe} unit="%" />
          <MetricCard label="ROIC" value={keyMetrics.roic} unit="%" />
          <MetricCard label="부채비율" value={keyMetrics.debtRatio} unit="%" />
        </View>
      </View>

      {/* 3. 현금흐름 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>💵</Text>
          <Text style={styles.sectionTitle}>현금흐름</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.descriptionText}>{cashFlowSummary}</Text>
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

/** 지표 카드 컴포넌트 */
function MetricCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value.toFixed(1)}
        <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  // 테이블 스타일
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  tableCell: {
    width: 100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#2A2A2A',
  },
  tableCellFirst: {
    width: 120,
    alignItems: 'flex-start',
  },
  tableCellHeader: {
    backgroundColor: '#9333EA20',
  },
  tableCellHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9333EA',
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  tableCellValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 지표 카드
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
  },
  metricUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },

  // 설명 카드
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  descriptionText: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 22,
  },
});
