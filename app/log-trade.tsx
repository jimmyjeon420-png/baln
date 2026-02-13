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

export default function LogTradeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
      Alert.alert('입력 오류', '체결 가격을 정확히 입력해주세요.');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      Alert.alert('입력 오류', '체결 수량을 정확히 입력해주세요.');
      return;
    }

    // 확인 모달
    Alert.alert(
      '실행 기록 저장',
      `${params.name} (${params.ticker})\n${params.action === 'BUY' ? '매수' : '매도'} ${qty}주 @ ₩${Math.floor(price).toLocaleString()}\n\n본 앱은 실제 매매를 대행하지 않습니다. 직접 증권사에서 실행한 내역을 기록용으로 저장하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: async () => {
            try {
              const input: ExecutionInput = {
                prescription_date: new Date().toISOString().split('T')[0], // 오늘 날짜
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

              Alert.alert('✅ 저장 완료', '실행 기록이 저장되었습니다.', [
                { text: '확인', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('저장 실패', error.message || '알 수 없는 오류가 발생했습니다.');
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
              <Text style={[s.headerTitle, { color: colors.textPrimary }]}>실행 기록</Text>
              <Text style={[s.headerSubtitle, { color: colors.textTertiary }]}>증권사에서 직접 실행한 내역을 입력하세요</Text>
            </View>
          </View>

          {/* 종목 정보 */}
          <View style={[s.tickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.actionBadge, { backgroundColor: params.action === 'BUY' ? 'rgba(76,175,80,0.15)' : 'rgba(207,102,121,0.15)' }]}>
              <Text style={[s.actionBadgeText, { color: params.action === 'BUY' ? colors.buy : colors.sell }]}>
                {params.action === 'BUY' ? '매수' : '매도'}
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
                AI 제안 시점: ₩{Math.floor(parseFloat(params.suggestedPrice)).toLocaleString()} × {params.suggestedQty || 0}주
              </Text>
            </View>
          )}

          {/* 폼 */}
          <View style={s.form}>
            {/* 실행 일시 */}
            <View style={s.formGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>실행 일시 *</Text>
              <TouchableOpacity style={[s.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[s.dateText, { color: colors.textPrimary }]}>{executedAt.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
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
              <Text style={[s.label, { color: colors.textSecondary }]}>체결 가격 (KRW) *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={executedPrice}
                onChangeText={setExecutedPrice}
                keyboardType="numeric"
                placeholder="예: 50000"
                placeholderTextColor={colors.textQuaternary}
              />
            </View>

            {/* 체결 수량 */}
            <View style={s.formGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>체결 수량 (주) *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={executedQty}
                onChangeText={setExecutedQty}
                keyboardType="number-pad"
                placeholder="예: 10"
                placeholderTextColor={colors.textQuaternary}
              />
            </View>

            {/* 메모 */}
            <View style={s.formGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>메모 (선택)</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={note}
                onChangeText={setNote}
                placeholder="증권사, 주문 방식 등 (예: 키움증권 시장가)"
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
              본 앱은 실제 매매를 대행하지 않습니다. 직접 증권사에서 실행한 내역을 기록용으로 저장하는 기능입니다.
            </Text>
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity
            style={[s.submitButton, isPending && s.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <Text style={s.submitButtonText}>저장 중...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.background} />
                <Text style={s.submitButtonText}>기록 저장</Text>
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
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  tickerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  actionBadgeText: { fontSize: 12, fontWeight: '800' },
  tickerName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  tickerCode: { fontSize: 13 },
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
  suggestionText: { flex: 1, fontSize: 12, lineHeight: 18 },
  form: { gap: 20, marginBottom: 24 },
  formGroup: {},
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
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
  dateText: { fontSize: 15 },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
  },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },
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
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
