/**
 * Gathering Card - 모임/스터디 카드 컴포넌트
 * VIP 라운지 마켓플레이스용 프리미엄 다크 테마
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gathering, GATHERING_CATEGORY_LABELS, UserTier } from '../types/database';
import { formatAssetInBillion, TIER_COLORS, canAccessTier, TIER_LABELS } from '../hooks/useGatherings';

interface GatheringCardProps {
  gathering: Gathering;
  onPress?: () => void;
  userTier?: UserTier; // 현재 사용자 티어 (TBAC용)
}

// 티어 아이콘
const getTierIcon = (tier: UserTier): keyof typeof Ionicons.glyphMap => {
  switch (tier) {
    case 'DIAMOND': return 'diamond';
    case 'PLATINUM': return 'star';
    case 'GOLD': return 'trophy';
    case 'SILVER': return 'medal';
    default: return 'ribbon';
  }
};

// 카테고리 아이콘
const getCategoryIcon = (category: Gathering['category']): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'study': return 'book';
    case 'meeting': return 'people';
    case 'networking': return 'link';
    case 'workshop': return 'construct';
    default: return 'calendar';
  }
};

// 날짜 포맷팅
const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

  return `${month}/${day}(${dayOfWeek}) ${hours}:${minutes}`;
};

// 금액 포맷팅
const formatCurrency = (amount: number): string => {
  if (amount === 0) return '무료';
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
};

// 플랫폼 수수료율 (10%)
const PLATFORM_FEE_RATE = 0.1;

// 수수료 계산
const calculateFee = (amount: number): { fee: number; total: number } => {
  if (amount === 0) return { fee: 0, total: 0 };
  const fee = Math.round(amount * PLATFORM_FEE_RATE);
  return { fee, total: amount + fee };
};

export default function GatheringCard({ gathering, onPress, userTier }: GatheringCardProps) {
  const tierColor = TIER_COLORS[gathering.host_tier];
  const tierIcon = getTierIcon(gathering.host_tier);
  const categoryIcon = getCategoryIcon(gathering.category);
  const isFull = gathering.current_capacity >= gathering.max_capacity;
  const isClosed = gathering.status === 'closed' || gathering.status === 'cancelled';

  // TBAC: 티어 기반 접근 제어
  const minTierRequired = gathering.min_tier_required || 'SILVER';
  const isBlockedByTier = userTier ? !canAccessTier(userTier, minTierRequired) : false;
  const minTierColor = TIER_COLORS[minTierRequired];
  const minTierIcon = getTierIcon(minTierRequired);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isClosed && styles.closedContainer,
        isBlockedByTier && styles.blockedContainer,
      ]}
      onPress={onPress}
      activeOpacity={isBlockedByTier ? 0.9 : 0.7}
    >
      {/* 티어 차단 오버레이 */}
      {isBlockedByTier && (
        <View style={styles.blockedOverlay}>
          <View style={[styles.lockedBadge, { borderColor: minTierColor }]}>
            <Ionicons name="lock-closed" size={14} color={minTierColor} />
            <Text style={[styles.lockedText, { color: minTierColor }]}>
              {TIER_LABELS[minTierRequired]} 이상
            </Text>
          </View>
        </View>
      )}

      {/* 상단: 카테고리 + 상태 + 최소 티어 */}
      <View style={styles.topRow}>
        <View style={styles.leftBadges}>
          <View style={[styles.categoryBadge, isBlockedByTier && styles.fadedBadge]}>
            <Ionicons name={categoryIcon} size={12} color={isBlockedByTier ? '#666' : '#4CAF50'} />
            <Text style={[styles.categoryText, isBlockedByTier && styles.fadedText]}>
              {GATHERING_CATEGORY_LABELS[gathering.category]}
            </Text>
          </View>
          {/* 최소 티어 요구사항 배지 */}
          {minTierRequired !== 'SILVER' && (
            <View style={[styles.tierRequirementBadge, { backgroundColor: `${minTierColor}20` }]}>
              <Ionicons name={minTierIcon} size={10} color={minTierColor} />
              <Text style={[styles.tierRequirementText, { color: minTierColor }]}>
                {TIER_LABELS[minTierRequired]}+
              </Text>
            </View>
          )}
        </View>
        {isFull && (
          <View style={styles.fullBadge}>
            <Text style={styles.fullBadgeText}>마감</Text>
          </View>
        )}
        {gathering.status === 'cancelled' && (
          <View style={styles.cancelledBadge}>
            <Text style={styles.cancelledBadgeText}>취소됨</Text>
          </View>
        )}
      </View>

      {/* 제목 */}
      <Text style={[styles.title, isBlockedByTier && styles.fadedTitle]} numberOfLines={2}>
        {gathering.title}
      </Text>

      {/* 호스트 정보 */}
      <View style={styles.hostRow}>
        <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
          <Ionicons name={tierIcon} size={12} color="#000000" />
        </View>
        <View style={styles.hostInfo}>
          <View style={styles.hostNameRow}>
            <Text style={styles.hostName}>{gathering.host_display_name || '익명'}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.verifiedText}>인증됨</Text>
            </View>
          </View>
          <Text style={[styles.hostAssets, { color: tierColor }]}>
            [자산: {formatAssetInBillion(gathering.host_verified_assets)} 인증]
          </Text>
        </View>
      </View>

      {/* 모임 정보 */}
      <View style={styles.infoGrid}>
        {/* 일시 */}
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={14} color="#888888" />
          <Text style={styles.infoText}>{formatEventDate(gathering.event_date)}</Text>
        </View>

        {/* 장소 */}
        <View style={styles.infoItem}>
          <Ionicons
            name={gathering.location_type === 'online' ? 'videocam-outline' : 'location-outline'}
            size={14}
            color="#888888"
          />
          <Text style={styles.infoText} numberOfLines={1}>
            {gathering.location_type === 'online' ? '온라인' : gathering.location}
          </Text>
        </View>
      </View>

      {/* 하단: 참가비 + 수수료 + 인원 */}
      <View style={styles.bottomRow}>
        <View style={styles.feeContainer}>
          <View style={styles.feeMainRow}>
            <Text style={styles.feeLabel}>참가비</Text>
            <Text style={[styles.feeValue, gathering.entry_fee === 0 && styles.freeFee]}>
              {formatCurrency(gathering.entry_fee)}
            </Text>
          </View>
          {gathering.entry_fee > 0 && (
            <Text style={styles.feeDetail}>
              (수수료 {formatCurrency(calculateFee(gathering.entry_fee).fee)} 별도)
            </Text>
          )}
        </View>

        <View style={styles.capacityContainer}>
          <Ionicons name="people" size={16} color="#888888" />
          <Text style={styles.capacityText}>
            <Text style={isFull ? styles.capacityFull : styles.capacityCurrent}>
              {gathering.current_capacity}
            </Text>
            /{gathering.max_capacity}명
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    position: 'relative',
    overflow: 'hidden',
  },
  closedContainer: {
    opacity: 0.6,
  },
  // TBAC: 티어 차단 스타일
  blockedContainer: {
    opacity: 0.7,
    borderColor: '#3A3A3A',
  },
  blockedOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  leftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tierRequirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  tierRequirementText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fadedBadge: {
    backgroundColor: 'rgba(102, 102, 102, 0.15)',
  },
  fadedText: {
    color: '#666666',
  },
  fadedTitle: {
    color: '#888888',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  fullBadge: {
    backgroundColor: 'rgba(207, 102, 121, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  fullBadgeText: {
    fontSize: 11,
    color: '#CF6679',
    fontWeight: '600',
  },
  cancelledBadge: {
    backgroundColor: 'rgba(136, 136, 136, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cancelledBadgeText: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 24,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  tierBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostInfo: {
    flex: 1,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  hostAssets: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#B0B0B0',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  feeContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  feeMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeLabel: {
    fontSize: 12,
    color: '#888888',
  },
  feeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  freeFee: {
    color: '#4CAF50',
  },
  feeDetail: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityText: {
    fontSize: 14,
    color: '#888888',
  },
  capacityCurrent: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  capacityFull: {
    color: '#CF6679',
    fontWeight: '700',
  },
});
