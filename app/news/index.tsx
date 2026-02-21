/**
 * 뉴스 전체 화면 (/news)
 *
 * 역할: 뉴스룸 — 실시간 뉴스를 무한 스크롤로 보여주는 전용 화면
 * - 상단: 카테고리 필터 탭 (전체/크립토/주식/매크로)
 * - PiCK 섹션: 수평 스크롤 AI 추천 뉴스
 * - 뉴스 리스트: FlatList + 무한 스크롤 + Pull-to-refresh
 *
 * 비유: 증권사 뉴스룸 — 카테고리별로 정리된 뉴스를 쭉 내려보며 중요 뉴스는 상단에 고정
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import {
  useMarketNews,
  usePickNews,
  type NewsCategoryFilter,
  type MarketNewsItem,
} from '../../src/hooks/useMarketNews';
import NewsCard from '../../src/components/news/NewsCard';
import { SIZES } from '../../src/styles/theme';

// ============================================================================
// 카테고리 설정
// ============================================================================

const CATEGORY_TABS: { key: NewsCategoryFilter; label: string; icon: string; color: string }[] = [
  { key: 'all', label: '전체', icon: 'apps-outline', color: '#4CAF50' },
  { key: 'crypto', label: '크립토', icon: 'logo-bitcoin', color: '#F7931A' },
  { key: 'stock', label: '주식', icon: 'trending-up', color: '#4CAF50' },
  { key: 'macro', label: '매크로', icon: 'globe-outline', color: '#29B6F6' },
];

// ============================================================================
// 메인 화면
// ============================================================================

export default function NewsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [category, setCategory] = useState<NewsCategoryFilter>('all');

  // 뉴스 목록 (무한 스크롤)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useMarketNews(category);

  // AI PiCK 뉴스
  const { data: pickNews } = usePickNews();

  // 새로고침
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // 무한 스크롤
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // 뉴스 평탄화
  const newsList = data?.pages?.flatMap((page) => page) ?? [];

  // ---------------------------------------------------------------------------
  // 렌더: 카테고리 필터 탭
  // ---------------------------------------------------------------------------
  const renderCategoryTabs = () => (
    <View style={styles.tabsRow}>
      {CATEGORY_TABS.map((tab) => {
        const isActive = category === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isActive && { backgroundColor: tab.color + '20', borderColor: tab.color },
            ]}
            onPress={() => setCategory(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={isActive ? tab.color : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: colors.textSecondary },
                isActive && { color: tab.color, fontWeight: '700' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ---------------------------------------------------------------------------
  // 렌더: PiCK 섹션 (수평 스크롤)
  // ---------------------------------------------------------------------------
  const renderPickSection = () => {
    if (!pickNews || pickNews.length === 0) return null;

    return (
      <View style={styles.pickSection}>
        <View style={styles.pickHeader}>
          <Ionicons name="flash" size={18} color="#FFC107" />
          <Text style={[styles.pickTitle, { color: colors.textPrimary }]}>
            AI PiCK
          </Text>
          <Text style={[styles.pickSubtitle, { color: colors.textSecondary }]}>
            오늘의 핵심 뉴스
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickScroll}
        >
          {pickNews.map((item) => (
            <View key={item.id} style={[styles.pickCard, { backgroundColor: colors.surface }]}>
              <NewsCard item={item} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // 렌더: 뉴스 아이템
  // ---------------------------------------------------------------------------
  const renderNewsItem = ({ item }: { item: MarketNewsItem }) => (
    <View style={styles.newsItemWrapper}>
      <NewsCard item={item} />
    </View>
  );

  // ---------------------------------------------------------------------------
  // 렌더: 헤더 (FlatList 상단에 PiCK 섹션 포함)
  // ---------------------------------------------------------------------------
  const renderListHeader = () => (
    <View>
      {renderPickSection()}
    </View>
  );

  // ---------------------------------------------------------------------------
  // 메인 렌더
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          시장 뉴스
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 카테고리 필터 */}
      <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
        {renderCategoryTabs()}
      </View>

      {/* 뉴스 리스트 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : newsList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            뉴스가 없습니다
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            잠시 후 다시 확인해주세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={newsList}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderNewsItem}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },

  // 필터
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 14,
  },

  // PiCK 섹션
  pickSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pickTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  pickSubtitle: {
    fontSize: 13,
  },
  pickScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  pickCard: {
    width: 280,
    borderRadius: 14,
  },

  // 리스트
  listContent: {
    paddingBottom: 80,
  },
  newsItemWrapper: {
    paddingHorizontal: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  // 로딩
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 빈 화면
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
});
