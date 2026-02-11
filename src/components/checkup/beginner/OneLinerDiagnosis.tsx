/**
 * OneLinerDiagnosis - 한 줄 진단 카드
 *
 * 초보자를 위한 간단한 투자 컨디션 요약.
 * 큰 이모지 + 등급 + 점수로 직관적으로 표현.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { HealthScoreResult } from '../../../services/rebalanceScore';
import { useTheme } from '../../../contexts/ThemeContext';

interface OneLinerDiagnosisProps {
  healthScore: HealthScoreResult;
}

const GRADE_EMOJI: Record<HealthScoreResult['grade'], string> = {
  S: '\uD83C\uDFC6',
  A: '\uD83D\uDE0A',
  B: '\uD83D\uDE10',
  C: '\uD83D\uDE1F',
  D: '\uD83D\uDE30',
};

export default function OneLinerDiagnosis({ healthScore }: OneLinerDiagnosisProps) {
  const { colors, shadows } = useTheme();
  const emoji = GRADE_EMOJI[healthScore.grade];

  return (
    <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border, ...shadows.medium }]}>
      <Text style={s.emoji}>{emoji}</Text>

      <View style={s.textContainer}>
        <Text style={[s.title, { color: colors.textSecondary }]}>
          {'투자 컨디션: '}
          <Text style={[s.gradeLabel, { color: healthScore.gradeColor }]}>
            {healthScore.gradeLabel}
          </Text>
        </Text>

        <Text style={[s.score, { color: colors.textPrimary }]}>
          {healthScore.totalScore}
          <Text style={[s.scoreUnit, { color: colors.textSecondary }]}>점</Text>
        </Text>
      </View>

      <Text style={[s.summary, { color: colors.textSecondary }]}>{healthScore.summary}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    // backgroundColor: '#141414', // → colors.cardBackground
    borderRadius: 16,
    borderWidth: 1,
    // borderColor: '#2A2A2A', // → colors.border
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    // color: '#B0B0B0', // → colors.textSecondary
    marginBottom: 4,
  },
  gradeLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  score: {
    fontSize: 28,
    fontWeight: '700',
    // color: '#FFFFFF', // → colors.textPrimary
  },
  scoreUnit: {
    fontSize: 16,
    fontWeight: '400',
    // color: '#B0B0B0', // → colors.textSecondary
  },
  summary: {
    fontSize: 14,
    // color: '#B0B0B0', // → colors.textSecondary
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
});
