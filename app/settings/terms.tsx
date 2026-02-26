/**
 * 이용약관 화면 / Terms of Service Screen
 * 로케일 기반으로 한국어/영어 전환
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useLocale } from '../../src/context/LocaleContext';

export default function TermsScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title={t('terms.screen_title')} />

      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('terms.doc_title')}</Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>{t('terms.effective_date')}</Text>

        {/* Section 1 — Purpose */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s1_title')}</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s1_body')}
          </Text>
        </View>

        {/* Section 2 — Service Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s2_title')}</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s2_body')}
          </Text>
        </View>

        {/* Section 3 — Disclaimer & Investment Risk */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s3_title')}</Text>
          <View style={[styles.warningBox, { borderColor: `${colors.error}4D` }]}>
            <Text style={[styles.warningText, { color: colors.error }]}>
              {t('terms.s3_warning')}
            </Text>
          </View>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s3_body')}
          </Text>
        </View>

        {/* Section 4 — Privacy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s4_title')}</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s4_body')}
          </Text>
        </View>

        {/* Section 5 — Prohibited Conduct */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s5_title')}</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s5_body')}
          </Text>
        </View>

        {/* Section 6 — Community & Gatherings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s6_title')}</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s6_body')}
          </Text>
        </View>

        {/* Section 7 — Prohibited Financial Activity (danger styled) */}
        <View style={styles.section}>
          <View style={styles.dangerSectionHeader}>
            <Ionicons name="warning" size={18} color={colors.error} />
            <Text style={[styles.sectionTitle, styles.dangerSectionTitle, { color: colors.error }]}>
              {t('terms.s7_title')}
            </Text>
          </View>
          <View style={[styles.dangerBox, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}4D` }]}>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {t('terms.s7_body_intro')}{'\n\n'}
              {'  '}a. <Text style={[styles.dangerHighlight, { color: colors.error }]}>{t('terms.s7_item_a_label')}</Text>
              {t('terms.s7_item_a_desc')}{'\n\n'}
              {'  '}b. <Text style={[styles.dangerHighlight, { color: colors.error }]}>{t('terms.s7_item_b_label')}</Text>
              {t('terms.s7_item_b_desc')}{'\n\n'}
              {'  '}c. <Text style={[styles.dangerHighlight, { color: colors.error }]}>{t('terms.s7_item_c_label')}</Text>
              {t('terms.s7_item_c_desc')}{'\n\n'}
              {'  '}d. <Text style={[styles.dangerHighlight, { color: colors.error }]}>{t('terms.s7_item_d_label')}</Text>
              {t('terms.s7_item_d_desc')}{'\n\n'}
              {t('terms.s7_penalty')}
              <Text style={[styles.dangerHighlight, { color: colors.error }]}>{t('terms.s7_penalty_bold')}</Text>
              {t('terms.s7_penalty_suffix')}
            </Text>
          </View>
        </View>

        {/* Section 8 — Credits & Refund Policy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s8_title')}</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s8_body')}
          </Text>
        </View>

        {/* Section 9 — Age Requirement */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s9_title')}</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s9_body')}
          </Text>
        </View>

        {/* Section 10 — AI Automated Decision-Making */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('terms.s10_title')}</Text>
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
            {t('terms.s10_body')}
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.textTertiary, borderTopColor: colors.border }]}>
          {t('terms.footer')}
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
  title: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 23,
  },
  footer: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 40,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  // 유사투자자문 금지 조항 (위험 강조 스타일)
  dangerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dangerSectionTitle: {
    marginBottom: 0,
  },
  dangerBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  dangerHighlight: {
    fontWeight: '700',
  },
  // 원금 손실 경고 박스
  warningBox: {
    backgroundColor: 'rgba(207, 102, 121, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 21,
  },
});
