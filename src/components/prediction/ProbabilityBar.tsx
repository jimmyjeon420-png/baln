/**
 * ProbabilityBar — 예측 확률 바 컴포넌트
 *
 * 역할: "YES vs NO" 확률을 시각적으로 보여주는 부서
 * - 초록색(YES) vs 회색(NO) 양방향 바
 * - 24시간 변동 지표
 * - 좌우 레이블 + 확률 텍스트
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatProbability, formatProbabilityChange } from '../../hooks/usePredictionFeed';

// ============================================================================
// Props
// ============================================================================

interface ProbabilityBarProps {
  probability: number;        // 0~1
  change24h: number | null;   // 확률 변동
  yesLabel?: string;
  noLabel?: string;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function ProbabilityBar({
  probability,
  change24h,
  yesLabel = 'YES',
  noLabel = 'NO',
}: ProbabilityBarProps) {
  const { colors } = useTheme();

  const yesPct = Math.max(0, Math.min(1, probability));
  const noPct = 1 - yesPct;
  const changeText = formatProbabilityChange(change24h);
  const isPositiveChange = change24h !== null && change24h > 0;
  const isNegativeChange = change24h !== null && change24h < 0;

  return (
    <View style={styles.container}>
      {/* 레이블 행: YES XX%  ...  XX% NO */}
      <View style={styles.labelRow}>
        <View style={styles.yesLabelGroup}>
          <Text style={[styles.sideLabel, { color: YES_COLOR }]}>{yesLabel}</Text>
          <Text style={[styles.probability, { color: YES_COLOR }]}>
            {formatProbability(yesPct)}
          </Text>
        </View>
        <View style={styles.noLabelGroup}>
          <Text style={[styles.probability, { color: colors.textSecondary }]}>
            {formatProbability(noPct)}
          </Text>
          <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>{noLabel}</Text>
        </View>
      </View>

      {/* 확률 바 */}
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceLight }]}>
        <View style={[styles.barFill, { width: `${yesPct * 100}%` }]} />
      </View>

      {/* 24시간 변동 지표 */}
      {changeText.length > 0 && (
        <Text style={[
          styles.changeText,
          {
            color: isPositiveChange
              ? YES_COLOR
              : isNegativeChange
                ? NO_COLOR
                : colors.textTertiary,
          },
        ]}>
          {changeText}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// 상수
// ============================================================================

const YES_COLOR = '#4CAF50';
const NO_COLOR = '#F44336';

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yesLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sideLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  probability: {
    fontSize: 16,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: YES_COLOR,
    borderRadius: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
