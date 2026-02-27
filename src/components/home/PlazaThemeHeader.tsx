/**
 * PlazaThemeHeader — 오늘 탭 헤더
 *
 * 기능:
 * - 브리핑 타이틀 표시
 * - 현재 날씨 이모지 + 온도
 * - KST 시간 표시
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { t } from '../../locales';

// ============================================================================
// Props
// ============================================================================

interface PlazaThemeHeaderProps {
  /** @deprecated Use t() from locales instead. Kept for backward compatibility. */
  locale?: string;
  weatherEmoji?: string;
  temperature?: number;
  colors: {
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
  };
}

// ============================================================================
// Helpers
// ============================================================================

function getKSTTimeString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60000);
  const h = kst.getHours();
  const m = kst.getMinutes().toString().padStart(2, '0');
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

function getTimeOfDayEmoji(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60000);
  const h = kst.getHours();
  if (h >= 5 && h < 8) return '🌅';
  if (h >= 8 && h < 17) return '☀️';
  if (h >= 17 && h < 20) return '🌇';
  return '🌙';
}

// ============================================================================
// Component
// ============================================================================

export function PlazaThemeHeader({
  weatherEmoji,
  temperature,
  colors,
}: PlazaThemeHeaderProps) {
  const timeStr = getKSTTimeString();
  const timeEmoji = getTimeOfDayEmoji();

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('home.plaza.title')}
        </Text>
      </View>
      <View style={styles.rightCol}>
        {weatherEmoji && (
          <Text style={[styles.weather, { color: colors.textSecondary }]}>
            {weatherEmoji} {temperature != null ? `${Math.round(temperature)}°` : ''}
          </Text>
        )}
        <Text style={[styles.time, { color: colors.textTertiary }]}>
          {timeEmoji} {timeStr}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leftCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  weather: {
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
  },
});
