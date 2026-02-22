import React, { useState, useCallback, useEffect } from 'react';

import { DEFAULT_TARGET, type HealthScoreResult, type AssetCategory } from '../../services/rebalanceScore';
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
import HealthScoreSection from '../rebalance/HealthScoreSection';
import AllocationDriftSection from '../rebalance/AllocationDriftSection';
import WhatIfSimulator from '../rebalance/WhatIfSimulator';
import CorrelationHeatmapSection from '../rebalance/CorrelationHeatmapSection';
import TodayActionsSection from '../rebalance/TodayActionsSection';
import RiskDashboardSection from '../rebalance/RiskDashboardSection';
import AIAnalysisCTA from './AIAnalysisCTA';
// KostolalyPhaseCard 제거 — 코스톨라니 배분은 DB 자동 로드로 적용

interface AdvancedCheckupViewProps {
  healthScore: HealthScoreResult;
  allAssets: Asset[];
  totalAssets: number;
  philosophyTarget: Record<AssetCategory, number>;
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
  /** AllocationDriftSection에서 철학 탭이 바뀔 때 rebalance.tsx로 target 전파 (건강점수 재계산용) */
  onTargetUpdate?: (target: Record<AssetCategory, number>) => void;
  /** 선택된 투자 철학 (처방전 카드 정렬 + 불일치 경고용) */
  guruStyle?: string;
  /** 맥락 카드 심리 (크로스탭 연동: 처방전 + 리스크 대시보드에 전달) */
  contextSentiment?: 'calm' | 'caution' | 'alert' | null;
  /** 맥락 카드 헤드라인 (크로스탭 연동: 처방전에 인라인 표시) */
  contextHeadline?: string | null;
}

export default function AdvancedCheckupView({
  healthScore,
  allAssets,
  totalAssets,
  philosophyTarget,
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
  onTargetUpdate,
  guruStyle,
  contextSentiment,
  contextHeadline,
}: AdvancedCheckupViewProps) {
  // AllocationDriftSection에서 선택된 철학 목표 → WhatIfSimulator + TodayActionsSection 전달
  const [selectedTarget, setSelectedTarget] = useState<Record<AssetCategory, number>>(philosophyTarget ?? DEFAULT_TARGET);

  // 부모(rebalance.tsx) 철학 목표가 바뀌면 내부 기준도 즉시 동기화
  useEffect(() => {
    if (philosophyTarget) {
      setSelectedTarget(philosophyTarget);
    }
  }, [philosophyTarget]);

  // target 변경 시 자신의 state + 부모(rebalance.tsx)에 동시 전파 → 건강점수 재계산 연동
  const handleTargetChange = useCallback((t: Record<AssetCategory, number>) => {
    setSelectedTarget(t);
    onTargetUpdate?.(t);
  }, [onTargetUpdate]);

  // DB에서 현재 코스톨라니 국면 자동 로드 → AllocationDriftSection에 전달 (3구루에 25% 반영)
  const { phase: kostolalyPhase } = useKostolalyPhase();

  return (
    <>
      {/* 1. 처방전 — 결론 먼저 (이승건 원칙: 헤드라인 최상단) */}
      {/* 처방전 헤더 내에 코스톨라니 서문(단계+신뢰도+설명) 내장됨 */}
      <TodayActionsSection
        sortedActions={sortedActions}
        portfolio={portfolio}
        livePrices={livePrices}
        totalAssets={totalAssets}
        currentHealthScore={healthScore.totalScore}
        isAILoading={isAILoading}
        allAssets={allAssets}
        selectedTarget={selectedTarget}
        kostolalyPhase={kostolalyPhase}
        guruStyle={guruStyle}
        contextSentiment={contextSentiment}
        contextHeadline={contextHeadline}
      />

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

      {/* 5+6. 건강점수 통합 섹션 (CheckupHeader + HealthScoreSection 합침) */}
      <HealthScoreSection
        healthScore={healthScore}
        totalAssets={totalAssets}
        panicScore={panicScore}
        onScoreImproved={(improvement) => {
          // 향후 크레딧 적립 로직 추가 가능 (부모에서 처리)
        }}
      />

      {/* 7. Target vs current allocation drift — 코스톨라니 연동 */}
      <AllocationDriftSection
        assets={allAssets}
        totalAssets={totalAssets}
        onTargetChange={handleTargetChange}
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
        contextSentiment={contextSentiment}
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
