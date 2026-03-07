/**
 * 부동산 자산 수정 화면
 * - 시세 업데이트
 * - 대출 정보 수정
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useLocale } from '../src/context/LocaleContext';
import { formatPrice } from '../src/services/realEstateApi';
import { sqmToPyeong } from '../src/types/realestate';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import supabase, { getCurrentUser } from '../src/services/supabase';
import { SHARED_PORTFOLIO_KEY } from '../src/hooks/useSharedPortfolio';

export default function EditRealEstateScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();

  // URL 파라미터에서 자산 정보 가져오기
  const assetId = params.id as string;
  const assetName = params.name as string;
  const currentPriceStr = params.currentPrice as string;
  const debtAmountStr = params.debtAmount as string;
  const unitAreaStr = params.unitArea as string;

  // State
  const [newPrice, setNewPrice] = useState('');
  const [newDebt, setNewDebt] = useState('');
  const [hasDebt, setHasDebt] = useState(false);

  // 초기값 설정
  useEffect(() => {
    if (currentPriceStr) {
      const priceInMan = parseInt(currentPriceStr) / 10000;
      setNewPrice(priceInMan.toString());
    }
    if (debtAmountStr && parseInt(debtAmountStr) > 0) {
      setHasDebt(true);
      const debtInMan = parseInt(debtAmountStr) / 10000;
      setNewDebt(debtInMan.toString());
    }
  }, [currentPriceStr, debtAmountStr]);

  // 수정 mutation
  const updateMutation = useMutation({
    mutationFn: async (input: { price: number; debt: number }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Login required');

      const { error } = await supabase
        .from('portfolios')
        .update({
          current_price: input.price,
          current_value: input.price,
          purchase_price_krw: input.price,
          debt_amount: input.debt,
          last_price_updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
      Alert.alert(t('editRealestate.alert.updateSuccess'), t('editRealestate.alert.updatedMessage'), [
        { text: t('common.confirm'), onPress: () => router.back() },
      ]);
    },
    onError: (error: unknown) => {
      Alert.alert(t('editRealestate.alert.updateFail'), error instanceof Error ? error.message : t('editRealestate.alert.updateError'));
      Sentry.captureException(error, { tags: { hook: 'editRealestate' } });
    },
  });

  const handleSave = useCallback(() => {
    // 검증
    const priceValue = parseInt(newPrice.replace(/[^0-9]/g, ''), 10) * 10000;
    if (!priceValue || priceValue <= 0) {
      Alert.alert(t('editRealestate.alert.inputError'), t('editRealestate.alert.invalidPrice'));
      return;
    }

    let debtValue = 0;
    if (hasDebt) {
      debtValue = parseInt(newDebt.replace(/[^0-9]/g, ''), 10) * 10000;
      if (!debtValue || debtValue < 0) {
        Alert.alert(t('editRealestate.alert.inputError'), t('editRealestate.alert.invalidDebt'));
        return;
      }
      if (debtValue >= priceValue) {
        Alert.alert(t('editRealestate.alert.inputError'), t('editRealestate.alert.debtExceedsPrice'));
        return;
      }
    }

    updateMutation.mutate({ price: priceValue, debt: debtValue });
  }, [newPrice, newDebt, hasDebt, updateMutation, t]);

  const unitArea = unitAreaStr ? parseFloat(unitAreaStr) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('editRealestate.title')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardDismissMode="interactive"
        >
          {/* 부동산 정보 */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="home" size={20} color="#4CAF50" />
              <Text style={styles.infoName}>{assetName}</Text>
            </View>
            {unitArea > 0 && (
              <Text style={styles.infoArea}>
                {unitArea.toFixed(1)}㎡ ({Math.round(sqmToPyeong(unitArea))}평)
              </Text>
            )}
          </View>

          {/* 현재 시세 */}
          <Text style={styles.sectionLabel}>{t('editRealestate.currentPrice')}</Text>
          <Text style={styles.sectionHint}>{t('editRealestate.unitHint')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('editRealestate.pricePlaceholder')}
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={newPrice}
            onChangeText={setNewPrice}
          />
          {newPrice ? (
            <Text style={styles.preview}>
              = {formatPrice(parseInt(newPrice.replace(/[^0-9]/g, ''), 10) * 10000 || 0)}
            </Text>
          ) : null}

          {/* 대출 정보 */}
          <View style={styles.debtSection}>
            <TouchableOpacity
              style={styles.debtCheckbox}
              onPress={() => {
                setHasDebt(!hasDebt);
                if (hasDebt) setNewDebt('');
              }}
            >
              <Ionicons
                name={hasDebt ? 'checkbox' : 'square-outline'}
                size={24}
                color={hasDebt ? '#4CAF50' : '#666'}
              />
              <Text style={styles.debtCheckboxLabel}>{t('editRealestate.editDebt')}</Text>
            </TouchableOpacity>

            {hasDebt && (
              <View style={styles.debtInputContainer}>
                <Text style={styles.sectionLabel}>{t('editRealestate.debtBalance')}</Text>
                <Text style={styles.sectionHint}>{t('editRealestate.unitHint')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('editRealestate.debtPlaceholder')}
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={newDebt}
                  onChangeText={setNewDebt}
                />
                {newDebt && newPrice ? (
                  <View style={styles.debtPreview}>
                    <Text style={styles.debtPreviewText}>
                      {t('editRealestate.debtLabel')} {formatPrice(parseInt(newDebt.replace(/[^0-9]/g, ''), 10) * 10000 || 0)}
                    </Text>
                    <Text style={styles.debtPreviewLTV}>
                      LTV: {(
                        (parseInt(newDebt.replace(/[^0-9]/g, ''), 10) /
                          parseInt(newPrice.replace(/[^0-9]/g, ''), 10)) * 100
                      ).toFixed(0)}%
                    </Text>
                    <Text style={styles.debtPreviewNet}>
                      {t('editRealestate.netAsset')} {formatPrice(
                        (parseInt(newPrice.replace(/[^0-9]/g, ''), 10) -
                          parseInt(newDebt.replace(/[^0-9]/g, ''), 10)) * 10000
                      )}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* 안내 */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#888" />
            <Text style={styles.infoText}>
              {t('editRealestate.infoText')}
            </Text>
          </View>

          {/* 저장 버튼 */}
          <TouchableOpacity
            style={[styles.saveButton, updateMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  infoArea: {
    fontSize: 15,
    color: '#888',
    marginTop: 6,
    marginLeft: 30,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#AAA',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  preview: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 8,
  },
  debtSection: {
    marginTop: 20,
  },
  debtCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  debtCheckboxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  debtInputContainer: {
    marginTop: 12,
    paddingLeft: 34,
  },
  debtPreview: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#1A2A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A4A2A',
    gap: 4,
  },
  debtPreviewText: {
    fontSize: 14,
    color: '#AAA',
  },
  debtPreviewLTV: {
    fontSize: 14,
    color: '#FFB74D',
    fontWeight: '600',
  },
  debtPreviewNet: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#888',
    lineHeight: 19,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
});
