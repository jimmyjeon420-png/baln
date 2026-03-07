/**
 * 분석 탭 헤더 컴포넌트
 *
 * 역할: AI 진단 결과를 한 줄로 요약 + 건강 등급 뱃지
 * 비유: 건강검진 결과지 맨 위 "종합 소견" 섹션
 *
 * 표시 내용:
 * - 건강 등급 (S/A/B/C/D) + 색상 뱃지
 * - 한 줄 요약 ("포트폴리오 건강 A등급, 집중도 주의")
 * - Panic Shield 점수 (간단 표시)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HealthScoreResult } from '../../services/rebalanceScore';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import type { ThemeColors } from '../../styles/colors';

interface CheckupHeaderProps {
  /** 건강 점수 (6팩터) */
  healthScore: HealthScoreResult;
  /** Panic Shield 점수 (0-100) */
  panicScore?: number;
  /** Panic Shield 이유 (선택) */
  panicReason?: string;
  /** 총 자산 */
  totalAssets: number;
}

/**
 * 건강 등급별 아이콘
 */
const GRADE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  S: 'trophy',
  A: 'checkmark-circle',
  B: 'alert-circle',
  C: 'warning',
  D: 'close-circle',
};

/**
 * 건강 등급별 한 줄 요약 생성
 */
function generateSummary(healthScore: HealthScoreResult, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (healthScore.summary) return healthScore.summary;

  const { grade } = healthScore;
  const warnings = healthScore.factors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((f: any) => f.score < 60)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((f: any) => f.label);

  if (warnings.length === 0) {
    return t('checkup.header.summary_all_good', { grade });
  } else if (warnings.length === 1) {
    return t('checkup.header.summary_one_warn', { grade, warning: warnings[0] });
  } else if (warnings.length === 2) {
    return t('checkup.header.summary_two_warn', { grade, w1: warnings[0], w2: warnings[1] });
  } else {
    return t('checkup.header.summary_multi_warn', { grade, count: warnings.length });
  }
}

function getGradeColor(grade: string, colors: ThemeColors): string {
  const gradeColors: Record<string, string> = {
    S: colors.primaryDark ?? colors.primary,
    A: colors.info,
    B: colors.warning,
    C: colors.error,
    D: colors.error,
  };
  return gradeColors[grade] ?? colors.textPrimary;
}

export default function CheckupHeader({
  healthScore,
  panicScore,
  panicReason,
  totalAssets,
}: CheckupHeaderProps) {
  const { colors, shadows } = useTheme();
  const { t } = useLocale();
  const gradeColor = healthScore.gradeColor || getGradeColor(healthScore.grade, colors);
  const gradeIcon = GRADE_ICONS[healthScore.grade];
  const summary = generateSummary(healthScore, t);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const getPanicReason = (): string => {
    if (panicReason) return panicReason;
    if (!panicScore) return '';
    if (panicScore >= 70) return t('checkup.header.panic_reason_high');
    if (panicScore >= 50) return t('checkup.header.panic_reason_mid');
    return t('checkup.header.panic_reason_low');
  };

  const formatAssets = (amount: number): string => {
    if (amount >= 100_000_000) {
      const eok = Math.floor(amount / 100_000_000);
      const man = Math.floor((amount % 100_000_000) / 10_000);
      return man > 0
        ? t('checkup.header.eok_man', { eok, man })
        : t('checkup.header.eok_only', { eok });
    } else if (amount >= 10_000) {
      return t('checkup.header.man_only', { man: Math.floor(amount / 10_000) });
    } else {
      return t('checkup.header.won_only', { amount: Math.floor(amount).toLocaleString() });
    }
  };

  return (
    <View style={[styles.container, shadows.md]}>
      <View style={styles.gradeSection}>
        <View style={[styles.gradeBadge, { backgroundColor: `${gradeColor}20` }]}>
          <Ionicons name={gradeIcon} size={28} color={gradeColor} />
          <Text style={[styles.gradeText, { color: gradeColor }]}>{healthScore.grade}</Text>
        </View>
        <View style={styles.gradeInfo}>
          <Text style={styles.scoreText}>{Math.round(healthScore.totalScore)}{t('checkup.header.score_suffix')}</Text>
          <Text style={styles.totalAssetsText}>{formatAssets(totalAssets)}</Text>
        </View>
      </View>
      <View style={styles.summarySection}>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>
      {panicScore !== undefined && (
        <View style={styles.panicSection}>
          <View style={styles.panicRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryDark ?? colors.primary} />
            <Text style={styles.panicLabel}>{t('checkup.header.panic_label')}</Text>
            <Text style={[styles.panicScore, { color: colors.primaryDark ?? colors.primary }]}>
              {Math.round(panicScore)}{t('checkup.header.score_suffix')}
            </Text>
            <Text style={[styles.panicDesc, {
              color: panicScore >= 70 ? '#4CAF50' : panicScore >= 50 ? '#FFB74D' : '#CF6679'
            }]}>
              {panicScore >= 70 ? t('checkup.header.panic_stable') : panicScore >= 50 ? t('checkup.header.panic_moderate') : t('checkup.header.panic_caution')}
            </Text>
          </View>
          <Text style={styles.panicReason}>{getPanicReason()}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { marginHorizontal: 16, marginVertical: 12, padding: 20, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  gradeSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  gradeBadge: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  gradeText: { fontSize: 19, fontWeight: '800', marginTop: 2 },
  gradeInfo: { flex: 1 },
  scoreText: { fontSize: 29, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  totalAssetsText: { fontSize: 15, color: colors.textSecondary },
  summarySection: { paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  summaryText: { fontSize: 16, color: colors.textPrimary, lineHeight: 24 },
  panicSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  panicRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  panicLabel: { fontSize: 14, color: colors.textSecondary, marginLeft: 6 },
  panicScore: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
  panicDesc: { fontSize: 14, color: colors.textSecondary, marginLeft: 4, flexShrink: 1 },
  panicReason: { fontSize: 14, color: colors.textTertiary, marginLeft: 22, fontStyle: 'italic', lineHeight: 20 },
});
