import React, { useState, useCallback, useEffect } from 'react';

import type { HealthScoreResult } from '../../services/rebalanceScore';
import { DEFAULT_TARGET, AssetCategory, KostolalyPhase } from '../../services/rebalanceScore';
import { useKostolalyPhase } from '../../hooks/useKostolalyPhase';
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

  // DB에서 현재 코스톨라니 단계 자동 로드 → selectedTarget 자동 연동
  const { phase: autoPhase, target: autoTarget } = useKostolalyPhase();
  useEffect(() => {
    // 사용자가 아직 수동으로 "배분 적용"을 누르지 않았을 때만 자동 적용
    if (autoTarget && autoPhase && kostolalyPhase === null) {
      setKostolalyTarget(autoTarget);
      setKostolalyPhase(autoPhase);
      setSelectedTarget(autoTarget);
    }
  }, [autoTarget, autoPhase]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* 1. 처방전 — 결론 먼저 (이승건 원칙: 헤드라인 최상단) */}
      {/* 처방전 헤더 내에 코스톨라니 서문(단계+신뢰도+설명) 내장됨 */}
      <TodayActionsSection
        sortedActions={sortedActions}
        portfolio={portfolio}
        livePrices={livePrices}
        totalAssets={totalAssets}
        isAILoading={isAILoading}
        allAssets={allAssets}
        selectedTarget={selectedTarget}
        kostolalyPhase={kostolalyPhase}
      />

      {/* 2. 코스톨라니 달걀 모형 — 처방전 근거 카드 ("왜 이런 처방전인가?") */}
      <KostolalyPhaseCard onApplyPhase={handleApplyKostolalyPhase} />

      {/* 3. 안심 배너 */}
      <ReassuranceBanner totalGainLoss={totalGainLoss} cfoWeather={cfoWeather} />

      {/* 3. Hero — total assets + cost-basis P&L + daily change + tier */}
      <HeroSection
        dateString={dateString}
        tierLabel={tierLabel}
        tierColor={tierColor}
        totalAssets={totalAssets}
        totalGainLoss={totalGainLoss}
        gainPercent={gainPercent}
        holdingLabel={holdingLabel}
      />

      {/* 4. 시장 온도계 */}
      <MarketTemperature morningBriefing={morningBriefing ?? null} isAILoading={isAILoading} />

      {/* 5. Checkup header — health score grade + panic score */}
      <CheckupHeader
        healthScore={healthScore}
        panicScore={panicScore}
        totalAssets={totalAssets}
      />

      {/* 6. Six-factor health score breakdown */}
      <HealthScoreSection
        healthScore={healthScore}
        totalAssets={totalAssets}
        onScoreImproved={(improvement) => {
          // 향후 크레딧 적립 로직 추가 가능 (부모에서 처리)
        }}
      />

      {/* 7. Target vs current allocation drift — 코스톨라니 연동 */}
      <AllocationDriftSection
        assets={allAssets}
        totalAssets={totalAssets}
        onTargetChange={setSelectedTarget}
        kostolalyTarget={kostolalyTarget}
        kostolalyPhase={kostolalyPhase}
      />

      {/* 8. Portfolio adjustment simulation — 배분 이탈도와 같은 철학 기준 공유 */}
      <WhatIfSimulator
        assets={allAssets}
        totalAssets={totalAssets}
        currentHealthScore={healthScore.totalScore}
        philosophyTarget={selectedTarget}
      />

      {/* 9. Asset correlation matrix */}
      <CorrelationHeatmapSection assets={allAssets} totalAssets={totalAssets} />

      {/* 10. Panic Shield + FOMO Vaccine */}
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
    </>
  );
}
