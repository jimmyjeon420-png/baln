/**
 * BeginnerCheckupView - 초급 분석 리포트 뷰
 *
 * 투자 초보자를 위한 간소화된 분석 화면.
 * 복잡한 수치 대신 직관적인 이모지, 한 줄 진단, 안심 메시지로 구성.
 *
 * 구성 카드 (위→아래):
 * 1. OneLinerDiagnosis — 한 줄 컨디션 진단
 * 2. WorstFactorCard  — 가장 취약한 요인 1개
 * 3. TodayOneAction   — AI 추천 액션 1개
 * 4. ReassuranceCard  — 안심 한마디
 * 5. LevelSwitcher    — 레벨 전환 UI
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import OneLinerDiagnosis from './beginner/OneLinerDiagnosis';
import WorstFactorCard from './beginner/WorstFactorCard';
import TodayOneAction from './beginner/TodayOneAction';
import ReassuranceCard from './beginner/ReassuranceCard';
import LevelSwitcher from './LevelSwitcher';

import type { HealthScoreResult } from '../../services/rebalanceScore';
import type { MorningBriefingResult } from '../../services/gemini';
import type { InvestorLevel } from '../../hooks/useCheckupLevel';

interface BeginnerCheckupViewProps {
  healthScore: HealthScoreResult;
  morningBriefing: MorningBriefingResult | null;
  totalGainLoss: number;
  cfoWeather: { emoji: string; status: string; message: string } | null;
  isAILoading: boolean;
  onLevelChange: (level: InvestorLevel) => void;
}

/** portfolioActions 배열에서 priority 기준 정렬 후 첫 번째 반환 */
function getTopAction(
  briefing: MorningBriefingResult | null,
): BeginnerCheckupViewProps['morningBriefing'] extends null
  ? null
  : MorningBriefingResult['portfolioActions'][number] | null {
  if (!briefing?.portfolioActions?.length) return null;

  const PRIORITY_ORDER: Record<string, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };

  const sorted = [...briefing.portfolioActions].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
  );

  return sorted[0] ?? null;
}

export default function BeginnerCheckupView({
  healthScore,
  morningBriefing,
  totalGainLoss,
  cfoWeather,
  isAILoading,
  onLevelChange,
}: BeginnerCheckupViewProps) {
  const topAction = getTopAction(morningBriefing);

  return (
    <View style={s.container}>
      {/* Section title */}
      <Text style={s.sectionTitle}>
        {'\uD83C\uDF31 분석 리포트'}
      </Text>

      {/* 1. 한 줄 진단 */}
      <OneLinerDiagnosis healthScore={healthScore} />

      {/* 2. 가장 취약한 요인 */}
      <WorstFactorCard factors={healthScore.factors} />

      {/* 3. 오늘 할 일 */}
      <TodayOneAction action={topAction} isAILoading={isAILoading} />

      {/* 4. 안심 한마디 */}
      <ReassuranceCard totalGainLoss={totalGainLoss} cfoWeather={cfoWeather} />

      {/* 5. 레벨 전환 */}
      <LevelSwitcher currentLevel="beginner" onLevelChange={onLevelChange} />

      {/* Bottom spacing */}
      <View style={s.bottomSpacer} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 32,
  },
});
