/**
 * BondQuickSelect — Quick bond selection chips
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { StockItem } from '../../data/stockList';

interface BondQuickSelectProps {
  selectedTicker: string | null;
  onSelectBond: (stock: StockItem) => void;
}

const BOND_OPTIONS = [
  { ticker: 'TLT', name: '미국 장기국채' },
  { ticker: 'SHY', name: '미국 단기국채' },
  { ticker: 'BND', name: '뱅가드채권' },
  { ticker: 'AGG', name: '미국종합채권' },
  { ticker: '148070.KS', name: 'KODEX국채3년' },
  { ticker: '114820.KS', name: 'KODEX단기채권' },
] as const;

export default function BondQuickSelect({ selectedTicker, onSelectBond }: BondQuickSelectProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('add_asset.bond_quick_label')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {BOND_OPTIONS.map((bond) => (
          <TouchableOpacity
            key={bond.ticker}
            style={[
              styles.bondChip,
              selectedTicker === bond.ticker
                ? { backgroundColor: '#64B5F620', borderColor: '#64B5F6' }
                : { backgroundColor: colors.surfaceLight, borderColor: colors.border },
            ]}
            onPress={() => onSelectBond({
              ticker: bond.ticker,
              name: bond.name,
              nameEn: bond.ticker,
              category: 'bond',
            })}
          >
            <Text style={[styles.bondChipTicker, { color: '#64B5F6' }]}>{bond.ticker}</Text>
            <Text style={[styles.bondChipName, { color: colors.textSecondary }]}>{bond.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 14,
    zIndex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  bondChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 90,
  },
  bondChipTicker: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bondChipName: {
    fontSize: 11,
  },
});
