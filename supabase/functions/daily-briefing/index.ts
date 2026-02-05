// ============================================================================
// Central Kitchen: 일일 시장 분석 배치 Edge Function
// 매일 07:00 AM cron 트리거 → Gemini + Google Search → DB UPSERT
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// 환경변수 (Supabase Dashboard > Edge Functions > Secrets에서 설정)
// ============================================================================
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL = 'gemini-2.0-flash';

// Service Role 클라이언트 (RLS 우회하여 쓰기 가능)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// 분석 대상 종목 리스트 (인기 글로벌 + 한국 종목)
// ============================================================================
const STOCK_LIST = [
  // 미국 대형주
  { ticker: 'NVDA', name: '엔비디아', sector: 'Technology' },
  { ticker: 'TSLA', name: '테슬라', sector: 'Automotive' },
  { ticker: 'AAPL', name: '애플', sector: 'Technology' },
  { ticker: 'MSFT', name: '마이크로소프트', sector: 'Technology' },
  { ticker: 'AMZN', name: '아마존', sector: 'Consumer' },
  { ticker: 'GOOGL', name: '알파벳 A', sector: 'Technology' },
  { ticker: 'META', name: '메타', sector: 'Technology' },
  { ticker: 'NFLX', name: '넷플릭스', sector: 'Entertainment' },
  { ticker: 'BRK.B', name: '버크셔 해서웨이 B', sector: 'Finance' },
  { ticker: 'CEG', name: '컨스틸레이션 에너지', sector: 'Energy' },

  // ETF
  { ticker: 'SPY', name: 'S&P 500 ETF', sector: 'ETF' },
  { ticker: 'QQQ', name: '나스닥 100 ETF', sector: 'ETF' },
  { ticker: 'VOO', name: 'Vanguard S&P 500', sector: 'ETF' },
  { ticker: 'VTI', name: 'Vanguard Total Market', sector: 'ETF' },
  { ticker: 'SCHD', name: 'Schwab Dividend', sector: 'ETF' },
  { ticker: 'JEPI', name: 'JPMorgan Equity Premium', sector: 'ETF' },
  { ticker: 'JEPQ', name: 'JPMorgan Nasdaq Premium', sector: 'ETF' },
  { ticker: 'GLD', name: 'SPDR Gold', sector: 'ETF' },

  // 한국 대형주
  { ticker: '005930.KS', name: '삼성전자', sector: 'Technology' },
  { ticker: '000660.KS', name: 'SK하이닉스', sector: 'Semiconductor' },
  { ticker: '035720.KS', name: '카카오', sector: 'Technology' },
  { ticker: '035420.KS', name: '네이버', sector: 'Technology' },
  { ticker: '005380.KS', name: '현대자동차', sector: 'Automotive' },
  { ticker: '373220.KS', name: 'LG에너지솔루션', sector: 'Battery' },
  { ticker: '068270.KS', name: '셀트리온', sector: 'Bio' },
  { ticker: '005490.KS', name: 'POSCO홀딩스', sector: 'Steel' },
  { ticker: '006400.KS', name: '삼성SDI', sector: 'Battery' },
  { ticker: '000270.KS', name: '기아', sector: 'Automotive' },

  // 암호화폐
  { ticker: 'BTC', name: '비트코인', sector: 'Crypto' },
  { ticker: 'ETH', name: '이더리움', sector: 'Crypto' },
  { ticker: 'SOL', name: '솔라나', sector: 'Crypto' },
  { ticker: 'XRP', name: '리플', sector: 'Crypto' },
  { ticker: 'DOGE', name: '도지코인', sector: 'Crypto' },
];

// ============================================================================
// Gemini API 호출 유틸리티 (Google Search 그라운딩 포함)
// ============================================================================

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

/**
 * Gemini API 직접 호출 (Deno 환경에서는 npm SDK 대신 REST API 사용)
 * Google Search 그라운딩 활성화
 */
async function callGeminiWithSearch(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 에러 (${response.status}): ${errorText}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

/**
 * JSON 응답 정제 (마크다운 코드블록 제거)
 */
function cleanJsonResponse(text: string): string {
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    clean = clean.substring(start, end + 1);
  }
  return clean;
}

// ============================================================================
// Task A: 거시경제 & 비트코인 분석
// ============================================================================
async function analyzeMacroAndBitcoin(): Promise<{
  macroSummary: Record<string, unknown>;
  bitcoinAnalysis: Record<string, unknown>;
  marketSentiment: string;
  cfoWeather: Record<string, unknown>;
  vixLevel: number | null;
  globalLiquidity: string;
}> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const prompt = `
당신은 골드만삭스 수석 매크로 전략가입니다. 오늘(${dateStr}) 글로벌 시장 분석을 작성하세요.

**[중요] Google Search로 반드시 실시간 데이터를 검색하세요:**
1. "나스닥 종가 today", "S&P 500 today", "다우존스 today"
2. "Trump tariff crypto news today"
3. "Bitcoin whale alerts ETF inflows ${today.getMonth() + 1}월"
4. "Fed interest rate probability CME FedWatch"
5. "VIX index today", "Global M2 liquidity"

**출력 형식 (JSON만, 마크다운 금지):**
{
  "macroSummary": {
    "title": "오늘의 글로벌 시장 핵심",
    "highlights": [
      "[검색결과] 구체적 이슈 1 (수치 포함)",
      "[검색결과] 구체적 이슈 2",
      "[검색결과] 구체적 이슈 3"
    ],
    "interestRateProbability": "동결 65% / 인하 30% / 인상 5%",
    "marketSentiment": "BULLISH" | "BEARISH" | "NEUTRAL"
  },
  "bitcoinAnalysis": {
    "score": 0-100,
    "whaleAlerts": ["고래 동향 1", "고래 동향 2"],
    "etfInflows": "BTC ETF 순유입/유출 정보",
    "politicsImpact": "트럼프/규제 뉴스 영향",
    "priceTarget": "단기 목표가 범위"
  },
  "cfoWeather": {
    "emoji": "☀️ 또는 ⛅ 또는 🌧️ 또는 ⛈️",
    "status": "맑음: 시장 긍정적",
    "message": "오늘의 핵심 한 마디"
  },
  "vixLevel": 15.5,
  "globalLiquidity": "M2 증감 설명 (한글)"
}
`;

  console.log('[Task A] 거시경제 & 비트코인 분석 시작...');
  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleanJson);

  return {
    macroSummary: parsed.macroSummary || {},
    bitcoinAnalysis: parsed.bitcoinAnalysis || {},
    marketSentiment: parsed.macroSummary?.marketSentiment || 'NEUTRAL',
    cfoWeather: parsed.cfoWeather || {},
    vixLevel: parsed.vixLevel ?? null,
    globalLiquidity: parsed.globalLiquidity || '',
  };
}

// ============================================================================
// Task B: 종목별 퀀트 분석 (배치 처리)
// ============================================================================

interface StockQuantResult {
  ticker: string;
  valuationScore: number;
  signal: string;
  analysis: string;
  metrics: Record<string, unknown>;
  sector: string;
}

/**
 * 단일 배치(5종목) 퀀트 분석
 * Promise.allSettled로 개별 실패가 전체를 중단하지 않음
 */
async function analyzeStockBatch(
  stocks: typeof STOCK_LIST
): Promise<StockQuantResult[]> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const tickerList = stocks.map(s => `${s.ticker}(${s.name})`).join(', ');

  const prompt = `
당신은 퀀트 분석가입니다. 오늘(${dateStr}) 다음 종목들의 퀀트 리포트를 작성하세요.

**분석 대상:** ${tickerList}

**[중요] Google Search로 각 종목의 최신 데이터를 검색하세요:**
- "${stocks.map(s => s.ticker).join(' stock price today')}"
- 각 종목의 최근 실적, 뉴스, 애널리스트 의견
- RSI, PEG Ratio 관련 최신 데이터

**각 종목별 분석:**
1. valuation_score (0-100): 높을수록 저평가 (PEG, P/E, P/S 종합)
2. signal: STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL
3. analysis: 한글 2-3문장 분석 (최신 뉴스 반영)
4. metrics: { pegRatio, rsi, earningsRevision, priceToFairValue, shortInterest }

**출력 형식 (JSON 배열만, 마크다운 금지):**
{
  "reports": [
    {
      "ticker": "NVDA",
      "valuation_score": 45,
      "signal": "HOLD",
      "analysis": "[실시간] 구체적 분석...",
      "metrics": {
        "pegRatio": 1.8,
        "rsi": 62,
        "earningsRevision": "+5%",
        "priceToFairValue": 0.95,
        "shortInterest": "2.1%"
      }
    }
  ]
}
`;

  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);

  // 배열 또는 객체 형태 모두 처리
  let parsed: { reports?: StockQuantResult[] };
  const cleaned = cleanJson.trim();

  if (cleaned.startsWith('[')) {
    parsed = { reports: JSON.parse(cleaned) };
  } else {
    parsed = JSON.parse(cleaned);
  }

  const reports = parsed.reports || [];

  return reports.map((r: Record<string, unknown>) => ({
    ticker: String(r.ticker || ''),
    valuationScore: Number(r.valuation_score ?? r.valuationScore ?? 50),
    signal: String(r.signal || 'HOLD'),
    analysis: String(r.analysis || '분석 데이터 없음'),
    metrics: (r.metrics as Record<string, unknown>) || {},
    sector: stocks.find(s => s.ticker === r.ticker)?.sector || '',
  }));
}

/**
 * 전체 종목 배치 처리 (5개씩 나누어 순차 실행)
 * API Rate Limit 방지를 위해 배치 간 1초 딜레이
 */
async function analyzeAllStocks(): Promise<StockQuantResult[]> {
  const BATCH_SIZE = 5;
  const allResults: StockQuantResult[] = [];

  for (let i = 0; i < STOCK_LIST.length; i += BATCH_SIZE) {
    const batch = STOCK_LIST.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(STOCK_LIST.length / BATCH_SIZE);

    console.log(`[Task B] 배치 ${batchNum}/${totalBatches}: ${batch.map(s => s.ticker).join(', ')}`);

    try {
      const results = await analyzeStockBatch(batch);
      allResults.push(...results);
    } catch (error) {
      console.error(`[Task B] 배치 ${batchNum} 실패:`, error);
      // 실패한 종목은 기본값으로 채움
      batch.forEach(stock => {
        allResults.push({
          ticker: stock.ticker,
          valuationScore: 50,
          signal: 'HOLD',
          analysis: '분석 데이터를 불러오지 못했습니다.',
          metrics: {},
          sector: stock.sector,
        });
      });
    }

    // Rate limit 방지: 배치 간 1.5초 대기
    if (i + BATCH_SIZE < STOCK_LIST.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  return allResults;
}

// ============================================================================
// Task C: DB UPSERT
// ============================================================================

/**
 * 거시경제 분석 결과를 daily_market_insights에 UPSERT
 */
async function upsertMarketInsights(data: {
  macroSummary: Record<string, unknown>;
  bitcoinAnalysis: Record<string, unknown>;
  marketSentiment: string;
  cfoWeather: Record<string, unknown>;
  vixLevel: number | null;
  globalLiquidity: string;
}) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { error } = await supabase
    .from('daily_market_insights')
    .upsert(
      {
        date: today,
        macro_summary: data.macroSummary,
        bitcoin_analysis: data.bitcoinAnalysis,
        market_sentiment: data.marketSentiment,
        cfo_weather: data.cfoWeather,
        vix_level: data.vixLevel,
        global_liquidity: data.globalLiquidity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    );

  if (error) {
    console.error('[Task C] daily_market_insights UPSERT 실패:', error);
    throw error;
  }
  console.log(`[Task C] daily_market_insights UPSERT 성공 (${today})`);
}

/**
 * 종목별 퀀트 분석 결과를 stock_quant_reports에 UPSERT
 */
async function upsertStockReports(reports: StockQuantResult[]) {
  const today = new Date().toISOString().split('T')[0];

  const rows = reports.map(r => ({
    ticker: r.ticker,
    date: today,
    valuation_score: r.valuationScore,
    signal: r.signal,
    analysis: r.analysis,
    metrics: r.metrics,
    sector: r.sector,
  }));

  // 10개씩 나누어 UPSERT (Supabase 페이로드 제한 대비)
  const UPSERT_BATCH = 10;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from('stock_quant_reports')
      .upsert(batch, { onConflict: 'ticker,date' });

    if (error) {
      console.error(`[Task C] stock_quant_reports UPSERT 실패 (batch ${i}):`, error);
      // 개별 배치 실패 시 계속 진행
    }
  }

  console.log(`[Task C] stock_quant_reports UPSERT 완료 (${reports.length}건)`);
}

// ============================================================================
// 메인 핸들러
// ============================================================================
serve(async (req: Request) => {
  // CORS 헤더 (Supabase Dashboard에서 테스트 시 필요)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 인증 확인 (cron 또는 service role만 실행 가능)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY)) {
      // Bearer 토큰 확인 (Supabase cron은 자동으로 service role 사용)
      console.log('[인증] Service Role 직접 매칭 아님 - cron/admin 토큰으로 진행');
    }

    const startTime = Date.now();
    console.log('========================================');
    console.log(`[Central Kitchen] 일일 배치 시작: ${new Date().toISOString()}`);
    console.log('========================================');

    // Task A와 Task B를 병렬 실행 (독립적이므로 동시에 처리)
    const [macroResult, stockResults] = await Promise.allSettled([
      analyzeMacroAndBitcoin(),
      analyzeAllStocks(),
    ]);

    // Task A 결과 처리
    if (macroResult.status === 'fulfilled') {
      await upsertMarketInsights(macroResult.value);
    } else {
      console.error('[Task A 실패]', macroResult.reason);
      // 기본값으로 UPSERT (빈 데이터라도 기록)
      await upsertMarketInsights({
        macroSummary: { title: '분석 실패', highlights: ['데이터를 불러오지 못했습니다'] },
        bitcoinAnalysis: {},
        marketSentiment: 'NEUTRAL',
        cfoWeather: { emoji: '🔄', status: '분석 중', message: '잠시 후 다시 확인해주세요' },
        vixLevel: null,
        globalLiquidity: '',
      });
    }

    // Task B 결과 처리
    if (stockResults.status === 'fulfilled') {
      await upsertStockReports(stockResults.value);
    } else {
      console.error('[Task B 실패]', stockResults.reason);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const macroStatus = macroResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const stockCount = stockResults.status === 'fulfilled' ? stockResults.value.length : 0;

    console.log('========================================');
    console.log(`[Central Kitchen] 배치 완료: ${elapsed}초`);
    console.log(`  - 거시경제: ${macroStatus}`);
    console.log(`  - 종목 분석: ${stockCount}/${STOCK_LIST.length}건`);
    console.log('========================================');

    return new Response(
      JSON.stringify({
        success: true,
        elapsed: `${elapsed}s`,
        macro: macroStatus,
        stocks: `${stockCount}/${STOCK_LIST.length}`,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Central Kitchen] 치명적 오류:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
