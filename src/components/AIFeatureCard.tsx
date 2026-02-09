/**
 * AIFeatureCard - 마켓플레이스 기능 진열 카드
 * 아이콘 + 제목 + 설명 + 크레딧 비용 표시
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDiscountedCost } from '../services/creditService';
import type { AIFeatureType } from '../types/marketplace';
import type { UserTier } from '../types/database';

interface AIFeatureCardProps {
  featureType: AIFeatureType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  userTier: UserTier;
  onPress: () => void;
}

export default function AIFeatureCard({
  featureType,
  title,
  description,
  icon,
  iconColor,
  userTier,
  onPress,
}: AIFeatureCardProps) {
  const { originalCost, discountedCost, discountPercent, isFree } = getDiscountedCost(featureType, userTier);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      </View>

      <View style={styles.costContainer}>
        {isFree ? (
          // 무료 기간: FREE 뱃지
          <>
            <Text style={styles.originalCost}>{originalCost}</Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          </>
        ) : (
          // 유료 기간: 기존 크레딧 표시
          <>
            {discountPercent > 0 && (
              <Text style={styles.originalCost}>{originalCost}</Text>
            )}
            <View style={styles.costRow}>
              <Ionicons name="diamond" size={12} color="#7C4DFF" />
              <Text style={styles.cost}>{discountedCost}</Text>
            </View>
            {discountPercent > 0 && (
              <Text style={styles.discountLabel}>-{discountPercent}%</Text>
            )}
          </>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#555" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    color: '#888',
    fontSize: 12,
    lineHeight: 16,
  },
  costContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  originalCost: {
    color: '#555',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cost: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  discountLabel: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '700',
  },
  freeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
});
