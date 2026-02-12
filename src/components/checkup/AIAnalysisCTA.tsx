/**
 * AI 심화 분석 유도 CTA 컴포넌트
 *
 * 역할: 분석 탭 하단에서 AI 마켓플레이스로 연결
 * 비유: 백화점 1층에서 "명품관은 5층입니다" 안내판
 *
 * 유도 항목:
 * - 종목 딥다이브 (Deep Dive)
 * - What-If 시뮬레이션
 * - 세금 리포트
 * - AI 버핏과 티타임
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';

const FEATURE_COLOR_DEEP_DIVE = '#2196F3';
const FEATURE_COLOR_WHAT_IF = '#FF9800';
const FEATURE_COLOR_TAX_REPORT = '#9C27B0';
const FEATURE_COLOR_AI_CFO = '#4CAF50';

/**
 * AI 기능 항목
 */
interface AIFeatureItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  route: string;
  comingSoon?: boolean; // 준비 중 표시
  comingSoonDate?: string; // 출시 예정일
}

const AI_FEATURES: AIFeatureItem[] = [
  {
    icon: 'telescope-outline',
    title: '종목 딥다이브',
    description: '보유 종목 심층 분석',
    color: FEATURE_COLOR_DEEP_DIVE,
    route: '/marketplace?feature=deep_dive',
    comingSoon: true,
    comingSoonDate: '2월 말',
  },
  {
    icon: 'git-branch-outline',
    title: 'What-If 시뮬',
    description: '매도 후 시나리오 예측',
    color: FEATURE_COLOR_WHAT_IF,
    route: '/marketplace?feature=what_if',
    // 활성화됨 - comingSoon 없음
  },
  {
    icon: 'calculator-outline',
    title: '세금 리포트',
    description: '양도세·증여세 계산',
    color: FEATURE_COLOR_TAX_REPORT,
    route: '/marketplace?feature=tax_report',
    comingSoon: true,
    comingSoonDate: '2월 말',
  },
  {
    icon: 'chatbubbles-outline',
    title: 'AI 버핏과 티타임',
    description: '실시간 투자 상담',
    color: FEATURE_COLOR_AI_CFO,
    route: '/marketplace?feature=ai_cfo_chat',
    comingSoon: true,
    comingSoonDate: '2월 말',
  },
];

export default function AIAnalysisCTA() {
  const router = useRouter();
  const { colors, shadows } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.premium.purple + '33' }, shadows.md]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color={colors.premium.purple} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI 심화 분석</Text>
        <View style={[styles.freeBadge, { backgroundColor: colors.premium.purple }]}>
          <Text style={styles.freeBadgeText}>1C/회</Text>
        </View>
      </View>

      <Text style={[styles.headerDesc, { color: colors.textTertiary }]}>
        더 깊이 있는 분석이 필요하신가요?
      </Text>

      {/* AI 기능 그리드 (2x2) */}
      <View style={styles.grid}>
        {AI_FEATURES.map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.featureCard,
              { backgroundColor: colors.inverseSurface, borderColor: colors.border },
              feature.comingSoon && styles.disabledCard,
            ]}
            onPress={() => {
              if (!feature.comingSoon) {
                router.push(feature.route as any);
              }
            }}
            activeOpacity={feature.comingSoon ? 1 : 0.7}
            disabled={feature.comingSoon}
          >
            <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
              <Ionicons
                name={feature.icon}
                size={24}
                color={feature.comingSoon ? colors.textTertiary : feature.color}
              />
            </View>
            <View style={styles.featureTitleRow}>
              <Text style={[
                styles.featureTitle,
                { color: feature.comingSoon ? colors.textTertiary : colors.textPrimary },
              ]}>
                {feature.title}
              </Text>
              {feature.comingSoon && (
                <View style={[styles.comingSoonBadge, { backgroundColor: colors.textTertiary }]}>
                  <Text style={styles.comingSoonText}>준비 중</Text>
                </View>
              )}
            </View>
            <Text style={[styles.featureDesc, { color: colors.textTertiary }]}>
              {feature.comingSoon ? `${feature.comingSoonDate} 공개` : feature.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 마켓플레이스 전체 보기 버튼 */}
      <TouchableOpacity
        style={[styles.marketplaceButton, { backgroundColor: colors.premium.purple + '26' }]}
        onPress={() => router.push('/marketplace')}
        activeOpacity={0.7}
      >
        <Text style={[styles.marketplaceButtonText, { color: colors.premium.purple }]}>
          AI 마켓플레이스 전체 보기
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.premium.purple} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    // backgroundColor는 동적으로 적용됨
    borderRadius: 16,
    borderWidth: 1,
    // borderColor는 동적으로 적용됨
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    // color는 동적으로 적용됨
    marginLeft: 8,
    flex: 1,
  },
  freeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerDesc: {
    fontSize: 14,
    // color는 동적으로 적용됨
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  featureCard: {
    width: '48%',
    // backgroundColor는 동적으로 적용됨
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    // borderColor는 동적으로 적용됨
  },
  disabledCard: {
    opacity: 0.5,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    // color는 동적으로 적용됨
  },
  comingSoonBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    // color는 동적으로 적용됨
    lineHeight: 16,
  },
  marketplaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    // backgroundColor는 동적으로 적용됨
    borderRadius: 12,
    marginTop: 8,
  },
  marketplaceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    // color는 동적으로 적용됨
    marginRight: 6,
  },
});
