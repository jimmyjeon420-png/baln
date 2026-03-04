/**
 * Valuation.tsx - 밸류에이션 분석 섹션
 *
 * 역할: 현재가/적정가/목표가 비교 + PER/PBR/PSR vs 업계 평균
 * 비유: "가격표 비교표" - 현재 가격이 적정한지 한눈에 확인
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ValuationMetrics {
  currentPrice: number;      // 현재가
  fairValue: number;         // 적정가
  targetPrice: number;       // 목표가 (1년)
  currency: string;          // 통화 (KRW, USD)

  // 멀티플 지표
  per: number;               // PER (Price-to-Earnings Ratio)
  pbr: number;               // PBR (Price-to-Book Ratio)
  psr: number;               // PSR (Price-to-Sales Ratio)

  // 업계 평균
  industryAvgPer: number;
  industryAvgPbr: number;
  industryAvgPsr: number;
}

interface ValuationProps {
  data: ValuationMetrics;
  onRefresh?: () => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function Valuation({ data, onRefresh: _onRefresh }: ValuationProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // 저평가/고평가 판정
  const upside = ((data.fairValue - data.currentPrice) / data.currentPrice) * 100;
  const isUndervalued = upside > 10;
  const isOvervalued = upside < -10;
  const valuationColor = isUndervalued ? colors.buy : isOvervalued ? colors.sell : colors.neutral;
  const valuationLabel = isUndervalued ? '저평가' : isOvervalued ? '고평가' : '적정가';

  // 가격 포맷
  const formatPrice = (price: number) => {
    if (data.currency === 'KRW') {
      return `₩${price.toLocaleString()}`;
    }
    return `$${price.toFixed(2)}`;
  };

  // 멀티플 비교 (vs 업계 평균)
  const compareMultiple = (value: number, industryAvg: number) => {
    const diff = ((value - industryAvg) / industryAvg) * 100;
    return {
      diff,
      isLow: diff < -10,
      isHigh: diff > 10,
      color: diff < -10 ? colors.buy : diff > 10 ? colors.sell : colors.neutral,
    };
  };

  const perComparison = compareMultiple(data.per, data.industryAvgPer);
  const pbrComparison = compareMultiple(data.pbr, data.industryAvgPbr);
  const psrComparison = compareMultiple(data.psr, data.industryAvgPsr);

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 헤더 */}
      <View style={s.headerRow}>
        <View>
          <Text style={[s.cardTitle, { color: colors.textPrimary }]}>💰 밸류에이션</Text>
          <Text style={[s.cardSubtitle, { color: colors.textTertiary }]}>Valuation Analysis</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* 저평가/고평가 뱃지 */}
          <View style={[s.valuationBadge, { backgroundColor: valuationColor + '20' }]}>
            <Text style={[s.valuationBadgeText, { color: valuationColor }]}>{valuationLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 가격 비교 (항상 표시) */}
      <View style={s.priceRow}>
        {/* 현재가 */}
        <View style={s.priceItem}>
          <Text style={[s.priceLabel, { color: colors.textSecondary }]}>현재가</Text>
          <Text style={[s.priceValue, { color: colors.textPrimary }]}>
            {formatPrice(data.currentPrice)}
          </Text>
        </View>

        {/* 화살표 */}
        <Ionicons name="arrow-forward" size={24} color={colors.textTertiary} style={s.arrow} />

        {/* 적정가 */}
        <View style={s.priceItem}>
          <Text style={[s.priceLabel, { color: colors.textSecondary }]}>적정가</Text>
          <Text style={[s.priceValue, { color: valuationColor }]}>
            {formatPrice(data.fairValue)}
          </Text>
          <Text style={[s.upsideText, { color: valuationColor }]}>
            {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
          </Text>
        </View>

        {/* 화살표 */}
        <Ionicons name="arrow-forward" size={24} color={colors.textTertiary} style={s.arrow} />

        {/* 목표가 */}
        <View style={s.priceItem}>
          <Text style={[s.priceLabel, { color: colors.textSecondary }]}>목표가 (1년)</Text>
          <Text style={[s.priceValue, { color: colors.primary }]}>
            {formatPrice(data.targetPrice)}
          </Text>
        </View>
      </View>

      {/* 상세 정보 (펼쳐진 상태) */}
      {expanded && (
        <View style={[s.detailContainer, { borderTopColor: colors.border }]}>
          {/* 멀티플 비교 테이블 */}
          <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>
            📊 멀티플 vs 업계 평균
          </Text>

          {/* PER */}
          <View style={[s.multipleRow, { backgroundColor: colors.surfaceLight }]}>
            <View style={s.multipleLeft}>
              <Text style={[s.multipleName, { color: colors.textPrimary }]}>PER</Text>
              <Text style={[s.multipleDesc, { color: colors.textTertiary }]}>주가수익비율</Text>
            </View>
            <View style={s.multipleRight}>
              <Text style={[s.multipleValue, { color: colors.textPrimary }]}>{data.per.toFixed(2)}배</Text>
              <Ionicons
                name="remove-outline"
                size={16}
                color={colors.textTertiary}
                style={{ marginHorizontal: 8 }}
              />
              <Text style={[s.multipleAvg, { color: colors.textSecondary }]}>
                업계 {data.industryAvgPer.toFixed(2)}배
              </Text>
              <Text style={[s.multipleDiff, { color: perComparison.color }]}>
                {perComparison.diff > 0 ? '+' : ''}{perComparison.diff.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* PBR */}
          <View style={[s.multipleRow, { backgroundColor: colors.surfaceLight }]}>
            <View style={s.multipleLeft}>
              <Text style={[s.multipleName, { color: colors.textPrimary }]}>PBR</Text>
              <Text style={[s.multipleDesc, { color: colors.textTertiary }]}>주가순자산비율</Text>
            </View>
            <View style={s.multipleRight}>
              <Text style={[s.multipleValue, { color: colors.textPrimary }]}>{data.pbr.toFixed(2)}배</Text>
              <Ionicons
                name="remove-outline"
                size={16}
                color={colors.textTertiary}
                style={{ marginHorizontal: 8 }}
              />
              <Text style={[s.multipleAvg, { color: colors.textSecondary }]}>
                업계 {data.industryAvgPbr.toFixed(2)}배
              </Text>
              <Text style={[s.multipleDiff, { color: pbrComparison.color }]}>
                {pbrComparison.diff > 0 ? '+' : ''}{pbrComparison.diff.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* PSR */}
          <View style={[s.multipleRow, { backgroundColor: colors.surfaceLight }]}>
            <View style={s.multipleLeft}>
              <Text style={[s.multipleName, { color: colors.textPrimary }]}>PSR</Text>
              <Text style={[s.multipleDesc, { color: colors.textTertiary }]}>주가매출비율</Text>
            </View>
            <View style={s.multipleRight}>
              <Text style={[s.multipleValue, { color: colors.textPrimary }]}>{data.psr.toFixed(2)}배</Text>
              <Ionicons
                name="remove-outline"
                size={16}
                color={colors.textTertiary}
                style={{ marginHorizontal: 8 }}
              />
              <Text style={[s.multipleAvg, { color: colors.textSecondary }]}>
                업계 {data.industryAvgPsr.toFixed(2)}배
              </Text>
              <Text style={[s.multipleDiff, { color: psrComparison.color }]}>
                {psrComparison.diff > 0 ? '+' : ''}{psrComparison.diff.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* 해석 가이드 */}
          <View style={[s.guideBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[s.guideText, { color: colors.textSecondary }]}>
              {isUndervalued
                ? '✅ 업계 평균 대비 저평가 구간입니다. 단, 실적 성장성도 함께 고려하세요.'
                : isOvervalued
                ? '⚠️ 업계 평균 대비 고평가 구간입니다. 프리미엄이 정당한지 확인하세요.'
                : '📌 업계 평균과 유사한 수준입니다. 다른 지표도 함께 확인하세요.'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valuationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  valuationBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // 가격 비교 행
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 21,
    fontWeight: '700',
  },
  upsideText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  arrow: {
    marginHorizontal: 4,
  },

  // 상세 정보
  detailContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },

  // 멀티플 행
  multipleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  multipleLeft: {
    gap: 2,
  },
  multipleName: {
    fontSize: 15,
    fontWeight: '700',
  },
  multipleDesc: {
    fontSize: 12,
  },
  multipleRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multipleValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  multipleAvg: {
    fontSize: 14,
  },
  multipleDiff: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // 가이드
  guideBox: {
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  guideText: {
    fontSize: 14,
    lineHeight: 21,
  },
});
