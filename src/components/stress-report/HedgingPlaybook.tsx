/**
 * HedgingPlaybook — Beat 4a: 대응 전략 체크리스트
 *
 * 역할: "지금 확인할 점" (취약점) + "실행 가능한 대응" (헤징)
 * 무료: 취약점 전체 + 헤징 2개
 * Premium: 3번째부터 잠금
 *
 * WhatIfResult.riskAssessment에서 데이터
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import type { WhatIfResult } from '../../types/marketplace';

const FREE_HEDGE_LIMIT = 2;

interface HedgingPlaybookProps {
  result: WhatIfResult;
}

export const HedgingPlaybook: React.FC<HedgingPlaybookProps> = ({
  result,
}) => {
  const { colors } = useTheme();
  const risk = result.riskAssessment;

  if (!risk) return null;

  const vulnerabilities = risk.vulnerabilities ?? [];
  const hedgingSuggestions = risk.hedgingSuggestions ?? [];

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        대응 전략
      </Text>

      {/* 취약점 (무료) */}
      {vulnerabilities.length > 0 && (
        <View style={s.block}>
          <View style={s.blockHeader}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={[s.blockTitle, { color: colors.textPrimary }]}>
              지금 확인할 점
            </Text>
          </View>
          {vulnerabilities.map((item, i) => (
            <View key={i} style={s.listItem}>
              <View style={[s.bullet, { backgroundColor: colors.warning }]} />
              <Text style={[s.listText, { color: colors.textSecondary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 헤징 전략 */}
      {hedgingSuggestions.length > 0 && (
        <View style={s.block}>
          <View style={s.blockHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
            <Text style={[s.blockTitle, { color: colors.textPrimary }]}>
              실행 가능한 대응
            </Text>
          </View>
          {hedgingSuggestions.map((item, i) => {
            const isLocked = i >= FREE_HEDGE_LIMIT;
            return (
              <View key={i} style={s.listItem}>
                <Ionicons
                  name={isLocked ? 'lock-closed' : 'checkmark-circle'}
                  size={16}
                  color={isLocked ? colors.textTertiary : colors.success}
                />
                <Text
                  style={[
                    s.listText,
                    {
                      color: isLocked
                        ? colors.textTertiary
                        : colors.textSecondary,
                    },
                  ]}
                  numberOfLines={isLocked ? 1 : undefined}
                >
                  {isLocked ? blurText(item) : item}
                </Text>
                {isLocked && (
                  <View style={[s.premiumBadge, { backgroundColor: `${colors.premium.gold}20` }]}>
                    <Text style={[s.premiumText, { color: colors.premium.gold }]}>
                      Premium
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* 리스크 수준 요약 */}
      <View style={[s.riskSummary, { backgroundColor: `${getRiskColor(risk.overallRisk)}10` }]}>
        <Text style={[s.riskLabel, { color: colors.textSecondary }]}>
          전체 리스크 수준
        </Text>
        <Text style={[s.riskLevel, { color: getRiskColor(risk.overallRisk) }]}>
          {getRiskLabel(risk.overallRisk)}
        </Text>
      </View>
    </View>
  );
};

function blurText(text: string): string {
  if (text.length <= 8) return text.slice(0, 3) + '●●●●●';
  return text.slice(0, 6) + '●●●●●●●●';
}

function getRiskColor(level: string): string {
  switch (level) {
    case 'HIGH':
      return '#FFB74D';
    case 'MEDIUM':
      return '#FFB74D';
    default:
      return '#4CAF50';
  }
}

function getRiskLabel(level: string): string {
  switch (level) {
    case 'HIGH':
      return '높음 — 방어 전략 실행 권장';
    case 'MEDIUM':
      return '보통 — 모니터링 필요';
    default:
      return '낮음 — 현재 배분 유지';
  }
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
  block: {
    marginBottom: 16,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    paddingLeft: 2,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '700',
  },
  riskSummary: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: 14,
  },
  riskLevel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
