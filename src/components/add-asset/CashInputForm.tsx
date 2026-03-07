/**
 * CashInputForm — Cash type selector + amount input + save button
 */

import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { INPUT_ACCESSORY_ID } from './types';
import { getCurrencySymbol } from '../../utils/formatters';

type CashType = 'CASH_KRW' | 'CASH_USD' | 'CASH_CMA';

interface CashInputFormProps {
  cashType: CashType;
  onCashTypeChange: (type: CashType) => void;
  cashAmount: string;
  onCashAmountChange: (amount: string) => void;
  cashSaving: boolean;
  onCashSave: () => void;
}

const CASH_TYPE_OPTIONS = [
  { key: 'CASH_KRW' as const, labelKey: 'add_asset.cash_krw_label', descKey: 'add_asset.cash_krw_desc' },
  { key: 'CASH_USD' as const, labelKey: 'add_asset.cash_usd_label', descKey: 'add_asset.cash_usd_desc' },
  { key: 'CASH_CMA' as const, labelKey: 'add_asset.cash_cma_label', descKey: 'add_asset.cash_cma_desc' },
] as const;

export default function CashInputForm({
  cashType,
  onCashTypeChange,
  cashAmount,
  onCashAmountChange,
  cashSaving,
  onCashSave,
}: CashInputFormProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View>
      {/* Cash type selector */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('add_asset.cash_type_label')}</Text>
        <View style={styles.cashTypeRow}>
          {CASH_TYPE_OPTIONS.map(({ key, labelKey, descKey }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.cashTypeBtn,
                cashType === key
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surfaceLight, borderColor: colors.border },
              ]}
              onPress={() => onCashTypeChange(key)}
            >
              <Text style={[styles.cashTypeBtnLabel, { color: cashType === key ? '#fff' : colors.textPrimary }]}>
                {t(labelKey)}
              </Text>
              <Text style={[styles.cashTypeBtnDesc, { color: cashType === key ? 'rgba(255,255,255,0.8)' : colors.textTertiary }]}>
                {t(descKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          {cashType === 'CASH_USD' ? t('add_asset.amount_label_usd') : t('add_asset.amount_label_krw')}
        </Text>
        <View style={[styles.priceInputRow, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>
            {cashType === 'CASH_USD' ? '$' : getCurrencySymbol()}
          </Text>
          <TextInput
            style={[styles.priceInput, { color: colors.textPrimary }]}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            value={cashAmount}
            onChangeText={(text) => onCashAmountChange(text.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            selectTextOnFocus
            inputAccessoryViewID={INPUT_ACCESSORY_ID}
          />
        </View>
        {cashType === 'CASH_USD' && parseFloat(cashAmount) > 0 && (
          <Text style={[styles.krwPreview, { color: colors.textSecondary }]}>
            {t('add_asset.krw_preview', { amount: Math.round(parseFloat(cashAmount) * 1450).toLocaleString() })}
          </Text>
        )}
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: colors.primary },
          (!cashAmount || parseFloat(cashAmount) <= 0) && [styles.saveButtonDisabled, { backgroundColor: colors.surfaceLight }],
        ]}
        onPress={onCashSave}
        disabled={cashSaving || !cashAmount || parseFloat(cashAmount) <= 0}
      >
        {cashSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{t('add_asset.cash_register_button')}</Text>
          </>
        )}
      </TouchableOpacity>
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
  cashTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cashTypeBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cashTypeBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  cashTypeBtnDesc: {
    fontSize: 11,
    textAlign: 'center',
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
  krwPreview: {
    fontSize: 13,
    marginTop: 5,
    fontWeight: '500',
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
});
