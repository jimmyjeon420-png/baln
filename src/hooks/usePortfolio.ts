/**
 * Custom hook for portfolio management
 */

import { useEffect, useState, useCallback } from 'react';
import { Asset, PortfolioSummary } from '../types/asset';
import { TaxSettings, Country } from '../types/tax';
import {
  calculateRebalancing,
  generateAssetId,
  isValidAllocation,
  getTotalAllocation,
} from '../utils/rebalanceCalculator';
import { calculateAfterTaxRebalancing } from '../utils/taxCalculator';
import { saveAssets, loadAssets, saveTaxSettings, loadTaxSettings } from '../utils/storage';
import { canAddAsset, isProUser } from '../utils/freemium';

interface UsePortfolioReturn {
  assets: Asset[];
  summary: PortfolioSummary;
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => Promise<boolean>;
  updateAsset: (id: string, asset: Omit<Asset, 'id' | 'createdAt'>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isLoading: boolean;
  isPro: boolean;
  canAddMore: boolean;
  totalAllocation: number;
  taxSettings: TaxSettings | null;
  updateTaxSettings: (settings: TaxSettings) => Promise<void>;
}

export const usePortfolio = (): UsePortfolioReturn => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalValue: 0,
    totalAllocationPercentage: 0,
    actions: [],
    isBalanced: true,
    totalLiquidValue: 0,
    totalIlliquidValue: 0,
    totalTaxImpact: 0,
    totalTradeFees: 0,
    totalNetBenefit: 0,
  });

  const isPro = isProUser();
  const totalAllocation = getTotalAllocation(assets);
  const canAddMore = canAddAsset(assets, isPro);

  // Load assets and tax settings from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedAssets, settings] = await Promise.all([
          loadAssets(),
          loadTaxSettings(),
        ]);
        setAssets(savedAssets);
        setTaxSettings(settings);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Recalculate summary whenever assets or tax settings change
  useEffect(() => {
    // Use provided tax settings or calculate with default US settings
    const settingsToUse = taxSettings || {
      selectedCountry: Country.USA,
      includeInCalculations: false,
    };
    const newSummary = calculateAfterTaxRebalancing(assets, settingsToUse);
    setSummary(newSummary);
  }, [assets, taxSettings]);

  // Add new asset
  const addAsset = useCallback(
    async (assetData: Omit<Asset, 'id' | 'createdAt'>): Promise<boolean> => {
      // Check if user can add more assets
      if (!canAddAsset(assets, isPro)) {
        console.warn('Asset limit reached');
        return false;
      }

      const newAsset: Asset = {
        ...assetData,
        id: generateAssetId(),
        createdAt: Date.now(),
      };

      const updatedAssets = [...assets, newAsset];

      try {
        await saveAssets(updatedAssets);
        setAssets(updatedAssets);
        return true;
      } catch (error) {
        console.error('Failed to add asset:', error);
        return false;
      }
    },
    [assets, isPro]
  );

  // Update asset
  const updateAsset = useCallback(
    async (id: string, assetData: Omit<Asset, 'id' | 'createdAt'>): Promise<void> => {
      const updatedAssets = assets.map((asset) =>
        asset.id === id
          ? {
              ...assetData,
              id: asset.id,
              createdAt: asset.createdAt,
            }
          : asset
      );

      try {
        await saveAssets(updatedAssets);
        setAssets(updatedAssets);
      } catch (error) {
        console.error('Failed to update asset:', error);
        throw error;
      }
    },
    [assets]
  );

  // Delete asset
  const deleteAsset = useCallback(
    async (id: string): Promise<void> => {
      const updatedAssets = assets.filter((asset) => asset.id !== id);

      try {
        await saveAssets(updatedAssets);
        setAssets(updatedAssets);
      } catch (error) {
        console.error('Failed to delete asset:', error);
        throw error;
      }
    },
    [assets]
  );

  // Clear all assets
  const clearAll = useCallback(async (): Promise<void> => {
    try {
      await saveAssets([]);
      setAssets([]);
    } catch (error) {
      console.error('Failed to clear assets:', error);
      throw error;
    }
  }, []);

  // Update tax settings
  const updateTaxSettings = useCallback(async (settings: TaxSettings): Promise<void> => {
    try {
      await saveTaxSettings(settings);
      setTaxSettings(settings);
    } catch (error) {
      console.error('Failed to update tax settings:', error);
      throw error;
    }
  }, []);

  return {
    assets,
    summary,
    addAsset,
    updateAsset,
    deleteAsset,
    clearAll,
    isLoading,
    isPro,
    canAddMore,
    totalAllocation,
    taxSettings,
    updateTaxSettings,
  };
};
