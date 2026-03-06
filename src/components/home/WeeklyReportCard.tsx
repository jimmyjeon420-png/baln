/**
 * WeeklyReportCard — 주간 리포트 카드
 *
 * 역할: "매주 받는 성적표" — 최근 7일간 투자 습관 요약
 * - 습관 루프 완료율 (7일 중 N일)
 * - 스트릭 현황
 * - 마을 번영도 레벨
 * - 구루가 한마디 격려 코멘트
 *
 * 배치: 오늘 탭 하단 또는 전체 탭 상단
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import type { WeeklyReportData } from '../../hooks/useWeeklyReport';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

interface WeeklyReportCardProps {
  report: WeeklyReportData;
  colors: ThemeColors;
  locale: string;
}

/** 주간 성적에 따른 구루 선택 + 코멘트 */
function getWeeklyGuruComment(report: WeeklyReportData, t: (key: string) => string) {
  const completionRate = report.habitCompleteDays / 7;

  // 완벽 (7/7)
  if (completionRate >= 1) {
    return {
      guruId: 'buffett',
      expression: 'bullish' as const,
      comment: t('weeklyReport.comment_perfect'),
    };
  }

  // 우수 (5-6/7)
  if (completionRate >= 0.7) {
    return {
      guruId: 'dalio',
      expression: 'bullish' as const,
      comment: t('weeklyReport.comment_excellent'),
    };
  }

  // 보통 (3-4/7)
  if (completionRate >= 0.4) {
    return {
      guruId: 'lynch',
      expression: 'neutral' as const,
      comment: t('weeklyReport.comment_good'),
    };
  }

  // 아쉬움 (1-2/7)
  if (completionRate > 0) {
    return {
      guruId: 'marks',
      expression: 'cautious' as const,
      comment: t('weeklyReport.comment_low'),
    };
  }

  // 미참여 (0/7)
  return {
    guruId: 'cathie_wood',
    expression: 'cautious' as const,
    comment: t('weeklyReport.comment_none'),
  };
}

export function WeeklyReportCard({ report, colors, locale }: WeeklyReportCardProps) {
  const _isKo = locale === 'ko';
  const { t } = useLocale();
  const guru = getWeeklyGuruComment(report, t);
  const _guruConfig = GURU_CHARACTER_CONFIGS[guru.guruId];

  const completionRate = Math.round((report.habitCompleteDays / 7) * 100);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerEmoji]}>📋</Text>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('weekly_report.title')}
          </Text>
          <Text style={[styles.headerPeriod, { color: colors.textTertiary }]}>
            {report.weekStart} ~ {report.weekEnd}
          </Text>
        </View>
      </View>

      {/* 핵심 통계 3칸 */}
      <View style={[styles.statsRow, { backgroundColor: colors.surfaceElevated ?? colors.background }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {report.habitCompleteDays}/7
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {t('weekly_report.stat_habits')}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {report.currentStreak}{t('weekly_report.streak_unit')}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {t('weekly_report.stat_streak')}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            Lv.{report.prosperityLevel}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {t('weekly_report.stat_prosperity')}
          </Text>
        </View>
      </View>

      {/* 습관 루프 세부 */}
      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailIcon]}>📰</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {t('weekly_report.detail_cards', { count: report.cardReadDays })}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailIcon]}>🎯</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {t('weekly_report.detail_votes', { count: report.votedDays })}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailIcon]}>📊</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {t('weekly_report.detail_review', { count: report.reviewedDays })}
          </Text>
        </View>
      </View>

      {/* 완료율 진행 바 */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {t('weekly_report.completion_label')}
          </Text>
          <Text style={[styles.progressPercent, { color: colors.primary }]}>
            {completionRate}%
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: completionRate >= 70 ? colors.primary : colors.warning ?? '#FFA726',
                width: `${completionRate}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* 구루 코멘트 */}
      <View style={[styles.guruComment, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
        <CharacterAvatar
          guruId={guru.guruId}
          size="sm"
          expression={guru.expression}
          animated
        />
        <View style={styles.guruTextBlock}>
          <Text style={[styles.guruName, { color: colors.primary }]}>
            {getGuruDisplayName(guru.guruId)}
          </Text>
          <Text style={[styles.guruCommentText, { color: colors.textPrimary }]}>
            {guru.comment}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerPeriod: {
    fontSize: 12,
    fontWeight: '500',
  },
  // 통계 행
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  // 세부 행
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailIcon: {
    fontSize: 14,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // 진행 바
  progressSection: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // 구루 코멘트
  guruComment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  guruTextBlock: {
    flex: 1,
    gap: 3,
  },
  guruName: {
    fontSize: 11,
    fontWeight: '700',
  },
  guruCommentText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
});
