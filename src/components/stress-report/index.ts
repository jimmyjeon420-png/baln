/**
 * Stress Report 컴포넌트 Export 관리
 *
 * 블랙록 4-Beat 내러티브 순서:
 * 1. ScenarioSelector → 진입점 (시나리오 선택)
 * 2. EmpathyHeader → Beat 1 (불안 인정)
 * 3. HistoricalContext → Beat 2 (역사적 맥락)
 * 4. FactorAttribution → Beat 3a (하락폭 요인 분해)
 * 5. AssetImpactWaterfall → Beat 3b (자산별 영향)
 * 6. RiskBudgetGauge → Beat 3c (리스크 예산)
 * 7. HedgingPlaybook → Beat 4a (대응 전략)
 * 8. RecoveryOutlook → Beat 4b (회복 전망)
 */

export { ScenarioSelector } from './ScenarioSelector';
export type { ScenarioType } from './ScenarioSelector';
export { EmpathyHeader } from './EmpathyHeader';
export { HistoricalContext } from './HistoricalContext';
export { FactorAttribution } from './FactorAttribution';
export { AssetImpactWaterfall } from './AssetImpactWaterfall';
export { RiskBudgetGauge } from './RiskBudgetGauge';
export { HedgingPlaybook } from './HedgingPlaybook';
export { RecoveryOutlook } from './RecoveryOutlook';
