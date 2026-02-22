/**
 * 뉴스 탭 — 신선도 우선 + 내 자산 영향도 피드
 *
 * 목표:
 * - 실시간 탭은 "최근 뉴스"만 노출 (양보다 신선도)
 * - PiCK 뉴스 + 내 자산 뉴스 탭 분리
 * - 각 뉴스에 "내 포트폴리오 영향도" 표시
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import {
  useMarketNews,
  usePickNews,
  formatUpdateTime,
  getTimeAgo,
  triggerNewsCollectionIfNeeded,
  type MarketNewsItem,
} from '../../src/hooks/useMarketNews';
import { useNewsPortfolioMatch, computeNewsPortfolioMatch } from '../../src/hooks/useNewsPortfolioMatch';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';

// ============================================================================
// 탭/정책
// ============================================================================

type NewsMode = 'realtime' | 'pick' | 'my_assets';

const MODE_TABS: { key: NewsMode; label: string }[] = [
  { key: 'realtime', label: '실시간 뉴스' },
  { key: 'pick', label: 'PiCK 뉴스' },
  { key: 'my_assets', label: '내 자산 뉴스' },
];

const REALTIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24시간
const PICK_WINDOW_MS = 48 * 60 * 60 * 1000; // 48시간
const MAX_REALTIME_ITEMS = 30;
const MAX_PICK_ITEMS = 20;
const MAX_ASSET_NEWS_ITEMS = 30;

function parseSafeDate(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function normalizeTitleForDedupe(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/[“”"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSameDay(aIso: string, bIso: string): boolean {
  const a = parseSafeDate(aIso);
  const b = parseSafeDate(bIso);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatDayLabel(iso: string): string {
  const date = parseSafeDate(iso);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
}

function formatTimeLabel(iso: string): string {
  const date = parseSafeDate(iso);
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function getExposureTone(totalExposure: number): { label: string; color: string } {
  if (totalExposure >= 30) return { label: '높음', color: '#E53935' };
  if (totalExposure >= 10) return { label: '중간', color: '#FB8C00' };
  if (totalExposure > 0) return { label: '낮음', color: '#43A047' };
  return { label: '낮음', color: '#9E9E9E' };
}

function getImpactDirection(score: number | null | undefined): string {
  if (!score || score === 0) return '중립';
  return score > 0 ? '상승 압력' : '하락 압력';
}

function openNews(item: MarketNewsItem) {
  const url = item.source_url;
  if (!url) return;

  Linking.openURL(url).catch(() => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.title)}`;
    Linking.openURL(searchUrl).catch(() => {});
  });
}

interface TimelineNewsItemProps {
  item: MarketNewsItem;
  showDate: boolean;
  isLast: boolean;
}

function TimelineNewsItem({ item, showDate, isLast }: TimelineNewsItemProps) {
  const { colors } = useTheme();
  const { totalExposure, hasMatch } = useNewsPortfolioMatch(item.tags ?? []);
  const exposurePercent = Math.max(0, Math.round(totalExposure));
  const impactDirection = getImpactDirection(item.impact_score);
  const impactIndex = hasMatch
    ? Math.round((exposurePercent * Math.abs(item.impact_score ?? 0)) / 2)
    : 0;
  const tone = getExposureTone(impactIndex);
  const sourceName = item.source_name || '출처 미상';

  const impactText = hasMatch
    ? `내 자산 영향지수 ${impactIndex}/100 · ${impactDirection} · 노출 ${exposurePercent}%`
    : '내 자산 영향 낮음 · 직접 연관된 보유 자산 없음';

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeCol}>
        <View style={[styles.timeChip, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.timeChipText, { color: colors.textSecondary }]}>{formatTimeLabel(item.published_at)}</Text>
        </View>
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
      </View>

      <TouchableOpacity
        style={[styles.newsBody, { borderBottomColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => openNews(item)}
      >
        {showDate && (
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {formatDayLabel(item.published_at)}
          </Text>
        )}

        <View style={styles.mainRow}>
          <View style={styles.textCol}>
            <Text style={[styles.newsTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.title}
            </Text>

            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>{sourceName}</Text>
              <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>{getTimeAgo(item.published_at)}</Text>
            </View>

            <View style={[styles.impactRow, { backgroundColor: hasMatch ? `${tone.color}18` : colors.surfaceLight }]}>
              <Ionicons name="pie-chart-outline" size={12} color={hasMatch ? tone.color : colors.textTertiary} />
              <Text
                style={[
                  styles.impactText,
                  { color: hasMatch ? tone.color : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {impactText}
              </Text>
            </View>
          </View>

          <View style={[styles.thumbWrap, { backgroundColor: colors.surfaceLight }]}>
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <Ionicons name="newspaper-outline" size={22} color={colors.textTertiary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// 메인 화면
// ============================================================================

export default function NewsTabScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { assets, liquidTotal } = useSharedPortfolio();
  const [mode, setMode] = useState<NewsMode>('realtime');
  const [isRecoveringNews, setIsRecoveringNews] = useState(false);
  const autoRecoveryLockRef = useRef(false);

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    dataUpdatedAt,
  } = useMarketNews('all');

  const { data: pickNews = [] } = usePickNews();

  const allNews = useMemo(() => {
    const rows = data?.pages?.flatMap((page) => page) ?? [];
    const deduped = new Map<string, MarketNewsItem>();

    for (const item of rows) {
      const normalizedTitle = normalizeTitleForDedupe(item.title || '');
      const normalizedUrl = (item.source_url || '').trim().toLowerCase();
      const key = normalizedTitle || normalizedUrl || item.id;
      const existing = deduped.get(key);

      if (!existing) {
        deduped.set(key, item);
        continue;
      }

      const currentPublishedAt = parseSafeDate(item.published_at).getTime();
      const existingPublishedAt = parseSafeDate(existing.published_at).getTime();
      if (currentPublishedAt > existingPublishedAt) {
        deduped.set(key, item);
      }
    }

    return Array.from(deduped.values())
      .sort((a, b) => parseSafeDate(b.published_at).getTime() - parseSafeDate(a.published_at).getTime());
  }, [data]);

  const realtimeNews = useMemo(() => {
    const now = Date.now();
    return allNews
      .filter((item) => now - parseSafeDate(item.published_at).getTime() <= REALTIME_WINDOW_MS)
      .slice(0, MAX_REALTIME_ITEMS);
  }, [allNews]);

  const pickList = useMemo(() => {
    const now = Date.now();
    return (pickNews ?? [])
      .filter((item) => now - parseSafeDate(item.published_at).getTime() <= PICK_WINDOW_MS)
      .sort((a, b) => parseSafeDate(b.published_at).getTime() - parseSafeDate(a.published_at).getTime())
      .slice(0, MAX_PICK_ITEMS);
  }, [pickNews]);

  const myAssetNews = useMemo(() => {
    return allNews
      .filter((item) => computeNewsPortfolioMatch(item.tags ?? [], assets, liquidTotal).hasMatch)
      .slice(0, MAX_ASSET_NEWS_ITEMS);
  }, [allNews, assets, liquidTotal]);

  const activeNews = useMemo(() => {
    if (mode === 'pick') return pickList;
    if (mode === 'my_assets') return myAssetNews;
    return realtimeNews;
  }, [mode, pickList, myAssetNews, realtimeNews]);

  const latestRealtimePublishedAt = realtimeNews[0]?.published_at ?? null;

  // 실시간 탭에서 뉴스가 없거나 오래되면 Task J 자동 동기화
  useEffect(() => {
    if (mode !== 'realtime' || isLoading || autoRecoveryLockRef.current) return;

    const isEmpty = realtimeNews.length === 0;
    const isStale = latestRealtimePublishedAt
      ? (Date.now() - parseSafeDate(latestRealtimePublishedAt).getTime()) > (90 * 60 * 1000)
      : true;

    if (!isEmpty && !isStale) return;

    autoRecoveryLockRef.current = true;
    setIsRecoveringNews(true);

    (async () => {
      const result = await triggerNewsCollectionIfNeeded(isEmpty ? 'empty' : 'stale');
      if (result.triggered || result.skippedByCooldown) {
        await refetch();
      }
    })().finally(() => {
      setIsRecoveringNews(false);
      setTimeout(() => {
        autoRecoveryLockRef.current = false;
      }, 3000);
    });
  }, [mode, isLoading, realtimeNews.length, latestRealtimePublishedAt, refetch]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (mode === 'pick') return;
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [mode, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateTimeStr = dataUpdatedAt ? formatUpdateTime(new Date(dataUpdatedAt)) : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>시장 뉴스</Text>
        {updateTimeStr ? (
          <Text style={[styles.updateTime, { color: colors.textTertiary }]}>{updateTimeStr} 업데이트</Text>
        ) : null}
      </View>

      <View style={[styles.modeTabs, { borderBottomColor: colors.border }]}> 
        {MODE_TABS.map((tab) => {
          const active = mode === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.modeTabButton}
              onPress={() => setMode(tab.key)}
            >
              <Text style={[styles.modeTabText, { color: active ? colors.textPrimary : colors.textTertiary }]}>
                {tab.label}
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

      {isRecoveringNews && (
        <View style={[styles.recoveringBanner, { backgroundColor: `${colors.primary}14`, borderBottomColor: colors.border }]}> 
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.recoveringText, { color: colors.textSecondary }]}>최신 뉴스를 동기화하고 있습니다...</Text>
        </View>
      )}

      {mode === 'realtime' && (
        <View style={[styles.focusBanner, { borderBottomColor: colors.border }]}> 
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.focusText, { color: colors.textSecondary }]}>신선도 우선: 최근 24시간 뉴스만 표시</Text>
        </View>
      )}

      {mode === 'my_assets' && (
        <View style={[styles.focusBanner, { borderBottomColor: colors.border }]}>
          <Ionicons name="pie-chart-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.focusText, { color: colors.textSecondary }]}>보유 비중과 뉴스 태그를 매칭해 관련 뉴스만 표시</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError && activeNews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={46} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>뉴스를 불러오지 못했습니다</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>네트워크를 확인하고 다시 시도해 주세요</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : activeNews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={46} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {mode === 'my_assets' ? '내 자산과 연결된 뉴스가 없습니다' : '표시할 뉴스가 없습니다'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {mode === 'my_assets'
              ? '보유 자산 태그와 매칭되는 뉴스가 올라오면 자동으로 표시됩니다'
              : '신선한 뉴스가 들어오면 자동으로 갱신됩니다'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeNews}
          keyExtractor={(item, index) => `${item.id}-${item.source_url}-${index}`}
          renderItem={({ item, index }) => {
            const prev = index > 0 ? activeNews[index - 1] : null;
            const showDate = !prev || !isSameDay(item.published_at, prev.published_at);
            const isLast = index === activeNews.length - 1;
            return <TimelineNewsItem item={item} showDate={showDate} isLast={isLast} />;
          }}
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
    fontSize: 17,
    fontWeight: '700',
  },
  modeTabUnderline: {
    width: 56,
    height: 3,
    borderRadius: 2,
  },

  recoveringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  recoveringText: {
    fontSize: 12,
    fontWeight: '600',
  },

  focusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
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

  timelineRow: {
    flexDirection: 'row',
  },
  timeCol: {
    width: 58,
    alignItems: 'center',
  },
  timeChip: {
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    borderRadius: 2,
  },

  newsBody: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  dateText: {
    textAlign: 'right',
    fontSize: 13,
    marginBottom: 8,
    paddingRight: 4,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  textCol: {
    flex: 1,
    gap: 8,
  },
  newsTitle: {
    fontSize: 19,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 2,
  },
  impactText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
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
});
