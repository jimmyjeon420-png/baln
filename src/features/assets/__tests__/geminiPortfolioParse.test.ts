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

  it('normalizes holdings object maps keyed by stock name', () => {
    expect(normalizeParsedPortfolioScreenshotPayload({
      holdings: {
        엔비디아: {
          shareCount: '207.425965주',
          evaluationAmount: '55,274,268원',
          evaluationProfit: '+12,937,791(30.5%)',
        },
        코닝: {
          stockName: '코닝',
          shareCount: '72주',
          evaluationAmount: '14,121,478원',
          evaluationProfit: '-622,214(4.2%)',
        },
      },
    })).toEqual({
      assets: [
        {
          name: '엔비디아',
          quantity: '207.425965주',
          currentValueKRW: '55,274,268원',
          profitLossKRW: '+12,937,791(30.5%)',
        },
        {
          name: '코닝',
          quantity: '72주',
          currentValueKRW: '14,121,478원',
          profitLossKRW: '-622,214(4.2%)',
        },
      ],
    });
  });


  it('extracts stock rows from loose multiline text when Gemini strips units and only returns bare numbers', () => {
    const rawText = `
내 투자
164,491,722
+25,089,299 (17.9%)

엔비디아
207.425965
55,274,268
+12,937,791(30.5%)

알파벳 A
71.912647
31,797,590
+4,585,530(16.8%)

테슬라
51.943007
30,793,447
+3,150,348(11.3%)

코닝
72
14,121,478
-622,214(4.2%)

버크셔 해서웨이 B
18.554902
13,673,924
+613,922(4.7%)

GLD
14.752223
10,144,372
+3,086,740(43.7%)

컨스텔레이션 에너지
17.961098
8,686,640
+1,337,180(18.1%)
`;

    expect(normalizeParsedPortfolioScreenshotPayload({ text: rawText })).toEqual({
      assets: [
        {
          name: '엔비디아',
          quantity: '207.425965주',
          currentValueKRW: '55,274,268원',
          profitLossKRW: '+12,937,791(30.5%)',
        },
        {
          name: '알파벳 A',
          quantity: '71.912647주',
          currentValueKRW: '31,797,590원',
          profitLossKRW: '+4,585,530(16.8%)',
        },
        {
          name: '테슬라',
          quantity: '51.943007주',
          currentValueKRW: '30,793,447원',
          profitLossKRW: '+3,150,348(11.3%)',
        },
        {
          name: '코닝',
          quantity: '72주',
          currentValueKRW: '14,121,478원',
          profitLossKRW: '-622,214(4.2%)',
        },
        {
          name: '버크셔 해서웨이 B',
          quantity: '18.554902주',
          currentValueKRW: '13,673,924원',
          profitLossKRW: '+613,922(4.7%)',
        },
        {
          name: 'GLD',
          quantity: '14.752223주',
          currentValueKRW: '10,144,372원',
          profitLossKRW: '+3,086,740(43.7%)',
        },
        {
          name: '컨스텔레이션 에너지',
          quantity: '17.961098주',
          currentValueKRW: '8,686,640원',
          profitLossKRW: '+1,337,180(18.1%)',
        },
      ],
    });
  });

  it('extracts stock rows from wrapped Gemini candidate payloads', () => {
    const rawText = `
내 투자
164,491,722
+25,089,299 (17.9%)

엔비디아
207.425965
55,274,268
+12,937,791(30.5%)

알파벳 A
71.912647
31,797,590
+4,585,530(16.8%)

테슬라
51.943007
30,793,447
+3,150,348(11.3%)

코닝
72
14,121,478
-622,214(4.2%)

버크셔 해서웨이 B
18.554902
13,673,924
+613,922(4.7%)

GLD
14.752223
10,144,372
+3,086,740(43.7%)

컨스텔레이션 에너지
17.961098
8,686,640
+1,337,180(18.1%)
`;

    const wrappedPayload = {
      candidates: [
        {
          content: {
            parts: [
              { text: rawText },
            ],
          },
        },
      ],
    };

    expect(normalizeParsedPortfolioScreenshotPayload(wrappedPayload)).toEqual({
      assets: [
        {
          name: '엔비디아',
          quantity: '207.425965주',
          currentValueKRW: '55,274,268원',
          profitLossKRW: '+12,937,791(30.5%)',
        },
        {
          name: '알파벳 A',
          quantity: '71.912647주',
          currentValueKRW: '31,797,590원',
          profitLossKRW: '+4,585,530(16.8%)',
        },
        {
          name: '테슬라',
          quantity: '51.943007주',
          currentValueKRW: '30,793,447원',
          profitLossKRW: '+3,150,348(11.3%)',
        },
        {
          name: '코닝',
          quantity: '72주',
          currentValueKRW: '14,121,478원',
          profitLossKRW: '-622,214(4.2%)',
        },
        {
          name: '버크셔 해서웨이 B',
          quantity: '18.554902주',
          currentValueKRW: '13,673,924원',
          profitLossKRW: '+613,922(4.7%)',
        },
        {
          name: 'GLD',
          quantity: '14.752223주',
          currentValueKRW: '10,144,372원',
          profitLossKRW: '+3,086,740(43.7%)',
        },
        {
          name: '컨스텔레이션 에너지',
          quantity: '17.961098주',
          currentValueKRW: '8,686,640원',
          profitLossKRW: '+1,337,180(18.1%)',
        },
      ],
    });
  });

  it('extracts stock rows from loose multiline text responses', () => {
    const rawText = `
내 투자
164,491,722원
+25,089,299원 (17.9%)

엔비디아
207.425965주
55,274,268원
+12,937,791(30.5%)

알파벳 A
71.912647주
31,797,590원
+4,585,530(16.8%)

테슬라
51.943007주
30,793,447원
+3,150,348(11.3%)

코닝
72주
14,121,478원
-622,214(4.2%)

버크셔 해서웨이 B
18.554902주
13,673,924원
+613,922(4.7%)

GLD
14.752223주
10,144,372원
+3,086,740(43.7%)

컨스텔레이션 에너지
17.961098주
8,686,640원
+1,337,180(18.1%)
`;

    expect(normalizeParsedPortfolioScreenshotPayload({ text: rawText })).toEqual({
      assets: [
        {
          name: '엔비디아',
          quantity: '207.425965주',
          currentValueKRW: '55,274,268원',
          profitLossKRW: '+12,937,791(30.5%)',
        },
        {
          name: '알파벳 A',
          quantity: '71.912647주',
          currentValueKRW: '31,797,590원',
          profitLossKRW: '+4,585,530(16.8%)',
        },
        {
          name: '테슬라',
          quantity: '51.943007주',
          currentValueKRW: '30,793,447원',
          profitLossKRW: '+3,150,348(11.3%)',
        },
        {
          name: '코닝',
          quantity: '72주',
          currentValueKRW: '14,121,478원',
          profitLossKRW: '-622,214(4.2%)',
        },
        {
          name: '버크셔 해서웨이 B',
          quantity: '18.554902주',
          currentValueKRW: '13,673,924원',
          profitLossKRW: '+613,922(4.7%)',
        },
        {
          name: 'GLD',
          quantity: '14.752223주',
          currentValueKRW: '10,144,372원',
          profitLossKRW: '+3,086,740(43.7%)',
        },
        {
          name: '컨스텔레이션 에너지',
          quantity: '17.961098주',
          currentValueKRW: '8,686,640원',
          profitLossKRW: '+1,337,180(18.1%)',
        },
      ],
    });
  });
});
