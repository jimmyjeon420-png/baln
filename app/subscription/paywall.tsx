/**
 * Paywall - 프리미엄 구독 페이지
 * App 출시 기념 6개월 전 등급 무료 이벤트 적용
 * 이벤트 종료 후 유료 전환 대비 가격 정보 표시
 */

import React from 'react';
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

// 이벤트 종료 후 적용될 정가 (참고용)
const REGULAR_PRICE = {
  monthly: '₩3,900/월',
  yearly: '₩34,900/년',
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
  {
    icon: 'diamond' as const,
    title: 'AI 크레딧 보너스',
    desc: '매월 50 크레딧 무료 지급 (종목 분석, 세금 리포트 등)',
    premium: true,
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { mediumTap, heavyTap } = useHaptics();

  const handleActivate = () => {
    heavyTap();
    Alert.alert(
      '출시 기념 무료 활성화',
      '6개월간 모든 Premium 기능을 무료로 이용하시겠습니까?\n\n결제 정보가 필요하지 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '무료로 활성화',
          onPress: () => {
            // TODO: 프리미엄 활성화 로직 (Supabase profiles 업데이트)
            Alert.alert(
              '활성화 완료!',
              'Premium이 활성화되었습니다.\n2026년 8월까지 모든 기능을 무료로 이용하세요.',
              [{ text: '확인', onPress: () => router.back() }]
            );
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
          <Text style={styles.heroEmoji}>🎉</Text>
          <Text style={styles.heroTitle}>App 출시 기념</Text>
          <Text style={styles.heroSubtitle}>
            6개월간 전 등급 무료 이벤트
          </Text>
        </View>

        {/* 이벤트 배너 */}
        <View style={styles.eventBanner}>
          <LinearGradient
            colors={['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)']}
            style={styles.eventBannerGradient}
          >
            <Text style={styles.eventBannerTitle}>₩0 / 6개월</Text>
            <Text style={styles.eventBannerOriginal}>
              정가 {REGULAR_PRICE.monthly} → 무료
            </Text>
            <Text style={styles.eventBannerPeriod}>
              ~ 2026년 8월까지 · 결제 정보 불필요
            </Text>
          </LinearGradient>
        </View>

        {/* 혜택 목록 */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>무료로 제공되는 Premium 혜택</Text>
          {BENEFITS.map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <View style={styles.benefitIconWrap}>
                <Ionicons name={benefit.icon} size={20} color="#4CAF50" />
              </View>
              <View style={styles.benefitText}>
                <View style={styles.benefitTitleRow}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  {benefit.premium && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.benefitDesc}>{benefit.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA 버튼 */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleActivate}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>무료로 Premium 활성화</Text>
            <Text style={styles.ctaSubtext}>결제 정보 없이 바로 시작</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 하단 안내 */}
        <Text style={styles.legalText}>
          출시 기념 이벤트는 2026년 8월까지 적용됩니다.{'\n'}
          이벤트 종료 후 자동 결제되지 않으며, 유료 전환 시 별도 안내드립니다.
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
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  // 이벤트 배너
  eventBanner: {
    marginBottom: 28,
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventBannerGradient: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  eventBannerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  eventBannerOriginal: {
    fontSize: 13,
    color: '#888888',
    marginTop: 6,
    textDecorationLine: 'line-through',
    textDecorationColor: '#666666',
  },
  eventBannerPeriod: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 4,
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
  freeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeText: {
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
