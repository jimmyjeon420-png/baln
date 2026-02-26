import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES } from '../../styles/theme';
import { useTheme } from '../../hooks/useTheme';
import { SkeletonBlock } from '../SkeletonLoader';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입 정의
// ============================================================================

interface DailyBriefingCardProps {
  cfoWeather: { emoji: string; message: string; status: string } | null;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  isLoading: boolean;
}

// 센티먼트 → 색상 (시맨틱 컬러 - 테마에서 동적으로 가져옴)
function getSentimentChipColors(sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', themeColors: { primary: string; error: string; neutral: string }) {
  switch (sentiment) {
    case 'BULLISH':
      return { color: themeColors.primary, bgColor: 'rgba(76,175,80,0.15)' };
    case 'BEARISH':
      return { color: themeColors.error, bgColor: 'rgba(207,102,121,0.15)' };
    default:
      return { color: themeColors.neutral, bgColor: 'rgba(158,158,158,0.15)' };
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
  const { colors } = useTheme();
  const { t } = useLocale();

  // 로딩 중 → 스켈레톤
  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <SkeletonBlock width={120} height={16} />
        <SkeletonBlock width="100%" height={40} style={{ marginTop: 10 }} />
      </View>
    );
  }

  // 데이터 없음 → 표시하지 않음
  if (!cfoWeather && !sentiment) return null;

  const chipColors = sentiment ? getSentimentChipColors(sentiment, colors) : null;
  const chipLabel = sentiment
    ? sentiment === 'BULLISH'
      ? t('home.sentiment.bullish')
      : sentiment === 'BEARISH'
      ? t('home.sentiment.bearish')
      : t('home.sentiment.neutral')
    : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* 헤더: 이모지 + 타이틀 + 센티먼트 칩 */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {cfoWeather?.emoji || '📊'} {t('home.daily_briefing_title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{t('home.daily_briefing_subtitle')}</Text>
        </View>
        {chipColors && chipLabel && (
          <View style={[styles.chip, { backgroundColor: chipColors.bgColor }]}>
            <Text style={[styles.chipText, { color: chipColors.color }]}>
              {chipLabel}
            </Text>
          </View>
        )}
      </View>

      {/* 투자 날씨 메시지 */}
      {cfoWeather?.message && (
        <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
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
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  message: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
