import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface DailyProgressBannerProps {
  currentStreak: number;
  todayProgress: {
    cardRead: boolean;
    voted: boolean;
    reviewed: boolean;
  };
  creditBalance?: number | null;
}

const STEPS: Array<{ key: keyof DailyProgressBannerProps['todayProgress']; label: string }> = [
  { key: 'cardRead', label: '읽기' },
  { key: 'voted',    label: '투표' },
  { key: 'reviewed', label: '복기' },
];

const GREEN = '#4CAF50';

const DailyProgressBanner = React.memo(function DailyProgressBanner({
  currentStreak,
  todayProgress,
  creditBalance,
}: DailyProgressBannerProps) {
  const { colors } = useTheme();

  const completedCount = STEPS.filter(s => todayProgress[s.key]).length;
  const allDone = completedCount === STEPS.length;

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
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>일 연속</Text>
      </View>

      {/* 가운데: 크레딧 잔액 (잔액이 있을 때만 표시) */}
      {creditBalance != null && creditBalance > 0 && (
        <View style={styles.creditRow}>
          <Text style={[styles.creditSeparator, { color: colors.textTertiary }]}>|</Text>
          <Text style={styles.creditText}>💎 {creditBalance}C</Text>
        </View>
      )}

      {/* 오른쪽: 진행 단계 */}
      <View style={styles.progressSection}>
        {allDone ? (
          <Text style={[styles.allDoneText, { color: GREEN }]}>오늘 완료!</Text>
        ) : (
          <Text style={[styles.progressCount, { color: colors.textTertiary }]}>
            {completedCount}/3 완료
          </Text>
        )}
        <View style={styles.dotsRow}>
          {STEPS.map(step => {
            const done = todayProgress[step.key];
            return (
              <View key={step.key} style={styles.dotWrapper}>
                <View
                  style={[
                    styles.dot,
                    done
                      ? { backgroundColor: GREEN, borderColor: GREEN }
                      : { backgroundColor: 'transparent', borderColor: colors.textTertiary },
                  ]}
                />
                <Text style={[styles.dotLabel, { color: colors.textTertiary }]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
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

  // 크레딧 잔액 영역
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditSeparator: {
    fontSize: 13,
    lineHeight: 21,
  },
  creditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFC107',
    lineHeight: 21,
  },

  // 진행 단계 영역
  progressSection: {
    alignItems: 'flex-end',
    gap: 2,
  },
  progressCount: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  allDoneText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotWrapper: {
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 12,
  },
});
