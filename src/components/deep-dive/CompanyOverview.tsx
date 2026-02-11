/**
 * CompanyOverview.tsx - 회사 개요 카드
 *
 * 역할: "회사 기본 정보 한눈에 보기"
 * - 설립 연도, CEO, 본사, 업종
 * - 시가총액, 직원 수, 상장일
 * - 2-column 그리드 레이아웃
 * - 접기/펼치기 기능
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// Android LayoutAnimation 활성화
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// 타입 정의
// ============================================================================

/** CompanyOverview Props */
export interface CompanyOverviewProps {
  /** 회사명 */
  companyName: string;

  /** 설립 연도 */
  foundedYear?: number;

  /** CEO */
  ceo?: string;

  /** 본사 위치 */
  headquarters?: string;

  /** 업종 */
  industry?: string;

  /** 시가총액 (원) */
  marketCap?: number;

  /** 직원 수 */
  employeeCount?: number;

  /** 상장일 */
  ipoDate?: string;

  /** 웹사이트 URL */
  website?: string;

  /** 티커 심볼 */
  ticker?: string;

  /** 초기 펼침 상태 (기본: true) */
  initiallyExpanded?: boolean;
}

/** 정보 항목 */
interface InfoItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function CompanyOverview({
  companyName,
  foundedYear,
  ceo,
  headquarters,
  industry,
  marketCap,
  employeeCount,
  ipoDate,
  website,
  ticker,
  initiallyExpanded = true,
}: CompanyOverviewProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // 시가총액 포맷 (조/억)
  const formatMarketCap = (value: number): string => {
    if (value >= 1_000_000_000_000) {
      return `${(value / 1_000_000_000_000).toFixed(1)}조`;
    } else if (value >= 100_000_000) {
      return `${(value / 100_000_000).toFixed(0)}억`;
    }
    return `${value.toLocaleString()}원`;
  };

  // 직원 수 포맷
  const formatEmployeeCount = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}만명`;
    }
    return `${count.toLocaleString()}명`;
  };

  // 정보 항목 배열 생성
  const infoItems: InfoItem[] = [];

  if (foundedYear) {
    infoItems.push({
      icon: 'calendar',
      label: '설립',
      value: `${foundedYear}년`,
      color: '#4CAF50',
    });
  }

  if (ceo) {
    infoItems.push({
      icon: 'person',
      label: 'CEO',
      value: ceo,
      color: '#29B6F6',
    });
  }

  if (headquarters) {
    infoItems.push({
      icon: 'location',
      label: '본사',
      value: headquarters,
      color: '#FF9800',
    });
  }

  if (industry) {
    infoItems.push({
      icon: 'briefcase',
      label: '업종',
      value: industry,
      color: '#7C4DFF',
    });
  }

  if (marketCap) {
    infoItems.push({
      icon: 'analytics',
      label: '시가총액',
      value: formatMarketCap(marketCap),
      color: '#4CAF50',
    });
  }

  if (employeeCount) {
    infoItems.push({
      icon: 'people',
      label: '직원 수',
      value: formatEmployeeCount(employeeCount),
      color: '#29B6F6',
    });
  }

  if (ipoDate) {
    infoItems.push({
      icon: 'rocket',
      label: '상장일',
      value: ipoDate,
      color: '#FF9800',
    });
  }

  if (ticker) {
    infoItems.push({
      icon: 'pricetag',
      label: '티커',
      value: ticker,
      color: '#7C4DFF',
    });
  }

  // 펼침/접기 토글
  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* 헤더 */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="business" size={24} color="#4CAF50" />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              회사 개요
            </Text>
            <Text style={[styles.companyName, { color: colors.textSecondary }]}>
              {companyName}
            </Text>
          </View>
        </View>

        {/* 펼침/접기 아이콘 */}
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* 본문 (펼쳐졌을 때만) */}
      {isExpanded && (
        <View style={styles.content}>
          {/* 구분선 */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* 정보 그리드 (2-column) */}
          <View style={styles.infoGrid}>
            {infoItems.map((item, index) => (
              <View key={index} style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.color || colors.textSecondary}
                  />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* 웹사이트 링크 (있을 경우) */}
          {website && (
            <View style={styles.websiteContainer}>
              <Ionicons name="globe-outline" size={16} color="#29B6F6" />
              <Text style={[styles.websiteText, { color: '#29B6F6' }]}>
                {website}
              </Text>
            </View>
          )}

          {/* 빈 상태 (정보 없음) */}
          {infoItems.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="information-circle-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                회사 정보를 불러올 수 없습니다
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    // 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 13,
    fontWeight: '600',
  },

  // 구분선
  divider: {
    height: 1,
    marginVertical: 16,
  },

  // 본문
  content: {
    gap: 16,
  },

  // 정보 그리드 (2-column)
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '47%', // 2-column (약간의 gap 고려)
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 56,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },

  // 웹사이트
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  websiteText: {
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
