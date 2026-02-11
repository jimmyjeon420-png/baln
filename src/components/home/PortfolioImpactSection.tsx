/**
 * PortfolioImpactSection - 내 포트폴리오 영향도 섹션
 *
 * 역할: 오늘 맥락이 내 자산에 미친 영향을 시각화
 * 비유: 건강검진 결과처럼 "당신에게는 이렇게 영향을 줬습니다" 보여주는 섹션
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface PortfolioImpactData {
  /** 수익률 변화 (%) */
  percentChange: number;
  /** 건강 점수 변화 */
  healthScoreChange: number;
  /** 영향도 메시지 */
  message: string;
}

interface PortfolioImpactSectionProps {
  /** 포트폴리오 영향도 데이터 */
  data: PortfolioImpactData;
}

/**
 * 포트폴리오 영향도 섹션 컴포넌트
 *
 * @example
 * ```tsx
 * <PortfolioImpactSection
 *   data={{
 *     percentChange: -1.2,
 *     healthScoreChange: 0,
 *     message: '당신의 포트폴리오는 -1.2% 영향, 건강 점수 변동 없음'
 *   }}
 * />
 * ```
 */
export function PortfolioImpactSection({ data }: PortfolioImpactSectionProps) {
  const { colors } = useTheme();

  // 수익률 변화 색상
  const changeColor = data.percentChange >= 0 ? colors.buy : colors.sell;
  const changeBgColor = data.percentChange >= 0
    ? 'rgba(76, 175, 80, 0.1)'
    : 'rgba(207, 102, 121, 0.1)';

  // 원화 환산 (임시: -1.2% → -120,000원)
  const krwImpact = (data.percentChange * 1000000).toFixed(0);
  const formattedKRW = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(Number(krwImpact));

  return (
    <View style={[s.container, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
      {/* 제목 */}
      <View style={s.headerRow}>
        <Ionicons name="analytics-outline" size={18} color="#2196F3" />
        <Text style={[s.headerText, { color: colors.textSecondary }]}>
          오늘 맥락이 내 자산에 미친 영향
        </Text>
      </View>

      {/* 수익률 변화 */}
      <View style={[s.changeBox, { backgroundColor: changeBgColor }]}>
        <Text style={[s.changeValue, { color: changeColor }]}>
          {data.percentChange > 0 ? '+' : ''}
          {data.percentChange.toFixed(1)}%
        </Text>
        <Text style={[s.changeLabel, { color: colors.textSecondary }]}>
          {data.percentChange >= 0 ? '예상 수익' : '예상 손실'}: {formattedKRW}
        </Text>
      </View>

      {/* 건강 점수 변화 */}
      <View style={[s.healthBox, { backgroundColor: colors.surface }]}>
        <Text style={[s.healthLabel, { color: colors.textSecondary }]}>건강 점수</Text>
        <View style={s.healthValueRow}>
          {data.healthScoreChange === 0 ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={[s.healthValue, { color: colors.textPrimary }]}>
                변동 없음
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name={data.healthScoreChange > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={18}
                color={data.healthScoreChange > 0 ? '#4CAF50' : '#CF6679'}
              />
              <Text style={[s.healthValue, {
                color: data.healthScoreChange > 0 ? colors.buy : colors.sell
              }]}>
                {data.healthScoreChange > 0 ? '+' : ''}
                {data.healthScoreChange}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* AI 조언 메시지 */}
      <View style={s.adviceRow}>
        <Ionicons name="bulb-outline" size={16} color="#FFC107" style={s.adviceIcon} />
        <Text style={[s.adviceText, { color: colors.textSecondary }]}>
          {data.message}
        </Text>
      </View>
    </View>
  );
}

/**
 * 기본 export (호환성)
 */
export default PortfolioImpactSection;

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 13,
    marginLeft: 8,
  },
  changeBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  changeValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  changeLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  healthBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 13,
  },
  healthValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthValue: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  adviceRow: {
    flexDirection: 'row',
  },
  adviceIcon: {
    marginTop: 4,
  },
  adviceText: {
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
});
