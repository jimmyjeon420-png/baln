/**
 * What-If 시뮬레이션 - 위기 시나리오 분석
 *
 * 역할: 시장 급락/폭락 시나리오에서 포트폴리오 방어력 테스트
 * 사용자 흐름: 시나리오 선택 → AI 시뮬레이션 → 대응 전략 제시
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';

interface Scenario {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  icon: keyof typeof Ionicons.glyphMap;
}

interface SimulationResult {
  totalLoss: number;
  totalLossPercent: number;
  defenseScore: number;
  strategy: string;
  recommendations: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: '1',
    title: '시장 조정 -10%',
    description: 'S&P 500 10% 하락',
    severity: 'medium',
    icon: 'trending-down',
  },
  {
    id: '2',
    title: '시장 폭락 -20%',
    description: '금융위기급 하락',
    severity: 'high',
    icon: 'warning',
  },
  {
    id: '3',
    title: '암호화폐 붕괴',
    description: '비트코인 -50%',
    severity: 'high',
    icon: 'flash',
  },
  {
    id: '4',
    title: '금리 급등',
    description: '기준금리 +3%p 인상',
    severity: 'medium',
    icon: 'stats-chart',
  },
];

export default function WhatIfScreen() {
  const { colors } = useTheme();
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return '#FFB74D';
      case 'medium':
        return '#FF9800';
      case 'high':
        return '#CF6679';
      default:
        return '#9E9E9E';
    }
  };

  const handleSimulate = async (scenario: Scenario) => {
    setSelectedScenario(scenario.id);
    setIsLoading(true);
    try {
      // TODO: 실제 포트폴리오 기반 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResult({
        totalLoss: 5000000,
        totalLossPercent: -15,
        defenseScore: 65,
        strategy:
          '현재 포트폴리오는 주식 비중이 높아 폭락에 취약합니다. 채권/금 비중을 늘려 헤지하세요.',
        recommendations: [
          '주식 비중 70% → 50%로 축소',
          '채권 비중 10% → 25%로 확대',
          '금/원자재 비중 5% → 15%로 확대',
          '현금 비중 15% → 10% 유지',
        ],
      });
    } catch (error) {
      console.error('[WhatIf] 시뮬레이션 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDefenseScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFB74D';
    return '#CF6679';
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'What-If 시뮬레이션',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        contentContainerStyle={s.content}
      >
        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>🧪 위기 시나리오</Text>

        {/* 시나리오 선택 */}
        {SCENARIOS.map(scenario => (
          <TouchableOpacity
            key={scenario.id}
            onPress={() => handleSimulate(scenario)}
            disabled={isLoading}
            style={[
              s.scenarioCard,
              {
                backgroundColor: colors.surface,
                borderLeftColor: getSeverityColor(scenario.severity),
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={s.scenarioHeader}>
              <Ionicons
                name={scenario.icon}
                size={24}
                color={getSeverityColor(scenario.severity)}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.scenarioTitle, { color: colors.textPrimary }]}>
                  {scenario.title}
                </Text>
                <Text style={[s.scenarioDesc, { color: colors.textSecondary }]}>
                  {scenario.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}

        {/* 로딩 */}
        {isLoading && (
          <View style={[s.loadingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color="#7C4DFF" />
            <Text style={[s.loadingText, { color: colors.textSecondary }]}>
              AI가 시나리오를 분석 중입니다...
            </Text>
          </View>
        )}

        {/* 시뮬레이션 결과 */}
        {result && !isLoading && (
          <View style={s.resultContainer}>
            {/* 예상 손실 */}
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardLabel, { color: colors.textSecondary }]}>예상 총 손실</Text>
              <Text style={[s.lossAmount, { color: '#CF6679' }]}>
                ₩{Math.abs(result.totalLoss).toLocaleString()}
              </Text>
              <Text style={[s.lossPercent, { color: colors.textSecondary }]}>
                ({result.totalLossPercent}%)
              </Text>
            </View>

            {/* 방어 점수 */}
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardLabel, { color: colors.textSecondary }]}>방어력 점수</Text>
              <Text
                style={[s.defenseScore, { color: getDefenseScoreColor(result.defenseScore) }]}
              >
                {result.defenseScore}점
              </Text>
              <View style={s.scoreBar}>
                <View
                  style={[
                    s.scoreBarFill,
                    {
                      width: `${result.defenseScore}%`,
                      backgroundColor: getDefenseScoreColor(result.defenseScore),
                    },
                  ]}
                />
              </View>
            </View>

            {/* AI 대응 전략 */}
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <View style={s.cardHeader}>
                <Ionicons name="bulb" size={18} color="#7C4DFF" />
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                  💡 AI 대응 전략
                </Text>
              </View>
              <Text style={[s.strategyText, { color: colors.textSecondary }]}>
                {result.strategy}
              </Text>

              <View style={s.recommendationsContainer}>
                <Text style={[s.recommendationsTitle, { color: colors.textPrimary }]}>
                  추천 조정:
                </Text>
                {result.recommendations.map((rec, index) => (
                  <View key={index} style={s.recommendationItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={[s.recommendationText, { color: colors.textSecondary }]}>
                      {rec}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  scenarioCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  scenarioDesc: {
    fontSize: 13,
  },
  loadingCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  resultContainer: {
    marginTop: 20,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
  },
  cardLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  lossAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  lossPercent: {
    fontSize: 14,
  },
  defenseScore: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 12,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  strategyText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  recommendationsContainer: {
    gap: 10,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
