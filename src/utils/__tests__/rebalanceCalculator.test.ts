/**
 * Test suite for rebalanceCalculator utility functions
 */

import {
  calculateRebalancing,
  isValidAllocation,
  getTotalAllocation,
  generateAssetId,
} from '../rebalanceCalculator';
import { Asset, AssetType, PortfolioSummary } from '../../types/asset';

describe('rebalanceCalculator', () => {
  describe('calculateRebalancing', () => {
    // 1. 정상 케이스 (50:50 균형 포트폴리오)
    it('should return balanced portfolio for 50:50 allocation', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 5000,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'TIGER 미국S&P500',
          currentValue: 5000,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalValue).toBe(10000);
      expect(result.isBalanced).toBe(true);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].action).toBe('HOLD');
      expect(result.actions[1].action).toBe('HOLD');
      expect(result.totalAllocationPercentage).toBe(100);
    });

    // 2. 리밸런싱 필요 (60:40 → 50:50)
    it('should recommend rebalancing for 60:40 to 50:50', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 6000,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'TIGER 미국S&P500',
          currentValue: 4000,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalValue).toBe(10000);
      expect(result.isBalanced).toBe(false);
      expect(result.actions[0].action).toBe('SELL'); // 60% → 50%
      expect(result.actions[0].amount).toBe(1000); // 6000 - 5000
      expect(result.actions[1].action).toBe('BUY'); // 40% → 50%
      expect(result.actions[1].amount).toBe(1000); // 5000 - 4000
    });

    // 3. 허용 오차 0.5% 경계값 테스트
    it('should respect TOLERANCE of 0.5%', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 5050, // 50.5%
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'TIGER 미국S&P500',
          currentValue: 4950, // 49.5%
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      // 0.5% 오차 이내이므로 HOLD
      expect(result.isBalanced).toBe(true);
      expect(result.actions[0].action).toBe('HOLD');
      expect(result.actions[1].action).toBe('HOLD');
    });

    // 4. 허용 오차 초과 (0.6% 차이)
    it('should trigger rebalancing when difference exceeds 0.5%', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 5060, // 50.6%
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'TIGER 미국S&P500',
          currentValue: 4940, // 49.4%
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      // 0.6% 차이 → 리밸런싱 필요
      expect(result.isBalanced).toBe(false);
      expect(result.actions[0].action).toBe('SELL');
      expect(result.actions[1].action).toBe('BUY');
    });

    // 5. 총 자산 0원 방어
    it('should handle zero total value gracefully', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 0,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'TIGER 미국S&P500',
          currentValue: 0,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalValue).toBe(0);
      expect(result.isBalanced).toBe(false); // 원본 코드는 false 반환
      expect(result.actions).toEqual([]);
    });

    // 6. 자산 1개 (100% 배분)
    it('should handle single asset portfolio', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 10000,
          targetAllocation: 100,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalValue).toBe(10000);
      expect(result.isBalanced).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].action).toBe('HOLD');
      expect(result.totalAllocationPercentage).toBe(100);
    });

    // 7. 소수점 수량 테스트 (229.4주)
    it('should handle fractional quantities correctly', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: 'TIGER 미국나스닥100',
          currentValue: 5723500, // 229.4주 * 24,950원
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
          quantity: 229.4,
          currentPrice: 24950,
        },
        {
          id: '2',
          name: 'KODEX 200',
          currentValue: 5723500,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalValue).toBe(11447000);
      expect(result.isBalanced).toBe(true);
      expect(result.actions[0].targetValue).toBe(5723500); // 소수점 정확도 유지
    });

    // 8. BUY/SELL/HOLD 각 액션 테스트
    it('should correctly assign BUY, SELL, and HOLD actions', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '자산A (SELL)',
          currentValue: 4000,
          targetAllocation: 30, // 30% 목표인데 40% 보유 → SELL
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: '자산B (BUY)',
          currentValue: 2000,
          targetAllocation: 30, // 30% 목표인데 20% 보유 → BUY
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '3',
          name: '자산C (HOLD)',
          currentValue: 4000,
          targetAllocation: 40, // 40% 목표 & 40% 보유 → HOLD
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.actions[0].action).toBe('SELL'); // 40% → 30%
      expect(result.actions[1].action).toBe('BUY'); // 20% → 30%
      expect(result.actions[2].action).toBe('HOLD'); // 40% → 40%
    });

    // 9. 목표 배분 합계 99.9% (유효)
    it('should handle target allocation sum of 99.9%', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 5000,
          targetAllocation: 49.95, // 합계 99.9%
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'TIGER 미국S&P500',
          currentValue: 5000,
          targetAllocation: 49.95,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalAllocationPercentage).toBe(99.9);
      // isValidAllocation은 0.1 오차 허용하므로 true
      expect(isValidAllocation(assets)).toBe(true);
    });

    // 10. 목표 배분 합계 100.1% (유효)
    it('should handle target allocation sum of 100.1%', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 5000,
          targetAllocation: 50.05, // 합계 100.1%
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'TIGER 미국S&P500',
          currentValue: 5000,
          targetAllocation: 50.05,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalAllocationPercentage).toBe(100.1);
      expect(isValidAllocation(assets)).toBe(true);
    });

    // 11. 부동소수점 오차 테스트 (33.33% * 3)
    it('should handle floating point precision for 33.33% * 3', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '자산A',
          currentValue: 3333.33,
          targetAllocation: 33.33,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: '자산B',
          currentValue: 3333.33,
          targetAllocation: 33.33,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '3',
          name: '자산C',
          currentValue: 3333.34,
          targetAllocation: 33.34,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalValue).toBe(10000);
      expect(result.totalAllocationPercentage).toBe(100);
      // 소수점 오차 내 균형 유지
      expect(result.isBalanced).toBe(true);
    });

    // 12. 빈 배열 방어
    it('should handle empty asset array', () => {
      const assets: Asset[] = [];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalValue).toBe(0);
      expect(result.totalAllocationPercentage).toBe(0);
      expect(result.actions).toEqual([]);
      expect(result.isBalanced).toBe(true); // 원본 코드는 빈 배열을 balanced로 간주
    });

    // 13. liquid/illiquid 자산 구분 테스트
    it('should correctly calculate liquid and illiquid values', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자 (주식)',
          currentValue: 5000,
          targetAllocation: 40,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: '강남 아파트',
          currentValue: 10000,
          targetAllocation: 60,
          assetType: AssetType.ILLIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      expect(result.totalLiquidValue).toBe(5000);
      expect(result.totalIlliquidValue).toBe(10000);
      expect(result.totalValue).toBe(15000);
    });

    // 14. 음수 값 방어 (currentValue < 0)
    it('should handle negative current values', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '손실 자산',
          currentValue: -1000, // 음수 (실제로는 발생하면 안 되지만 방어)
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: '정상 자산',
          currentValue: 5000,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      // 총 자산 4000원 (음수 포함 계산)
      expect(result.totalValue).toBe(4000);
      // 음수 자산도 계산에 포함됨
      expect(result.actions).toHaveLength(2);
    });

    // 15. 소수점 반올림 검증 (targetValue와 amount)
    it('should round targetValue and amount to 2 decimals', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '삼성전자',
          currentValue: 3333.333,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: 'TIGER 미국S&P500',
          currentValue: 6666.667,
          targetAllocation: 50,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      const result: PortfolioSummary = calculateRebalancing(assets);

      // totalValue는 10000으로 반올림
      expect(result.totalValue).toBe(10000);
      // targetValue는 소수점 2자리로 반올림
      expect(result.actions[0].targetValue).toBe(5000);
      expect(result.actions[1].targetValue).toBe(5000);
      // amount도 소수점 2자리로 반올림
      expect(result.actions[0].amount).toBe(1666.67);
      expect(result.actions[1].amount).toBe(1666.67);
    });
  });

  describe('isValidAllocation', () => {
    it('should return true for exactly 100% allocation', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '자산A',
          currentValue: 5000,
          targetAllocation: 60,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: '자산B',
          currentValue: 5000,
          targetAllocation: 40,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      expect(isValidAllocation(assets)).toBe(true);
    });

    it('should return true for 99.95% (within 0.1 tolerance)', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '자산A',
          currentValue: 5000,
          targetAllocation: 49.975,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: '자산B',
          currentValue: 5000,
          targetAllocation: 49.975,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      expect(isValidAllocation(assets)).toBe(true);
    });

    it('should return false for 90% (invalid)', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '자산A',
          currentValue: 5000,
          targetAllocation: 45,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: '자산B',
          currentValue: 5000,
          targetAllocation: 45,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      expect(isValidAllocation(assets)).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(isValidAllocation([])).toBe(true);
    });
  });

  describe('getTotalAllocation', () => {
    it('should return correct sum of target allocations', () => {
      const assets: Asset[] = [
        {
          id: '1',
          name: '자산A',
          currentValue: 5000,
          targetAllocation: 60,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
        {
          id: '2',
          name: '자산B',
          currentValue: 5000,
          targetAllocation: 40,
          assetType: AssetType.LIQUID,
          createdAt: Date.now(),
        },
      ];

      expect(getTotalAllocation(assets)).toBe(100);
    });

    it('should return 0 for empty array', () => {
      expect(getTotalAllocation([])).toBe(0);
    });
  });

  describe('generateAssetId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateAssetId();
      const id2 = generateAssetId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should include timestamp and random component', () => {
      const id = generateAssetId();
      const parts = id.split('-');

      expect(parts).toHaveLength(2);
      expect(Number(parts[0])).toBeGreaterThan(0); // timestamp
      expect(parts[1].length).toBeGreaterThan(0); // random string
    });
  });
});
