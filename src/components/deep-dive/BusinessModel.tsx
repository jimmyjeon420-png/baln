/**
 * BusinessModel.tsx - 투자심사보고서: 비즈니스 모델 섹션
 *
 * 역할: "사업 분석 부서"
 * - 수익 구조 설명
 * - 핵심 경쟁력 (Moat) 분석
 * - 시장 규모 (TAM) 추정
 * - 성장 전략 평가
 *
 * 사용 예:
 * <BusinessModel
 *   revenueModel="광고 수익 85%, 구독 수익 15%"
 *   moat={["네트워크 효과", "데이터 우위", "브랜드 인지도"]}
 *   tam="글로벌 광고 시장 $800B, 성장률 8%/년"
 *   growthStrategy={["신흥 시장 진출", "AI 기능 강화", "커머스 확장"]}
 * />
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BusinessModelProps {
  /** 수익 구조 설명 */
  revenueModel: string;
  /** 핵심 경쟁력 (Moat) 목록 */
  moat: string[];
  /** 시장 규모 (TAM) 설명 */
  tam: string;
  /** 성장 전략 목록 */
  growthStrategy: string[];
  /** 추가 설명 (선택) */
  notes?: string;
}

export function BusinessModel({
  revenueModel,
  moat,
  tam,
  growthStrategy,
  notes,
}: BusinessModelProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Ionicons name="business" size={28} color="#9333EA" />
        <Text style={styles.headerTitle}>비즈니스 모델</Text>
      </View>

      {/* 1. 수익 구조 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>💰</Text>
          <Text style={styles.sectionTitle}>수익 구조</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.descriptionText}>{revenueModel}</Text>
        </View>
      </View>

      {/* 2. 핵심 경쟁력 (Moat) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>🏰</Text>
          <Text style={styles.sectionTitle}>핵심 경쟁력 (Moat)</Text>
        </View>
        <View style={styles.card}>
          {moat.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.bullet} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 3. 시장 규모 (TAM) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>🌍</Text>
          <Text style={styles.sectionTitle}>시장 규모 (TAM)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.descriptionText}>{tam}</Text>
        </View>
      </View>

      {/* 4. 성장 전략 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.icon}>📈</Text>
          <Text style={styles.sectionTitle}>성장 전략</Text>
        </View>
        <View style={styles.card}>
          {growthStrategy.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <View style={[styles.bullet, styles.bulletGreen]} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 추가 노트 */}
      {notes && (
        <View style={styles.notesCard}>
          <Ionicons name="information-circle" size={16} color="#6B7280" />
          <Text style={styles.notesText}>{notes}</Text>
        </View>
      )}

      {/* 하단 여백 */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  descriptionText: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 22,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9333EA',
    marginTop: 7,
    marginRight: 10,
  },
  bulletGreen: {
    backgroundColor: '#10B981',
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 22,
  },
  notesCard: {
    flexDirection: 'row',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginTop: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    marginLeft: 8,
  },
});
