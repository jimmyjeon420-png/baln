/**
 * Paywall - 프리미엄 구독 페이지
 *
 * 3가지 상태에 따라 다른 화면 표시:
 * A. 체험 전 (신규) → "1개월 무료 체험 시작" CTA
 * B. 체험 중 → "D-XX 남음" 카운트다운 + "지금 구독하기"
 * C. 체험 만료 → "체험 종료" 안내 + "구독하고 계속 이용하기"
 */

import React from 'react';
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
import { useHaptics } from '../../src/hooks/useHaptics';
import { useSubscriptionStatus, useActivateTrial } from '../../src/hooks/useSubscription';

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
    title: 'AI CFO 상담',
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

export default function PaywallScreen() {
  const router = useRouter();
  const { mediumTap, heavyTap } = useHaptics();
  const {
    isPremium,
    isTrialActive,
    isTrialExpired,
    trialDaysLeft,
    isLoading,
  } = useSubscriptionStatus();
  const activateTrial = useActivateTrial();

  // 무료 체험 시작 핸들러
  const handleActivateTrial = () => {
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
  };

  // 유료 구독 핸들러 (placeholder)
  const handleSubscribe = (period: 'monthly' | 'yearly') => {
    heavyTap();
    Alert.alert(
      '결제 준비 중',
      '인앱 결제 시스템을 준비 중입니다.\n곧 서비스가 시작됩니다!',
      [{ text: '확인' }]
    );
  };

  // 로딩 중 표시
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            {isTrialExpired ? 'Premium 구독' : 'Premium으로 업그레이드'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isTrialActive
              ? `체험 기간 D-${trialDaysLeft} · 지금 구독하면 끊김 없이 이용`
              : isTrialExpired
              ? '구독하고 모든 프리미엄 기능을 이용하세요'
              : '1개월 무료 체험으로 시작하세요'}
          </Text>
        </View>

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
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  statusBannerHighlight: {
    fontWeight: '900',
    fontSize: 16,
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
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
    paddingHorizontal: 16,
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
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  pricingLabel: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
  },
  pricingPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  pricingPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pricingPeriod: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  pricingDiscount: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  // 혜택
  benefitsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  benefitDesc: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
    lineHeight: 18,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ctaSubtext: {
    fontSize: 12,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 6,
    textAlign: 'center',
  },
  creditInfoDesc: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalText: {
    fontSize: 11,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 16,
  },
});
