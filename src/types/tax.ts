/**
 * Tax system types and interfaces
 */

export enum Country {
  USA = 'USA',
  CHINA = 'CHN',
  GERMANY = 'DEU',
  JAPAN = 'JPN',
  INDIA = 'IND',
  UK = 'GBR',
  FRANCE = 'FRA',
  ITALY = 'ITA',
  BRAZIL = 'BRA',
  CANADA = 'CAN',
  SOUTH_KOREA = 'KOR'
}

export interface CountryTaxProfile {
  code: Country;
  name: string;
  flag: string;
  capitalGainsTaxRate: number; // percentage (0-100)
  tradeFeePercent: number; // percentage (0-1)
  currency: string;
  notes?: string;
}

export interface TaxSettings {
  selectedCountry: Country;
  customTaxRate?: number; // override percentage if user sets custom rate
  customTradeFee?: number; // override trade fee percentage
  includeInCalculations: boolean;
}
