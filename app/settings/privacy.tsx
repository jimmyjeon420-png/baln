/**
 * 개인정보처리방침 화면 - Zero-Knowledge 정책
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useLocale } from '../../src/context/LocaleContext';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();

  const privacyPolicies = [
    {
      icon: 'shield-checkmark',
      title: t('privacy.policy_zero_knowledge_title'),
      description: t('privacy.policy_zero_knowledge_desc'),
    },
    {
      icon: 'lock-closed',
      title: t('privacy.policy_encryption_title'),
      description: t('privacy.policy_encryption_desc'),
    },
    {
      icon: 'cloud-offline',
      title: t('privacy.policy_local_title'),
      description: t('privacy.policy_local_desc'),
    },
    {
      icon: 'eye-off',
      title: t('privacy.policy_anon_title'),
      description: t('privacy.policy_anon_desc'),
    },
    {
      icon: 'trash',
      title: t('privacy.policy_delete_title'),
      description: t('privacy.policy_delete_desc'),
    },
    {
      icon: 'hand-left',
      title: t('privacy.policy_no_share_title'),
      description: t('privacy.policy_no_share_desc'),
    },
  ];

  const dataCollected = [
    {
      item: t('privacy.data_item_email'),
      purpose: t('privacy.data_item_email_purpose'),
      retention: t('privacy.data_item_email_retention'),
    },
    {
      item: t('privacy.data_item_portfolio'),
      purpose: t('privacy.data_item_portfolio_purpose'),
      retention: t('privacy.data_item_portfolio_retention'),
    },
    {
      item: t('privacy.data_item_ai_log'),
      purpose: t('privacy.data_item_ai_log_purpose'),
      retention: t('privacy.data_item_ai_log_retention'),
    },
    {
      item: t('privacy.data_item_usage'),
      purpose: t('privacy.data_item_usage_purpose'),
      retention: t('privacy.data_item_usage_retention'),
    },
    {
      item: t('privacy.data_item_payment'),
      purpose: t('privacy.data_item_payment_purpose'),
      retention: t('privacy.data_item_payment_retention'),
    },
    {
      item: t('privacy.data_item_community'),
      purpose: t('privacy.data_item_community_purpose'),
      retention: t('privacy.data_item_community_retention'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title={t('privacy.screen_title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Zero-Knowledge 배너 */}
        <View style={[styles.zeroBanner, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="shield" size={40} color={colors.primary} />
          <View style={styles.zeroBannerText}>
            <Text style={[styles.zeroBannerTitle, { color: colors.primary }]}>
              {t('privacy.banner_title')}
            </Text>
            <Text style={[styles.zeroBannerSubtitle, { color: colors.textSecondary }]}>
              {t('privacy.banner_subtitle')}
            </Text>
          </View>
        </View>

        {/* 정책 목록 */}
        <View style={styles.policiesContainer}>
          {privacyPolicies.map((policy, index) => (
            <View key={index} style={[styles.policyItem, { backgroundColor: colors.surface }]}>
              <View style={[styles.policyIconContainer, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons
                  name={policy.icon as any}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.policyContent}>
                <Text style={[styles.policyTitle, { color: colors.textPrimary }]}>{policy.title}</Text>
                <Text style={[styles.policyDescription, { color: colors.textSecondary }]}>{policy.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 개인정보의 처리 목적 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.purpose_section_title')}
          </Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.purpose_body')}
          </Text>
        </View>

        {/* 수집 데이터 테이블 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.collected_section_title')}
          </Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>
              {t('privacy.table_col_item')}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>
              {t('privacy.table_col_purpose')}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>
              {t('privacy.table_col_retention')}
            </Text>
          </View>
          {dataCollected.map((data, index) => (
            <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>{data.item}</Text>
              <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>{data.purpose}</Text>
              <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>{data.retention}</Text>
            </View>
          ))}
        </View>

        {/* AI 자동화 의사결정 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.ai_decision_section_title')}
          </Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.ai_decision_body')}
          </Text>
        </View>

        {/* 개인정보의 국외 이전 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.cross_border_section_title')}
          </Text>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>
              {t('privacy.cross_border_col_recipient')}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.primary }]}>
              {t('privacy.cross_border_col_purpose')}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 1, color: colors.primary }]}>
              {t('privacy.cross_border_col_country')}
            </Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>
              {t('privacy.cross_border_supabase_name')}
            </Text>
            <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>
              {t('privacy.cross_border_supabase_purpose')}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, color: colors.textSecondary }]}>
              {t('privacy.cross_border_supabase_country')}
            </Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>
              {t('privacy.cross_border_google_name')}
            </Text>
            <Text style={[styles.tableCell, { flex: 2, color: colors.textSecondary }]}>
              {t('privacy.cross_border_google_purpose')}
            </Text>
            <Text style={[styles.tableCell, { flex: 1, color: colors.textSecondary }]}>
              {t('privacy.cross_border_google_country')}
            </Text>
          </View>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.cross_border_detail')}
          </Text>
        </View>

        {/* 정보주체의 권리 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.rights_section_title')}
          </Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.rights_body')}
          </Text>
        </View>

        {/* 개인정보 보호책임자 */}
        <View style={[styles.contactContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>
            {t('privacy.dpo_section_title')}
          </Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.dpo_intro')}
          </Text>
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {t('privacy.dpo_name')}
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {t('privacy.dpo_position')}
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {t('privacy.dpo_org')}
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {t('privacy.dpo_email')}
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {t('privacy.dpo_support')}
            </Text>
          </View>
        </View>

        {/* 개인정보 파기 절차 및 방법 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.deletion_section_title')}
          </Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.deletion_body')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.deletion_procedure_heading')}</Text>{'\n'}
            {t('privacy.deletion_procedure_body')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.deletion_method_heading')}</Text>{'\n'}
            {t('privacy.deletion_method_body')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.deletion_legal_heading')}</Text>{'\n'}
            {t('privacy.deletion_legal_body')}
          </Text>
        </View>

        {/* 개인정보의 안전성 확보 조치 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.security_section_title')}
          </Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.security_intro')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.security_admin_heading')}</Text>{'\n'}
            {t('privacy.security_admin_body')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.security_tech_heading')}</Text>{'\n'}
            {t('privacy.security_tech_body')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.security_physical_heading')}</Text>{'\n'}
            {t('privacy.security_physical_body')}
          </Text>
        </View>

        {/* 개인정보 자동 수집 장치의 설치·운영 및 거부 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.auto_collect_section_title')}
          </Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.auto_collect_intro')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.auto_collect_items_heading')}</Text>{'\n'}
            {t('privacy.auto_collect_items_body')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.auto_collect_purpose_heading')}</Text>{'\n'}
            {t('privacy.auto_collect_purpose_body')}{'\n\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{t('privacy.auto_collect_opt_out_heading')}</Text>{'\n'}
            {t('privacy.auto_collect_opt_out_body')}
          </Text>
        </View>

        {/* 권익침해 구제방법 / 분쟁 해결 */}
        <View style={[styles.contactContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>
            {t('privacy.dispute_section_title')}
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            {t('privacy.dispute_line1')}
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            {t('privacy.dispute_line2')}
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            {t('privacy.dispute_line3')}
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            {t('privacy.dispute_line4')}
          </Text>
        </View>

        {/* 개인정보처리방침의 변경 */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>
            {t('privacy.changes_section_title')}
          </Text>
          <Text style={[styles.aiDecisionText, { color: colors.textSecondary }]}>
            {t('privacy.changes_body')}
          </Text>
        </View>

        {/* 마지막 업데이트 */}
        <Text style={[styles.lastUpdate, { color: colors.textTertiary }]}>
          {t('privacy.last_updated')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  zeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  zeroBannerText: {
    flex: 1,
  },
  zeroBannerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  zeroBannerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  policiesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  policyItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  policyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  policyDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
  tableContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tableTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 13,
  },
  contactContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    marginBottom: 6,
  },
  aiDecisionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  lastUpdate: {
    fontSize: 13,
    textAlign: 'center',
  },
});
