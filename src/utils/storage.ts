/**
 * AsyncStorage helper functions for data persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from '../types/asset';
import { TaxSettings } from '../types/tax';
import { DEFAULT_TAX_SETTINGS } from '../constants/taxProfiles';

const STORAGE_KEY_ASSETS = '@portfolio_rebalancer_assets';
const STORAGE_KEY_PRO_STATUS = '@portfolio_rebalancer_pro';
const STORAGE_KEY_TAX_SETTINGS = '@portfolio_rebalancer_tax_settings';

/**
 * Save assets to local storage
 */
export const saveAssets = async (assets: Asset[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));
  } catch (error) {
    console.error('Error saving assets:', error);
    throw error;
  }
};

/**
 * Load assets from local storage
 */
export const loadAssets = async (): Promise<Asset[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_ASSETS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading assets:', error);
    return [];
  }
};

/**
 * Delete all assets
 */
export const clearAssets = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_ASSETS);
  } catch (error) {
    console.error('Error clearing assets:', error);
    throw error;
  }
};

/**
 * Save pro status (for future monetization)
 */
export const setProStatus = async (isPro: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PRO_STATUS, JSON.stringify(isPro));
  } catch (error) {
    console.error('Error saving pro status:', error);
    throw error;
  }
};

/**
 * Load pro status
 */
export const getProStatus = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_PRO_STATUS);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Error loading pro status:', error);
    return false;
  }
};

/**
 * Export portfolio data as JSON for backup
 */
export const exportPortfolioData = async (assets: Asset[]): Promise<string> => {
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      assets,
      version: '1.0',
    },
    null,
    2
  );
};

/**
 * Import portfolio data from JSON
 */
export const importPortfolioData = async (jsonString: string): Promise<Asset[]> => {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data.assets)) {
      return data.assets;
    }
    throw new Error('Invalid portfolio data format');
  } catch (error) {
    console.error('Error importing portfolio data:', error);
    throw error;
  }
};

/**
 * Save tax settings to local storage
 */
export const saveTaxSettings = async (settings: TaxSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_TAX_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving tax settings:', error);
    throw error;
  }
};

/**
 * Load tax settings from local storage
 * Returns default settings if not found
 */
export const loadTaxSettings = async (): Promise<TaxSettings> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_TAX_SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_TAX_SETTINGS;
  } catch (error) {
    console.error('Error loading tax settings:', error);
    return DEFAULT_TAX_SETTINGS;
  }
};
