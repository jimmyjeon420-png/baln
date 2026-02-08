/**
 * 자산 추이 섹션 — 일별 총자산 변화 미니 차트
 *
 * 역할: "내 자산이 어떻게 변해왔는지" 한눈에 보기
 * 데이터: portfolio_snapshots → useMySnapshots(days)
 * 시각화: react-native-svg Path (이미 설치됨)
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { SkeletonBlock } from '../SkeletonLoader';
import type { PortfolioSnapshot } from '../../hooks/usePortfolioSnapshots';

// ── 기간 탭 ──

type Period = '1W' | '1M' | '3M';
const PERIOD_OPTIONS: { key: Period; label: string; days: number }[] = [
  { key: '1W', label: '1주', days: 7 },
  { key: '1M', label: '1개월', days: 30 },
  { key: '3M', label: '3개월', days: 90 },
];

// ── Props ──

interface AssetTrendSectionProps {
  snapshots: PortfolioSnapshot[];
  isLoading: boolean;
  currentTotal: number;
}

// ── SVG 라인 차트 생성 ──

function buildSvgPath(
  data: number[],
  width: number,
  height: number,
  padding: number,
): { path: string; min: number; max: number; lastPoint: { x: number; y: number } } {
  if (data.length < 2) return { path: '', min: 0, max: 0, lastPoint: { x: 0, y: 0 } };

  const min = Math.min(...data) * 0.995; // 5% 하단 여유
  const max = Math.max(...data) * 1.005;
  const range = max - min || 1;

  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * chartW,
    y: padding + chartH - ((val - min) / range) * chartH,
  }));

  // 부드러운 곡선 (Catmull-Rom → Cubic Bezier 변환)
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return { path, min, max, lastPoint: points[points.length - 1] };
}

export default function AssetTrendSection({
  snapshots,
  isLoading,
  currentTotal,
}: AssetTrendSectionProps) {
  const [period, setPeriod] = useState<Period>('1M');

  const selectedDays = PERIOD_OPTIONS.find(p => p.key === period)?.days ?? 30;

  // 기간 필터링
  const filteredData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selectedDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return snapshots.filter(s => s.snapshot_date >= cutoffStr);
  }, [snapshots, selectedDays]);

  // 차트 데이터 (총자산 배열)
  const chartValues = useMemo(() => {
    const vals = filteredData.map(s => s.total_assets);
    // 현재 총자산을 마지막에 추가 (오늘 스냅샷이 아직 없을 수 있으므로)
    if (currentTotal > 0) vals.push(currentTotal);
    return vals;
  }, [filteredData, currentTotal]);

  // 기간 내 변동
  const periodChange = useMemo(() => {
    if (chartValues.length < 2) return { amount: 0, percent: 0 };
    const first = chartValues[0];
    const last = chartValues[chartValues.length - 1];
    const amount = last - first;
    const percent = first > 0 ? (amount / first) * 100 : 0;
    return { amount, percent };
  }, [chartValues]);

  const isPositive = periodChange.amount >= 0;

  // SVG 치수
  const CHART_WIDTH = 320;
  const CHART_HEIGHT = 100;
  const PADDING = 8;

  const { path, lastPoint } = useMemo(
    () => buildSvgPath(chartValues, CHART_WIDTH, CHART_HEIGHT, PADDING),
    [chartValues],
  );

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <View style={s.card}>
        <SkeletonBlock width={100} height={16} />
        <View style={{ marginTop: 12 }}>
          <SkeletonBlock width="100%" height={100} style={{ borderRadius: 12 }} />
        </View>
      </View>
    );
  }

  // 데이터 부족
  if (chartValues.length < 2) return null;

  const lineColor = isPositive ? '#4CAF50' : '#CF6679';

  return (
    <View style={s.card}>
      {/* 헤더 */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.cardLabel}>자산 추이</Text>
          <Text style={s.cardLabelEn}>Asset Trend</Text>
        </View>
        {/* 기간 변동 */}
        <View style={[s.changeBadge, { backgroundColor: isPositive ? 'rgba(76,175,80,0.12)' : 'rgba(207,102,121,0.12)' }]}>
          <Text style={[s.changeText, { color: lineColor }]}>
            {isPositive ? '+' : ''}{periodChange.percent.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* 기간 탭 */}
      <View style={s.periodTabs}>
        {PERIOD_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[s.periodTab, period === opt.key && s.periodTabActive]}
            onPress={() => setPeriod(opt.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.periodTabText, period === opt.key && s.periodTabTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SVG 라인 차트 */}
      <View style={s.chartContainer}>
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          {/* 기준선 (시작 값) */}
          <Line
            x1={PADDING}
            y1={CHART_HEIGHT - PADDING}
            x2={CHART_WIDTH - PADDING}
            y2={CHART_HEIGHT - PADDING}
            stroke="#222"
            strokeWidth={0.5}
            strokeDasharray="4,4"
          />
          {/* 라인 */}
          {path && (
            <Path
              d={path}
              stroke={lineColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          )}
          {/* 현재 포인트 */}
          {lastPoint.x > 0 && (
            <Circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={4}
              fill={lineColor}
              stroke="#141414"
              strokeWidth={2}
            />
          )}
        </Svg>
      </View>

      {/* 기간 요약 */}
      <View style={s.summaryRow}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>{selectedDays}일 전</Text>
          <Text style={s.summaryValue}>₩{chartValues[0]?.toLocaleString()}</Text>
        </View>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>현재</Text>
          <Text style={[s.summaryValue, { color: lineColor }]}>₩{currentTotal.toLocaleString()}</Text>
        </View>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>변동</Text>
          <Text style={[s.summaryValue, { color: lineColor }]}>
            {isPositive ? '+' : ''}₩{Math.abs(periodChange.amount).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cardLabelEn: { fontSize: 10, color: '#555', marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  changeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  changeText: { fontSize: 13, fontWeight: '700' },

  // 기간 탭
  periodTabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  periodTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1E1E1E' },
  periodTabActive: { backgroundColor: 'rgba(76,175,80,0.15)' },
  periodTabText: { fontSize: 12, color: '#666', fontWeight: '600' },
  periodTabTextActive: { color: '#4CAF50' },

  // 차트
  chartContainer: { marginBottom: 12 },

  // 요약
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: '#666', marginBottom: 3 },
  summaryValue: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
