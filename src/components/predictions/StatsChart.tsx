/**
 * StatsChart.tsx - 투자 예측 통계 차트
 *
 * 역할: "차트 디자이너 - 예측 성과 시각화"
 * 비유: 운동선수의 시즌 성적표 (적중률/카테고리별/크레딧 누적)
 *
 * 3가지 차트:
 *   1. 주간/월간 적중률 그래프 (Line Chart) - 시간에 따른 실력 향상 추이
 *   2. 카테고리별 정확도 분석 (Bar Chart) - 어떤 분야가 강한지 시각화
 *   3. 크레딧 획득 히스토리 (Area Chart) - 누적 수익 성장 곡선
 *
 * 기술:
 *   - SVG (react-native-svg) 기반 네이티브 차트
 *   - TanStack Query 데이터 구독
 *   - 탭 전환으로 3개 차트 토글
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, { Line, Rect, Circle, Path, Text as SvgText } from 'react-native-svg';
import { COLORS, SIZES, TYPOGRAPHY, SHADOWS } from '../../styles/theme';
import {
  useMyPredictionStats,
  useResolvedPollsWithMyVotes,
} from '../../hooks/usePredictions';
import {
  PollWithMyVote,
  POLL_CATEGORY_INFO,
  PollCategory,
} from '../../types/prediction';

// ============================================================================
// 타입 정의
// ============================================================================

type ChartTab = 'accuracy' | 'category' | 'credits';

interface DataPoint {
  date: string;   // YYYY-MM-DD
  value: number;  // 적중률(%) 또는 크레딧
}

interface CategoryData {
  category: PollCategory;
  accuracy: number;  // 0-100
  total: number;
  correct: number;
}

// ============================================================================
// StatsChart 메인 컴포넌트
// ============================================================================

export default function StatsChart() {
  const [activeTab, setActiveTab] = useState<ChartTab>('accuracy');

  // 데이터 로딩
  const { data: stats, isLoading: statsLoading } = useMyPredictionStats();
  const { data: resolvedPolls, isLoading: pollsLoading } = useResolvedPollsWithMyVotes(30);

  const isLoading = statsLoading || pollsLoading;

  // 차트 데이터 계산
  const chartData = useMemo(() => {
    if (!resolvedPolls || resolvedPolls.length === 0) {
      return { accuracy: [], category: [], credits: [] };
    }

    // 내가 투표한 것만 필터링
    const myPolls = resolvedPolls.filter(p => p.myVote !== null);

    // 1. 주간/월간 적중률 데이터 (최근 30일)
    const accuracyData = calculateAccuracyTimeSeries(myPolls);

    // 2. 카테고리별 정확도
    const categoryData = calculateCategoryAccuracy(myPolls);

    // 3. 크레딧 누적 히스토리
    const creditsData = calculateCreditsCumulative(myPolls);

    return { accuracy: accuracyData, category: categoryData, credits: creditsData };
  }, [resolvedPolls]);

  // 탭 전환
  const tabs: { key: ChartTab; label: string; emoji: string }[] = [
    { key: 'accuracy', label: '적중률', emoji: '📊' },
    { key: 'category', label: '카테고리', emoji: '🎯' },
    { key: 'credits', label: '크레딧', emoji: '💰' },
  ];

  // 로딩 상태
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>차트 데이터 로딩 중...</Text>
      </View>
    );
  }

  // 데이터 없음
  if (!stats || stats.total_votes === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>아직 투표 기록이 없습니다</Text>
        <Text style={styles.emptySubtext}>
          첫 예측에 참여하고{'\n'}통계 차트를 확인해보세요!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 탭 헤더 */}
      <View style={styles.tabContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 차트 렌더링 */}
      <View style={styles.chartContainer}>
        {activeTab === 'accuracy' && (
          <AccuracyChart data={chartData.accuracy} />
        )}
        {activeTab === 'category' && (
          <CategoryChart data={chartData.category} />
        )}
        {activeTab === 'credits' && (
          <CreditsChart data={chartData.credits} />
        )}
      </View>
    </View>
  );
}

// ============================================================================
// 1. 적중률 라인 차트
// ============================================================================

interface AccuracyChartProps {
  data: DataPoint[];
}

function AccuracyChart({ data }: AccuracyChartProps) {
  const width = Dimensions.get('window').width - 64; // padding 32 * 2
  const height = 200;
  const padding = 40;

  if (data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>아직 데이터가 부족합니다</Text>
        <Text style={styles.emptyChartSubtext}>더 많은 예측에 참여해주세요</Text>
      </View>
    );
  }

  // 평균 계산
  const avgAccuracy = data.reduce((sum, d) => sum + d.value, 0) / data.length;

  // 좌표 계산
  const xStep = (width - padding * 2) / Math.max(data.length - 1, 1);
  const yScale = (height - padding * 2) / 100; // 0-100%

  const points = data.map((d, i) => ({
    x: padding + i * xStep,
    y: height - padding - d.value * yScale,
  }));

  // Path 생성 (라인)
  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, '');

  return (
    <View>
      <Text style={styles.chartTitle}>최근 적중률 추이</Text>
      <Text style={styles.chartSubtitle}>평균: {avgAccuracy.toFixed(1)}%</Text>

      <Svg width={width} height={height}>
        {/* Y축 그리드 라인 (0, 25, 50, 75, 100%) */}
        {[0, 25, 50, 75, 100].map(tick => {
          const y = height - padding - tick * yScale;
          return (
            <React.Fragment key={tick}>
              <Line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={COLORS.border}
                strokeWidth={1}
                strokeDasharray={tick === 50 ? '0' : '4,4'}
              />
              <SvgText
                x={padding - 8}
                y={y + 4}
                fontSize={10}
                fill={COLORS.textSecondary}
                textAnchor="end"
              >
                {tick}%
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* 평균선 (점선) */}
        <Line
          x1={padding}
          y1={height - padding - avgAccuracy * yScale}
          x2={width - padding}
          y2={height - padding - avgAccuracy * yScale}
          stroke={COLORS.warning}
          strokeWidth={2}
          strokeDasharray="6,4"
        />

        {/* 라인 차트 */}
        <Path
          d={linePath}
          stroke={COLORS.primary}
          strokeWidth={3}
          fill="none"
        />

        {/* 데이터 포인트 */}
        {points.map((point, i) => (
          <Circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={5}
            fill={COLORS.primary}
            stroke={COLORS.background}
            strokeWidth={2}
          />
        ))}

        {/* X축 레이블 (첫날, 중간, 마지막) */}
        {[0, Math.floor(data.length / 2), data.length - 1].map(i => {
          if (i >= data.length) return null;
          const point = points[i];
          const date = new Date(data[i].date);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          return (
            <SvgText
              key={i}
              x={point.x}
              y={height - padding + 20}
              fontSize={10}
              fill={COLORS.textSecondary}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

// ============================================================================
// 2. 카테고리 막대 차트
// ============================================================================

interface CategoryChartProps {
  data: CategoryData[];
}

function CategoryChart({ data }: CategoryChartProps) {
  const width = Dimensions.get('window').width - 64;
  const height = 200;
  const padding = 40;

  if (data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>카테고리별 데이터 부족</Text>
        <Text style={styles.emptyChartSubtext}>다양한 주제에 참여해보세요</Text>
      </View>
    );
  }

  const barWidth = (width - padding * 2) / data.length - 10;
  const yScale = (height - padding * 2) / 100;

  return (
    <View>
      <Text style={styles.chartTitle}>카테고리별 정확도</Text>
      <Text style={styles.chartSubtitle}>각 분야별 적중률</Text>

      <Svg width={width} height={height}>
        {/* Y축 그리드 */}
        {[0, 25, 50, 75, 100].map(tick => {
          const y = height - padding - tick * yScale;
          return (
            <React.Fragment key={tick}>
              <Line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={COLORS.border}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={padding - 8}
                y={y + 4}
                fontSize={10}
                fill={COLORS.textSecondary}
                textAnchor="end"
              >
                {tick}%
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* 막대 그래프 */}
        {data.map((item, i) => {
          const x = padding + i * (barWidth + 10);
          const barHeight = item.accuracy * yScale;
          const y = height - padding - barHeight;
          const color = POLL_CATEGORY_INFO[item.category].color;

          return (
            <React.Fragment key={item.category}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
              />
              {/* 퍼센트 라벨 */}
              <SvgText
                x={x + barWidth / 2}
                y={y - 8}
                fontSize={12}
                fill={COLORS.textPrimary}
                fontWeight="bold"
                textAnchor="middle"
              >
                {item.accuracy.toFixed(0)}%
              </SvgText>
              {/* 카테고리 라벨 */}
              <SvgText
                x={x + barWidth / 2}
                y={height - padding + 20}
                fontSize={10}
                fill={COLORS.textSecondary}
                textAnchor="middle"
              >
                {POLL_CATEGORY_INFO[item.category].emoji}
              </SvgText>
              {/* 투표 수 */}
              <SvgText
                x={x + barWidth / 2}
                y={height - padding + 35}
                fontSize={9}
                fill={COLORS.textTertiary}
                textAnchor="middle"
              >
                {item.correct}/{item.total}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// ============================================================================
// 3. 크레딧 누적 차트 (Area Chart)
// ============================================================================

interface CreditsChartProps {
  data: DataPoint[];
}

function CreditsChart({ data }: CreditsChartProps) {
  const width = Dimensions.get('window').width - 64;
  const height = 200;
  const padding = 40;

  if (data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>크레딧 획득 기록 없음</Text>
        <Text style={styles.emptyChartSubtext}>첫 정답을 맞춰보세요!</Text>
      </View>
    );
  }

  const maxCredits = Math.max(...data.map(d => d.value), 10);
  const xStep = (width - padding * 2) / Math.max(data.length - 1, 1);
  const yScale = (height - padding * 2) / maxCredits;

  const points = data.map((d, i) => ({
    x: padding + i * xStep,
    y: height - padding - d.value * yScale,
  }));

  // Area Path (채워진 영역)
  const areaPath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${height - padding} L ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, '') + ` L ${points[points.length - 1].x} ${height - padding} Z`;

  // Line Path (테두리)
  const linePath = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, '');

  return (
    <View>
      <Text style={styles.chartTitle}>크레딧 누적 그래프</Text>
      <Text style={styles.chartSubtitle}>
        총 획득: {data[data.length - 1]?.value || 0}C
      </Text>

      <Svg width={width} height={height}>
        {/* Y축 그리드 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const tick = Math.round(maxCredits * ratio);
          const y = height - padding - tick * yScale;
          return (
            <React.Fragment key={i}>
              <Line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={COLORS.border}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={padding - 8}
                y={y + 4}
                fontSize={10}
                fill={COLORS.textSecondary}
                textAnchor="end"
              >
                {tick}C
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Area (채움) */}
        <Path
          d={areaPath}
          fill={`${COLORS.primary}40`} // 25% opacity
        />

        {/* Line (테두리) */}
        <Path
          d={linePath}
          stroke={COLORS.primary}
          strokeWidth={3}
          fill="none"
        />

        {/* 데이터 포인트 */}
        {points.map((point, i) => (
          <Circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={COLORS.primary}
            stroke={COLORS.background}
            strokeWidth={2}
          />
        ))}

        {/* X축 레이블 */}
        {[0, Math.floor(data.length / 2), data.length - 1].map(i => {
          if (i >= data.length) return null;
          const point = points[i];
          const date = new Date(data[i].date);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          return (
            <SvgText
              key={i}
              x={point.x}
              y={height - padding + 20}
              fontSize={10}
              fill={COLORS.textSecondary}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

// ============================================================================
// 데이터 계산 유틸리티
// ============================================================================

/** 일별 적중률 계산 (최근 30일) */
function calculateAccuracyTimeSeries(polls: PollWithMyVote[]): DataPoint[] {
  // 날짜별 그룹핑
  const byDate: Record<string, { correct: number; total: number }> = {};

  polls.forEach(poll => {
    if (!poll.resolved_at) return;
    const date = poll.resolved_at.split('T')[0]; // YYYY-MM-DD
    if (!byDate[date]) {
      byDate[date] = { correct: 0, total: 0 };
    }
    byDate[date].total += 1;
    if (poll.myIsCorrect === true) {
      byDate[date].correct += 1;
    }
  });

  // 최근 30일 필터링 및 정렬
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result: DataPoint[] = Object.entries(byDate)
    .filter(([date]) => new Date(date) >= thirtyDaysAgo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      value: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }));

  return result;
}

/** 카테고리별 정확도 계산 */
function calculateCategoryAccuracy(polls: PollWithMyVote[]): CategoryData[] {
  const categories: PollCategory[] = ['stocks', 'crypto', 'macro', 'event'];

  return categories.map(category => {
    const categoryPolls = polls.filter(p => p.category === category);
    const total = categoryPolls.length;
    const correct = categoryPolls.filter(p => p.myIsCorrect === true).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return { category, accuracy, total, correct };
  }).filter(c => c.total > 0); // 데이터 있는 카테고리만
}

/** 크레딧 누적 계산 (일별) */
function calculateCreditsCumulative(polls: PollWithMyVote[]): DataPoint[] {
  // 날짜별 크레딧 합산
  const byDate: Record<string, number> = {};

  polls.forEach(poll => {
    if (!poll.resolved_at || poll.myCreditsEarned === 0) return;
    const date = poll.resolved_at.split('T')[0];
    byDate[date] = (byDate[date] || 0) + poll.myCreditsEarned;
  });

  // 누적 합산 및 정렬
  const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;

  return sorted.map(([date, credits]) => {
    cumulative += credits;
    return { date, value: cumulative };
  });
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.card.padding,
    ...SHADOWS.medium,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.md,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // 탭
  tabContainer: {
    flexDirection: 'row',
    marginBottom: SIZES.lg,
    gap: SIZES.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.rMd,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  tabEmoji: {
    fontSize: SIZES.fLg,
    marginRight: SIZES.xs,
  },
  tabLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },

  // 차트
  chartContainer: {
    marginTop: SIZES.md,
  },
  chartTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  chartSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.rMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyChartText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  emptyChartSubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textTertiary,
  },
});
