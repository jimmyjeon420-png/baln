import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { SIZES } from '../../styles/theme';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// 타입 정의
// ============================================================================

export interface DonutSlice {
  category: string;
  label: string;    // 한국어 라벨 (주식, 부동산 등)
  value: number;    // 원화 금액
  color: string;
  percent: number;  // 0~100
}

interface AssetDonutCardProps {
  slices: DonutSlice[];
  totalAssets: number;
}

// ============================================================================
// 유틸: 금액 약어 (1.4억, 5,300만 등)
// ============================================================================

function formatAbbreviated(amount: number): string {
  if (amount >= 1_0000_0000) {
    const eok = amount / 1_0000_0000;
    return eok >= 10
      ? `${Math.round(eok)}억`
      : `${eok.toFixed(1)}억`;
  }
  if (amount >= 1000_0000) {
    const man = Math.round(amount / 10000);
    return `${man.toLocaleString('ko-KR')}만`;
  }
  if (amount >= 100_0000) {
    const man = Math.round(amount / 10000);
    return `${man.toLocaleString('ko-KR')}만`;
  }
  return `₩${Math.round(amount).toLocaleString('ko-KR')}`;
}

// ============================================================================
// SVG 도넛 상수
// ============================================================================

const SIZE = 160;
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const STROKE_WIDTH = 24;
const CENTER = SIZE / 2;

// ============================================================================
// AssetDonutCard — SVG 도넛 차트 (자산 배분 보고서 역할)
// ============================================================================

const AssetDonutCard = ({ slices, totalAssets }: AssetDonutCardProps) => {
  const { colors } = useTheme();

  // 데이터 없으면 렌더링 안 함
  if (slices.length === 0) return null;

  // 각 슬라이스의 strokeDasharray/offset 계산
  let cumulativePercent = 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* 헤더 */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>자산 배분</Text>
      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Asset Allocation</Text>

      {/* SVG 도넛 */}
      <View style={styles.chartContainer}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* 배경 원 (빈 트랙) */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.surfaceLight}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />

          {/* 데이터 아크들 */}
          {slices.map((slice, i) => {
            const dashLength = (slice.percent / 100) * CIRCUMFERENCE;
            const dashGap = CIRCUMFERENCE - dashLength;
            const offset = -cumulativePercent / 100 * CIRCUMFERENCE + CIRCUMFERENCE / 4;
            cumulativePercent += slice.percent;

            return (
              <Circle
                key={slice.category}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                stroke={slice.color}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={`${dashLength} ${dashGap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}

          {/* 중앙 텍스트 */}
          <SvgText
            x={CENTER}
            y={CENTER - 6}
            textAnchor="middle"
            fill={colors.textPrimary}
            fontSize="16"
            fontWeight="700"
          >
            {formatAbbreviated(totalAssets)}
          </SvgText>
          <SvgText
            x={CENTER}
            y={CENTER + 12}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize="11"
          >
            총 자산
          </SvgText>
        </Svg>
      </View>

      {/* 범례 (가로 2열) */}
      <View style={styles.legendGrid}>
        {slices.map((slice) => (
          <View key={slice.category} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{slice.label}</Text>
            <Text style={[styles.legendPercent, { color: colors.textPrimary }]}>{slice.percent.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// React.memo 최적화: slices 배열과 totalAssets 비교
// ============================================================================

export default React.memo(AssetDonutCard, (prev, next) => {
  // totalAssets가 같고, slices 배열 길이와 각 항목이 같으면 리렌더링 방지
  if (prev.totalAssets !== next.totalAssets) return false;
  if (prev.slices.length !== next.slices.length) return false;

  return prev.slices.every((slice, i) => {
    const nextSlice = next.slices[i];
    return (
      slice.category === nextSlice.category &&
      slice.value === nextSlice.value &&
      slice.percent === nextSlice.percent
    );
  });
});

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.rXl,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
  },
  legendPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
});
