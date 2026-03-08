/**
 * 실행 기록 입력 화면 — AI 제안을 실제로 실행했을 때 수동 기록
 *
 * 진입: TodayActionsSection → "실행 완료 기록" 버튼
 * Params: ticker, name, action, suggestedPrice, suggestedQty
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSaveExecution } from '../src/hooks/useExecutions';
import type { ExecutionInput } from '../src/types/rebalanceExecution';
import { useTheme } from '../src/hooks/useTheme';
import { getLocaleCode, getCurrencySymbol } from '../src/utils/formatters';
import { useLocale } from '../src/context/LocaleContext';

export default function LogTradeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const params = useLocalSearchParams<{
    ticker: string;
    name: string;
    action: 'BUY' | 'SELL';
    suggestedPrice?: string;
    suggestedQty?: string;
  }>();

  const { mutateAsync: saveExecution, isPending } = useSaveExecution();

  // 폼 상태
  const [executedAt, setExecutedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [executedPrice, setExecutedPrice] = useState(params.suggestedPrice || '');
  const [executedQty, setExecutedQty] = useState(params.suggestedQty || '');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    // 입력 검증
    const price = parseFloat(executedPrice);
    const qty = parseInt(executedQty, 10);

    if (isNaN(price) || price <= 0) {
      Alert.alert(t('log_trade.alert_price_title'), t('log_trade.alert_price_msg'));
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      Alert.alert(t('log_trade.alert_qty_title'), t('log_trade.alert_qty_msg'));
      return;
    }

    // 확인 모달
    Alert.alert(
      t('log_trade.confirm_title'),
      `${params.name} (${params.ticker})\n${params.action === 'BUY' ? t('log_trade.action_buy') : t('log_trade.action_sell')} ${qty} × ${getCurrencySymbol()}${Math.floor(price).toLocaleString()}\n\n${t('log_trade.disclaimer')}`,
      [
        { text: t('log_trade.confirm_cancel'), style: 'cancel' },
        {
          text: t('log_trade.confirm_save'),
          onPress: async () => {
            try {
              const input: ExecutionInput = {
                prescription_date: new Date().toISOString().split('T')[0],
                action_ticker: params.ticker,
                action_name: params.name,
                action_type: params.action,
                suggested_price: params.suggestedPrice ? parseFloat(params.suggestedPrice) : null,
                suggested_qty: params.suggestedQty ? parseInt(params.suggestedQty, 10) : null,
                executed_at: executedAt,
                executed_price: price,
                executed_qty: qty,
                execution_note: note.trim() || undefined,
              };

              await saveExecution(input);

              Alert.alert(t('log_trade.saved_title'), t('log_trade.saved_msg'), [
                { text: t('common.ok'), onPress: () => router.back() },
              ]);
            } catch (error: unknown) {
              const msg = error instanceof Error ? error.message : t('log_trade.save_failed_msg');
              Alert.alert(t('log_trade.save_failed_title'), msg);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
          {/* 헤더 */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{t('log_trade.title')}</Text>
              <Text style={[s.headerSubtitle, { color: colors.textTertiary }]}>{t('log_trade.subtitle')}</Text>
            </View>
          </View>

          {/* 종목 정보 */}
          <View style={[s.tickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.actionBadge, { backgroundColor: params.action === 'BUY' ? 'rgba(76,175,80,0.15)' : 'rgba(207,102,121,0.15)' }]}>
              <Text style={[s.actionBadgeText, { color: params.action === 'BUY' ? colors.buy : colors.sell }]}>
                {params.action === 'BUY' ? t('log_trade.action_buy') : t('log_trade.action_sell')}
              </Text>
            </View>
            <Text style={[s.tickerName, { color: colors.textPrimary }]}>{params.name}</Text>
            <Text style={[s.tickerCode, { color: colors.textSecondary }]}>{params.ticker}</Text>
          </View>

          {/* AI 제안 정보 (참고용) */}
          {params.suggestedPrice && (
            <View style={s.suggestionBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.info} />
              <Text style={[s.suggestionText, { color: colors.info }]}>
                {t('log_trade.ai_suggestion_ref', { price: Math.floor(parseFloat(params.suggestedPrice)).toLocaleString(), qty: String(params.suggestedQty || 0) })}
              </Text>
            </View>
          )}

          {/* 폼 */}
          <View style={s.form}>
            {/* 실행 일시 */}
            <View style={s.formGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('log_trade.date_label')}</Text>
              <TouchableOpacity style={[s.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[s.dateText, { color: colors.textPrimary }]}>{executedAt.toLocaleString(getLocaleCode(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={executedAt}
                  mode="datetime"
                  display="spinner"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setExecutedAt(date);
                  }}
                />
              )}
            </View>

            {/* 체결 가격 */}
            <View style={s.formGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('log_trade.price_label')}</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={executedPrice}
                onChangeText={setExecutedPrice}
                keyboardType="numeric"
                placeholder={t('log_trade.price_placeholder')}
                placeholderTextColor={colors.textQuaternary}
              />
            </View>

            {/* 체결 수량 */}
            <View style={s.formGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('log_trade.qty_label')}</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={executedQty}
                onChangeText={setExecutedQty}
                keyboardType="number-pad"
                placeholder={t('log_trade.qty_placeholder')}
                placeholderTextColor={colors.textQuaternary}
              />
            </View>

            {/* 메모 */}
            <View style={s.formGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('log_trade.note_label')}</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={note}
                onChangeText={setNote}
                placeholder={t('log_trade.note_placeholder')}
                placeholderTextColor={colors.textQuaternary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* 면책 */}
          <View style={s.disclaimer}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.textTertiary} />
            <Text style={[s.disclaimerText, { color: colors.textTertiary }]}>
              {t('log_trade.disclaimer')}
            </Text>
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity
            style={[s.submitButton, isPending && s.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <Text style={s.submitButtonText}>{t('log_trade.saving_btn')}</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.background} />
                <Text style={s.submitButtonText}>{t('log_trade.save_btn')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  headerTitle: { fontSize: 21, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  tickerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  actionBadgeText: { fontSize: 13, fontWeight: '800' },
  tickerName: { fontSize: 19, fontWeight: '700', marginBottom: 4 },
  tickerCode: { fontSize: 14 },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100,181,246,0.08)',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.1)',
  },
  suggestionText: { flex: 1, fontSize: 13, lineHeight: 19 },
  form: { gap: 20, marginBottom: 24 },
  formGroup: {},
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  dateText: { fontSize: 16 },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
  },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 17 },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 17, fontWeight: '700', color: '#000' },
});
