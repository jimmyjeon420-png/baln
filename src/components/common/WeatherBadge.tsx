/**
 * WeatherBadge — 마을 날씨 배지 컴포넌트
 *
 * 역할: "마을 기상 알림판" — 마을 헤더에 표시되는 작은 날씨 배지
 * - 날씨 이모지 + 기온 + 상태 텍스트 표시
 * - compact 모드: 이모지 + 기온만 (홈 탭 Pulse 등 좁은 공간용)
 * - full 모드: 이모지 + 기온 + 상태 + 의상 힌트
 *
 * 사용처:
 * - 오늘 탭: Pulse 요약 행 (compact)
 * - 마을 탭: 상단 헤더 (full)
 * - 전체 탭: 마을 상태 요약 (compact)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { VillageWeather, ClothingLevel } from '../../types/village';
import type { ThemeColors } from '../../styles/colors';

// ============================================================================
// 타입
// ============================================================================

interface WeatherBadgeProps {
  /** 마을 날씨 데이터 (null = 로딩 중) */
  weather: VillageWeather | null;
  /** 구루 의상 레벨 (기온 기반) */
  clothingLevel?: ClothingLevel;
  /** 컴팩트 모드 (이모지 + 기온만) */
  compact?: boolean;
  /** 테마 색상 */
  colors: ThemeColors;
  /** 로케일 (ko/en) */
  locale?: string;
}

// ============================================================================
// 날씨 매핑
// ============================================================================

/** 날씨 조건 → 한국어 상태 */
const WEATHER_LABEL_KO: Record<string, string> = {
  clear: '맑음',
  cloudy: '흐림',
  clouds: '흐림',
  rain: '비',
  snow: '눈',
  fog: '안개',
  storm: '폭풍',
  thunderstorm: '폭풍',
  windy: '바람',
  rainbow: '무지개',
};

/** 날씨 조건 → 영어 상태 */
const WEATHER_LABEL_EN: Record<string, string> = {
  clear: 'Clear',
  cloudy: 'Cloudy',
  clouds: 'Cloudy',
  rain: 'Rain',
  snow: 'Snow',
  fog: 'Fog',
  storm: 'Storm',
  thunderstorm: 'Storm',
  windy: 'Windy',
  rainbow: 'Rainbow',
};

/** 의상 레벨 → 힌트 텍스트 (ClothingLevel 타입 기반) */
const CLOTHING_HINT_KO: Record<ClothingLevel, string> = {
  arctic: '완전 겨울',
  winter: '겨울옷',
  warm: '가을/봄',
  normal: '쾌적',
  light: '여름',
  summer: '폭염주의',
};

const CLOTHING_HINT_EN: Record<ClothingLevel, string> = {
  arctic: 'Heavy winter',
  winter: 'Winter coat',
  warm: 'Spring/Fall',
  normal: 'Comfortable',
  light: 'Summer',
  summer: 'Heat wave',
};

// ============================================================================
// 컴포넌트
// ============================================================================

const WeatherBadge = React.memo(({
  weather,
  clothingLevel,
  compact = false,
  colors,
  locale = 'ko',
}: WeatherBadgeProps) => {
  // 로딩 상태
  if (!weather) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <Text style={[styles.emoji, compact && styles.emojiCompact]}>
          {'\u2601\uFE0F'}
        </Text>
        <Text style={[styles.tempText, { color: colors.textSecondary }]}>
          --
        </Text>
      </View>
    );
  }

  const isKo = locale === 'ko';
  // village.ts type uses `icon`, weatherService may return `emoji` — handle both
  const extended = weather as VillageWeather & { emoji?: string };
  const weatherEmoji = weather.icon || extended.emoji || '\u2600\uFE0F';
  const weatherLabel = isKo
    ? WEATHER_LABEL_KO[weather.condition] || weather.description || '맑음'
    : WEATHER_LABEL_EN[weather.condition] || 'Clear';
  const tempString = `${Math.round(weather.temperature)}\u00B0C`;

  // 컴팩트 모드: 이모지 + 기온만
  if (compact) {
    return (
      <View style={[styles.container, styles.containerCompact]}>
        <Text style={styles.emojiCompact}>{weatherEmoji}</Text>
        <Text
          style={[styles.tempTextCompact, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {tempString}
        </Text>
      </View>
    );
  }

  // 풀 모드: 이모지 + 기온 + 상태 + 의상 힌트
  const weatherExtended = weather as VillageWeather & { clothingLevel?: ClothingLevel };
  const resolvedClothingLevel = clothingLevel || weatherExtended.clothingLevel;
  const clothingHint = resolvedClothingLevel
    ? (isKo ? CLOTHING_HINT_KO[resolvedClothingLevel] : CLOTHING_HINT_EN[resolvedClothingLevel])
    : null;

  return (
    <View style={[styles.container, styles.containerFull, { backgroundColor: colors.surfaceLight }]}>
      <Text style={styles.emoji}>{weatherEmoji}</Text>
      <View style={styles.textColumn}>
        <View style={styles.topRow}>
          <Text style={[styles.tempText, { color: colors.textPrimary }]}>
            {tempString}
          </Text>
          <Text style={[styles.labelText, { color: colors.textSecondary }]}>
            {weatherLabel}
          </Text>
        </View>
        {clothingHint && (
          <Text
            style={[styles.hintText, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {isKo ? `구루 의상: ${clothingHint}` : `Guru outfit: ${clothingHint}`}
          </Text>
        )}
      </View>
    </View>
  );
});

WeatherBadge.displayName = 'WeatherBadge';

export default WeatherBadge;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerCompact: {
    gap: 4,
  },
  containerFull: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  emoji: {
    fontSize: 22,
  },
  emojiCompact: {
    fontSize: 16,
  },
  textColumn: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tempText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tempTextCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelText: {
    fontSize: 13,
  },
  hintText: {
    fontSize: 12,
    marginTop: 2,
  },
});
