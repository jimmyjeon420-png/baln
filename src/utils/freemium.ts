/**
 * Freemium model logic
 */

import { Asset } from '../types/asset';
import { t } from '../locales';

// Feature limits
const FREE_ASSET_LIMIT = 3;
const PRO_ASSET_LIMIT = Infinity;

/**
 * Check if user is a pro subscriber
 * Default to false (free user)
 * In a real app, this would check authentication/subscription status
 */
export const isProUser = (): boolean => {
  // Mock function - replace with actual subscription check
  // For MVP: default to false
  return false;
};

/**
 * Get the asset limit for the user
 */
export const getAssetLimit = (isPro: boolean): number => {
  return isPro ? PRO_ASSET_LIMIT : FREE_ASSET_LIMIT;
};

/**
 * Check if user can add more assets
 */
export const canAddAsset = (currentAssets: Asset[], isPro: boolean): boolean => {
  const limit = getAssetLimit(isPro);
  return currentAssets.length < limit;
};

/**
 * Get remaining asset slots for free user
 */
export const getRemainingAssetSlots = (currentAssets: Asset[], isPro: boolean): number => {
  if (isPro) return Infinity;
  const limit = getAssetLimit(false);
  return Math.max(0, limit - currentAssets.length);
};

/**
 * Format message for reaching free limit
 */
export const getLimitReachedMessage = (): string => {
  return t('freemium.limitReached', { limit: FREE_ASSET_LIMIT });
};

/**
 * Check feature access
 */
export const hasFeatureAccess = (
  feature: 'multiple_assets' | 'export' | 'import' | 'advanced_analytics',
  isPro: boolean
): boolean => {
  const freeFeatures = ['basic_rebalancing'];
  const proFeatures = ['multiple_assets', 'export', 'import', 'advanced_analytics'];

  if (isPro) {
    return proFeatures.includes(feature);
  }

  return freeFeatures.includes(feature);
};
