/**
 * RecentAssetsBar — Horizontal scrollable recent asset chips
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { getCategoryColor } from '../../data/stockList';
import { RecentAsset } from './types';

interface RecentAssetsBarProps {
  recentAssets: RecentAsset[];
  onSelectRecent: (recent: RecentAsset) => void;
}

export default function RecentAssetsBar({ recentAssets, onSelectRecent }: RecentAssetsBarProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('add_asset.recent_title')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
        {recentAssets.map((recent) => (
          <TouchableOpacity
            key={recent.ticker}
            style={[styles.recentChip, { backgroundColor: colors.surfaceLight }]}
            onPress={() => onSelectRecent(recent)}
          >
            <View style={[styles.recentDot, { backgroundColor: getCategoryColor(recent.category) }]} />
            <Text style={[styles.recentChipText, { color: colors.textSecondary }]}>{recent.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  recentScroll: {
    marginTop: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  recentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recentChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
