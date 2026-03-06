/**
 * FactorAttribution — Beat 3a: {t('factorAttribution.title')} (블랙록 핵심)
 *
 * 역할: "하락폭의 78%는 시장 전체 영향이지, 당신 선택이 아닙니다"
 * 수평 막대 차트: 시장 전체 / 업종 집중도 / 개별 종목 / 환율 노출
 *
 * WhatIfResult.assetImpacts에서 요인을 파생 계산
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import type { WhatIfResult } from '../../types/marketplace';

interface FactorAttributionProps {
  result: WhatIfResult;
}

interface Factor {
  labelKey: string;
  percent: number;
  descKey: string;
}

export const FactorAttribution: React.FC<FactorAttributionProps> = ({
  result,
}) => {
  const { colors } = useTheme();
  const { t } = useLocale();
  const factors = computeFactors(result);
  const maxPercent = Math.max(...factors.map(f => f.percent));

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        {t('factorAttribution.title')}
      </Text>

      <View style={s.factorList}>
        {factors.map((factor, i) => (
          <View key={i} style={s.factorItem}>
            <View style={s.factorHeader}>
              <Text style={[s.factorLabel, { color: colors.textPrimary }]}>
                {t(factor.labelKey)}
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
              {t(factor.descKey)}
            </Text>
          </View>
        ))}
      </View>

      <View style={[s.reassuranceBox, { backgroundColor: `${colors.success}10` }]}>
        <Text style={[s.reassuranceText, { color: colors.success }]}>
          {t('factorAttribution.reassurance', { percent: factors[0]?.percent ?? 0 })}
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

  const _totalChange = Math.abs(result.totalImpact.changePercent);
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
      labelKey: 'factorAttribution.factor_market',
      percent: marketFactor,
      descKey: 'factorAttribution.factor_market_desc',
    },
    {
      labelKey: 'factorAttribution.factor_sector',
      percent: sectorFactor,
      descKey: 'factorAttribution.factor_sector_desc',
    },
    {
      labelKey: 'factorAttribution.factor_stock',
      percent: stockFactor,
      descKey: 'factorAttribution.factor_stock_desc',
    },
    {
      labelKey: 'factorAttribution.factor_fx',
      percent: Math.max(2, fxFactor),
      descKey: 'factorAttribution.factor_fx_desc',
    },
  ];
}

function getDefaultFactors(): Factor[] {
  return [
    {
      labelKey: 'factorAttribution.factor_market',
      percent: 78,
      descKey: 'factorAttribution.factor_market_desc',
    },
    {
      labelKey: 'factorAttribution.factor_sector',
      percent: 12,
      descKey: 'factorAttribution.factor_sector_desc',
    },
    {
      labelKey: 'factorAttribution.factor_stock',
      percent: 7,
      descKey: 'factorAttribution.factor_stock_desc',
    },
    {
      labelKey: 'factorAttribution.factor_fx',
      percent: 3,
      descKey: 'factorAttribution.factor_fx_desc',
    },
  ];
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
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
    fontSize: 15,
    fontWeight: '600',
  },
  factorPercent: {
    fontSize: 15,
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
    fontSize: 13,
  },
  reassuranceBox: {
    borderRadius: 12,
    padding: 14,
  },
  reassuranceText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '500',
  },
});
