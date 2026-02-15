import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useRealEstateSearch,
  useSaveRealEstate,
} from '../src/hooks/useRealEstate';
import { formatPrice } from '../src/services/realEstateApi';
import { sqmToPyeong } from '../src/types/realestate';
import type { ApartmentComplex, AreaPriceSummary } from '../src/types/realestate';
import { useTheme } from '../src/hooks/useTheme';

// 2단계 스텝 흐름 (간소화)
type Step = 'search' | 'input';

export default function AddRealEstateScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // 스텝 상태
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');

  // 선택된 데이터
  const [selectedComplex, setSelectedComplex] = useState<ApartmentComplex | null>(null);
  const [customArea, setCustomArea] = useState('');
  const [customAreaPyeong, setCustomAreaPyeong] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // 훅
  const { data: searchResults, isLoading: searching } = useRealEstateSearch(query);
  const saveMutation = useSaveRealEstate();

  // Step 1 → Step 2: 단지 선택
  const handleSelectComplex = useCallback((complex: ApartmentComplex) => {
    setSelectedComplex(complex);
    setCustomArea('');
    setCustomAreaPyeong('');
    setPurchasePrice('');
    setStep('input');
  }, []);

  // Step 2: 저장 (간소화)
  const handleSave = useCallback(async () => {
    if (!selectedComplex) return;

    // 면적 검증
    const area = parseFloat(customArea);
    if (!area || area < 10 || area > 300) {
      Alert.alert('입력 오류', '전용면적을 10~300㎡ 범위로 입력해주세요.');
      return;
    }

    // 시세 검증
    if (!purchasePrice || !purchasePrice.trim()) {
      Alert.alert('입력 오류', '현재 시세를 입력해주세요.');
      return;
    }

    const priceValue = parseInt(purchasePrice.replace(/[^0-9]/g, ''), 10) * 10000;
    if (!priceValue || priceValue <= 0) {
      Alert.alert('입력 오류', '올바른 금액을 입력해주세요.');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        lawdCd: selectedComplex.lawdCd || '00000',
        complexName: selectedComplex.complexName,
        unitArea: area,
        unitDetail: undefined,
        purchasePrice: priceValue,
        currentPrice: priceValue, // 입력한 시세를 현재가로 사용
      });

      Alert.alert(
        '등록 완료',
        `${selectedComplex.complexName} ${Math.round(area)}㎡\n시세: ${formatPrice(priceValue)}\n\n포트폴리오에 추가되었습니다.`,
        [
          {
            text: '포트폴리오 보기',
            onPress: () => router.replace('/(tabs)/rebalance'),
          },
          {
            text: '확인',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('저장 실패', error.message || '부동산 자산 저장 중 오류가 발생했습니다.');
    }
  }, [selectedComplex, customArea, purchasePrice, saveMutation, router]);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 'search') {
                router.back();
              } else {
                setStep('search');
              }
            }}
          >
            <Ionicons name="chevron-back" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>부동산 자산 추가</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* 진행 표시기 */}
        <View style={styles.progressBar}>
          {(['search', 'input'] as Step[]).map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                step === s && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* ============================================================ */}
        {/* Step 1: 아파트 검색 */}
        {/* ============================================================ */}
        {step === 'search' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>아파트 단지 검색</Text>
            <Text style={styles.stepDesc}>단지명 또는 지역명을 입력하세요</Text>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="예: 래미안, 잠실, 강남"
                placeholderTextColor="#666"
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {searching && (
              <ActivityIndicator color="#4CAF50" style={{ marginTop: 24 }} />
            )}

            <FlatList
              data={searchResults || []}
              keyExtractor={(item) => `${item.lawdCd}-${item.complexName}`}
              style={styles.resultList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectComplex(item)}
                >
                  <View style={styles.resultIcon}>
                    <Ionicons name="business" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.complexName}</Text>
                    <Text style={styles.resultAddress}>{item.address}</Text>
                    <View style={styles.resultMeta}>
                      {item.totalUnits ? (
                        <Text style={styles.metaText}>{item.totalUnits.toLocaleString()}세대</Text>
                      ) : null}
                      {item.buildYear ? (
                        <Text style={styles.metaText}>{item.buildYear}년 준공</Text>
                      ) : null}
                      {item.areas.length > 0 ? (
                        <Text style={styles.metaText}>
                          {item.areas.map(a => `${Math.round(sqmToPyeong(a))}평`).join(' / ')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#888" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                query.length >= 2 && !searching ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={40} color="#444" />
                    <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
                    <Text style={styles.emptySubtext}>
                      다른 검색어로 다시 시도해보세요
                    </Text>
                  </View>
                ) : query.length > 0 ? (
                  <Text style={styles.emptyText}>2자 이상 입력해주세요</Text>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptySubtext}>
                      아파트, 빌라, 오피스텔 등 부동산을 검색하세요
                    </Text>
                  </View>
                )
              }
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* Step 2: 면적 및 가격 입력 */}
        {/* ============================================================ */}
        {step === 'input' && selectedComplex && (
          <ScrollView
            style={styles.stepContainer}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            {/* 선택된 아파트 정보 */}
            <View style={styles.selectedComplexCard}>
              <View style={styles.complexHeader}>
                <Ionicons name="home" size={24} color="#4CAF50" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.complexName}>{selectedComplex.complexName}</Text>
                  <Text style={styles.complexAddress}>{selectedComplex.address}</Text>
                </View>
              </View>
            </View>

            {/* 전용면적 입력 */}
            <Text style={styles.sectionLabel}>전용면적 *</Text>
            <Text style={styles.sectionHint}>㎡ 또는 평형으로 입력하세요 (한쪽만 입력하면 자동 변환됩니다)</Text>
            <View style={styles.dualInputRow}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.dualInput}
                  placeholder="㎡"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={customArea}
                  onChangeText={(text) => {
                    setCustomArea(text);
                    if (text && !isNaN(parseFloat(text))) {
                      const pyeong = sqmToPyeong(parseFloat(text));
                      setCustomAreaPyeong(String(Math.round(pyeong * 10) / 10));
                    } else {
                      setCustomAreaPyeong('');
                    }
                  }}
                />
                <Text style={styles.unitLabel}>㎡</Text>
              </View>

              <Text style={styles.orText}>또는</Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.dualInput}
                  placeholder="평"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={customAreaPyeong}
                  onChangeText={(text) => {
                    setCustomAreaPyeong(text);
                    if (text && !isNaN(parseFloat(text))) {
                      const sqm = parseFloat(text) * 3.3058;
                      setCustomArea(String(Math.round(sqm * 10) / 10));
                    } else {
                      setCustomArea('');
                    }
                  }}
                />
                <Text style={styles.unitLabel}>평</Text>
              </View>
            </View>

            {/* 매입가 입력 */}
            <Text style={styles.sectionLabel}>매입가 또는 현재 시세 *</Text>
            <Text style={styles.sectionHint}>만원 단위로 입력하세요 (예: 50000 = 5억)</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="예: 50000"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
            />
            {purchasePrice ? (
              <Text style={styles.pricePreview}>
                = {formatPrice(parseInt(purchasePrice.replace(/[^0-9]/g, ''), 10) * 10000 || 0)}
              </Text>
            ) : null}

            {/* 안내 문구 */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color="#888" />
              <Text style={styles.infoText}>
                입력하신 정보는 포트폴리오 분석에 사용됩니다.
                정확한 면적과 가격을 입력해주세요.
              </Text>
            </View>

            {/* 저장 버튼 */}
            <TouchableOpacity
              style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="home" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>포트폴리오에 추가</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor는 동적으로 적용됨 (colors.background)
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
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  progressDotActive: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  // 검색
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  resultList: {
    marginTop: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A2A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultAddress: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  resultMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  manualEntryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  manualEntryLinkButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  manualEntryLinkText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // 면적 선택
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAA',
    marginTop: 20,
    marginBottom: 10,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  loadingText: {
    fontSize: 13,
    color: '#888',
  },
  emptyDataContainer: {
    gap: 16,
  },
  emptyAreaBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 8,
  },
  emptyAreaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#AAA',
    textAlign: 'center',
  },
  emptyAreaSubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  quickManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  quickManualButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  areaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  areaChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  areaChipActive: {
    backgroundColor: '#1B4D1B',
    borderColor: '#4CAF50',
  },
  areaChipText: {
    fontSize: 14,
    color: '#CCC',
  },
  areaChipTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  customAreaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customAreaInput: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  dualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
    flex: 1,
    minWidth: 100,
  },
  dualInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFF',
    paddingVertical: 2,
  },
  unitLabel: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
  orText: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 4,
  },
  customAreaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  customAreaButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  unitDetailInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  // 시세 카드
  priceCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#888',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4CAF50',
  },
  priceValueSmall: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  // 거래 내역
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  txDate: {
    fontSize: 13,
    color: '#888',
    width: 100,
  },
  txFloor: {
    fontSize: 13,
    color: '#AAA',
    width: 50,
  },
  txPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  // 확인 카드
  confirmCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmLabel: {
    fontSize: 14,
    color: '#888',
  },
  confirmValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    maxWidth: '60%',
    textAlign: 'right',
  },
  // 면책
  disclaimerBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#888',
    lineHeight: 16,
  },
  // Step 2: 입력 폼
  selectedComplexCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  complexHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  complexName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  complexAddress: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
    marginTop: -6,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  priceInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  pricePreview: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 4,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  // 저장 버튼
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  // 직접 입력 전용
  pyeongBadge: {
    backgroundColor: '#1B4D1B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  pyeongBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  manualPricePreview: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 6,
  },
  manualInfoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  manualInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
});
