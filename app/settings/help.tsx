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
    {
      question: 'baln은 어떤 앱인가요?',
      answer: '매일 5분씩 시장 맥락을 읽고, 예측에 참여하고, 복기하면서 자기만의 투자 기준을 만드는 투자 교육 앱입니다. 직접 매매를 하는 앱이 아닙니다.',
    },
    {
      question: '맥락 카드란 무엇인가요?',
      answer: '오늘 내 자산이 왜 이렇게 움직였는지 4겹 분석(역사적 맥락, 거시경제 체인, 기관 행동, 내 포트폴리오 영향)으로 5분 안에 이해할 수 있는 카드입니다. 3시간마다 자동 업데이트됩니다.',
    },
    {
      question: '예측 게임은 어떻게 참여하나요?',
      answer: '매일 3개의 시장 예측 질문에 YES/NO로 투표합니다. 다음날 결과를 확인하고 해설을 통해 복기합니다. 적중 시 3크레딧을 획득합니다.',
    },
    {
      question: '크레딧은 어떻게 사용하나요?',
      answer: '1크레딧 = 100원 가치입니다. 출석(2C), 예측 적중(3C), 공유(5C)로 무료 획득 가능하며, AI 분석 추가(1C), Premium 체험(5C) 등 마켓플레이스에서 사용합니다.',
    },
    {
      question: 'AI 건강 진단은 어떻게 작동하나요?',
      answer: '포트폴리오의 분산도, 변동성, 집중도 등 7가지 요소를 AI가 분석하여 A+~F 등급으로 진단합니다. 처방전과 함께 구체적인 개선 방향도 제시합니다.',
    },
    {
      question: '투자 거장 인사이트는 뭔가요?',
      answer: '워렌 버핏, 레이 달리오, 캐시 우드, 스탠리 드러킨밀러 등 세계적 투자자의 철학을 AI가 분석하여 오늘 시장에 적용한 인사이트를 매일 제공합니다.',
    },
    {
      question: '내 데이터는 안전한가요?',
      answer: '제로 지식(Zero-Knowledge) 원칙으로 운영합니다. 증권사 비밀번호, 계좌번호를 수집하지 않으며, 모든 데이터는 TLS 1.3 + AES-256으로 암호화됩니다.',
    },
    {
      question: 'Premium 구독은 어떤 혜택이 있나요?',
      answer: '맥락 카드 전체 4겹 분석, 예측 해설 + 복기, AI 진단 3회/일, 기관 행동 분석, 또래 비교 전체 등급, 매월 30C 보너스를 제공합니다. 월 ₩4,900입니다.',
    },
  ];

  const SUPPORT_EMAIL = 'baln.logic@gmail.com';

  const supportItems = [
    { icon: 'mail-outline', label: '이메일 문의', desc: SUPPORT_EMAIL, action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=[baln] 문의`) },
    { icon: 'chatbubble-ellipses-outline', label: '앱 내 피드백', desc: '설정 > 도움말에서 문의할 수 있습니다', action: () => {} },
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
