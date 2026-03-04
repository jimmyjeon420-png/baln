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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useLocale } from '../../src/context/LocaleContext';
import { t as tStatic } from '../../src/locales';
import { useSharedPortfolio } from '../../src/hooks/useSharedPortfolio';
import { generateWhatIf } from '../../src/services/gemini';
import { spendCredits, refundCredits } from '../../src/services/creditService';
import { FEATURE_COSTS, type WhatIfInput, type WhatIfResult } from '../../src/types/marketplace';
import {
  ScenarioSelector,
  EmpathyHeader,
  HistoricalContext,
  FactorAttribution,
  AssetImpactWaterfall,
  RiskBudgetGauge,
  HedgingPlaybook,
  RecoveryOutlook,
  type ScenarioType,
} from '../../src/components/stress-report';
import { ExtremeScenarioGrid, ExtremeScenarioReport } from '../../src/components/what-if';
import type { ExtremeScenario } from '../../src/data/whatIfScenarios';

// ============================================================================
// 타입 & 상수
// ============================================================================

type TabMode = 'stress' | 'extreme';

function getScenarioConfig(): Record<
  ScenarioType,
  { scenario: WhatIfInput['scenario']; description: string; magnitude: number; label: string; maxTolerance: number }
> {
  return {
    market_correction: {
      scenario: 'market_crash',
      description: tStatic('analysis.whatIf.scenario.correction.description'),
      magnitude: -10,
      label: tStatic('analysis.whatIf.scenario.correction.label'),
      maxTolerance: 20,
    },
    bear_market: {
      scenario: 'market_crash',
      description: tStatic('analysis.whatIf.scenario.bear.description'),
      magnitude: -20,
      label: tStatic('analysis.whatIf.scenario.bear.label'),
      maxTolerance: 30,
    },
    rate_shock: {
      scenario: 'interest_rate_change',
      description: tStatic('analysis.whatIf.scenario.rateShock.description'),
      magnitude: 3,
      label: tStatic('analysis.whatIf.scenario.rateShock.label'),
      maxTolerance: 20,
    },
  };
}

// ============================================================================
// 메인 화면
// ============================================================================

export default function WhatIfScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
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

    const config = getScenarioConfig()[type];

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
      setError(t('analysis.whatIf.error.analysisFailed'));
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
      // 크레딧 차감 (1C/회)
      const spendResult = await spendCredits(cost, 'what_if');
      if (!spendResult.success) {
        setExtremeError(spendResult.errorMessage || t('analysis.whatIf.error.insufficientCredits'));
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
      setExtremeError(t('analysis.whatIf.error.analysisFailedRefund'));
    } finally {
      setIsExtremeLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar title={t('analysis.whatIf.title')} />
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
              {t('analysis.whatIf.tab.stress')}
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
              {t('analysis.whatIf.tab.extreme')}
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
                  {t('analysis.whatIf.empty.title')}
                </Text>
                <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
                  {t('analysis.whatIf.empty.description')}
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
                  {t('analysis.whatIf.loading.title')}
                </Text>
                <Text style={[s.loadingDesc, { color: colors.textTertiary }]}>
                  {t('analysis.whatIf.loading.description')}
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
                  scenarioLabel={getScenarioConfig()[selectedScenario].label}
                  result={result}
                />
                <HistoricalContext scenarioType={selectedScenario} />
                <FactorAttribution result={result} />
                <AssetImpactWaterfall result={result} />
                <RiskBudgetGauge
                  result={result}
                  maxTolerancePercent={getScenarioConfig()[selectedScenario].maxTolerance}
                />
                <HedgingPlaybook result={result} />
                <RecoveryOutlook scenarioType={selectedScenario} />

                {/* 투자 면책 안내 */}
                <View style={s.disclaimerBanner}>
                  <Ionicons name="information-circle-outline" size={14} color="#888" />
                  <Text style={s.disclaimerText}>
                    {t('analysis.whatIf.disclaimer')}
                  </Text>
                </View>
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
              <>
                <ExtremeScenarioReport
                  scenario={selectedExtreme}
                  simulationResult={extremeResult}
                  isSimulating={isExtremeLoading}
                  simulationError={extremeError}
                  onSimulate={handleExtremeSimulate}
                  hasAssets={hasAssets}
                />

                {/* 투자 면책 안내 */}
                <View style={s.disclaimerBanner}>
                  <Ionicons name="information-circle-outline" size={14} color="#888" />
                  <Text style={s.disclaimerText}>
                    {t('analysis.whatIf.disclaimer')}
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    fontSize: 15,
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
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  loadingCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  loadingDesc: {
    fontSize: 14,
  },
  errorCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  reportContainer: {
    marginTop: 16,
    gap: 12,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    lineHeight: 17,
  },
});
