/**
 * 도움말 화면
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useLocale } from '../../src/context/LocaleContext';

export default function HelpScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();

  const faqItems = [
    { question: t('settings.help.faq_q1'), answer: t('settings.help.faq_a1') },
    { question: t('settings.help.faq_q2'), answer: t('settings.help.faq_a2') },
    { question: t('settings.help.faq_q3'), answer: t('settings.help.faq_a3') },
    { question: t('settings.help.faq_q4'), answer: t('settings.help.faq_a4') },
    { question: t('settings.help.faq_q5'), answer: t('settings.help.faq_a5') },
    { question: t('settings.help.faq_q6'), answer: t('settings.help.faq_a6') },
    { question: t('settings.help.faq_q7'), answer: t('settings.help.faq_a7') },
    { question: t('settings.help.faq_q8'), answer: t('settings.help.faq_a8') },
  ];

  const SUPPORT_EMAIL = 'baln.logic@gmail.com';

  const supportItems = [
    { icon: 'mail-outline', label: t('settings.help.email_label'), desc: SUPPORT_EMAIL, action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=[baln] 문의`) },
    { icon: 'chatbubble-ellipses-outline', label: t('settings.help.feedback_label'), desc: t('settings.help.feedback_desc'), action: () => {} },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title={t('settings.help.title')} />

      <ScrollView style={styles.content}>
        {/* FAQ 섹션 */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.help.faq')}</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {faqItems.map((item, index) => (
            <View key={index} style={[styles.faqItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>{item.question}</Text>
              <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* 문의하기 섹션 */}
        <Text style={[styles.sectionTitle, { marginTop: 24, color: colors.textTertiary }]}>{t('settings.help.contact')}</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {supportItems.map((item, index) => (
            <TouchableOpacity key={index} style={[styles.supportItem, { borderBottomColor: colors.border }]} onPress={item.action}>
              <Ionicons name={item.icon as any} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.supportLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.supportDesc, { color: colors.textTertiary }]}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  faqItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 15,
    lineHeight: 21,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  supportLabel: {
    fontSize: 17,
  },
  supportDesc: {
    fontSize: 13,
    marginTop: 2,
  },
});
