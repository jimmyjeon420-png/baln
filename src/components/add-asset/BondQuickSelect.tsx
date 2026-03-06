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
  { ticker: 'TLT', nameKey: 'bond_names.TLT' },
  { ticker: 'SHY', nameKey: 'bond_names.SHY' },
  { ticker: 'BND', nameKey: 'bond_names.BND' },
  { ticker: 'AGG', nameKey: 'bond_names.AGG' },
  { ticker: '148070.KS', nameKey: 'bond_names.KODEX_3Y' },
  { ticker: '114820.KS', nameKey: 'bond_names.KODEX_SHORT' },
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
              name: t(bond.nameKey),
              nameEn: bond.ticker,
              category: 'bond',
            })}
          >
            <Text style={[styles.bondChipTicker, { color: '#64B5F6' }]}>{bond.ticker}</Text>
            <Text style={[styles.bondChipName, { color: colors.textSecondary }]}>{t(bond.nameKey)}</Text>
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
