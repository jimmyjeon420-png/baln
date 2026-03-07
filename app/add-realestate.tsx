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
  useMyRealEstate,
} from '../src/hooks/useRealEstate';
import { formatPrice } from '../src/services/realEstateApi';
import { sqmToPyeong, type ApartmentComplex } from '../src/types/realestate';
import { useTheme } from '../src/hooks/useTheme';
import { useLocale } from '../src/context/LocaleContext';

// 2단계 스텝 흐름 (간소화)
type Step = 'search' | 'input';

export default function AddRealEstateScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();

  // 스텝 상태
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');

  // 선택된 데이터
  const [selectedComplex, setSelectedComplex] = useState<ApartmentComplex | null>(null);
  const [customArea, setCustomArea] = useState('');
  const [customAreaPyeong, setCustomAreaPyeong] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // 대출 정보 (Phase 1: 부동산만)
  const [hasDebt, setHasDebt] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');

  // 훅
  const { data: searchResults, isLoading: searching } = useRealEstateSearch(query);
  const { data: myRealEstates } = useMyRealEstate();
  const saveMutation = useSaveRealEstate();

  // Step 1 → Step 2: 단지 선택
  const handleSelectComplex = useCallback((complex: ApartmentComplex) => {
    setSelectedComplex(complex);
    setCustomArea('');
    setCustomAreaPyeong('');
    setPurchasePrice('');
    setHasDebt(false);
    setDebtAmount('');
    setStep('input');
  }, []);

  // Step 2: 저장 (간소화)
  const handleSave = useCallback(async () => {
    if (!selectedComplex) return;

    // 면적 검증
    const area = parseFloat(customArea);
    if (!area || area < 10 || area > 300) {
      Alert.alert(t('add_realestate.alert_area_title'), t('add_realestate.alert_area_msg'));
      return;
    }

    // 시세 검증
    if (!purchasePrice || !purchasePrice.trim()) {
      Alert.alert(t('add_realestate.alert_price_title'), t('add_realestate.alert_price_msg'));
      return;
    }

    const priceValue = parseInt(purchasePrice.replace(/[^0-9]/g, ''), 10) * 10000;
    if (!priceValue || priceValue <= 0) {
      Alert.alert(t('add_realestate.alert_price_title'), t('add_realestate.alert_price_invalid'));
      return;
    }

    // 대출 검증 (선택 사항)
    let debtValue = 0;
    if (hasDebt) {
      debtValue = parseInt(debtAmount.replace(/[^0-9]/g, ''), 10) * 10000;
      if (!debtValue || debtValue <= 0) {
        Alert.alert(t('add_realestate.alert_price_title'), t('add_realestate.alert_debt_invalid'));
        return;
      }
      if (debtValue >= priceValue) {
        Alert.alert(t('add_realestate.alert_price_title'), t('add_realestate.alert_debt_exceeds'));
        return;
      }
    }

    try {
      await saveMutation.mutateAsync({
        lawdCd: selectedComplex.lawdCd || '00000',
        complexName: selectedComplex.complexName,
        unitArea: area,
        unitDetail: undefined,
        purchasePrice: priceValue,
        currentPrice: priceValue, // 입력한 시세를 현재가로 사용
        debtAmount: debtValue, // 대출 정보 추가
      });

      // 순자산 계산
      const netValue = priceValue - debtValue;
      const ltvText = debtValue > 0
        ? `\n${t('add_realestate.debt_label')}: ${formatPrice(debtValue)} (${t('add_realestate.ltv_label')} ${((debtValue / priceValue) * 100).toFixed(0)}%)\n${t('add_realestate.net_asset_label')}: ${formatPrice(netValue)}`
        : '';

      Alert.alert(
        t('add_realestate.alert_save_title'),
        `${selectedComplex.complexName} ${Math.round(area)}㎡\n${formatPrice(priceValue)}${ltvText}\n\n${t('add_realestate.alert_save_msg')}`,
        [
          {
            text: t('add_realestate.alert_view_portfolio'),
            onPress: () => router.replace('/(tabs)/rebalance'),
          },
          {
            text: t('add_realestate.alert_confirm'),
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('add_realestate.alert_save_error_msg');
      Alert.alert(t('add_realestate.alert_save_error'), msg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComplex, customArea, purchasePrice, hasDebt, debtAmount, saveMutation, router]);


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
          <Text style={styles.headerTitle}>{t('add_realestate.title')}</Text>
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
            <Text style={styles.stepTitle}>{t('add_realestate.step_search_title')}</Text>
            <Text style={styles.stepDesc}>{t('add_realestate.step_search_desc')}</Text>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('add_realestate.search_placeholder')}
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
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
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
                        <Text style={styles.metaText}>{item.totalUnits.toLocaleString()}{t('add_realestate.units_suffix')}</Text>
                      ) : null}
                      {item.buildYear ? (
                        <Text style={styles.metaText}>{item.buildYear}{t('add_realestate.year_built_suffix')}</Text>
                      ) : null}
                      {item.areas.length > 0 ? (
                        <Text style={styles.metaText}>
                          {item.areas.map(a => `${Math.round(sqmToPyeong(a))}${t('add_realestate.pyeong_unit')}`).join(' / ')}
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
                    <Text style={styles.emptyText}>{t('add_realestate.empty_no_results')}</Text>
                    <Text style={styles.emptySubtext}>
                      {t('add_realestate.empty_no_results_sub')}
                    </Text>
                  </View>
                ) : query.length > 0 ? (
                  <Text style={styles.emptyText}>{t('add_realestate.empty_min_chars')}</Text>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptySubtext}>
                      {t('add_realestate.empty_hint')}
                    </Text>
                  </View>
                )
              }
            />

            {/* 내 부동산 목록 (수정 가능) */}
            {myRealEstates && myRealEstates.length > 0 && (
              <View style={styles.myRealEstateSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="home" size={20} color="#4CAF50" />
                  <Text style={styles.sectionHeaderText}>{t('add_realestate.my_realestate_title')}</Text>
                </View>
                {myRealEstates.map((asset) => {
                  const unitArea = asset.unit_area || 0;
                  const debtAmount = asset.debt_amount || 0;
                  const currentPrice = asset.current_price || 0;
                  const ltv = currentPrice > 0 ? (debtAmount / currentPrice) * 100 : 0;
                  const netValue = currentPrice - debtAmount;

                  return (
                    <View key={asset.id} style={styles.myRealEstateCard}>
                      <View style={styles.myRealEstateInfo}>
                        <Text style={styles.myRealEstateName}>{asset.name}</Text>
                        {unitArea > 0 && (
                          <Text style={styles.myRealEstateArea}>
                            {unitArea.toFixed(1)}㎡ ({Math.round(sqmToPyeong(unitArea))}{t('add_realestate.pyeong_unit')})
                          </Text>
                        )}
                        <View style={styles.myRealEstatePriceRow}>
                          <Text style={styles.myRealEstatePrice}>
                            {formatPrice(currentPrice)}
                          </Text>
                          {debtAmount > 0 && (
                            <Text style={styles.myRealEstateLTV}>
                              LTV {ltv.toFixed(0)}%
                            </Text>
                          )}
                        </View>
                        {debtAmount > 0 && (
                          <Text style={styles.myRealEstateNet}>
                            {t('add_realestate.net_asset_label')} {formatPrice(netValue)}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          router.push({
                            pathname: '/edit-realestate',
                            params: {
                              id: asset.id,
                              name: asset.name,
                              currentPrice: currentPrice.toString(),
                              debtAmount: debtAmount.toString(),
                              unitArea: unitArea.toString(),
                            },
                          });
                        }}
                      >
                        <Ionicons name="pencil" size={16} color="#4CAF50" />
                        <Text style={styles.editButtonText}>{t('add_realestate.edit_btn')}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
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
            <Text style={styles.sectionLabel}>{t('add_realestate.area_label')}</Text>
            <Text style={styles.sectionHint}>{t('add_realestate.area_hint')}</Text>
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

              <Text style={styles.orText}>{t('add_realestate.or_text')}</Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.dualInput}
                  placeholder={t('add_realestate.pyeong_unit')}
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
                <Text style={styles.unitLabel}>{t('add_realestate.pyeong_unit')}</Text>
              </View>
            </View>

            {/* 매입가 입력 */}
            <Text style={styles.sectionLabel}>{t('add_realestate.purchase_price_label')}</Text>
            <Text style={styles.sectionHint}>{t('add_realestate.purchase_price_hint')}</Text>
            <TextInput
              style={styles.priceInput}
              placeholder={t('add_realestate.purchase_price_placeholder')}
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

            {/* 대출 정보 (선택) */}
            <View style={styles.debtSection}>
              <TouchableOpacity
                style={styles.debtCheckbox}
                onPress={() => {
                  setHasDebt(!hasDebt);
                  if (hasDebt) setDebtAmount('');
                }}
              >
                <Ionicons
                  name={hasDebt ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={hasDebt ? '#4CAF50' : '#666'}
                />
                <Text style={styles.debtCheckboxLabel}>{t('add_realestate.debt_checkbox')}</Text>
              </TouchableOpacity>

              {hasDebt && (
                <View style={styles.debtInputContainer}>
                  <Text style={styles.sectionLabel}>{t('add_realestate.debt_balance_label')}</Text>
                  <Text style={styles.sectionHint}>{t('add_realestate.debt_balance_hint')}</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder={t('add_realestate.debt_placeholder')}
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={debtAmount}
                    onChangeText={setDebtAmount}
                  />
                  {debtAmount && purchasePrice ? (
                    <View style={styles.debtPreview}>
                      <Text style={styles.debtPreviewText}>
                        {t('add_realestate.debt_label')}: {formatPrice(parseInt(debtAmount.replace(/[^0-9]/g, ''), 10) * 10000 || 0)}
                      </Text>
                      <Text style={styles.debtPreviewLTV}>
                        {t('add_realestate.ltv_label')}: {(
                          (parseInt(debtAmount.replace(/[^0-9]/g, ''), 10) /
                            parseInt(purchasePrice.replace(/[^0-9]/g, ''), 10)) * 100
                        ).toFixed(0)}%
                      </Text>
                      <Text style={styles.debtPreviewNet}>
                        {t('add_realestate.net_asset_label')}: {formatPrice(
                          (parseInt(purchasePrice.replace(/[^0-9]/g, ''), 10) -
                            parseInt(debtAmount.replace(/[^0-9]/g, ''), 10)) * 10000
                        )}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            {/* 안내 문구 */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color="#888" />
              <Text style={styles.infoText}>
                {hasDebt ? t('add_realestate.info_with_debt') : t('add_realestate.info_no_debt')}
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
                  <Text style={styles.saveButtonText}>{t('add_realestate.save_btn')}</Text>
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
    fontSize: 19,
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
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 15,
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
    fontSize: 17,
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
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultAddress: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  resultMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  manualEntryLinkButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  manualEntryLinkText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // 면적 선택
  sectionLabel: {
    fontSize: 15,
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
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#AAA',
    textAlign: 'center',
  },
  emptyAreaSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 19,
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
    fontSize: 17,
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
    fontSize: 15,
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
    fontSize: 16,
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
    fontSize: 16,
    color: '#FFF',
    paddingVertical: 2,
  },
  unitLabel: {
    fontSize: 15,
    color: '#888',
    marginLeft: 4,
  },
  orText: {
    fontSize: 13,
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
    fontSize: 15,
  },
  unitDetailInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
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
    fontSize: 15,
    color: '#888',
  },
  priceValue: {
    fontSize: 23,
    fontWeight: '700',
    color: '#4CAF50',
  },
  priceValueSmall: {
    fontSize: 16,
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
    fontSize: 14,
    color: '#888',
    width: 100,
  },
  txFloor: {
    fontSize: 14,
    color: '#AAA',
    width: 50,
  },
  txPrice: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  hintText: {
    fontSize: 13,
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
    fontSize: 17,
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
    fontSize: 15,
    color: '#888',
  },
  confirmValue: {
    fontSize: 16,
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
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
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
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  complexAddress: {
    fontSize: 15,
    color: '#888',
    lineHeight: 21,
  },
  sectionHint: {
    fontSize: 13,
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
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  pricePreview: {
    fontSize: 15,
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
    fontSize: 13,
    color: '#888',
    lineHeight: 19,
  },
  // 대출 정보 (Phase 1)
  debtSection: {
    marginTop: 20,
    marginBottom: 12,
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
    fontSize: 17,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  manualPricePreview: {
    fontSize: 15,
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
    fontSize: 13,
    color: '#888',
    lineHeight: 19,
  },
  // 내 부동산 목록
  myRealEstateSection: {
    marginTop: 24,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myRealEstateCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  myRealEstateInfo: {
    flex: 1,
  },
  myRealEstateName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  myRealEstateArea: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
  },
  myRealEstatePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  myRealEstatePrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4CAF50',
  },
  myRealEstateLTV: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB74D',
  },
  myRealEstateNet: {
    fontSize: 14,
    color: '#AAA',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#1B4D1B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
});
