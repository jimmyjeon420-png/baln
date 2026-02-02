/**
 * Tax calculation engine for after-tax rebalancing
 * Handles capital gains calculations, tax impacts, and net proceeds
 */

import { Asset, TaxImpact, PortfolioSummary, RebalanceAction } from '../types/asset';
import { CountryTaxProfile, TaxSettings, Country } from '../types/tax';
import { getTaxProfile } from '../constants/taxProfiles';

const DEFAULT_TRADE_FEE_PERCENT = 0.1; // 0.1% default

/**
 * Calculate tax impact for selling an asset
 *
 * @param asset - The asset being sold
 * @param sellAmount - Amount in USD to sell
 * @param taxSettings - Current tax settings (country and overrides)
 * @returns TaxImpact breakdown with capital gains, tax, and net proceeds
 */
export const calculateTaxImpact = (
  asset: Asset,
  sellAmount: number,
  taxSettings: TaxSettings
): TaxImpact => {
  // If no cost basis, we can't calculate tax impact
  if (!asset.costBasis || sellAmount === 0) {
    return {
      capitalGains: 0,
      taxAmount: 0,
      effectiveTaxRate: 0,
      netProceeds: sellAmount,
      tradeFee: 0,
      netBenefit: 0,
      holdingPeriodDays: undefined
    };
  }

  // Get tax profile for the selected country
  const taxProfile = getTaxProfile(taxSettings.selectedCountry);
  if (!taxProfile) {
    throw new Error(`Unknown tax profile for country: ${taxSettings.selectedCountry}`);
  }

  // Determine tax rate (use override if provided, otherwise use country default)
  const effectiveTaxRate = asset.customTaxRate ?? taxSettings.customTaxRate ?? taxProfile.capitalGainsTaxRate;

  // Determine trade fee percentage
  const tradeFeePercent = taxSettings.customTradeFee ?? taxProfile.tradeFeePercent ?? DEFAULT_TRADE_FEE_PERCENT;

  // Calculate proportional cost basis
  // If selling partial position, only the proportional basis applies
  const proportionalBasis = (sellAmount / asset.currentValue) * (asset.costBasis || 0);

  // Calculate capital gains (can be negative for losses)
  const capitalGains = sellAmount - proportionalBasis;

  // Tax only applies to positive gains; losses have no tax benefit in this simplified model
  const taxAmount = Math.max(0, capitalGains * (effectiveTaxRate / 100));

  // Calculate trade fee
  const tradeFee = sellAmount * (tradeFeePercent / 100);

  // Net proceeds after tax and fees
  const netProceeds = sellAmount - taxAmount - tradeFee;

  // Net benefit relative to cost basis (what you keep after all costs)
  const netBenefit = netProceeds - proportionalBasis;

  // Calculate holding period if purchase date exists
  let holdingPeriodDays: number | undefined;
  if (asset.purchaseDate) {
    const nowMs = Date.now();
    const purchaseDateMs = asset.purchaseDate * 1000; // Convert to milliseconds
    holdingPeriodDays = Math.floor((nowMs - purchaseDateMs) / (1000 * 60 * 60 * 24));
  }

  return {
    capitalGains,
    taxAmount,
    effectiveTaxRate,
    netProceeds,
    tradeFee,
    netBenefit,
    holdingPeriodDays
  };
};

/**
 * Calculate after-tax rebalancing summary
 *
 * Separates liquid and illiquid assets, calculates rebalancing actions
 * only for liquid assets, and includes tax impact calculations
 *
 * @param assets - All assets in the portfolio
 * @param taxSettings - Current tax settings
 * @returns PortfolioSummary with tax-aware metrics
 */
export const calculateAfterTaxRebalancing = (
  assets: Asset[],
  taxSettings: TaxSettings,
  tolerance: number = 0.5
): PortfolioSummary => {
  // Separate liquid and illiquid assets
  const liquidAssets = assets.filter(asset => asset.assetType === 'liquid');
  const illiquidAssets = assets.filter(asset => asset.assetType === 'illiquid');

  // Calculate totals
  const totalLiquidValue = liquidAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalIlliquidValue = illiquidAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalValue = totalLiquidValue + totalIlliquidValue;

  // Calculate total target allocation across all assets
  const totalAllocationPercentage = assets.reduce((sum, asset) => sum + asset.targetAllocation, 0);

  // Generate rebalancing actions for LIQUID assets only
  const actions: RebalanceAction[] = [];
  let totalTaxImpact = 0;
  let totalTradeFees = 0;
  let totalNetBenefit = 0;

  if (totalLiquidValue > 0) {
    liquidAssets.forEach(asset => {
      const currentAllocation = (asset.currentValue / totalLiquidValue) * 100;
      const targetValue = (asset.targetAllocation / 100) * totalLiquidValue;
      const difference = targetValue - asset.currentValue;
      const differencePercent = (difference / asset.currentValue) * 100;

      let action: 'BUY' | 'SELL' | 'HOLD';
      let amount = 0;
      let taxImpact: TaxImpact | undefined;

      if (Math.abs(differencePercent) > tolerance) {
        if (difference > 0) {
          action = 'BUY';
          amount = Math.round(difference * 100) / 100;
        } else {
          action = 'SELL';
          amount = Math.round(Math.abs(difference) * 100) / 100;

          // Calculate tax impact for SELL actions if tax calculations enabled
          if (taxSettings.includeInCalculations && amount > 0) {
            taxImpact = calculateTaxImpact(asset, amount, taxSettings);
            totalTaxImpact += taxImpact.taxAmount;
            totalTradeFees += taxImpact.tradeFee;
            totalNetBenefit += taxImpact.netBenefit;
          }
        }
      } else {
        action = 'HOLD';
      }

      actions.push({
        assetId: asset.id,
        assetName: asset.name,
        currentValue: asset.currentValue,
        targetValue,
        action,
        amount,
        percentage: differencePercent,
        taxImpact
      });
    });
  }

  // Check if portfolio is balanced (all actions are HOLD)
  const isBalanced = actions.every(action => action.action === 'HOLD');

  return {
    totalValue,
    totalAllocationPercentage,
    actions,
    isBalanced,
    totalLiquidValue,
    totalIlliquidValue,
    totalTaxImpact,
    totalTradeFees,
    totalNetBenefit
  };
};
