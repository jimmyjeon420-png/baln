/**
 * 이용약관 화면
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>이용약관</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>스마트 리밸런서 서비스 이용약관</Text>
        <Text style={styles.date}>최종 수정일: 2026년 2월 1일</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제1조 (목적)</Text>
          <Text style={styles.sectionContent}>
            이 약관은 스마트 리밸런서(이하 "회사")가 제공하는 포트폴리오 관리 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 회원 간의 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제2조 (서비스의 내용)</Text>
          <Text style={styles.sectionContent}>
            1. 포트폴리오 현황 관리 및 시각화{'\n'}
            2. AI 기반 자산 분석 및 추출{'\n'}
            3. 리밸런싱 추천 및 시뮬레이션{'\n'}
            4. 세금 최적화 계산{'\n'}
            5. 기타 포트폴리오 관련 부가 서비스
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제3조 (면책조항)</Text>
          <Text style={styles.sectionContent}>
            1. 본 서비스는 투자 자문 서비스가 아닙니다.{'\n'}
            2. 서비스에서 제공하는 정보는 참고용이며, 투자 결정에 대한 책임은 이용자에게 있습니다.{'\n'}
            3. 회사는 서비스 이용으로 인한 투자 손실에 대해 책임지지 않습니다.{'\n'}
            4. AI 분석 결과의 정확성을 100% 보장하지 않습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제4조 (개인정보 보호)</Text>
          <Text style={styles.sectionContent}>
            회사는 관련 법령이 정하는 바에 따라 회원의 개인정보를 보호하며, 개인정보의 보호 및 사용에 대해서는 개인정보처리방침을 따릅니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제5조 (서비스 이용 제한)</Text>
          <Text style={styles.sectionContent}>
            다음의 경우 서비스 이용이 제한될 수 있습니다:{'\n'}
            1. 타인의 정보 도용{'\n'}
            2. 서비스 운영 방해{'\n'}
            3. 법령 위반 행위{'\n'}
            4. 기타 회사가 정한 이용규칙 위반
          </Text>
        </View>

        <Text style={styles.footer}>
          본 약관에 동의하지 않으실 경우 서비스 이용이 제한될 수 있습니다.
        </Text>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  footer: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
});
