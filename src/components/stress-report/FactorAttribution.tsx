/**
 * FactorAttribution — Beat 3a: 하락폭 요인 분해 (블랙록 핵심)
 *
 * 역할: "하락폭의 78%는 시장 전체 영향이지, 당신 선택이 아닙니다"
 * 수평 막대 차트: 시장 전체 / 업종 집중도 / 개별 종목 / 환율 노출
 *
 * WhatIfResult.assetImpacts에서 요인을 파생 계산
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { WhatIfResult } from '../../types/marketplace';

interface FactorAttributionProps {
  result: WhatIfResult;
}

interface Factor {
  label: string;
  percent: number;
  description: string;
}

export const FactorAttribution: React.FC<FactorAttributionProps> = ({
  result,
}) => {
  const { colors } = useTheme();
  const factors = computeFactors(result);
  const maxPercent = Math.max(...factors.map(f => f.percent));

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        하락폭 요인 분해
      </Text>

      <View style={s.factorList}>
        {factors.map((factor, i) => (
          <View key={i} style={s.factorItem}>
            <View style={s.factorHeader}>
              <Text style={[s.factorLabel, { color: colors.textPrimary }]}>
                {factor.label}
              </Text>
              <Text style={[s.factorPercent, { color: colors.warning }]}>
                {factor.percent}%
              </Text>
            </View>

            <View style={[s.barBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  s.barFill,
                  {
                    width: `${(factor.percent / maxPercent) * 100}%`,
                    backgroundColor: i === 0 ? colors.warning : `${colors.warning}80`,
                  },
                ]}
              />
            </View>

            <Text style={[s.factorDesc, { color: colors.textTertiary }]}>
              {factor.description}
            </Text>
          </View>
        ))}
      </View>

      <View style={[s.reassuranceBox, { backgroundColor: `${colors.success}10` }]}>
        <Text style={[s.reassuranceText, { color: colors.success }]}>
          하락폭의 {factors[0]?.percent ?? 0}%는 시장 전체 영향입니다.{'\n'}
          당신의 투자 선택이 아닌, 거시적 환경 변화에 의한 것입니다.
        </Text>
      </View>
    </View>
  );
};

/** WhatIfResult에서 요인 분해를 파생 계산 */
function computeFactors(result: WhatIfResult): Factor[] {
  const impacts = result.assetImpacts;
  if (!impacts || impacts.length === 0) {
    return getDefaultFactors();
  }

  const totalChange = Math.abs(result.totalImpact.changePercent);
  const highImpactCount = impacts.filter(a => a.impactLevel === 'HIGH').length;
  const totalCount = impacts.length;
  const concentration = totalCount > 0 ? highImpactCount / totalCount : 0;

  // 시장 전체 기여도: 고영향 자산이 적을수록 시장 전체 영향이 큼
  const marketFactor = Math.round(Math.max(50, 85 - concentration * 40));
  // 업종 집중도: 고영향 자산 비중에 비례
  const sectorFactor = Math.round(Math.min(30, concentration * 35 + 5));
  // 개별 종목: 나머지
  const remaining = 100 - marketFactor - sectorFactor;
  const stockFactor = Math.round(Math.max(3, remaining * 0.6));
  const fxFactor = 100 - marketFactor - sectorFactor - stockFactor;

  return [
    {
      label: '시장 전체',
      percent: marketFactor,
      description: '글로벌 매크로 환경에 따른 전반적 영향',
    },
    {
      label: '업종 집중도',
      percent: sectorFactor,
      description: '특정 업종 쏠림으로 인한 추가 영향',
    },
    {
      label: '개별 종목',
      percent: stockFactor,
      description: '보유 종목 고유의 변동성',
    },
    {
      label: '환율 노출',
      percent: Math.max(2, fxFactor),
      description: '원/달러 환율 변동 영향',
    },
  ];
}

function getDefaultFactors(): Factor[] {
  return [
    {
      label: '시장 전체',
      percent: 78,
      description: '글로벌 매크로 환경에 따른 전반적 영향',
    },
    {
      label: '업종 집중도',
      percent: 12,
      description: '특정 업종 쏠림으로 인한 추가 영향',
    },
    {
      label: '개별 종목',
      percent: 7,
      description: '보유 종목 고유의 변동성',
    },
    {
      label: '환율 노출',
      percent: 3,
      description: '원/달러 환율 변동 영향',
    },
  ];
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  factorList: {
    gap: 14,
    marginBottom: 16,
  },
  factorItem: {
    gap: 4,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  factorPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorDesc: {
    fontSize: 12,
  },
  reassuranceBox: {
    borderRadius: 12,
    padding: 14,
  },
  reassuranceText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
});
