/**
 * FreePeriodBanner - 창립 멤버 무료 기간 프로모션 배너
 *
 * 역할: "마케팅 홍보 전광판"
 * - compact={true}: 1줄 미니 배너 (처방전, 프로필 탭)
 * - compact={false}: 상세 배너 + 혜택 목록 (진단 탭)
 * - 무료 기간이 아니면 자동으로 숨김 (null 반환)
 * - 남은 일수 자동 계산
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isFreePeriod, getFreePeriodDaysLeft } from '../config/freePeriod';

interface FreePeriodBannerProps {
  compact?: boolean;
}

export default function FreePeriodBanner({ compact = false }: FreePeriodBannerProps) {
  // 무료 기간이 아니면 숨김
  if (!isFreePeriod()) return null;

  const daysLeft = getFreePeriodDaysLeft();

  // 미니 배너 (1줄)
  if (compact) {
    return (
      <View style={styles.compactBanner}>
        <Ionicons name="gift" size={14} color="#4CAF50" />
        <Text style={styles.compactText}>
          창립 멤버 혜택 — 5/31까지 모든 기능 무료!
        </Text>
        <View style={styles.dDayBadge}>
          <Text style={styles.dDayText}>D-{daysLeft}</Text>
        </View>
      </View>
    );
  }

  // 상세 배너
  return (
    <View style={styles.fullBanner}>
      <View style={styles.fullHeader}>
        <Ionicons name="gift" size={20} color="#4CAF50" />
        <Text style={styles.fullTitle}>창립 멤버 혜택</Text>
        <View style={styles.dDayBadge}>
          <Text style={styles.dDayText}>D-{daysLeft}</Text>
        </View>
      </View>

      <Text style={styles.fullSubtitle}>
        5/31까지 모든 기능 무료!
      </Text>

      {/* 혜택 목록 */}
      <View style={styles.benefitList}>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          <Text style={styles.benefitText}>AI 딥다이브 분석 무제한</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          <Text style={styles.benefitText}>What-If 시뮬레이션 무제한</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          <Text style={styles.benefitText}>세금 리포트 / AI CFO 상담</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          <Text style={styles.benefitText}>예측 게임 해설 + 복기</Text>
        </View>
      </View>

      <View style={styles.creditHint}>
        <Ionicons name="diamond" size={12} color="#7C4DFF" />
        <Text style={styles.creditHintText}>
          매일 출석 +2, 공유 +3 크레딧 적립 {'>'} 6월 이후에도 사용 가능!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 미니 배너
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    flex: 1,
  },
  dDayBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dDayText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  // 상세 배너
  fullBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fullTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#4CAF50',
  },
  fullSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 12,
    marginLeft: 28,
  },
  // 혜택 목록
  benefitList: {
    gap: 6,
    marginBottom: 12,
    marginLeft: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: '#CCC',
    fontWeight: '500',
  },
  // 크레딧 힌트
  creditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 77, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  creditHintText: {
    flex: 1,
    fontSize: 11,
    color: '#BB86FC',
    fontWeight: '500',
    lineHeight: 16,
  },
});
