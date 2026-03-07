/**
 * ExecutiveSummary.tsx - 투자심사보고서 요약 카드
 *
 * 역할: "한 눈에 보는 투자 의견"
 * - 투자 추천 (매수/매도/보유) + 신뢰도 별점
 * - 목표 주가 + 기대 수익률
 * - 핵심 근거 3가지 (bullet points)
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
import { useLocale } from '../../context/LocaleContext';
import { getCurrencySymbol } from '../../utils/formatters';

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

/** 투자 추천 의견 */
export type InvestmentRecommendation = 'BUY' | 'SELL' | 'HOLD';

/** ExecutiveSummary Props */
export interface ExecutiveSummaryProps {
  /** 투자 추천 (매수/매도/보유) */
  recommendation: InvestmentRecommendation;

  /** 신뢰도 별점 (1-5) */
  confidenceRating: 1 | 2 | 3 | 4 | 5;

  /** 현재 주가 */
  currentPrice: number;

  /** 목표 주가 */
  targetPrice: number;

  /** 핵심 근거 (최대 5개) */
  keyPoints: string[];

  /** 애널리스트 이름 (옵션) */
  analystName?: string;

  /** 발행일 (옵션) */
  publishedDate?: string;

  /** 초기 펼침 상태 (기본: true) */
  initiallyExpanded?: boolean;
}

// ============================================================================
// 추천 의견별 설정
// ============================================================================

const RECOMMENDATION_CONFIG = {
  BUY: {
    labelKey: 'deepDive.executiveSummary.buy',
    emoji: '📈',
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    icon: 'trending-up' as const,
  },
  SELL: {
    labelKey: 'deepDive.executiveSummary.sell',
    emoji: '📉',
    color: '#CF6679',
    bgColor: 'rgba(207, 102, 121, 0.15)',
    borderColor: 'rgba(207, 102, 121, 0.3)',
    icon: 'trending-down' as const,
  },
  HOLD: {
    labelKey: 'deepDive.executiveSummary.hold',
    emoji: '⏸️',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
    icon: 'pause' as const,
  },
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ExecutiveSummary({
  recommendation,
  confidenceRating,
  currentPrice,
  targetPrice,
  keyPoints,
  analystName,
  publishedDate,
  initiallyExpanded = true,
}: ExecutiveSummaryProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const config = RECOMMENDATION_CONFIG[recommendation];

  // 기대 수익률 계산
  const expectedReturn = ((targetPrice - currentPrice) / currentPrice) * 100;
  const isPositiveReturn = expectedReturn > 0;

  // 별점 렌더링
  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < confidenceRating ? 'star' : 'star-outline'}
        size={16}
        color={index < confidenceRating ? '#FFD700' : '#555555'}
      />
    ));
  };

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
          borderColor: config.borderColor,
        },
      ]}
    >
      {/* 헤더: 추천 + 별점 */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {/* 추천 배지 */}
          <View
            style={[
              styles.recommendationBadge,
              {
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
              },
            ]}
          >
            <Text style={styles.recommendationEmoji}>{config.emoji}</Text>
            <Text style={[styles.recommendationText, { color: config.color }]}>
              {t(config.labelKey)}
            </Text>
          </View>

          {/* 별점 */}
          <View style={styles.ratingContainer}>{renderStars()}</View>
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

          {/* 가격 정보 */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                  {t('deepDive.executiveSummary.currentPrice')}
                </Text>
                <Text style={[styles.priceValue, { color: colors.textPrimary }]}>
                  {getCurrencySymbol()}{currentPrice.toLocaleString()}
                </Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={20}
                color={colors.textSecondary}
                style={styles.arrowIcon}
              />

              <View style={styles.priceItem}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                  {t('deepDive.executiveSummary.targetPrice')}
                </Text>
                <Text style={[styles.priceValue, { color: config.color }]}>
                  {getCurrencySymbol()}{targetPrice.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* 기대 수익률 */}
            <View
              style={[
                styles.returnBadge,
                {
                  backgroundColor: isPositiveReturn
                    ? 'rgba(76, 175, 80, 0.15)'
                    : 'rgba(207, 102, 121, 0.15)',
                },
              ]}
            >
              <Ionicons
                name={isPositiveReturn ? 'trending-up' : 'trending-down'}
                size={16}
                color={isPositiveReturn ? '#4CAF50' : '#CF6679'}
              />
              <Text
                style={[
                  styles.returnText,
                  { color: isPositiveReturn ? '#4CAF50' : '#CF6679' },
                ]}
              >
                {isPositiveReturn ? '+' : ''}
                {expectedReturn.toFixed(2)}% {t('deepDive.executiveSummary.expectedReturn')}
              </Text>
            </View>
          </View>

          {/* 핵심 근거 */}
          <View style={styles.keyPointsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('deepDive.executiveSummary.keyPoints')}
            </Text>
            {keyPoints.slice(0, 5).map((point, index) => (
              <View key={index} style={styles.keyPointItem}>
                <View
                  style={[styles.bulletDot, { backgroundColor: config.color }]}
                />
                <Text style={[styles.keyPointText, { color: colors.textSecondary }]}>
                  {point}
                </Text>
              </View>
            ))}
          </View>

          {/* 하단 메타 정보 */}
          {(analystName || publishedDate) && (
            <View style={styles.footer}>
              {analystName && (
                <View style={styles.footerItem}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                    {analystName}
                  </Text>
                </View>
              )}
              {publishedDate && (
                <View style={styles.footerItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                    {publishedDate}
                  </Text>
                </View>
              )}
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
    borderWidth: 1.5,
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

  // 추천 배지
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  recommendationEmoji: {
    fontSize: 19,
  },
  recommendationText: {
    fontSize: 17,
    fontWeight: '800',
  },

  // 별점
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
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

  // 가격 섹션
  priceSection: {
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceItem: {
    flex: 1,
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 21,
    fontWeight: '800',
  },
  arrowIcon: {
    marginHorizontal: 8,
  },

  // 기대 수익률 배지
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  returnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // 핵심 근거
  keyPointsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },

  // 하단 메타
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
  },
});
