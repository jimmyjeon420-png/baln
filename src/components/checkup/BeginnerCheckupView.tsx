/**
 * BeginnerCheckupView - 초급 분석 리포트 뷰
 *
 * 투자 초보자를 위한 간소화된 분석 화면.
 * 복잡한 수치 대신 직관적인 이모지, 한 줄 진단, 안심 메시지로 구성.
 *
 * 구성 카드 (위→아래):
 * 0. ReassuranceBanner — 안심 배너 (최상단)
 * 1. OneLinerDiagnosis — 한 줄 컨디션 진단
 * 2. WorstFactorCard  — 가장 취약한 요인 1개 (스토리텔링)
 * 3. TodayOneAction   — AI 추천 액션 1개
 * 4. EmotionCheck     — 감정 체크
 * 5. LevelSwitcher    — 레벨 전환 UI
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

import ReassuranceBanner from './ReassuranceBanner';
import OneLinerDiagnosis from './beginner/OneLinerDiagnosis';
import WorstFactorCard from './beginner/WorstFactorCard';
import TodayOneAction from './beginner/TodayOneAction';
import EmotionCheck from './EmotionCheck';
import LevelSwitcher from './LevelSwitcher';

import type { HealthScoreResult } from '../../services/rebalanceScore';
import type { MorningBriefingResult } from '../../services/gemini';
import type { Asset } from '../../types/asset';
import type { InvestorLevel } from '../../hooks/useCheckupLevel';

interface BeginnerCheckupViewProps {
  healthScore: HealthScoreResult;
  morningBriefing: MorningBriefingResult | null;
  totalGainLoss: number;
  cfoWeather: { emoji: string; status: string; message: string } | null;
  isAILoading: boolean;
  allAssets?: Asset[];
  todayEmotion: string | null;
  todayMemo: string;
  onEmotionSelect: (emotion: string) => void;
  onMemoChange: (memo: string) => void;
  onEmotionSave: () => void;
  emotionRewardCredits?: number;
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
  allAssets,
  todayEmotion,
  todayMemo,
  onEmotionSelect,
  onMemoChange,
  onEmotionSave,
  emotionRewardCredits,
  onLevelChange,
}: BeginnerCheckupViewProps) {
  const { colors } = useTheme();
  const topAction = getTopAction(morningBriefing);

  return (
    <View style={s.container}>
      {/* 0. 안심 배너 (최상단) */}
      <ReassuranceBanner totalGainLoss={totalGainLoss} cfoWeather={cfoWeather} />

      {/* Section title */}
      <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
        {'\uD83C\uDF31 분석 리포트'}
      </Text>

      {/* 1. 한 줄 진단 */}
      <OneLinerDiagnosis healthScore={healthScore} />

      {/* 2. 가장 취약한 요인 (스토리텔링) */}
      <WorstFactorCard factors={healthScore.factors} allAssets={allAssets} />

      {/* 3. 이번 달 처방전 */}
      <TodayOneAction action={topAction} isAILoading={isAILoading} />

      {/* 4. 감정 체크 */}
      <EmotionCheck
        todayEmotion={todayEmotion}
        onSelect={onEmotionSelect}
        memo={todayMemo}
        onMemoChange={onMemoChange}
        onSave={onEmotionSave}
        rewardCredits={emotionRewardCredits}
      />

      {/* 5. 레벨 전환 */}
      <LevelSwitcher currentLevel="beginner" onLevelChange={onLevelChange} />

      {/* 투자 면책 안내 */}
      <View style={s.disclaimerBanner}>
        <Ionicons name="information-circle-outline" size={14} color="#888" />
        <Text style={s.disclaimerText}>
          본 정보는 투자 참고용이며, 투자 권유가 아닙니다. 투자 판단의 책임은 본인에게 있습니다.
        </Text>
      </View>

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
    // color: 동적 적용 (colors.textPrimary)
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 32,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#888888',
    lineHeight: 16,
  },
});
