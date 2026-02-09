/**
 * MyStatsSection.tsx - 내 예측 통계 섹션
 *
 * 역할: "내 예측 성적표"
 * - 총 투표 / 적중 / 오답
 * - 적중률 (%)
 * - 현재 연속 적중 / 최고 연속 적중
 * - 획득 크레딧 누적
 * - 원형 차트 (적중/오답 비율)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { PredictionUserStats } from '../../types/prediction';

interface MyStatsSectionProps {
  stats: PredictionUserStats;
}

export default function MyStatsSection({ stats }: MyStatsSectionProps) {
  const correctVotes = stats.correct_votes;
  const incorrectVotes = stats.total_votes - stats.correct_votes;
  const accuracyRate = Number(stats.accuracy_rate);

  // 원형 차트 계산 (SVG Circle strokeDasharray)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const correctStrokeDasharray = `${(accuracyRate / 100) * circumference} ${circumference}`;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>나의 예측 기록</Text>

      <View style={styles.content}>
        {/* 원형 차트 */}
        <View style={styles.chartContainer}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            {/* 배경 원 (회색) */}
            <Circle
              cx={60}
              cy={60}
              r={radius}
              stroke="#2A2A2A"
              strokeWidth={10}
              fill="none"
            />
            {/* 적중률 원 (초록색) */}
            <Circle
              cx={60}
              cy={60}
              r={radius}
              stroke="#4CAF50"
              strokeWidth={10}
              fill="none"
              strokeDasharray={correctStrokeDasharray}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            {/* 중앙 텍스트 */}
            <SvgText
              x={60}
              y={55}
              fontSize={24}
              fontWeight="bold"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              {accuracyRate.toFixed(0)}%
            </SvgText>
            <SvgText
              x={60}
              y={72}
              fontSize={11}
              fill="#888888"
              textAnchor="middle"
            >
              적중률
            </SvgText>
          </Svg>
        </View>

        {/* 통계 그리드 */}
        <View style={styles.statsGrid}>
          <StatRow label="총 투표" value={`${stats.total_votes}회`} />
          <StatRow label="적중" value={`${correctVotes}회`} highlight />
          <StatRow label="오답" value={`${incorrectVotes}회`} />
          <StatRow label="현재 연속" value={`${stats.current_streak}회`} highlight={stats.current_streak >= 5} />
          <StatRow label="최고 연속" value={`${stats.best_streak}회`} />
          <StatRow label="획득 크레딧" value={`${stats.total_credits_earned}C`} highlight />
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// 통계 행 컴포넌트
// ============================================================================

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },

  content: {
    flexDirection: 'row',
    gap: 20,
  },

  // 원형 차트
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 통계 그리드
  statsGrid: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#888888',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statValueHighlight: {
    color: '#4CAF50',
  },
});
