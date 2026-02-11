/**
 * Tax Calculator Test Suite
 *
 * 테스트 대상: src/utils/taxCalculator.ts
 * - calculateTaxImpact(): 자산 매도 시 세금/수수료 계산
 * - calculateAfterTaxRebalancing(): 포트폴리오 전체 리밸런싱
 */

import { calculateTaxImpact, calculateAfterTaxRebalancing } from '../taxCalculator';
import { Asset, AssetType } from '../../types/asset';
import { Country, TaxSettings } from '../../types/tax';

describe('taxCalculator - calculateTaxImpact', () => {
  // 기본 테스트 자산 (1,000만원 투자 → 1,500만원 평가)
  const mockAsset: Asset = {
    id: 'asset-1',
    name: 'Samsung Electronics',
    currentValue: 15000,
    targetAllocation: 30,
    createdAt: Date.now(),
    assetType: AssetType.LIQUID,
    costBasis: 10000, // 매수가 1,000만원
    purchaseDate: Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000) // 1년 전
  };

  // 기본 세금 설정 (한국)
  const taxSettingsKR: TaxSettings = {
    selectedCountry: Country.SOUTH_KOREA,
    includeInCalculations: true
  };

  describe('1. 국가별 세율 적용', () => {
    test('한국 세율 22% 적용', () => {
      const taxSettingsKR: TaxSettings = {
        selectedCountry: Country.SOUTH_KOREA,
        includeInCalculations: true
      };

      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsKR);

      // 양도차익: 15,000 - 10,000 = 5,000
      // 세금: 5,000 * 0.22 = 1,100
      expect(result.capitalGains).toBe(5000);
      expect(result.taxAmount).toBe(1100);
      expect(result.effectiveTaxRate).toBe(22);
    });

    test('미국 세율 20% 적용', () => {
      const taxSettingsUS: TaxSettings = {
        selectedCountry: Country.USA,
        includeInCalculations: true
      };

      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsUS);

      // 양도차익: 5,000
      // 세금: 5,000 * 0.20 = 1,000
      expect(result.capitalGains).toBe(5000);
      expect(result.taxAmount).toBe(1000);
      expect(result.effectiveTaxRate).toBe(20);
    });

    test('독일 세율 26.375% 적용', () => {
      const taxSettingsDE: TaxSettings = {
        selectedCountry: Country.GERMANY,
        includeInCalculations: true
      };

      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsDE);

      // 양도차익: 5,000
      // 세금: 5,000 * 0.26375 = 1,318.75
      expect(result.capitalGains).toBe(5000);
      expect(result.taxAmount).toBe(1318.75);
      expect(result.effectiveTaxRate).toBe(26.375);
    });
  });

  describe('2. 양도차익 계산', () => {
    test('수익 자산 (매수가 100만원 → 현재가 150만원)', () => {
      const profitAsset: Asset = {
        ...mockAsset,
        currentValue: 1500000,
        costBasis: 1000000
      };

      const result = calculateTaxImpact(profitAsset, 1500000, taxSettingsKR);

      // 양도차익: 1,500,000 - 1,000,000 = 500,000
      // 세금: 500,000 * 0.22 = 110,000
      expect(result.capitalGains).toBe(500000);
      expect(result.taxAmount).toBe(110000);
    });

    test('손실 자산 (매수가 100만원 → 현재가 80만원)', () => {
      const lossAsset: Asset = {
        ...mockAsset,
        currentValue: 800000,
        costBasis: 1000000
      };

      const result = calculateTaxImpact(lossAsset, 800000, taxSettingsKR);

      // 양도차익: 800,000 - 1,000,000 = -200,000 (손실)
      // 세금: 손실에는 세금 없음 → 0
      expect(result.capitalGains).toBe(-200000);
      expect(result.taxAmount).toBe(0); // 손실 시 세금 0
      expect(result.netProceeds).toBeLessThan(800000); // 수수료만 차감
    });
  });

  describe('3. 수수료 계산', () => {
    test('기본 수수료 0.1% 적용', () => {
      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsKR);

      // 수수료: 15,000 * 0.001 = 15
      expect(result.tradeFee).toBe(15);
    });

    test('커스텀 수수료 0.2% 적용', () => {
      const taxSettingsCustomFee: TaxSettings = {
        ...taxSettingsKR,
        customTradeFee: 0.2
      };

      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsCustomFee);

      // 수수료: 15,000 * 0.002 = 30
      expect(result.tradeFee).toBe(30);
    });

    test('수수료 0% (무료 거래)', () => {
      const taxSettingsZeroFee: TaxSettings = {
        ...taxSettingsKR,
        customTradeFee: 0
      };

      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsZeroFee);

      expect(result.tradeFee).toBe(0);
    });
  });

  describe('4. 비례 배분 (부분 매도)', () => {
    test('자산의 50%만 매도', () => {
      const halfSellAmount = 7500; // 전체 15,000의 절반

      const result = calculateTaxImpact(mockAsset, halfSellAmount, taxSettingsKR);

      // 비례 매수가: (7,500 / 15,000) * 10,000 = 5,000
      // 양도차익: 7,500 - 5,000 = 2,500
      // 세금: 2,500 * 0.22 = 550
      expect(result.capitalGains).toBe(2500);
      expect(result.taxAmount).toBe(550);
    });

    test('자산의 10%만 매도', () => {
      const tenPercentSellAmount = 1500; // 전체 15,000의 10%

      const result = calculateTaxImpact(mockAsset, tenPercentSellAmount, taxSettingsKR);

      // 비례 매수가: (1,500 / 15,000) * 10,000 = 1,000
      // 양도차익: 1,500 - 1,000 = 500
      // 세금: 500 * 0.22 = 110
      expect(result.capitalGains).toBe(500);
      expect(result.taxAmount).toBe(110);
    });
  });

  describe('5. 순수익 계산', () => {
    test('netProceeds = 매도금액 - 세금 - 수수료', () => {
      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsKR);

      // 매도금액: 15,000
      // 세금: 1,100
      // 수수료: 15
      // 순수익: 15,000 - 1,100 - 15 = 13,885
      expect(result.netProceeds).toBe(13885);
    });

    test('netBenefit = 순수익 - 매수가 (실제 이익)', () => {
      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsKR);

      // 순수익: 13,885
      // 매수가: 10,000
      // 실제 이익: 13,885 - 10,000 = 3,885
      expect(result.netBenefit).toBe(3885);
    });
  });

  describe('6. Edge Cases', () => {
    test('costBasis가 없으면 세금 0', () => {
      const assetNoBasis: Asset = {
        ...mockAsset,
        costBasis: undefined
      };

      const result = calculateTaxImpact(assetNoBasis, 15000, taxSettingsKR);

      expect(result.capitalGains).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.netProceeds).toBe(15000); // 매도금액 그대로
    });

    test('sellAmount가 0이면 모든 값 0', () => {
      const result = calculateTaxImpact(mockAsset, 0, taxSettingsKR);

      expect(result.capitalGains).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.netProceeds).toBe(0);
      expect(result.tradeFee).toBe(0);
    });

    test('customTaxRate 우선 적용', () => {
      const taxSettingsCustom: TaxSettings = {
        ...taxSettingsKR,
        customTaxRate: 15 // 커스텀 15% (한국 기본 22% 대신)
      };

      const result = calculateTaxImpact(mockAsset, 15000, taxSettingsCustom);

      // 세금: 5,000 * 0.15 = 750
      expect(result.taxAmount).toBe(750);
      expect(result.effectiveTaxRate).toBe(15);
    });

    test('asset.customTaxRate가 최우선', () => {
      const assetCustomTax: Asset = {
        ...mockAsset,
        customTaxRate: 10 // 자산별 커스텀 10%
      };

      const taxSettingsCustom: TaxSettings = {
        ...taxSettingsKR,
        customTaxRate: 15 // 글로벌 커스텀 15%
      };

      const result = calculateTaxImpact(assetCustomTax, 15000, taxSettingsCustom);

      // asset.customTaxRate (10%)가 taxSettings.customTaxRate (15%)보다 우선
      expect(result.effectiveTaxRate).toBe(10);
      expect(result.taxAmount).toBe(500); // 5,000 * 0.10
    });
  });

  describe('7. 보유 기간 계산', () => {
    test('purchaseDate 있으면 holdingPeriodDays 계산', () => {
      const oneYearAgo = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
      const assetWithDate: Asset = {
        ...mockAsset,
        purchaseDate: oneYearAgo
      };

      const result = calculateTaxImpact(assetWithDate, 15000, taxSettingsKR);

      expect(result.holdingPeriodDays).toBeGreaterThanOrEqual(364);
      expect(result.holdingPeriodDays).toBeLessThanOrEqual(366);
    });

    test('purchaseDate 없으면 undefined', () => {
      const assetNoDate: Asset = {
        ...mockAsset,
        purchaseDate: undefined
      };

      const result = calculateTaxImpact(assetNoDate, 15000, taxSettingsKR);

      expect(result.holdingPeriodDays).toBeUndefined();
    });
  });

  describe('8. 부동소수점 처리', () => {
    test('소수점 계산 정확성', () => {
      const weirdAsset: Asset = {
        ...mockAsset,
        currentValue: 12345.67,
        costBasis: 10123.45
      };

      const result = calculateTaxImpact(weirdAsset, 12345.67, taxSettingsKR);

      // 양도차익: 12,345.67 - 10,123.45 = 2,222.22
      expect(result.capitalGains).toBeCloseTo(2222.22, 2);
      expect(result.taxAmount).toBeCloseTo(488.89, 2); // 2,222.22 * 0.22
    });
  });
});

describe('taxCalculator - calculateAfterTaxRebalancing', () => {
  const liquidAsset1: Asset = {
    id: 'asset-1',
    name: 'Stock A',
    currentValue: 40000,
    targetAllocation: 30,
    createdAt: Date.now(),
    assetType: AssetType.LIQUID,
    costBasis: 35000
  };

  const liquidAsset2: Asset = {
    id: 'asset-2',
    name: 'Stock B',
    currentValue: 60000,
    targetAllocation: 70,
    createdAt: Date.now(),
    assetType: AssetType.LIQUID,
    costBasis: 50000
  };

  const illiquidAsset: Asset = {
    id: 'asset-3',
    name: 'Real Estate',
    currentValue: 200000,
    targetAllocation: 0,
    createdAt: Date.now(),
    assetType: AssetType.ILLIQUID
  };

  const taxSettings: TaxSettings = {
    selectedCountry: Country.SOUTH_KOREA,
    includeInCalculations: true
  };

  describe('9. 포트폴리오 전체 계산', () => {
    test('liquid/illiquid 자산 분리', () => {
      const assets = [liquidAsset1, liquidAsset2, illiquidAsset];
      const result = calculateAfterTaxRebalancing(assets, taxSettings);

      expect(result.totalLiquidValue).toBe(100000);
      expect(result.totalIlliquidValue).toBe(200000);
      expect(result.totalValue).toBe(300000);
    });

    test('리밸런싱 액션 생성 (LIQUID만)', () => {
      const assets = [liquidAsset1, liquidAsset2];
      const result = calculateAfterTaxRebalancing(assets, taxSettings);

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].assetId).toBe('asset-1');
      expect(result.actions[1].assetId).toBe('asset-2');
    });

    test('SELL 액션에만 taxImpact 포함', () => {
      const assets = [liquidAsset1, liquidAsset2];
      const result = calculateAfterTaxRebalancing(assets, taxSettings);

      // asset-1: 현재 40% → 목표 30% → SELL 10,000
      const sellAction = result.actions.find(a => a.action === 'SELL');
      expect(sellAction).toBeDefined();
      expect(sellAction?.taxImpact).toBeDefined();
      expect(sellAction?.taxImpact?.taxAmount).toBeGreaterThan(0);
    });

    test('BUY 액션에는 taxImpact 없음', () => {
      const assets = [liquidAsset1, liquidAsset2];
      const result = calculateAfterTaxRebalancing(assets, taxSettings);

      // asset-2: 현재 60% → 목표 70% → BUY 10,000
      const buyAction = result.actions.find(a => a.action === 'BUY');
      expect(buyAction).toBeDefined();
      expect(buyAction?.taxImpact).toBeUndefined();
    });
  });

  describe('10. 균형 상태 판단', () => {
    test('모든 자산이 목표 비율이면 isBalanced = true', () => {
      const balancedAssets: Asset[] = [
        { ...liquidAsset1, currentValue: 30000, targetAllocation: 30 },
        { ...liquidAsset2, currentValue: 70000, targetAllocation: 70 }
      ];

      const result = calculateAfterTaxRebalancing(balancedAssets, taxSettings, 0.5);

      expect(result.isBalanced).toBe(true);
      expect(result.actions.every(a => a.action === 'HOLD')).toBe(true);
    });

    test('한 자산이라도 tolerance 초과하면 isBalanced = false', () => {
      const assets = [liquidAsset1, liquidAsset2];
      const result = calculateAfterTaxRebalancing(assets, taxSettings, 0.5);

      expect(result.isBalanced).toBe(false);
    });
  });

  describe('11. 세금 계산 비활성화', () => {
    test('includeInCalculations = false면 taxImpact 없음', () => {
      const taxSettingsDisabled: TaxSettings = {
        ...taxSettings,
        includeInCalculations: false
      };

      const assets = [liquidAsset1, liquidAsset2];
      const result = calculateAfterTaxRebalancing(assets, taxSettingsDisabled);

      const sellAction = result.actions.find(a => a.action === 'SELL');
      expect(sellAction?.taxImpact).toBeUndefined();
      expect(result.totalTaxImpact).toBe(0);
    });
  });

  describe('12. 총 세금/수수료 집계', () => {
    test('totalTaxImpact = 모든 SELL 액션의 taxAmount 합계', () => {
      const assets = [liquidAsset1, liquidAsset2];
      const result = calculateAfterTaxRebalancing(assets, taxSettings);

      expect(result.totalTaxImpact).toBeGreaterThan(0);

      // SELL 액션의 세금 합계와 일치하는지 확인
      const sellActions = result.actions.filter(a => a.action === 'SELL' && a.taxImpact);
      const manualSum = sellActions.reduce((sum, a) => sum + (a.taxImpact?.taxAmount || 0), 0);
      expect(result.totalTaxImpact).toBe(manualSum);
    });

    test('totalTradeFees = 모든 SELL 액션의 tradeFee 합계', () => {
      const assets = [liquidAsset1, liquidAsset2];
      const result = calculateAfterTaxRebalancing(assets, taxSettings);

      expect(result.totalTradeFees).toBeGreaterThan(0);

      const sellActions = result.actions.filter(a => a.action === 'SELL' && a.taxImpact);
      const manualSum = sellActions.reduce((sum, a) => sum + (a.taxImpact?.tradeFee || 0), 0);
      expect(result.totalTradeFees).toBe(manualSum);
    });
  });
});
