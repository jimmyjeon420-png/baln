/**
 * ScreenshotParseModal — Modal for OCR-parsed asset results
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { ParsedAsset } from '../../features/assets/ocrImport';

interface ScreenshotParseModalProps {
  parsedAssets: ParsedAsset[] | null;
  onClose: () => void;
  onBulkSave: (assets: ParsedAsset[]) => void;
}

export default function ScreenshotParseModal({ parsedAssets, onClose, onBulkSave }: ScreenshotParseModalProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <Modal
      visible={parsedAssets !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {`📸 ${t('add_asset.screenshot_result_title')}`}
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            {t('add_asset.parsed_assets_subtitle', { count: parsedAssets?.length ?? 0 })}
          </Text>
          <ScrollView style={{ maxHeight: 280 }}>
            {parsedAssets?.map((asset, i) => (
              <View key={i} style={[styles.parsedAssetRow, { borderBottomColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.parsedAssetName, { color: colors.textPrimary }]}>
                    {asset.name} ({asset.ticker})
                  </Text>
                  <Text style={[styles.parsedAssetDetail, { color: colors.textSecondary }]}>
                    {t('add_asset.parsed_asset_detail', { qty: asset.quantity, amount: asset.totalCostKRW.toLocaleString() })}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
              onPress={() => parsedAssets && onBulkSave(parsedAssets)}
            >
              <Text style={styles.modalConfirmText}>{t('add_asset.bulk_register_button', { count: parsedAssets?.length ?? 0 })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 14,
  },
  parsedAssetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  parsedAssetName: {
    fontSize: 15,
    fontWeight: '600',
  },
  parsedAssetDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
