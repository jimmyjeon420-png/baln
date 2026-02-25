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
import { CREDIT_TO_KRW, getLocaleCode } from '../../src/utils/formatters';

// 가격 정보
const PRICING = {
  monthly: { price: '₩2,900', period: '/월', label: '월간 구독' },
  yearly: { price: '₩24,900', period: '/년', label: '연간 구독', monthlyEquiv: '₩2,075/월', discount: '28%' },
};

const BENEFITS = [
  {
    icon: 'today' as const,
    title: '매일 AI 진단 3회 무료',
    desc: '무료 유저 1회 → 구독자 3회. 매일 포트폴리오 체크',
  },
  {
    icon: 'stats-chart' as const,
    title: '맥락 카드 전체 4겹 분석',
    desc: '시장 변동의 "왜"를 이해 (역사/거시경제/기관행동/내 포트폴리오)',
  },
  {
    icon: 'flame' as const,
    title: '연속 기록으로 투자 습관 형성',
    desc: '매일 방문 스트릭 + 마일스톤 보상 + 패닉셀 방지',
  },
  {
    icon: 'diamond' as const,
    title: '매월 30 크레딧 보너스',
    desc: '₩3,000 가치의 크레딧 자동 지급 (Deep Dive 6회분)',
  },
  {
    icon: 'flash' as const,
    title: '실시간 리밸런싱',
    desc: '시장 변동 시 즉각적인 포트폴리오 조정 알림',
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Panic Shield Pro',
    desc: '개인화된 손절 가이드라인 & 자동 알림',
  },
  {
    icon: 'chatbubbles' as const,
    title: 'AI 버핏 티타임',
    desc: '1:1 AI 재무 상담 (메시지당 ₩100)',
  },
  {
    icon: 'people' as const,
    title: 'VIP 라운지 전체',
    desc: 'Platinum/Diamond 전용 모임 & 네트워킹',
  },
  {
    icon: 'document-text' as const,
    title: '세금 리포트',
    desc: '양도세/종합소득세 자동 계산 (₩1,000/회)',
  },
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

const FEATURE_LABEL_MAP: Record<string, string> = {
  deep_dive: 'Deep Dive',
  what_if: 'What-if',
  tax_report: '세금 리포트',
  ai_cfo_chat: 'AI 버핏 티타임',
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
  const { mediumTap, heavyTap } = useHaptics();
  const track = useTrackEvent();
  const freePeriodActive = isFreePeriod();
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
    return FEATURE_LABEL_MAP[valueProof.topFeature] ?? 'AI 분석';
  }, [valueProof.topFeature]);

  const valueProofNetGainKrw = useMemo(() => {
    return valueProof.inferredKrwValue - MONTHLY_PRICE_KRW;
  }, [valueProof.inferredKrwValue]);

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
      '무료 체험 시작',
      '30일간 모든 Premium 기능을 무료로 이용하시겠습니까?\n\n결제 정보가 필요하지 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '체험 시작',
          onPress: async () => {
            const result = await activateTrial.mutateAsync();
            if (result.success) {
              track('paywall_trial_activated', {
                experiment_id: experimentId,
                variant: variant ?? 'none',
              });
              Alert.alert(
                '체험 활성화 완료!',
                'Premium이 활성화되었습니다.\n30일간 모든 기능을 무료로 이용하세요.',
                [{ text: '확인', onPress: () => router.back() }]
              );
            } else {
              track('paywall_trial_activation_failed', {
                error: result.error,
              });
              Alert.alert('알림', result.error || '활성화에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // 유료 구독 핸들러 (placeholder)
  const handleSubscribe = (period: 'monthly' | 'yearly') => {
    heavyTap();
    track('paywall_plan_selected', {
      period,
      experiment_id: experimentId,
      variant: variant ?? 'none',
      state: isTrialActive ? 'trial_active' : isTrialExpired ? 'trial_expired' : 'new_user',
    });

    if (!freePeriodActive) {
      track('paywall_purchase_intent', {
        period,
      });
      Alert.alert(
        '구독 준비 중',
        '인앱 구독 결제 연동을 준비 중입니다.\n준비 완료 시 앱 공지로 안내드리겠습니다.'
      );
      return;
    }

    track('paywall_subscribe_blocked_free_period', { period });
    Alert.alert(
      '무료 체험 기간',
      '현재 모든 프리미엄 기능을 무료로 체험하실 수 있습니다.\n2026년 5월 31일까지 무제한 이용 가능합니다!',
      [{ text: '확인' }]
    );
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
            <Text style={styles.heroTitle}>지금 모든 기능이 무료!</Text>
            <Text style={styles.heroSubtitle}>
              D-{daysLeft} 남음 · 2026년 5월 31일까지 전 기능 무료 개방
            </Text>
          </View>

          {/* 크레딧 적립 안내 */}
          <View style={styles.creditInfo}>
            <Text style={styles.creditInfoTitle}>지금 크레딧을 적립하세요!</Text>
            <Text style={styles.creditInfoDesc}>
              매일 출석 +2 크레딧 · 공유 +3 크레딧{'\n'}
              적립한 크레딧은 6월 이후에도 사용 가능합니다
            </Text>
          </View>

          {/* 혜택 목록 (어떤 기능이 있는지 보여줌) */}
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>이용 가능한 기능</Text>
            {BENEFITS.map((benefit, idx) => (
              <View key={idx} style={styles.benefitItem}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={benefit.icon} size={20} color="#4CAF50" />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDesc}>{benefit.desc}</Text>
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
              <Text style={styles.ctaText}>무료로 이용하기</Text>
              <Text style={styles.ctaSubtext}>모든 AI 기능이 무료로 열려있습니다</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.legalText}>
            2026년 5월 31일까지 무료 기간입니다.{'\n'}
            6월부터 구독 또는 크레딧으로 이용 가능합니다.
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
                무료 체험 중 · <Text style={styles.statusBannerHighlight}>D-{trialDaysLeft}</Text> 남음
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
                무료 체험이 종료되었습니다
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
              ? 'Premium 구독'
              : isValueFirstVariant
              ? '이미 쓰고 있는 가치, 구독으로 절약'
              : 'Premium으로 업그레이드'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isTrialActive
              ? `체험 기간 D-${trialDaysLeft} · 지금 구독하면 끊김 없이 이용`
              : isTrialExpired
              ? '구독하고 모든 프리미엄 기능을 이용하세요'
              : isValueFirstVariant
              ? '최근 사용량 기준, 월 구독이 더 유리한지 바로 확인하세요'
              : '1개월 무료 체험으로 시작하세요'}
          </Text>
          {isExperimentActive && (
            <View style={styles.experimentBadge}>
              <Text style={styles.experimentBadgeText}>
                실험 중: {variant === 'value_first' ? '가치 우선 카피' : '기본 카피'}
              </Text>
            </View>
          )}
        </View>

        {isValueFirstVariant && (
          <View style={styles.valueProofCard}>
            <Text style={styles.valueProofTitle}>최근 30일 실제 사용 가치</Text>

            {valueProofLoading ? (
              <View style={styles.valueProofLoadingRow}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.valueProofSecondary}>내 사용 데이터를 계산 중입니다...</Text>
              </View>
            ) : valueProof.spendEvents30d > 0 ? (
              <>
                <Text style={styles.valueProofPrimary}>
                  AI 기능 {valueProof.spendEvents30d}회 사용 · 약 ₩{valueProof.inferredKrwValue.toLocaleString()} 상당
                </Text>
                <Text style={[styles.valueProofSecondary, valueProofNetGainKrw >= 0 ? styles.valueProofGain : styles.valueProofLoss]}>
                  {valueProofNetGainKrw >= 0
                    ? `월 구독료 대비 +₩${valueProofNetGainKrw.toLocaleString()} 절약 가능 (추정)`
                    : `월 구독료까지 ₩${Math.abs(valueProofNetGainKrw).toLocaleString()} 남음`}
                </Text>
              </>
            ) : (
              <Text style={styles.valueProofSecondary}>
                최근 30일 결제형 AI 사용 이력이 아직 없습니다. 3회 이상 사용 시 개인화 절약액이 표시됩니다.
              </Text>
            )}

            <View style={styles.valueProofMetaRow}>
              <Text style={styles.valueProofMeta}>출처: credit_transactions</Text>
              <Text style={styles.valueProofMeta}>생성: {formatMetaTime(valueProof.generatedAt)}</Text>
            </View>
            {valueProofTopFeatureLabel && (
              <Text style={styles.valueProofMeta}>가장 많이 사용한 기능: {valueProofTopFeatureLabel}</Text>
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
                <Text style={styles.pricingLabel}>{PRICING.monthly.label}</Text>
                <View style={styles.pricingPriceRow}>
                  <Text style={styles.pricingPrice}>{PRICING.monthly.price}</Text>
                  <Text style={styles.pricingPeriod}>{PRICING.monthly.period}</Text>
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
                <Text style={styles.pricingLabel}>{PRICING.yearly.label}</Text>
                <View style={styles.pricingPriceRow}>
                  <Text style={styles.pricingPrice}>{PRICING.yearly.price}</Text>
                  <Text style={styles.pricingPeriod}>{PRICING.yearly.period}</Text>
                </View>
                <Text style={styles.pricingDiscount}>
                  {PRICING.yearly.monthlyEquiv} · {PRICING.yearly.discount} 할인
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 혜택 목록 */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Premium 혜택</Text>
          {BENEFITS.map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <View style={styles.benefitIconWrap}>
                <Ionicons name={benefit.icon} size={20} color="#4CAF50" />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDesc}>{benefit.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isValueFirstVariant && (
          <View style={styles.valueProofCard}>
            <Text style={styles.valueProofTitle}>최근 30일 실제 사용 가치</Text>

            {valueProofLoading ? (
              <View style={styles.valueProofLoadingRow}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.valueProofSecondary}>내 사용 데이터를 계산 중입니다...</Text>
              </View>
            ) : valueProof.spendEvents30d > 0 ? (
              <>
                <Text style={styles.valueProofPrimary}>
                  AI 기능 {valueProof.spendEvents30d}회 사용 · 약 ₩{valueProof.inferredKrwValue.toLocaleString()} 상당
                </Text>
                <Text style={[styles.valueProofSecondary, valueProofNetGainKrw >= 0 ? styles.valueProofGain : styles.valueProofLoss]}>
                  {valueProofNetGainKrw >= 0
                    ? `월 구독료 대비 +₩${valueProofNetGainKrw.toLocaleString()} 절약 가능 (추정)`
                    : `월 구독료까지 ₩${Math.abs(valueProofNetGainKrw).toLocaleString()} 남음`}
                </Text>
              </>
            ) : (
              <Text style={styles.valueProofSecondary}>
                최근 30일 결제형 AI 사용 이력이 아직 없습니다. 3회 이상 사용 시 개인화 절약액이 표시됩니다.
              </Text>
            )}

            <View style={styles.valueProofMetaRow}>
              <Text style={styles.valueProofMeta}>출처: credit_transactions</Text>
              <Text style={styles.valueProofMeta}>생성: {formatMetaTime(valueProof.generatedAt)}</Text>
            </View>
            {valueProofTopFeatureLabel && (
              <Text style={styles.valueProofMeta}>가장 많이 사용한 기능: {valueProofTopFeatureLabel}</Text>
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
                  <Text style={styles.ctaText}>무료 체험 시작하기</Text>
                  <Text style={styles.ctaSubtext}>30일간 모든 기능 무료 · 결제 정보 불필요</Text>
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
              <Text style={styles.ctaText}>지금 구독하기</Text>
              <Text style={styles.ctaSubtext}>체험 기간 중 구독하면 끊김 없이 이용</Text>
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
              <Text style={styles.ctaText}>구독하고 계속 이용하기</Text>
              <Text style={styles.ctaSubtext}>연간 구독 시 25% 할인</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* 크레딧 안내 */}
        <View style={styles.creditInfo}>
          <Text style={styles.creditInfoTitle}>AI 기능은 크레딧으로 이용</Text>
          <Text style={styles.creditInfoDesc}>
            AI 분석 1회 ₩300~ · 구독 없이도 크레딧 구매로 이용 가능{'\n'}
            크레딧 패키지: ₩5,000 / ₩10,000 / ₩30,000
          </Text>
        </View>

        {/* 해지 방지 메시지 (손실 회피) */}
        {(isTrialActive || isPremium) && currentStreak >= 7 && (
          <View style={styles.streakWarning}>
            <View style={styles.streakWarningHeader}>
              <Ionicons name="warning" size={18} color="#FFC107" />
              <Text style={styles.streakWarningTitle}>해지 시 주의사항</Text>
            </View>
            <Text style={styles.streakWarningText}>
              구독을 해지하면 <Text style={styles.streakWarningHighlight}>{currentStreak}일 연속 기록</Text>이
              초기화되며, 투자 습관 형성에 지장이 생길 수 있습니다.
            </Text>
          </View>
        )}

        {/* 하단 안내 */}
        <Text style={styles.legalText}>
          체험 기간 종료 후 자동 결제되지 않습니다.{'\n'}
          유료 전환은 직접 선택해야 적용됩니다.
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
