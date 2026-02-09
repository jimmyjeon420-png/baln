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

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHeartAssets } from '../../src/hooks/useHeartAssets';
import { COLORS } from '../../src/styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 총 단계 수
const TOTAL_STEPS = 5;

// ============================================================================
// 인기 자산 하드코딩 데이터
// ============================================================================

interface PopularAsset {
  name: string;
  ticker: string;
  type: 'stock' | 'crypto';
}

const POPULAR_ASSETS: PopularAsset[] = [
  { name: '삼성전자', ticker: '005930', type: 'stock' },
  { name: '비트코인', ticker: 'BTC', type: 'crypto' },
  { name: '테슬라', ticker: 'TSLA', type: 'stock' },
  { name: '애플', ticker: 'AAPL', type: 'stock' },
  { name: '이더리움', ticker: 'ETH', type: 'crypto' },
  { name: '현대차', ticker: '005380', type: 'stock' },
  { name: '카카오', ticker: '035720', type: 'stock' },
  { name: '네이버', ticker: '035420', type: 'stock' },
];

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
  const { addHeart } = useHeartAssets();

  // 현재 단계 (0-indexed: 0=환영, 1=경험, 2=목표, 3=자산선택, 4=시작)
  const [currentStep, setCurrentStep] = useState(0);

  // 단계별 선택 상태
  const [investorLevel, setInvestorLevel] = useState<string | null>(null);
  const [investmentGoal, setInvestmentGoal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // 애니메이션
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 검색 필터링
  const displayedAssets = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) return POPULAR_ASSETS;
    return POPULAR_ASSETS.filter((asset) =>
      asset.name.toLowerCase().includes(trimmed.toLowerCase())
    );
  }, [searchQuery]);

  // 선택 개수
  const selectedCount = selectedAssets.size;

  // 칩 하트 토글
  const handleToggle = (ticker: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  // 다음 단계로 이동 (페이드 애니메이션)
  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep((prev) => prev + 1);
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

      // 2. 선택한 자산들 Heart에 저장
      const selectedArray = POPULAR_ASSETS.filter((a) =>
        selectedAssets.has(a.ticker)
      );
      for (const asset of selectedArray) {
        addHeart({
          name: asset.name,
          ticker: asset.ticker,
          type: asset.type,
        });
      }

      // 3. 온보딩 완료 플래그
      await AsyncStorage.setItem('@baln:onboarding_completed', 'true');

      // 4. 메인 화면으로
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] 완료 실패:', error);
      // 에러 발생해도 홈으로 이동
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
          {'baln에 오신 걸\n환영합니다'}
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

  // 슬라이드 4: 관심 자산 선택 (기존 온보딩 핵심)
  function renderAssetSelectionStep() {
    return (
      <View style={styles.stepContentFull}>
        <Text style={styles.heading}>
          {'어떤 자산이\n궁금하세요?'}
        </Text>

        {/* 검색바 */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#757575" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="삼성전자, 비트코인..."
            placeholderTextColor="#757575"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {/* 라벨 */}
        <Text style={styles.sectionLabel}>
          {searchQuery.trim().length > 0 ? '검색 결과' : '인기 자산'}
        </Text>

        {/* 자산 칩 목록 */}
        <ScrollView
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {displayedAssets.length > 0 ? (
            <View style={styles.chipsWrap}>
              {displayedAssets.map((asset) => {
                const isSelected = selectedAssets.has(asset.ticker);
                return (
                  <TouchableOpacity
                    key={asset.ticker}
                    style={[
                      styles.chip,
                      isSelected ? styles.chipSelected : styles.chipUnselected,
                    ]}
                    onPress={() => handleToggle(asset.ticker)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected
                          ? styles.chipTextSelected
                          : styles.chipTextUnselected,
                      ]}
                    >
                      {asset.name}
                    </Text>
                    {isSelected && <Text style={styles.chipHeart}>{' \u2764\uFE0F'}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noResult}>검색 결과가 없습니다</Text>
          )}
        </ScrollView>

        {/* 선택 카운트 */}
        {selectedCount > 0 && (
          <Text style={styles.countText}>
            {`${selectedCount}개 선택했어요`}
          </Text>
        )}
      </View>
    );
  }

  // 슬라이드 5: 시작
  function renderStartStep() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.startEmoji}>{'🚀'}</Text>
        <Text style={styles.heading}>
          {'준비 완료!\n지금 시작하세요'}
        </Text>
        <Text style={styles.subheading}>
          {'매일 5분 투자로\n당신의 투자 기준을 만들어보세요.'}
        </Text>

        {/* 선택 요약 */}
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
          {selectedCount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>관심 자산</Text>
              <Text style={styles.summaryValue}>{selectedCount}개</Text>
            </View>
          )}
          {!investorLevel && !investmentGoal && selectedCount === 0 && (
            <Text style={styles.summaryEmpty}>
              나중에 설정에서 변경할 수 있어요
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
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
    </View>
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

  // 섹션 라벨
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B0B0B0',
    marginBottom: 12,
  },

  // 칩 스크롤 영역
  chipsScroll: {
    flex: 1,
  },
  chipsContainer: {
    paddingBottom: 16,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // 칩 공통
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 4,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipUnselected: {
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: '#B0B0B0',
  },
  chipHeart: {
    fontSize: 13,
  },

  // 검색 결과 없음
  noResult: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 40,
  },

  // 선택 카운트
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 8,
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
});
