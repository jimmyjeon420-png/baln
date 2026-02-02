/**
 * Core data structures for the Portfolio Rebalancing Calculator
 */

export enum AssetType {
  LIQUID = 'liquid',
  ILLIQUID = 'illiquid'
}

export interface Asset {
  id: string;
  name: string;
  currentValue: number; // in USD
  targetAllocation: number; // percentage (0-100)
  createdAt: number; // timestamp

  // Asset classification
  assetType: AssetType;

  // 주식 관련 필드
  ticker?: string;
  quantity?: number;        // 보유 수량
  avgPrice?: number;        // 평균 단가
  currentPrice?: number;    // 현재 시세

  // Tax tracking
  costBasis?: number;
  purchaseDate?: number; // unix timestamp
  customTaxRate?: number; // override percentage

  // Metadata
  currency?: string;
  notes?: string;
}

export interface TaxImpact {
  capitalGains: number;
  taxAmount: number;
  effectiveTaxRate: number;
  netProceeds: number;
  tradeFee: number;
  netBenefit: number; // netProceeds relative to cost basis
  holdingPeriodDays?: number;
}

export interface RebalanceAction {
  assetId: string;
  assetName: string;
  currentValue: number;
  targetValue: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number; // absolute amount to buy or sell
  percentage: number; // percentage change needed

  // Tax impact for SELL actions
  taxImpact?: TaxImpact;
}

export interface PortfolioSummary {
  totalValue: number;
  totalAllocationPercentage: number; // should be 100 for valid portfolio
  actions: RebalanceAction[];
  isBalanced: boolean; // true if all allocations match targets

  // After-tax metrics
  totalLiquidValue: number;
  totalIlliquidValue: number;
  totalTaxImpact: number;
  totalTradeFees: number;
  totalNetBenefit: number;
}
