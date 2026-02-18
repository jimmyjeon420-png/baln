import React, { useState, useCallback } from 'react';

import type { HealthScoreResult } from '../../services/rebalanceScore';
import { DEFAULT_TARGET, AssetCategory, KostolalyPhase } from '../../services/rebalanceScore';
import type {
  RiskAnalysisResult,
  MorningBriefingResult,
  PortfolioAsset,
} from '../../services/gemini';
import type { Asset } from '../../types/asset';
import type { InvestorLevel } from '../../hooks/useCheckupLevel';
import type { PeerComparison } from '../../types/rebalanceTypes';

import ReassuranceBanner from './ReassuranceBanner';
import MarketTemperature from './MarketTemperature';
import EmotionCheck from './EmotionCheck';
import HeroSection from '../rebalance/HeroSection';
import CheckupHeader from './CheckupHeader';
import HealthScoreSection from '../rebalance/HealthScoreSection';
import AllocationDriftSection from '../rebalance/AllocationDriftSection';
import WhatIfSimulator from '../rebalance/WhatIfSimulator';
import CorrelationHeatmapSection from '../rebalance/CorrelationHeatmapSection';
import TodayActionsSection from '../rebalance/TodayActionsSection';
import RiskDashboardSection from '../rebalance/RiskDashboardSection';
import AIAnalysisCTA from './AIAnalysisCTA';
import LevelSwitcher from './LevelSwitcher';
import KostolalyPhaseCard from './KostolalyPhaseCard';

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
  dateString: string;
  tierLabel: string;
  tierColor: string;
  totalGainLoss: number;
  gainPercent: number;
  cfoWeather: { emoji: string; status: string; message: string } | null;
  panicScore: number | undefined;
  holdingLabel?: string;
  todayEmotion?: string | null;
  todayMemo?: string;
  onEmotionSelect?: (emotion: string) => void;
  onMemoChange?: (memo: string) => void;
  onEmotionSave?: () => void;
  emotionRewardCredits?: number;
  onLevelChange: (level: InvestorLevel) => void;
}

export default function AdvancedCheckupView({
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
  dateString,
  tierLabel,
  tierColor,
  totalGainLoss,
  gainPercent,
  cfoWeather,
  panicScore,
  holdingLabel,
  todayEmotion,
  todayMemo,
  onEmotionSelect,
  onMemoChange,
  onEmotionSave,
  emotionRewardCredits,
  onLevelChange,
}: AdvancedCheckupViewProps) {
  // AllocationDriftSection에서 선택된 철학 목표 → WhatIfSimulator + TodayActionsSection 전달
  const [selectedTarget, setSelectedTarget] = useState<Record<AssetCategory, number>>(DEFAULT_TARGET);

  // KostolalyPhaseCard에서 "배분 적용" 클릭 시 → AllocationDriftSection으로 전달
  const [kostolalyTarget, setKostolalyTarget] = useState<Record<AssetCategory, number> | null>(null);
  const [kostolalyPhase, setKostolalyPhase] = useState<KostolalyPhase | null>(null);

  const handleApplyKostolalyPhase = useCallback((
    target: Record<AssetCategory, number>,
    phase: KostolalyPhase,
  ) => {
    setKostolalyTarget(target);
    setKostolalyPhase(phase);
    setSelectedTarget(target); // WhatIfSimulator도 동기화
  }, []);

  return (
    <>
      {/* 0. 코스톨라니 달걀 모형 (최최상단 — 시장 국면 파악) */}
      <KostolalyPhaseCard onApplyPhase={handleApplyKostolalyPhase} />

      {/* 0.5 안심 배너 */}
      <ReassuranceBanner totalGainLoss={totalGainLoss} cfoWeather={cfoWeather} />

      {/* 1. Hero — total assets + cost-basis P&L + daily change + tier */}
      <HeroSection
        dateString={dateString}
        tierLabel={tierLabel}
        tierColor={tierColor}
        totalAssets={totalAssets}
        totalGainLoss={totalGainLoss}
        gainPercent={gainPercent}
        holdingLabel={holdingLabel}
      />

      {/* 1.5 시장 온도계 */}
      <MarketTemperature morningBriefing={morningBriefing ?? null} isAILoading={isAILoading} />

      {/* 2. Checkup header — health score grade + panic score */}
      <CheckupHeader
        healthScore={healthScore}
        panicScore={panicScore}
        totalAssets={totalAssets}
      />

      {/* 3. Six-factor health score breakdown */}
      <HealthScoreSection
        healthScore={healthScore}
        onScoreImproved={(improvement) => {
          // 향후 크레딧 적립 로직 추가 가능 (부모에서 처리)
        }}
      />

      {/* 5. Target vs current allocation drift — 코스톨라니 연동 */}
      <AllocationDriftSection
        assets={allAssets}
        totalAssets={totalAssets}
        onTargetChange={setSelectedTarget}
        kostolalyTarget={kostolalyTarget}
        kostolalyPhase={kostolalyPhase}
      />

      {/* 6. Portfolio adjustment simulation — 배분 이탈도와 같은 철학 기준 공유 */}
      <WhatIfSimulator
        assets={allAssets}
        totalAssets={totalAssets}
        currentHealthScore={healthScore.totalScore}
        philosophyTarget={selectedTarget}
      />

      {/* 7. Asset correlation matrix */}
      <CorrelationHeatmapSection assets={allAssets} totalAssets={totalAssets} />

      {/* 8. Today's actions — 처방전 (카테고리 계획 + AI 추천) */}
      <TodayActionsSection
        sortedActions={sortedActions}
        portfolio={portfolio}
        livePrices={livePrices}
        totalAssets={totalAssets}
        isAILoading={isAILoading}
        allAssets={allAssets}
        selectedTarget={selectedTarget}
      />

      {/* 9. Panic Shield + FOMO Vaccine */}
      <RiskDashboardSection
        analysisResult={analysisResult}
        peerPanicData={peerPanicData}
        isAILoading={isAILoading}
      />

      {/* 10. AI marketplace CTA — rebalance.tsx 하단에서 공통 렌더링 */}

      {/* 11. 감정 체크 */}
      {onEmotionSelect && onMemoChange && onEmotionSave && (
        <EmotionCheck
          todayEmotion={todayEmotion ?? null}
          onSelect={onEmotionSelect}
          memo={todayMemo ?? ''}
          onMemoChange={onMemoChange}
          onSave={onEmotionSave}
          rewardCredits={emotionRewardCredits}
        />
      )}

      {/* 12. Level switcher */}
      <LevelSwitcher currentLevel="advanced" onLevelChange={onLevelChange} />
    </>
  );
}
