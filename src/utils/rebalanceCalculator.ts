/**
 * Core rebalancing calculation logic
 */

import { Asset, RebalanceAction, PortfolioSummary } from '../types/asset';

const TOLERANCE = 0.5; // Allow 0.5% deviation from target before recommending rebalancing

/**
 * Calculate rebalancing actions for a given portfolio
 * @param assets - Array of assets in the portfolio
 * @returns PortfolioSummary with calculated actions
 */
export const calculateRebalancing = (assets: Asset[]): PortfolioSummary => {
  // Validate inputs
  if (assets.length === 0) {
    return {
      totalValue: 0,
      totalAllocationPercentage: 0,
      actions: [],
      isBalanced: true,
      totalLiquidValue: 0,
      totalIlliquidValue: 0,
      totalTaxImpact: 0,
      totalTradeFees: 0,
      totalNetBenefit: 0,
    };
  }

  // Calculate total portfolio value (NaN/Infinity defense)
  const totalValue = assets.reduce((sum, asset) => {
    const val = asset.currentValue;
    return sum + (Number.isFinite(val) ? val : 0);
  }, 0);

  if (totalValue <= 0) {
    return {
      totalValue: 0,
      totalAllocationPercentage: 0,
      actions: [],
      isBalanced: false,
      totalLiquidValue: 0,
      totalIlliquidValue: 0,
      totalTaxImpact: 0,
      totalTradeFees: 0,
      totalNetBenefit: 0,
    };
  }

  // Calculate current allocations
  const actions: RebalanceAction[] = assets.map((asset) => {
    // NaN defense: ensure currentValue is finite
    const safeCurrentValue = Number.isFinite(asset.currentValue) ? asset.currentValue : 0;
    const safeTargetAlloc = Number.isFinite(asset.targetAllocation) ? asset.targetAllocation : 0;
    const currentPercentage = (safeCurrentValue / totalValue) * 100;
    const targetValue = (safeTargetAlloc / 100) * totalValue;
    const difference = targetValue - safeCurrentValue;
    const percentageDifference = safeTargetAlloc - currentPercentage;

    // Determine action
    let action: 'BUY' | 'SELL' | 'HOLD';
    if (Math.abs(percentageDifference) <= TOLERANCE) {
      action = 'HOLD';
    } else if (difference > 0) {
      action = 'BUY';
    } else {
      action = 'SELL';
    }

    return {
      assetId: asset.id,
      assetName: asset.name,
      currentValue: safeCurrentValue,
      targetValue: Math.round(targetValue * 100) / 100, // Round to 2 decimals
      action,
      amount: Math.round(Math.abs(difference) * 100) / 100,
      percentage: Math.round(percentageDifference * 100) / 100,
    };
  });

  // Check if portfolio is balanced
  const isBalanced = actions.every((action) => action.action === 'HOLD');

  // Validate that target allocations sum to 100%
  const totalAllocationPercentage =
    assets.reduce((sum, asset) => sum + asset.targetAllocation, 0);

  // Calculate liquid and illiquid values
  const totalLiquidValue = assets
    .filter((a) => a.assetType === 'liquid')
    .reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalIlliquidValue = assets
    .filter((a) => a.assetType === 'illiquid')
    .reduce((sum, asset) => sum + asset.currentValue, 0);

  // Calculate tax impacts
  const totalTaxImpact = actions.reduce((sum, action) => {
    return sum + (action.taxImpact?.taxAmount || 0);
  }, 0);
  const totalTradeFees = actions.reduce((sum, action) => {
    return sum + (action.taxImpact?.tradeFee || 0);
  }, 0);
  const totalNetBenefit = actions.reduce((sum, action) => {
    return sum + (action.taxImpact?.netBenefit || 0);
  }, 0);

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalAllocationPercentage: Math.round(totalAllocationPercentage * 100) / 100,
    actions,
    isBalanced,
    totalLiquidValue: Math.round(totalLiquidValue * 100) / 100,
    totalIlliquidValue: Math.round(totalIlliquidValue * 100) / 100,
    totalTaxImpact: Math.round(totalTaxImpact * 100) / 100,
    totalTradeFees: Math.round(totalTradeFees * 100) / 100,
    totalNetBenefit: Math.round(totalNetBenefit * 100) / 100,
  };
};

/**
 * Validate that target allocations sum to approximately 100%
 * @param assets - Array of assets
 * @returns true if valid, false otherwise
 */
export const isValidAllocation = (assets: Asset[]): boolean => {
  if (assets.length === 0) return true;

  const total = assets.reduce((sum, asset) => sum + asset.targetAllocation, 0);
  // Allow small floating point errors
  return Math.abs(total - 100) < 0.1;
};

/**
 * Calculate the sum of all target allocations
 * @param assets - Array of assets
 * @returns Total allocation percentage
 */
export const getTotalAllocation = (assets: Asset[]): number => {
  return assets.reduce((sum, asset) => sum + asset.targetAllocation, 0);
};

/**
 * Generate a unique ID for an asset
 * @returns UUID string
 */
export const generateAssetId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
