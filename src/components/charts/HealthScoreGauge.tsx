/**
 * HealthScoreGauge — 건강 점수 반원형 게이지 차트 (SVG 기반)
 *
 * 역할: "건강 점수 시각화 부서"
 * - 0~100 점수를 반원형 게이지로 표현
 * - 빨강(0-40) → 노랑(40-70) → 초록(70-100) 그라데이션
 * - 가운데에 점수와 등급 표시
 * - 부드러운 바늘(needle) 애니메이션
 *
 * react-native-svg 기반, 외부 차트 라이브러리 없음
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

// ── 타입 정의 ──

interface HealthScoreGaugeProps {
  score: number;         // 0~100
  grade: string;         // 등급 문자 (S/A/B/C/D)
  gradeLabel?: string;   // 등급 한국어 ("최적"/"양호"/...)
  gradeColor?: string;   // 등급 색상
  size?: number;         // 게이지 너비 (default: 220)
  strokeWidth?: number;  // 게이지 두께 (default: 16)
}

// ── 유틸 함수 ──

/** 점수에 따른 색상 반환 (시맨틱 - 테마 불변) */
function getScoreColor(score: number): string {
  if (score >= 70) return '#4CAF50';  // 초록
  if (score >= 55) return '#8BC34A';  // 연두
  if (score >= 40) return '#FFC107';  // 노랑
  if (score >= 25) return '#FF9800';  // 주황
  return '#CF6679';                    // 빨강
}

/** 각도를 라디안으로 변환 */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 극좌표 → 직교좌표 변환 (반원 기준: 180~0도 = 왼쪽~오른쪽) */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/** 반원 Arc Path 생성 (startAngle~endAngle) */
function createSemiArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const sweep = Math.abs(endAngle - startAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  // 반시계 방향 (startAngle이 180, endAngle이 0)
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// ── 컴포넌트 ──

export default function HealthScoreGauge({
  score,
  grade,
  gradeLabel,
  gradeColor,
  size = 220,
  strokeWidth = 16,
}: HealthScoreGaugeProps) {
  const { colors } = useTheme();
  // 점수 클램프 (0~100)
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = gradeColor || getScoreColor(clampedScore);

  // 차트 치수 계산
  const height = size / 2 + strokeWidth + 30; // 반원 + 하단 여백
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2) / 2;

  // 배경 Arc (전체 반원: 180도 → 0도)
  const bgPath = useMemo(
    () => createSemiArcPath(cx, cy, radius, 180, 0),
    [cx, cy, radius],
  );

  // 점수 Arc (180도 → 180 - score * 1.8)
  // score 0 = 180도(왼쪽), score 100 = 0도(오른쪽)
  const scoreEndAngle = 180 - (clampedScore / 100) * 180;
  const scorePath = useMemo(
    () => createSemiArcPath(cx, cy, radius, 180, scoreEndAngle),
    [cx, cy, radius, scoreEndAngle],
  );

  // 바늘(needle) 좌표
  const needleAngle = 180 - (clampedScore / 100) * 180;
  const needleEnd = polarToCartesian(cx, cy, radius - strokeWidth / 2 - 4, needleAngle);
  const needleStart = polarToCartesian(cx, cy, 12, needleAngle);

  // 눈금 마크 (0, 25, 50, 75, 100)
  const tickMarks = useMemo(() => {
    return [0, 25, 50, 75, 100].map(val => {
      const angle = 180 - (val / 100) * 180;
      const outerPoint = polarToCartesian(cx, cy, radius + strokeWidth / 2 + 4, angle);
      const innerPoint = polarToCartesian(cx, cy, radius + strokeWidth / 2 + 10, angle);
      return { val, outer: outerPoint, inner: innerPoint };
    });
  }, [cx, cy, radius, strokeWidth]);

  return (
    <View style={[styles.container, { width: size }]}>
      <Svg width={size} height={height}>
        <Defs>
          {/* 점수 Arc 그라데이션 */}
          <LinearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#CF6679" />
            <Stop offset="40%" stopColor="#FFC107" />
            <Stop offset="70%" stopColor="#8BC34A" />
            <Stop offset="100%" stopColor="#4CAF50" />
          </LinearGradient>
        </Defs>

        {/* 배경 반원 (어두운) */}
        <Path
          d={bgPath}
          stroke={colors.surfaceLight}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />

        {/* 점수 반원 (색상) */}
        {clampedScore > 0 && (
          <Path
            d={scorePath}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* 바늘 */}
        <Line
          x1={needleStart.x}
          y1={needleStart.y}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={colors.textPrimary}
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* 바늘 중심점 */}
        <Circle cx={cx} cy={cy} r={5} fill={colors.textPrimary} />
        <Circle cx={cx} cy={cy} r={3} fill={color} />

        {/* 눈금 텍스트 */}
        {tickMarks.map(tick => (
          <G key={tick.val}>
            <Line
              x1={tick.outer.x}
              y1={tick.outer.y}
              x2={tick.inner.x}
              y2={tick.inner.y}
              stroke={colors.border}
              strokeWidth={1}
            />
          </G>
        ))}
      </Svg>

      {/* 가운데 점수 텍스트 (SVG 아래 절대 위치) */}
      <View style={[styles.scoreContainer, { top: cy - 10, width: size }]}>
        <Text style={[styles.scoreText, { color }]}>{Math.round(clampedScore)}</Text>
        <View style={[styles.gradeBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <Text style={[styles.gradeText, { color }]}>{grade}</Text>
          {gradeLabel && (
            <Text style={[styles.gradeLabel, { color: color + 'CC' }]}>{gradeLabel}</Text>
          )}
        </View>
      </View>

      {/* 하단 눈금 라벨 */}
      <View style={[styles.tickLabels, { width: size }]}>
        <Text style={[styles.tickText, { color: colors.textTertiary }]}>0</Text>
        <Text style={[styles.tickText, { color: colors.textTertiary }]}>25</Text>
        <Text style={[styles.tickText, { color: colors.textTertiary }]}>50</Text>
        <Text style={[styles.tickText, { color: colors.textTertiary }]}>75</Text>
        <Text style={[styles.tickText, { color: colors.textTertiary }]}>100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  // 점수 텍스트 (차트 중앙)
  scoreContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginTop: 2,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  gradeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // 눈금 라벨
  tickLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: -10,
  },
  tickText: {
    fontSize: 9,
    fontWeight: '500',
  },
});
