// @ts-nocheck
// ============================================================================
// Real Market Data Fetcher — Yahoo Finance (무료, 인증 불필요)
// + FRED API (무료, API Key 선택)
//
// [수집 데이터]
// - S&P 500, NASDAQ, KOSPI 당일 등락률
// - VIX 공포지수 실값
// - 비트코인, 금, 원자재 당일 등락률
// - 미국 10년 국채 수익률
// - 연방기금금리, CPI (FRED API, 선택)
//
// [사용처]
// - Task A: Gemini 프롬프트 실수치 주입
// - Task G: 포트폴리오 영향도 실계산 (category별 당일 등락률)
// ============================================================================

const FRED_API_KEY = Deno.env.get('FRED_API_KEY') ?? '';

// ── 타입 ──

export interface MarketQuote {
  price: number;
  changePercent: number;
  previousClose: number;
}

export interface RealMarketData {
  sp500: MarketQuote | null;
  nasdaq: MarketQuote | null;
  kospi: MarketQuote | null;
  vix: number | null;                          // VIX 지수 실값
  btc: MarketQuote | null;
  gold: MarketQuote | null;
  treasury10y: number | null;                  // 10년 국채 수익률 (%)
  dji_commodity: MarketQuote | null;           // DJP (원자재 ETF)

  // FRED (API Key 있을 때만)
  fedRate: { value: number; date: string } | null;
  cpi: { value: number; date: string } | null;

  // 카테고리별 당일 등락률 (포트폴리오 영향도 계산용)
  categoryChanges: {
    large_cap: number;   // S&P500 60% + KOSPI 40% 가중평균
    bitcoin: number;     // BTC 등락률
    altcoin: number;     // BTC * 1.3 (베타 높음)
    bond: number;        // 국채 수익률 역방향 (-yield_change * 0.8)
    gold: number;        // 금 등락률
    commodity: number;   // DJP 등락률
    cash: number;        // 항상 0
    realestate: number;  // 항상 0 (제외)
  };

  fetchedAt: string;
  dataQuality: 'live' | 'partial' | 'unavailable'; // live: 5개↑, partial: 2개↑
}

// ── Yahoo Finance 복수 심볼 조회 (v7 quotes API) ──

async function fetchYahooQuotes(
  symbols: string[],
): Promise<Map<string, MarketQuote>> {
  const result = new Map<string, MarketQuote>();
  try {
    const joined = symbols.map(encodeURIComponent).join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${joined}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketPreviousClose`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[RealData] Yahoo Finance API 응답 오류: ${res.status}`);
      return result;
    }

    const data = await res.json();
    const quotes = data?.quoteResponse?.result ?? [];

    for (const q of quotes) {
      if (
        q.symbol &&
        typeof q.regularMarketPrice === 'number' &&
        typeof q.regularMarketChangePercent === 'number'
      ) {
        result.set(q.symbol, {
          price: q.regularMarketPrice,
          changePercent: q.regularMarketChangePercent,
          previousClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
        });
      }
    }

    console.log(`[RealData] Yahoo Finance 수집: ${result.size}/${symbols.length}개 심볼`);
  } catch (err) {
    console.warn('[RealData] Yahoo Finance 수집 실패:', err);
  }
  return result;
}

// ── FRED API 단일 시리즈 조회 (API Key 필요) ──

async function fetchFredSeries(
  seriesId: string,
): Promise<{ value: number; date: string } | null> {
  if (!FRED_API_KEY) return null;
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=${seriesId}&api_key=${FRED_API_KEY}` +
      `&sort_order=desc&limit=1&file_type=json`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const obs = data?.observations?.[0];
    if (!obs || obs.value === '.') return null;

    return { value: parseFloat(obs.value), date: obs.date };
  } catch {
    return null;
  }
}

// ── 메인: 실시간 시장 데이터 수집 ──

export async function fetchRealMarketData(): Promise<RealMarketData> {
  console.log('[RealData] 실시간 시장 데이터 수집 시작...');

  // 1. Yahoo Finance: 7개 심볼 한 번에 조회
  const SYMBOLS = [
    '^GSPC',    // S&P 500
    '^IXIC',    // NASDAQ
    '^KS11',    // KOSPI
    '^VIX',     // VIX
    'BTC-USD',  // Bitcoin
    'GC=F',     // Gold Futures
    '^TNX',     // 10yr Treasury Yield
    'DJP',      // Bloomberg Commodity ETF
  ];

  const quotes = await fetchYahooQuotes(SYMBOLS);

  const sp500 = quotes.get('^GSPC') ?? null;
  const nasdaq = quotes.get('^IXIC') ?? null;
  const kospi = quotes.get('^KS11') ?? null;
  const vixQuote = quotes.get('^VIX') ?? null;
  const btc = quotes.get('BTC-USD') ?? null;
  const gold = quotes.get('GC=F') ?? null;
  const tnx = quotes.get('^TNX') ?? null;
  const commodity = quotes.get('DJP') ?? null;

  // 2. FRED: 연방기금금리 + CPI (병렬, API Key 있을 때만)
  const [fedRate, cpi] = FRED_API_KEY
    ? await Promise.all([
        fetchFredSeries('DFF'),      // 연방기금금리
        fetchFredSeries('CPIAUCSL'), // CPI 전월비
      ])
    : [null, null];

  // 3. 카테고리별 등락률 계산
  const spChg = sp500?.changePercent ?? 0;
  const kospiChg = kospi?.changePercent ?? 0;
  const btcChg = btc?.changePercent ?? 0;
  const goldChg = gold?.changePercent ?? 0;
  const commodityChg = commodity?.changePercent ?? 0;

  // 국채 수익률 상승 → 채권 가격 하락 (듀레이션 효과 단순화)
  // 10년물 수익률 +0.1%p 상승 → 채권 가격 약 -0.8% 하락 (modified duration ~8)
  const tnxChg = tnx?.changePercent ?? 0;
  const bondImpact = -(tnxChg * 0.8);

  const categoryChanges = {
    large_cap:  spChg * 0.6 + kospiChg * 0.4, // 미국 60% + 한국 40%
    bitcoin:    btcChg,
    altcoin:    btcChg * 1.3,                  // 알트코인: BTC 대비 베타 1.3
    bond:       bondImpact,
    gold:       goldChg,
    commodity:  commodityChg,
    cash:       0,
    realestate: 0,
  };

  // 4. 데이터 품질 평가
  const liveCount = [sp500, nasdaq, kospi, vixQuote, btc, gold, tnx].filter(Boolean).length;
  const dataQuality: RealMarketData['dataQuality'] =
    liveCount >= 5 ? 'live' : liveCount >= 2 ? 'partial' : 'unavailable';

  console.log(
    `[RealData] 수집 완료 (품질: ${dataQuality}, ${liveCount}/7)` +
    ` S&P500: ${spChg.toFixed(2)}%` +
    ` VIX: ${vixQuote?.price?.toFixed(2) ?? 'N/A'}` +
    ` BTC: ${btcChg.toFixed(2)}%`,
  );

  return {
    sp500,
    nasdaq,
    kospi,
    vix: vixQuote?.price ?? null,
    btc,
    gold,
    treasury10y: tnx?.price ?? null,
    dji_commodity: commodity,
    fedRate,
    cpi,
    categoryChanges,
    fetchedAt: new Date().toISOString(),
    dataQuality,
  };
}

// ── 요약 문자열 생성 (Gemini 프롬프트 주입용) ──

export function buildRealDataContext(d: RealMarketData): string {
  const fmt = (n: number | null | undefined, digits = 2) =>
    n != null ? n.toFixed(digits) : 'N/A';
  const pct = (n: number | null | undefined) =>
    n != null ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : 'N/A';

  const lines: string[] = [
    `\n**[실시간 시장 데이터 — ${d.fetchedAt.slice(0, 10)} Yahoo Finance 기준]**`,
    `- S&P 500: ${fmt(d.sp500?.price)} (${pct(d.sp500?.changePercent)})`,
    `- NASDAQ:  ${fmt(d.nasdaq?.price)} (${pct(d.nasdaq?.changePercent)})`,
    `- KOSPI:   ${fmt(d.kospi?.price)} (${pct(d.kospi?.changePercent)})`,
    `- VIX:     ${fmt(d.vix)} ${d.vix != null ? (d.vix < 15 ? '(안정)' : d.vix < 25 ? '(주의)' : '(위기)') : ''}`,
    `- BTC:     $${fmt(d.btc?.price, 0)} (${pct(d.btc?.changePercent)})`,
    `- 금(Gold): $${fmt(d.gold?.price, 0)} (${pct(d.gold?.changePercent)})`,
    `- 미국 10년 국채: ${fmt(d.treasury10y)}%`,
  ];

  if (d.fedRate) lines.push(`- 연방기금금리: ${d.fedRate.value}% (FRED, ${d.fedRate.date})`);
  if (d.cpi) lines.push(`- CPI: ${d.cpi.value} (FRED, ${d.cpi.date})`);

  lines.push(`→ 데이터 품질: ${d.dataQuality} (${d.fetchedAt.slice(11, 19)} UTC 기준)`);
  lines.push('→ 위 수치를 분석에 반드시 인용하세요. 할루시네이션 없이 실데이터만 사용.');

  return lines.join('\n');
}
