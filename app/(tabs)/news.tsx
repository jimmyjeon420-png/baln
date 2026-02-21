/**
 * 뉴스 탭 — 시장 뉴스 실시간 피드
 *
 * 역할: 뉴스룸 — 실시간 뉴스를 무한 스크롤로 보여주는 탭
 * - 상단: 카테고리 필터 탭 (전체/암호화폐/주식/거시경제/내 자산)
 * - 헤더: "마지막 업데이트: HH:MM" 표시
 * - PiCK 섹션: 수평 스크롤 AI 추천 뉴스
 * - 뉴스 리스트: FlatList + 무한 스크롤 + Pull-to-refresh
 * - 뉴스 탭 → 상세 바텀 시트 (포트폴리오 영향도 표시)
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import {
  useMarketNews,
  usePickNews,
  formatUpdateTime,
  type NewsCategoryFilter,
  type MarketNewsItem,
} from '../../src/hooks/useMarketNews';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import NewsCard from '../../src/components/news/NewsCard';

// ============================================================================
// 카테고리 설정 — "내 자산" 필터 추가
// ============================================================================

type ExtendedFilter = NewsCategoryFilter | 'portfolio';

const CATEGORY_TABS: { key: ExtendedFilter; label: string; icon: string; color: string }[] = [
  { key: 'all', label: '전체', icon: 'apps-outline', color: '#4CAF50' },
  { key: 'portfolio', label: '내 자산', icon: 'pie-chart-outline', color: '#AB47BC' },
  { key: 'crypto', label: '암호화폐', icon: 'logo-bitcoin', color: '#F7931A' },
  { key: 'stock', label: '주식', icon: 'trending-up', color: '#4CAF50' },
  { key: 'macro', label: '거시경제', icon: 'globe-outline', color: '#29B6F6' },
];

// ============================================================================
// 메인 화면
// ============================================================================

export default function NewsTabScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [category, setCategory] = useState<ExtendedFilter>('all');

  // "내 자산" 필터용 포트폴리오 데이터
  const { assets } = useSharedPortfolio();
  const portfolioTickers = useMemo(() => {
    const tickers = new Set<string>();
    for (const asset of assets) {
      if (asset.ticker && !asset.ticker.startsWith('RE_')) {
        tickers.add(asset.ticker.toLowerCase());
        tickers.add((asset.name || '').toLowerCase());
      }
    }
    return tickers;
  }, [assets]);

  // 뉴스 목록 (무한 스크롤) — "내 자산" 필터 시 'all'로 조회 후 클라이언트 필터
  const apiCategory: NewsCategoryFilter = category === 'portfolio' ? 'all' : category;
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    dataUpdatedAt,
  } = useMarketNews(apiCategory);

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

  // 뉴스 평탄화 + "내 자산" 필터
  const newsList = useMemo(() => {
    const allNews = data?.pages?.flatMap((page) => page) ?? [];
    if (category !== 'portfolio') return allNews;

    // 내 자산 관련 뉴스만 필터
    return allNews.filter((news) => {
      if (!news.tags || news.tags.length === 0) return false;
      return news.tags.some((tag) => {
        const tagLower = tag.toLowerCase();
        return portfolioTickers.has(tagLower);
      });
    });
  }, [data, category, portfolioTickers]);

  // 마지막 업데이트 시간
  const updateTimeStr = dataUpdatedAt ? formatUpdateTime(new Date(dataUpdatedAt)) : '';

  // ---------------------------------------------------------------------------
  // 렌더: 카테고리 필터 탭
  // ---------------------------------------------------------------------------
  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsRow}
    >
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
    </ScrollView>
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
  // 메인 렌더
  // ---------------------------------------------------------------------------
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>시장 뉴스</Text>
          <View style={[styles.liveBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>
        {updateTimeStr ? (
          <Text style={[styles.updateTime, { color: colors.textTertiary }]}>
            {updateTimeStr} 업데이트
          </Text>
        ) : null}
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
            {category === 'portfolio' ? '관련 뉴스가 없습니다' : '뉴스가 없습니다'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {category === 'portfolio'
              ? '보유 자산과 관련된 뉴스가 아직 없어요'
              : '잠시 후 다시 확인해주세요'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={newsList}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderNewsItem}
          ListHeaderComponent={category === 'all' ? renderPickSection : undefined}
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

    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
  },
  liveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  updateTime: {
    fontSize: 12,
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
    paddingBottom: 120,
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
