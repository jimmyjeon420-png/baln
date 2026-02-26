/**
 * CityHallHeader — 전체 탭 "시청" 세계관
 *
 * 역할: "마을 시청 안내판" — 전체 탭 상단에서 마을 통계를
 *       한눈에 요약하여 보여줌 (번영도 + 구루 수 + 연속 출석)
 *
 * 비유: 시청 로비에 걸린 "우리 마을 현황" 전광판처럼
 *       마을의 핵심 지표 3가지를 깔끔하게 정리
 *
 * 사용처:
 * - app/(tabs)/profile.tsx 전체 탭 최상단
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  colors: any;
  /** 로케일 (ko/en) */
  locale: string;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function CityHallHeader({
  prosperityLevel = 1,
  guruCount = 10,
  streakDays = 0,
  colors,
  locale,
}: CityHallHeaderProps): React.ReactElement {
  const isKo = locale === 'ko';

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
        {isKo ? '\uD83C\uDFDB 발른 마을 시청' : '\uD83C\uDFDB baln Village City Hall'}
      </Text>

      {/* 통계 3종 */}
      <View style={styles.statsRow}>
        {/* 마을 번영도 레벨 */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {isKo ? '\uD83C\uDFD8 마을' : '\uD83C\uDFD8 Village'}
          </Text>
          <Text style={[styles.statValue, { color: colors.primary ?? '#4CAF50' }]}>
            Lv.{prosperityLevel}
          </Text>
        </View>

        {/* 구루 수 */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {isKo ? '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1 구루' : '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1 Gurus'}
          </Text>
          <Text style={[styles.statValue, { color: colors.primary ?? '#4CAF50' }]}>
            {guruCount}{isKo ? '명' : ''}
          </Text>
        </View>

        {/* 연속 출석 */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {isKo ? '\uD83D\uDD25 연속' : '\uD83D\uDD25 Streak'}
          </Text>
          <Text style={[styles.statValue, { color: colors.primary ?? '#4CAF50' }]}>
            {streakDays}{isKo ? '일' : 'd'}
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
