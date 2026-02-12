/**
 * NewsTimeline.tsx - 뉴스 타임라인 컴포넌트
 *
 * 역할: "최근 뉴스를 타임라인으로 시각화"
 * - 전체 센티먼트 뱃지 (POSITIVE/NEUTRAL/NEGATIVE)
 * - 하이라이트 요약 목록
 * - 타임라인: 왼쪽 세로선 + 뉴스별 dot + 날짜/제목/영향 뱃지
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// 타입 정의
// ============================================================================

export interface NewsTimelineProps {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  highlights: string[];
  recentNews: Array<{
    title: string;
    impact: string;
    date: string;
  }>;
}

// ============================================================================
// 헬퍼
// ============================================================================

const SENTIMENT_CONFIG = {
  POSITIVE: { label: '긍정적', icon: 'trending-up' as const, colorKey: 'success' as const },
  NEUTRAL: { label: '중립', icon: 'remove' as const, colorKey: 'neutral' as const },
  NEGATIVE: { label: '부정적', icon: 'trending-down' as const, colorKey: 'error' as const },
};

const getImpactColor = (impact: string, colors: any) => {
  if (impact.includes('긍정')) return colors.success;
  if (impact.includes('부정')) return colors.error;
  return colors.neutral;
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return dateStr;
  }
};

// ============================================================================
// 컴포넌트
// ============================================================================

const NewsTimeline: React.FC<NewsTimelineProps> = ({
  sentiment,
  highlights,
  recentNews,
}) => {
  const { colors } = useTheme();
  const config = SENTIMENT_CONFIG[sentiment];
  const sentimentColor = colors[config.colorKey];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="newspaper-outline" size={20} color={colors.textPrimary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>뉴스 분석</Text>
        </View>
        <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '20' }]}>
          <Ionicons name={config.icon} size={14} color={sentimentColor} />
          <Text style={[styles.sentimentText, { color: sentimentColor }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* 하이라이트 */}
      {highlights.length > 0 && (
        <View style={[styles.highlightsBox, { backgroundColor: colors.background }]}>
          {highlights.map((item, idx) => (
            <View key={idx} style={styles.highlightRow}>
              <Text style={[styles.highlightDot, { color: sentimentColor }]}>{'•'}</Text>
              <Text style={[styles.highlightText, { color: colors.textSecondary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 타임라인 */}
      {recentNews.length > 0 && (
        <View style={styles.timeline}>
          {recentNews.map((news, idx) => {
            const dotColor = getImpactColor(news.impact, colors);
            const isLast = idx === recentNews.length - 1;

            return (
              <View key={idx} style={styles.timelineItem}>
                {/* 왼쪽: 선 + 점 */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  {!isLast && (
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                  )}
                </View>

                {/* 오른쪽: 콘텐츠 */}
                <View style={styles.timelineContent}>
                  <Text style={[styles.newsDate, { color: colors.textTertiary }]}>
                    {formatDate(news.date)}
                  </Text>
                  <Text style={[styles.newsTitle, { color: colors.textPrimary }]}>
                    {news.title}
                  </Text>
                  <View style={[styles.impactBadge, { backgroundColor: dotColor + '15' }]}>
                    <Text style={[styles.impactText, { color: dotColor }]}>
                      {news.impact}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  highlightsBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  highlightDot: {
    fontSize: 16,
    lineHeight: 20,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 72,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  newsDate: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  impactBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  impactText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NewsTimeline;
