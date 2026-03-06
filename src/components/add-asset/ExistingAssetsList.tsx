/**
 * ExistingAssetsList — Loading, empty, auth-failed, and asset list states
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { ExistingAsset, formatKRW, getCurrencySymbol } from './types';

interface ExistingAssetsListProps {
  existingAssets: ExistingAsset[];
  loadingAssets: boolean;
  authFailed: boolean;
  onRetryLoad: () => void;
  onEditAsset: (asset: ExistingAsset) => void;
  onDeleteAsset: (asset: ExistingAsset) => void;
}

export default function ExistingAssetsList({
  existingAssets,
  loadingAssets,
  authFailed,
  onRetryLoad,
  onEditAsset,
  onDeleteAsset,
}: ExistingAssetsListProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.existingHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('add_asset.asset_list_title')}</Text>
        {existingAssets.length > 0 && (
          <Text style={[styles.assetCount, { color: colors.textSecondary }]}>{t('add_asset_count', { count: String(existingAssets.length) })}</Text>
        )}
      </View>

      {loadingAssets ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('add_asset.loading_assets')}</Text>
        </View>
      ) : authFailed ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="log-in-outline" size={40} color={colors.error} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('add_asset.auth_failed_text')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{t('add_asset.auth_failed_subtext')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetryLoad}
          >
            <Text style={[styles.retryButtonText, { color: colors.primary }]}>{t('add_asset.retry_button')}</Text>
          </TouchableOpacity>
        </View>
      ) : existingAssets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('add_asset.empty_text')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{t('add_asset.empty_subtext')}</Text>
        </View>
      ) : (
        existingAssets.map((asset) => (
          <View key={asset.id} style={[styles.assetRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.assetInfo}
              onPress={() => onEditAsset(asset)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.assetName, { color: colors.textPrimary }]}>{asset.name}</Text>
                <Text style={[styles.assetTicker, { color: colors.textSecondary }]}>{asset.ticker}</Text>
              </View>
              <View style={styles.assetValues}>
                <Text style={[styles.assetValue, { color: colors.textPrimary }]}>
                  {formatKRW(asset.current_value)}
                </Text>
                <Text style={[styles.assetQuantity, { color: colors.textSecondary }]}>
                  {asset.quantity}주 / {getCurrencySymbol(asset.ticker)}{(asset.avg_price || 0).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.assetActions}>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: colors.surfaceLight }]}
                onPress={() => onEditAsset(asset)}
              >
                <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDeleteAsset(asset)}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
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
  existingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  assetCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  assetInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetName: {
    fontSize: 15,
    fontWeight: '600',
  },
  assetTicker: {
    fontSize: 12,
    marginTop: 2,
  },
  assetValues: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  assetValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  assetQuantity: {
    fontSize: 12,
    marginTop: 2,
  },
  assetActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(207, 102, 121, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
