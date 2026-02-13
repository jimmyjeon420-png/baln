/**
 * Yahoo Finance 주식 가격 프로바이더
 *
 * 역할: 한국 주식(.KS/.KQ) + 미국 주식 실시간 시세 조회
 * API: Yahoo Finance v8 Chart API (인증 불필요, React Native에서 직접 호출)
 *
 * 지원 티커 형식:
 * - 한국 KOSPI: 005930.KS (삼성전자)
 * - 한국 KOSDAQ: 035720.KQ (카카오게임즈)
 * - 미국: AAPL, MSFT, TSLA
 * - ETF: VOO, QQQ, VTI
 */

import axios, { AxiosError } from 'axios';
import { PriceData, AssetClass } from '../../types/price';

export class YahooFinanceProvider {
  readonly name = 'YahooFinance';
  private readonly baseURL = 'https://query1.finance.yahoo.com';
  private readonly timeout = 15000; // 15초
  private requestCount = 0;
  private lastRequestTime = 0;

  /**
   * 주식/ETF 자산 지원 여부
   */
  supportsAssetClass(assetClass: string): boolean {
    return assetClass === 'stock' || assetClass === 'etf';
  }

  /**
   * 한국 주식 여부 확인
   * - 005930.KS, 035720.KQ 형식
   * - 또는 순수 6자리 숫자 (자동으로 .KS 붙임)
   */
  isKoreanStock(ticker: string): boolean {
    return /^\d{6}(\.KS|\.KQ)?$/i.test(ticker);
  }

  /**
   * Yahoo Finance 심볼로 변환
   * - 이미 .KS/.KQ 붙어있으면 그대로
   * - 6자리 숫자면 .KS 추가 (KOSPI 기본)
   * - 영문 티커는 그대로 (미국 주식)
   */
  private toYahooSymbol(ticker: string): string {
    // 이미 거래소 접미사가 있는 경우
    if (/\.(KS|KQ|T|L|HK)$/i.test(ticker)) {
      return ticker.toUpperCase();
    }
    // 6자리 숫자 → 한국 KOSPI
    if (/^\d{6}$/.test(ticker)) {
      return `${ticker}.KS`;
    }
    // 특수 티커 변환: Yahoo Finance는 점(.) 대신 하이픈(-) 사용
    const dotToHyphen = ticker.toUpperCase().replace(/\./g, '-');
    return dotToHyphen;
  }

  /**
   * 단일 종목 가격 조회
   * Yahoo Finance v8 Chart API 사용
   */
  async fetchPrice(ticker: string, currency: string = 'KRW'): Promise<PriceData> {
    await this.rateLimit();

    const symbol = this.toYahooSymbol(ticker);

    try {
      const response = await axios.get(
        `${this.baseURL}/v8/finance/chart/${encodeURIComponent(symbol)}`,
        {
          params: {
            interval: '1d',
            range: '1d',
            includePrePost: false,
          },
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Baln/1.0)',
          },
        }
      );

      const result = response.data?.chart?.result?.[0];
      if (!result?.meta) {
        throw new Error(`NOT_FOUND: ${ticker} - Yahoo Finance에서 데이터를 찾을 수 없습니다`);
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;

      if (!currentPrice || currentPrice <= 0) {
        throw new Error(`NOT_FOUND: ${ticker} - 유효하지 않은 가격`);
      }

      const priceChange = currentPrice - previousClose;
      const percentChange = previousClose > 0
        ? (priceChange / previousClose) * 100
        : 0;

      return {
        ticker, // 원래 티커 형식 유지 (005930.KS)
        assetClass: AssetClass.STOCK,
        currentPrice,
        previousPrice: previousClose,
        priceChange24h: priceChange,
        percentChange24h: percentChange,
        currency: meta.currency || currency,
        volume24h: meta.regularMarketVolume,
        lastUpdated: Date.now(),
        source: 'stock-api',
      };
    } catch (error) {
      throw this.formatError(error as AxiosError, ticker);
    }
  }

  /**
   * 여러 종목 배치 가격 조회
   * 개별 요청을 병렬로 실행 (rate limit 준수)
   */
  async fetchPrices(tickers: string[], currency: string = 'KRW'): Promise<PriceData[]> {
    const results = await Promise.allSettled(
      tickers.map(ticker => this.fetchPrice(ticker, currency))
    );

    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<PriceData>).value);
  }

  /**
   * API 가용성 확인 (삼성전자로 테스트)
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.fetchPrice('005930.KS', 'KRW');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rate Limiting: 요청 간 200ms 간격
   * Yahoo Finance 무료 사용 시 예의상 속도 제한
   */
  private async rateLimit(): Promise<void> {
    const minInterval = 200; // 200ms
    const elapsed = Date.now() - this.lastRequestTime;

    if (elapsed < minInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, minInterval - elapsed)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * 에러 메시지 정규화
   */
  private formatError(error: AxiosError | Error, ticker: string): Error {
    const axiosErr = error as AxiosError;
    const label = `[Yahoo] ${ticker}`;

    if (axiosErr.code === 'ECONNABORTED') {
      return new Error(`TIMEOUT: ${label} - 응답 시간 초과`);
    }
    if (axiosErr.response?.status === 429) {
      return new Error(`RATE_LIMITED: ${label} - 요청 한도 초과`);
    }
    if (axiosErr.response?.status === 404) {
      return new Error(`NOT_FOUND: ${label} - 종목을 찾을 수 없습니다`);
    }
    if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ERR_NETWORK') {
      return new Error(`NETWORK_ERROR: ${label} - 네트워크 연결 실패`);
    }

    return new Error(`NETWORK_ERROR: ${label} - ${error.message || 'Unknown'}`);
  }

  /**
   * 프로바이더 통계
   */
  getStats() {
    return {
      name: this.name,
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }
}

/**
 * 싱글톤 인스턴스
 */
export const yahooFinanceProvider = new YahooFinanceProvider();
