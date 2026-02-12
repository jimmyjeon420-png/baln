/**
 * Deep Dive Components - Export Index
 * 투자심사보고서 UI 컴포넌트 (7개 섹션 + 모달)
 */

// 컴포넌트 export
export { default as ExecutiveSummary } from './ExecutiveSummary';
export { default as CompanyOverview } from './CompanyOverview';
export { BusinessModel } from './BusinessModel';
export { FinancialAnalysis } from './FinancialAnalysis';
export { default as Valuation } from './Valuation';
export { default as Risks } from './Risks';
export { default as Governance } from './Governance';
export { default as InvestmentReportModal } from './InvestmentReportModal';
export { default as QuarterlyChart } from './QuarterlyChart';
export { default as EarningsBreakdown } from './EarningsBreakdown';
export { default as ScoreRadar } from './ScoreRadar';
export { default as ScoreBreakdown } from './ScoreBreakdown';
export { default as NewsTimeline } from './NewsTimeline';
export { default as AIOpinionCard } from './AIOpinionCard';
export { default as DeepDiveReport } from './DeepDiveReport';

// 타입 re-export
export type { ExecutiveSummaryProps, InvestmentRecommendation } from './ExecutiveSummary';
export type { CompanyOverviewProps } from './CompanyOverview';
export type { ValuationMetrics } from './Valuation';
export type { RiskItem, RiskLevel } from './Risks';
export type { GovernanceData } from './Governance';
export type { QuarterlyData } from './QuarterlyChart';
export type { RevenueSegment, CostItem, WaterfallItem, EarningsBreakdownProps } from './EarningsBreakdown';
export type { ScoreRadarProps } from './ScoreRadar';
export type { ScoreBreakdownProps, ScoreBreakdownItem } from './ScoreBreakdown';
export type { NewsTimelineProps } from './NewsTimeline';
export type { AIOpinionCardProps } from './AIOpinionCard';
