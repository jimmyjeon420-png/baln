/**
 * Pace Maker Benchmark - "다음 단계 상위 20%" 목표 배분 비교
 *
 * 변경: 억만장자/헤지펀드 → 현실적인 목표 페르소나
 * 예: 5억~10억원 구간의 상위 20% 투자자 포트폴리오
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WhaleAllocation, AllocationComparison, DEFAULT_TARGET_PERSONA } from '../services/whaleApi';
import { getLocaleCode } from '../utils/formatters';

interface WhaleBenchmarkProps {
  userAllocation: WhaleAllocation | undefined;
  whaleAllocation: WhaleAllocation | undefined;
  comparison: AllocationComparison[] | undefined;
  isLoading: boolean;
  onRefresh?: () => void;
}

// 카테고리별 색상
const CATEGORY_COLORS: { [key: string]: string } = {
  stock: '#4CAF50',
  bond: '#2196F3',
  realEstate: '#FF9800',
  crypto: '#9C27B0',
  cash: '#607D8B',
};

// 카테고리별 아이콘
const CATEGORY_ICONS: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  stock: 'trending-up',
  bond: 'document-text',
  realEstate: 'home',
  crypto: 'logo-bitcoin',
  cash: 'cash',
};

export default function WhaleBenchmark({
  userAllocation,
  whaleAllocation,
  comparison,
  isLoading,
  onRefresh,
}: WhaleBenchmarkProps) {
  // 로딩 상태
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.whaleIcon}>🎯</Text>
            <Text style={styles.title}>Pace Maker</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>목표 배분 데이터 로딩 중...</Text>
        </View>
      </View>
    );
  }

  // 데이터 없음
  if (!userAllocation || !whaleAllocation || !comparison) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.whaleIcon}>🎯</Text>
            <Text style={styles.title}>Pace Maker</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>자산을 추가하면 목표 배분과 비교할 수 있습니다</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.whaleIcon}>🎯</Text>
          <Text style={styles.title}>Pace Maker</Text>
        </View>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={18} color="#4CAF50" />
          </TouchableOpacity>
        )}
      </View>

      {/* 목표 페르소나 설명 */}
      <View style={styles.personaBox}>
        <Text style={styles.personaTitle}>
          {DEFAULT_TARGET_PERSONA.tierName} 구간 상위 {DEFAULT_TARGET_PERSONA.targetPercentile}%
        </Text>
        <Text style={styles.personaSubtitle}>
          {DEFAULT_TARGET_PERSONA.timeframeYears}년 내 목표 달성을 위한 추천 배분
        </Text>
      </View>

      {/* 비교 바 차트 */}
      <View style={styles.comparisonContainer}>
        {comparison.map((item, index) => {
          const color = CATEGORY_COLORS[item.category] || '#888888';
          const icon = CATEGORY_ICONS[item.category] || 'ellipse';
          const maxVal = Math.max(item.userAllocation, item.whaleAllocation, 1);

          return (
            <View key={index} style={styles.comparisonItem}>
              {/* 카테고리 헤더 */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryLeft}>
                  <Ionicons name={icon} size={16} color={color} />
                  <Text style={styles.categoryLabel}>{item.label}</Text>
                </View>
                <View style={styles.categoryValues}>
                  <Text style={styles.userValue}>{item.userAllocation}%</Text>
                  <Text style={styles.separator}>vs</Text>
                  <Text style={styles.whaleValue}>{item.whaleAllocation}%</Text>
                </View>
              </View>

              {/* 비교 바 */}
              <View style={styles.barsContainer}>
                {/* 사용자 바 */}
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>나</Text>
                  <View style={styles.barBackground}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${(item.userAllocation / maxVal) * 100}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* 목표 바 */}
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>🎯</Text>
                  <View style={styles.barBackground}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${(item.whaleAllocation / maxVal) * 100}%`,
                          backgroundColor: '#555555',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* 추천 */}
              {Math.abs(item.difference) > 5 && (
                <View
                  style={[
                    styles.recommendationBadge,
                    {
                      backgroundColor:
                        item.difference > 0 ? '#2A2E1A' : '#1A2E2A',
                    },
                  ]}
                >
                  <Ionicons
                    name={item.difference > 0 ? 'arrow-down' : 'arrow-up'}
                    size={12}
                    color={item.difference > 0 ? '#FFC107' : '#4CAF50'}
                  />
                  <Text
                    style={[
                      styles.recommendationText,
                      { color: item.difference > 0 ? '#FFC107' : '#4CAF50' },
                    ]}
                  >
                    {item.recommendation}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 범례 */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>내 포트폴리오</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#555555' }]} />
          <Text style={styles.legendText}>상위 20% 목표</Text>
        </View>
      </View>

      {/* 핵심 조언 메시지 */}
      <View style={styles.adviceBox}>
        <Ionicons name="bulb" size={16} color="#FFC107" />
        <Text style={styles.adviceText}>
          {DEFAULT_TARGET_PERSONA.timeframeYears}년 내 {DEFAULT_TARGET_PERSONA.tierName} 상위 {DEFAULT_TARGET_PERSONA.targetPercentile}%에 도달하려면, Tech 주식 비중을 높이세요.
        </Text>
      </View>

      {/* 업데이트 시간 */}
      <Text style={styles.updateTime}>
        마지막 업데이트: {new Date(whaleAllocation.updatedAt).toLocaleDateString(getLocaleCode())}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whaleIcon: {
    fontSize: 25,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
  },
  description: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  // 페르소나 박스
  personaBox: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  personaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  personaSubtitle: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  // 조언 박스
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2A2E1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  adviceText: {
    flex: 1,
    fontSize: 14,
    color: '#FFC107',
    lineHeight: 19,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#888888',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#888888',
  },
  comparisonContainer: {
    gap: 16,
  },
  comparisonItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  separator: {
    fontSize: 13,
    color: '#666666',
  },
  whaleValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888888',
  },
  barsContainer: {
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 13,
    color: '#888888',
    width: 20,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: '#888888',
  },
  updateTime: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
    marginTop: 12,
  },
});
