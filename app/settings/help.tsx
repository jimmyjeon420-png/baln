/**
 * 도움말 화면
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HelpScreen() {
  const router = useRouter();

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

  const supportItems = [
    { icon: 'mail-outline', label: '이메일 문의', action: () => Linking.openURL('mailto:support@smartrebalancer.com') },
    { icon: 'chatbubble-outline', label: '카카오톡 문의', action: () => Linking.openURL('https://pf.kakao.com/_example') },
    { icon: 'logo-github', label: 'GitHub', action: () => Linking.openURL('https://github.com/smart-rebalancer') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>도움말</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* FAQ 섹션 */}
        <Text style={styles.sectionTitle}>자주 묻는 질문</Text>
        <View style={styles.section}>
          {faqItems.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* 문의하기 섹션 */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>문의하기</Text>
        <View style={styles.section}>
          {supportItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.supportItem} onPress={item.action}>
              <Ionicons name={item.icon as any} size={22} color="#4CAF50" />
              <Text style={styles.supportLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#888888" />
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
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  faqItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 20,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    gap: 12,
  },
  supportLabel: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
