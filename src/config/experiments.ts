export type CoreMetric =
  | 'd1_activation'
  | 'd7_retention'
  | 'd30_retention'
  | 'paid_conversion'
  | 'nps';

export interface WeeklyExperimentConfig {
  id: string;
  targetScreen: string;
  variants: string[];
  weekStartDate: string; // YYYY-MM-DD (월요일)
  weekEndDate: string;   // YYYY-MM-DD (일요일)
  metrics: CoreMetric[];
}

/**
 * 운영 원칙:
 * - 주당 실험은 1개만 활성화
 * - 핵심 지표는 5개로 고정 (D1/D7/D30/유료전환/NPS)
 */
export const ACTIVE_WEEKLY_EXPERIMENT: WeeklyExperimentConfig = {
  id: 'paywall-value-proof-v1',
  targetScreen: 'subscription_paywall',
  variants: ['control', 'value_first'],
  weekStartDate: '2026-02-16',
  weekEndDate: '2026-02-22',
  metrics: ['d1_activation', 'd7_retention', 'd30_retention', 'paid_conversion', 'nps'],
};

export function isWithinExperimentWeek(date = new Date()): boolean {
  const today = date.toISOString().slice(0, 10);
  return today >= ACTIVE_WEEKLY_EXPERIMENT.weekStartDate
    && today <= ACTIVE_WEEKLY_EXPERIMENT.weekEndDate;
}

