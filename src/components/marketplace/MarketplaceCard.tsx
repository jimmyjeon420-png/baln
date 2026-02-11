/**
 * MarketplaceCard - 마켓플레이스 상품 카드
 *
 * 역할: "상품 진열대"
 * - 상품 정보 표시 (아이콘, 이름, 설명)
 * - 가격 표시 (크레딧 + 원화 병기)
 * - 잔액 부족 시 회색 처리
 * - 비활성화 상품 "🔐 곧 공개" 표시
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MarketplaceItem } from '../../data/marketplaceItems';
import { formatCredits } from '../../utils/formatters';

interface MarketplaceCardProps {
  /** 상품 정보 */
  item: MarketplaceItem;
  /** 구매 가능 여부 (잔액 충분) */
  canAfford: boolean;
  /** 현재 크레딧 잔액 */
  currentBalance: number;
  /** 구매 버튼 클릭 핸들러 */
  onPurchase: (itemId: string) => void;
}

export function MarketplaceCard({
  item,
  canAfford,
  currentBalance,
  onPurchase,
}: MarketplaceCardProps) {
  const isEnabled = item.enabled;
  const isAffordable = canAfford && isEnabled;

  // 버튼 텍스트
  let buttonText = '구매하기';
  if (!isEnabled) buttonText = '🔐 곧 공개';
  else if (!canAfford) buttonText = `${item.price - currentBalance}C 부족`;

  return (
    <View style={[styles.card, !isAffordable && styles.cardDisabled]}>
      {/* 아이콘 */}
      <View style={[styles.iconContainer, !isEnabled && styles.iconDisabled]}>
        <Text style={styles.icon}>{item.icon}</Text>
        {!isEnabled && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#FFF" />
          </View>
        )}
      </View>

      {/* 상품명 */}
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>

      {/* 설명 */}
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      {/* 가격 섹션 */}
      <View style={styles.priceContainer}>
        <View style={styles.priceRow}>
          <Text style={[styles.priceCredit, !isAffordable && styles.priceDisabled]}>
            {item.price}C
          </Text>
          {item.stock && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>한정 {item.stock}</Text>
            </View>
          )}
        </View>
        <Text style={styles.priceKRW}>₩{item.priceKRW.toLocaleString()}</Text>
      </View>

      {/* 구매 버튼 */}
      <TouchableOpacity
        style={[
          styles.button,
          !isAffordable && styles.buttonDisabled,
        ]}
        onPress={() => onPurchase(item.id)}
        disabled={!isAffordable}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            !isAffordable && styles.buttonTextDisabled,
          ]}
        >
          {buttonText}
        </Text>
      </TouchableOpacity>

      {/* Tier 3 특수 뱃지 */}
      {item.tier === 'loyalty' && (
        <View style={styles.tierBadge}>
          <Ionicons name="star" size={10} color="#F59E0B" />
          <Text style={styles.tierText}>충성 보상</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 12,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9333EA20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  iconDisabled: {
    backgroundColor: '#37373720',
  },
  icon: {
    fontSize: 28,
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 12,
    minHeight: 36,
  },
  priceContainer: {
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceCredit: {
    fontSize: 20,
    fontWeight: '800',
    color: '#9333EA',
    marginRight: 8,
  },
  priceDisabled: {
    color: '#6B7280',
  },
  priceKRW: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  stockBadge: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  button: {
    backgroundColor: '#9333EA',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  buttonTextDisabled: {
    color: '#6B7280',
  },
  tierBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 3,
  },
});
