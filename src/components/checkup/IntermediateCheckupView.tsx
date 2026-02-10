/**
 * IntermediateCheckupView - 중급 분석 뷰
 *
 * 역할: 초급(4카드)과 고급(10섹션) 사이의 중간 단계.
 * 6개 기존 섹션(자산 추이, 건강 점수, 취약 팩터, 오늘 액션, What-If, 리스크)
 * + LevelSwitcher로 레벨 전환 제공.
 *
 * 부모(ScrollView)가 스크롤을 담당하므로 이 컴포넌트는 View만 사용.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import HealthScoreSection from '../rebalance/HealthScoreSection';
import WhatIfSimulator from '../rebalance/WhatIfSimulator';
import TodayActionsSection from '../rebalance/TodayActionsSection';
import RiskDashboardSection from '../rebalance/RiskDashboardSection';
import LevelSwitcher from './LevelSwitcher';

import type { HealthScoreResult, FactorResult } from '../../services/rebalanceScore';
import type { RiskAnalysisResult, MorningBriefingResult } from '../../services/gemini';
import type { Asset } from '../../types/asset';
import type { PortfolioAsset } from '../../services/gemini';
import type { InvestorLevel } from '../../hooks/useCheckupLevel';
import type { PeerComparison } from '../../types/rebalanceTypes';

// ── Props ──

interface IntermediateCheckupViewProps {
  healthScore: HealthScoreResult;
  allAssets: Asset[];
  totalAssets: number;
  morningBriefing: MorningBriefingResult | null;
  analysisResult: RiskAnalysisResult | null;
  sortedActions: MorningBriefingResult['portfolioActions'];
  portfolio: PortfolioAsset[];
  livePrices: Record<string, any>;
  isAILoading: boolean;
  peerPanicData?: PeerComparison | null;
  onLevelChange: (level: InvestorLevel) => void;
}

// ── 점수 → 색상 매핑 ──

function getScoreColor(score: number): string {
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FFB74D';
  return '#CF6679';
}

// ── 컴포넌트 ──

export default function IntermediateCheckupView({
  healthScore,
  allAssets,
  totalAssets,
  morningBriefing,
  analysisResult,
  sortedActions,
  portfolio,
  livePrices,
  isAILoading,
  peerPanicData,
  onLevelChange,
}: IntermediateCheckupViewProps) {
  // 취약 팩터 Top 3 (점수 오름차순)
  const weakestFactors = useMemo(() => {
    return [...healthScore.factors]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [healthScore.factors]);

  return (
    <View style={s.container}>
      {/* 1. 섹션 제목 */}
      <Text style={s.sectionTitle}>{'\uD83D\uDCCA'} 분석 리포트</Text>

      {/* 2. 6팩터 건강 점수 */}
      <HealthScoreSection healthScore={healthScore} />

      {/* 4. 취약 팩터 Top 3 (인라인 렌더링) */}
      <View style={s.weakFactorsContainer}>
        {weakestFactors.map((factor: FactorResult) => {
          const color = getScoreColor(factor.score);
          const barWidth = Math.max(factor.score, 5); // 최소 5% 너비

          return (
            <View key={factor.label} style={s.factorCard}>
              <View style={s.factorHeader}>
                <Text style={s.factorIcon}>{factor.icon}</Text>
                <Text style={s.factorLabel}>{factor.label}</Text>
                <Text style={[s.factorScore, { color }]}>{factor.score}점</Text>
              </View>
              {/* 점수 바 */}
              <View style={s.barBackground}>
                <View
                  style={[
                    s.barFill,
                    { width: `${barWidth}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <Text style={s.factorComment}>{factor.comment}</Text>
            </View>
          );
        })}
      </View>

      {/* 5. 오늘의 액션 (상위 3개만) */}
      <TodayActionsSection
        sortedActions={sortedActions.slice(0, 3)}
        portfolio={portfolio as any}
        livePrices={livePrices}
        totalAssets={totalAssets}
        isAILoading={isAILoading}
      />

      {/* 6. What-If 시뮬레이터 */}
      <WhatIfSimulator
        assets={allAssets}
        totalAssets={totalAssets}
        currentHealthScore={healthScore.totalScore}
      />

      {/* 7. 리스크 대시보드 */}
      <RiskDashboardSection
        analysisResult={analysisResult}
        peerPanicData={peerPanicData}
        isAILoading={isAILoading}
      />

      {/* 8. 레벨 전환 */}
      <LevelSwitcher
        currentLevel="intermediate"
        onLevelChange={onLevelChange}
      />
    </View>
  );
}

// ── 스타일 ──

const s = StyleSheet.create({
  container: {
    flex: 1,
  },

  // 섹션 제목
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },

  // 취약 팩터 컨테이너
  weakFactorsContainer: {
    marginTop: 4,
  },

  // 팩터 카드
  factorCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: '#141414',
    borderRadius: 12,
  },

  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  factorIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  factorLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  factorScore: {
    fontSize: 14,
    fontWeight: '700',
  },

  // 점수 바
  barBackground: {
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },

  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  factorComment: {
    fontSize: 12,
    color: '#9E9E9E',
    lineHeight: 16,
  },
});
