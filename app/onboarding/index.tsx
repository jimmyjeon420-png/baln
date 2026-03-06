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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import { searchStocks, StockItem, getCategoryColor } from '../../src/data/stockList';
import { calculateHealthScore, HealthScoreResult } from '../../src/services/rebalanceScore';
import type { GuruStyle } from '../../src/hooks/useGuruStyle';
import { AssetType, type Asset } from '../../src/types/asset';
import { SHARED_PORTFOLIO_KEY } from '../../src/hooks/useSharedPortfolio';

// 총 단계 수 (구루 선택 Step 1 추가로 6단계)
const TOTAL_STEPS = 6;

// ============================================================================
// 구루 선택 데이터
// ============================================================================

interface GuruOption {
  id: GuruStyle;
  emoji: string;
  name: string;
  tagline: string;
  keyAlloc: string;
  accentColor: string;
}

const GURU_OPTIONS: (Omit<GuruOption, 'name' | 'tagline' | 'keyAlloc'> & { nameKey: string; taglineKey: string; keyAllocKey: string })[] = [
  {
    id: 'dalio',
    emoji: '🌊',
    nameKey: 'onboarding.guru.dalio_name',
    taglineKey: 'onboarding.guru.dalio_tagline',
    keyAllocKey: 'onboarding.guru.dalio_alloc',
    accentColor: '#4CAF50',
  },
  {
    id: 'buffett',
    emoji: '🔴',
    nameKey: 'onboarding.guru.buffett_name',
    taglineKey: 'onboarding.guru.buffett_tagline',
    keyAllocKey: 'onboarding.guru.buffett_alloc',
    accentColor: '#FF5722',
  },
  {
    id: 'cathie_wood',
    emoji: '🚀',
    nameKey: 'onboarding.guru.cathie_name',
    taglineKey: 'onboarding.guru.cathie_tagline',
    keyAllocKey: 'onboarding.guru.cathie_alloc',
    accentColor: '#9C27B0',
  },
];

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


// ============================================================================
// 투자 경험 / 목표 옵션
// ============================================================================

// SelectionOption interface removed — no longer used

const INVESTOR_LEVELS: { id: string; emoji: string; labelKey: string; descKey: string }[] = [
  { id: 'beginner', emoji: '👶', labelKey: 'onboarding.level.beginner', descKey: 'onboarding.level.beginner_desc' },
  { id: 'intermediate', emoji: '📊', labelKey: 'onboarding.level.intermediate', descKey: 'onboarding.level.intermediate_desc' },
  { id: 'advanced', emoji: '🏆', labelKey: 'onboarding.level.advanced', descKey: 'onboarding.level.advanced_desc' },
];

const INVESTMENT_GOALS: { id: string; emoji: string; labelKey: string; descKey: string }[] = [
  { id: 'retirement', emoji: '🏖️', labelKey: 'onboarding.goal.retirement', descKey: 'onboarding.goal.retirement_desc' },
  { id: 'growth', emoji: '📈', labelKey: 'onboarding.goal.growth', descKey: 'onboarding.goal.growth_desc' },
  { id: 'freedom', emoji: '🌟', labelKey: 'onboarding.goal.freedom', descKey: 'onboarding.goal.freedom_desc' },
];

// ============================================================================
// 온보딩 메인 컴포넌트
// ============================================================================

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { t } = useLocale();

  // 현재 단계 (0-indexed: 0=환영, 1=구루선택, 2=경험, 3=목표, 4=자산등록, 5=건강점수)
  const [currentStep, setCurrentStep] = useState(0);

  // 단계별 선택 상태
  const [selectedGuru, setSelectedGuru] = useState<GuruStyle>('dalio');
  const [investorLevel, setInvestorLevel] = useState<string | null>(null);
  const [investmentGoal, setInvestmentGoal] = useState<string | null>(null);

  // Step 3: 개인정보 동의 + 자산 등록 상태
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetPrice, setAssetPrice] = useState(''); // 총 매수금액(원화)
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

  // 종목 선택 (총 매수금액은 사용자만 알 수 있으므로 자동 채우기 없음)
  const selectStock = useCallback((stock: StockItem) => {
    setSelectedStock(stock);
    setSearchQuery(stock.name);
    setShowDropdown(false);
    setAssetPrice('');
    Keyboard.dismiss();
  }, []);

  // 자산 등록 (Supabase에 저장) — assetPrice = 총 매수금액(원화)
  const handleAddAsset = useCallback(async () => {
    if (!selectedStock || !assetQuantity) return;
    const q = parseFloat(assetQuantity);
    if (!q || q <= 0) return;

    // 총 매수금액 → 평균 단가 계산
    const totalCost = parseFloat(assetPrice) || 0;
    const avgPrice = totalCost > 0 && q > 0 ? Math.round(totalCost / q) : 0;

    setAddingAsset(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error(t('common.login_required'));

      const ticker = selectedStock.ticker.trim();
      const name = selectedStock.name.trim();

      await supabase.from('portfolios').upsert({
        user_id: user.id,
        ticker,
        name,
        quantity: q,
        avg_price: avgPrice,
        current_price: avgPrice,
        current_value: totalCost > 0 ? totalCost : 0,
        target_allocation: 0,
        asset_type: 'liquid',
        currency: 'KRW',
      }, { onConflict: 'user_id,name', ignoreDuplicates: false });

      // 등록 목록에 추가
      setRegisteredAssets(prev => [
        ...prev.filter(a => a.ticker !== ticker),
        { ticker, name, quantity: q, price: avgPrice, category: selectedStock.category },
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 다음 단계로 이동 (페이드 애니메이션)
  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      const nextStep = currentStep + 1;
      // Step 5 (건강 점수) 진입 시 자동 계산 (TOTAL_STEPS 6으로 증가로 인해 5로 변경)
      if (nextStep === 5 && registeredAssets.length > 0) {
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
      // 1. 구루 스타일 저장
      await AsyncStorage.setItem('@baln:guru_style', selectedGuru);

      // 2. 투자 경험/목표 저장
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
      // 구루 스타일 저장 (기본값 유지)
      await AsyncStorage.setItem('@baln:guru_style', selectedGuru);

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

  const handleQuickStart = () => {
    handleSkip();
  };

  // 진행률 인디케이터
  const renderProgressDots = () => (
    <View style={styles.progressDots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: colors.border },
            i === currentStep && [styles.dotActive, { backgroundColor: colors.primary }],
            i < currentStep && { backgroundColor: colors.primary + '60' },
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
        return renderGuruSelectionStep();
      case 2:
        return renderInvestorLevelStep();
      case 3:
        return renderInvestmentGoalStep();
      case 4:
        return renderAssetSelectionStep();
      case 5:
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
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {t('onboarding.welcome.heading')}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          {t('onboarding.welcome.subheading')}
        </Text>

        <View style={styles.featureList}>
          <FeatureItem emoji="📊" text={t('onboarding.welcome.feature1')} />
          <FeatureItem emoji="🎯" text={t('onboarding.welcome.feature2')} />
          <FeatureItem emoji="💊" text={t('onboarding.welcome.feature3')} />
        </View>
        <TouchableOpacity
          style={[styles.quickStartButton, { borderColor: colors.primary }]}
          onPress={handleQuickStart}
          activeOpacity={0.8}
        >
          <Text style={[styles.quickStartButtonText, { color: colors.primary }]}>
            {t('onboarding.welcome.quick_start')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 슬라이드 2: 구루 선택 (투자 스타일 선택)
  function renderGuruSelectionStep() {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {t('onboarding.guru.heading')}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          {t('onboarding.guru.subheading')}
        </Text>

        <View style={styles.guruGrid}>
          {GURU_OPTIONS.map((guru) => {
            const isSelected = selectedGuru === guru.id;
            return (
              <TouchableOpacity
                key={guru.id}
                style={[
                  styles.guruCard,
                  { backgroundColor: colors.surface, borderColor: isSelected ? guru.accentColor : colors.surfaceLight },
                  isSelected && { borderWidth: 2 },
                ]}
                onPress={() => setSelectedGuru(guru.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.guruEmojiWrap, { backgroundColor: guru.accentColor + '20' }]}>
                  <Text style={styles.guruEmoji}>{guru.emoji}</Text>
                </View>
                <Text style={[styles.guruName, { color: isSelected ? guru.accentColor : colors.textPrimary }]}>
                  {t(guru.nameKey)}
                </Text>
                <Text style={[styles.guruTagline, { color: colors.textTertiary }]} numberOfLines={2}>
                  {t(guru.taglineKey)}
                </Text>
                <Text style={[styles.guruAlloc, { color: colors.textTertiary }]} numberOfLines={2}>
                  {t(guru.keyAllocKey)}
                </Text>
                {isSelected && (
                  <View style={[styles.guruSelectedDot, { backgroundColor: guru.accentColor }]}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.skipHint, { color: colors.textTertiary }]}>
          {t('onboarding.guru.change_hint')}
        </Text>
      </ScrollView>
    );
  }

  // 슬라이드 3: 투자 경험 선택
  function renderInvestorLevelStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {t('onboarding.level.heading')}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          {t('onboarding.level.subheading')}
        </Text>

        <View style={styles.optionList}>
          {INVESTOR_LEVELS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceLight },
                investorLevel === option.id && [styles.optionCardSelected, { borderColor: colors.primary }],
              ]}
              onPress={() => setInvestorLevel(option.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionLabel,
                  { color: colors.textPrimary },
                  investorLevel === option.id && { color: colors.primary },
                ]}>
                  {t(option.labelKey)}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{t(option.descKey)}</Text>
              </View>
              {investorLevel === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.skipHint, { color: colors.textTertiary }]}>{t('onboarding.skip_hint')}</Text>
      </View>
    );
  }

  // 슬라이드 3: 투자 목표 선택
  function renderInvestmentGoalStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {t('onboarding.goal.heading')}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          {t('onboarding.goal.subheading')}
        </Text>

        <View style={styles.optionList}>
          {INVESTMENT_GOALS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceLight },
                investmentGoal === option.id && [styles.optionCardSelected, { borderColor: colors.primary }],
              ]}
              onPress={() => setInvestmentGoal(option.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionLabel,
                  { color: colors.textPrimary },
                  investmentGoal === option.id && { color: colors.primary },
                ]}>
                  {t(option.labelKey)}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{t(option.descKey)}</Text>
              </View>
              {investmentGoal === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.skipHint, { color: colors.textTertiary }]}>{t('onboarding.skip_hint')}</Text>
      </View>
    );
  }

  // 슬라이드 4: 자산 등록 (실제 포트폴리오에 저장)
  const ONBOARDING_ACCESSORY_ID = 'onboarding-number-done';

  function renderAssetSelectionStep() {
    const totalCost = parseFloat(assetPrice) || 0;
    const totalValue = totalCost; // 총 매수금액이 곧 평가금액 기준
    const canAdd = selectedStock && assetQuantity && parseFloat(assetQuantity) > 0;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.stepContentFull}>
        {/* iOS 숫자 키보드 "완료" 버튼 */}
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={ONBOARDING_ACCESSORY_ID}>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceLight, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => Keyboard.dismiss()} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {t('onboarding.asset.heading')}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          {t('onboarding.asset.subheading')}
        </Text>

        {/* 개인정보 수집 동의 */}
        <TouchableOpacity
          style={[styles.consentRow, { backgroundColor: colors.surface }]}
          onPress={() => setPrivacyConsent(!privacyConsent)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={privacyConsent ? 'checkbox' : 'square-outline'}
            size={22}
            color={privacyConsent ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.consentText, { color: colors.textPrimary }]}>
            {t('onboarding.asset.consent_text')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/settings/privacy')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.consentLink, { color: colors.primary }]}>{t('onboarding.asset.consent_link')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 동의 전에는 자산 등록 폼 비활성화 안내 */}
        {!privacyConsent && (
          <Text style={[styles.consentHint, { color: colors.textTertiary }]}>
            {t('onboarding.asset.consent_hint')}
          </Text>
        )}

        {/* 검색바 (동의 후 활성화) */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface }, !privacyConsent && { opacity: 0.4 }]} pointerEvents={privacyConsent ? 'auto' : 'none'}>
          <Ionicons name="search" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('onboarding.search_placeholder')}
            placeholderTextColor={colors.textTertiary}
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
          <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {searchResults.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.ticker}
                style={[styles.dropdownItem, { borderBottomColor: colors.surfaceLight }]}
                onPress={() => selectStock(item)}
              >
                <View style={[styles.catBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                  <Text style={[styles.catBadgeText, { color: getCategoryColor(item.category) }]}>
                    {item.category === 'crypto' ? t('onboarding.asset.category_crypto') : item.category === 'us_stock' ? 'US' : item.category === 'etf' ? 'ETF' : 'KR'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.dropdownTicker, { color: colors.textSecondary }]}>{item.ticker}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 선택된 종목이 있으면 수량/가격 입력 */}
        {selectedStock && !showDropdown && (
          <View style={[styles.assetForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.selectedLabel, { color: colors.primary }]}>
              {selectedStock.name} ({selectedStock.ticker})
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('onboarding.asset.quantity_label')}</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder={t('onboarding.asset.quantity_placeholder')}
                  placeholderTextColor={colors.textTertiary}
                  value={assetQuantity}
                  onChangeText={(t) => setAssetQuantity(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={ONBOARDING_ACCESSORY_ID}
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('onboarding.asset.total_cost_label')}</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder={t('onboarding.asset.cost_placeholder')}
                  placeholderTextColor={colors.textTertiary}
                  value={assetPrice}
                  onChangeText={(t) => setAssetPrice(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={ONBOARDING_ACCESSORY_ID}
                />
              </View>
            </View>

            {totalValue > 0 && (
              <Text style={[styles.totalPreview, { color: colors.primary }]}>
                {t('onboarding.asset.total_preview', { amount: totalValue.toLocaleString() })}
                {parseFloat(assetQuantity) > 0
                  ? ` (${t('onboarding.asset.avg_price', { price: Math.round(totalValue / parseFloat(assetQuantity)).toLocaleString() })})`
                  : ''}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }, !canAdd && styles.addButtonDisabled]}
              onPress={handleAddAsset}
              disabled={!canAdd || addingAsset}
              activeOpacity={0.8}
            >
              {addingAsset ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.addButtonText}>{t('onboarding.asset.add_button')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 등록된 자산 목록 */}
        {registeredAssets.length > 0 && (
          <View style={[styles.registeredList, { backgroundColor: colors.surface }]}>
            <Text style={[styles.registeredTitle, { color: colors.textSecondary }]}>{t('onboarding.asset.registered_title', { count: registeredAssets.length })}</Text>
            {registeredAssets.map((ra) => (
              <View key={ra.ticker} style={[styles.registeredRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.registeredName, { color: colors.textPrimary }]}>{ra.name}</Text>
                <Text style={[styles.registeredValue, { color: colors.textSecondary }]}>
                  {ra.quantity}{ra.category === 'crypto' ? t('onboarding.asset.unit_coin') : t('onboarding.asset.unit_share')} / {(ra.quantity * ra.price).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.skipHint, { color: colors.textTertiary }]}>
          {registeredAssets.length === 0 ? t('onboarding.asset.skip_hint') : t('onboarding.asset.add_more_hint')}
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
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            {t('onboarding.start.heading')}
          </Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            {t('onboarding.start.subheading')}
          </Text>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            {investorLevel && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('onboarding.start.experience_label')}</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {INVESTOR_LEVELS.find(l => l.id === investorLevel)?.emoji}{' '}
                  {t(INVESTOR_LEVELS.find(l => l.id === investorLevel)?.labelKey ?? '')}
                </Text>
              </View>
            )}
            {investmentGoal && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('onboarding.start.goal_label')}</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {INVESTMENT_GOALS.find(g => g.id === investmentGoal)?.emoji}{' '}
                  {t(INVESTMENT_GOALS.find(g => g.id === investmentGoal)?.labelKey ?? '')}
                </Text>
              </View>
            )}
            <Text style={[styles.summaryEmpty, { color: colors.textTertiary }]}>
              {t('onboarding.start.add_later')}
            </Text>
          </View>
        </View>
      );
    }

    // 자산 등록 완료: 건강 점수 결과 표시
    if (scoreLoading) {
      return (
        <View style={styles.stepContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.subheading, { marginTop: 16, color: colors.textSecondary }]}>
            {t('onboarding.score.loading')}
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

        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {score?.gradeLabel || t('onboarding.score.default_grade')}
        </Text>
        <Text style={[styles.scoreNumber, { color: colors.textSecondary }]}>
          {t('onboarding.score.score_display', { score: score?.totalScore ?? 70 })}
        </Text>

        {/* 요약 카드 */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('onboarding.score.registered_assets')}</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{t('onboarding.score.asset_count', { count: registeredAssets.length })}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('onboarding.score.total_value')}</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              {registeredAssets.reduce((s, a) => s + a.quantity * a.price, 0).toLocaleString()}
            </Text>
          </View>
          {weakest && (
            <View style={styles.weakFactorRow}>
              <Text style={styles.weakFactorIcon}>{weakest.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.weakFactorLabel}>{t('onboarding.score.improvement_point')}</Text>
                <Text style={styles.weakFactorComment}>{weakest.comment}</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.subheading, { marginTop: 16, color: colors.textSecondary }]}>
          {t('onboarding.score.check_analysis')}
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
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarButton} />
        )}

        {renderProgressDots()}

        <TouchableOpacity onPress={handleSkip} style={styles.topBarButton}>
          <Text style={[styles.skipButtonText, { color: colors.textTertiary }]}>{t('onboarding.quick_start')}</Text>
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
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={goNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {t('common.next')}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>{t('onboarding.start.button')}</Text>
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
  const { colors } = useTheme();
  return (
    <View style={[styles.featureItem, { backgroundColor: colors.surface }]}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={[styles.featureText, { color: colors.textPrimary }]}>{text}</Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
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
    fontSize: 15,
  },
  quickStartButton: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  quickStartButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  stepContentFull: {
    flex: 1,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  startEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  heading: {
    fontSize: 31,
    fontWeight: '700',
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 32,
  },
  featureList: {
    gap: 16,
    alignItems: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    maxWidth: 300,
  },
  featureEmoji: {
    fontSize: 25,
  },
  featureText: {
    fontSize: 17,
    fontWeight: '500',
  },
  optionList: {
    gap: 12,
    width: '100%',
    maxWidth: 360,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  optionEmoji: {
    fontSize: 29,
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 14,
  },
  skipHint: {
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
  },
  // ── 구루 선택 그리드 스타일 ──
  guruGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  guruCard: {
    width: '46%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  guruEmojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  guruEmoji: {
    fontSize: 25,
  },
  guruName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  guruTagline: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  guruAlloc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  guruSelectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 17,
  },
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
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
    gap: 10,
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownTicker: {
    fontSize: 12,
    marginTop: 1,
  },
  assetForm: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  selectedLabel: {
    fontSize: 15,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  numInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  totalPreview: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  addButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  registeredList: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  registeredTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  registeredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  registeredName: {
    fontSize: 15,
    fontWeight: '600',
  },
  registeredValue: {
    fontSize: 14,
  },
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
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 24,
  },
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
    fontSize: 21,
  },
  weakFactorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFB74D',
    marginBottom: 2,
  },
  weakFactorComment: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 19,
  },
  summaryCard: {
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
    fontSize: 15,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryEmpty: {
    fontSize: 15,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 12,
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
  },
  nextButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  startButton: {
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  consentText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  consentLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  consentHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
});
