/**
 * AccuracyBadge.tsx - 적중률 뱃지
 *
 * 역할: "투자 실력 인증 배지"
 * - 적중률에 따라 다른 색상/아이콘 표시
 * - 80%+: 📊 분석가 (금색)
 * - 60~79%: 🎯 스나이퍼 (은색)
 * - 60% 미만: 표시 안 함 (최소 10회 투표 필요)
 * - 최소 투표 횟수 미달 시 "초보" 배지
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocale } from '../../context/LocaleContext';

interface AccuracyBadgeProps {
  accuracyRate: number;    // 0 ~ 100
  minVotes?: number;       // 최소 투표 횟수 (기본 10)
}

export function AccuracyBadge({ accuracyRate, minVotes = 10 }: AccuracyBadgeProps) {
  const { t } = useLocale();

  // 최소 투표 횟수 미달
  if (minVotes < 10) {
    return (
      <View style={[styles.badge, styles.badgeRookie]}>
        <Text style={styles.badgeEmoji}>🌱</Text>
        <Text style={[styles.badgeText, { color: '#888888' }]}>{t('badges.beginner')}</Text>
      </View>
    );
  }

  // 적중률별 뱃지
  if (accuracyRate >= 80) {
    return (
      <View style={[styles.badge, styles.badgeGold]}>
        <Text style={styles.badgeEmoji}>📊</Text>
        <Text style={[styles.badgeText, { color: '#FFD700' }]}>{t('badges.analyst')}</Text>
      </View>
    );
  }

  if (accuracyRate >= 60) {
    return (
      <View style={[styles.badge, styles.badgeSilver]}>
        <Text style={styles.badgeEmoji}>🎯</Text>
        <Text style={[styles.badgeText, { color: '#C0C0C0' }]}>{t('badges.sniper')}</Text>
      </View>
    );
  }

  // 60% 미만은 뱃지 표시 안 함
  return null;
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },

  // 초보 (최소 투표 미달)
  badgeRookie: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
  },

  // 금색 (80%+)
  badgeGold: {
    backgroundColor: '#2A2010',
    borderColor: '#FFD70040',
  },

  // 은색 (60~79%)
  badgeSilver: {
    backgroundColor: '#1A1A1A',
    borderColor: '#C0C0C040',
  },

  badgeEmoji: {
    fontSize: 15,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
