/**
 * premium.tsx - 프리미엄 페이월 화면
 *
 * 역할: "프리미엄 구독 관리 + 결제 화면"
 * - react-native-iap 연동 (Apple IAP)
 * - 프리미엄 혜택 목록: 무제한 딥다이브, 광고 제거, 독점 분석
 * - 월간/연간 구독 옵션 UI
 * - 구매 로직 기본 구조 (실제 결제는 나중에 연동)
 * - 다크모드 지원 (useTheme)
 *
 * [진입점]
 * - 설정 > 프리미엄
 * - CreditGate / PremiumPaywall 모달에서 "자세히 보기"
 * - CrisisBanner 터치 시 (위기 분석 잠금 해제)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSubscriptionStatus, useActivateTrial } from '../../src/hooks/useSubscription';
import {
  connectToStore,
  disconnectFromStore,
  isExpoGo,
} from '../../src/services/appleIAP';

// ============================================================================
// 구독 상품 정보 (App Store Connect에 등록 필요)
// ============================================================================

const SUBSCRIPTION_PRODUCTS = {
  monthly: {
    id: 'com.smartrebalancer.app.premium.monthly',
    label: '월간 구독',
    price: 4900,
    priceLabel: '\u20A94,900',
    period: '/월',
    dailyCost: '\u20A9163',
  },
  yearly: {
    id: 'com.smartrebalancer.app.premium.yearly',
    label: '연간 구독',
    price: 39900,
    priceLabel: '\u20A939,900',
    period: '/년',
    monthlyEquiv: '\u20A93,325/월',
    discount: '32%',
    dailyCost: '\u20A9109',
  },
};

// ============================================================================
// 프리미엄 혜택 목록
// ============================================================================

interface PremiumBenefit {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tag?: string;
}

const PREMIUM_BENEFITS: PremiumBenefit[] = [
  {
    icon: 'search-outline',
    title: '무제한 딥다이브 분석',
    description: '종목별 AI 정밀 분석을 제한 없이 이용하세요. 밸류에이션, 기술적 분석, 펀더멘털 진단을 포함합니다.',
    tag: '인기',
  },
  {
    icon: 'eye-off-outline',
    title: '광고 제거',
    description: '앱 내 모든 광고가 사라집니다. 순수한 투자 경험에 집중하세요.',
  },
  {
    icon: 'bar-chart-outline',
    title: '독점 분석 리포트',
    description: '기관 투자자 행동, 외국인 수급 동향 등 프리미엄 전용 분석 데이터를 제공합니다.',
    tag: '독점',
  },
  {
    icon: 'layers-outline',
    title: '맥락 카드 4겹 전체',
    description: '역사적 맥락, 거시경제 체인, 기관 행동, 포트폴리오 영향도까지 모든 레이어를 확인합니다.',
  },
  {
    icon: 'today-outline',
    title: 'AI 진단 3회/일',
    description: '무료 유저 1회에서 Premium 3회로 확장. 매일 포트폴리오를 점검합니다.',
  },
  {
    icon: 'gift-outline',
    title: '매월 30 크레딧 보너스',
    description: '매월 30C (\u20A93,000 상당) 자동 지급. Deep Dive 6회분에 해당합니다.',
  },
  {
    icon: 'school-outline',
    title: '예측 해설 + 복기',
    description: '적중/오답 이유를 AI가 해설합니다. 투자 감각을 키우는 최고의 도구입니다.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Panic Shield Pro',
    description: '시장 위기 시 개인화된 맥락 알림과 행동 가이드를 즉시 받습니다.',
  },
];

// ============================================================================
// 선택된 플랜 타입
// ============================================================================

type PlanType = 'monthly' | 'yearly';

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PremiumScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { mediumTap, heavyTap } = useHaptics();
  const {
    isPremium,
    isTrialActive,
    isTrialExpired,
    trialDaysLeft,
    isLoading: subscriptionLoading,
  } = useSubscriptionStatus();
  const activateTrial = useActivateTrial();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [storeConnected, setStoreConnected] = useState(false);

  // ── IAP 스토어 연결 ──
  useEffect(() => {
    let mounted = true;

    const initStore = async () => {
      if (isExpoGo()) {
        if (__DEV__) console.log('[Premium] Expo Go 환경 — IAP 스킵');
        return;
      }

      const connected = await connectToStore();
      if (mounted) {
        setStoreConnected(connected);
      }
    };

    initStore();

    return () => {
      mounted = false;
      disconnectFromStore();
    };
  }, []);

  // ── 무료 체험 시작 ──
  const handleStartTrial = useCallback(() => {
    heavyTap();
    Alert.alert(
      '무료 체험 시작',
      '30일간 모든 Premium 기능을 무료로 이용하시겠습니까?\n\n결제 정보가 필요하지 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '체험 시작',
          onPress: async () => {
            const result = await activateTrial.mutateAsync();
            if (result.success) {
              Alert.alert(
                '체험 활성화 완료!',
                'Premium이 활성화되었습니다.\n30일간 모든 기능을 무료로 이용하세요.',
                [{ text: '확인', onPress: () => router.back() }]
              );
            } else {
              Alert.alert('알림', result.error || '활성화에 실패했습니다.');
            }
          },
        },
      ]
    );
  }, [heavyTap, activateTrial, router]);

  // ── 구매 실행 (placeholder) ──
  const handlePurchase = useCallback(async () => {
    heavyTap();
    setIsPurchasing(true);

    try {
      const product = SUBSCRIPTION_PRODUCTS[selectedPlan];

      if (isExpoGo()) {
        Alert.alert(
          '개발 모드',
          `${product.label} (${product.priceLabel}${product.period})\n\nExpo Go에서는 실제 결제가 불가합니다.\n빌드 앱에서 테스트하세요.`,
        );
        return;
      }

      if (!storeConnected) {
        Alert.alert('연결 오류', 'App Store 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      // TODO: 실제 IAP 구매 로직 연동
      // await purchaseProduct(product.id);
      Alert.alert(
        '결제 준비 중',
        `${product.label} (${product.priceLabel}${product.period})\n\n인앱 결제 시스템을 준비 중입니다.\n곧 서비스가 시작됩니다!`,
      );
    } catch (err) {
      console.error('[Premium] 구매 실패:', err);
      Alert.alert('구매 실패', '결제 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsPurchasing(false);
    }
  }, [heavyTap, selectedPlan, storeConnected]);

  // ── 이미 프리미엄인 경우 ──
  if (!subscriptionLoading && isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => { mediumTap(); router.back(); }} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.premium.gold }]}>Premium</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.activeSection}>
          <Text style={styles.activeEmoji}>{'\u2728'}</Text>
          <Text style={[styles.activeTitle, { color: colors.premium.gold }]}>
            Premium 활성 중
          </Text>
          {isTrialActive && (
            <Text style={[styles.activeSubtitle, { color: colors.textSecondary }]}>
              무료 체험 D-{trialDaysLeft} 남음
            </Text>
          )}
          <Text style={[styles.activeDesc, { color: colors.textTertiary }]}>
            모든 프리미엄 기능을 이용 중입니다
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── 로딩 ──
  if (subscriptionLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => { mediumTap(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.premium.gold }]}>Premium</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 히어로 섹션 */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[colors.premium.gold + '30', colors.premium.gold + '00']}
            style={styles.heroGlow}
          />
          <Text style={styles.heroEmoji}>
            {isTrialExpired ? '\u{1F512}' : '\u{1F31F}'}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            {isTrialExpired ? '프리미엄을 다시 시작하세요' : '투자 감각을 업그레이드'}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            매일 5분, 더 깊은 투자 인사이트
          </Text>
        </View>

        {/* 구독 플랜 선택 */}
        <View style={styles.planSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>구독 플랜 선택</Text>

          {/* 연간 플랜 (추천) */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                borderColor: selectedPlan === 'yearly' ? colors.premium.gold : colors.border,
                backgroundColor: selectedPlan === 'yearly'
                  ? colors.premium.gold + '0D'
                  : colors.surface,
              },
            ]}
            onPress={() => { mediumTap(); setSelectedPlan('yearly'); }}
            activeOpacity={0.8}
          >
            {/* 추천 배지 */}
            <View style={[styles.recommendBadge, { backgroundColor: colors.premium.gold }]}>
              <Text style={styles.recommendBadgeText}>BEST VALUE</Text>
            </View>
            <View style={styles.planContent}>
              <View style={styles.planLeft}>
                <View style={[
                  styles.radioOuter,
                  { borderColor: selectedPlan === 'yearly' ? colors.premium.gold : colors.border },
                ]}>
                  {selectedPlan === 'yearly' && (
                    <View style={[styles.radioInner, { backgroundColor: colors.premium.gold }]} />
                  )}
                </View>
                <View>
                  <Text style={[styles.planName, { color: colors.textPrimary }]}>
                    {SUBSCRIPTION_PRODUCTS.yearly.label}
                  </Text>
                  <Text style={[styles.planDiscount, { color: colors.premium.gold }]}>
                    {SUBSCRIPTION_PRODUCTS.yearly.monthlyEquiv} {'\u00B7'} {SUBSCRIPTION_PRODUCTS.yearly.discount} 할인
                  </Text>
                </View>
              </View>
              <View style={styles.planRight}>
                <Text style={[styles.planPrice, { color: colors.textPrimary }]}>
                  {SUBSCRIPTION_PRODUCTS.yearly.priceLabel}
                </Text>
                <Text style={[styles.planPeriod, { color: colors.textTertiary }]}>
                  {SUBSCRIPTION_PRODUCTS.yearly.period}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 월간 플랜 */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                borderColor: selectedPlan === 'monthly' ? colors.premium.gold : colors.border,
                backgroundColor: selectedPlan === 'monthly'
                  ? colors.premium.gold + '0D'
                  : colors.surface,
              },
            ]}
            onPress={() => { mediumTap(); setSelectedPlan('monthly'); }}
            activeOpacity={0.8}
          >
            <View style={styles.planContent}>
              <View style={styles.planLeft}>
                <View style={[
                  styles.radioOuter,
                  { borderColor: selectedPlan === 'monthly' ? colors.premium.gold : colors.border },
                ]}>
                  {selectedPlan === 'monthly' && (
                    <View style={[styles.radioInner, { backgroundColor: colors.premium.gold }]} />
                  )}
                </View>
                <View>
                  <Text style={[styles.planName, { color: colors.textPrimary }]}>
                    {SUBSCRIPTION_PRODUCTS.monthly.label}
                  </Text>
                  <Text style={[styles.planSubtext, { color: colors.textTertiary }]}>
                    하루 약 {SUBSCRIPTION_PRODUCTS.monthly.dailyCost}
                  </Text>
                </View>
              </View>
              <View style={styles.planRight}>
                <Text style={[styles.planPrice, { color: colors.textPrimary }]}>
                  {SUBSCRIPTION_PRODUCTS.monthly.priceLabel}
                </Text>
                <Text style={[styles.planPeriod, { color: colors.textTertiary }]}>
                  {SUBSCRIPTION_PRODUCTS.monthly.period}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA 버튼 */}
        <TouchableOpacity
          style={[styles.ctaButton, { opacity: isPurchasing ? 0.7 : 1 }]}
          onPress={handlePurchase}
          activeOpacity={0.8}
          disabled={isPurchasing}
        >
          <LinearGradient
            colors={[colors.premium.gold, '#D4A017']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <>
                <Text style={styles.ctaText}>
                  {SUBSCRIPTION_PRODUCTS[selectedPlan].priceLabel}{SUBSCRIPTION_PRODUCTS[selectedPlan].period} 구독하기
                </Text>
                <Text style={styles.ctaSubtext}>언제든 해지 가능</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* 무료 체험 (체험 전인 경우) */}
        {!isTrialExpired && (
          <TouchableOpacity
            style={[styles.trialButton, { borderColor: colors.border }]}
            onPress={handleStartTrial}
            activeOpacity={0.8}
            disabled={activateTrial.isPending}
          >
            {activateTrial.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.trialText, { color: colors.primary }]}>
                  30일 무료 체험 시작하기
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* 혜택 목록 */}
        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Premium 혜택
          </Text>
          {PREMIUM_BENEFITS.map((benefit, idx) => (
            <View
              key={idx}
              style={[styles.benefitItem, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.benefitIcon, { backgroundColor: colors.premium.gold + '1A' }]}>
                <Ionicons name={benefit.icon} size={22} color={colors.premium.gold} />
              </View>
              <View style={styles.benefitTextWrap}>
                <View style={styles.benefitTitleRow}>
                  <Text style={[styles.benefitTitle, { color: colors.textPrimary }]}>
                    {benefit.title}
                  </Text>
                  {benefit.tag && (
                    <View style={[styles.benefitTag, { backgroundColor: colors.premium.gold + '20' }]}>
                      <Text style={[styles.benefitTagText, { color: colors.premium.gold }]}>
                        {benefit.tag}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.benefitDesc, { color: colors.textTertiary }]}>
                  {benefit.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 면책 조항 */}
        <View style={[styles.disclaimerSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.disclaimerTitle, { color: colors.textTertiary }]}>
            안내사항
          </Text>
          <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
            {'\u2022'} iTunes 계정으로 결제되며, 구독 기간 종료 24시간 전에 자동 갱신됩니다.{'\n'}
            {'\u2022'} 설정 {'>'} 구독에서 언제든 해지할 수 있습니다.{'\n'}
            {'\u2022'} 무료 체험 기간 종료 후 자동 결제되지 않습니다.{'\n'}
            {'\u2022'} 본 앱의 분석 정보는 투자 참고용이며, 투자 권유가 아닙니다. 투자 결정은 본인의 판단과 전문가 상담에 따라 이루어져야 합니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 헤더
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },

  // 히어로
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },

  // 플랜 선택
  planSection: {
    marginBottom: 20,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  recommendBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  recommendBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  planContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
  },
  planDiscount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  planSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  planPeriod: {
    fontSize: 12,
    fontWeight: '500',
  },

  // CTA 버튼
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  ctaSubtext: {
    fontSize: 11,
    color: 'rgba(26,26,26,0.6)',
    marginTop: 2,
  },

  // 무료 체험 버튼
  trialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 28,
  },
  trialText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // 혜택 목록
  benefitsSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  benefitTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  benefitTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  benefitDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },

  // 면책
  disclaimerSection: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 18,
  },

  // 활성 상태 화면
  activeSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  activeEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  activeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  activeDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
});
