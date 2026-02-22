/**
 * 부동산 상세 화면
 *
 * 비유: "부동산 자산 카드 상세 보기"
 * - 단지명 + 면적 헤더
 * - 현재 시세 (큰 숫자)
 * - 시세 변동 (%)
 * - 실거래 히스토리 (최근 5건)
 * - 메모 입력 (사용자 자유 입력)
 * - 수정 (시세 금액 변경) / 삭제 버튼
 *
 * 라우트: /realestate/[id] — id = portfolios.id
 * portfolios 테이블에서 RE_ 프리픽스 자산 조회
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '../../src/services/supabase';
import { SHARED_PORTFOLIO_KEY } from '../../src/hooks/useSharedPortfolio';
import { useRealEstatePrice } from '../../src/hooks/useRealEstate';
import { formatPrice } from '../../src/services/realEstateApi';
import { sqmToPyeong, type AreaPriceSummary } from '../../src/types/realestate';
import { useTheme } from '../../src/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 메모 저장용 AsyncStorage 키
const MEMO_KEY_PREFIX = '@baln:realestate_memo_';

export default function RealEstateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  // 메모 상태
  const [memo, setMemo] = useState('');
  const [memoSaved, setMemoSaved] = useState(false);

  // 수정 모드
  const [editMode, setEditMode] = useState(false);
  const [editPrice, setEditPrice] = useState('');

  // 포트폴리오에서 부동산 자산 조회
  const { data: asset, isLoading } = useQuery({
    queryKey: ['realestate-detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 60000,
  });

  // 실거래가 조회 (단지 정보가 있을 때)
  const { data: priceData, isLoading: priceLoading } = useRealEstatePrice(
    asset?.lawd_cd ?? null,
    asset?.complex_name ?? null,
  );

  // 메모 로드
  useEffect(() => {
    if (id) {
      AsyncStorage.getItem(`${MEMO_KEY_PREFIX}${id}`).then(saved => {
        if (saved) setMemo(saved);
      });
    }
  }, [id]);

  // 메모 저장
  const handleSaveMemo = useCallback(async () => {
    if (id) {
      await AsyncStorage.setItem(`${MEMO_KEY_PREFIX}${id}`, memo);
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    }
  }, [id, memo]);

  // 시세 수정 mutation
  const updatePriceMutation = useMutation({
    mutationFn: async (newPrice: number) => {
      const { error } = await supabase
        .from('portfolios')
        .update({
          current_price: newPrice,
          current_value: newPrice,
          last_price_updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realestate-detail', id] });
      queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
      queryClient.invalidateQueries({ queryKey: ['my-realestate'] });
      setEditMode(false);
      Alert.alert('수정 완료', '시세가 업데이트되었습니다.');
    },
    onError: (error: any) => {
      Alert.alert('수정 실패', error.message || '시세 수정 중 오류가 발생했습니다.');
    },
  });

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
      queryClient.invalidateQueries({ queryKey: ['my-realestate'] });
      // 메모도 삭제
      AsyncStorage.removeItem(`${MEMO_KEY_PREFIX}${id}`);
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('삭제 실패', error.message || '부동산 자산 삭제 중 오류가 발생했습니다.');
    },
  });

  // 수정 확인
  const handleUpdatePrice = useCallback(() => {
    const priceNum = parseInt(editPrice.replace(/[^0-9]/g, ''), 10);
    if (!priceNum || priceNum < 1000) {
      Alert.alert('입력 오류', '시세를 만원 단위로 입력해주세요 (예: 150000 = 15억)');
      return;
    }
    updatePriceMutation.mutate(priceNum * 10000); // 만원 → 원 변환
  }, [editPrice, updatePriceMutation]);

  // 삭제 확인
  const handleDelete = useCallback(() => {
    Alert.alert(
      '부동산 자산 삭제',
      `${asset?.name || '이 부동산'}을 포트폴리오에서 삭제하시겠습니까?\n\n삭제 후 복구할 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  }, [asset, deleteMutation]);

  // 시세 변동률 계산
  const getChangeInfo = () => {
    if (!asset) return null;
    const currentPrice = asset.current_price || 0;
    const purchasePrice = asset.avg_price || asset.purchase_price_krw || 0;

    if (!purchasePrice || purchasePrice === 0) return null;

    const change = currentPrice - purchasePrice;
    const changeRate = ((change / purchasePrice) * 100).toFixed(1);
    const isPositive = change >= 0;

    return {
      change,
      changeRate: `${isPositive ? '+' : ''}${changeRate}%`,
      isPositive,
    };
  };

  // 해당 면적의 실거래 내역
  const getTransactions = () => {
    if (!asset?.unit_area || !priceData?.transactions) return [];
    return priceData.transactions
      .filter((t: any) => Math.abs(t.area - asset.unit_area) <= 2)
      .slice(0, 5);
  };

  // 로딩
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // 자산 없음
  if (!asset) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>부동산 상세</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>자산을 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const changeInfo = getChangeInfo();
  const transactions = getTransactions();
  const area = asset.unit_area || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>부동산 상세</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 헤더 카드: 단지명 + 면적 */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="business" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroName, { color: colors.textPrimary }]}>
            {asset.complex_name || asset.name || '부동산'}
          </Text>
          {area > 0 && (
            <Text style={[styles.heroArea, { color: colors.textSecondary }]}>
              전용 {Math.round(area)}㎡ ({Math.round(sqmToPyeong(area))}평)
            </Text>
          )}
          {asset.unit_detail && (
            <Text style={[styles.heroDetail, { color: colors.textTertiary }]}>{asset.unit_detail}</Text>
          )}
        </View>

        {/* 현재 시세 */}
        <View style={[styles.priceCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>현재 시세</Text>
          <Text style={[styles.priceValue, { color: colors.primary }]}>
            {formatPrice(asset.current_price || asset.current_value || 0)}
          </Text>

          {changeInfo && (
            <View style={styles.changeRow}>
              <Ionicons
                name={changeInfo.isPositive ? 'arrow-up' : 'arrow-down'}
                size={16}
                color={changeInfo.isPositive ? colors.primary : colors.error}
              />
              <Text style={[
                styles.changeText,
                { color: changeInfo.isPositive ? colors.primary : colors.error },
              ]}>
                {changeInfo.changeRate} (매입가 대비)
              </Text>
            </View>
          )}

          {/* 매입가 */}
          {(asset.avg_price || asset.purchase_price_krw) ? (
            <View style={[styles.purchaseRow, { borderTopColor: colors.surfaceLight }]}>
              <Text style={[styles.purchaseLabel, { color: colors.textSecondary }]}>매입가</Text>
              <Text style={[styles.purchaseValue, { color: colors.textPrimary }]}>
                {formatPrice(asset.avg_price || asset.purchase_price_krw || 0)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 실거래 히스토리 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>최근 실거래 내역</Text>
          {priceLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : transactions.length > 0 ? (
            transactions.map((tx: any, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.txRow,
                  idx < transactions.length - 1 && [styles.txRowBorder, { borderBottomColor: colors.surfaceLight }],
                ]}
              >
                <Text style={[styles.txDate, { color: colors.textTertiary }]}>{tx.dealDate}</Text>
                <Text style={[styles.txFloor, { color: colors.textSecondary }]}>{tx.floor}층</Text>
                <Text style={[styles.txArea, { color: colors.textSecondary }]}>{Math.round(tx.area)}㎡</Text>
                <Text style={[styles.txPrice, { color: colors.textPrimary }]}>
                  {formatPrice(tx.dealAmountMan * 10000)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noDataText, { color: colors.textTertiary }]}>
              해당 면적의 최근 거래 내역이 없습니다
            </Text>
          )}
        </View>

        {/* 메모 */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <View style={styles.memoHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>메모</Text>
            {memoSaved && (
              <Text style={[styles.savedBadge, { color: colors.primary, backgroundColor: colors.primary + '20' }]}>저장됨</Text>
            )}
          </View>
          <TextInput
            style={[styles.memoInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary }]}
            placeholder="메모를 입력하세요 (예: 전세 만기 2027.03, 리모델링 예정)"
            placeholderTextColor={colors.textTertiary}
            value={memo}
            onChangeText={setMemo}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.memoSaveBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={handleSaveMemo}
          >
            <Ionicons name="save-outline" size={16} color={colors.primary} />
            <Text style={[styles.memoSaveBtnText, { color: colors.primary }]}>메모 저장</Text>
          </TouchableOpacity>
        </View>

        {/* 시세 수정 모드 */}
        {editMode && (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>시세 수정</Text>
            <Text style={[styles.editHint, { color: colors.textTertiary }]}>
              만원 단위로 입력하세요 (예: 150000 = 15억)
            </Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: colors.surfaceLight, color: colors.textPrimary, borderColor: colors.primary + '40' }]}
              placeholder="시세 (만원)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              value={editPrice}
              onChangeText={setEditPrice}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editCancelBtn, { backgroundColor: colors.surfaceLight }]}
                onPress={() => setEditMode(false)}
              >
                <Text style={[styles.editCancelText, { color: colors.textPrimary }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleUpdatePrice}
                disabled={updatePriceMutation.isPending}
              >
                {updatePriceMutation.isPending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.editSaveText}>수정</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 액션 버튼 */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}
            onPress={() => {
              setEditPrice('');
              setEditMode(true);
            }}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>시세 수정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.surface, borderColor: colors.error + '40' }]}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.deleteBtnText, { color: colors.error }]}>삭제</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 면책 문구 */}
        <View style={[styles.disclaimerBox, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="information-circle" size={14} color={colors.textTertiary} />
          <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
            본 시세는 국토교통부 실거래가 데이터 기반 참고 자료이며, 실제 시장가와 차이가 있을 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // 히어로 카드
  heroCard: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroName: {
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroArea: {
    fontSize: 15,
    marginTop: 4,
  },
  heroDetail: {
    fontSize: 14,
    marginTop: 2,
  },

  // 시세 카드
  priceCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 29,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  changeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  purchaseLabel: {
    fontSize: 14,
  },
  purchaseValue: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 섹션 카드
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  // 실거래 내역
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  txRowBorder: {
    borderBottomWidth: 1,
  },
  txDate: {
    fontSize: 14,
    width: 90,
  },
  txFloor: {
    fontSize: 14,
    width: 40,
  },
  txArea: {
    fontSize: 14,
    width: 50,
  },
  txPrice: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },

  // 메모
  memoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memoInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    lineHeight: 21,
  },
  memoSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  memoSaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 수정 모드
  editHint: {
    fontSize: 13,
    marginBottom: 8,
  },
  editInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    borderWidth: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  editSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },

  // 액션 버튼
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 면책
  disclaimerBox: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
