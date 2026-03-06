/**
 * AI 심화 분석 유도 CTA 컴포넌트
 *
 * 역할: 분석 탭 하단에서 AI 마켓플레이스로 연결
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

const FEATURE_COLOR_DEEP_DIVE = '#2196F3';
const FEATURE_COLOR_WHAT_IF = '#FF9800';
const FEATURE_COLOR_TAX_REPORT = '#9C27B0';
const FEATURE_COLOR_AI_BUFFETT = '#4CAF50';

interface AIFeatureItem {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  descKey: string;
  color: string;
  route: string;
  comingSoon?: boolean;
  comingSoonDate?: string;
}

const AI_FEATURES: AIFeatureItem[] = [
  {
    icon: 'telescope-outline',
    titleKey: 'checkup.aiAnalysis.deepDive',
    descKey: 'checkup.aiAnalysis.deepDiveDesc',
    color: FEATURE_COLOR_DEEP_DIVE,
    route: '/marketplace?feature=deep_dive',
  },
  {
    icon: 'git-branch-outline',
    titleKey: 'checkup.aiAnalysis.whatIf',
    descKey: 'checkup.aiAnalysis.whatIfDesc',
    color: FEATURE_COLOR_WHAT_IF,
    route: '/marketplace?feature=what_if',
  },
  {
    icon: 'calculator-outline',
    titleKey: 'checkup.aiAnalysis.taxReport',
    descKey: 'checkup.aiAnalysis.taxReportDesc',
    color: FEATURE_COLOR_TAX_REPORT,
    route: '/marketplace?feature=tax_report',
  },
  {
    icon: 'chatbubbles-outline',
    titleKey: 'checkup.aiAnalysis.cfoChatTitle',
    descKey: 'checkup.aiAnalysis.cfoChatDesc',
    color: FEATURE_COLOR_AI_BUFFETT,
    route: '/marketplace?feature=ai_cfo_chat',
  },
];

export default function AIAnalysisCTA() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const { t } = useLocale();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.premium.purple + '33' }, shadows.md]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color={colors.premium.purple} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('checkup.aiAnalysis.title')}</Text>
        <View style={[styles.freeBadge, { backgroundColor: colors.premium.purple }]}>
          <Text style={styles.freeBadgeText}>{t('checkup.aiAnalysis.perUse')}</Text>
        </View>
      </View>

      <Text style={[styles.headerDesc, { color: colors.textTertiary }]}>
        {t('checkup.aiAnalysis.headerDesc')}
      </Text>

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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                {t(feature.titleKey)}
              </Text>
              {feature.comingSoon && (
                <View style={[styles.comingSoonBadge, { backgroundColor: colors.textTertiary }]}>
                  <Text style={styles.comingSoonText}>{t('checkup.aiAnalysis.preparing')}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.featureDesc, { color: colors.textTertiary }]}>
              {feature.comingSoon ? t('checkup.aiAnalysis.comingSoonOpen', { date: feature.comingSoonDate ?? '' }) : t(feature.descKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.marketplaceButton, { backgroundColor: colors.premium.purple + '26' }]}
        onPress={() => router.push('/marketplace')}
        activeOpacity={0.7}
      >
        <Text style={[styles.marketplaceButtonText, { color: colors.premium.purple }]}>
          {t('checkup.aiAnalysis.marketplaceAll')}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.premium.purple} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginVertical: 12, padding: 20, borderRadius: 16, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 19, fontWeight: '700', marginLeft: 8, flex: 1 },
  freeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  freeBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  headerDesc: { fontSize: 15, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  featureCard: { width: '48%', borderRadius: 12, padding: 16, borderWidth: 1 },
  disabledCard: { opacity: 0.5 },
  featureIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  featureTitle: { fontSize: 15, fontWeight: '600' },
  comingSoonBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  comingSoonText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
  featureDesc: { fontSize: 13, lineHeight: 17 },
  marketplaceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  marketplaceButtonText: { fontSize: 15, fontWeight: '600', marginRight: 6 },
});
