/**
 * CityHallHeader — 전체 탭 헤더
 *
 * 기능: 계정 현황 요약 (활동 레벨 + 거장 수 + 연속 출석)
 *
 * 사용처: app/(tabs)/profile.tsx 전체 탭 최상단
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '../../locales';
import type { ThemeColors } from '../../styles/colors';

// =============================================================================
// 타입 정의
// =============================================================================

interface CityHallHeaderProps {
  /** 현재 마을 번영도 레벨 (1~10) */
  prosperityLevel?: number;
  /** 구루 수 */
  guruCount?: number;
  /** 사용자 연속 출석일 */
  streakDays?: number;
  /** 테마 색상 */
  colors: ThemeColors;
  /** @deprecated Use t() from locales instead. Kept for backward compatibility. */
  locale?: string;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function CityHallHeader({
  prosperityLevel = 1,
  guruCount = 10,
  streakDays = 0,
  colors,
}: CityHallHeaderProps): React.ReactElement {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.primary ?? '#4CAF50',
        },
      ]}
    >
      {/* 시청 간판 */}
      <Text style={[styles.signText, { color: colors.textPrimary }]}>
        {t('profile.city_hall.sign')}
      </Text>

      {/* 통계 3종 */}
      <View style={styles.statsRow}>
        {/* 마을 번영도 레벨 */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {t('profile.city_hall.village_label')}
          </Text>
          <Text style={[styles.statValue, { color: colors.primary ?? '#4CAF50' }]}>
            Lv.{prosperityLevel}
          </Text>
        </View>

        {/* 구루 수 */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {t('profile.city_hall.gurus_label')}
          </Text>
          <Text style={[styles.statValue, { color: colors.primary ?? '#4CAF50' }]}>
            {guruCount}{t('profile.city_hall.guru_count_suffix')}
          </Text>
        </View>

        {/* 연속 출석 */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {t('profile.city_hall.streak_label')}
          </Text>
          <Text style={[styles.statValue, { color: colors.primary ?? '#4CAF50' }]}>
            {streakDays}{t('profile.city_hall.streak_day_suffix')}
          </Text>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
  },
  signText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CityHallHeader;
