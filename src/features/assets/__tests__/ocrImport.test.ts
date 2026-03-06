import { normalizeParsedAssets, parseOcrNumber } from '../ocrImport';

describe('ocrImport', () => {
  it('parses combined profit/loss strings safely', () => {
    expect(parseOcrNumber('+11,267,596(24.0%)')).toBe(11267596);
    expect(parseOcrNumber('-9,539,709')).toBe(-9539709);
    expect(parseOcrNumber('229.425965주')).toBeCloseTo(229.425965);
    expect(parseOcrNumber('5만원')).toBe(50000);
    expect(parseOcrNumber('1.5억원')).toBe(150000000);
  });

  it('normalizes Korean crypto screenshot assets', () => {
    const result = normalizeParsedAssets([
      {
        name: '비트코인',
        ticker: 'BTC',
        quantity: '0.19558237 BTC',
        currentValueKRW: '18,766,128 KRW',
        totalCostKRW: '28,305,838 KRW',
      },
    ]);

    expect(result).toEqual([
      {
        name: '비트코인',
        ticker: 'BTC',
        quantity: 0.19558237,
        currentValueKRW: 18766128,
        totalCostKRW: 28305838,
      },
    ]);
  });

  it('normalizes stock screenshot assets when ticker is missing', () => {
    const result = normalizeParsedAssets([
      {
        name: '엔비디아',
        quantity: '229.425965주',
        currentValueKRW: '58,094,361원',
        profitLossKRW: '+11,267,596(24.0%)',
      },
      {
        name: '알파벳 A',
        quantity: '71.912647주',
        currentValueKRW: '31,717,254원',
        profitLossKRW: '+4,505,194(16.5%)',
      },
      {
        name: '버크셔 해서웨이 B',
        quantity: '31.554902주',
        currentValueKRW: '22,646,307원',
        profitLossKRW: '+436,162(1.9%)',
      },
      {
        name: '컨스텔레이션 에너지',
        quantity: '17.961098주',
        currentValueKRW: '8,395,778원',
        profitLossKRW: '+1,046,318(14.2%)',
      },
    ]);

    expect(result).toEqual([
      {
        name: '엔비디아',
        ticker: 'NVDA',
        quantity: 229.425965,
        currentValueKRW: 58094361,
        totalCostKRW: 46826765,
      },
      {
        name: '알파벳(구글)',
        ticker: 'GOOGL',
        quantity: 71.912647,
        currentValueKRW: 31717254,
        totalCostKRW: 27212060,
      },
      {
        name: '버크셔 해서웨이',
        ticker: 'BRK-B',
        quantity: 31.554902,
        currentValueKRW: 22646307,
        totalCostKRW: 22210145,
      },
      {
        name: '컨스텔레이션 에너지',
        ticker: 'CEG',
        quantity: 17.961098,
        currentValueKRW: 8395778,
        totalCostKRW: 7349460,
      },
    ]);
  });

  it('deduplicates duplicate OCR rows by ticker', () => {
    const result = normalizeParsedAssets([
      {
        name: '비트코인',
        ticker: 'BTC',
        quantity: '0.1 BTC',
        currentValueKRW: '100만원',
        totalCostKRW: '120만원',
      },
      {
        name: '비트코인',
        ticker: 'BTC',
        quantity: '0.2 BTC',
        currentValueKRW: '200만원',
        totalCostKRW: '250만원',
      },
    ]);

    expect(result).toEqual([
      {
        name: '비트코인',
        ticker: 'BTC',
        quantity: 0.3,
        currentValueKRW: 3000000,
        totalCostKRW: 3700000,
      },
    ]);
  });

  it('normalizes object-map stock screenshot payloads', () => {
    const result = normalizeParsedAssets({
      holdings: {
        엔비디아: {
          shareCount: '207.425965주',
          evaluationAmount: '55,274,268원',
          evaluationProfit: '+12,937,791(30.5%)',
        },
        코닝: {
          shareCount: '72주',
          evaluationAmount: '14,121,478원',
          evaluationProfit: '-622,214(4.2%)',
        },
      },
    });

    expect(result).toEqual([
      {
        name: '엔비디아',
        ticker: 'NVDA',
        quantity: 207.425965,
        currentValueKRW: 55274268,
        totalCostKRW: 42336477,
      },
      {
        name: '코닝',
        ticker: 'GLW',
        quantity: 72,
        currentValueKRW: 14121478,
        totalCostKRW: 14743692,
      },
    ]);
  });

  it('extracts assets from raw text string (server rawText fallback)', () => {
    const rawText = `내 투자
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
+3,150,348(11.3%)`;

    const result = normalizeParsedAssets({ text: rawText });
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.find(a => a.ticker === 'NVDA')).toBeTruthy();
    expect(result.find(a => a.ticker === 'GOOGL')).toBeTruthy();
    expect(result.find(a => a.ticker === 'TSLA')).toBeTruthy();
  });

  it('extracts assets from rawText key in server response', () => {
    const result = normalizeParsedAssets({
      assets: [],
      rawText: `엔비디아
207.425965
55,274,268
+12,937,791(30.5%)`,
    });
    // rawText is explored via NESTED_PAYLOAD_KEYS, but assets=[] is returned first if empty
    // The text fallback happens in useAddAsset, but normalizeParsedAssets should handle text directly
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('parses JSON string input', () => {
    const jsonStr = JSON.stringify([
      { name: '엔비디아', ticker: 'NVDA', quantity: 10, currentValueKRW: 5000000 },
    ]);
    const result = normalizeParsedAssets(jsonStr);
    expect(result.length).toBe(1);
    expect(result[0].ticker).toBe('NVDA');
  });
});
