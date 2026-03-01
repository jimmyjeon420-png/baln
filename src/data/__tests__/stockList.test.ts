import { findBestStockMatch } from '../stockList';

describe('findBestStockMatch', () => {
  it('matches common US stock OCR names without visible ticker', () => {
    expect(findBestStockMatch('엔비디아')?.ticker).toBe('NVDA');
    expect(findBestStockMatch('알파벳 A')?.ticker).toBe('GOOGL');
    expect(findBestStockMatch('알파벳')?.ticker).toBe('GOOGL');
    expect(findBestStockMatch('버크셔 해서웨이 B')?.ticker).toBe('BRK-B');
    expect(findBestStockMatch('버크셔 해서웨이')?.ticker).toBe('BRK-B');
    expect(findBestStockMatch('컨스텔레이션 에너지')?.ticker).toBe('CEG');
  });

  it('normalizes ticker variants used in screenshots', () => {
    expect(findBestStockMatch('', 'BRK.B')?.ticker).toBe('BRK-B');
    expect(findBestStockMatch('', '005930')?.ticker).toBe('005930.KS');
    expect(findBestStockMatch('알파벳 A (GOOGL)')?.ticker).toBe('GOOGL');
    expect(findBestStockMatch('', 'nvda')?.ticker).toBe('NVDA');
  });
});
