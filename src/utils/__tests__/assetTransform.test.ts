/**
 * assetTransform.ts 테스트
 *
 * Asset 타입과 Supabase DB Row 간의 변환 유틸리티를 테스트합니다.
 */

import { transformDbRowToAsset, transformAssetToDbRow } from '../assetTransform';
import { Asset, AssetType } from '../../types/asset';
import { Database } from '../../types/database';

type PortfolioRow = Database['public']['Tables']['portfolios']['Row'];

describe('assetTransform', () => {
  describe('transformDbRowToAsset', () => {
    it('should transform DB row to Asset with all fields', () => {
      const mockRow: PortfolioRow = {
        id: 'test-id-123',
        user_id: 'user-123',
        name: '삼성전자',
        current_value: 1000000,
        target_allocation: 30,
        asset_type: 'liquid',
        ticker: '005930.KS',
        quantity: 10,
        avg_price: 90000,
        current_price: 100000,
        cost_basis: 900000,
        purchase_date: '2024-01-01T00:00:00Z',
        custom_tax_rate: 0.22,
        currency: 'KRW',
        display_currency: 'KRW',
        notes: '우량주',
        is_verified: false,
        verified_at: null,
        verified_value: null,
        input_type: 'self_declared',
        lawd_cd: null,
        complex_name: null,
        unit_area: null,
        unit_detail: null,
        purchase_price_krw: null,
        last_price_updated_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = transformDbRowToAsset(mockRow);

      expect(result.id).toBe('test-id-123');
      expect(result.name).toBe('삼성전자');
      expect(result.currentValue).toBe(1000000);
      expect(result.targetAllocation).toBe(30);
      expect(result.assetType).toBe(AssetType.LIQUID);
      expect(result.ticker).toBe('005930.KS');
      expect(result.quantity).toBe(10);
      expect(result.avgPrice).toBe(90000);
      expect(result.currentPrice).toBe(100000);
      expect(result.costBasis).toBe(900000);
      expect(result.customTaxRate).toBe(0.22);
      expect(result.currency).toBe('KRW');
      expect(result.notes).toBe('우량주');
      expect(result.createdAt).toBeGreaterThan(0);
    });

    it('should handle illiquid asset type', () => {
      const mockRow: PortfolioRow = {
        id: 'real-estate-1',
        user_id: 'user-123',
        name: '강남 아파트',
        current_value: 500000000,
        target_allocation: 50,
        asset_type: 'illiquid',
        ticker: null,
        quantity: null,
        avg_price: null,
        current_price: null,
        cost_basis: null,
        purchase_date: null,
        custom_tax_rate: null,
        currency: 'KRW',
        display_currency: 'KRW',
        notes: null,
        is_verified: false,
        verified_at: null,
        verified_value: null,
        input_type: 'self_declared',
        lawd_cd: null,
        complex_name: null,
        unit_area: null,
        unit_detail: null,
        purchase_price_krw: null,
        last_price_updated_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = transformDbRowToAsset(mockRow);

      expect(result.assetType).toBe(AssetType.ILLIQUID);
      expect(result.ticker).toBeUndefined();
      expect(result.quantity).toBeUndefined();
      expect(result.avgPrice).toBeUndefined();
    });

    it('should convert null fields to undefined', () => {
      const mockRow: PortfolioRow = {
        id: 'test-id',
        user_id: 'user-123',
        name: '현금',
        current_value: 5000000,
        target_allocation: 20,
        asset_type: 'liquid',
        ticker: null,
        quantity: null,
        avg_price: null,
        current_price: null,
        cost_basis: null,
        purchase_date: null,
        custom_tax_rate: null,
        currency: 'KRW',
        display_currency: 'KRW',
        notes: null,
        is_verified: false,
        verified_at: null,
        verified_value: null,
        input_type: 'self_declared',
        lawd_cd: null,
        complex_name: null,
        unit_area: null,
        unit_detail: null,
        purchase_price_krw: null,
        last_price_updated_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = transformDbRowToAsset(mockRow);

      expect(result.ticker).toBeUndefined();
      expect(result.quantity).toBeUndefined();
      expect(result.avgPrice).toBeUndefined();
      expect(result.currentPrice).toBeUndefined();
      expect(result.costBasis).toBeUndefined();
      expect(result.purchaseDate).toBeUndefined();
      expect(result.customTaxRate).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });

  describe('transformAssetToDbRow', () => {
    it('should transform Asset to DB insert object', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: 'Apple Inc.',
        currentValue: 10000000,
        targetAllocation: 25,
        assetType: AssetType.LIQUID,
        ticker: 'AAPL',
        quantity: 100,
        avgPrice: 90000,
        currentPrice: 100000,
        costBasis: 9000000,
        purchaseDate: new Date('2024-01-01').getTime(),
        customTaxRate: 0.22,
        currency: 'USD',
        notes: '미국 주식',
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.user_id).toBe('user-123');
      expect(result.name).toBe('Apple Inc.');
      expect(result.current_value).toBe(10000000);
      expect(result.target_allocation).toBe(25);
      expect(result.asset_type).toBe('liquid');
      expect(result.ticker).toBe('AAPL');
      expect(result.quantity).toBe(100);
      expect(result.avg_price).toBe(90000);
      expect(result.current_price).toBe(100000);
      expect(result.cost_basis).toBe(9000000);
      expect(result.custom_tax_rate).toBe(0.22);
      expect(result.currency).toBe('USD');
      expect(result.notes).toBe('미국 주식');
    });

    it('should calculate current_value from quantity and current_price', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: '삼성전자',
        currentValue: 0, // Will be overridden
        targetAllocation: 30,
        assetType: AssetType.LIQUID,
        ticker: '005930.KS',
        quantity: 10,
        avgPrice: 90000,
        currentPrice: 100000,
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.current_value).toBe(1000000); // 10 * 100000
    });

    it('should calculate cost_basis from quantity and avg_price', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: '삼성전자',
        currentValue: 1000000,
        targetAllocation: 30,
        assetType: AssetType.LIQUID,
        ticker: '005930.KS',
        quantity: 10,
        avgPrice: 90000,
        currentPrice: 100000,
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.cost_basis).toBe(900000); // 10 * 90000
    });

    it('should round currency values to 2 decimal places', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: 'Test',
        currentValue: 1000.9999,
        targetAllocation: 25,
        assetType: AssetType.LIQUID,
        avgPrice: 99.999,
        currentPrice: 100.001,
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.current_value).toBe(1001); // Rounded
      expect(result.avg_price).toBe(100); // Rounded
      expect(result.current_price).toBe(100); // Rounded
    });

    it('should handle illiquid asset type', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: '강남 아파트',
        currentValue: 500000000,
        targetAllocation: 50,
        assetType: AssetType.ILLIQUID,
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.asset_type).toBe('illiquid');
      expect(result.ticker).toBeNull();
      expect(result.quantity).toBeNull();
      expect(result.avg_price).toBeNull();
    });

    it('should throw error for unreasonably large values', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: 'Invalid',
        currentValue: 200_000_000_000_000, // 200조원 (비정상)
        targetAllocation: 100,
        assetType: AssetType.LIQUID,
      };

      expect(() => transformAssetToDbRow(mockAsset, 'user-123')).toThrow(/비정상적인 자산 가치/);
    });

    it('should handle NaN and Infinity values', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: 'Test',
        currentValue: NaN,
        targetAllocation: 25,
        assetType: AssetType.LIQUID,
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.current_value).toBe(0); // NaN -> 0
    });

    it('should convert undefined optional fields to null', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: '현금',
        currentValue: 5000000,
        targetAllocation: 20,
        assetType: AssetType.LIQUID,
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.ticker).toBeNull();
      expect(result.quantity).toBeNull();
      expect(result.avg_price).toBeNull();
      expect(result.current_price).toBeNull();
      expect(result.cost_basis).toBeNull();
      expect(result.purchase_date).toBeNull();
      expect(result.custom_tax_rate).toBeUndefined();
      expect(result.notes).toBeNull();
    });

    it('should use default currency KRW if not specified', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: 'Test',
        currentValue: 1000000,
        targetAllocation: 25,
        assetType: AssetType.LIQUID,
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.currency).toBe('KRW');
      expect(result.display_currency).toBe('KRW');
    });

    it('should round quantity to 8 decimal places for fractional stocks', () => {
      const mockAsset: Omit<Asset, 'id' | 'createdAt'> = {
        name: 'Fractional Stock',
        currentValue: 1000000,
        targetAllocation: 25,
        assetType: AssetType.LIQUID,
        quantity: 10.123456789,
      };

      const result = transformAssetToDbRow(mockAsset, 'user-123');

      expect(result.quantity).toBe(10.12345679); // Rounded to 8 decimals
    });
  });
});
