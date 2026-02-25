/**
 * 투자 거장 인사이트 (Guru Insights) 화면
 * 워렌 버핏, 레이 달리오 등 10명의 투자 거장 분석
 * Central Kitchen 배치 데이터 표시 (매일 07:00 업데이트)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGuruInsights, GURU_INSIGHTS_KEY } from '../../src/hooks/useSharedAnalysis';
import { GuruInsightsSkeleton } from '../../src/components/SkeletonLoader';
import type { GuruInsight } from '../../src/services/centralKitchen';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/hooks/useTheme';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { guruNameToCharacterId } from '../../src/services/characterService';
import { useLocale } from '../../src/context/LocaleContext';

// 구루 이름 → ID 변환 (딥다이브 네비게이션용)
function guruNameToId(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('달리오') || n.includes('dalio')) return 'dalio';
  if (n.includes('버핏') || n.includes('buffett')) return 'buffett';
  if (n.includes('캐시') || n.includes('cathie')) return 'cathie_wood';
  if (n.includes('드러킨밀러') || n.includes('druckenmiller') || n.includes('스탠리')) return 'druckenmiller';
  return null;
}

// 행동 배지 색상
const ACTION_COLORS: Record<string, string> = {
  BUY: '#4CAF50',
  SELL: '#CF6679',
  HOLD: '#FFD700',
};

// 센티먼트 필터 옵션
type SentimentFilter = 'ALL' | 'BULLISH' | 'BEARISH' | 'CAUTIOUS' | 'NEUTRAL';

// 센티먼트별 색상
const SENTIMENT_COLORS: Record<string, string> = {
  BULLISH: '#4CAF50',
  BEARISH: '#CF6679',
  CAUTIOUS: '#FF9800',
  NEUTRAL: '#FFD700',
};

export default function GuruInsightsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { data, isLoading, isRefetching } = useGuruInsights();
  const [filter, setFilter] = useState<SentimentFilter>('ALL');

  const FILTER_OPTIONS = useMemo<{ key: SentimentFilter; label: string }[]>(
    () => [
      { key: 'ALL', label: t('guru.insights.filter_all') },
      { key: 'BULLISH', label: t('guru.insights.filter_bullish') },
      { key: 'BEARISH', label: t('guru.insights.filter_bearish') },
      { key: 'CAUTIOUS', label: t('guru.insights.filter_cautious') },
      { key: 'NEUTRAL', label: t('guru.insights.filter_neutral') },
    ],
    [t],
  );

  const SENTIMENT_LABELS = useMemo<Record<string, string>>(
    () => ({
      BULLISH: t('guru.insights.filter_bullish'),
      BEARISH: t('guru.insights.filter_bearish'),
      CAUTIOUS: t('guru.insights.filter_cautious'),
      NEUTRAL: t('guru.insights.filter_neutral'),
    }),
    [t],
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: GURU_INSIGHTS_KEY });
  }, [queryClient]);

  // 필터 적용
  const filteredInsights = (data?.insights || []).filter((guru: GuruInsight) => {
    if (filter === 'ALL') return true;
    return guru.sentiment === filter;
  });

  // 로딩 중
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('guru.insights.title')}</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>GURU</Text>
          </View>
        </View>
        <GuruInsightsSkeleton />
      </SafeAreaView>
    );
  }

  // 데이터 없음 (Empty State)
  const hasData = data && data.insights && data.insights.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('guru.insights.title')}</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>GURU</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {!hasData ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔭</Text>
            <Text style={styles.emptyTitle}>{t('guru.insights.empty_title')}</Text>
            <Text style={styles.emptyDescription}>
              {t('guru.insights.empty_description')}
            </Text>
            <TouchableOpacity style={styles.emptyRefreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color="#4CAF50" />
              <Text style={styles.emptyRefreshText}>{t('guru.insights.empty_refresh')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 시장 맥락 배너 */}
            {data.market_context && (
              <View style={styles.contextBanner}>
                <Text style={styles.contextIcon}>🌍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contextLabel}>{t('guru.insights.context_label')}</Text>
                  <Text style={styles.contextText}>{data.market_context}</Text>
                </View>
              </View>
            )}

            {/* 센티먼트 필터 칩 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterContent}
            >
              {FILTER_OPTIONS.map((opt) => {
                const isActive = filter === opt.key;
                const chipColor = opt.key === 'ALL' ? '#4CAF50' : SENTIMENT_COLORS[opt.key];
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.filterChip,
                      isActive && { backgroundColor: chipColor, borderColor: chipColor },
                    ]}
                    onPress={() => setFilter(opt.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && { color: '#000000', fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 필터 결과 없음 */}
            {filteredInsights.length === 0 && (
              <View style={styles.noFilterResult}>
                <Text style={styles.noFilterText}>
                  {t('guru.insights.no_filter_result', { sentiment: SENTIMENT_LABELS[filter] })}
                </Text>
              </View>
            )}

            {/* 거장 카드 리스트 */}
            {filteredInsights.map((guru: GuruInsight, index: number) => {
              const guruId = guruNameToId(guru.guruName);
              return (
                <TouchableOpacity
                  key={`${guru.guruNameEn}-${index}`}
                  onPress={() => guruId && router.push(`/settings/guru-detail/${guruId}` as any)}
                  activeOpacity={guruId ? 0.75 : 1}
                >
                  <GuruCard guru={guru} />
                </TouchableOpacity>
              );
            })}

            {/* 면책 조항 */}
            <View style={styles.disclaimer}>
              <Ionicons name="warning-outline" size={14} color="#666666" />
              <Text style={styles.disclaimerText}>
                {t('guru.insights.disclaimer')}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 거장 카드 컴포넌트
// ============================================================================

function GuruCard({ guru }: { guru: GuruInsight }) {
  const { t } = useLocale();
  const sentimentColor = SENTIMENT_COLORS[guru.sentiment] || '#FFD700';
  const sentimentLabel = (() => {
    switch (guru.sentiment) {
      case 'BULLISH': return t('guru.insights.filter_bullish');
      case 'BEARISH': return t('guru.insights.filter_bearish');
      case 'CAUTIOUS': return t('guru.insights.filter_cautious');
      case 'NEUTRAL': return t('guru.insights.filter_neutral');
      default: return t('guru.insights.filter_neutral');
    }
  })();

  return (
    <View style={styles.guruCard}>
      {/* 헤더: 캐릭터 아바타 + 이름 + 센티먼트 배지 */}
      <View style={styles.guruHeader}>
        <View style={styles.guruAvatar}>
          <CharacterAvatar
            guruId={guruNameToCharacterId(guru.guruName) || guruNameToCharacterId(guru.guruNameEn) || ''}
            size="sm"
            sentiment={guru.sentiment}
            fallbackEmoji={guru.emoji}
          />
        </View>
        <View style={styles.guruInfo}>
          <Text style={styles.guruName}>{guru.guruName}</Text>
          <Text style={styles.guruOrg}>
            {guru.organization} · {guru.topic}
          </Text>
        </View>
        <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '20', borderColor: sentimentColor }]}>
          <Text style={[styles.sentimentText, { color: sentimentColor }]}>
            {sentimentLabel}
          </Text>
        </View>
      </View>

      {/* 구조화 메타데이터: 행동 배지 + 섹터 + 확신도 */}
      {(guru.action || guru.sector || guru.conviction_level) && (
        <View style={styles.metaRow}>
          {guru.action && (
            <View style={[styles.actionBadge, { backgroundColor: ACTION_COLORS[guru.action] + '25', borderColor: ACTION_COLORS[guru.action] }]}>
              <Text style={[styles.actionBadgeText, { color: ACTION_COLORS[guru.action] }]}>
                {guru.action}
              </Text>
            </View>
          )}
          {guru.sector && (
            <View style={styles.sectorChip}>
              <Text style={styles.sectorChipText}>{guru.sector}</Text>
            </View>
          )}
          {guru.conviction_level && (
            <View style={styles.convictionRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Text key={i} style={[styles.convictionDot, { color: i <= guru.conviction_level! ? '#4CAF50' : '#333333' }]}>
                  ●
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 주목 종목 (target_tickers) */}
      {guru.target_tickers && guru.target_tickers.length > 0 && (
        <View style={styles.targetTickerRow}>
          <Text style={styles.targetTickerLabel}>{t('guru.insights.target_tickers_label')}</Text>
          {guru.target_tickers.map((ticker: string) => (
            <View key={ticker} style={styles.targetTickerChip}>
              <Text style={styles.targetTickerText}>{ticker}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 최근 행동 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('guru.insights.recent_action_label')}</Text>
        <Text style={styles.sectionContent}>{guru.recentAction}</Text>
      </View>

      {/* 공개 발언 인용 */}
      {guru.quote && (
        <View style={styles.quoteSection}>
          <Text style={styles.quoteIcon}>💬</Text>
          <Text style={styles.quoteText}>"{guru.quote}"</Text>
        </View>
      )}

      {/* AI 분석 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('guru.insights.analysis_label')}</Text>
        <Text style={styles.sectionContent}>{guru.reasoning}</Text>
      </View>

      {/* 관련 티커 + 출처 */}
      <View style={styles.guruFooter}>
        <View style={styles.tickerRow}>
          {(guru.relevantAssets || []).slice(0, 5).map((ticker: string) => (
            <View key={ticker} style={styles.tickerChip}>
              <Text style={styles.tickerText}>{ticker}</Text>
            </View>
          ))}
        </View>
        {guru.source && (
          <Text style={styles.sourceText} numberOfLines={1}>
            {t('guru.insights.source_label')} {guru.source}
          </Text>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 21,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },

  // 시장 맥락 배너
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A2A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3A2A',
    gap: 12,
  },
  contextIcon: {
    fontSize: 25,
  },
  contextLabel: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 21,
  },

  // 필터 칩
  filterRow: {
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1E1E1E',
  },
  filterChipText: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '500',
  },

  // 필터 결과 없음
  noFilterResult: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noFilterText: {
    fontSize: 15,
    color: '#666666',
  },

  // 거장 카드
  guruCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  guruHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  guruAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guruEmoji: {
    fontSize: 23,
  },
  guruInfo: {
    flex: 1,
    marginLeft: 12,
  },
  guruName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guruOrg: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  sentimentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // 구조화 메타데이터
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  actionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectorChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  sectorChipText: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  convictionRow: {
    flexDirection: 'row',
    gap: 3,
  },
  convictionDot: {
    fontSize: 10,
  },
  targetTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  targetTickerLabel: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetTickerChip: {
    backgroundColor: '#1A2A1A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A4A2A',
  },
  targetTickerText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '700',
  },

  // 섹션
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 21,
  },

  // 인용
  quoteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  quoteIcon: {
    fontSize: 15,
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    color: '#AAAAAA',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // 푸터
  guruFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tickerRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  tickerChip: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tickerText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  sourceText: {
    fontSize: 11,
    color: '#555555',
    maxWidth: 120,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  emptyRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  emptyRefreshText: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // 면책 조항
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#666666',
    lineHeight: 17,
  },
});
