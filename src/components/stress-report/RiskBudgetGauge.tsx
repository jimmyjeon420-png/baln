/**
 * RiskBudgetGauge — Beat 3c: 리스크 예산 사용률 게이지
 *
 * 역할: "최대 수용 하락폭 -20% 중 -10% 사용 = 50%"
 * SVG 원형 게이지 (PanicShieldCard 패턴 재사용)
 * 0-50% 초록 / 50-80% 오렌지 / 80-100% 빨강
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import type { WhatIfResult } from '../../types/marketplace';

interface RiskBudgetGaugeProps {
  result: WhatIfResult;
  maxTolerancePercent?: number;
}

const SIZE = 140;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = RADIUS * 2 * Math.PI;

export const RiskBudgetGauge: React.FC<RiskBudgetGaugeProps> = ({
  result,
  maxTolerancePercent = 20,
}) => {
  const { colors } = useTheme();

  const absChange = Math.abs(result.totalImpact.changePercent);
  const usagePercent = Math.min(100, (absChange / maxTolerancePercent) * 100);
  const progress = (usagePercent / 100) * CIRCUMFERENCE;
  const gaugeColor = getGaugeColor(usagePercent);
  const statusLabel = getStatusLabel(usagePercent);

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        리스크 예산 사용률
      </Text>

      <View style={s.gaugeContainer}>
        <Svg width={SIZE} height={SIZE}>
          <G rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}>
            {/* 배경 원 */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={colors.border}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* 진행 원 */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={gaugeColor}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>

        {/* 중앙 텍스트 */}
        <View style={s.gaugeCenter}>
          <Text style={[s.gaugeNumber, { color: gaugeColor }]}>
            {Math.round(usagePercent)}%
          </Text>
          <Text style={[s.gaugeLabel, { color: colors.textTertiary }]}>
            사용
          </Text>
        </View>
      </View>

      <View style={s.detailRow}>
        <View style={s.detailItem}>
          <Text style={[s.detailValue, { color: colors.textPrimary }]}>
            -{maxTolerancePercent}%
          </Text>
          <Text style={[s.detailLabel, { color: colors.textTertiary }]}>
            최대 수용 하락폭
          </Text>
        </View>
        <View style={[s.detailDivider, { backgroundColor: colors.border }]} />
        <View style={s.detailItem}>
          <Text style={[s.detailValue, { color: colors.warning }]}>
            -{absChange.toFixed(1)}%
          </Text>
          <Text style={[s.detailLabel, { color: colors.textTertiary }]}>
            현재 시나리오 영향
          </Text>
        </View>
      </View>

      <View style={[s.statusPill, { backgroundColor: `${gaugeColor}15` }]}>
        <Text style={[s.statusText, { color: gaugeColor }]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
};

function getGaugeColor(usagePercent: number): string {
  if (usagePercent <= 50) return '#4CAF50';
  if (usagePercent <= 80) return '#FFB74D';
  return '#CF6679';
}

function getStatusLabel(usagePercent: number): string {
  if (usagePercent <= 30) return '여유 있는 수준 — 추가 하락에도 대응 가능';
  if (usagePercent <= 50) return '적정 수준 — 방어선이 충분합니다';
  if (usagePercent <= 80) return '주의 필요 — 리밸런싱을 고려하세요';
  return '방어선 소진 임박 — 자산 배분 재검토 권장';
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  gaugeContainer: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  gaugeLabel: {
    fontSize: 13,
    marginTop: -2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailDivider: {
    width: 1,
    height: 36,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 12,
  },
  statusPill: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
