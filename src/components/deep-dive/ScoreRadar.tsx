/**
 * ScoreRadar.tsx — 재무/기술/뉴스 3축 레이더 차트
 *
 * [비유] "투자 건강 삼각형" — 세 방향의 점수 균형을 한눈에 보여주는 레이더
 * - SVG 정삼각형 배경 그리드 (33%, 66%, 100%)
 * - 실제 점수 기반 내부 삼각형 (반투명 채움)
 * - 각 꼭짓점에 라벨 + 점수 표시
 * - 다크/라이트 모드 대응
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

// ── 타입 정의 ──

export interface ScoreRadarProps {
  /** 재무 점수 (0-100) */
  financialScore: number;
  /** 기술 점수 (0-100) */
  technicalScore: number;
  /** 뉴스 점수 (0-100, POSITIVE=80, NEUTRAL=50, NEGATIVE=20) */
  newsScore: number;
  /** 차트 크기 (기본 200) */
  size?: number;
}

// ── 상수 ──

const SCORE_COLORS = {
  high: '#10B981',   // 80+
  medium: '#F59E0B', // 50-79
  low: '#EF4444',    // 50 미만
};

const LABELS = ['재무', '기술', '뉴스'];

/** 3꼭짓점 각도: 상단(-90°), 우하단(30°), 좌하단(150°) */
const VERTEX_ANGLES = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];

/** 배경 그리드 레벨 (33%, 66%, 100%) */
const GRID_LEVELS = [0.33, 0.66, 1.0];

// ── 유틸 함수 ──

/** 점수에 따른 색상 반환 */
function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.high;
  if (score >= 50) return SCORE_COLORS.medium;
  return SCORE_COLORS.low;
}

/** 정삼각형의 꼭짓점 좌표 계산 */
function getTrianglePoints(
  cx: number,
  cy: number,
  radius: number,
): [number, number][] {
  return VERTEX_ANGLES.map((angle) => [
    cx + radius * Math.cos(angle),
    cy + radius * Math.sin(angle),
  ]);
}

/** 좌표 배열을 SVG points 문자열로 변환 */
function toSvgPoints(points: [number, number][]): string {
  return points.map((p) => p.join(',')).join(' ');
}

// ── 메인 컴포넌트 ──

export default function ScoreRadar({
  financialScore,
  technicalScore,
  newsScore,
  size = 200,
}: ScoreRadarProps) {
  const { colors } = useTheme();

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.35;
  const scores = [financialScore, technicalScore, newsScore];
  const avgScore = (financialScore + technicalScore + newsScore) / 3;
  const fillColor = getScoreColor(avgScore);

  // 점수 삼각형 꼭짓점 (각 축의 점수 비율만큼)
  const scorePoints: [number, number][] = scores.map((score, i) => {
    const ratio = Math.min(Math.max(score, 0), 100) / 100;
    return [
      cx + maxRadius * ratio * Math.cos(VERTEX_ANGLES[i]),
      cy + maxRadius * ratio * Math.sin(VERTEX_ANGLES[i]),
    ];
  });

  // 라벨 위치 (삼각형 바깥)
  const labelRadius = maxRadius + 24;
  const labelPoints = getTrianglePoints(cx, cy, labelRadius);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* ── 배경 그리드 삼각형 ── */}
        {GRID_LEVELS.map((level, idx) => {
          const points = getTrianglePoints(cx, cy, maxRadius * level);
          return (
            <Polygon
              key={`grid-${idx}`}
              points={toSvgPoints(points)}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray={idx < 2 ? '4,4' : undefined}
            />
          );
        })}

        {/* ── 중심→꼭짓점 축선 ── */}
        {getTrianglePoints(cx, cy, maxRadius).map((point, idx) => (
          <Line
            key={`axis-${idx}`}
            x1={cx}
            y1={cy}
            x2={point[0]}
            y2={point[1]}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}

        {/* ── 중심점 ── */}
        <Circle cx={cx} cy={cy} r={2} fill={colors.textTertiary} />

        {/* ── 점수 삼각형 (반투명 채움) ── */}
        <Polygon
          points={toSvgPoints(scorePoints)}
          fill={fillColor}
          fillOpacity={0.2}
          stroke={fillColor}
          strokeWidth={2}
        />

        {/* ── 각 꼭짓점 점수 도트 ── */}
        {scorePoints.map((point, idx) => (
          <Circle
            key={`dot-${idx}`}
            cx={point[0]}
            cy={point[1]}
            r={4}
            fill={getScoreColor(scores[idx])}
          />
        ))}

        {/* ── 라벨 + 점수 ── */}
        {labelPoints.map((point, idx) => (
          <React.Fragment key={`label-${idx}`}>
            <SvgText
              x={point[0]}
              y={point[1] - 6}
              fontSize={11}
              fontWeight="600"
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              {LABELS[idx]}
            </SvgText>
            <SvgText
              x={point[0]}
              y={point[1] + 10}
              fontSize={13}
              fontWeight="700"
              fill={getScoreColor(scores[idx])}
              textAnchor="middle"
            >
              {scores[idx]}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

// ── StyleSheet ──

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
});
