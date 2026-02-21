/**
 * OneLinerDiagnosis - 한 줄 진단 카드
 *
 * 초보자를 위한 간단한 투자 컨디션 요약.
 * 큰 이모지 + 등급 + 점수로 직관적으로 표현.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { HealthScoreResult } from '../../../services/rebalanceScore';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ThemeColors } from '../../../styles/colors';

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

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, shadows.sm]}>
      <Text style={styles.emoji}>{emoji}</Text>

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {'투자 컨디션: '}
          <Text style={[styles.gradeLabel, { color: healthScore.gradeColor }]}>
            {healthScore.gradeLabel}
          </Text>
        </Text>

        <Text style={styles.score}>
          {healthScore.totalScore}
          <Text style={styles.scoreUnit}>점</Text>
        </Text>
      </View>

      <Text style={styles.summary}>{healthScore.summary}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 17,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  gradeLabel: {
    fontSize: 19,
    fontWeight: '700',
  },
  score: {
    fontSize: 29,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scoreUnit: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  summary: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 4,
  },
});
