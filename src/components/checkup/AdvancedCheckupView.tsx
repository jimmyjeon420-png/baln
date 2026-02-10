import React from 'react';

import type { HealthScoreResult } from '../../services/rebalanceScore';
import type {
  RiskAnalysisResult,
  MorningBriefingResult,
  PortfolioAsset,
} from '../../services/gemini';
import type { Asset } from '../../types/asset';
import type { InvestorLevel } from '../../hooks/useCheckupLevel';
import type { PeerComparison } from '../../types/rebalanceTypes';

import HeroSection from '../rebalance/HeroSection';
import CheckupHeader from './CheckupHeader';
import HealthScoreSection from '../rebalance/HealthScoreSection';
import AllocationDriftSection from '../rebalance/AllocationDriftSection';
import WhatIfSimulator from '../rebalance/WhatIfSimulator';
import AssetTrendSection from '../rebalance/AssetTrendSection';
import CorrelationHeatmapSection from '../rebalance/CorrelationHeatmapSection';
import TodayActionsSection from '../rebalance/TodayActionsSection';
import RiskDashboardSection from '../rebalance/RiskDashboardSection';
import AIAnalysisCTA from './AIAnalysisCTA';
import LevelSwitcher from './LevelSwitcher';

interface AdvancedCheckupViewProps {
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
  snapshots: any[];
  currentTotal: number;
  dateString: string;
  tierLabel: string;
  tierColor: string;
  totalGainLoss: number;
  gainPercent: number;
  cfoWeather: { emoji: string; status: string; message: string } | null;
  panicScore: number | undefined;
  onLevelChange: (level: InvestorLevel) => void;
}

export default function AdvancedCheckupView({
  healthScore,
  allAssets,
  totalAssets,
  analysisResult,
  sortedActions,
  portfolio,
  livePrices,
  isAILoading,
  peerPanicData,
  snapshots,
  currentTotal,
  dateString,
  tierLabel,
  tierColor,
  totalGainLoss,
  gainPercent,
  cfoWeather,
  panicScore,
  onLevelChange,
}: AdvancedCheckupViewProps) {
  return (
    <>
      {/* 1. Hero — total assets + daily change + tier */}
      <HeroSection
        dateString={dateString}
        tierLabel={tierLabel}
        tierColor={tierColor}
        totalAssets={totalAssets}
        totalGainLoss={totalGainLoss}
        gainPercent={gainPercent}
        cfoWeather={cfoWeather}
      />

      {/* 2. Checkup header — health score grade + panic score */}
      <CheckupHeader
        healthScore={healthScore}
        panicScore={panicScore}
        totalAssets={totalAssets}
      />

      {/* 3. Asset trend chart */}
      <AssetTrendSection
        snapshots={snapshots}
        isLoading={!snapshots || snapshots.length === 0}
        currentTotal={currentTotal}
      />

      {/* 4. Six-factor health score breakdown */}
      <HealthScoreSection healthScore={healthScore} />

      {/* 5. Target vs current allocation drift */}
      <AllocationDriftSection assets={allAssets} totalAssets={totalAssets} />

      {/* 6. Portfolio adjustment simulation */}
      <WhatIfSimulator
        assets={allAssets}
        totalAssets={totalAssets}
        currentHealthScore={healthScore.totalScore}
      />

      {/* 7. Asset correlation matrix */}
      <CorrelationHeatmapSection assets={allAssets} totalAssets={totalAssets} />

      {/* 8. Today's actions — full list */}
      <TodayActionsSection
        sortedActions={sortedActions}
        portfolio={portfolio}
        livePrices={livePrices}
        totalAssets={totalAssets}
        isAILoading={isAILoading}
      />

      {/* 9. Panic Shield + FOMO Vaccine */}
      <RiskDashboardSection
        analysisResult={analysisResult}
        peerPanicData={peerPanicData}
        isAILoading={isAILoading}
      />

      {/* 10. AI marketplace CTA */}
      <AIAnalysisCTA />

      {/* 11. Level switcher */}
      <LevelSwitcher currentLevel="advanced" onLevelChange={onLevelChange} />
    </>
  );
}
