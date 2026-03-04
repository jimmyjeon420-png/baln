import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

interface DailyProgressBannerProps {
  currentStreak: number;
  todayProgress: {
    cardRead: boolean;
    voted: boolean;
    reviewed: boolean;
  };
  creditBalance?: number | null;
}

const STEP_KEYS: { key: keyof DailyProgressBannerProps['todayProgress']; labelKey: string }[] = [
  { key: 'cardRead', labelKey: 'daily_progress.step_read' },
  { key: 'voted',    labelKey: 'daily_progress.step_vote' },
  { key: 'reviewed', labelKey: 'daily_progress.step_review' },
];

const GREEN = '#4CAF50';

const DailyProgressBanner = React.memo(({
  currentStreak,
  todayProgress,
  creditBalance: _creditBalance,
}: DailyProgressBannerProps) => {
  const { colors } = useTheme();
  const { t } = useLocale();

  const completedCount = STEP_KEYS.filter(s => todayProgress[s.key]).length;
  const allDone = completedCount === STEP_KEYS.length;

  return (
    <View
      style={[
        styles.container,
        allDone && styles.containerAllDone,
      ]}
    >
      {/* 왼쪽: 스트릭 */}
      <View style={styles.streakRow}>
        <Text style={styles.fireEmoji}>🔥</Text>
        <Text style={[styles.streakNumber, { color: GREEN }]}>{currentStreak}</Text>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{t('daily_progress.consecutive_days')}</Text>
      </View>

      {/* allDone 표시 */}
      {allDone && (
        <Text style={[styles.allDoneText, { color: GREEN }]}>{t('daily_progress.all_done')}</Text>
      )}
    </View>
  );
});

export default DailyProgressBanner;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  containerAllDone: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 8,
  },

  // 스트릭 영역
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  fireEmoji: {
    fontSize: 17,
    lineHeight: 21,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 21,
  },

  allDoneText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
});
