import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { TIER_THRESHOLDS } from '../../types/community';

interface SilverMotivationBannerProps {
  totalAssets: number;
}

function formatManWon(amount: number): string {
  const manWon = Math.floor(amount / 10000);
  if (manWon >= 10000) {
    const eok = Math.floor(manWon / 10000);
    const remainder = manWon % 10000;
    if (remainder === 0) {
      return `${eok.toLocaleString()}억`;
    }
    return `${eok.toLocaleString()}억 ${remainder.toLocaleString()}만`;
  }
  return `${manWon.toLocaleString()}만`;
}

export default function SilverMotivationBanner({
  totalAssets,
}: SilverMotivationBannerProps) {
  const goldThreshold = TIER_THRESHOLDS?.GOLD ?? 100_000_000;
  const progress = Math.min(totalAssets / goldThreshold, 1);
  const progressPercent = Math.round(progress * 100);
  const remaining = Math.max(goldThreshold - totalAssets, 0);

  const handleAddAsset = () => {
    router.push('/add-asset');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.crownEmoji}>👑</Text>
        <Text style={styles.title}>골드까지 얼마 남았어요!</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
        <Text style={styles.percentText}>{progressPercent}%</Text>
      </View>

      {/* Remaining amount */}
      {remaining > 0 ? (
        <Text style={styles.remainingText}>
          {formatManWon(remaining)}원 더 모으면 골드!
        </Text>
      ) : (
        <Text style={[styles.remainingText, { color: '#4CAF50' }]}>
          골드 승급 조건을 달성했어요!
        </Text>
      )}

      {/* CTA button */}
      <TouchableOpacity style={styles.ctaButton} onPress={handleAddAsset}>
        <Text style={styles.ctaButtonText}>자산 등록하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF5033',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  crownEmoji: {
    fontSize: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#2A2A3E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  percentText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  remainingText: {
    color: '#CCCCCC',
    fontSize: 13,
    marginBottom: 12,
  },
  ctaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
