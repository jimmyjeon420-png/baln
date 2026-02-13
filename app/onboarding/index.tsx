/**
 * 온보딩 화면 - 5단계 인터랙티브 슬라이드
 *
 * 역할: "신규 사용자 안내 창구"
 * 5단계 흐름:
 * 1. 환영 — "baln에 오신 걸 환영합니다"
 * 2. 투자 경험 선택 — 초보/중급/고급
 * 3. 투자 목표 선택 — 은퇴 준비/자산 증식/경제적 자유
 * 4. 관심 자산 선택 — 검색 + 인기 자산 칩 하트 토글
 * 5. 시작 — "준비 완료! 지금 시작하세요"
 *
 * 투자 경험/목표는 선택 안 해도 넘어갈 수 있음 (스킵 가능)
 * 선택하면 AsyncStorage에 저장 → 나중에 개인화 활용
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  ActivityIndicator,
  Keyboard,
  Platform,
  InputAccessoryView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../../src/styles/theme';
import { useTheme } from '../../src/hooks/useTheme';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import { searchStocks, StockItem, getCategoryColor } from '../../src/data/stockList';
import { priceService } from '../../src/services/PriceService';
import { AssetClass } from '../../src/types/price';
import { calculateHealthScore, HealthScoreResult } from '../../src/services/rebalanceScore';
import { AssetType } from '../../src/types/asset';
import type { Asset } from '../../src/types/asset';
import { SHARED_PORTFOLIO_KEY } from '../../src/hooks/useSharedPortfolio';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 총 단계 수
const TOTAL_STEPS = 5;

// ============================================================================
// 온보딩 등록 자산 인터페이스
// ============================================================================

interface RegisteredAsset {
  ticker: string;
  name: string;
  quantity: number;
  price: number;
  category: StockItem['category'];
}

/** 티커에서 자산 클래스 추론 */
function inferAssetClass(ticker: string): AssetClass {
  const upper = ticker.toUpperCase();
  if (/^\d{6}(\.KS|\.KQ)?$/i.test(upper)) return AssetClass.STOCK;
  const cryptos = ['BTC', 'ETH', 'USDC', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX'];
  if (cryptos.some(kw => upper.includes(kw))) return AssetClass.CRYPTO;
  return AssetClass.STOCK;
}

/** 타임아웃 래퍼 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

// ============================================================================
// 투자 경험 / 목표 옵션
// ============================================================================

interface SelectionOption {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

const INVESTOR_LEVELS: SelectionOption[] = [
  { id: 'beginner', emoji: '👶', label: '초보', description: '투자를 시작하는 단계' },
  { id: 'intermediate', emoji: '📊', label: '중급', description: '기본 투자 경험이 있어요' },
  { id: 'advanced', emoji: '🏆', label: '고급', description: '투자 경험이 풍부해요' },
];

const INVESTMENT_GOALS: SelectionOption[] = [
  { id: 'retirement', emoji: '🏖️', label: '은퇴 준비', description: '안정적인 노후 대비' },
  { id: 'growth', emoji: '📈', label: '자산 증식', description: '적극적인 자산 성장' },
  { id: 'freedom', emoji: '🌟', label: '경제적 자유', description: '소득에 의존하지 않는 삶' },
];

// ============================================================================
// 온보딩 메인 컴포넌트
// ============================================================================

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  // 현재 단계 (0-indexed: 0=환영, 1=경험, 2=목표, 3=자산등록, 4=건강점수)
  const [currentStep, setCurrentStep] = useState(0);

  // 단계별 선택 상태
  const [investorLevel, setInvestorLevel] = useState<string | null>(null);
  const [investmentGoal, setInvestmentGoal] = useState<string | null>(null);

  // Step 3: 개인정보 동의 + 자산 등록 상태
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetPrice, setAssetPrice] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [addingAsset, setAddingAsset] = useState(false);
  const [registeredAssets, setRegisteredAssets] = useState<RegisteredAsset[]>([]);

  // Step 4: 건강 점수 결과 상태
  const [healthScore, setHealthScore] = useState<HealthScoreResult | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  // 애니메이션
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 검색 로직
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const results = searchStocks(searchQuery);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  }, [searchQuery]);

  // 종목 선택
  const selectStock = useCallback(async (stock: StockItem) => {
    setSelectedStock(stock);
    setSearchQuery(stock.name);
    setShowDropdown(false);
    Keyboard.dismiss();

    // 현재가 자동 로드
    setPriceLoading(true);
    try {
      const assetClass = inferAssetClass(stock.ticker);
      const currency = stock.ticker.endsWith('.KS') || stock.ticker.endsWith('.KQ') ? 'KRW' : 'USD';
      const priceData = await withTimeout(
        priceService.fetchPrice(stock.ticker, assetClass, currency),
        20000,
        '가격 조회 시간 초과'
      );
      if (priceData && priceData.currentPrice > 0) {
        setAssetPrice(String(priceData.currentPrice));
      }
    } catch {
      // 실패해도 수동 입력 가능
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // 자산 등록 (Supabase에 저장)
  const handleAddAsset = useCallback(async () => {
    if (!selectedStock || !assetQuantity || !assetPrice) return;
    const q = parseFloat(assetQuantity);
    const p = parseFloat(assetPrice);
    if (!q || q <= 0 || !p || p <= 0) return;

    setAddingAsset(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인 필요');

      const ticker = selectedStock.ticker.trim();
      const name = selectedStock.name.trim();
      const currency = (ticker.endsWith('.KS') || ticker.endsWith('.KQ')) ? 'KRW' : 'USD';

      await supabase.from('portfolios').upsert({
        user_id: user.id,
        ticker,
        name,
        quantity: q,
        avg_price: p,
        current_price: p,
        current_value: q * p,
        target_allocation: 0,
        asset_type: 'liquid',
        currency,
      }, { onConflict: 'user_id,name', ignoreDuplicates: false });

      // 등록 목록에 추가
      setRegisteredAssets(prev => [
        ...prev.filter(a => a.ticker !== ticker),
        { ticker, name, quantity: q, price: p, category: selectedStock.category },
      ]);

      // 폼 초기화
      setSelectedStock(null);
      setSearchQuery('');
      setAssetQuantity('');
      setAssetPrice('');
    } catch (err) {
      console.warn('[Onboarding] 자산 등록 실패:', err);
    } finally {
      setAddingAsset(false);
    }
  }, [selectedStock, assetQuantity, assetPrice]);

  // 건강 점수 계산 (Step 4 진입 시)
  const computeHealthScore = useCallback(async () => {
    if (registeredAssets.length === 0) return;
    setScoreLoading(true);
    try {
      const assets: Asset[] = registeredAssets.map((ra, i) => ({
        id: `onboarding-${i}`,
        name: ra.name,
        ticker: ra.ticker,
        currentValue: ra.quantity * ra.price,
        targetAllocation: 0,
        createdAt: Date.now(),
        assetType: AssetType.LIQUID,
        quantity: ra.quantity,
        avgPrice: ra.price,
        currentPrice: ra.price,
      }));
      const total = assets.reduce((sum, a) => sum + a.currentValue, 0);
      const result = calculateHealthScore(assets, total);
      setHealthScore(result);
    } catch (err) {
      console.warn('[Onboarding] 건강 점수 계산 실패:', err);
    } finally {
      setScoreLoading(false);
    }
  }, [registeredAssets]);

  // 등록 자산 수
  const selectedCount = registeredAssets.length;

  // 다음 단계로 이동 (페이드 애니메이션)
  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      const nextStep = currentStep + 1;
      // Step 4 (건강 점수) 진입 시 자동 계산
      if (nextStep === 4 && registeredAssets.length > 0) {
        computeHealthScore();
      }
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(nextStep);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  // 이전 단계로 이동
  const goBack = () => {
    if (currentStep > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep((prev) => prev - 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  // 시작하기 (완료)
  const handleStart = async () => {
    try {
      // 1. 투자 경험/목표 저장
      if (investorLevel) {
        await AsyncStorage.setItem('@baln:investor_level', investorLevel);
      }
      if (investmentGoal) {
        await AsyncStorage.setItem('@baln:investment_goal', investmentGoal);
      }

      // 2. 자산 등록 캐시 무효화 (분석 탭이 새 자산을 즉시 반영하도록)
      if (registeredAssets.length > 0) {
        queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });
      }

      // 3. 온보딩 완료 플래그
      await AsyncStorage.setItem('@baln:onboarding_completed', 'true');

      // 4. 메인 화면으로
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] 완료 실패:', error);
      router.replace('/(tabs)');
    }
  };

  // 건너뛰기 핸들러
  const handleSkip = async () => {
    try {
      // 투자 경험/목표 저장 (선택한 것만)
      if (investorLevel) {
        await AsyncStorage.setItem('@baln:investor_level', investorLevel);
      }
      if (investmentGoal) {
        await AsyncStorage.setItem('@baln:investment_goal', investmentGoal);
      }

      await AsyncStorage.setItem('@baln:onboarding_completed', 'true');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] 건너뛰기 저장 실패:', error);
      router.replace('/(tabs)');
    }
  };

  // 진행률 인디케이터
  const renderProgressDots = () => (
    <View style={styles.progressDots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === currentStep && styles.dotActive,
            i < currentStep && styles.dotCompleted,
          ]}
        />
      ))}
    </View>
  );

  // ============================================================================
  // 단계별 렌더링
  // ============================================================================

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderInvestorLevelStep();
      case 2:
        return renderInvestmentGoalStep();
      case 3:
        return renderAssetSelectionStep();
      case 4:
        return renderStartStep();
      default:
        return null;
    }
  };

  // 슬라이드 1: 환영
  function renderWelcomeStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.welcomeEmoji}>{'👋'}</Text>
        <Text style={styles.heading}>
          bal<Text style={{ color: '#4CAF50' }}>n</Text>{'에 오신 걸\n환영합니다'}
        </Text>
        <Text style={styles.subheading}>
          {'매일 5분, 시장 맥락을 읽어보세요.\n자기만의 투자 기준이 생깁니다.'}
        </Text>

        <View style={styles.featureList}>
          <FeatureItem emoji="📊" text="매일 시장 맥락 카드" />
          <FeatureItem emoji="🎯" text="투자 예측 게임" />
          <FeatureItem emoji="🤖" text="AI 포트폴리오 진단" />
        </View>
      </View>
    );
  }

  // 슬라이드 2: 투자 경험 선택
  function renderInvestorLevelStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.heading}>
          {'투자 경험이\n어떻게 되시나요?'}
        </Text>
        <Text style={styles.subheading}>
          맞춤 콘텐츠를 제공하기 위해 물어볼게요.
        </Text>

        <View style={styles.optionList}>
          {INVESTOR_LEVELS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                investorLevel === option.id && styles.optionCardSelected,
              ]}
              onPress={() => setInvestorLevel(option.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionLabel,
                  investorLevel === option.id && styles.optionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDesc}>{option.description}</Text>
              </View>
              {investorLevel === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.skipHint}>선택하지 않아도 넘어갈 수 있어요</Text>
      </View>
    );
  }

  // 슬라이드 3: 투자 목표 선택
  function renderInvestmentGoalStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.heading}>
          {'투자 목표는\n무엇인가요?'}
        </Text>
        <Text style={styles.subheading}>
          목표에 맞는 분석을 제공해드릴게요.
        </Text>

        <View style={styles.optionList}>
          {INVESTMENT_GOALS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                investmentGoal === option.id && styles.optionCardSelected,
              ]}
              onPress={() => setInvestmentGoal(option.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionLabel,
                  investmentGoal === option.id && styles.optionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDesc}>{option.description}</Text>
              </View>
              {investmentGoal === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.skipHint}>선택하지 않아도 넘어갈 수 있어요</Text>
      </View>
    );
  }

  // 슬라이드 4: 자산 등록 (실제 포트폴리오에 저장)
  const ONBOARDING_ACCESSORY_ID = 'onboarding-number-done';

  function renderAssetSelectionStep() {
    const totalValue = (parseFloat(assetQuantity) || 0) * (parseFloat(assetPrice) || 0);
    const canAdd = selectedStock && assetQuantity && assetPrice && totalValue > 0;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.stepContentFull}>
        {/* iOS 숫자 키보드 "완료" 버튼 */}
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={ONBOARDING_ACCESSORY_ID}>
            <View style={{ flexDirection: 'row', backgroundColor: '#2A2A2A', borderTopWidth: 1, borderTopColor: '#333', paddingHorizontal: 12, paddingVertical: 8 }}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => Keyboard.dismiss()} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary }}>완료</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
        <Text style={styles.heading}>
          {'보유 자산을\n등록해볼까요?'}
        </Text>
        <Text style={styles.subheading}>
          등록하면 바로 포트폴리오 건강 점수를 알려드려요
        </Text>

        {/* 개인정보 수집 동의 */}
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setPrivacyConsent(!privacyConsent)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={privacyConsent ? 'checkbox' : 'square-outline'}
            size={22}
            color={privacyConsent ? COLORS.primary : '#666666'}
          />
          <Text style={styles.consentText}>
            개인정보 수집 및 이용에 동의합니다
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/settings/privacy')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.consentLink}>[전문 보기]</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 동의 전에는 자산 등록 폼 비활성화 안내 */}
        {!privacyConsent && (
          <Text style={styles.consentHint}>
            자산을 등록하려면 개인정보 수집에 동의해주세요
          </Text>
        )}

        {/* 검색바 (동의 후 활성화) */}
        <View style={[styles.searchBarContainer, !privacyConsent && { opacity: 0.4 }]} pointerEvents={privacyConsent ? 'auto' : 'none'}>
          <Ionicons name="search" size={18} color="#757575" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="삼성전자, NVDA, 비트코인..."
            placeholderTextColor="#757575"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (selectedStock && text !== selectedStock.name) {
                setSelectedStock(null);
                setAssetPrice('');
              }
            }}
            onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            autoCorrect={false}
            returnKeyType="search"
            editable={privacyConsent}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedStock(null); setAssetPrice(''); }}>
              <Ionicons name="close-circle" size={18} color="#666" style={{ marginRight: 8 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* 검색 드롭다운 */}
        {showDropdown && (
          <View style={styles.dropdown}>
            {searchResults.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.ticker}
                style={styles.dropdownItem}
                onPress={() => selectStock(item)}
              >
                <View style={[styles.catBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                  <Text style={[styles.catBadgeText, { color: getCategoryColor(item.category) }]}>
                    {item.category === 'crypto' ? '코인' : item.category === 'us_stock' ? 'US' : item.category === 'etf' ? 'ETF' : 'KR'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownName}>{item.name}</Text>
                  <Text style={styles.dropdownTicker}>{item.ticker}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 선택된 종목이 있으면 수량/가격 입력 */}
        {selectedStock && !showDropdown && (
          <View style={styles.assetForm}>
            <Text style={styles.selectedLabel}>
              {selectedStock.name} ({selectedStock.ticker})
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>수량</Text>
                <TextInput
                  style={styles.numInput}
                  placeholder="예: 10"
                  placeholderTextColor="#555"
                  value={assetQuantity}
                  onChangeText={(t) => setAssetQuantity(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={ONBOARDING_ACCESSORY_ID}
                />
              </View>
              <View style={styles.inputHalf}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.inputLabel}>매수 단가</Text>
                  {priceLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
                </View>
                <TextInput
                  style={styles.numInput}
                  placeholder="0"
                  placeholderTextColor="#555"
                  value={assetPrice}
                  onChangeText={(t) => setAssetPrice(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={ONBOARDING_ACCESSORY_ID}
                />
              </View>
            </View>

            {totalValue > 0 && (
              <Text style={styles.totalPreview}>
                평가금액: {totalValue.toLocaleString()}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
              onPress={handleAddAsset}
              disabled={!canAdd || addingAsset}
              activeOpacity={0.8}
            >
              {addingAsset ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.addButtonText}>+ 등록</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 등록된 자산 목록 */}
        {registeredAssets.length > 0 && (
          <View style={styles.registeredList}>
            <Text style={styles.registeredTitle}>등록된 자산 ({registeredAssets.length})</Text>
            {registeredAssets.map((ra) => (
              <View key={ra.ticker} style={styles.registeredRow}>
                <Text style={styles.registeredName}>{ra.name}</Text>
                <Text style={styles.registeredValue}>
                  {ra.quantity}{ra.category === 'crypto' ? '개' : '주'} / {(ra.quantity * ra.price).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.skipHint}>
          {registeredAssets.length === 0 ? '건너뛰어도 나중에 등록할 수 있어요' : '더 추가하거나 다음으로 넘어가세요'}
        </Text>
      </View>
      </TouchableWithoutFeedback>
    );
  }

  // 슬라이드 5: 건강 점수 결과 (자산 등록 시) 또는 완료 화면
  function renderStartStep() {
    // 자산 미등록 시: 기존 완료 화면
    if (registeredAssets.length === 0) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.startEmoji}>{'🚀'}</Text>
          <Text style={styles.heading}>
            {'준비 완료!\n지금 시작하세요'}
          </Text>
          <Text style={styles.subheading}>
            {'매일 5분 투자로\n당신의 투자 기준을 만들어보세요.'}
          </Text>
          <View style={styles.summaryCard}>
            {investorLevel && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>투자 경험</Text>
                <Text style={styles.summaryValue}>
                  {INVESTOR_LEVELS.find(l => l.id === investorLevel)?.emoji}{' '}
                  {INVESTOR_LEVELS.find(l => l.id === investorLevel)?.label}
                </Text>
              </View>
            )}
            {investmentGoal && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>투자 목표</Text>
                <Text style={styles.summaryValue}>
                  {INVESTMENT_GOALS.find(g => g.id === investmentGoal)?.emoji}{' '}
                  {INVESTMENT_GOALS.find(g => g.id === investmentGoal)?.label}
                </Text>
              </View>
            )}
            <Text style={styles.summaryEmpty}>
              자산은 나중에 등록할 수 있어요
            </Text>
          </View>
        </View>
      );
    }

    // 자산 등록 완료: 건강 점수 결과 표시
    if (scoreLoading) {
      return (
        <View style={styles.stepContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.subheading, { marginTop: 16 }]}>
            포트폴리오를 분석하고 있어요...
          </Text>
        </View>
      );
    }

    const score = healthScore;
    const weakest = score ? [...score.factors].sort((a, b) => a.score - b.score)[0] : null;

    return (
      <View style={styles.stepContent}>
        {/* 등급 대형 표시 */}
        <View style={[styles.gradeCircle, { borderColor: score?.gradeColor || '#4CAF50' }]}>
          <Text style={[styles.gradeText, { color: score?.gradeColor || '#4CAF50' }]}>
            {score?.grade || 'B'}
          </Text>
        </View>

        <Text style={styles.heading}>
          {score?.gradeLabel || '양호'}
        </Text>
        <Text style={styles.scoreNumber}>
          {score?.totalScore ?? 70}점
        </Text>

        {/* 요약 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>등록 자산</Text>
            <Text style={styles.summaryValue}>{registeredAssets.length}개</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>총 평가금액</Text>
            <Text style={styles.summaryValue}>
              {registeredAssets.reduce((s, a) => s + a.quantity * a.price, 0).toLocaleString()}
            </Text>
          </View>
          {weakest && (
            <View style={styles.weakFactorRow}>
              <Text style={styles.weakFactorIcon}>{weakest.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.weakFactorLabel}>개선 포인트</Text>
                <Text style={styles.weakFactorComment}>{weakest.comment}</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.subheading, { marginTop: 16 }]}>
          분석 탭에서 더 자세한 진단을 확인하세요
        </Text>
      </View>
    );
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 상단: 뒤로가기 + 진행률 + 건너뛰기 */}
      <View style={styles.topBar}>
        {currentStep > 0 ? (
          <TouchableOpacity onPress={goBack} style={styles.topBarButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarButton} />
        )}

        {renderProgressDots()}

        <TouchableOpacity onPress={handleSkip} style={styles.topBarButton}>
          <Text style={styles.skipButtonText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>

      {/* 단계별 콘텐츠 */}
      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
        {renderStep()}
      </Animated.View>

      {/* 하단 버튼 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {currentStep < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={goNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              다음
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>{'시작하기 \u2192'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// 피처 아이템 컴포넌트
// ============================================================================

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },

  // 상단 바
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topBarButton: {
    width: 70,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#757575',
  },

  // 진행률 점
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: COLORS.primary + '60',
  },

  // 단계 컨테이너
  stepContainer: {
    flex: 1,
  },

  // 단계 콘텐츠
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  stepContentFull: {
    flex: 1,
  },

  // 환영 이모지
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  startEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },

  // 헤딩
  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },

  // 피처 리스트
  featureList: {
    gap: 16,
    alignItems: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    maxWidth: 300,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  // 옵션 리스트 (경험/목표 선택)
  optionList: {
    gap: 12,
    width: '100%',
    maxWidth: 360,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#1A2A1A',
  },
  optionEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  optionDesc: {
    fontSize: 13,
    color: '#888888',
  },
  skipHint: {
    fontSize: 13,
    color: '#666666',
    marginTop: 24,
    textAlign: 'center',
  },

  // 검색바 (자산 선택 단계)
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  // 검색 드롭다운
  dropdown: {
    backgroundColor: '#252525',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
    maxHeight: 220,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    gap: 10,
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  dropdownTicker: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },

  // 자산 등록 폼
  assetForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252525',
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAA',
    marginBottom: 6,
  },
  numInput: {
    height: 42,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  totalPreview: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 등록된 자산 목록
  registeredList: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  registeredTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAA',
    marginBottom: 8,
  },
  registeredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  registeredName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  registeredValue: {
    fontSize: 13,
    color: '#AAA',
  },

  // 건강 점수 등급 원형
  gradeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gradeText: {
    fontSize: 40,
    fontWeight: '800',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#AAAAAA',
    marginBottom: 24,
  },

  // 취약 팩터
  weakFactorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,183,77,0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  weakFactorIcon: {
    fontSize: 20,
  },
  weakFactorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB74D',
    marginBottom: 2,
  },
  weakFactorComment: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 18,
  },

  // 시작 요약 카드
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#888888',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryEmpty: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },

  // 하단 영역
  footer: {
    paddingTop: 12,
    alignItems: 'center',
  },

  // 다음 버튼
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 시작하기 버튼
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // 개인정보 동의
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  consentLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  consentHint: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
});
