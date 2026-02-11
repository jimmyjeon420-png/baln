/**
 * taxEstimator.ts 테스트
 *
 * 매도 시 예상 세금/수수료 계산 로직을 테스트합니다.
 */

import { inferTaxAssetType, estimateTax, TaxAssetType } from '../taxEstimator';

describe('taxEstimator', () => {
  describe('inferTaxAssetType', () => {
    it('should identify Korean stocks by 6-digit ticker', () => {
      expect(inferTaxAssetType('005930')).toBe('kr_stock');
      expect(inferTaxAssetType('035720')).toBe('kr_stock');
      expect(inferTaxAssetType('000660')).toBe('kr_stock');
    });

    it('should identify Korean stocks by .KS suffix', () => {
      expect(inferTaxAssetType('005930.KS')).toBe('kr_stock');
      expect(inferTaxAssetType('035720.KS')).toBe('kr_stock');
    });

    it('should identify Korean stocks by .KQ suffix', () => {
      expect(inferTaxAssetType('005930.KQ')).toBe('kr_stock');
      expect(inferTaxAssetType('035720.KQ')).toBe('kr_stock');
    });

    it('should identify US stocks by alphabetic tickers', () => {
      expect(inferTaxAssetType('AAPL')).toBe('us_stock');
      expect(inferTaxAssetType('GOOGL')).toBe('us_stock');
      expect(inferTaxAssetType('MSFT')).toBe('us_stock');
      expect(inferTaxAssetType('TSLA')).toBe('us_stock');
    });

    it('should identify crypto by common tickers', () => {
      expect(inferTaxAssetType('BTC')).toBe('crypto');
      expect(inferTaxAssetType('ETH')).toBe('crypto');
      expect(inferTaxAssetType('XRP')).toBe('crypto');
      expect(inferTaxAssetType('SOL')).toBe('crypto');
    });

    it('should identify crypto by -USD suffix', () => {
      expect(inferTaxAssetType('BTC-USD')).toBe('crypto');
      expect(inferTaxAssetType('ETH-USD')).toBe('crypto');
    });

    it('should identify crypto by USDT suffix', () => {
      expect(inferTaxAssetType('BTCUSDT')).toBe('crypto');
      expect(inferTaxAssetType('ETHUSDT')).toBe('crypto');
    });

    it('should return other for empty string', () => {
      expect(inferTaxAssetType('')).toBe('other');
    });

    it('should return other for invalid tickers', () => {
      expect(inferTaxAssetType('123')).toBe('other');
      expect(inferTaxAssetType('ABCDEF')).toBe('other'); // 6글자 알파벳 (5글자 초과)
    });

    it('should be case insensitive', () => {
      expect(inferTaxAssetType('aapl')).toBe('us_stock');
      expect(inferTaxAssetType('btc')).toBe('crypto');
    });
  });

  describe('estimateTax', () => {
    describe('Korean stocks', () => {
      it('should calculate transaction tax and brokerage fee', () => {
        const result = estimateTax('005930', 10000000, 90000, 100000, 100);

        expect(result.assetType).toBe('kr_stock');
        expect(result.assetTypeLabel).toBe('국내주식');
        expect(result.sellAmount).toBe(10000000);
        expect(result.gain).toBe(1000000); // (100000 - 90000) * 100
        expect(result.transactionTax).toBe(18000); // 10M * 0.0018
        expect(result.brokerageFee).toBe(1499); // Floor(10M * 0.00015)
        expect(result.capitalGainsTax).toBe(0); // 소액주주 비과세
        expect(result.totalCost).toBe(19499); // 18000 + 1499
        expect(result.netProceeds).toBe(9980501); // 10M - 19499
        expect(result.note).toContain('소액주주');
      });

      it('should handle loss (negative gain)', () => {
        const result = estimateTax('005930', 9000000, 100000, 90000, 100);

        expect(result.gain).toBe(-1000000); // Loss
        expect(result.capitalGainsTax).toBe(0);
      });

      it('should floor tax amounts to integers', () => {
        const result = estimateTax('005930', 1000000, 90000, 100000, 10);

        expect(result.transactionTax).toBe(1800); // Floor
        expect(result.brokerageFee).toBe(150); // Floor
        expect(Number.isInteger(result.transactionTax)).toBe(true);
        expect(Number.isInteger(result.brokerageFee)).toBe(true);
      });
    });

    describe('US stocks', () => {
      it('should calculate capital gains tax after 250만원 exemption', () => {
        const result = estimateTax('AAPL', 50000000, 900, 1000, 50000);

        expect(result.assetType).toBe('us_stock');
        expect(result.assetTypeLabel).toBe('해외주식');
        expect(result.gain).toBe(5000000); // (1000 - 900) * 50000
        expect(result.capitalGainsTax).toBe(550000); // (5M - 2.5M) * 0.22
        expect(result.brokerageFee).toBe(125000); // 50M * 0.0025
        expect(result.totalCost).toBeGreaterThan(0);
        expect(result.note).toContain('250만원 공제 후');
      });

      it('should not tax gains under 250만원 exemption', () => {
        const result = estimateTax('AAPL', 10000000, 900, 1000, 10000);

        expect(result.gain).toBe(1000000); // Under 2.5M
        expect(result.capitalGainsTax).toBe(0);
        expect(result.note).toContain('기본공제 이내');
      });

      it('should handle exactly 250만원 gain', () => {
        const result = estimateTax('AAPL', 27500000, 900, 1000, 25000);

        expect(result.gain).toBe(2500000);
        expect(result.capitalGainsTax).toBe(0);
        expect(result.note).toContain('기본공제 이내');
      });

      it('should not apply capital gains tax on losses', () => {
        const result = estimateTax('AAPL', 9000000, 1000, 900, 10000);

        expect(result.gain).toBe(-1000000); // Loss
        expect(result.capitalGainsTax).toBe(0);
      });
    });

    describe('Crypto', () => {
      it('should only calculate brokerage fee (tax deferred until 2027)', () => {
        const result = estimateTax('BTC', 50000000, 60000000, 70000000, 1);

        expect(result.assetType).toBe('crypto');
        expect(result.assetTypeLabel).toBe('가상자산');
        expect(result.gain).toBe(10000000);
        expect(result.transactionTax).toBe(0);
        expect(result.brokerageFee).toBe(50000); // 50M * 0.001
        expect(result.capitalGainsTax).toBe(0);
        expect(result.totalCost).toBe(50000);
        expect(result.note).toContain('2027년까지 유예');
      });

      it('should handle crypto loss', () => {
        const result = estimateTax('ETH', 30000000, 40000000, 30000000, 1);

        expect(result.gain).toBe(-10000000);
        expect(result.capitalGainsTax).toBe(0);
      });
    });

    describe('Other assets', () => {
      it('should apply minimal fees for other asset types', () => {
        const result = estimateTax('UNKNOWN', 10000000, 9000, 10000, 1000);

        expect(result.assetType).toBe('other');
        expect(result.assetTypeLabel).toBe('기타');
        expect(result.transactionTax).toBe(0);
        expect(result.brokerageFee).toBe(10000); // 10M * 0.001
        expect(result.capitalGainsTax).toBe(0);
      });
    });

    describe('Edge cases', () => {
      it('should handle zero sell amount', () => {
        const result = estimateTax('AAPL', 0, 100, 100, 0);

        expect(result.sellAmount).toBe(0);
        expect(result.totalCost).toBe(0);
        expect(result.netProceeds).toBe(0);
        expect(result.costRate).toBe(0);
      });

      it('should calculate cost rate percentage correctly', () => {
        const result = estimateTax('005930', 10000000, 90000, 100000, 100);

        expect(result.costRate).toBeCloseTo(0.195, 2); // (19500 / 10M) * 100
      });

      it('should handle very small transactions', () => {
        const result = estimateTax('005930', 100000, 90000, 100000, 1);

        expect(result.transactionTax).toBeGreaterThanOrEqual(0);
        expect(result.brokerageFee).toBeGreaterThanOrEqual(0);
      });

      it('should handle very large transactions', () => {
        const result = estimateTax('AAPL', 1000000000, 900, 1000, 1000000);

        expect(result.sellAmount).toBe(1000000000);
        expect(result.totalCost).toBeGreaterThan(0);
        expect(result.netProceeds).toBeLessThan(result.sellAmount);
      });
    });
  });
});
