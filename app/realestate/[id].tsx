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
import { sqmToPyeong } from '../../src/types/realestate';
import type { AreaPriceSummary } from '../../src/types/realestate';
import { COLORS } from '../../src/styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 메모 저장용 AsyncStorage 키
const MEMO_KEY_PREFIX = '@baln:realestate_memo_';

export default function RealEstateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // 자산 없음
  if (!asset) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>부동산 상세</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>자산을 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const changeInfo = getChangeInfo();
  const transactions = getTransactions();
  const area = asset.unit_area || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>부동산 상세</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── 헤더 카드: 단지명 + 면적 ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="business" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.heroName}>
            {asset.complex_name || asset.name || '부동산'}
          </Text>
          {area > 0 && (
            <Text style={styles.heroArea}>
              전용 {Math.round(area)}㎡ ({Math.round(sqmToPyeong(area))}평)
            </Text>
          )}
          {asset.unit_detail && (
            <Text style={styles.heroDetail}>{asset.unit_detail}</Text>
          )}
        </View>

        {/* ── 현재 시세 ── */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>현재 시세</Text>
          <Text style={styles.priceValue}>
            {formatPrice(asset.current_price || asset.current_value || 0)}
          </Text>

          {changeInfo && (
            <View style={styles.changeRow}>
              <Ionicons
                name={changeInfo.isPositive ? 'arrow-up' : 'arrow-down'}
                size={16}
                color={changeInfo.isPositive ? COLORS.primary : COLORS.error}
              />
              <Text style={[
                styles.changeText,
                { color: changeInfo.isPositive ? COLORS.primary : COLORS.error },
              ]}>
                {changeInfo.changeRate} (매입가 대비)
              </Text>
            </View>
          )}

          {/* 매입가 */}
          {(asset.avg_price || asset.purchase_price_krw) ? (
            <View style={styles.purchaseRow}>
              <Text style={styles.purchaseLabel}>매입가</Text>
              <Text style={styles.purchaseValue}>
                {formatPrice(asset.avg_price || asset.purchase_price_krw || 0)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── 실거래 히스토리 ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>최근 실거래 내역</Text>
          {priceLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : transactions.length > 0 ? (
            transactions.map((tx: any, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.txRow,
                  idx < transactions.length - 1 && styles.txRowBorder,
                ]}
              >
                <Text style={styles.txDate}>{tx.dealDate}</Text>
                <Text style={styles.txFloor}>{tx.floor}층</Text>
                <Text style={styles.txArea}>{Math.round(tx.area)}㎡</Text>
                <Text style={styles.txPrice}>
                  {formatPrice(tx.dealAmountMan * 10000)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>
              해당 면적의 최근 거래 내역이 없습니다
            </Text>
          )}
        </View>

        {/* ── 메모 ── */}
        <View style={styles.sectionCard}>
          <View style={styles.memoHeader}>
            <Text style={styles.sectionTitle}>메모</Text>
            {memoSaved && (
              <Text style={styles.savedBadge}>저장됨</Text>
            )}
          </View>
          <TextInput
            style={styles.memoInput}
            placeholder="메모를 입력하세요 (예: 전세 만기 2027.03, 리모델링 예정)"
            placeholderTextColor="#666"
            value={memo}
            onChangeText={setMemo}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={styles.memoSaveBtn}
            onPress={handleSaveMemo}
          >
            <Ionicons name="save-outline" size={16} color={COLORS.primary} />
            <Text style={styles.memoSaveBtnText}>메모 저장</Text>
          </TouchableOpacity>
        </View>

        {/* ── 시세 수정 모드 ── */}
        {editMode && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>시세 수정</Text>
            <Text style={styles.editHint}>
              만원 단위로 입력하세요 (예: 150000 = 15억)
            </Text>
            <TextInput
              style={styles.editInput}
              placeholder="시세 (만원)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={editPrice}
              onChangeText={setEditPrice}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setEditMode(false)}
              >
                <Text style={styles.editCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSaveBtn}
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

        {/* ── 액션 버튼 ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              setEditPrice('');
              setEditMode(true);
            }}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            <Text style={styles.editBtnText}>시세 수정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={styles.deleteBtnText}>삭제</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 면책 문구 */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle" size={14} color="#666" />
          <Text style={styles.disclaimerText}>
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // 히어로 카드
  heroCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A2A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  heroArea: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  heroDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  // 시세 카드
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    width: '100%',
    justifyContent: 'space-between',
  },
  purchaseLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  purchaseValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // 섹션 카드
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    borderBottomColor: '#2A2A2A',
  },
  txDate: {
    fontSize: 13,
    color: '#888',
    width: 90,
  },
  txFloor: {
    fontSize: 13,
    color: '#AAA',
    width: 40,
  },
  txArea: {
    fontSize: 13,
    color: '#AAA',
    width: 50,
  },
  txPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 13,
    color: '#666',
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
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memoInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    lineHeight: 20,
  },
  memoSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  memoSaveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // 수정 모드
  editHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
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
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  editSaveText: {
    fontSize: 14,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.error,
  },

  // 면책
  disclaimerBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
});
