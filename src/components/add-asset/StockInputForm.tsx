/**
 * StockInputForm — Selected badge, quantity input, price input, avg calc, total preview, save/cancel buttons
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { StockItem, getCategoryColor } from '../../data/stockList';
import { ExistingAsset, INPUT_ACCESSORY_ID } from './types';

interface StockInputFormProps {
  selectedStock: StockItem | null;
  quantity: string;
  onQuantityChange: (text: string) => void;
  price: string;
  onPriceChange: (text: string) => void;
  totalValue: number;
  matchingExisting: ExistingAsset | null;
  editingAsset: ExistingAsset | null;
  saving: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
}

export default function StockInputForm({
  selectedStock,
  quantity,
  onQuantityChange,
  price,
  onPriceChange,
  totalValue,
  matchingExisting,
  editingAsset,
  saving,
  onSave,
  onCancelEdit,
}: StockInputFormProps) {
  const { colors } = useTheme();
  const { t, language } = useLocale();
  const shareUnit = language === 'ko' ? '주' : language === 'ja' ? '株' : ' shares';

  return (
    <>
      {/* Selected stock badge */}
      {selectedStock && (
        <View style={styles.selectedBadge}>
          <View style={[styles.selectedBadgeDot, { backgroundColor: getCategoryColor(selectedStock.category) }]} />
          <Text style={[styles.selectedBadgeName, { color: colors.textPrimary }]}>{selectedStock.name}</Text>
          <Text style={[styles.selectedBadgeTicker, { color: colors.textSecondary }]}>({selectedStock.ticker})</Text>
        </View>
      )}

      {/* Quantity input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('add_asset.quantity_label')}</Text>
        <TextInput
          style={[styles.numberInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder={t('add_asset.quantity_placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={quantity}
          onChangeText={(text) => onQuantityChange(text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          selectTextOnFocus
          inputAccessoryViewID={INPUT_ACCESSORY_ID}
        />
      </View>

      {/* Total cost (KRW) */}
      <View style={styles.inputGroup}>
        <View style={styles.priceLabelRow}>
          <View style={styles.priceLabelGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('add_asset.total_cost_label')}</Text>
            <Text style={[styles.priceHelp, { color: colors.textTertiary }]}>{t('add_asset.total_cost_optional')}</Text>
          </View>
        </View>
        <View style={[styles.priceInputRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>₩</Text>
          <TextInput
            style={[styles.priceInput, { color: colors.textPrimary }]}
            placeholder={t('add_asset.total_cost_placeholder')}
            placeholderTextColor={colors.textTertiary}
            value={price}
            onChangeText={(text) => onPriceChange(text.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            selectTextOnFocus
            inputAccessoryViewID={INPUT_ACCESSORY_ID}
          />
        </View>
      </View>

      {/* Average calc card for existing holdings */}
      {matchingExisting && parseFloat(quantity) > 0 && parseFloat(price) > 0 && (
        <View style={[styles.avgCalcCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Ionicons name="calculator-outline" size={14} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.avgCalcTitle, { color: colors.textPrimary }]}>{t('add_asset.avg_calc_title')}</Text>
            <Text style={[styles.avgCalcDetail, { color: colors.textSecondary }]}>
              {t('add_asset.avg_calc_existing', { qty: String(matchingExisting.quantity), unit: shareUnit, avg: matchingExisting.avg_price.toLocaleString() })}
              {' '}+ {t('add_asset.avg_calc_new', { qty: String(parseFloat(quantity) || 0), unit: shareUnit, total: (parseFloat(price) || 0).toLocaleString() })}
            </Text>
            <Text style={[styles.avgCalcResult, { color: colors.primary }]}>
              {(() => {
                const newQty = matchingExisting.quantity + (parseFloat(quantity) || 0);
                const existingTotal = matchingExisting.quantity * matchingExisting.avg_price;
                const newTotal = parseFloat(price) || 0;
                const newAvg = newQty > 0 ? Math.round((existingTotal + newTotal) / newQty) : 0;
                return t('add_asset.avg_calc_result', { avg: newAvg.toLocaleString(), qty: String(newQty), unit: shareUnit });
              })()}
            </Text>
          </View>
        </View>
      )}

      {/* Total value preview */}
      {totalValue > 0 && (
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('add_asset.total_label')}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              ₩{totalValue.toLocaleString()}
            </Text>
            {parseFloat(quantity) > 0 && (
              <Text style={[styles.totalValueKrw, { color: colors.textSecondary }]}>
                {`Avg ₩${Math.round(totalValue / (parseFloat(quantity) || 1)).toLocaleString()}`}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Save button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: colors.primary },
          (!selectedStock || !quantity) && [styles.saveButtonDisabled, { backgroundColor: colors.surfaceLight }],
        ]}
        onPress={onSave}
        disabled={saving || !selectedStock || !quantity}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name={editingAsset ? 'checkmark-circle' : 'add-circle'} size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {editingAsset ? t('add_asset.edit_done_button') : t('add_asset.register_button')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Cancel edit button */}
      {editingAsset && (
        <TouchableOpacity
          style={styles.cancelEditButton}
          onPress={onCancelEdit}
        >
          <Text style={[styles.cancelEditText, { color: colors.textSecondary }]}>{t('add_asset.cancel_edit_button')}</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  selectedBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedBadgeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedBadgeTicker: {
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 14,
    zIndex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  numberInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  priceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabelGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceHelp: {
    fontSize: 12,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: 16,
    paddingLeft: 14,
    fontWeight: '600',
  },
  priceInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  avgCalcCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  avgCalcTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  avgCalcDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  avgCalcResult: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.12)',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  totalValueKrw: {
    fontSize: 13,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  cancelEditButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  cancelEditText: {
    fontSize: 14,
  },
});
