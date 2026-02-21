/**
 * NewsCard — 뉴스 카드 컴포넌트
 *
 * 역할: 뉴스 한 건을 보여주는 카드 부서
 * - 블루밍비트 스타일: 제목 + 소스 + 시간 + 태그 칩
 * - PiCK 뉴스는 특별 배지 표시
 * - 탭하면 원문 링크 열기
 *
 * 비유: 신문의 한 기사 — 제목, 출처, 시간이 한눈에 보이고, 중요 기사엔 "PICK" 스티커
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { MarketNewsItem, getTimeAgo } from '../../hooks/useMarketNews';

// ============================================================================
// 카테고리 설정
// ============================================================================

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  crypto: { icon: 'logo-bitcoin', color: '#F7931A', label: '크립토' },
  stock: { icon: 'trending-up', color: '#4CAF50', label: '주식' },
  macro: { icon: 'globe-outline', color: '#29B6F6', label: '매크로' },
  general: { icon: 'newspaper-outline', color: '#9E9E9E', label: '일반' },
};

// ============================================================================
// Props
// ============================================================================

interface NewsCardProps {
  item: MarketNewsItem;
  /** 컴팩트 모드 (미리보기 위젯용) */
  compact?: boolean;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function NewsCard({ item, compact = false }: NewsCardProps) {
  const { colors } = useTheme();
  const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;

  const handlePress = () => {
    if (item.source_url) {
      Linking.openURL(item.source_url).catch(() => {
        console.warn('[NewsCard] URL 열기 실패:', item.source_url);
      });
    }
  };

  // --- 컴팩트 모드 (미리보기 위젯용) ---
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.surfaceLight }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.is_pick && (
              <Text style={styles.pickInline}>PiCK </Text>
            )}
            {item.title}
          </Text>
          <View style={styles.compactMeta}>
            <Text style={[styles.compactSource, { color: colors.textTertiary }]}>
              {item.source_name}
            </Text>
            <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.compactTime, { color: colors.textTertiary }]}>
              {getTimeAgo(item.published_at)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  }

  // --- 풀 모드 (전체 화면용) ---
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* 상단: 카테고리 + PiCK 배지 */}
      <View style={styles.topRow}>
        <View style={[styles.categoryChip, { backgroundColor: catConfig.color + '20' }]}>
          <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} />
          <Text style={[styles.categoryLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
        </View>
        {item.is_pick && (
          <View style={styles.pickBadge}>
            <Ionicons name="flash" size={10} color="#000" />
            <Text style={styles.pickText}>PiCK</Text>
          </View>
        )}
      </View>

      {/* 제목 */}
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* 요약 (있을 때만) */}
      {item.summary && (
        <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.summary}
        </Text>
      )}

      {/* PiCK 이유 (있을 때만) */}
      {item.is_pick && item.pick_reason && (
        <View style={[styles.pickReasonBox, { backgroundColor: '#FFC10720' }]}>
          <Ionicons name="bulb-outline" size={12} color="#FFC107" />
          <Text style={[styles.pickReasonText, { color: '#FFC107' }]}>
            {item.pick_reason}
          </Text>
        </View>
      )}

      {/* 태그 칩 */}
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={[styles.tagChip, { backgroundColor: colors.surfaceLight }]}
            >
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 하단: 소스 + 시간 */}
      <View style={styles.bottomRow}>
        <Text style={[styles.sourceName, { color: colors.textTertiary }]}>
          {item.source_name}
        </Text>
        <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
        <Text style={[styles.timeAgo, { color: colors.textTertiary }]}>
          {getTimeAgo(item.published_at)}
        </Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  // --- 풀 카드 ---
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
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
  pickText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
  },
  pickReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pickReasonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sourceName: {
    fontSize: 11,
  },
  timeAgo: {
    fontSize: 11,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },

  // --- 컴팩트 카드 ---
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  compactContent: {
    flex: 1,
    gap: 4,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  pickInline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFC107',
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactSource: {
    fontSize: 11,
  },
  compactTime: {
    fontSize: 11,
  },
});
