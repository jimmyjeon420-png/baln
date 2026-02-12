import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../styles/theme';
import { SkeletonBlock } from '../SkeletonLoader';

// ============================================================================
// 타입 정의
// ============================================================================

interface DailyBriefingCardProps {
  cfoWeather: { emoji: string; message: string; status: string } | null;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  isLoading: boolean;
}

// 센티먼트 → 한국어 + 색상
function getSentimentChip(sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') {
  switch (sentiment) {
    case 'BULLISH':
      return { label: '강세', color: COLORS.primary, bgColor: 'rgba(76,175,80,0.15)' };
    case 'BEARISH':
      return { label: '약세', color: COLORS.error, bgColor: 'rgba(207,102,121,0.15)' };
    default:
      return { label: '보합', color: COLORS.neutral, bgColor: 'rgba(158,158,158,0.15)' };
  }
}

// ============================================================================
// DailyBriefingCard — 오늘의 브리핑 (시장 뉴스 게시판 역할)
// ============================================================================

const DailyBriefingCard = ({
  cfoWeather,
  sentiment,
  isLoading,
}: DailyBriefingCardProps) => {
  // 로딩 중 → 스켈레톤
  if (isLoading) {
    return (
      <View style={styles.card}>
        <SkeletonBlock width={120} height={16} />
        <SkeletonBlock width="100%" height={40} style={{ marginTop: 10 }} />
      </View>
    );
  }

  // 데이터 없음 → 표시하지 않음
  if (!cfoWeather && !sentiment) return null;

  const chip = sentiment ? getSentimentChip(sentiment) : null;

  return (
    <View style={styles.card}>
      {/* 헤더: 이모지 + 타이틀 + 센티먼트 칩 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {cfoWeather?.emoji || '📊'} 오늘의 브리핑
          </Text>
          <Text style={styles.subtitle}>Daily Briefing</Text>
        </View>
        {chip && (
          <View style={[styles.chip, { backgroundColor: chip.bgColor }]}>
            <Text style={[styles.chipText, { color: chip.color }]}>
              {chip.label}
            </Text>
          </View>
        )}
      </View>

      {/* 투자 날씨 메시지 */}
      {cfoWeather?.message && (
        <Text style={styles.message} numberOfLines={3}>
          "{cfoWeather.message}"
        </Text>
      )}
    </View>
  );
};

// ============================================================================
// React.memo 최적화: cfoWeather 객체와 sentiment, isLoading 비교
// ============================================================================

export default React.memo(DailyBriefingCard, (prev, next) => {
  // isLoading 상태 비교
  if (prev.isLoading !== next.isLoading) return false;

  // sentiment 비교
  if (prev.sentiment !== next.sentiment) return false;

  // cfoWeather 객체 깊은 비교
  if (prev.cfoWeather === null && next.cfoWeather === null) return true;
  if (prev.cfoWeather === null || next.cfoWeather === null) return false;

  return (
    prev.cfoWeather.emoji === next.cfoWeather.emoji &&
    prev.cfoWeather.message === next.cfoWeather.message &&
    prev.cfoWeather.status === next.cfoWeather.status
  );
});

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
