/**
 * AssetSearchBar — Search input + dropdown results + direct input button
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { StockItem, getCategoryLabel, getCategoryColor } from '../../data/stockList';

interface AssetSearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (text: string) => void;
  searchResults: StockItem[];
  showDropdown: boolean;
  onShowDropdown: (show: boolean) => void;
  selectedStock: StockItem | null;
  onSelectStock: (stock: StockItem) => void;
  onClearSelection: () => void;
}

export default function AssetSearchBar({
  searchQuery,
  onSearchQueryChange,
  searchResults,
  showDropdown,
  onShowDropdown,
  selectedStock,
  onSelectStock,
  onClearSelection,
}: AssetSearchBarProps) {
  const { colors } = useTheme();
  const { t, language } = useLocale();

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('add_asset.search_label')}</Text>
      <View style={[styles.searchContainer, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={t('add_asset.search_placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={(text) => {
            onSearchQueryChange(text);
            if (selectedStock && text !== selectedStock.name) {
              onClearSelection();
            }
          }}
          onFocus={() => {
            if (searchResults.length > 0) onShowDropdown(true);
          }}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onSearchQueryChange('');
              onClearSelection();
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search dropdown */}
      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {searchResults.map((item) => (
            <TouchableOpacity
              key={item.ticker}
              style={[styles.dropdownItem, { borderBottomColor: colors.surfaceLight }]}
              onPress={() => onSelectStock(item)}
            >
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>
                  {getCategoryLabel(item.category, language)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.dropdownTicker, { color: colors.textSecondary }]}>{item.ticker}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Direct input button when no results */}
      {searchQuery.trim().length > 0 && searchResults.length === 0 && !selectedStock && (
        <TouchableOpacity
          style={[styles.directInputBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
          onPress={() => {
            const ticker = searchQuery.trim().toUpperCase();
            const manualStock: StockItem = {
              ticker,
              name: ticker,
              nameEn: ticker,
              category: 'us_stock',
            };
            onSelectStock(manualStock);
          }}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.directInputText, { color: colors.primary }]}>
            {t('add_asset.direct_input_text', { ticker: searchQuery.trim().toUpperCase() })}
          </Text>
          <Text style={[styles.directInputHint, { color: colors.textTertiary }]}>
            {t('add_asset.direct_input_hint')}
          </Text>
        </TouchableOpacity>
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  clearButton: {
    padding: 10,
  },
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 240,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownTicker: {
    fontSize: 12,
    marginTop: 1,
  },
  directInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    gap: 8,
  },
  directInputText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  directInputHint: {
    fontSize: 12,
  },
});
