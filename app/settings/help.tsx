/**
 * 도움말 화면
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';

export default function HelpScreen() {
  const { colors } = useTheme();

  const faqItems = [
    {
      question: '리밸런싱이란 무엇인가요?',
      answer: '리밸런싱은 포트폴리오의 자산 비중을 목표 비율에 맞게 재조정하는 것입니다. 시장 변동으로 인해 변경된 자산 비중을 원래 목표한 비율로 되돌립니다.',
    },
    {
      question: 'AI 분석은 어떻게 작동하나요?',
      answer: 'Google Gemini AI를 활용하여 증권사 앱 스크린샷에서 자산 정보를 자동으로 추출합니다. OCR 기술과 AI 분석을 결합하여 정확한 데이터를 제공합니다.',
    },
    {
      question: '세금 최적화는 어떻게 되나요?',
      answer: '매도 시 발생하는 양도소득세를 고려하여 최적의 리밸런싱 전략을 제안합니다. 세금 부담을 최소화하면서 포트폴리오를 조정할 수 있습니다.',
    },
    {
      question: '데이터는 안전한가요?',
      answer: '모든 데이터는 암호화되어 Supabase 클라우드에 저장됩니다. 개인정보와 금융 데이터는 엄격한 보안 정책에 따라 관리됩니다.',
    },
  ];

  const SUPPORT_EMAIL = 'baln.logic@gmail.com';

  const supportItems = [
    { icon: 'mail-outline', label: '이메일 문의', desc: SUPPORT_EMAIL, action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=[baln] 문의`) },
    { icon: 'chatbubble-outline', label: '카카오톡 문의', desc: SUPPORT_EMAIL, action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=[baln] 카카오톡 문의`) },
    { icon: 'logo-github', label: 'GitHub 문의', desc: SUPPORT_EMAIL, action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=[baln] GitHub 문의`) },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderBar title="도움말" />

      <ScrollView style={styles.content}>
        {/* FAQ 섹션 */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>자주 묻는 질문</Text>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {faqItems.map((item, index) => (
            <View key={index} style={[styles.faqItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>{item.question}</Text>
              <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* 문의하기 섹션 */}
        <Text style={[styles.sectionTitle, { marginTop: 24, color: colors.textTertiary }]}>문의하기</Text>
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
    fontSize: 14,
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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  supportLabel: {
    fontSize: 16,
  },
  supportDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
