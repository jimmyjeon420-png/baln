/**
 * Market Data Service
 * Yahoo Finance API와 CoinGecko API를 활용하여 실시간 시장 데이터 조회
 */

import axios from 'axios';

// Yahoo Finance API 설정
const YAHOO_FINANCE_RAPID_API = {
  host: 'yh-finance.p.rapidapi.com',
  key: 'RAPIDAPI_KEY_HERE', // 환경변수에서 가져와야 함
};

// CoinGecko API (공개 API, 인증 불필요)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface TickerResult {
  ticker: string;
  name: string;
  type: 'stock' | 'crypto';
  currentPrice?: number;
  currency: string;
  exchange?: string;
}

export interface PriceData {
  ticker: string;
  currentPrice: number;
  currency: string;
  lastUpdate: string;
}

/**
 * 티커 검색 (주식/암호화폐)
 * @param query 검색 쿼리 (예: "Apple", "BTC")
 * @returns 매칭되는 티커 목록
 */
export async function searchTicker(query: string): Promise<TickerResult[]> {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const results: TickerResult[] = [];

    // 1. 주식 검색 (Yahoo Finance Lookup)
    try {
      const stockResults = await searchStocks(query);
      results.push(...stockResults);
    } catch (error) {
      console.warn('주식 검색 실패:', error);
      // 실패해도 계속 진행 (암호화폐 검색)
    }

    // 2. 암호화폐 검색 (CoinGecko)
    try {
      const cryptoResults = await searchCrypto(query);
      results.push(...cryptoResults);
    } catch (error) {
      console.warn('암호화폐 검색 실패:', error);
    }

    return results;
  } catch (error) {
    console.error('티커 검색 오류:', error);
    return [];
  }
}

/**
 * 실시간 가격 조회
 * @param ticker 티커 (예: "AAPL", "BTC")
 * @returns 현재 가격 정보
 */
export async function getRealTimePrice(ticker: string): Promise<PriceData | null> {
  try {
    if (!ticker || ticker.trim().length === 0) {
      return null;
    }

    // 먼저 주식 검색 시도
    const stockPrice = await getStockPrice(ticker.toUpperCase());
    if (stockPrice) {
      return stockPrice;
    }

    // 암호화폐 검색 시도
    const cryptoPrice = await getCryptoPrice(ticker.toLowerCase());
    if (cryptoPrice) {
      return cryptoPrice;
    }

    return null;
  } catch (error) {
    console.error('가격 조회 오류:', error);
    return null;
  }
}

/**
 * 주식 검색 (Yahoo Finance)
 * 현재는 모의 데이터를 반환합니다 (실제 API 키 필요)
 */
async function searchStocks(query: string): Promise<TickerResult[]> {
  try {
    // 모의 데이터: 실제 API 연동 시 아래 코드 활성화
    const mockStocks: { [key: string]: TickerResult[] } = {
      'apple': [
        { ticker: 'AAPL', name: 'Apple Inc.', type: 'stock', currentPrice: 240, currency: 'USD', exchange: 'NASDAQ' },
      ],
      'tesla': [
        { ticker: 'TSLA', name: 'Tesla Inc.', type: 'stock', currentPrice: 350, currency: 'USD', exchange: 'NASDAQ' },
      ],
      'microsoft': [
        { ticker: 'MSFT', name: 'Microsoft Corp.', type: 'stock', currentPrice: 420, currency: 'USD', exchange: 'NASDAQ' },
      ],
      'samsung': [
        { ticker: '005930', name: 'Samsung Electronics', type: 'stock', currentPrice: 70000, currency: 'KRW', exchange: 'KRX' },
      ],
      'naver': [
        { ticker: '035420', name: 'Naver Corp.', type: 'stock', currentPrice: 350000, currency: 'KRW', exchange: 'KRX' },
      ],
    };

    const lowerQuery = query.toLowerCase();
    const results: TickerResult[] = [];

    for (const [key, stocks] of Object.entries(mockStocks)) {
      if (key.includes(lowerQuery) || lowerQuery.includes(key)) {
        results.push(...stocks);
      }
    }

    // 티커로도 검색
    for (const [, stocks] of Object.entries(mockStocks)) {
      for (const stock of stocks) {
        if (stock.ticker.includes(query.toUpperCase())) {
          if (!results.find(r => r.ticker === stock.ticker)) {
            results.push(stock);
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('주식 검색 오류:', error);
    return [];
  }
}

/**
 * 암호화폐 검색 (CoinGecko)
 */
async function searchCrypto(query: string): Promise<TickerResult[]> {
  try {
    // CoinGecko 검색 API
    const response = await axios.get(`${COINGECKO_API}/search`, {
      params: {
        query: query,
      },
      timeout: 5000,
    });

    if (!response.data.coins || response.data.coins.length === 0) {
      return [];
    }

    // 상위 5개 결과만 반환
    return response.data.coins.slice(0, 5).map((coin: any) => ({
      ticker: coin.symbol.toUpperCase(),
      name: coin.name,
      type: 'crypto' as const,
      currency: 'USD',
    }));
  } catch (error) {
    console.error('CoinGecko 암호화폐 검색 오류:', error);
    return [];
  }
}

/**
 * 주식 가격 조회
 */
async function getStockPrice(ticker: string): Promise<PriceData | null> {
  try {
    // 모의 데이터: 실제 API 연동 필요
    const mockPrices: { [key: string]: PriceData } = {
      'AAPL': { ticker: 'AAPL', currentPrice: 240.5, currency: 'USD', lastUpdate: new Date().toISOString() },
      'TSLA': { ticker: 'TSLA', currentPrice: 350.25, currency: 'USD', lastUpdate: new Date().toISOString() },
      'MSFT': { ticker: 'MSFT', currentPrice: 420.75, currency: 'USD', lastUpdate: new Date().toISOString() },
      '005930': { ticker: '005930', currentPrice: 70000, currency: 'KRW', lastUpdate: new Date().toISOString() },
      '035420': { ticker: '035420', currentPrice: 350000, currency: 'KRW', lastUpdate: new Date().toISOString() },
    };

    return mockPrices[ticker] || null;
  } catch (error) {
    console.error('주식 가격 조회 오류:', error);
    return null;
  }
}

/**
 * 암호화폐 가격 조회 (CoinGecko)
 */
async function getCryptoPrice(ticker: string): Promise<PriceData | null> {
  try {
    // 일반적인 암호화폐 심볼을 ID로 변환
    const symbolToId: { [key: string]: string } = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'usdt': 'tether',
      'bnb': 'binancecoin',
      'xrp': 'ripple',
      'ada': 'cardano',
      'doge': 'dogecoin',
      'sol': 'solana',
    };

    const coinId = symbolToId[ticker.toLowerCase()] || ticker.toLowerCase();

    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: 'usd',
      },
      timeout: 5000,
    });

    if (response.data[coinId]?.usd) {
      return {
        ticker: ticker.toUpperCase(),
        currentPrice: response.data[coinId].usd,
        currency: 'USD',
        lastUpdate: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('암호화폐 가격 조회 오류:', error);
    return null;
  }
}

/**
 * 배치 가격 조회 (여러 티커)
 */
export async function getBatchPrices(tickers: string[]): Promise<PriceData[]> {
  const results: PriceData[] = [];

  for (const ticker of tickers) {
    const price = await getRealTimePrice(ticker);
    if (price) {
      results.push(price);
    }
  }

  return results;
}
