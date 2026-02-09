/**
 * AllocationPieChart — 자산 배분 파이 차트 (SVG 기반)
 *
 * 역할: "자산 배분 시각화 부서"
 * - react-native-svg로 순수 SVG 파이 차트 구현
 * - 카테고리별 색상 자동 매핑
 * - 가운데에 총 자산 금액 표시
 * - 탭하면 해당 카테고리 하이라이트
 *
 * 외부 차트 라이브러리 없이 SVG Path로 직접 그리기
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { COLORS } from '../../styles/theme';

// ── 타입 정의 ──

export interface PieSlice {
  key: string;       // 카테고리 키
  label: string;     // 한국어 라벨
  value: number;     // 금액
  color: string;     // 슬라이스 색상
  icon?: string;     // 이모지 아이콘
}

interface AllocationPieChartProps {
  slices: PieSlice[];
  totalValue: number;       // 총 자산 금액
  size?: number;            // 차트 크기 (default: 200)
  strokeWidth?: number;     // 도넛 두께 (default: 32)
  showLegend?: boolean;     // 범례 표시 (default: true)
  formatCurrency?: (value: number) => string; // 통화 포맷 함수
}

// ── 도넛 차트 수학 유틸 ──

/** 각도를 SVG Arc Path의 좌표로 변환 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/** SVG Arc Path 생성 (도넛 슬라이스 1개) */
function createArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  // 360도 꽉 찬 원인 경우 → 두 개의 반원으로 분할
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    const mid = startAngle + 180;
    const p1 = polarToCartesian(cx, cy, radius, startAngle);
    const p2 = polarToCartesian(cx, cy, radius, mid);
    return [
      `M ${p1.x} ${p1.y}`,
      `A ${radius} ${radius} 0 1 1 ${p2.x} ${p2.y}`,
      `A ${radius} ${radius} 0 1 1 ${p1.x} ${p1.y}`,
    ].join(' ');
  }

  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
  ].join(' ');
}

// ── 기본 통화 포맷 ──

function defaultFormatCurrency(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return value.toLocaleString();
}

// ── 컴포넌트 ──

export default function AllocationPieChart({
  slices,
  totalValue,
  size = 200,
  strokeWidth = 32,
  showLegend = true,
  formatCurrency = defaultFormatCurrency,
}: AllocationPieChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 0 이상인 슬라이스만 필터링
  const validSlices = useMemo(
    () => slices.filter(s => s.value > 0),
    [slices],
  );

  // 각 슬라이스의 각도 계산
  const arcs = useMemo(() => {
    if (validSlices.length === 0) return [];

    let currentAngle = 0;
    return validSlices.map((slice, i) => {
      const percentage = totalValue > 0 ? (slice.value / totalValue) * 100 : 0;
      const sweepAngle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweepAngle;
      currentAngle = endAngle;

      return {
        ...slice,
        percentage,
        startAngle,
        endAngle,
        index: i,
      };
    });
  }, [validSlices, totalValue]);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;

  // 선택된 슬라이스 정보
  const selectedSlice = selectedIndex !== null ? arcs[selectedIndex] : null;

  return (
    <View style={styles.container}>
      {/* 파이 차트 */}
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {/* 배경 원 */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#2A2A2A"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* 슬라이스들 */}
          {arcs.map((arc, i) => {
            const isSelected = selectedIndex === i;
            const sw = isSelected ? strokeWidth + 6 : strokeWidth;
            const r = isSelected ? radius : radius;
            const path = createArcPath(center, center, r, arc.startAngle, arc.endAngle);

            return (
              <Path
                key={arc.key}
                d={path}
                stroke={arc.color}
                strokeWidth={sw}
                strokeLinecap="round"
                fill="none"
                opacity={selectedIndex !== null && !isSelected ? 0.3 : 1}
                onPress={() => setSelectedIndex(isSelected ? null : i)}
              />
            );
          })}
        </Svg>

        {/* 가운데 텍스트 */}
        <View style={[styles.centerTextContainer, { width: size, height: size }]}>
          {selectedSlice ? (
            // 선택된 슬라이스 정보
            <>
              <Text style={styles.centerIcon}>{selectedSlice.icon || ''}</Text>
              <Text style={styles.centerLabel}>{selectedSlice.label}</Text>
              <Text style={styles.centerValue}>
                {formatCurrency(selectedSlice.value)}
              </Text>
              <Text style={styles.centerPercent}>
                {selectedSlice.percentage.toFixed(1)}%
              </Text>
            </>
          ) : (
            // 기본: 총 자산
            <>
              <Text style={styles.centerSmallLabel}>총 자산</Text>
              <Text style={styles.centerTotalValue}>
                {formatCurrency(totalValue)}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* 범례 */}
      {showLegend && (
        <View style={styles.legendContainer}>
          {arcs.map((arc, i) => (
            <TouchableOpacity
              key={arc.key}
              style={[
                styles.legendItem,
                selectedIndex === i && styles.legendItemSelected,
              ]}
              onPress={() => setSelectedIndex(selectedIndex === i ? null : i)}
              activeOpacity={0.7}
            >
              <View style={[styles.legendDot, { backgroundColor: arc.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {arc.icon ? `${arc.icon} ` : ''}{arc.label}
              </Text>
              <Text style={styles.legendPercent}>
                {arc.percentage.toFixed(1)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 가운데 텍스트 (절대 위치로 차트 중앙에 배치)
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSmallLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  centerTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  centerIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  centerLabel: {
    fontSize: 12,
    color: '#CCC',
    fontWeight: '600',
  },
  centerValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  centerPercent: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  // 범례
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  legendItemSelected: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: '#CCC',
    maxWidth: 80,
  },
  legendPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
});
