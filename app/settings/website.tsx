/**
 * 공식 웹사이트 (앱 내 랜딩 페이지)
 * 회사 소개, 핵심 기능, 팀 철학, 투자자 신뢰 요소를 담은 페이지
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useLocale } from '../../src/context/LocaleContext';

export default function WebsiteScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();

  // 핵심 기능
  const features = [
    {
      icon: 'layers' as const,
      title: t('website.feature_context_card_title'),
      desc: t('website.feature_context_card_desc'),
    },
    {
      icon: 'bulb' as const,
      title: t('website.feature_prediction_title'),
      desc: t('website.feature_prediction_desc'),
    },
    {
      icon: 'newspaper' as const,
      title: t('website.feature_news_title'),
      desc: t('website.feature_news_desc'),
    },
    {
      icon: 'analytics' as const,
      title: t('website.feature_diagnosis_title'),
      desc: t('website.feature_diagnosis_desc'),
    },
    {
      icon: 'camera' as const,
      title: t('website.feature_ocr_title'),
      desc: t('website.feature_ocr_desc'),
    },
    {
      icon: 'shield-checkmark' as const,
      title: t('website.feature_security_title'),
      desc: t('website.feature_security_desc'),
    },
  ];

  // 신뢰 지표
  const trustBadges = [
    { icon: 'lock-closed' as const, label: t('website.trust_encryption') },
    { icon: 'server' as const, label: t('website.trust_infra') },
    { icon: 'shield' as const, label: t('website.trust_security') },
    { icon: 'time' as const, label: t('website.trust_habit') },
  ];

  // 회사 연혁
  const milestones = [
    { date: '2025.06', event: t('website.milestone_1_event') },
    { date: '2025.09', event: t('website.milestone_2_event') },
    { date: '2025.12', event: t('website.milestone_3_event') },
    { date: '2026.01', event: t('website.milestone_4_event') },
    { date: '2026.02', event: t('website.milestone_5_event') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title={t('website.title')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 히어로 섹션 */}
        <View style={styles.heroSection}>
          <View style={[styles.heroLogo, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="analytics" size={56} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            bal<Text style={{ color: colors.primary }}>n</Text>
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.primary }]}>{t('website.hero_subtitle')}</Text>
          <Text style={[styles.heroTagline, { color: colors.textTertiary }]}>
            {t('website.hero_tagline')}
          </Text>
        </View>

        {/* 미션 섹션 */}
        <View style={[styles.missionSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('website.mission_label')}</Text>
          <Text style={[styles.missionTitle, { color: colors.textPrimary }]}>
            {t('website.mission_title')}
          </Text>
          <Text style={[styles.missionDesc, { color: colors.textSecondary }]}>
            {t('website.mission_desc')}
          </Text>
        </View>

        {/* 신뢰 지표 */}
        <View style={styles.trustSection}>
          {trustBadges.map((badge, index) => (
            <View key={index} style={styles.trustBadge}>
              <View style={[styles.trustIconBox, { backgroundColor: colors.surface }]}>
                <Ionicons name={badge.icon} size={22} color={colors.primary} />
              </View>
              <Text style={[styles.trustLabel, { color: colors.textSecondary }]}>{badge.label}</Text>
            </View>
          ))}
        </View>

        {/* 핵심 기능 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>CORE FEATURES</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={[styles.featureCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.featureIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name={feature.icon} size={24} color={colors.primary} />
              </View>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{feature.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{feature.desc}</Text>
            </View>
          ))}
        </View>

        {/* 기술 스택 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('website.tech_label')}</Text>
        <View style={[styles.techSection, { backgroundColor: colors.surface }]}>
          <View style={styles.techRow}>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>React Native</Text>
            </View>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>Expo SDK 54</Text>
            </View>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>TypeScript</Text>
            </View>
          </View>
          <View style={styles.techRow}>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>Supabase</Text>
            </View>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>Gemini 3 Flash</Text>
            </View>
            <View style={[styles.techBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <Text style={[styles.techBadgeText, { color: colors.primary }]}>TanStack Query</Text>
            </View>
          </View>
          <Text style={[styles.techDesc, { color: colors.textSecondary }]}>
            {t('website.tech_desc')}
          </Text>
        </View>

        {/* 회사 연혁 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('website.milestones_label')}</Text>
        <View style={[styles.timelineSection, { backgroundColor: colors.surface }]}>
          {milestones.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <View style={[
                  styles.timelineDotInner,
                  { backgroundColor: index === milestones.length - 1 ? colors.primary : colors.textQuaternary },
                ]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineDate, { color: colors.primary }]}>{item.date}</Text>
                <Text style={[styles.timelineEvent, { color: colors.textPrimary }]}>{item.event}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 팀 소개 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('website.team_label')}</Text>
        <View style={styles.teamSection}>
          <View style={[styles.teamCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.teamAvatar, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.textPrimary }]}>
                bal<Text style={{ color: colors.primary }}>n</Text> team
              </Text>
              <Text style={[styles.teamRole, { color: colors.primary }]}>Seoul, South Korea</Text>
              <Text style={[styles.teamBio, { color: colors.textSecondary }]}>
                {t('website.team_bio')}
              </Text>
            </View>
          </View>
        </View>

        {/* 연락처 */}
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>{t('website.contact_label')}</Text>
        <View style={[styles.contactSection, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() =>
              Linking.openURL(
                'mailto:baln.logic@gmail.com?subject=[baln] 문의'
              )
            }
          >
            <Ionicons name="mail" size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.textPrimary }]}>baln.logic@gmail.com</Text>
          </TouchableOpacity>
          <View style={styles.contactItem}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.textPrimary }]}>{t('website.contact_location')}</Text>
          </View>
        </View>

        {/* 법적 면책 */}
        <View style={[styles.disclaimerSection, { backgroundColor: `${colors.error}15`, borderLeftColor: colors.error }]}>
          <Text style={[styles.disclaimerTitle, { color: colors.error }]}>{t('website.disclaimer_label')}</Text>
          <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
            {t('website.disclaimer_text')}
          </Text>
        </View>

        {/* 하단 */}
        <Text style={[styles.footerText, { color: colors.textQuaternary }]}>
          {t('website.footer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // 히어로
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 8,
  },
  heroLogo: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  heroTagline: {
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },

  // 미션
  missionSection: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  missionTitle: {
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 33,
    marginBottom: 12,
  },
  missionDesc: {
    fontSize: 15,
    lineHeight: 23,
  },

  // 섹션 라벨
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },

  // 신뢰 지표
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  trustBadge: {
    alignItems: 'center',
    flex: 1,
  },
  trustIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // 핵심 기능
  featuresGrid: {
    gap: 12,
    marginBottom: 28,
  },
  featureCard: {
    borderRadius: 14,
    padding: 18,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 21,
  },

  // 기술 스택
  techSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  techRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  techBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  techBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  techDesc: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  // 연혁
  timelineSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  timelineDot: {
    width: 24,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  timelineEvent: {
    fontSize: 15,
  },

  // 팀
  teamSection: {
    marginBottom: 28,
  },
  teamCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  teamAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '700',
  },
  teamRole: {
    fontSize: 14,
    marginTop: 2,
  },
  teamBio: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  // 연락처
  contactSection: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 15,
  },

  // 면책
  disclaimerSection: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    marginBottom: 24,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 19,
  },

  // 하단
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 40,
  },
});
