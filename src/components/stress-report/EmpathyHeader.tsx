/**
 * EmpathyHeader — Beat 1: 불안 인정 (Empathy)
 *
 * 역할: "이런 상황이 걱정되시죠" — 사용자의 감정을 먼저 인정하고 안심시킴
 * 블랙록 원칙: 불안을 부정하지 않되, 데이터로 즉시 안심을 제공
 *
 * 언어 규칙: "위기/손실/폭락/공포" 금지 → "조정/하락폭/변동성/불확실성" 사용
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { WhatIfResult } from '../../types/marketplace';

interface EmpathyHeaderProps {
  scenarioLabel: string;
  result: WhatIfResult;
}

export const EmpathyHeader: React.FC<EmpathyHeaderProps> = ({
  scenarioLabel,
  result,
}) => {
  const { colors } = useTheme();

  const changePercent = result.totalImpact.changePercent;
  const defenseScore = getDefenseScore(changePercent);
  const reassuranceMessage = getReassuranceMessage(defenseScore);

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      <Text style={s.emoji}>🛡️</Text>

      <Text style={[s.scenarioLabel, { color: colors.textSecondary }]}>
        만약 이 시나리오가 발생하면
      </Text>

      <Text style={[s.scenarioName, { color: colors.textPrimary }]}>
        {scenarioLabel}
      </Text>

      <View style={s.impactRow}>
        <Text style={[s.impactLabel, { color: colors.textSecondary }]}>
          예상 포트폴리오 영향
        </Text>
        <Text style={[s.impactValue, { color: colors.warning }]}>
          {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
        </Text>
      </View>

      <View style={[s.divider, { backgroundColor: colors.border }]} />

      <View style={s.defenseRow}>
        <View style={s.defenseLeft}>
          <Text style={[s.defenseLabel, { color: colors.textSecondary }]}>
            방어력 점수
          </Text>
          <Text style={[s.defenseScore, { color: getScoreColor(defenseScore, colors.warning) }]}>
            {defenseScore}점
          </Text>
        </View>

        <View style={[s.reassurancePill, { backgroundColor: `${colors.success}15` }]}>
          <Text style={[s.reassuranceText, { color: colors.success }]}>
            {reassuranceMessage}
          </Text>
        </View>
      </View>
    </View>
  );
};

/** 하락폭 기반 방어력 점수 산출 */
function getDefenseScore(changePercent: number): number {
  const absChange = Math.abs(changePercent);
  if (absChange <= 3) return 90;
  if (absChange <= 7) return 75;
  if (absChange <= 12) return 60;
  if (absChange <= 18) return 45;
  return 30;
}

/** 방어력 점수 기반 안심 메시지 */
function getReassuranceMessage(score: number): string {
  if (score >= 80) return '매우 견고한 포트폴리오';
  if (score >= 60) return '양호한 방어력';
  if (score >= 40) return '보강 여지 있음';
  return '방어 전략 확인 필요';
}

/** 점수별 색상 (오렌지 경고 사용, 절대 빨강 아님) */
function getScoreColor(score: number, warningColor: string): string {
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return warningColor;
  return warningColor;
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  scenarioLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  scenarioName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  impactLabel: {
    fontSize: 14,
  },
  impactValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  defenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  defenseLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  defenseLabel: {
    fontSize: 13,
  },
  defenseScore: {
    fontSize: 20,
    fontWeight: '700',
  },
  reassurancePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reassuranceText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
