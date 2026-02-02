/**
 * Tax profiles for 11 countries with default rates
 * Values represent long-term capital gains tax rates (approximate averages)
 */

import { Country, CountryTaxProfile } from '../types/tax';

export const COUNTRY_TAX_PROFILES: CountryTaxProfile[] = [
  {
    code: Country.USA,
    name: 'United States',
    flag: '🇺🇸',
    capitalGainsTaxRate: 20, // 20% federal long-term average (15% + 3.8% NIIT + state varies)
    tradeFeePercent: 0.1,
    currency: 'USD',
    notes: 'Federal long-term capital gains rate; state taxes vary'
  },
  {
    code: Country.CHINA,
    name: 'China',
    flag: '🇨🇳',
    capitalGainsTaxRate: 20,
    tradeFeePercent: 0.1,
    currency: 'CNY',
    notes: 'Simplified assumption for PRC investment taxation'
  },
  {
    code: Country.GERMANY,
    name: 'Germany',
    flag: '🇩🇪',
    capitalGainsTaxRate: 26.375, // 25% + 5.5% solidarity surcharge
    tradeFeePercent: 0.1,
    currency: 'EUR',
    notes: 'Flat tax on capital gains (Kapitalertragsteuer)'
  },
  {
    code: Country.JAPAN,
    name: 'Japan',
    flag: '🇯🇵',
    capitalGainsTaxRate: 20.315, // 15% national + 5% local + 0.315% special
    tradeFeePercent: 0.1,
    currency: 'JPY',
    notes: 'Combined national and local tax rate'
  },
  {
    code: Country.INDIA,
    name: 'India',
    flag: '🇮🇳',
    capitalGainsTaxRate: 15, // Long-term capital gains tax for listed securities
    tradeFeePercent: 0.1,
    currency: 'INR',
    notes: 'Long-term rate for held >1 year; short-term higher'
  },
  {
    code: Country.UK,
    name: 'United Kingdom',
    flag: '🇬🇧',
    capitalGainsTaxRate: 20, // Standard CGT rate
    tradeFeePercent: 0.1,
    currency: 'GBP',
    notes: 'Standard capital gains tax rate after exemption'
  },
  {
    code: Country.FRANCE,
    name: 'France',
    flag: '🇫🇷',
    capitalGainsTaxRate: 30, // PFU (Prélèvement Forfaitaire Unique) flat tax
    tradeFeePercent: 0.1,
    currency: 'EUR',
    notes: 'Flat tax rate under PFU regime; plus social charges'
  },
  {
    code: Country.ITALY,
    name: 'Italy',
    flag: '🇮🇹',
    capitalGainsTaxRate: 26, // Fixed rate capital gains tax
    tradeFeePercent: 0.1,
    currency: 'EUR',
    notes: 'Fixed capital gains tax rate'
  },
  {
    code: Country.BRAZIL,
    name: 'Brazil',
    flag: '🇧🇷',
    capitalGainsTaxRate: 15, // Standard rate for stock transactions
    tradeFeePercent: 0.1,
    currency: 'BRL',
    notes: 'Rate on stock trading; varies by transaction type'
  },
  {
    code: Country.CANADA,
    name: 'Canada',
    flag: '🇨🇦',
    capitalGainsTaxRate: 25, // 50% inclusion + marginal tax rate ~50%
    tradeFeePercent: 0.1,
    currency: 'CAD',
    notes: '50% of gains taxable; effective rate depends on bracket'
  },
  {
    code: Country.SOUTH_KOREA,
    name: 'South Korea',
    flag: '🇰🇷',
    capitalGainsTaxRate: 22, // 20% national + 2% local
    tradeFeePercent: 0.1,
    currency: 'KRW',
    notes: 'Combined national and local tax rate'
  }
];

/**
 * Get tax profile for a specific country
 */
export const getTaxProfile = (country: Country): CountryTaxProfile | undefined => {
  return COUNTRY_TAX_PROFILES.find(profile => profile.code === country);
};

/**
 * Get all country codes for selecting from a list
 */
export const getCountryCodes = (): Country[] => {
  return COUNTRY_TAX_PROFILES.map(profile => profile.code);
};

/**
 * Default tax settings for new users
 */
export const DEFAULT_TAX_SETTINGS = {
  selectedCountry: Country.USA,
  customTaxRate: undefined,
  customTradeFee: undefined,
  includeInCalculations: true
};
