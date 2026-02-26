/**
 * PlazaThemeHeader — 오늘 탭 광장 테마 헤더
 *
 * 역할: "마을 광장 안내판" — 오늘 탭 상단에 마을 분위기 표시
 * 비유: 마을 광장 입구의 "발른 광장" 간판 + 날씨 정보
 *
 * 기능:
 * - "발른 광장" 타이틀
 * - 현재 날씨 이모지 + 온도
 * - 마을 시간 표시
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// ============================================================================
// i18n
// ============================================================================

const TEXT = {
  ko: {
    title: '발른 광장',
    villageTime: '마을 시간',
  },
  en: {
    title: 'Baln Plaza',
    villageTime: 'Village Time',
  },
};

// ============================================================================
// Props
// ============================================================================

interface PlazaThemeHeaderProps {
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
  locale = 'ko',
  weatherEmoji,
  temperature,
  colors,
}: PlazaThemeHeaderProps) {
  const isKo = locale === 'ko';
  const t = isKo ? TEXT.ko : TEXT.en;
  const timeStr = getKSTTimeString();
  const timeEmoji = getTimeOfDayEmoji();

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          🏛️ {t.title}
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
