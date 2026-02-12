/**
 * What-If Components - Export Index
 * 극한 시나리오 시뮬레이터 UI 컴포넌트
 */

// 컴포넌트 export
export { ExtremeScenarioGrid } from './ExtremeScenarioGrid';
export { ExtremeScenarioReport } from './ExtremeScenarioReport';

// 타입 re-export
export type { ExtremeScenarioGridProps } from './ExtremeScenarioGrid';
export type { ExtremeScenarioReportProps } from './ExtremeScenarioReport';

// 데이터 re-export
export { EXTREME_SCENARIOS, CATEGORY_COLORS } from '../../data/whatIfScenarios';
export type { ExtremeScenario, SectorImpact, HistoricalParallel } from '../../data/whatIfScenarios';
