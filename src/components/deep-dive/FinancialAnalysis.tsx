/**
 * FinancialAnalysis.tsx - 투자심사보고서: 재무 분석 섹션
 *
 * 역할: "재무 분석 부서"
 * - 분기별 실적 바 차트 (매출/영업이익/순이익)
 * - 선택한 분기 상세: 사업부별 매출 + 비용 구조 + 워터폴
 * - 시가총액 & PER/PBR
 * - 최근 3년 연간 실적 테이블
 * - 핵심 지표 (ROE, ROIC, 부채비율)
 * - 현금흐름 설명
 *
 * useTheme() 훅으로 다크/라이트 모드 대응
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatKRW } from '../../utils/formatters';
import { useTheme } from '../../hooks/useTheme';
import QuarterlyChart, { type QuarterlyData } from './QuarterlyChart';
import EarningsBreakdown, { type RevenueSegment, type CostItem, type WaterfallItem } from './EarningsBreakdown';

// ── 연간 재무 데이터 ──
interface YearlyFinancialData {
  year: string;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
}

// ── 핵심 지표 ──
interface KeyMetrics {
  roe: number;
  roic: number;
  debtRatio: number;
}

// ── 분기 상세 데이터 ──
export interface QuarterDetailData {
  quarter: string;
  revenueSegments: RevenueSegment[];
  costItems: CostItem[];
  waterfall: WaterfallItem[];
  operatingMargin?: number;
  netMargin?: number;
  keyTakeaway?: string;
}

// ── Props ──
interface FinancialAnalysisProps {
  /** 최근 3년 재무 데이터 */
  yearlyData: YearlyFinancialData[];
  /** 핵심 지표 */
  keyMetrics: KeyMetrics;
  /** 현금흐름 요약 */
  cashFlowSummary: string;
  /** 시가총액 (원) */
  marketCap?: number;
  /** PER */
  per?: number;
  /** PBR */
  pbr?: number;
  /** 분기별 실적 데이터 (4분기) */
  quarterlyData?: QuarterlyData[];
  /** 분기 상세 (실적 발표 후 1개 분기) */
  quarterDetail?: QuarterDetailData;
}

export function FinancialAnalysis({
  yearlyData,
  keyMetrics,
  cashFlowSummary,
  marketCap,
  per,
  pbr,
  quarterlyData,
  quarterDetail,
}: FinancialAnalysisProps) {
  const { colors } = useTheme();
  const [selectedQuarter, setSelectedQuarter] = useState<string | undefined>(
    quarterDetail?.quarter
  );

  const handleSelectQuarter = useCallback((quarter: string) => {
    setSelectedQuarter(quarter);
  }, []);

  // 증감률 계산
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return {
      text: `${sign}${growth.toFixed(1)}%`,
      color: growth >= 0 ? '#10B981' : '#EF4444',
    };
  };

  // 선택된 분기가 상세 데이터와 매칭되는지 확인
  const showDetail = quarterDetail && selectedQuarter === quarterDetail.quarter;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Ionicons name="stats-chart" size={28} color="#9333EA" />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>재무 분석</Text>
      </View>

      {/* ═══ 1. 시가총액 & 밸류에이션 ═══ */}
      {(marketCap || per || pbr) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.icon}>{'📊'}</Text>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>시가총액 & 밸류에이션</Text>
          </View>

          {marketCap != null && marketCap > 0 && (
            <View style={[styles.marketCapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.marketCapLabel, { color: colors.textTertiary }]}>시가총액</Text>
              <Text style={[styles.marketCapValue, { color: colors.textPrimary }]}>
                {formatKRW(marketCap, true)}
              </Text>
            </View>
          )}

          <View style={styles.metricsRow}>
            {per != null && <MetricCard label="PER" value={per} unit="배" colors={colors} />}
            {pbr != null && <MetricCard label="PBR" value={pbr} unit="배" colors={colors} />}
            {(!per && !pbr) && <View style={{ flex: 1 }} />}
          </View>
        </View>
      )}

      {/* ═══ 2. 분기별 실적 차트 ═══ */}
      {quarterlyData && quarterlyData.length > 0 && (
        <View style={styles.section}>
          <QuarterlyChart
            data={quarterlyData}
            onSelectQuarter={handleSelectQuarter}
            selectedQuarter={selectedQuarter}
          />
        </View>
      )}

      {/* ═══ 3. 선택 분기 상세 실적 ═══ */}
      {showDetail && (
        <View style={styles.section}>
          <EarningsBreakdown
            quarter={quarterDetail.quarter}
            revenueSegments={quarterDetail.revenueSegments}
            costItems={quarterDetail.costItems}
            waterfall={quarterDetail.waterfall}
            operatingMargin={quarterDetail.operatingMargin}
            netMargin={quarterDetail.netMargin}
            keyTakeaway={quarterDetail.keyTakeaway}
          />
        </View>
      )}

      {/* 상세 없는 분기 선택 시 안내 */}
      {selectedQuarter && !showDetail && quarterDetail && (
        <View style={[styles.noDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.noDetailText, { color: colors.textTertiary }]}>
            {quarterDetail.quarter} 분기만 상세 실적을 확인할 수 있습니다
          </Text>
        </View>
      )}

      {/* ═══ 4. 연간 실적 테이블 ═══ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>{'💼'}</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>연간 실적 추이</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* 테이블 헤더 */}
            <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.tableCell, styles.tableCellHeader, styles.tableCellFirst, { borderRightColor: colors.border }]}>
                <Text style={styles.tableCellHeaderText}>항목</Text>
              </View>
              {yearlyData.map((data, index) => (
                <View key={index} style={[styles.tableCell, styles.tableCellHeader, { borderRightColor: colors.border }]}>
                  <Text style={styles.tableCellHeaderText}>{data.year}</Text>
                </View>
              ))}
            </View>

            {/* 매출액 행 */}
            <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.tableCell, styles.tableCellFirst, { borderRightColor: colors.border }]}>
                <Text style={[styles.tableCellText, { color: colors.textSecondary }]}>매출액</Text>
              </View>
              {yearlyData.map((data, index) => {
                const growth = index > 0
                  ? calculateGrowth(data.revenue, yearlyData[index - 1].revenue)
                  : 0;
                const growthStyle = formatGrowth(growth);
                return (
                  <View key={index} style={[styles.tableCell, { borderRightColor: colors.border }]}>
                    <Text style={[styles.tableCellValue, { color: colors.textPrimary }]}>{formatKRW(data.revenue, true)}</Text>
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
            <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.tableCell, styles.tableCellFirst, { borderRightColor: colors.border }]}>
                <Text style={[styles.tableCellText, { color: colors.textSecondary }]}>영업이익</Text>
              </View>
              {yearlyData.map((data, index) => {
                const growth = index > 0
                  ? calculateGrowth(data.operatingIncome, yearlyData[index - 1].operatingIncome)
                  : 0;
                const growthStyle = formatGrowth(growth);
                return (
                  <View key={index} style={[styles.tableCell, { borderRightColor: colors.border }]}>
                    <Text style={[styles.tableCellValue, { color: colors.textPrimary }]}>{formatKRW(data.operatingIncome, true)}</Text>
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
            <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.tableCell, styles.tableCellFirst, { borderRightColor: colors.border }]}>
                <Text style={[styles.tableCellText, { color: colors.textSecondary }]}>순이익</Text>
              </View>
              {yearlyData.map((data, index) => {
                const growth = index > 0
                  ? calculateGrowth(data.netIncome, yearlyData[index - 1].netIncome)
                  : 0;
                const growthStyle = formatGrowth(growth);
                return (
                  <View key={index} style={[styles.tableCell, { borderRightColor: colors.border }]}>
                    <Text style={[styles.tableCellValue, { color: colors.textPrimary }]}>{formatKRW(data.netIncome, true)}</Text>
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

      {/* ═══ 5. 핵심 지표 ═══ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>{'🎯'}</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>핵심 지표</Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="ROE" value={keyMetrics.roe} unit="%" colors={colors} />
          <MetricCard label="ROIC" value={keyMetrics.roic} unit="%" colors={colors} />
          <MetricCard label="부채비율" value={keyMetrics.debtRatio} unit="%" colors={colors} />
        </View>
      </View>

      {/* ═══ 6. 현금흐름 ═══ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>{'💵'}</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>현금흐름</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{cashFlowSummary}</Text>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

/** 지표 카드 컴포넌트 */
function MetricCard({ label, value, unit, colors }: { label: string; value: number; unit: string; colors: any }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={styles.metricValue}>
        {value.toFixed(1)}
        <Text style={[styles.metricUnit, { color: colors.textTertiary }]}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
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
    fontSize: 21,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  // 시가총액
  marketCapCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  marketCapLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  marketCapValue: {
    fontSize: 29,
    fontWeight: '900',
  },

  // 테이블
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    width: 100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  tableCellFirst: {
    width: 120,
    alignItems: 'flex-start',
  },
  tableCellHeader: {
    backgroundColor: '#9333EA20',
  },
  tableCellHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9333EA',
  },
  tableCellText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tableCellValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 지표 카드
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 25,
    fontWeight: '800',
    color: '#10B981',
  },
  metricUnit: {
    fontSize: 17,
    fontWeight: '600',
  },

  // 설명 카드
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 23,
  },

  // 상세 미제공 안내
  noDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
  },
  noDetailText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
