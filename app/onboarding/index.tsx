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
import { useTheme } from '../../src/hooks/useTheme';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import { searchStocks, StockItem, getCategoryColor } from '../../src/data/stockList';
import { priceService } from '../../src/services/PriceService';
import { AssetClass } from '../../src/types/price';
import { calculateHealthScore, HealthScoreResult, DALIO_TARGET, BUFFETT_TARGET, CATHIE_WOOD_TARGET } from '../../src/services/rebalanceScore';
import type { GuruStyle } from '../../src/hooks/useGuruStyle';
import { AssetType } from '../../src/types/asset';
import type { Asset } from '../../src/types/asset';
import { SHARED_PORTFOLIO_KEY } from '../../src/hooks/useSharedPortfolio';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const GURU_OPTIONS: GuruOption[] = [
  {
    id: 'dalio',
    emoji: '🌊',
    name: '레이 달리오',
    tagline: '"어떤 환경에도 생존"',
    keyAlloc: '주식30 채권40 금10 원자재8',
    accentColor: '#4CAF50',
  },
  {
    id: 'buffett',
    emoji: '🔴',
    name: '워렌 버핏',
    tagline: '"생산하는 자산만 투자"',
    keyAlloc: '주식60 현금25 채권5',
    accentColor: '#FF5722',
  },
  {
    id: 'cathie_wood',
    emoji: '🚀',
    name: '캐시 우드',
    tagline: '"혁신이 미래다"',
    keyAlloc: '혁신주50 BTC25 알트10 현금15',
    accentColor: '#9C27B0',
  },
  {
    id: 'kostolany',
    emoji: '📈',
    name: '코스톨라니',
    tagline: '"시장 사이클 따르기"',
    keyAlloc: 'AI가 현재 국면 분석 자동 추천',
    accentColor: '#FFB74D',
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
          bal<Text style={{ color: '#4CAF50' }}>n</Text>{'에 오신 걸\n환영합니다'}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
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
          {'나의 투자 스타일\n선택하기'}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          어떤 거장의 철학을 따르시나요?{'\n'}선택한 철학이 기본 목표 배분이 됩니다.
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
                  {guru.name}
                </Text>
                <Text style={[styles.guruTagline, { color: colors.textTertiary }]} numberOfLines={2}>
                  {guru.tagline}
                </Text>
                <Text style={[styles.guruAlloc, { color: colors.textTertiary }]} numberOfLines={2}>
                  {guru.keyAlloc}
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
          언제든지 전체 탭 → 투자 철학 변경에서 바꿀 수 있어요
        </Text>
      </ScrollView>
    );
  }

  // 슬라이드 3: 투자 경험 선택
  function renderInvestorLevelStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {'투자 경험이\n어떻게 되시나요?'}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          맞춤 콘텐츠를 제공하기 위해 물어볼게요.
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
                  {option.label}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{option.description}</Text>
              </View>
              {investorLevel === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.skipHint, { color: colors.textTertiary }]}>선택하지 않아도 넘어갈 수 있어요</Text>
      </View>
    );
  }

  // 슬라이드 3: 투자 목표 선택
  function renderInvestmentGoalStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {'투자 목표는\n무엇인가요?'}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          목표에 맞는 분석을 제공해드릴게요.
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
                  {option.label}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{option.description}</Text>
              </View>
              {investmentGoal === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.skipHint, { color: colors.textTertiary }]}>선택하지 않아도 넘어갈 수 있어요</Text>
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
            <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceLight, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => Keyboard.dismiss()} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>완료</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {'보유 자산을\n등록해볼까요?'}
        </Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          등록하면 바로 포트폴리오 건강 점수를 알려드려요
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
            개인정보 수집 및 이용에 동의합니다
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/settings/privacy')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.consentLink, { color: colors.primary }]}>[전문 보기]</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 동의 전에는 자산 등록 폼 비활성화 안내 */}
        {!privacyConsent && (
          <Text style={[styles.consentHint, { color: colors.textTertiary }]}>
            자산을 등록하려면 개인정보 수집에 동의해주세요
          </Text>
        )}

        {/* 검색바 (동의 후 활성화) */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface }, !privacyConsent && { opacity: 0.4 }]} pointerEvents={privacyConsent ? 'auto' : 'none'}>
          <Ionicons name="search" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="삼성전자, NVDA, 비트코인..."
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
                    {item.category === 'crypto' ? '코인' : item.category === 'us_stock' ? 'US' : item.category === 'etf' ? 'ETF' : 'KR'}
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
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>수량</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="예: 10"
                  placeholderTextColor={colors.textTertiary}
                  value={assetQuantity}
                  onChangeText={(t) => setAssetQuantity(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  inputAccessoryViewID={ONBOARDING_ACCESSORY_ID}
                />
              </View>
              <View style={styles.inputHalf}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>매수 단가</Text>
                  {priceLoading && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="0"
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
                평가금액: {totalValue.toLocaleString()}
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
                <Text style={styles.addButtonText}>+ 등록</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 등록된 자산 목록 */}
        {registeredAssets.length > 0 && (
          <View style={[styles.registeredList, { backgroundColor: colors.surface }]}>
            <Text style={[styles.registeredTitle, { color: colors.textSecondary }]}>등록된 자산 ({registeredAssets.length})</Text>
            {registeredAssets.map((ra) => (
              <View key={ra.ticker} style={[styles.registeredRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.registeredName, { color: colors.textPrimary }]}>{ra.name}</Text>
                <Text style={[styles.registeredValue, { color: colors.textSecondary }]}>
                  {ra.quantity}{ra.category === 'crypto' ? '개' : '주'} / {(ra.quantity * ra.price).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.skipHint, { color: colors.textTertiary }]}>
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
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            {'준비 완료!\n지금 시작하세요'}
          </Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            {'매일 5분 투자로\n당신의 투자 기준을 만들어보세요.'}
          </Text>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            {investorLevel && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>투자 경험</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {INVESTOR_LEVELS.find(l => l.id === investorLevel)?.emoji}{' '}
                  {INVESTOR_LEVELS.find(l => l.id === investorLevel)?.label}
                </Text>
              </View>
            )}
            {investmentGoal && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>투자 목표</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {INVESTMENT_GOALS.find(g => g.id === investmentGoal)?.emoji}{' '}
                  {INVESTMENT_GOALS.find(g => g.id === investmentGoal)?.label}
                </Text>
              </View>
            )}
            <Text style={[styles.summaryEmpty, { color: colors.textTertiary }]}>
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.subheading, { marginTop: 16, color: colors.textSecondary }]}>
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

        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {score?.gradeLabel || '양호'}
        </Text>
        <Text style={[styles.scoreNumber, { color: colors.textSecondary }]}>
          {score?.totalScore ?? 70}점
        </Text>

        {/* 요약 카드 */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>등록 자산</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{registeredAssets.length}개</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>총 평가금액</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
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

        <Text style={[styles.subheading, { marginTop: 16, color: colors.textSecondary }]}>
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
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarButton} />
        )}

        {renderProgressDots()}

        <TouchableOpacity onPress={handleSkip} style={styles.topBarButton}>
          <Text style={[styles.skipButtonText, { color: colors.textTertiary }]}>건너뛰기</Text>
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
              다음
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
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
    fontSize: 14,
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
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
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
    fontSize: 24,
  },
  featureText: {
    fontSize: 16,
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
    fontSize: 28,
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
  },
  skipHint: {
    fontSize: 13,
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
    fontSize: 24,
  },
  guruName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  guruTagline: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    fontStyle: 'italic',
  },
  guruAlloc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
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
    fontSize: 16,
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
    fontSize: 10,
    fontWeight: '700',
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownTicker: {
    fontSize: 11,
    marginTop: 1,
  },
  assetForm: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  selectedLabel: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  numInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  totalPreview: {
    fontSize: 13,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  registeredList: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  registeredTitle: {
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '600',
  },
  registeredValue: {
    fontSize: 13,
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
    fontSize: 18,
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
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryEmpty: {
    fontSize: 14,
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
    fontSize: 18,
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
    fontSize: 18,
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
    fontSize: 14,
    fontWeight: '500',
  },
  consentLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  consentHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
});
