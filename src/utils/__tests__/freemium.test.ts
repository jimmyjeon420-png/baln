/**
 * freemium.ts 테스트
 *
 * Freemium 비즈니스 로직을 테스트합니다.
 */

// Mock the i18n module to avoid import issues
jest.mock('../../locales', () => ({
  t: (key: string, params?: Record<string, any>) => {
    if (key === 'freemium.limitReached' && params?.limit) {
      return `무료 플랜은 ${params.limit}개까지 등록 가능합니다`;
    }
    return key;
  },
}));

import {
  isProUser,
  getAssetLimit,
  canAddAsset,
  getRemainingAssetSlots,
  getLimitReachedMessage,
  hasFeatureAccess,
} from '../freemium';
import { Asset, AssetType } from '../../types/asset';

describe('freemium', () => {
  const createMockAsset = (id: string): Asset => ({
    id,
    name: `Asset ${id}`,
    currentValue: 1000000,
    targetAllocation: 25,
    assetType: AssetType.LIQUID,
    createdAt: Date.now(),
  });

  describe('isProUser', () => {
    it('should return false for free users (MVP default)', () => {
      expect(isProUser()).toBe(false);
    });
  });

  describe('getAssetLimit', () => {
    it('should return 3 for free users', () => {
      expect(getAssetLimit(false)).toBe(3);
    });

    it('should return Infinity for pro users', () => {
      expect(getAssetLimit(true)).toBe(Infinity);
    });
  });

  describe('canAddAsset', () => {
    it('should allow adding assets when under free limit', () => {
      const assets = [createMockAsset('1'), createMockAsset('2')];
      expect(canAddAsset(assets, false)).toBe(true);
    });

    it('should prevent adding assets when at free limit', () => {
      const assets = [createMockAsset('1'), createMockAsset('2'), createMockAsset('3')];
      expect(canAddAsset(assets, false)).toBe(false);
    });

    it('should allow adding assets when over free limit but user is pro', () => {
      const assets = [createMockAsset('1'), createMockAsset('2'), createMockAsset('3')];
      expect(canAddAsset(assets, true)).toBe(true);
    });

    it('should handle empty asset list', () => {
      expect(canAddAsset([], false)).toBe(true);
    });

    it('should allow pro users to add unlimited assets', () => {
      const manyAssets = Array.from({ length: 100 }, (_, i) => createMockAsset(String(i)));
      expect(canAddAsset(manyAssets, true)).toBe(true);
    });
  });

  describe('getRemainingAssetSlots', () => {
    it('should return 3 slots for empty portfolio (free user)', () => {
      expect(getRemainingAssetSlots([], false)).toBe(3);
    });

    it('should return 2 slots when 1 asset exists (free user)', () => {
      const assets = [createMockAsset('1')];
      expect(getRemainingAssetSlots(assets, false)).toBe(2);
    });

    it('should return 1 slot when 2 assets exist (free user)', () => {
      const assets = [createMockAsset('1'), createMockAsset('2')];
      expect(getRemainingAssetSlots(assets, false)).toBe(1);
    });

    it('should return 0 slots when at limit (free user)', () => {
      const assets = [createMockAsset('1'), createMockAsset('2'), createMockAsset('3')];
      expect(getRemainingAssetSlots(assets, false)).toBe(0);
    });

    it('should return 0 (not negative) when over limit (free user)', () => {
      const assets = [
        createMockAsset('1'),
        createMockAsset('2'),
        createMockAsset('3'),
        createMockAsset('4'),
      ];
      expect(getRemainingAssetSlots(assets, false)).toBe(0);
    });

    it('should return Infinity for pro users', () => {
      const assets = [createMockAsset('1'), createMockAsset('2')];
      expect(getRemainingAssetSlots(assets, true)).toBe(Infinity);
    });

    it('should return Infinity for pro users even with many assets', () => {
      const manyAssets = Array.from({ length: 100 }, (_, i) => createMockAsset(String(i)));
      expect(getRemainingAssetSlots(manyAssets, true)).toBe(Infinity);
    });
  });

  describe('getLimitReachedMessage', () => {
    it('should return a message including the limit number', () => {
      const message = getLimitReachedMessage();
      expect(message).toContain('3');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should deny multiple_assets feature for free users', () => {
      expect(hasFeatureAccess('multiple_assets', false)).toBe(false);
    });

    it('should allow multiple_assets feature for pro users', () => {
      expect(hasFeatureAccess('multiple_assets', true)).toBe(true);
    });

    it('should deny export feature for free users', () => {
      expect(hasFeatureAccess('export', false)).toBe(false);
    });

    it('should allow export feature for pro users', () => {
      expect(hasFeatureAccess('export', true)).toBe(true);
    });

    it('should deny import feature for free users', () => {
      expect(hasFeatureAccess('import', false)).toBe(false);
    });

    it('should allow import feature for pro users', () => {
      expect(hasFeatureAccess('import', true)).toBe(true);
    });

    it('should deny advanced_analytics feature for free users', () => {
      expect(hasFeatureAccess('advanced_analytics', false)).toBe(false);
    });

    it('should allow advanced_analytics feature for pro users', () => {
      expect(hasFeatureAccess('advanced_analytics', true)).toBe(true);
    });

    it('should check all pro features consistently', () => {
      const proFeatures = ['multiple_assets', 'export', 'import', 'advanced_analytics'] as const;

      proFeatures.forEach(feature => {
        expect(hasFeatureAccess(feature, true)).toBe(true);
        expect(hasFeatureAccess(feature, false)).toBe(false);
      });
    });
  });
});
