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
import { formatPrice } from '../src/services/realEstateApi';
import { sqmToPyeong } from '../src/types/realestate';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import supabase, { getCurrentUser } from '../src/services/supabase';
import { SHARED_PORTFOLIO_KEY } from '../src/hooks/useSharedPortfolio';

export default function EditRealEstateScreen() {
  const { colors } = useTheme();
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
      if (!user) throw new Error('로그인이 필요합니다.');

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
      Alert.alert('수정 완료', '부동산 정보가 업데이트되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('수정 실패', error.message || '수정 중 오류가 발생했습니다.');
    },
  });

  const handleSave = useCallback(() => {
    // 검증
    const priceValue = parseInt(newPrice.replace(/[^0-9]/g, ''), 10) * 10000;
    if (!priceValue || priceValue <= 0) {
      Alert.alert('입력 오류', '올바른 시세를 입력해주세요.');
      return;
    }

    let debtValue = 0;
    if (hasDebt) {
      debtValue = parseInt(newDebt.replace(/[^0-9]/g, ''), 10) * 10000;
      if (!debtValue || debtValue < 0) {
        Alert.alert('입력 오류', '올바른 대출 금액을 입력해주세요.');
        return;
      }
      if (debtValue >= priceValue) {
        Alert.alert('입력 오류', '대출 금액이 시세보다 클 수 없습니다.');
        return;
      }
    }

    updateMutation.mutate({ price: priceValue, debt: debtValue });
  }, [newPrice, newDebt, hasDebt, updateMutation]);

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
          <Text style={styles.headerTitle}>부동산 정보 수정</Text>
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
          <Text style={styles.sectionLabel}>현재 시세 *</Text>
          <Text style={styles.sectionHint}>만원 단위로 입력하세요</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 50000 (= 5억)"
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
              <Text style={styles.debtCheckboxLabel}>대출 정보 수정</Text>
            </TouchableOpacity>

            {hasDebt && (
              <View style={styles.debtInputContainer}>
                <Text style={styles.sectionLabel}>대출 잔액</Text>
                <Text style={styles.sectionHint}>만원 단위로 입력하세요</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 20000 (= 2억)"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={newDebt}
                  onChangeText={setNewDebt}
                />
                {newDebt && newPrice ? (
                  <View style={styles.debtPreview}>
                    <Text style={styles.debtPreviewText}>
                      대출: {formatPrice(parseInt(newDebt.replace(/[^0-9]/g, ''), 10) * 10000 || 0)}
                    </Text>
                    <Text style={styles.debtPreviewLTV}>
                      LTV: {(
                        (parseInt(newDebt.replace(/[^0-9]/g, ''), 10) /
                          parseInt(newPrice.replace(/[^0-9]/g, ''), 10)) * 100
                      ).toFixed(0)}%
                    </Text>
                    <Text style={styles.debtPreviewNet}>
                      순자산: {formatPrice(
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
              수정된 정보는 포트폴리오 건강 점수에 즉시 반영됩니다.
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
                <Text style={styles.saveButtonText}>저장</Text>
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
    fontSize: 18,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  infoArea: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
    marginLeft: 30,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAA',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  preview: {
    fontSize: 14,
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
    fontSize: 15,
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
    fontSize: 13,
    color: '#AAA',
  },
  debtPreviewLTV: {
    fontSize: 13,
    color: '#FFB74D',
    fontWeight: '600',
  },
  debtPreviewNet: {
    fontSize: 15,
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
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
