/**
 * BadgeShowcase - 뱃지 진열장
 *
 * 역할: "업적 전시관"
 * - 획득한 뱃지: 컬러풀하게 표시
 * - 미획득 뱃지: 회색 + 잠금 + 조건 표시
 * - 카테고리별 분류 (활동/실력/기여/특수)
 *
 * 철학:
 * - 이승건: "뱃지는 돈으로 살 수 없다. 노력의 증거다."
 * - 달리오: "검증은 일관성이다. 365일 출석 > ₩100만원"
 * - 버핏: "뱃지는 신뢰의 시그널이다."
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTrackEvent } from '../../hooks/useAnalytics';
import {
  BADGE_DEFINITIONS,
  getBadgesByCategory,
  type Badge,
} from '../../data/badgeDefinitions';

interface BadgeShowcaseProps {
  /** 사용자가 획득한 뱃지 ID 목록 */
  ownedBadgeIds: string[];
  /** 뱃지 클릭 시 상세 정보 표시 */
  onBadgePress?: (badge: Badge) => void;
}

export function BadgeShowcase({ ownedBadgeIds, onBadgePress }: BadgeShowcaseProps) {
  const track = useTrackEvent();
  const categories: Array<{ key: Badge['category']; title: string; icon: string }> = [
    { key: 'activity', title: '활동 뱃지', icon: '🏆' },
    { key: 'skill', title: '실력 뱃지', icon: '🎯' },
    { key: 'contribution', title: '기여 뱃지', icon: '📚' },
    { key: 'special', title: '특수 뱃지', icon: '⭐' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>내 뱃지</Text>
        <Text style={styles.subtitle}>
          {ownedBadgeIds.length}개 획득 / {BADGE_DEFINITIONS.filter((b) => b.enabled).length}개
        </Text>
      </View>

      {/* 카테고리별 뱃지 */}
      {categories.map((category) => {
        const badges = getBadgesByCategory(category.key);
        if (badges.length === 0) return null;

        return (
          <View key={category.key} style={styles.section}>
            {/* 섹션 헤더 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{category.icon}</Text>
              <Text style={styles.sectionTitle}>{category.title}</Text>
            </View>

            {/* 뱃지 그리드 */}
            <View style={styles.badgeGrid}>
              {badges.map((badge) => {
                const isOwned = ownedBadgeIds.includes(badge.id);
                return (
                  <BadgeItem
                    key={badge.id}
                    badge={badge}
                    isOwned={isOwned}
                    onPress={() => {
                      track('badge_viewed', {
                        badgeId: badge.id,
                        badgeName: badge.name,
                        isOwned,
                        category: badge.category,
                      });
                      onBadgePress?.(badge);
                    }}
                  />
                );
              })}
            </View>
          </View>
        );
      })}

      {/* 하단 여백 */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/** 개별 뱃지 아이템 */
function BadgeItem({
  badge,
  isOwned,
  onPress,
}: {
  badge: Badge;
  isOwned: boolean;
  onPress: () => void;
}) {
  // 희귀도별 테두리 색상
  const rarityColor = {
    common: '#6B7280',
    rare: '#3B82F6',
    epic: '#9333EA',
    legendary: '#F59E0B',
  }[badge.rarity];

  return (
    <TouchableOpacity
      style={[
        styles.badgeItem,
        isOwned && { borderColor: rarityColor, borderWidth: 2 },
        !isOwned && styles.badgeItemLocked,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* 뱃지 아이콘 */}
      <View
        style={[
          styles.badgeIconContainer,
          isOwned && { backgroundColor: badge.color + '20' },
          !isOwned && styles.badgeIconLocked,
        ]}
      >
        <Text style={[styles.badgeIcon, !isOwned && styles.badgeIconTextLocked]}>
          {badge.icon}
        </Text>
        {!isOwned && (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={12} color="#6B7280" />
          </View>
        )}
      </View>

      {/* 뱃지 이름 */}
      <Text
        style={[styles.badgeName, !isOwned && styles.badgeNameLocked]}
        numberOfLines={1}
      >
        {badge.name}
      </Text>

      {/* 희귀도 표시 */}
      {isOwned && (
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
          <Text style={styles.rarityText}>
            {badge.rarity === 'legendary' && '전설'}
            {badge.rarity === 'epic' && '영웅'}
            {badge.rarity === 'rare' && '희귀'}
            {badge.rarity === 'common' && '일반'}
          </Text>
        </View>
      )}

      {/* 미획득 시 조건 표시 */}
      {!isOwned && badge.condition.threshold && (
        <Text style={styles.conditionText} numberOfLines={1}>
          {badge.condition.type === 'streak' && `${badge.condition.threshold}일`}
          {badge.condition.type === 'prediction' && `${badge.condition.threshold}%`}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    position: 'relative',
  },
  badgeItemLocked: {
    opacity: 0.5,
  },
  badgeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  badgeIconLocked: {
    backgroundColor: '#27272720',
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeIconTextLocked: {
    opacity: 0.4,
  },
  lockIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: '#6B7280',
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
  },
  conditionText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});
