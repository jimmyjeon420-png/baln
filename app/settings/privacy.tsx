/**
 * 개인정보처리방침 화면 - Zero-Knowledge 정책
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  const privacyPolicies = [
    {
      icon: 'shield-checkmark',
      title: 'Zero-Knowledge 원칙',
      description:
        '당사는 귀하의 실제 자산 정보, 거래 비밀번호, 증권사 로그인 정보를 수집하거나 저장하지 않습니다. 앱은 스크린샷 이미지만 분석하며, 원본 이미지는 처리 후 즉시 삭제됩니다.',
    },
    {
      icon: 'lock-closed',
      title: '데이터 암호화',
      description:
        '모든 데이터는 전송 중 TLS 1.3으로 암호화되며, 저장 시 AES-256 암호화를 적용합니다. 암호화 키는 사용자 기기에서만 생성되고 관리됩니다.',
    },
    {
      icon: 'cloud-offline',
      title: '로컬 우선 처리',
      description:
        '가능한 한 모든 계산과 분석은 기기 내에서 수행됩니다. AI 분석이 필요한 경우에만 익명화된 데이터가 서버로 전송됩니다.',
    },
    {
      icon: 'eye-off',
      title: '익명화 처리',
      description:
        'AI 분석을 위해 전송되는 데이터는 개인 식별 정보가 모두 제거됩니다. 티커 심볼과 수량만 사용하며, 계좌번호나 실명은 전송되지 않습니다.',
    },
    {
      icon: 'trash',
      title: '데이터 삭제 권리',
      description:
        '언제든지 모든 데이터를 삭제할 수 있습니다. 설정 > 보안 > 계정 삭제에서 모든 데이터를 영구적으로 삭제할 수 있습니다. 삭제된 데이터는 복구할 수 없습니다.',
    },
    {
      icon: 'hand-left',
      title: '제3자 공유 금지',
      description:
        '귀하의 데이터는 광고, 마케팅, 또는 어떤 제3자 목적으로도 판매되거나 공유되지 않습니다. 법적 요구가 있는 경우에도 암호화된 데이터만 존재하므로 실질적인 정보 제공이 불가능합니다.',
    },
  ];

  const dataCollected = [
    { item: '이메일 주소', purpose: '계정 생성 및 로그인', retention: '계정 삭제 시까지' },
    { item: '포트폴리오 데이터', purpose: '자산 관리 및 분석', retention: '사용자 삭제 가능' },
    { item: 'AI 분석 로그', purpose: '서비스 품질 향상', retention: '30일 후 자동 삭제' },
    { item: '앱 사용 통계', purpose: '서비스 개선', retention: '익명화 후 저장' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보처리방침</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Zero-Knowledge 배너 */}
        <View style={styles.zeroBanner}>
          <Ionicons name="shield" size={40} color="#4CAF50" />
          <View style={styles.zeroBannerText}>
            <Text style={styles.zeroBannerTitle}>Zero-Knowledge 정책</Text>
            <Text style={styles.zeroBannerSubtitle}>
              당사는 귀하의 비밀을 알지 못합니다
            </Text>
          </View>
        </View>

        {/* 정책 목록 */}
        <View style={styles.policiesContainer}>
          {privacyPolicies.map((policy, index) => (
            <View key={index} style={styles.policyItem}>
              <View style={styles.policyIconContainer}>
                <Ionicons
                  name={policy.icon as any}
                  size={24}
                  color="#4CAF50"
                />
              </View>
              <View style={styles.policyContent}>
                <Text style={styles.policyTitle}>{policy.title}</Text>
                <Text style={styles.policyDescription}>{policy.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 수집 데이터 테이블 */}
        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>수집 데이터 현황</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>항목</Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>목적</Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>보관 기간</Text>
          </View>
          {dataCollected.map((data, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{data.item}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{data.purpose}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{data.retention}</Text>
            </View>
          ))}
        </View>

        {/* 연락처 */}
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>문의하기</Text>
          <Text style={styles.contactText}>
            개인정보 관련 문의: privacy@smartrebalancer.com
          </Text>
          <Text style={styles.contactText}>
            데이터 삭제 요청: delete@smartrebalancer.com
          </Text>
        </View>

        {/* 마지막 업데이트 */}
        <Text style={styles.lastUpdate}>
          마지막 업데이트: 2026년 2월 1일
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  zeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2E1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  zeroBannerText: {
    flex: 1,
  },
  zeroBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  zeroBannerSubtitle: {
    fontSize: 13,
    color: '#AAAAAA',
    marginTop: 4,
  },
  policiesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  policyItem: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  policyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  policyDescription: {
    fontSize: 13,
    color: '#AAAAAA',
    lineHeight: 20,
  },
  tableContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  tableCell: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  contactContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 13,
    color: '#AAAAAA',
    marginBottom: 6,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});
