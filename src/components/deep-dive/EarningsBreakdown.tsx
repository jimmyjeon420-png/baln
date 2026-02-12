/**
 * EarningsBreakdown.tsx — 분기 실적 상세 분석 (1개 분기)
 *
 * [비유] "실적 발표 후 분석 리포트"
 * - 사업부별 매출 구성 (수평 바)
 * - 주요 비용 항목 (비용 구조)
 * - 매출 → 비용 → 영업이익 → 순이익 워터폴 차트
 *
 * 실적 발표 후 1개 분기에 대해 상세하게 보여줌
 * useTheme() 훅으로 다크/라이트 모드 대응
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatKRW } from '../../utils/formatters';

// Android LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── 데이터 타입 ──
export interface RevenueSegment {
  name: string;       // "반도체", "디스플레이" 등
  amount: number;     // 금액 (원)
  percentage: number;  // 전체 매출 대비 비중 (0~100)
  color: string;       // 세그먼트 색상
  growth?: number;     // 전분기 대비 증감률
}

export interface CostItem {
  name: string;       // "매출원가", "판관비", "R&D" 등
  amount: number;     // 금액 (원)
  percentage: number;  // 매출 대비 비중 (0~100)
}

export interface WaterfallItem {
  label: string;       // "매출", "매출원가", "영업이익" 등
  amount: number;      // 금액
  type: 'revenue' | 'cost' | 'subtotal' | 'income';
}

export interface EarningsBreakdownProps {
  /** 분기 이름 */
  quarter: string;
  /** 사업부별 매출 구성 */
  revenueSegments: RevenueSegment[];
  /** 주요 비용 항목 */
  costItems: CostItem[];
  /** 워터폴 데이터 */
  waterfall: WaterfallItem[];
  /** 영업이익률 */
  operatingMargin?: number;
  /** 순이익률 */
  netMargin?: number;
  /** 핵심 코멘트 */
  keyTakeaway?: string;
}

// ── 세그먼트 기본 색상 팔레트 ──
const SEGMENT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
];

export default function EarningsBreakdown({
  quarter,
  revenueSegments,
  costItems,
  waterfall,
  operatingMargin,
  netMargin,
  keyTakeaway,
}: EarningsBreakdownProps) {
  const { colors } = useTheme();
  const [expandedSection, setExpandedSection] = useState<'revenue' | 'cost' | 'waterfall' | null>('revenue');

  const toggleSection = (section: 'revenue' | 'cost' | 'waterfall') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(prev => prev === section ? null : section);
  };

  const totalRevenue = revenueSegments.reduce((sum, s) => sum + s.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text-outline" size={20} color="#8B5CF6" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {quarter} 상세 실적
          </Text>
        </View>
        {/* 마진 뱃지 */}
        <View style={styles.marginBadges}>
          {operatingMargin != null && (
            <View style={[styles.marginBadge, { backgroundColor: '#10B98120' }]}>
              <Text style={[styles.marginText, { color: '#10B981' }]}>
                영업이익률 {operatingMargin.toFixed(1)}%
              </Text>
            </View>
          )}
          {netMargin != null && (
            <View style={[styles.marginBadge, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[styles.marginText, { color: '#F59E0B' }]}>
                순이익률 {netMargin.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ═══ 1. 사업부별 매출 구성 ═══ */}
      <SectionAccordion
        title="사업부별 매출 구성"
        icon="pie-chart-outline"
        iconColor="#6366F1"
        isExpanded={expandedSection === 'revenue'}
        onToggle={() => toggleSection('revenue')}
        colors={colors}
      >
        {/* 전체 매출 바 (스택) */}
        <View style={[styles.stackedBar, { backgroundColor: colors.border }]}>
          {revenueSegments.map((seg, i) => (
            <View
              key={seg.name}
              style={[
                styles.stackedSegment,
                {
                  width: `${Math.max(seg.percentage, 2)}%`,
                  backgroundColor: seg.color || SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                },
                i === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                i === revenueSegments.length - 1 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
              ]}
            />
          ))}
        </View>

        {/* 세그먼트 목록 */}
        {revenueSegments.map((seg, i) => (
          <View key={seg.name} style={[styles.segmentRow, { borderBottomColor: colors.border }]}>
            <View style={styles.segmentLeft}>
              <View style={[styles.segmentDot, { backgroundColor: seg.color || SEGMENT_COLORS[i % SEGMENT_COLORS.length] }]} />
              <Text style={[styles.segmentName, { color: colors.textPrimary }]}>{seg.name}</Text>
            </View>
            <View style={styles.segmentRight}>
              <Text style={[styles.segmentAmount, { color: colors.textPrimary }]}>
                {formatKRW(seg.amount, true)}
              </Text>
              <View style={styles.segmentMeta}>
                <Text style={[styles.segmentPercent, { color: colors.textTertiary }]}>
                  {seg.percentage.toFixed(1)}%
                </Text>
                {seg.growth != null && (
                  <Text style={[
                    styles.segmentGrowth,
                    { color: seg.growth >= 0 ? '#10B981' : '#EF4444' },
                  ]}>
                    {seg.growth >= 0 ? '▲' : '▼'}{Math.abs(seg.growth).toFixed(1)}%
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}

        {/* 합계 */}
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>합계</Text>
          <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
            {formatKRW(totalRevenue, true)}
          </Text>
        </View>
      </SectionAccordion>

      {/* ═══ 2. 비용 구조 ═══ */}
      <SectionAccordion
        title="비용 구조"
        icon="card-outline"
        iconColor="#EF4444"
        isExpanded={expandedSection === 'cost'}
        onToggle={() => toggleSection('cost')}
        colors={colors}
      >
        {costItems.map((item, i) => (
          <View key={item.name} style={[styles.costRow, { borderBottomColor: colors.border }]}>
            <View style={styles.costLeft}>
              <Text style={[styles.costName, { color: colors.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.costPercent, { color: colors.textTertiary }]}>
                매출의 {item.percentage.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.costRight}>
              <Text style={[styles.costAmount, { color: colors.textPrimary }]}>
                {formatKRW(item.amount, true)}
              </Text>
              {/* 비율 바 */}
              <View style={[styles.costBarBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.costBarFill,
                    {
                      width: `${Math.min(item.percentage, 100)}%`,
                      backgroundColor: '#EF444480',
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
      </SectionAccordion>

      {/* ═══ 3. 손익 워터폴 ═══ */}
      <SectionAccordion
        title="손익 흐름 (워터폴)"
        icon="git-network-outline"
        iconColor="#10B981"
        isExpanded={expandedSection === 'waterfall'}
        onToggle={() => toggleSection('waterfall')}
        colors={colors}
      >
        <WaterfallChart items={waterfall} colors={colors} />
      </SectionAccordion>

      {/* 핵심 코멘트 */}
      {keyTakeaway && (
        <View style={[styles.takeawayCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <Ionicons name="bulb-outline" size={16} color={colors.primary} />
          <Text style={[styles.takeawayText, { color: colors.textSecondary }]}>
            {keyTakeaway}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── 아코디언 섹션 ──
function SectionAccordion({
  title,
  icon,
  iconColor,
  isExpanded,
  onToggle,
  colors,
  children,
}: {
  title: string;
  icon: string;
  iconColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.accordionSection, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionLeft}>
          <Ionicons name={icon as any} size={16} color={iconColor} />
          <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textTertiary}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.accordionContent}>
          {children}
        </View>
      )}
    </View>
  );
}

// ── 워터폴 차트 ──
function WaterfallChart({
  items,
  colors,
}: {
  items: WaterfallItem[];
  colors: any;
}) {
  if (items.length === 0) return null;

  const maxAmount = Math.max(...items.map(i => Math.abs(i.amount)), 1);
  const barMaxWidth = 180;

  const getBarColor = (item: WaterfallItem) => {
    switch (item.type) {
      case 'revenue': return '#6366F1';
      case 'cost': return '#EF4444';
      case 'subtotal': return '#10B981';
      case 'income': return '#F59E0B';
      default: return colors.textTertiary;
    }
  };

  return (
    <View style={styles.waterfallContainer}>
      {items.map((item, index) => {
        const barWidth = Math.max((Math.abs(item.amount) / maxAmount) * barMaxWidth, 20);
        const barColor = getBarColor(item);
        const isNegative = item.type === 'cost';

        return (
          <View key={`${item.label}-${index}`} style={styles.waterfallRow}>
            {/* 라벨 */}
            <View style={styles.waterfallLabelCol}>
              <Text style={[styles.waterfallLabel, { color: colors.textSecondary }]}>
                {isNegative ? `(-) ${item.label}` : item.label}
              </Text>
            </View>

            {/* 바 */}
            <View style={styles.waterfallBarCol}>
              <View
                style={[
                  styles.waterfallBar,
                  {
                    width: barWidth,
                    backgroundColor: barColor,
                  },
                  (item.type === 'subtotal' || item.type === 'income') && styles.waterfallBarTotal,
                ]}
              >
                <Text style={styles.waterfallBarText}>
                  {formatKRW(item.amount, true)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* 흐름 화살표 */}
      <View style={styles.flowIndicator}>
        <View style={[styles.flowLine, { backgroundColor: colors.border }]} />
        <Ionicons name="arrow-down" size={12} color={colors.textQuaternary} />
      </View>
    </View>
  );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // ── 헤더 ──
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  marginBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  marginText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 아코디언 ──
  accordionSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // ── 스택 바 (전체 매출 비중) ──
  stackedBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  stackedSegment: {
    height: '100%',
  },

  // ── 세그먼트 목록 ──
  segmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  segmentDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  segmentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmentRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  segmentAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  segmentMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentPercent: {
    fontSize: 11,
    fontWeight: '500',
  },
  segmentGrowth: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 합계 ──
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
  },

  // ── 비용 구조 ──
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  costLeft: {
    flex: 1,
    gap: 2,
  },
  costName: {
    fontSize: 13,
    fontWeight: '600',
  },
  costPercent: {
    fontSize: 11,
    fontWeight: '500',
  },
  costRight: {
    alignItems: 'flex-end',
    gap: 4,
    flex: 1,
  },
  costAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  costBarBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  costBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ── 워터폴 ──
  waterfallContainer: {
    position: 'relative',
  },
  waterfallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  waterfallLabelCol: {
    width: 80,
  },
  waterfallLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  waterfallBarCol: {
    flex: 1,
  },
  waterfallBar: {
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  waterfallBarTotal: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  waterfallBarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── 흐름 화살표 ──
  flowIndicator: {
    position: 'absolute',
    left: 38,
    top: 28,
    bottom: 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  flowLine: {
    position: 'absolute',
    width: 1,
    top: 0,
    bottom: 12,
  },

  // ── 핵심 코멘트 ──
  takeawayCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  takeawayText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
});
