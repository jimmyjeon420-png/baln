/**
 * NewsPreview — 뉴스 미리보기 위젯 (전체 탭 상단)
 *
 * 역할: 뉴스 속보판처럼 최신 뉴스 미리보기 부서
 * - 최신 뉴스 3개를 카드로 표시
 * - "더보기 →" 버튼으로 /news 전체 화면 이동
 * - CommunityPreview와 동일한 패턴
 *
 * 비유: 건물 로비 전광판 — 핵심 뉴스만 빠르게 보여주고, 자세한 건 뉴스룸으로 안내
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useMarketNews } from '../../hooks/useMarketNews';
import { useQuickContextSentiment } from '../../hooks/useContextCard';
import NewsCard from '../news/NewsCard';

export default function NewsPreview() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, isLoading } = useMarketNews('all');
  const { data: sentimentData } = useQuickContextSentiment();
  const sentiment = sentimentData?.sentiment ?? null;

  // 첫 페이지의 상위 3개만 표시
  const topNews = data?.pages?.[0]?.slice(0, 3) ?? [];

  const handleViewAll = () => {
    router.push('/news' as any);
  };

  // 로딩 중
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="newspaper" size={20} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              시장 뉴스
            </Text>
          </View>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  // 뉴스 없으면 표시하지 않음
  if (topNews.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* 헤더: 제목 + 더보기 버튼 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="newspaper" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            시장 뉴스
          </Text>
          <View style={[styles.liveBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAllBtn}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>더보기</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 맥락 연동 배너 */}
      {sentiment && (
        <TouchableOpacity
          style={[styles.contextLink, {
            backgroundColor: sentiment === 'alert' ? '#CF667915' : sentiment === 'caution' ? '#FFB74D15' : '#4CAF5015'
          }]}
          onPress={() => router.push('/(tabs)/index')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={sentiment === 'alert' ? 'warning' : sentiment === 'caution' ? 'alert-circle' : 'shield-checkmark'}
            size={14}
            color={sentiment === 'alert' ? '#CF6679' : sentiment === 'caution' ? '#FFB74D' : '#4CAF50'}
          />
          <Text style={[styles.contextLinkText, { color: colors.textSecondary }]}>
            시장 분위기: {sentiment === 'alert' ? '경고' : sentiment === 'caution' ? '주의' : '안정'} · 맥락 카드에서 확인
          </Text>
          <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
        </TouchableOpacity>
      )}

      {/* 뉴스 미리보기 (최대 3개, 컴팩트 모드) */}
      <View style={styles.newsContainer}>
        {topNews.map((item) => (
          <NewsCard key={item.id} item={item} compact />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  liveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  newsContainer: {
    gap: 8,
  },
  contextLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  contextLinkText: {
    flex: 1,
    fontSize: 11,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
