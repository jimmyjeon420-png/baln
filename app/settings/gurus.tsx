/**
 * 투자 거장 인사이트 (Guru Insights) 화면
 * 워렌 버핏, 레이 달리오 등 10명의 투자 거장 분석
 * Central Kitchen 배치 데이터 표시 (매일 07:00 업데이트)
 */

import React, { useState, useCallback } from 'react';
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
import { useGuruInsights } from '../../src/hooks/useSharedAnalysis';
import { GuruInsightsSkeleton } from '../../src/components/SkeletonLoader';
import type { GuruInsight } from '../../src/services/centralKitchen';
import { useQueryClient } from '@tanstack/react-query';
import { GURU_INSIGHTS_KEY } from '../../src/hooks/useSharedAnalysis';
import { useTheme } from '../../src/hooks/useTheme';

// 센티먼트 필터 옵션
type SentimentFilter = 'ALL' | 'BULLISH' | 'BEARISH' | 'CAUTIOUS' | 'NEUTRAL';

const FILTER_OPTIONS: { key: SentimentFilter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'BULLISH', label: '강세' },
  { key: 'BEARISH', label: '약세' },
  { key: 'CAUTIOUS', label: '신중' },
  { key: 'NEUTRAL', label: '중립' },
];

// 센티먼트별 색상
const SENTIMENT_COLORS: Record<string, string> = {
  BULLISH: '#4CAF50',
  BEARISH: '#CF6679',
  CAUTIOUS: '#FF9800',
  NEUTRAL: '#FFD700',
};

const SENTIMENT_LABELS: Record<string, string> = {
  BULLISH: '강세',
  BEARISH: '약세',
  CAUTIOUS: '신중',
  NEUTRAL: '중립',
};

export default function GuruInsightsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading, isRefetching } = useGuruInsights();
  const [filter, setFilter] = useState<SentimentFilter>('ALL');

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
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>투자 거장 인사이트</Text>
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
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>투자 거장 인사이트</Text>
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
            <Text style={styles.emptyTitle}>아직 거장 인사이트가 없습니다</Text>
            <Text style={styles.emptyDescription}>
              매일 아침 7시에 10명의 투자 거장 분석이{'\n'}자동으로 업데이트됩니다.
            </Text>
            <TouchableOpacity style={styles.emptyRefreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color="#4CAF50" />
              <Text style={styles.emptyRefreshText}>새로고침</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 시장 맥락 배너 */}
            {data.market_context && (
              <View style={styles.contextBanner}>
                <Text style={styles.contextIcon}>🌍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contextLabel}>오늘의 시장 맥락</Text>
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
                  '{SENTIMENT_LABELS[filter]}' 포지션의 거장이 없습니다
                </Text>
              </View>
            )}

            {/* 거장 카드 리스트 */}
            {filteredInsights.map((guru: GuruInsight, index: number) => (
              <GuruCard key={`${guru.guruNameEn}-${index}`} guru={guru} />
            ))}

            {/* 면책 조항 */}
            <View style={styles.disclaimer}>
              <Ionicons name="warning-outline" size={14} color="#666666" />
              <Text style={styles.disclaimerText}>
                본 정보는 AI가 공개 데이터를 기반으로 생성한 가상의 분석이며, 실제 투자 거장의 공식 의견이 아닙니다. 「자본시장법」상 투자자문에 해당하지 않으며, 특정 금융상품의 매수·매도 권유가 아닙니다. 전망성 정보(Forward-looking statements)는 실제 결과와 다를 수 있습니다. 투자 결정은 본인의 판단과 전문가 상담에 따라 이루어져야 합니다.
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
  const sentimentColor = SENTIMENT_COLORS[guru.sentiment] || '#FFD700';
  const sentimentLabel = SENTIMENT_LABELS[guru.sentiment] || '중립';

  return (
    <View style={styles.guruCard}>
      {/* 헤더: 이모지 + 이름 + 센티먼트 배지 */}
      <View style={styles.guruHeader}>
        <View style={styles.guruAvatar}>
          <Text style={styles.guruEmoji}>{guru.emoji}</Text>
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

      {/* 최근 행동 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>최근 행동</Text>
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
        <Text style={styles.sectionLabel}>분석</Text>
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
            출처: {guru.source}
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
    fontSize: 20,
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
    fontSize: 11,
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
    fontSize: 24,
  },
  contextLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
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
    fontSize: 13,
    color: '#AAAAAA',
    fontWeight: '500',
  },

  // 필터 결과 없음
  noFilterResult: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noFilterText: {
    fontSize: 14,
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
    fontSize: 22,
  },
  guruInfo: {
    flex: 1,
    marginLeft: 12,
  },
  guruName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guruOrg: {
    fontSize: 12,
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
    fontSize: 11,
    fontWeight: '700',
  },

  // 섹션
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
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
    fontSize: 14,
  },
  quoteText: {
    flex: 1,
    fontSize: 13,
    color: '#AAAAAA',
    fontStyle: 'italic',
    lineHeight: 19,
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
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  sourceText: {
    fontSize: 10,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 14,
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
    fontSize: 11,
    color: '#666666',
    lineHeight: 16,
  },
});
