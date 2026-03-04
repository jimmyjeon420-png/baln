/**
 * AssetCategoryTabs — stock/cash/bond tab selector
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

export type AssetCategory = 'stock' | 'cash' | 'bond';

interface AssetCategoryTabsProps {
  assetCategory: AssetCategory;
  onCategoryChange: (category: AssetCategory) => void;
}

const TABS = [
  { key: 'stock' as const, labelKey: 'add_asset.category_stock', icon: 'trending-up-outline' as const },
  { key: 'cash' as const, labelKey: 'add_asset.category_cash', icon: 'wallet-outline' as const },
  { key: 'bond' as const, labelKey: 'add_asset.category_bond', icon: 'document-text-outline' as const },
] as const;

export default function AssetCategoryTabs({ assetCategory, onCategoryChange }: AssetCategoryTabsProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View style={[styles.assetCategoryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {TABS.map(({ key, labelKey, icon }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.assetCategoryTab,
            assetCategory === key && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
            { borderColor: colors.border },
          ]}
          onPress={() => onCategoryChange(key)}
        >
          <Ionicons
            name={icon}
            size={14}
            color={assetCategory === key ? colors.primary : colors.textSecondary}
          />
          <Text style={[
            styles.assetCategoryTabText,
            { color: assetCategory === key ? colors.primary : colors.textSecondary },
          ]}>
            {t(labelKey)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  assetCategoryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  assetCategoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  assetCategoryTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
