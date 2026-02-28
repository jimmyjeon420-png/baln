/**
 * 뉴스 탭 — 주식/암호화폐/거시경제 뉴스 + 폴리마켓 예측
 *
 * 4탭 구조:
 * - 주식/암호화폐/거시경제 → market_news (RSS 폴백 포함)
 * - 폴리마켓 → ops_pm_predictions (Polymarket 예측)
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
  Linking,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';
import {
  usePredictionFeed,
  type PredictionItem,
} from '../../src/hooks/usePredictionFeed';
import {
  useMarketNews,
  usePickNews,
  type MarketNewsItem,
  type MarketNewsCategory,
} from '../../src/hooks/useMarketNews';
import NewsCard from '../../src/components/news/NewsCard';
import NewsDetailSheet from '../../src/components/news/NewsDetailSheet';
import PredictionCard from '../../src/components/prediction/PredictionCard';

// ============================================================================
// 탭 정의
// ============================================================================

type NewsTab = MarketNewsCategory | 'polymarket';

const TAB_KEYS: { key: NewsTab; labelKey: string }[] = [
  { key: 'stock', labelKey: 'news.tab_stock' },
  { key: 'crypto', labelKey: 'news.tab_crypto' },
  { key: 'macro', labelKey: 'news.tab_macro' },
  { key: 'polymarket', labelKey: 'news.tab_polymarket' },
];

// Format update time (HH:MM)
function formatUpdateTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Open Polymarket URL
function openPrediction(item: PredictionItem) {
  if (!item.slug) return;
  const url = `https://polymarket.com/event/${item.slug}`;
  Linking.openURL(url).catch(() => {});
}

// Open news article URL
function openNewsArticle(item: MarketNewsItem) {
  const url = item.source_url;
  if (!url) return;
  Linking.openURL(url).catch(() => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.title)}`;
    Linking.openURL(searchUrl).catch(() => {});
  });
}

// ============================================================================
// 메인 화면
// ============================================================================

export default function NewsTabScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLocale();
  const [category, setCategory] = useState<NewsTab>('stock');

  // 뉴스 상세 바텀시트 상태
  const [selectedNews, setSelectedNews] = useState<MarketNewsItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const isPolymarket = category === 'polymarket';

  // 글로벌 픽 뉴스 (is_pick=true, 상위 5개)
  const { data: pickNews } = usePickNews();

  // 뉴스 훅 (주식/암호화폐/거시경제 탭용) — React 규칙: 항상 호출
  const newsResult = useMarketNews(isPolymarket ? 'all' : category, {
    enabled: !isPolymarket,
  });

  // 예측 훅 (폴리마켓 탭용) — React 규칙: 항상 호출
  const predictionResult = usePredictionFeed('all');

  // 현재 활성 데이터소스 선택
  const activeResult = isPolymarket ? predictionResult : newsResult;
  const { isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, dataUpdatedAt } = activeResult;

  // Flatten pages
  const newsItems = useMemo(() => {
    if (isPolymarket) return [];
    return newsResult.data?.pages?.flatMap((page) => page) ?? [];
  }, [isPolymarket, newsResult.data]);

  const predictions = useMemo(() => {
    if (!isPolymarket) return [];
    return predictionResult.data?.pages?.flatMap((page) => page) ?? [];
  }, [isPolymarket, predictionResult.data]);

  const itemCount = isPolymarket ? predictions.length : newsItems.length;

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Infinite scroll
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateTimeStr = dataUpdatedAt ? formatUpdateTime(new Date(dataUpdatedAt)) : '';

  // Focus banner 텍스트
  const focusBannerText = useMemo(() => {
    if (isPolymarket) return t('news.focus_polymarket');
    if (category === 'stock') return t('news.focus_stock');
    if (category === 'crypto') return t('news.focus_crypto');
    return t('news.focus_macro');
  }, [category, isPolymarket, t]);

  // 뉴스 카드 탭 → 바텀시트 열기
  const handleNewsPress = useCallback((item: MarketNewsItem) => {
    setSelectedNews(item);
    setDetailVisible(true);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailVisible(false);
    setSelectedNews(null);
  }, []);

  // 빈 상태 텍스트
  const emptyTitle = isPolymarket ? t('news.empty_predictions') : t('news.empty_news');
  const emptySubtitle = isPolymarket
    ? t('news.empty_predictions_subtitle')
    : t('news.empty_news_subtitle');
  const errorTitle = isPolymarket ? t('news.error_predictions') : t('news.error_news');

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('news.title')}</Text>
        {updateTimeStr ? (
          <Text style={[styles.updateTime, { color: colors.textTertiary }]}>{t('news.updated_time', { time: updateTimeStr })}</Text>
        ) : null}
      </View>

      {/* 글로벌 뉴스 픽 배너 */}
      {pickNews && pickNews.length > 0 && (
        <View style={[styles.pickSection, { borderBottomColor: colors.border }]}>
          <View style={styles.pickHeader}>
            <View style={styles.pickBadge}>
              <Ionicons name="flash" size={12} color="#000" />
              <Text style={styles.pickBadgeText}>NEWS PiCK</Text>
            </View>
            <Text style={[styles.pickSubtitle, { color: colors.textTertiary }]}>
              {t('news.pick_subtitle')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickScroll}
          >
            {pickNews.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.pickCard, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
                onPress={() => openNewsArticle(item)}
              >
                <Text style={[styles.pickTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.impact_summary && (
                  <Text style={[styles.pickImpact, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.impact_summary}
                  </Text>
                )}
                <View style={styles.pickMeta}>
                  <Text style={[styles.pickSource, { color: colors.textTertiary }]}>{item.source_name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category Tabs */}
      <View style={[styles.modeTabs, { borderBottomColor: colors.border }]}>
        {TAB_KEYS.map((tab) => {
          const active = category === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.modeTabButton}
              onPress={() => setCategory(tab.key)}
            >
              <Text style={[styles.modeTabText, { color: active ? colors.textPrimary : colors.textTertiary }]}>
                {t(tab.labelKey)}
              </Text>
              <View
                style={[
                  styles.modeTabUnderline,
                  { backgroundColor: active ? colors.textPrimary : 'transparent' },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Focus Banner */}
      <View style={[styles.focusBanner, { borderBottomColor: colors.border }]}>
        <Text style={styles.focusBannerEmoji}>{isPolymarket ? '📊' : '🔥'}</Text>
        <Text style={[styles.focusText, { color: colors.textSecondary }]}>
          {focusBannerText}
        </Text>
      </View>

      {/* Content: Loading / Error / Empty / FlatList */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError && itemCount === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={46} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{errorTitle}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('news.error_network')}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>{t('news.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : itemCount === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={isPolymarket ? 'bar-chart-outline' : 'newspaper-outline'} size={46} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{emptyTitle}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{emptySubtitle}</Text>
        </View>
      ) : isPolymarket ? (
        /* 폴리마켓 탭: PredictionCard */
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PredictionCard item={item} onPress={openPrediction} />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      ) : (
        /* 뉴스 탭: NewsCard + 바텀시트 */
        <FlatList
          data={newsItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NewsCard item={item} onPress={handleNewsPress} />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* 뉴스 상세 바텀시트 */}
      <NewsDetailSheet
        item={selectedNews}
        visible={detailVisible}
        onClose={handleDetailClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  updateTime: {
    fontSize: 12,
  },

  modeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  modeTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  modeTabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modeTabUnderline: {
    width: 48,
    height: 3,
    borderRadius: 2,
  },

  focusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  focusBannerEmoji: {
    fontSize: 14,
  },
  focusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 120,
  },
  footerLoader: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },

  // --- 글로벌 뉴스 픽 ---
  pickSection: {
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  pickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pickBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  pickSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  pickScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  pickCard: {
    width: 220,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  pickTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  pickImpact: {
    fontSize: 12,
    lineHeight: 16,
  },
  pickMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pickSource: {
    fontSize: 11,
  },
});
