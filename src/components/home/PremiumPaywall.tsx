/**
 * PremiumPaywall.tsx - Premium 업그레이드 모달
 *
 * 역할: "VIP 초대장" — 유료 전환 유도 모달
 *
 * 트리거:
 * - 맥락 카드 전체 보기 시도 (무료는 요약만)
 * - AI 진단 일일 한도 초과
 * - 또래 비교 전체 등급 보기 시도
 *
 * 전략 (이승건): "불안을 팔지 않고, 가치를 보여준다"
 * - 잠금 해제로 얻을 수 있는 것 중심 설명
 * - 부정적 표현 없이 긍정적 가치 전달
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// Props
// ============================================================================

interface PremiumPaywallProps {
  visible: boolean;
  onClose: () => void;
  /** 어떤 기능에서 트리거되었는지 */
  triggerFeature?: 'context_card' | 'ai_diagnosis' | 'peer_compare' | 'prediction_detail';
  /** 구매 버튼 콜백 (향후 IAP 연동) */
  onPurchase?: () => void;
}

// ============================================================================
// 기능 목록
// ============================================================================

const PREMIUM_FEATURES = [
  {
    icon: 'layers-outline' as const,
    title: '맥락 카드 전체 보기',
    desc: '역사적·거시경제·기관행동·포트폴리오 4겹 분석',
  },
  {
    icon: 'analytics-outline' as const,
    title: 'AI 진단 3회/일',
    desc: '무료 1회 → Premium 3회로 확장',
  },
  {
    icon: 'people-outline' as const,
    title: '또래 비교 전체 등급',
    desc: '같은 자산 구간 투자자와 상세 비교',
  },
  {
    icon: 'gift-outline' as const,
    title: '월 30크레딧 보너스',
    desc: '매월 30C (\u20A93,000) 자동 지급',
  },
  {
    icon: 'school-outline' as const,
    title: '예측 해설 + 복기',
    desc: '적중/오답 이유 AI 해설 제공',
  },
];

// ============================================================================
// 컴포넌트
// ============================================================================

export default function PremiumPaywall({
  visible,
  onClose,
  triggerFeature,
  onPurchase,
}: PremiumPaywallProps) {
  const { colors } = useTheme();

  // 트리거 기능에 따른 상단 메시지
  const triggerMessage: Record<string, string> = {
    context_card: '맥락 카드 전체를 보려면',
    ai_diagnosis: 'AI 진단을 더 받으려면',
    peer_compare: '또래 비교 상세를 보려면',
    prediction_detail: '예측 해설을 보려면',
  };

  const topMessage = triggerFeature
    ? triggerMessage[triggerFeature] || 'Premium으로 더 많은 기능을'
    : '더 깊은 투자 인사이트를 원하시나요?';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ width: 32 }} />
          <Text style={[styles.headerTitle, { color: colors.premium.gold }]}>
            Premium
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* 상단 섹션 */}
          <View style={styles.heroSection}>
            <Text style={styles.heroEmoji}>{'\u2B50'}</Text>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              {topMessage}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              매일 5분, 투자 감각을 키우는 최고의 도구
            </Text>
          </View>

          {/* 기능 목록 */}
          <View style={styles.featuresList}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View
                key={index}
                style={[styles.featureItem, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.featureIcon, { backgroundColor: colors.premium.gold + '1A' }]}>
                  <Ionicons name={feature.icon} size={22} color={colors.premium.gold} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.textTertiary }]}>
                    {feature.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* 가격 */}
          <View style={[styles.priceCard, { backgroundColor: colors.premium.gold + '0D', borderColor: colors.premium.gold + '33' }]}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>월간 구독</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceAmount, { color: colors.premium.gold }]}>
                {'\u20A9'}4,900
              </Text>
              <Text style={[styles.pricePeriod, { color: colors.textTertiary }]}>/월</Text>
            </View>
            <Text style={[styles.priceNote, { color: colors.textTertiary }]}>
              하루 약 {'\u20A9'}163 {'\u00B7'} 언제든 해지 가능
            </Text>
          </View>

          {/* 구매 버튼 */}
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: colors.premium.gold }]}
            onPress={onPurchase}
            activeOpacity={0.8}
          >
            <Text style={styles.purchaseText}>Premium 시작하기</Text>
          </TouchableOpacity>

          {/* 안내 */}
          <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
            iTunes 계정으로 결제되며, 구독 기간 종료 24시간 전에 자동 갱신됩니다.{'\n'}
            설정 {'>'} 구독에서 언제든 해지할 수 있습니다.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },

  // 히어로
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },

  // 기능 목록
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 13,
    marginTop: 2,
  },

  // 가격
  priceCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '900',
  },
  pricePeriod: {
    fontSize: 17,
    fontWeight: '500',
    marginLeft: 4,
  },
  priceNote: {
    fontSize: 13,
    marginTop: 6,
  },

  // 구매 버튼
  purchaseButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseText: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '700',
  },

  // 면책
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});
