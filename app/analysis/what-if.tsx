/**
 * What-If 시뮬레이션 — 위기 시뮬레이터
 *
 * 2-탭 구조:
 * 1) 스트레스 테스트: 블랙록 4-Beat 리포트 (기존)
 * 2) 극한 시나리오: 화제성 극한 시나리오 시뮬레이터 (신규)
 *    - 시나리오 열람 무료, 포트폴리오 시뮬레이션 2크레딧
 *    - 5/31까지 무료 기간 (isFreePeriod)
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
import { useTheme } from '../../src/hooks/useTheme';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { generateWhatIf } from '../../src/services/gemini';
import { spendCredits, refundCredits } from '../../src/services/creditService';
import { FEATURE_COSTS } from '../../src/types/marketplace';
import type { WhatIfInput, WhatIfResult } from '../../src/types/marketplace';
import {
  ScenarioSelector,
  EmpathyHeader,
  HistoricalContext,
  FactorAttribution,
  AssetImpactWaterfall,
  RiskBudgetGauge,
  HedgingPlaybook,
  RecoveryOutlook,
} from '../../src/components/stress-report';
import type { ScenarioType } from '../../src/components/stress-report';
import { ExtremeScenarioGrid, ExtremeScenarioReport } from '../../src/components/what-if';
import type { ExtremeScenario } from '../../src/data/whatIfScenarios';

// ============================================================================
// 타입 & 상수
// ============================================================================

type TabMode = 'stress' | 'extreme';

const SCENARIO_CONFIG: Record<
  ScenarioType,
  { scenario: WhatIfInput['scenario']; description: string; magnitude: number; label: string; maxTolerance: number }
> = {
  market_correction: {
    scenario: 'market_crash',
    description: '시장 조정 -10%: S&P 500이 10% 하락하는 시나리오',
    magnitude: -10,
    label: '시장 조정 -10%',
    maxTolerance: 20,
  },
  bear_market: {
    scenario: 'market_crash',
    description: '약세장 -20%: 시장이 20% 이상 하락하는 장기 하락 국면',
    magnitude: -20,
    label: '약세장 -20%',
    maxTolerance: 30,
  },
  rate_shock: {
    scenario: 'interest_rate_change',
    description: '금리 쇼크 +3%p: 기준금리가 3%p 급등하는 시나리오',
    magnitude: 3,
    label: '금리 쇼크 +3%p',
    maxTolerance: 20,
  },
};

// ============================================================================
// 메인 화면
// ============================================================================

export default function WhatIfScreen() {
  const { colors } = useTheme();
  const { portfolioAssets, totalAssets, hasAssets } = useSharedPortfolio();

  // --- 탭 ---
  const [activeTab, setActiveTab] = useState<TabMode>('extreme');

  // --- 스트레스 테스트 state ---
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 극한 시나리오 state ---
  const [selectedExtreme, setSelectedExtreme] = useState<ExtremeScenario | null>(null);
  const [extremeResult, setExtremeResult] = useState<WhatIfResult | null>(null);
  const [isExtremeLoading, setIsExtremeLoading] = useState(false);
  const [extremeError, setExtremeError] = useState<string | null>(null);

  // ── 스트레스 테스트 핸들러 ──
  const handleSelectScenario = async (type: ScenarioType) => {
    setSelectedScenario(type);
    setResult(null);
    setError(null);
    setIsLoading(true);

    const config = SCENARIO_CONFIG[type];

    try {
      const input: WhatIfInput = {
        scenario: config.scenario,
        description: config.description,
        magnitude: config.magnitude,
        portfolio: portfolioAssets.map(a => ({
          ticker: a.ticker,
          name: a.name,
          currentValue: a.currentValue,
          allocation: a.allocation ?? Math.round((a.currentValue / totalAssets) * 100),
        })),
      };

      const whatIfResult = await generateWhatIf(input);
      setResult(whatIfResult);
    } catch (err) {
      console.error('[WhatIf] 시뮬레이션 실패:', err);
      setError('분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 극한 시나리오 선택 ──
  const handleSelectExtreme = (scenario: ExtremeScenario) => {
    setSelectedExtreme(scenario);
    setExtremeResult(null);
    setExtremeError(null);
  };

  // ── 극한 시나리오 포트폴리오 시뮬레이션 (2크레딧) ──
  const handleExtremeSimulate = async () => {
    if (!selectedExtreme || !hasAssets) return;
    setExtremeResult(null);
    setExtremeError(null);
    setIsExtremeLoading(true);

    const cost = FEATURE_COSTS.what_if; // 2크레딧
    let creditsCharged = false;

    try {
      // 크레딧 차감 (spendCredits 내부에서 무료 기간 자동 처리)
      const spendResult = await spendCredits(cost, 'what_if');
      if (!spendResult.success) {
        setExtremeError(spendResult.errorMessage || '크레딧이 부족합니다');
        setIsExtremeLoading(false);
        return;
      }
      creditsCharged = true;

      // AI 호출
      const input: WhatIfInput = {
        scenario: selectedExtreme.whatIfInput.scenario,
        description: selectedExtreme.whatIfInput.description,
        magnitude: selectedExtreme.whatIfInput.magnitude,
        portfolio: portfolioAssets.map(a => ({
          ticker: a.ticker,
          name: a.name,
          currentValue: a.currentValue,
          allocation: a.allocation ?? Math.round((a.currentValue / totalAssets) * 100),
        })),
      };

      const whatIfResult = await generateWhatIf(input);
      setExtremeResult(whatIfResult);
    } catch (err) {
      console.error('[ExtremeScenario] 시뮬레이션 실패:', err);
      // 실패 시 환불 (실제 차감된 경우만)
      if (creditsCharged) {
        await refundCredits(cost, 'what_if', 'AI 분석 실패').catch(() => {});
      }
      setExtremeError('분석에 실패했습니다. 크레딧은 환불됩니다.');
    } finally {
      setIsExtremeLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '위기 시뮬레이터',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 세그먼트 탭 ── */}
        <View style={[s.segmentContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              s.segmentTab,
              activeTab === 'stress' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab('stress')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                s.segmentText,
                { color: activeTab === 'stress' ? '#FFFFFF' : colors.textTertiary },
              ]}
            >
              스트레스 테스트
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.segmentTab,
              activeTab === 'extreme' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab('extreme')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                s.segmentText,
                { color: activeTab === 'extreme' ? '#FFFFFF' : colors.textTertiary },
              ]}
            >
              극한 시나리오
            </Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════ */}
        {/* 탭 1: 스트레스 테스트 (기존) */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === 'stress' && (
          <>
            {/* 자산 미등록 시 안내 */}
            {!hasAssets && (
              <View style={[s.emptyCard, { backgroundColor: colors.surface }]}>
                <Text style={s.emptyEmoji}>📊</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
                  자산을 먼저 등록해주세요
                </Text>
                <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
                  포트폴리오를 등록하면 시나리오별 방어력을 분석할 수 있습니다
                </Text>
              </View>
            )}

            {/* 시나리오 선택 */}
            {hasAssets && (
              <ScenarioSelector
                selected={selectedScenario}
                onSelect={handleSelectScenario}
                disabled={isLoading}
              />
            )}

            {/* 로딩 */}
            {isLoading && (
              <View style={[s.loadingCard, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.loadingTitle, { color: colors.textPrimary }]}>
                  포트폴리오 스트레스 분석 중
                </Text>
                <Text style={[s.loadingDesc, { color: colors.textTertiary }]}>
                  AI가 시나리오별 영향을 계산하고 있습니다
                </Text>
              </View>
            )}

            {/* 에러 */}
            {error && !isLoading && (
              <View style={[s.errorCard, { backgroundColor: `${colors.warning}10` }]}>
                <Text style={[s.errorText, { color: colors.warning }]}>{error}</Text>
              </View>
            )}

            {/* 블랙록 4-Beat 리포트 */}
            {result && selectedScenario && !isLoading && (
              <View style={s.reportContainer}>
                <EmpathyHeader
                  scenarioLabel={SCENARIO_CONFIG[selectedScenario].label}
                  result={result}
                />
                <HistoricalContext scenarioType={selectedScenario} />
                <FactorAttribution result={result} />
                <AssetImpactWaterfall result={result} />
                <RiskBudgetGauge
                  result={result}
                  maxTolerancePercent={SCENARIO_CONFIG[selectedScenario].maxTolerance}
                />
                <HedgingPlaybook result={result} />
                <RecoveryOutlook scenarioType={selectedScenario} />
              </View>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* 탭 2: 극한 시나리오 (신규) */}
        {/* ══════════════════════════════════════════════════ */}
        {activeTab === 'extreme' && (
          <>
            {/* 시나리오 그리드 */}
            <ExtremeScenarioGrid
              selectedId={selectedExtreme?.id ?? null}
              onSelect={handleSelectExtreme}
              disabled={isExtremeLoading}
            />

            {/* 선택된 시나리오 리포트 */}
            {selectedExtreme && (
              <ExtremeScenarioReport
                scenario={selectedExtreme}
                simulationResult={extremeResult}
                isSimulating={isExtremeLoading}
                simulationError={extremeError}
                onSimulate={handleExtremeSimulate}
                hasAssets={hasAssets}
              />
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  // 세그먼트 컨트롤
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 기존 스타일 유지
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  loadingDesc: {
    fontSize: 13,
  },
  errorCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  reportContainer: {
    marginTop: 16,
    gap: 12,
  },
});
