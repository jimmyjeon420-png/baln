import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../styles/theme';
import { useSharedMarketData } from '../../hooks/useSharedAnalysis';

/**
 * AI 인사이트 미리보기 (전체 탭 상단)
 *
 * 역할: 날씨 알림판처럼 오늘의 시장 한 줄 요약 부서
 * - useSharedMarketData에서 sentiment (시장 분위기) 가져오기
 * - "오늘 시장: 🟡 주의" 형태의 한 줄 배지 표시
 * - 터치하면 insights.tsx (인사이트 전체 탭)으로 이동
 *
 * 비유: 출근길 날씨 표시판 — "오늘 비 올 예정 ☔"처럼 시장 분위기 한눈에
 */

export default function InsightPreview() {
  const router = useRouter();

  // 공유 훅에서 시장 데이터 가져오기 (읽기만!)
  const { data: marketData, isLoading } = useSharedMarketData([]);
  const sentiment = marketData?.sentiment;

  // 전체 보기 버튼
  const handleViewAll = () => {
    router.push('/(tabs)/insights');
  };

  // sentiment에 따른 이모지 및 색상
  const getSentimentDisplay = () => {
    if (!sentiment) {
      return { emoji: '⚪', label: '분석 중', color: COLORS.textSecondary, bgColor: '#2A2A2A' };
    }

    const s = (typeof sentiment === 'string' ? sentiment : (sentiment as any).sentiment || '').toLowerCase();
    if (s.includes('bullish') || s.includes('긍정') || s.includes('상승')) {
      return { emoji: '🟢', label: '긍정적', color: COLORS.primary, bgColor: 'rgba(76, 175, 80, 0.15)' };
    } else if (s.includes('bearish') || s.includes('부정') || s.includes('하락')) {
      return { emoji: '🔴', label: '부정적', color: COLORS.error, bgColor: 'rgba(207, 102, 121, 0.15)' };
    } else if (s.includes('caution') || s.includes('주의') || s.includes('경계')) {
      return { emoji: '🟡', label: '주의', color: '#FFC107', bgColor: 'rgba(255, 193, 7, 0.15)' };
    } else {
      return { emoji: '🟠', label: '중립', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.15)' };
    }
  };

  const sentimentDisplay = getSentimentDisplay();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="bulb" size={20} color="#FFC107" />
            <Text style={styles.headerTitle}>AI 인사이트</Text>
          </View>
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>분석 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더: 제목 + 전체보기 버튼 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bulb" size={20} color="#FFC107" />
          <Text style={styles.headerTitle}>AI 인사이트</Text>
        </View>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>전체 보기</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFC107" />
        </TouchableOpacity>
      </View>

      {/* 오늘의 시장 분위기 배지 */}
      <TouchableOpacity
        style={[styles.sentimentCard, { backgroundColor: sentimentDisplay.bgColor }]}
        onPress={handleViewAll}
        activeOpacity={0.7}
      >
        <View style={styles.sentimentContent}>
          <Text style={styles.sentimentEmoji}>{sentimentDisplay.emoji}</Text>
          <View style={styles.sentimentTextWrap}>
            <Text style={styles.sentimentLabel}>오늘 시장</Text>
            <Text style={[styles.sentimentValue, { color: sentimentDisplay.color }]}>
              {sentimentDisplay.label}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#666" />
      </TouchableOpacity>

      {/* 투자 날씨 (있으면 표시) */}
      {marketData?.sentiment?.cfoWeather && (
        <View style={styles.weatherBox}>
          <Ionicons name="partly-sunny" size={16} color={COLORS.textSecondary} />
          <Text style={styles.weatherText} numberOfLines={2}>
            {(marketData.sentiment.cfoWeather as any)?.message || ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.rXl,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFC107',
  },
  sentimentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: SIZES.rMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  sentimentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sentimentEmoji: {
    fontSize: 28,
  },
  sentimentTextWrap: {
    gap: 2,
  },
  sentimentLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sentimentValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  weatherBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.rSm,
    padding: SIZES.sm,
  },
  weatherText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
