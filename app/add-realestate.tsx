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
  useRealEstatePrice,
  useSaveRealEstate,
} from '../src/hooks/useRealEstate';
import { formatPrice } from '../src/services/realEstateApi';
import { sqmToPyeong } from '../src/types/realestate';
import type { ApartmentComplex, AreaPriceSummary } from '../src/types/realestate';

// 4단계 스텝 흐름
type Step = 'search' | 'area' | 'price' | 'confirm';

export default function AddRealEstateScreen() {
  const router = useRouter();

  // 스텝 상태
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');

  // 선택된 데이터
  const [selectedComplex, setSelectedComplex] = useState<ApartmentComplex | null>(null);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [customArea, setCustomArea] = useState('');
  const [unitDetail, setUnitDetail] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // 훅
  const { data: searchResults, isLoading: searching } = useRealEstateSearch(query);
  const { data: priceData, isLoading: loadingPrice } = useRealEstatePrice(
    selectedComplex?.lawdCd ?? null,
    selectedComplex?.complexName ?? null,
  );
  const saveMutation = useSaveRealEstate();

  // Step 1 → Step 2: 단지 선택
  const handleSelectComplex = useCallback((complex: ApartmentComplex) => {
    setSelectedComplex(complex);
    setSelectedArea(null);
    setStep('area');
  }, []);

  // Step 2 → Step 3: 면적 선택
  const handleSelectArea = useCallback((area: number) => {
    setSelectedArea(area);
    setStep('price');
  }, []);

  // 직접 입력 면적으로 진행
  const handleCustomArea = useCallback(() => {
    const area = parseFloat(customArea);
    if (!area || area < 10 || area > 300) {
      Alert.alert('입력 오류', '전용면적을 10~300㎡ 범위로 입력해주세요.');
      return;
    }
    setSelectedArea(area);
    setStep('price');
  }, [customArea]);

  // Step 3 → Step 4: 시세 확인 후 확인 화면
  const handleConfirm = useCallback(() => {
    setStep('confirm');
  }, []);

  // Step 4: 최종 저장
  const handleSave = useCallback(async () => {
    if (!selectedComplex || !selectedArea) return;

    // 현재 시세 찾기
    const areaSummary = priceData?.priceSummary.find(
      (s: AreaPriceSummary) => Math.abs(s.area - selectedArea) <= 2,
    );
    const currentPrice = areaSummary?.avgPrice || 0;

    if (currentPrice === 0) {
      Alert.alert('시세 없음', '해당 면적의 시세 정보가 없습니다.');
      return;
    }

    // 매입가: 입력값 또는 현재 시세 사용
    const buyPrice = purchasePrice
      ? parseInt(purchasePrice.replace(/[^0-9]/g, ''), 10) * 10000
      : currentPrice;

    try {
      await saveMutation.mutateAsync({
        lawdCd: selectedComplex.lawdCd,
        complexName: selectedComplex.complexName,
        unitArea: selectedArea,
        unitDetail: unitDetail || undefined,
        purchasePrice: buyPrice,
        currentPrice,
      });

      Alert.alert(
        '등록 완료',
        `${selectedComplex.complexName} ${Math.round(selectedArea)}㎡\n시세: ${formatPrice(currentPrice)}\n\n포트폴리오에 추가되었습니다.`,
        [
          {
            text: '포트폴리오 보기',
            onPress: () => router.replace('/(tabs)/diagnosis'),
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
  }, [selectedComplex, selectedArea, priceData, purchasePrice, unitDetail, saveMutation, router]);

  // 현재 선택된 면적의 시세 요약
  const selectedAreaSummary = selectedArea
    ? priceData?.priceSummary.find(
        (s: AreaPriceSummary) => Math.abs(s.area - selectedArea) <= 2,
      )
    : null;

  // 현재 선택된 면적의 실거래 내역
  const selectedAreaTransactions = selectedArea
    ? (priceData?.transactions || []).filter(
        (t: any) => Math.abs(t.area - selectedArea) <= 2,
      ).slice(0, 5)
    : [];

  return (
    <SafeAreaView style={styles.container}>
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
              } else if (step === 'area') {
                setStep('search');
              } else if (step === 'price') {
                setStep('area');
              } else {
                setStep('price');
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
          {(['search', 'area', 'price', 'confirm'] as Step[]).map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                (step === s || ['search', 'area', 'price', 'confirm'].indexOf(step) >= i) &&
                  styles.progressDotActive,
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
                      {item.totalUnits && (
                        <Text style={styles.metaText}>{item.totalUnits.toLocaleString()}세대</Text>
                      )}
                      {item.buildYear && (
                        <Text style={styles.metaText}>{item.buildYear}년 준공</Text>
                      )}
                      <Text style={styles.metaText}>
                        {item.areas.map(a => `${Math.round(sqmToPyeong(a))}평`).join(' / ')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#888" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                query.length >= 2 && !searching ? (
                  <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
                ) : query.length > 0 ? (
                  <Text style={styles.emptyText}>2자 이상 입력해주세요</Text>
                ) : null
              }
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* Step 2: 면적/동호 입력 */}
        {/* ============================================================ */}
        {step === 'area' && selectedComplex && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.stepTitle}>{selectedComplex.complexName}</Text>
            <Text style={styles.stepDesc}>{selectedComplex.address}</Text>

            <Text style={styles.sectionLabel}>전용면적 선택</Text>
            <View style={styles.areaChips}>
              {selectedComplex.areas.map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.areaChip,
                    selectedArea === area && styles.areaChipActive,
                  ]}
                  onPress={() => handleSelectArea(area)}
                >
                  <Text
                    style={[
                      styles.areaChipText,
                      selectedArea === area && styles.areaChipTextActive,
                    ]}
                  >
                    {area}㎡ ({Math.round(sqmToPyeong(area))}평)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>직접 입력</Text>
            <View style={styles.customAreaRow}>
              <TextInput
                style={styles.customAreaInput}
                placeholder="전용면적 (㎡)"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={customArea}
                onChangeText={setCustomArea}
              />
              <TouchableOpacity
                style={styles.customAreaButton}
                onPress={handleCustomArea}
              >
                <Text style={styles.customAreaButtonText}>확인</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>동/호수 (선택)</Text>
            <TextInput
              style={styles.unitDetailInput}
              placeholder="예: 103동 1502호"
              placeholderTextColor="#666"
              value={unitDetail}
              onChangeText={setUnitDetail}
            />
          </ScrollView>
        )}

        {/* ============================================================ */}
        {/* Step 3: 시세 확인 */}
        {/* ============================================================ */}
        {step === 'price' && selectedComplex && selectedArea && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.stepTitle}>시세 확인</Text>
            <Text style={styles.stepDesc}>
              {selectedComplex.complexName} {selectedArea}㎡ ({Math.round(sqmToPyeong(selectedArea))}평)
            </Text>

            {loadingPrice ? (
              <ActivityIndicator color="#4CAF50" style={{ marginTop: 24 }} />
            ) : selectedAreaSummary ? (
              <>
                {/* 시세 요약 카드 */}
                <View style={styles.priceCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>예상 시세</Text>
                    <Text style={styles.priceValue}>
                      {formatPrice(selectedAreaSummary.avgPrice)}
                    </Text>
                  </View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>최근 거래가</Text>
                    <Text style={styles.priceValueSmall}>
                      {formatPrice(selectedAreaSummary.latestPrice)}
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>변동률</Text>
                    <Text
                      style={[
                        styles.priceValueSmall,
                        {
                          color: selectedAreaSummary.changeRate >= 0 ? '#4CAF50' : '#CF6679',
                        },
                      ]}
                    >
                      {selectedAreaSummary.changeRate >= 0 ? '+' : ''}
                      {selectedAreaSummary.changeRate}%
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>거래 건수</Text>
                    <Text style={styles.priceValueSmall}>
                      {selectedAreaSummary.transactionCount}건
                    </Text>
                  </View>
                </View>

                {/* 최근 실거래 내역 */}
                <Text style={styles.sectionLabel}>최근 실거래 내역</Text>
                {selectedAreaTransactions.map((tx: any, idx: number) => (
                  <View key={idx} style={styles.transactionRow}>
                    <Text style={styles.txDate}>{tx.dealDate}</Text>
                    <Text style={styles.txFloor}>{tx.floor}층</Text>
                    <Text style={styles.txPrice}>
                      {formatPrice(tx.dealAmountMan * 10000)}
                    </Text>
                  </View>
                ))}

                {/* 매입가 입력 */}
                <Text style={styles.sectionLabel}>매입가 (선택)</Text>
                <TextInput
                  style={styles.unitDetailInput}
                  placeholder="만원 단위 (예: 150000 = 15억)"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                />
                <Text style={styles.hintText}>
                  입력하지 않으면 현재 시세를 매입가로 사용합니다
                </Text>

                {/* 다음 단계 버튼 */}
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={handleConfirm}
                >
                  <Text style={styles.nextButtonText}>확인 및 등록</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.emptyText}>
                해당 면적의 실거래 데이터가 없습니다.
              </Text>
            )}
          </ScrollView>
        )}

        {/* ============================================================ */}
        {/* Step 4: 확인 및 저장 */}
        {/* ============================================================ */}
        {step === 'confirm' && selectedComplex && selectedArea && selectedAreaSummary && (
          <ScrollView style={styles.stepContainer} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.stepTitle}>등록 확인</Text>

            {/* 요약 카드 */}
            <View style={styles.confirmCard}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>단지명</Text>
                <Text style={styles.confirmValue}>{selectedComplex.complexName}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>주소</Text>
                <Text style={styles.confirmValue}>{selectedComplex.address}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>면적</Text>
                <Text style={styles.confirmValue}>
                  {selectedArea}㎡ ({Math.round(sqmToPyeong(selectedArea))}평)
                </Text>
              </View>
              {unitDetail ? (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>동/호수</Text>
                  <Text style={styles.confirmValue}>{unitDetail}</Text>
                </View>
              ) : null}
              <View style={styles.priceDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>현재 시세</Text>
                <Text style={[styles.confirmValue, { color: '#4CAF50', fontWeight: '700' }]}>
                  {formatPrice(selectedAreaSummary.avgPrice)}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>매입가</Text>
                <Text style={styles.confirmValue}>
                  {purchasePrice
                    ? formatPrice(parseInt(purchasePrice.replace(/[^0-9]/g, ''), 10) * 10000)
                    : '시세 기준'}
                </Text>
              </View>
            </View>

            {/* 면책 문구 */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle" size={16} color="#888" />
              <Text style={styles.disclaimerText}>
                본 시세 정보는 국토교통부 실거래가 공개 데이터를 기반으로 한 참고 자료이며,
                실제 시장 가격과 차이가 있을 수 있습니다. 투자 결정 시 공인중개사 또는
                감정평가사의 전문 상담을 권장합니다.
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
    backgroundColor: '#121212',
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
    fontSize: 14,
  },
  // 면적 선택
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AAA',
    marginTop: 20,
    marginBottom: 10,
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
  customAreaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 20,
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
});
