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
import type { WeeklyReportData } from '../../hooks/useWeeklyReport';

interface WeeklyReportCardProps {
  report: WeeklyReportData;
  colors: any;
  locale: string;
}

/** 주간 성적에 따른 구루 선택 + 코멘트 */
function getWeeklyGuruComment(report: WeeklyReportData, locale: string) {
  const isKo = locale === 'ko';
  const completionRate = report.habitCompleteDays / 7;

  // 완벽 (7/7)
  if (completionRate >= 1) {
    return {
      guruId: 'buffett',
      expression: 'bullish' as const,
      comment: isKo
        ? '완벽한 한 주! 지식의 복리가 쌓이고 있습니다.'
        : 'Perfect week! Your knowledge compounds beautifully.',
    };
  }

  // 우수 (5-6/7)
  if (completionRate >= 0.7) {
    return {
      guruId: 'dalio',
      expression: 'bullish' as const,
      comment: isKo
        ? '꾸준한 한 주였어요. 원칙을 지키는 모습이 인상적입니다.'
        : 'Steady week. Your consistency with principles is impressive.',
    };
  }

  // 보통 (3-4/7)
  if (completionRate >= 0.4) {
    return {
      guruId: 'lynch',
      expression: 'neutral' as const,
      comment: isKo
        ? '괜찮은 한 주! 조금만 더 자주 들러주세요.'
        : 'Not bad! Try to visit a bit more often.',
    };
  }

  // 아쉬움 (1-2/7)
  if (completionRate > 0) {
    return {
      guruId: 'marks',
      expression: 'cautious' as const,
      comment: isKo
        ? '이번 주는 좀 바빴나 봐요. 다음 주엔 더 자주 만나요.'
        : 'Busy week? Let\'s meet more often next week.',
    };
  }

  // 미참여 (0/7)
  return {
    guruId: 'cathie_wood',
    expression: 'cautious' as const,
    comment: isKo
      ? '한 주 동안 못 만났네요. 마을에서 기다리고 있을게요!'
      : 'We missed you this week. I\'ll be waiting in the village!',
  };
}

export function WeeklyReportCard({ report, colors, locale }: WeeklyReportCardProps) {
  const isKo = locale === 'ko';
  const guru = getWeeklyGuruComment(report, locale);
  const guruConfig = GURU_CHARACTER_CONFIGS[guru.guruId];

  const completionRate = Math.round((report.habitCompleteDays / 7) * 100);

  // 7일 진행도 바 데이터
  const dayLabels = isKo
    ? ['월', '화', '수', '목', '금', '토', '일']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerEmoji]}>📋</Text>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {isKo ? '주간 리포트' : 'Weekly Report'}
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
            {isKo ? '습관 완료' : 'Habits'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {report.currentStreak}{isKo ? '일' : 'd'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {isKo ? '연속' : 'Streak'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            Lv.{report.prosperityLevel}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {isKo ? '번영도' : 'Prosperity'}
          </Text>
        </View>
      </View>

      {/* 습관 루프 세부 */}
      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailIcon]}>📰</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {isKo ? `맥락 ${report.cardReadDays}일` : `Cards ${report.cardReadDays}d`}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailIcon]}>🎯</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {isKo ? `예측 ${report.votedDays}일` : `Votes ${report.votedDays}d`}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailIcon]}>📊</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {isKo ? `복기 ${report.reviewedDays}일` : `Review ${report.reviewedDays}d`}
          </Text>
        </View>
      </View>

      {/* 완료율 진행 바 */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {isKo ? '주간 완료율' : 'Weekly completion'}
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
            {isKo ? (guruConfig?.guruName ?? guru.guruId) : (guruConfig?.guruNameEn ?? guru.guruId)}
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
