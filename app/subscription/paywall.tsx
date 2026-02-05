/**
 * Paywall - 프리미엄 구독 페이지
 * 혜택 목록 + 요금제 + 그라데이션 CTA
 * Silver 유저 → 부동산 인사이트 잠금 해제 유도
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../src/hooks/useHaptics';

type PlanType = 'monthly' | 'yearly';

const PLANS = {
  monthly: { price: '₩9,900', period: '/월', save: '' },
  yearly: { price: '₩79,900', period: '/년', save: '33% 절약' },
};

const BENEFITS = [
  {
    icon: 'analytics' as const,
    title: '부동산 인사이트',
    desc: 'AI 기반 부동산 시장 분석 & 매물 추천',
    premium: true,
  },
  {
    icon: 'flash' as const,
    title: '실시간 리밸런싱',
    desc: '시장 변동 시 즉각적인 포트폴리오 조정 알림',
    premium: true,
  },
  {
    icon: 'people' as const,
    title: 'VIP 라운지 전체',
    desc: 'Platinum/Diamond 전용 모임 & 네트워킹',
    premium: true,
  },
  {
    icon: 'document-text' as const,
    title: '세금 리포트',
    desc: '연간 양도세/종합소득세 자동 계산 & PDF 내보내기',
    premium: true,
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Panic Shield Pro',
    desc: '개인화된 손절 가이드라인 & 자동 알림',
    premium: true,
  },
  {
    icon: 'chatbubbles' as const,
    title: 'AI CFO 상담',
    desc: '1:1 AI 재무 상담 (무제한 질문)',
    premium: true,
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { mediumTap, heavyTap, selection } = useHaptics();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');

  const handleSelectPlan = (plan: PlanType) => {
    selection();
    setSelectedPlan(plan);
  };

  const handleSubscribe = () => {
    heavyTap();
    // TODO: 실제 인앱 결제 연동 (RevenueCat 또는 expo-in-app-purchases)
    Alert.alert(
      '프리미엄 구독',
      `${PLANS[selectedPlan].price}${PLANS[selectedPlan].period} 요금제로 구독하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구독하기',
          onPress: () => {
            Alert.alert('안내', '결제 시스템 준비 중입니다. 곧 서비스됩니다.');
          },
        },
      ]
    );
  };

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

        {/* 히어로 섹션 */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['rgba(76, 175, 80, 0.3)', 'rgba(76, 175, 80, 0)']}
            style={styles.heroGlow}
          />
          <Text style={styles.heroEmoji}>🚀</Text>
          <Text style={styles.heroTitle}>BALN Premium</Text>
          <Text style={styles.heroSubtitle}>
            AI CFO가 당신의 자산을 24시간 관리합니다
          </Text>
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
                <View style={styles.benefitTitleRow}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  {benefit.premium && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.benefitDesc}>{benefit.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 요금제 선택 */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>요금제 선택</Text>

          {/* 연간 */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => handleSelectPlan('yearly')}
            activeOpacity={0.7}
          >
            {PLANS.yearly.save && (
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>{PLANS.yearly.save}</Text>
              </View>
            )}
            <View style={styles.planRadio}>
              <View style={[
                styles.radioOuter,
                selectedPlan === 'yearly' && styles.radioOuterSelected,
              ]}>
                {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>연간 구독</Text>
              <Text style={styles.planPriceSmall}>월 ₩6,658 (₩79,900/년)</Text>
            </View>
            <Text style={styles.planPrice}>{PLANS.yearly.price}</Text>
          </TouchableOpacity>

          {/* 월간 */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => handleSelectPlan('monthly')}
            activeOpacity={0.7}
          >
            <View style={styles.planRadio}>
              <View style={[
                styles.radioOuter,
                selectedPlan === 'monthly' && styles.radioOuterSelected,
              ]}>
                {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>월간 구독</Text>
              <Text style={styles.planPriceSmall}>언제든 해지 가능</Text>
            </View>
            <Text style={styles.planPrice}>{PLANS.monthly.price}</Text>
          </TouchableOpacity>
        </View>

        {/* CTA 버튼 */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleSubscribe}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Premium 시작하기</Text>
            <Text style={styles.ctaSubtext}>7일 무료 체험 포함</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 하단 안내 */}
        <Text style={styles.legalText}>
          구독은 언제든 취소할 수 있습니다. 무료 체험 기간 내 해지 시 비용이 발생하지 않습니다.
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
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#888888',
    marginTop: 8,
    textAlign: 'center',
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
  benefitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  proBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  benefitDesc: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
    lineHeight: 18,
  },
  // 요금제
  plansSection: {
    marginBottom: 24,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  saveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  planRadio: {
    marginRight: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#444444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#4CAF50',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planPriceSmall: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4CAF50',
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
  legalText: {
    fontSize: 11,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 16,
  },
});
