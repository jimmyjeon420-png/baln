/**
 * RecoveryOutlook — Beat 4b: 회복 전망 (Opportunity)
 *
 * 역할: 마지막 카드 = 긍정적 인상으로 마무리
 * "1970년 이후 -10% 이상 조정 23회 중 22회(96%) 회복"
 *
 * 디자인: 연한 초록 배경 카드 (안심 마무리)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { RECOVERY_STATS } from './historicalData';

interface RecoveryOutlookProps {
  scenarioType: 'market_correction' | 'bear_market' | 'rate_shock';
}

export const RecoveryOutlook: React.FC<RecoveryOutlookProps> = ({
  scenarioType,
}) => {
  const { colors } = useTheme();
  const stats = RECOVERY_STATS;
  const recoveryDetail = getRecoveryDetail(scenarioType);

  return (
    <View style={[s.container, { backgroundColor: `${colors.success}10` }]}>
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        회복 전망
      </Text>

      <Text style={[s.bigNumber, { color: colors.success }]}>
        {stats.recoveryRate}%
      </Text>
      <Text style={[s.bigLabel, { color: colors.textSecondary }]}>
        역사적 회복 확률
      </Text>

      <Text style={[s.subtitle, { color: colors.textTertiary }]}>
        1970년 이후 {stats.totalCorrections}회 조정 중{' '}
        {stats.recoveredCount}회 회복
      </Text>

      <View style={[s.divider, { backgroundColor: `${colors.success}20` }]} />

      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={[s.statValue, { color: colors.textPrimary }]}>
            {recoveryDetail.avgMonths}개월
          </Text>
          <Text style={[s.statLabel, { color: colors.textTertiary }]}>
            평균 회복 기간
          </Text>
        </View>

        <View style={[s.statDivider, { backgroundColor: `${colors.success}20` }]} />

        <View style={s.statItem}>
          <Text style={[s.statValue, { color: colors.success }]}>
            +{recoveryDetail.afterOneYear}%
          </Text>
          <Text style={[s.statLabel, { color: colors.textTertiary }]}>
            회복 후 1년 수익률
          </Text>
        </View>
      </View>

      <View style={[s.reassuranceBox, { backgroundColor: `${colors.success}08` }]}>
        <Text style={[s.reassuranceText, { color: colors.success }]}>
          {recoveryDetail.message}
        </Text>
      </View>
    </View>
  );
};

interface RecoveryDetail {
  avgMonths: number;
  afterOneYear: number;
  message: string;
}

function getRecoveryDetail(
  scenarioType: 'market_correction' | 'bear_market' | 'rate_shock'
): RecoveryDetail {
  switch (scenarioType) {
    case 'market_correction':
      return {
        avgMonths: 4,
        afterOneYear: 18,
        message:
          '10% 수준 조정은 평균 4개월 내 회복됩니다. 장기 투자자에게는 매수 기회로 작용한 경우가 더 많습니다.',
      };
    case 'bear_market':
      return {
        avgMonths: 14,
        afterOneYear: 24,
        message:
          '약세장은 길게 느껴지지만, 역사적으로 회복 후 수익률이 가장 높았습니다. 원칙을 지킨 투자자가 가장 큰 보상을 받았습니다.',
      };
    case 'rate_shock':
      return {
        avgMonths: 8,
        afterOneYear: 16,
        message:
          '금리 인상기는 단기 조정을 동반하지만, 시장은 새로운 금리 수준에 적응합니다. 채권 비중 조정이 핵심 대응입니다.',
      };
  }
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  bigNumber: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 64,
  },
  bigLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  reassuranceBox: {
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  reassuranceText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
});
