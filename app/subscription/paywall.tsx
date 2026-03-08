/**
 * Paywall - 프리미엄 구독 페이지
 *
 * 3가지 상태에 따라 다른 화면 표시:
 * A. 체험 전 (신규) → "1개월 무료 체험 시작" CTA
 * B. 체험 중 → "D-XX 남음" 카운트다운 + "지금 구독하기"
 * C. 체험 만료 → "체험 종료" 안내 + "구독하고 계속 이용하기"
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSubscriptionStatus, useActivateTrial } from '../../src/hooks/useSubscription';
import { isFreePeriod, getFreePeriodDaysLeft } from '../../src/config/freePeriod';
import { useStreakData } from '../../src/hooks/useStreak';
import { useTheme } from '../../src/hooks/useTheme';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import { useTrackEvent } from '../../src/hooks/useAnalytics';
import { useABExperiment } from '../../src/hooks/useABExperiment';
import { CREDIT_TO_KRW, getLocaleCode, getCurrencySymbol } from '../../src/utils/formatters';
import { useLocale } from '../../src/context/LocaleContext';
import { SUBSCRIPTION_PRODUCTS } from '../../src/types/marketplace';
import {
  purchaseSubscription,
  isExpoGo,
  isUserCancelledError,
  connectToStore,
  setupPurchaseListeners,
  completePurchase,
  type Purchase,
  type PurchaseError,
} from '../../src/services/appleIAP';

// 가격 정보 — getCurrencySymbol()은 런타임 호출이므로 함수로 래핑
function getPricing() {
  const sym = getCurrencySymbol();
  return {
    monthly: { price: `${sym}2,900`, periodKey: 'paywall.perMonth', tKey: 'paywall.monthlyPlan' },
    yearly: { price: `${sym}24,900`, periodKey: 'paywall.perYear', tKey: 'paywall.yearlyPlan', monthlyEquiv: `${sym}2,075`, discountKey: 'paywall.yearlyDiscount' },
  };
}

const BENEFIT_KEYS = [
  { icon: 'today' as const, titleKey: 'paywall.benefit.aiDiag.title', descKey: 'paywall.benefit.aiDiag.desc' },
  { icon: 'stats-chart' as const, titleKey: 'paywall.benefit.contextCard.title', descKey: 'paywall.benefit.contextCard.desc' },
  { icon: 'flame' as const, titleKey: 'paywall.benefit.streak.title', descKey: 'paywall.benefit.streak.desc' },
  { icon: 'gift' as const, titleKey: 'paywall.benefit.bonus.title', descKey: 'paywall.benefit.bonus.desc' },
  { icon: 'flash' as const, titleKey: 'paywall.benefit.rebalance.title', descKey: 'paywall.benefit.rebalance.desc' },
  { icon: 'shield-checkmark' as const, titleKey: 'paywall.benefit.panicShield.title', descKey: 'paywall.benefit.panicShield.desc' },
  { icon: 'chatbubbles' as const, titleKey: 'paywall.benefit.aiChat.title', descKey: 'paywall.benefit.aiChat.desc' },
  { icon: 'people' as const, titleKey: 'paywall.benefit.vipLounge.title', descKey: 'paywall.benefit.vipLounge.desc' },
  { icon: 'document-text' as const, titleKey: 'paywall.benefit.taxReport.title', descKey: 'paywall.benefit.taxReport.desc' },
];

const MONTHLY_PRICE_KRW = 2900;

type CreditSpendRow = {
  amount: number;
  feature_type: string | null;
  type: string;
};

interface ValueProofSummary {
  spendEvents30d: number;
  spendCredits30d: number;
  inferredKrwValue: number;
  topFeature: string | null;
  generatedAt: string;
}

const EMPTY_VALUE_PROOF: ValueProofSummary = {
  spendEvents30d: 0,
  spendCredits30d: 0,
  inferredKrwValue: 0,
  topFeature: null,
  generatedAt: new Date().toISOString(),
};

const FEATURE_LABEL_KEYS: Record<string, string> = {
  deep_dive: 'paywall.feature.deepDive',
  what_if: 'paywall.feature.whatIf',
  tax_report: 'paywall.feature.taxReport',
  ai_cfo_chat: 'paywall.feature.aiChat',
};

function formatMetaTime(iso: string): string {
  return new Date(iso).toLocaleString(getLocaleCode(), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PaywallScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { mediumTap, heavyTap } = useHaptics();
  const track = useTrackEvent();
  const freePeriodActive = isFreePeriod();
  const PRICING = getPricing();
  const { experimentId, variant, isActive: isExperimentActive } = useABExperiment('subscription_paywall');
  const isValueFirstVariant = isExperimentActive && variant === 'value_first';
  const {
    isPremium,
    isTrialActive,
    isTrialExpired,
    trialDaysLeft,
    isLoading,
  } = useSubscriptionStatus();
  const activateTrial = useActivateTrial();
  const { currentStreak } = useStreakData();
  const hasTrackedViewRef = useRef(false);
  const hasTrackedValueProofRef = useRef(false);

  const { data: valueProof = EMPTY_VALUE_PROOF, isLoading: valueProofLoading } = useQuery({
    queryKey: ['paywall', 'value-proof-30d'],
    enabled: !freePeriodActive,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<ValueProofSummary> => {
      const user = await getCurrentUser();
      if (!user) return { ...EMPTY_VALUE_PROOF, generatedAt: new Date().toISOString() };

      const from = new Date();
      from.setDate(from.getDate() - 30);

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('amount, feature_type, type')
        .eq('user_id', user.id)
        .eq('type', 'spend')
        .gte('created_at', from.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116') {
          return { ...EMPTY_VALUE_PROOF, generatedAt: new Date().toISOString() };
        }
        throw error;
      }

      const spendRows = (data ?? []) as CreditSpendRow[];
      const spendCredits30d = Math.abs(
        spendRows.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0)
      );

      const featureUsage = spendRows.reduce<Record<string, number>>((acc, row) => {
        const key = row.feature_type ?? 'unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      let topFeature: string | null = null;
      let topFeatureCount = 0;
      Object.entries(featureUsage).forEach(([feature, count]) => {
        if (count > topFeatureCount) {
          topFeature = feature;
          topFeatureCount = count;
        }
      });

      return {
        spendEvents30d: spendRows.length,
        spendCredits30d,
        inferredKrwValue: spendCredits30d * CREDIT_TO_KRW,
        topFeature,
        generatedAt: new Date().toISOString(),
      };
    },
  });

  const valueProofTopFeatureLabel = useMemo(() => {
    if (!valueProof.topFeature) return null;
    const key = FEATURE_LABEL_KEYS[valueProof.topFeature];
    return key ? t(key) : t('paywall.feature.aiAnalysis');
  }, [valueProof.topFeature, t]);

  const valueProofNetGainKrw = useMemo(() => {
    return valueProof.inferredKrwValue - MONTHLY_PRICE_KRW;
  }, [valueProof.inferredKrwValue]);

  // IAP 구매 리스너 — 구독 성공 시 프로필 업데이트
  useEffect(() => {
    if (freePeriodActive) return; // 무료 기간 중에는 리스너 불필요

    const handlePurchaseSuccess = async (purchase: Purchase) => {
      try {
        // 1. Apple에 트랜잭션 완료 전송
        await completePurchase(purchase);

        // 2. Supabase 프로필에 premium 상태 업데이트
        const user = await getCurrentUser();
        if (user) {
          const expiresAt = new Date();
          // 구매한 상품 ID로 기간 결정
          const isYearly = purchase.productId?.includes('yearly');
          if (isYearly) {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
          }

          await supabase
            .from('profiles')
            .update({
              plan_type: 'premium',
              premium_expires_at: expiresAt.toISOString(),
            })
            .eq('id', user.id);
        }

        track('paywall_purchase_success', { productId: purchase.productId ?? 'unknown' });
        Alert.alert(
          t('paywall.alert.premiumActivated'),
          t('paywall.alert.premiumActivatedMessage'),
          [{ text: t('common.confirm'), onPress: () => router.back() }]
        );
      } catch (err) {
        console.warn('[Paywall] 구매 처리 에러:', err);
      }
    };

    const handlePurchaseError = (error: PurchaseError) => {
      // 사용자 취소는 에러 아님
      if (isUserCancelledError(error)) return;
      track('paywall_purchase_listener_error', { code: error.code, message: error.message });
    };

    const listeners = setupPurchaseListeners(handlePurchaseSuccess, handlePurchaseError);
    return () => listeners.remove();
  }, [freePeriodActive, track, router, t]);

  useEffect(() => {
    if (isLoading || hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;

    track('paywall_viewed', {
      state: isTrialActive ? 'trial_active' : isTrialExpired ? 'trial_expired' : 'new_user',
      is_premium: isPremium,
      free_period_active: freePeriodActive,
      experiment_id: experimentId,
      variant: variant ?? 'none',
    });
  }, [
    isLoading,
    isPremium,
    isTrialActive,
    isTrialExpired,
    freePeriodActive,
    experimentId,
    variant,
    track,
  ]);

  useEffect(() => {
    if (freePeriodActive || valueProofLoading || hasTrackedValueProofRef.current) return;
    hasTrackedValueProofRef.current = true;
    track('paywall_value_proof_loaded', {
      spend_events_30d: valueProof.spendEvents30d,
      spend_credits_30d: valueProof.spendCredits30d,
      inferred_krw_value: valueProof.inferredKrwValue,
      top_feature: valueProof.topFeature,
    });
  }, [freePeriodActive, valueProofLoading, valueProof, track]);

  // 무료 체험 시작 핸들러
  const handleActivateTrial = () => {
    heavyTap();
    track('paywall_trial_start_clicked', {
      experiment_id: experimentId,
      variant: variant ?? 'none',
    });
    Alert.alert(
      t('paywall.alert.trialStartTitle'),
      t('paywall.alert.trialStartMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('paywall.alert.startTrial'),
          onPress: async () => {
            const result = await activateTrial.mutateAsync();
            if (result.success) {
              track('paywall_trial_activated', {
                experiment_id: experimentId,
                variant: variant ?? 'none',
              });
              Alert.alert(
                t('paywall.alert.trialActivated'),
                t('paywall.alert.trialActivatedMessage'),
                [{ text: t('common.confirm'), onPress: () => router.back() }]
              );
            } else {
              track('paywall_trial_activation_failed', {
                error: result.error,
              });
              Alert.alert(t('paywall.alert.notice'), result.error || t('paywall.alert.activationFailed'));
            }
          },
        },
      ]
    );
  };

  // IAP 구독 구매 핸들러
  const handleSubscribe = async (period: 'monthly' | 'yearly') => {
    heavyTap();
    track('paywall_plan_selected', {
      period,
      experiment_id: experimentId,
      variant: variant ?? 'none',
      state: isTrialActive ? 'trial_active' : isTrialExpired ? 'trial_expired' : 'new_user',
    });

    // 무료 기간 중 → 구매 불필요 안내
    if (freePeriodActive) {
      track('paywall_subscribe_blocked_free_period', { period });
      Alert.alert(
        t('paywall.alert.freePeriodTitle'),
        t('paywall.alert.freePeriodMessage'),
        [{ text: t('common.confirm') }]
      );
      return;
    }

    // Expo Go 환경 → IAP 불가 안내
    if (isExpoGo()) {
      Alert.alert(t('paywall.alert.devMode'), t('paywall.alert.devModeMessage'));
      return;
    }

    // 실제 IAP 구독 구매 요청
    const product = SUBSCRIPTION_PRODUCTS[period];
    track('paywall_purchase_intent', { period, productId: product.appleProductId });

    try {
      await connectToStore();
      await purchaseSubscription(product.appleProductId);
      // 구매 결과는 purchaseUpdatedListener에서 처리됨
    } catch (err: unknown) {
      track('paywall_purchase_error', { period, error: (err instanceof Error ? err.message : undefined) ?? 'unknown' });
      Alert.alert(
        t('paywall.alert.subscribeError'),
        t('paywall.alert.subscribeErrorMessage'),
      );
    }
  };

  // 로딩 중 표시
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── 무료 기간 축하 모드 ───
  if (freePeriodActive) {
    const daysLeft = getFreePeriodDaysLeft();
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 닫기 버튼 */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              mediumTap();
              router.back();
            }}
          >
            <Ionicons name="close" size={24} color="#888888" />
          </TouchableOpacity>

          {/* 축하 히어로 */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={['rgba(76, 175, 80, 0.3)', 'rgba(76, 175, 80, 0)']}
              style={styles.heroGlow}
            />
            <Text style={styles.heroEmoji}>{'🎉'}</Text>
            <Text style={styles.heroTitle}>{t('paywall.freeHeroTitle')}</Text>
            <Text style={styles.heroSubtitle}>
              {t('paywall.freeHeroSubtitle').replace('{{daysLeft}}', String(daysLeft))}
            </Text>
          </View>

          {/* 크레딧 적립 안내 */}
          <View style={styles.creditInfo}>
            <Text style={styles.creditInfoTitle}>{t('paywall.freeCreditTitle')}</Text>
            <Text style={styles.creditInfoDesc}>
              {t('paywall.freeCreditDesc')}
            </Text>
          </View>

          {/* 혜택 목록 (어떤 기능이 있는지 보여줌) */}
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>{t('paywall.availableFeatures')}</Text>
            {BENEFIT_KEYS.map((benefit, idx) => (
              <View key={idx} style={styles.benefitItem}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={benefit.icon} size={20} color="#4CAF50" />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{t(benefit.titleKey)}</Text>
                  <Text style={styles.benefitDesc}>{t(benefit.descKey)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA: 무료로 이용하기 */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => {
              heavyTap();
              router.back();
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{t('paywall.freeCtaText')}</Text>
              <Text style={styles.ctaSubtext}>{t('paywall.freeCtaSubtext')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.legalText}>
            {t('paywall.freeLegalText')}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 닫기 버튼 */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            mediumTap();
            router.back();
          }}
        >
          <Ionicons name="close" size={24} color="#888888" />
        </TouchableOpacity>

        {/* 상태별 상단 배너 */}
        {isTrialActive && (
          <View style={styles.statusBanner}>
            <LinearGradient
              colors={['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)']}
              style={styles.statusBannerGradient}
            >
              <Ionicons name="time-outline" size={18} color="#4CAF50" />
              <Text style={styles.statusBannerText}>
                {t('paywall.trialBanner')} <Text style={styles.statusBannerHighlight}>D-{trialDaysLeft}</Text> {t('paywall.remaining')}
              </Text>
            </LinearGradient>
          </View>
        )}

        {isTrialExpired && (
          <View style={styles.statusBanner}>
            <LinearGradient
              colors={['rgba(207, 102, 121, 0.15)', 'rgba(207, 102, 121, 0.05)']}
              style={styles.statusBannerGradient}
            >
              <Ionicons name="alert-circle-outline" size={18} color="#CF6679" />
              <Text style={[styles.statusBannerText, { color: '#CF6679' }]}>
                {t('paywall.trialExpiredBanner')}
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* 히어로 섹션 */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['rgba(76, 175, 80, 0.3)', 'rgba(76, 175, 80, 0)']}
            style={styles.heroGlow}
          />
          <Text style={styles.heroEmoji}>
            {isTrialActive ? '⏱️' : isTrialExpired ? '🔒' : '✨'}
          </Text>
          <Text style={styles.heroTitle}>
            {isTrialExpired
              ? t('paywall.heroTitle.expired')
              : isValueFirstVariant
              ? t('paywall.heroTitle.valueFirst')
              : t('paywall.heroTitle.default')}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isTrialActive
              ? t('paywall.heroSubtitle.trial').replace('{{daysLeft}}', String(trialDaysLeft))
              : isTrialExpired
              ? t('paywall.heroSubtitle.expired')
              : isValueFirstVariant
              ? t('paywall.heroSubtitle.valueFirst')
              : t('paywall.heroSubtitle.default')}
          </Text>
          {isExperimentActive && (
            <View style={styles.experimentBadge}>
              <Text style={styles.experimentBadgeText}>
                {t('paywall.experimentBadge')}: {variant === 'value_first' ? t('paywall.experimentValueFirst') : t('paywall.experimentDefault')}
              </Text>
            </View>
          )}
        </View>

        {isValueFirstVariant && (
          <View style={styles.valueProofCard}>
            <Text style={styles.valueProofTitle}>{t('paywall.valueProofTitle')}</Text>

            {valueProofLoading ? (
              <View style={styles.valueProofLoadingRow}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.valueProofSecondary}>{t('paywall.valueProofLoading')}</Text>
              </View>
            ) : valueProof.spendEvents30d > 0 ? (
              <>
                <Text style={styles.valueProofPrimary}>
                  {t('paywall.valueProofUsage').replace('{{count}}', String(valueProof.spendEvents30d)).replace('{{value}}', valueProof.inferredKrwValue.toLocaleString())}
                </Text>
                <Text style={[styles.valueProofSecondary, valueProofNetGainKrw >= 0 ? styles.valueProofGain : styles.valueProofLoss]}>
                  {valueProofNetGainKrw >= 0
                    ? t('paywall.valueProofSaving').replace('{{amount}}', valueProofNetGainKrw.toLocaleString())
                    : t('paywall.valueProofRemaining').replace('{{amount}}', Math.abs(valueProofNetGainKrw).toLocaleString())}
                </Text>
              </>
            ) : (
              <Text style={styles.valueProofSecondary}>
                {t('paywall.valueProofNoData')}
              </Text>
            )}

            <View style={styles.valueProofMetaRow}>
              <Text style={styles.valueProofMeta}>{t('paywall.valueProofSource')}</Text>
              <Text style={styles.valueProofMeta}>{t('paywall.valueProofGenerated')}: {formatMetaTime(valueProof.generatedAt)}</Text>
            </View>
            {valueProofTopFeatureLabel && (
              <Text style={styles.valueProofMeta}>{t('paywall.valueProofTopFeature')}: {valueProofTopFeatureLabel}</Text>
            )}
          </View>
        )}

        {/* 가격 카드 */}
        <View style={styles.pricingSection}>
          {/* 월간 */}
          <TouchableOpacity
            style={styles.pricingCard}
            onPress={() => handleSubscribe('monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.pricingCardInner}>
              <View>
                <Text style={styles.pricingLabel}>{t(PRICING.monthly.tKey)}</Text>
                <View style={styles.pricingPriceRow}>
                  <Text style={styles.pricingPrice}>{PRICING.monthly.price}</Text>
                  <Text style={styles.pricingPeriod}>{t(PRICING.monthly.periodKey)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          {/* 연간 (추천) */}
          <TouchableOpacity
            style={[styles.pricingCard, styles.pricingCardRecommended]}
            onPress={() => handleSubscribe('yearly')}
            activeOpacity={0.8}
          >
            <View style={styles.recommendBadge}>
              <Text style={styles.recommendBadgeText}>BEST VALUE</Text>
            </View>
            <View style={styles.pricingCardInner}>
              <View>
                <Text style={styles.pricingLabel}>{t(PRICING.yearly.tKey)}</Text>
                <View style={styles.pricingPriceRow}>
                  <Text style={styles.pricingPrice}>{PRICING.yearly.price}</Text>
                  <Text style={styles.pricingPeriod}>{t(PRICING.yearly.periodKey)}</Text>
                </View>
                <Text style={styles.pricingDiscount}>
                  {PRICING.yearly.monthlyEquiv}{t('paywall.perMonth')} · {t(PRICING.yearly.discountKey)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 혜택 목록 */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>{t('paywall.premiumBenefits')}</Text>
          {BENEFIT_KEYS.map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <View style={styles.benefitIconWrap}>
                <Ionicons name={benefit.icon} size={20} color="#4CAF50" />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{t(benefit.titleKey)}</Text>
                <Text style={styles.benefitDesc}>{t(benefit.descKey)}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isValueFirstVariant && (
          <View style={styles.valueProofCard}>
            <Text style={styles.valueProofTitle}>{t('paywall.valueProofTitle')}</Text>

            {valueProofLoading ? (
              <View style={styles.valueProofLoadingRow}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.valueProofSecondary}>{t('paywall.valueProofLoading')}</Text>
              </View>
            ) : valueProof.spendEvents30d > 0 ? (
              <>
                <Text style={styles.valueProofPrimary}>
                  {t('paywall.valueProofUsage').replace('{{count}}', String(valueProof.spendEvents30d)).replace('{{value}}', valueProof.inferredKrwValue.toLocaleString())}
                </Text>
                <Text style={[styles.valueProofSecondary, valueProofNetGainKrw >= 0 ? styles.valueProofGain : styles.valueProofLoss]}>
                  {valueProofNetGainKrw >= 0
                    ? t('paywall.valueProofSaving').replace('{{amount}}', valueProofNetGainKrw.toLocaleString())
                    : t('paywall.valueProofRemaining').replace('{{amount}}', Math.abs(valueProofNetGainKrw).toLocaleString())}
                </Text>
              </>
            ) : (
              <Text style={styles.valueProofSecondary}>
                {t('paywall.valueProofNoData')}
              </Text>
            )}

            <View style={styles.valueProofMetaRow}>
              <Text style={styles.valueProofMeta}>{t('paywall.valueProofSource')}</Text>
              <Text style={styles.valueProofMeta}>{t('paywall.valueProofGenerated')}: {formatMetaTime(valueProof.generatedAt)}</Text>
            </View>
            {valueProofTopFeatureLabel && (
              <Text style={styles.valueProofMeta}>{t('paywall.valueProofTopFeature')}: {valueProofTopFeatureLabel}</Text>
            )}
          </View>
        )}

        {/* CTA 버튼 */}
        {!isTrialActive && !isTrialExpired && (
          /* A. 체험 전 → 무료 체험 시작 */
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleActivateTrial}
            activeOpacity={0.8}
            disabled={activateTrial.isPending}
          >
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {activateTrial.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.ctaText}>{t('paywall.ctaTrialStart')}</Text>
                  <Text style={styles.ctaSubtext}>{t('paywall.ctaTrialSubtext')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isTrialActive && (
          /* B. 체험 중 → 지금 구독하기 */
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => handleSubscribe('yearly')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{t('paywall.ctaSubscribeNow')}</Text>
              <Text style={styles.ctaSubtext}>{t('paywall.ctaSubscribeNowSubtext')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isTrialExpired && (
          /* C. 체험 만료 → 구독하고 계속 이용하기 */
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => handleSubscribe('yearly')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{t('paywall.ctaSubscribeContinue')}</Text>
              <Text style={styles.ctaSubtext}>{t('paywall.ctaSubscribeContinueSubtext')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* 크레딧 안내 */}
        <View style={styles.creditInfo}>
          <Text style={styles.creditInfoTitle}>{t('paywall.creditInfoTitle')}</Text>
          <Text style={styles.creditInfoDesc}>
            {t('paywall.creditInfoDesc')}
          </Text>
        </View>

        {/* 해지 방지 메시지 (손실 회피) */}
        {(isTrialActive || isPremium) && currentStreak >= 7 && (
          <View style={styles.streakWarning}>
            <View style={styles.streakWarningHeader}>
              <Ionicons name="warning" size={18} color="#FFC107" />
              <Text style={styles.streakWarningTitle}>{t('paywall.streakWarningTitle')}</Text>
            </View>
            <Text style={styles.streakWarningText}>
              {t('paywall.streakWarningText1')} <Text style={styles.streakWarningHighlight}>{currentStreak}{t('paywall.streakWarningDays')}</Text>
              {t('paywall.streakWarningText2')}
            </Text>
          </View>
        )}

        {/* 하단 안내 */}
        <Text style={styles.legalText}>
          {t('paywall.legalText')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  // 상태 배너
  statusBanner: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
  },
  statusBannerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  statusBannerHighlight: {
    fontWeight: '900',
    fontSize: 17,
  },
  // 히어로
  heroSection: {
    alignItems: 'center',
    marginVertical: 24,
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
    fontSize: 56,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 29,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  experimentBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  experimentBadgeText: {
    fontSize: 11,
    color: '#BBBBBB',
    fontWeight: '600',
  },
  // 가격 카드
  pricingSection: {
    gap: 12,
    marginBottom: 28,
  },
  pricingCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pricingCardRecommended: {
    borderColor: 'rgba(76, 175, 80, 0.3)',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  pricingCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  recommendBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  pricingPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  pricingPrice: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pricingPeriod: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  pricingDiscount: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  // 혜택
  benefitsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  benefitDesc: {
    fontSize: 14,
    color: '#888888',
    marginTop: 2,
    lineHeight: 19,
  },
  valueProofCard: {
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.2)',
    padding: 14,
    marginBottom: 18,
    gap: 4,
  },
  valueProofTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#90CAF9',
    marginBottom: 4,
  },
  valueProofLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueProofPrimary: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 20,
  },
  valueProofSecondary: {
    fontSize: 13,
    color: '#B0BEC5',
    lineHeight: 18,
  },
  valueProofGain: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  valueProofLoss: {
    color: '#FFA726',
    fontWeight: '700',
  },
  valueProofMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  valueProofMeta: {
    fontSize: 11,
    color: '#78909C',
  },
  // CTA
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ctaSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  // 크레딧 안내
  creditInfo: {
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.1)',
  },
  creditInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 6,
    textAlign: 'center',
  },
  creditInfoDesc: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 19,
  },
  legalText: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 17,
  },
  // 해지 방지 메시지
  streakWarning: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  streakWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  streakWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFC107',
  },
  streakWarningText: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 19,
  },
  streakWarningHighlight: {
    fontWeight: '700',
    color: '#FFC107',
  },
});
