/**
 * QuarterlyChart.tsx — 분기별 실적 바 차트
 *
 * [비유] "분기별 성적표 그래프"
 * - 4분기 매출 / 영업이익 / 당기순이익을 바 차트로 시각화
 * - 각 분기를 터치하면 상세 보기(EarningsBreakdown)로 연결
 * - 금액은 억 단위로 표시
 *
 * useTheme() 훅으로 다크/라이트 모드 대응
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatKRW } from '../../utils/formatters';

// ── 데이터 타입 ──
export interface QuarterlyData {
  quarter: string;       // "Q1 2025", "Q2 2025" 등
  revenue: number;       // 매출액 (원)
  operatingIncome: number; // 영업이익 (원)
  netIncome: number;     // 당기순이익 (원)
}

interface QuarterlyChartProps {
  /** 4분기 데이터 (시간순) */
  data: QuarterlyData[];
  /** 분기 선택 시 콜백 */
  onSelectQuarter?: (quarter: string) => void;
  /** 현재 선택된 분기 */
  selectedQuarter?: string;
}

// ── 차트 색상 ──
const CHART_COLORS = {
  revenue: '#6366F1',        // 인디고 — 매출
  operatingIncome: '#10B981', // 에메랄드 — 영업이익
  netIncome: '#F59E0B',       // 앰버 — 당기순이익
};

const LEGEND_ITEMS = [
  { label: '매출', color: CHART_COLORS.revenue },
  { label: '영업이익', color: CHART_COLORS.operatingIncome },
  { label: '순이익', color: CHART_COLORS.netIncome },
];

// ── 바 높이 계산 ──
const MAX_BAR_HEIGHT = 120;

export default function QuarterlyChart({
  data,
  onSelectQuarter,
  selectedQuarter,
}: QuarterlyChartProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<string | undefined>(selectedQuarter);

  // 전체 데이터에서 최대값 계산 (바 높이 비율용)
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.revenue, Math.abs(d.operatingIncome), Math.abs(d.netIncome))),
    1 // 0으로 나누기 방지
  );

  const getBarHeight = (value: number) => {
    return Math.max((Math.abs(value) / maxValue) * MAX_BAR_HEIGHT, 4);
  };

  const handleSelectQuarter = (quarter: string) => {
    setSelected(quarter);
    onSelectQuarter?.(quarter);
  };

  // 전분기 대비 매출 증감
  const getRevenueGrowth = (index: number) => {
    if (index === 0) return null;
    const prev = data[index - 1].revenue;
    if (prev === 0) return null;
    return ((data[index].revenue - prev) / prev) * 100;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bar-chart-outline" size={20} color="#6366F1" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>분기별 실적</Text>
        </View>
        {/* 범례 */}
        <View style={styles.legendRow}>
          {LEGEND_ITEMS.map(item => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: colors.textTertiary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 차트 영역 */}
      <View style={styles.chartArea}>
        {data.map((q, index) => {
          const isSelected = selected === q.quarter;
          const growth = getRevenueGrowth(index);

          return (
            <TouchableOpacity
              key={q.quarter}
              style={[
                styles.quarterColumn,
                isSelected && [styles.quarterColumnSelected, { backgroundColor: `${colors.primary}15` }],
              ]}
              onPress={() => handleSelectQuarter(q.quarter)}
              activeOpacity={0.7}
            >
              {/* 증감률 표시 */}
              <View style={styles.growthContainer}>
                {growth !== null && (
                  <Text style={[
                    styles.growthText,
                    { color: growth >= 0 ? '#10B981' : '#EF4444' },
                  ]}>
                    {growth >= 0 ? '▲' : '▼'}{Math.abs(growth).toFixed(1)}%
                  </Text>
                )}
              </View>

              {/* 바 그룹 */}
              <View style={styles.barGroup}>
                {/* 매출 바 */}
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: getBarHeight(q.revenue),
                        backgroundColor: CHART_COLORS.revenue,
                      },
                    ]}
                  />
                </View>

                {/* 영업이익 바 */}
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: getBarHeight(q.operatingIncome),
                        backgroundColor: q.operatingIncome >= 0
                          ? CHART_COLORS.operatingIncome
                          : '#EF4444',
                      },
                    ]}
                  />
                </View>

                {/* 순이익 바 */}
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: getBarHeight(q.netIncome),
                        backgroundColor: q.netIncome >= 0
                          ? CHART_COLORS.netIncome
                          : '#EF4444',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* 분기 라벨 */}
              <Text style={[
                styles.quarterLabel,
                { color: isSelected ? colors.primary : colors.textTertiary },
                isSelected && { fontWeight: '700' },
              ]}>
                {q.quarter}
              </Text>

              {/* 선택 인디케이터 */}
              {isSelected && (
                <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 선택된 분기 요약 */}
      {selected && (() => {
        const q = data.find(d => d.quarter === selected);
        if (!q) return null;
        return (
          <View style={[styles.summaryRow, { borderTopColor: colors.border }]}>
            <SummaryItem
              label="매출"
              value={q.revenue}
              color={CHART_COLORS.revenue}
              textColor={colors.textPrimary}
              subColor={colors.textTertiary}
            />
            <SummaryItem
              label="영업이익"
              value={q.operatingIncome}
              color={CHART_COLORS.operatingIncome}
              textColor={colors.textPrimary}
              subColor={colors.textTertiary}
            />
            <SummaryItem
              label="순이익"
              value={q.netIncome}
              color={CHART_COLORS.netIncome}
              textColor={colors.textPrimary}
              subColor={colors.textTertiary}
            />
          </View>
        );
      })()}

      {/* 안내 문구 */}
      {!selected && (
        <Text style={[styles.hint, { color: colors.textQuaternary }]}>
          분기를 터치하면 상세 실적을 확인할 수 있습니다
        </Text>
      )}
    </View>
  );
}

// ── 요약 아이템 ──
function SummaryItem({
  label,
  value,
  color,
  textColor,
  subColor,
}: {
  label: string;
  value: number;
  color: string;
  textColor: string;
  subColor: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <View style={styles.summaryLabelRow}>
        <View style={[styles.summaryDot, { backgroundColor: color }]} />
        <Text style={[styles.summaryLabel, { color: subColor }]}>{label}</Text>
      </View>
      <Text style={[styles.summaryValue, { color: textColor }]}>
        {formatKRW(value, true)}
      </Text>
    </View>
  );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },

  // ── 헤더 ──
  header: {
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── 차트 ──
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  quarterColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  quarterColumnSelected: {
    borderRadius: 12,
  },
  growthContainer: {
    height: 18,
    justifyContent: 'center',
    marginBottom: 4,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 바 ──
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: MAX_BAR_HEIGHT,
  },
  barWrapper: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 14,
    borderRadius: 4,
    minHeight: 4,
  },

  // ── 라벨 ──
  quarterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  selectedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },

  // ── 요약 ──
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
  },

  // ── 힌트 ──
  hint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 12,
  },
});
