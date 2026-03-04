import { normalizeParsedPortfolioScreenshotPayload } from '../../../../supabase/functions/gemini-proxy/normalizePortfolioParse';

describe('normalizeParsedPortfolioScreenshotPayload', () => {
  it('keeps canonical assets payload intact', () => {
    expect(normalizeParsedPortfolioScreenshotPayload({
      assets: [
        {
          name: '엔비디아',
          ticker: 'NVDA',
          quantity: '229.425965주',
          currentValueKRW: '58,094,361원',
          profitLossKRW: '+11,267,596(24.0%)',
        },
      ],
    })).toEqual({
      assets: [
        {
          name: '엔비디아',
          ticker: 'NVDA',
          quantity: '229.425965주',
          currentValueKRW: '58,094,361원',
          profitLossKRW: '+11,267,596(24.0%)',
        },
      ],
    });
  });

  it('normalizes stock holdings payloads with alternate keys', () => {
    expect(normalizeParsedPortfolioScreenshotPayload({
      holdings: [
        {
          stockName: '엔비디아',
          shareCount: '229.425965주',
          valuationAmount: '58,094,361원',
          evaluationProfit: '+11,267,596(24.0%)',
        },
        {
          stockName: '알파벳 A',
          symbol: 'GOOGL',
          holdingQty: '71.912647주',
          evaluationAmount: '31,717,254원',
          gainLoss: '+4,505,194(16.5%)',
        },
      ],
    })).toEqual({
      assets: [
        {
          name: '엔비디아',
          quantity: '229.425965주',
          currentValueKRW: '58,094,361원',
          profitLossKRW: '+11,267,596(24.0%)',
        },
        {
          name: '알파벳 A',
          ticker: 'GOOGL',
          quantity: '71.912647주',
          currentValueKRW: '31,717,254원',
          profitLossKRW: '+4,505,194(16.5%)',
        },
      ],
    });
  });

  it('unwraps nested positions payloads', () => {
    expect(normalizeParsedPortfolioScreenshotPayload({
      data: {
        positions: [
          {
            securityName: '버크셔 해서웨이 B',
            code: 'BRK-B',
            shares: '31.554902주',
            marketValue: '22,646,307원',
            pnl: '+436,162(1.9%)',
          },
        ],
      },
    })).toEqual({
      assets: [
        {
          name: '버크셔 해서웨이 B',
          ticker: 'BRK-B',
          quantity: '31.554902주',
          currentValueKRW: '22,646,307원',
          profitLossKRW: '+436,162(1.9%)',
        },
      ],
    });
  });

  it('wraps a single row object into assets', () => {
    expect(normalizeParsedPortfolioScreenshotPayload({
      name: 'GLD',
      quantity: '14.752223주',
      currentValueKRW: '10,180,586원',
      profitLossKRW: '+3,122,954(44.2%)',
    })).toEqual({
      assets: [
        {
          name: 'GLD',
          quantity: '14.752223주',
          currentValueKRW: '10,180,586원',
          profitLossKRW: '+3,122,954(44.2%)',
        },
      ],
    });
  });
});
