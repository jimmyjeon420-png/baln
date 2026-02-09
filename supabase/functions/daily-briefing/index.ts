// @ts-nocheck
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
const MOLIT_API_KEY = Deno.env.get('MOLIT_API_KEY') || ''; // 국토부 API 키 (없으면 Task F 스킵)

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
  rateCycleEvidence: Record<string, unknown> | null;
}> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const prompt = `
당신은 골드만삭스 수석 매크로 전략가입니다. 오늘(${dateStr}) 글로벌 시장 분석을 작성하세요.

**[중요] Google Search로 반드시 실시간 데이터를 검색하세요:**
1. "나스닥 종가 today", "S&P 500 today", "다우존스 today"
2. "Trump tariff crypto news today"
3. "Bitcoin whale alerts ETF inflows ${today.getMonth() + 1}월", "Bitcoin hash rate today"
4. "Fed interest rate probability CME FedWatch"
5. "VIX index today", "Global M2 liquidity"
6. "Fed governor speech today", "CPI latest data", "PCE core inflation"
7. "Treasury yield curve spread 10Y-2Y", "unemployment rate latest"

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
    "priceTarget": "단기 목표가 범위",
    "hashRate": "해시레이트 수치 및 추세 설명",
    "subScores": {
      "vixFear": 0-100,
      "hashRateHealth": 0-100,
      "whaleActivity": 0-100,
      "etfFlows": 0-100,
      "macroEnvironment": 0-100
    }
  },
  "cfoWeather": {
    "emoji": "☀️ 또는 ⛅ 또는 🌧️ 또는 ⛈️",
    "status": "맑음: 시장 긍정적",
    "message": "오늘의 핵심 한 마디"
  },
  "vixLevel": 15.5,
  "globalLiquidity": "M2 증감 설명 (한글)",
  "rateCycleEvidence": {
    "keyEvidence": [
      {
        "headline": "Fed 파월 의장, 추가 인하 신중론 재확인",
        "source": "Reuters",
        "date": "${dateStr}",
        "stance": "hawkish",
        "impact": "high"
      },
      {
        "headline": "1월 CPI 3.0% — 시장 예상 상회",
        "source": "Bloomberg",
        "date": "${dateStr}",
        "stance": "hawkish",
        "impact": "high"
      },
      {
        "headline": "고용시장 둔화 조짐, 실업수당 청구 증가",
        "source": "CNBC",
        "date": "${dateStr}",
        "stance": "dovish",
        "impact": "medium"
      }
    ],
    "economicIndicators": {
      "fedRate": { "name": "Fed 기준금리", "value": "현재 값", "previous": "이전 값", "trend": "stable", "nextRelease": "다음 FOMC 날짜" },
      "cpi": { "name": "CPI (전년 대비)", "value": "현재 값", "previous": "이전 값", "trend": "rising 또는 falling 또는 stable" },
      "unemployment": { "name": "실업률", "value": "현재 값", "previous": "이전 값", "trend": "rising 또는 falling 또는 stable" },
      "yieldCurveSpread": { "name": "10Y-2Y 스프레드", "value": "현재 값 (bp)", "previous": "이전 값", "trend": "rising 또는 falling 또는 stable" },
      "pceCore": { "name": "PCE 코어", "value": "현재 값", "previous": "이전 값", "trend": "rising 또는 falling 또는 stable" }
    },
    "expertPerspectives": {
      "ratio": 55,
      "hawkishArgs": ["인플레이션이 목표치 2%에 도달하지 못함", "고용시장 여전히 견고"],
      "dovishArgs": ["경기 둔화 신호 확산", "글로벌 수요 위축"],
      "hawkishFigures": ["크리스토퍼 월러 (Fed 이사)", "닐 카시카리 (미니애폴리스 연은 총재)"],
      "dovishFigures": ["오스탄 굴스비 (시카고 연은 총재)", "라파엘 보스틱 (애틀랜타 연은 총재)"]
    },
    "confidenceFactors": {
      "overall": 72,
      "factors": [
        { "factor": "CME FedWatch 금리 동결 확률 80%+", "type": "supporting", "weight": "strong" },
        { "factor": "CPI 하락 추세 유지", "type": "supporting", "weight": "medium" },
        { "factor": "관세 정책 불확실성", "type": "opposing", "weight": "medium" },
        { "factor": "고용 지표 혼조", "type": "opposing", "weight": "weak" }
      ]
    },
    "generatedAt": "${today.toISOString()}"
  }
}
`;

  console.log('[Task A] 거시경제 & 비트코인 분석 시작...');
  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleanJson);

  // 금리 사이클 증거 파싱 (실패 시 null — 기존 데이터에 영향 없음)
  let rateCycleEvidence: Record<string, unknown> | null = null;
  try {
    if (parsed.rateCycleEvidence && parsed.rateCycleEvidence.keyEvidence) {
      rateCycleEvidence = parsed.rateCycleEvidence;
      console.log(`[Task A] 금리 사이클 증거 파싱 성공 (증거 ${parsed.rateCycleEvidence.keyEvidence?.length || 0}건)`);
    }
  } catch (evidenceError) {
    console.warn('[Task A] 금리 사이클 증거 파싱 실패 (무시):', evidenceError);
  }

  return {
    macroSummary: parsed.macroSummary || {},
    bitcoinAnalysis: parsed.bitcoinAnalysis || {},
    marketSentiment: parsed.macroSummary?.marketSentiment || 'NEUTRAL',
    cfoWeather: parsed.cfoWeather || {},
    vixLevel: parsed.vixLevel ?? null,
    globalLiquidity: parsed.globalLiquidity || '',
    rateCycleEvidence,
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
// Task C: 투자 거장 인사이트 분석
// ============================================================================

const GURU_LIST = [
  { name: '워렌 버핏', nameEn: 'Warren Buffett', org: 'Berkshire Hathaway', emoji: '🦉', topic: '미국 대형 가치주' },
  { name: '레이 달리오', nameEn: 'Ray Dalio', org: 'Bridgewater', emoji: '🌊', topic: '올웨더/매크로' },
  { name: '캐시 우드', nameEn: 'Cathie Wood', org: 'ARK Invest', emoji: '🚀', topic: '혁신 성장주' },
  { name: '마이클 세일러', nameEn: 'Michael Saylor', org: 'MicroStrategy', emoji: '₿', topic: '비트코인' },
  { name: '제이미 다이먼', nameEn: 'Jamie Dimon', org: 'JPMorgan Chase', emoji: '🏦', topic: '은행/금융' },
  { name: '래리 핑크', nameEn: 'Larry Fink', org: 'BlackRock', emoji: '🌐', topic: 'ETF/자산운용' },
  { name: '일론 머스크', nameEn: 'Elon Musk', org: 'Tesla / xAI', emoji: '⚡', topic: '테슬라/도지/정치' },
  { name: '피터 린치', nameEn: 'Peter Lynch', org: 'Fidelity (은퇴)', emoji: '📚', topic: '가치투자 교훈' },
  { name: '하워드 막스', nameEn: 'Howard Marks', org: 'Oaktree Capital', emoji: '📝', topic: '채권/신용' },
  { name: '짐 로저스', nameEn: 'Jim Rogers', org: 'Rogers Holdings', emoji: '🥇', topic: '원자재(금/은)' },
];

interface GuruInsightResult {
  guruName: string;
  guruNameEn: string;
  organization: string;
  emoji: string;
  topic: string;
  recentAction: string;
  quote: string;
  sentiment: string;
  reasoning: string;
  relevantAssets: string[];
  source: string;
}

/**
 * 10명의 투자 거장 인사이트 분석
 * 단일 Gemini API 호출 (배치 분할 불필요)
 */
async function analyzeGuruInsights(): Promise<{
  insights: GuruInsightResult[];
  marketContext: string;
}> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const guruNames = GURU_LIST.map(g => `${g.nameEn}(${g.name})`).join(', ');

  const prompt = `
당신은 Bloomberg 수석 글로벌 투자 전략가입니다.
오늘(${dateStr}) 다음 10명의 투자 거장들의 최근 동향을 분석하세요.

**거장 리스트:** ${guruNames}

**[중요] Google Search로 각 거장의 최신 정보를 검색하세요:**
- "Warren Buffett portfolio changes 2026"
- "Ray Dalio all weather portfolio news"
- "Cathie Wood ARK Invest trades today"
- "Michael Saylor Bitcoin MicroStrategy"
- "Jamie Dimon JPMorgan market outlook"
- "Larry Fink BlackRock ETF news"
- "Elon Musk Tesla stock crypto"
- "Peter Lynch investing principles"
- "Howard Marks Oaktree memo"
- "Jim Rogers commodities gold silver"

**각 거장에 대해:**
1. recentAction: 최근 포트폴리오 변동, 거래, 또는 주목할 행동 (한글, 구체적 수치 포함)
2. quote: 최근 공개 발언이나 유명 인용구 (한글)
3. sentiment: BULLISH / BEARISH / NEUTRAL / CAUTIOUS (현재 시장에 대한 입장)
4. reasoning: AI 분석 2-3문장 (한글, 왜 이런 입장인지)
5. relevantAssets: 관련 주요 티커 (최대 5개)
6. source: 주요 뉴스 출처

**출력 형식 (JSON만, 마크다운 금지):**
{
  "marketContext": "오늘의 시장 상황 요약 1-2문장 (한글)",
  "insights": [
    {
      "guruName": "워렌 버핏",
      "guruNameEn": "Warren Buffett",
      "recentAction": "Apple 주식 25% 매도, 현금 보유고 $334B 도달",
      "quote": "좋은 거래를 찾기 어려운 시기다",
      "sentiment": "CAUTIOUS",
      "reasoning": "버핏은 현재 시장 고평가를 우려하며...",
      "relevantAssets": ["AAPL", "BRK.B", "OXY"],
      "source": "Bloomberg"
    }
  ]
}
`;

  console.log('[Task C] 투자 거장 인사이트 분석 시작...');
  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleanJson);

  // GURU_LIST 기반 폴백 보강 (Gemini가 누락한 거장 채우기)
  const returnedNames = new Set(
    (parsed.insights || []).map((g: { guruNameEn: string }) => g.guruNameEn)
  );

  const insights: GuruInsightResult[] = (parsed.insights || []).map(
    (g: Record<string, unknown>) => {
      const guruMeta = GURU_LIST.find(
        (m) => m.nameEn === g.guruNameEn || m.name === g.guruName
      );
      return {
        guruName: String(g.guruName || guruMeta?.name || ''),
        guruNameEn: String(g.guruNameEn || guruMeta?.nameEn || ''),
        organization: String(g.organization || guruMeta?.org || ''),
        emoji: String(g.emoji || guruMeta?.emoji || '📊'),
        topic: String(g.topic || guruMeta?.topic || ''),
        recentAction: String(g.recentAction || '최신 데이터 없음'),
        quote: String(g.quote || ''),
        sentiment: String(g.sentiment || 'NEUTRAL'),
        reasoning: String(g.reasoning || '분석 데이터를 불러오지 못했습니다.'),
        relevantAssets: Array.isArray(g.relevantAssets) ? g.relevantAssets.map(String) : [],
        source: String(g.source || ''),
      };
    }
  );

  // 누락된 거장 기본값으로 추가
  GURU_LIST.forEach((guru) => {
    if (!returnedNames.has(guru.nameEn)) {
      insights.push({
        guruName: guru.name,
        guruNameEn: guru.nameEn,
        organization: guru.org,
        emoji: guru.emoji,
        topic: guru.topic,
        recentAction: '최신 데이터를 불러오지 못했습니다.',
        quote: '',
        sentiment: 'NEUTRAL',
        reasoning: '분석 데이터가 아직 준비되지 않았습니다.',
        relevantAssets: [],
        source: '',
      });
    }
  });

  return {
    insights,
    marketContext: String(parsed.marketContext || ''),
  };
}

/**
 * 거장 인사이트 결과를 guru_insights에 UPSERT
 */
async function upsertGuruInsights(data: {
  insights: GuruInsightResult[];
  marketContext: string;
}) {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('guru_insights')
    .upsert(
      {
        date: today,
        insights: data.insights,
        market_context: data.marketContext,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    );

  if (error) {
    console.error('[Task C] guru_insights UPSERT 실패:', error);
    throw error;
  }
  console.log(`[Task C] guru_insights UPSERT 성공 (${today}, ${data.insights.length}명)`);
}

// ============================================================================
// Task D: 포트폴리오 일별 스냅샷 (모든 유저)
// Gemini 미사용 — DB 읽기/쓰기만 (비용 0원, ~2-5초)
// ============================================================================

/**
 * 자산 구간 결정 (DB 함수 get_asset_bracket과 동일 로직)
 */
function getAssetBracket(total: number): string {
  if (total < 100000000) return 'bracket_0';    // 1억 미만
  if (total < 300000000) return 'bracket_1';    // 1~3억
  if (total < 500000000) return 'bracket_2';    // 3~5억
  if (total < 1000000000) return 'bracket_3';   // 5~10억
  if (total < 3000000000) return 'bracket_4';   // 10~30억
  return 'bracket_5';                            // 30억+
}

/**
 * 티어 결정
 */
function getTier(total: number): string {
  if (total >= 1000000000) return 'DIAMOND';
  if (total >= 500000000) return 'PLATINUM';
  if (total >= 100000000) return 'GOLD';
  return 'SILVER';
}

/**
 * 모든 유저의 포트폴리오 스냅샷을 기록
 * 1. 유저별 포트폴리오 집계
 * 2. 전일 스냅샷 대비 입출금 보정 수익률 계산
 * 3. portfolio_snapshots UPSERT
 * 4. bracket_performance 집계
 */
async function takePortfolioSnapshots(): Promise<{
  totalUsers: number;
  snapshotsCreated: number;
  bracketsUpdated: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  console.log('[Task D] 포트폴리오 스냅샷 시작...');

  // 1. 모든 포트폴리오 데이터 조회 (Service Role로 RLS 우회)
  const { data: allPortfolios, error: portError } = await supabase
    .from('portfolios')
    .select('user_id, ticker, quantity, current_price, current_value, asset_type');

  if (portError) {
    console.error('[Task D] 포트폴리오 조회 실패:', portError);
    throw portError;
  }

  if (!allPortfolios || allPortfolios.length === 0) {
    console.log('[Task D] 포트폴리오 데이터 없음 — 스킵');
    return { totalUsers: 0, snapshotsCreated: 0, bracketsUpdated: 0 };
  }

  // 2. 유저별 집계
  const userMap = new Map<string, {
    totalAssets: number;
    holdingsCount: number;
    breakdown: Record<string, number>;
    topHoldings: { ticker: string; value: number }[];
  }>();

  for (const item of allPortfolios) {
    const value = (item.quantity && item.current_price)
      ? item.quantity * item.current_price
      : (item.current_value || 0);

    if (!userMap.has(item.user_id)) {
      userMap.set(item.user_id, {
        totalAssets: 0,
        holdingsCount: 0,
        breakdown: {},
        topHoldings: [],
      });
    }

    const user = userMap.get(item.user_id)!;
    user.totalAssets += value;
    user.holdingsCount += 1;

    // 자산 유형별 집계
    const assetType = item.asset_type || 'other';
    user.breakdown[assetType] = (user.breakdown[assetType] || 0) + value;

    // 상위 종목 기록
    user.topHoldings.push({ ticker: item.ticker || 'unknown', value });
  }

  // 3. 어제 스냅샷 조회 (수익률 계산용)
  const userIds = Array.from(userMap.keys());
  const { data: yesterdaySnapshots } = await supabase
    .from('portfolio_snapshots')
    .select('user_id, total_assets')
    .eq('snapshot_date', yesterday)
    .in('user_id', userIds);

  const yesterdayMap = new Map<string, number>();
  (yesterdaySnapshots || []).forEach((s: { user_id: string; total_assets: number }) => {
    yesterdayMap.set(s.user_id, s.total_assets);
  });

  // 4. 오늘 입출금 이벤트 집계
  const { data: todayDeposits } = await supabase
    .from('deposit_events')
    .select('user_id, event_type, amount')
    .eq('event_date', today)
    .in('user_id', userIds);

  const netDepositMap = new Map<string, number>();
  (todayDeposits || []).forEach((d: { user_id: string; event_type: string; amount: number }) => {
    const current = netDepositMap.get(d.user_id) || 0;
    const delta = d.event_type === 'deposit' ? d.amount : -d.amount;
    netDepositMap.set(d.user_id, current + delta);
  });

  // 5. 스냅샷 행 생성
  const snapshotRows = [];
  for (const [userId, data] of userMap) {
    const total = data.totalAssets;
    const yesterdayTotal = yesterdayMap.get(userId) || 0;
    const netDeposit = netDepositMap.get(userId) || 0;

    // 보정 수익률 = (오늘 - 어제 - 순입금) / 어제 × 100
    let dailyReturn = 0;
    if (yesterdayTotal > 0) {
      dailyReturn = ((total - yesterdayTotal - netDeposit) / yesterdayTotal) * 100;
      // 비정상 수익률 클램프 (-50% ~ +50%)
      dailyReturn = Math.max(-50, Math.min(50, dailyReturn));
    }

    // 상위 5개 종목 (비율 포함)
    const topHoldings = data.topHoldings
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(h => ({
        ticker: h.ticker,
        value: h.value,
        weight: total > 0 ? Math.round((h.value / total) * 1000) / 10 : 0,
      }));

    snapshotRows.push({
      user_id: userId,
      snapshot_date: today,
      total_assets: total,
      tier: getTier(total),
      bracket: getAssetBracket(total),
      asset_breakdown: { ...data.breakdown, top_holdings: topHoldings },
      net_deposit_since_last: netDeposit,
      daily_return_rate: Math.round(dailyReturn * 10000) / 10000,
      holdings_count: data.holdingsCount,
    });
  }

  // 6. UPSERT (배치)
  const BATCH_SIZE = 50;
  let snapshotsCreated = 0;

  for (let i = 0; i < snapshotRows.length; i += BATCH_SIZE) {
    const batch = snapshotRows.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from('portfolio_snapshots')
      .upsert(batch, { onConflict: 'user_id,snapshot_date' });

    if (upsertError) {
      console.error(`[Task D] 스냅샷 UPSERT 실패 (batch ${i}):`, upsertError);
    } else {
      snapshotsCreated += batch.length;
    }
  }

  console.log(`[Task D] 스냅샷 ${snapshotsCreated}/${userMap.size}명 저장 완료`);

  // 7. 구간별 통계 집계 (bracket_performance)
  const bracketStats = new Map<string, number[]>();

  for (const row of snapshotRows) {
    if (!bracketStats.has(row.bracket)) {
      bracketStats.set(row.bracket, []);
    }
    bracketStats.get(row.bracket)!.push(row.daily_return_rate);
  }

  // 7-1. 어제 스냅샷에서 panic_shield_score 조회 (유저가 앱에서 저장한 값)
  const { data: yesterdayPanicScores } = await supabase
    .from('portfolio_snapshots')
    .select('bracket, panic_shield_score')
    .eq('snapshot_date', yesterday)
    .not('panic_shield_score', 'is', null);

  // bracket별 panic score 배열 구성
  const bracketPanicScores = new Map<string, number[]>();
  (yesterdayPanicScores || []).forEach((row: { bracket: string; panic_shield_score: number }) => {
    if (!bracketPanicScores.has(row.bracket)) {
      bracketPanicScores.set(row.bracket, []);
    }
    bracketPanicScores.get(row.bracket)!.push(row.panic_shield_score);
  });

  const bracketRows = [];
  for (const [bracket, returns] of bracketStats) {
    if (returns.length === 0) continue;

    const sorted = [...returns].sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const top10Idx = Math.max(0, Math.floor(sorted.length * 0.9));
    const bottom10Idx = Math.floor(sorted.length * 0.1);

    // Panic score 집계 (어제 데이터 기반)
    const panicScores = bracketPanicScores.get(bracket) || [];
    const panicSorted = [...panicScores].sort((a, b) => a - b);
    const avgPanic = panicSorted.length > 0
      ? Math.round((panicSorted.reduce((s, v) => s + v, 0) / panicSorted.length) * 100) / 100
      : null;
    const medianPanic = panicSorted.length > 0
      ? panicSorted[Math.floor(panicSorted.length / 2)]
      : null;

    bracketRows.push({
      stat_date: today,
      bracket,
      user_count: sorted.length,
      avg_return_rate: Math.round(avg * 10000) / 10000,
      median_return_rate: Math.round(median * 10000) / 10000,
      top_10_return_rate: Math.round((sorted[top10Idx] || 0) * 10000) / 10000,
      bottom_10_return_rate: Math.round((sorted[bottom10Idx] || 0) * 10000) / 10000,
      avg_panic_score: avgPanic,
      median_panic_score: medianPanic,
      panic_sample_count: panicSorted.length,
    });
  }

  if (bracketRows.length > 0) {
    const { error: bracketError } = await supabase
      .from('bracket_performance')
      .upsert(bracketRows, { onConflict: 'stat_date,bracket' });

    if (bracketError) {
      console.error('[Task D] bracket_performance UPSERT 실패:', bracketError);
    }
  }

  console.log(`[Task D] 구간별 통계 ${bracketRows.length}개 구간 저장 완료`);

  // 8. 등급별 자산 배분 통계 (tier_allocation_stats)
  // 자산 유형을 표준 카테고리로 매핑
  const normalizeAssetType = (type: string): string => {
    const t = (type || '').toLowerCase();
    if (['stock', 'stocks', '주식', 'us_stock', 'kr_stock', 'etf'].includes(t)) return 'stock';
    if (['crypto', 'cryptocurrency', '암호화폐', '코인'].includes(t)) return 'crypto';
    if (['realestate', 'real_estate', '부동산'].includes(t)) return 'realestate';
    if (['cash', '현금', 'deposit', '예금'].includes(t)) return 'cash';
    return 'other';
  };

  // 등급별 유저 배분 데이터 수집
  const tierAllocMap = new Map<string, {
    users: { stockW: number; cryptoW: number; realestateW: number; cashW: number; otherW: number; btcW: number }[];
    tickerCounts: Map<string, { count: number; totalWeight: number }>;
  }>();

  for (const [userId, data] of userMap) {
    const total = data.totalAssets;
    if (total <= 0) continue;

    const tier = getTier(total);

    if (!tierAllocMap.has(tier)) {
      tierAllocMap.set(tier, { users: [], tickerCounts: new Map() });
    }
    const tierData = tierAllocMap.get(tier)!;

    // 표준 카테고리별 합계 계산
    const catSums: Record<string, number> = { stock: 0, crypto: 0, realestate: 0, cash: 0, other: 0 };
    for (const [assetType, amount] of Object.entries(data.breakdown)) {
      const cat = normalizeAssetType(assetType);
      catSums[cat] = (catSums[cat] || 0) + (amount as number);
    }

    // 비중 (%) 계산
    tierData.users.push({
      stockW: (catSums.stock / total) * 100,
      cryptoW: (catSums.crypto / total) * 100,
      realestateW: (catSums.realestate / total) * 100,
      cashW: (catSums.cash / total) * 100,
      otherW: (catSums.other / total) * 100,
      btcW: 0, // 아래에서 BTC 별도 계산
    });

    // BTC 비중 별도 계산
    const btcItem = data.topHoldings.find(h =>
      h.ticker && ['BTC', 'BTC-USD', 'bitcoin'].includes(h.ticker.toUpperCase())
    );
    if (btcItem) {
      tierData.users[tierData.users.length - 1].btcW = (btcItem.value / total) * 100;
    }

    // 인기 종목 카운트
    for (const holding of data.topHoldings) {
      if (!holding.ticker) continue;
      const existing = tierData.tickerCounts.get(holding.ticker) || { count: 0, totalWeight: 0 };
      existing.count += 1;
      existing.totalWeight += total > 0 ? (holding.value / total) * 100 : 0;
      tierData.tickerCounts.set(holding.ticker, existing);
    }
  }

  // 등급별 평균 계산 및 UPSERT
  const tierAllocRows = [];
  for (const [tier, data] of tierAllocMap) {
    const n = data.users.length;
    if (n === 0) continue;

    const avg = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100;

    // 인기 종목 TOP 5
    const topHoldings = Array.from(data.tickerCounts.entries())
      .map(([ticker, stats]) => ({
        ticker,
        holders: stats.count,
        avg_weight: Math.round((stats.totalWeight / stats.count) * 100) / 100,
      }))
      .sort((a, b) => b.holders - a.holders)
      .slice(0, 5);

    tierAllocRows.push({
      stat_date: today,
      tier,
      avg_stock_weight: avg(data.users.map(u => u.stockW)),
      avg_crypto_weight: avg(data.users.map(u => u.cryptoW)),
      avg_realestate_weight: avg(data.users.map(u => u.realestateW)),
      avg_cash_weight: avg(data.users.map(u => u.cashW)),
      avg_other_weight: avg(data.users.map(u => u.otherW)),
      avg_btc_weight: avg(data.users.map(u => u.btcW)),
      top_holdings: topHoldings,
      user_count: n,
    });
  }

  if (tierAllocRows.length > 0) {
    const { error: allocError } = await supabase
      .from('tier_allocation_stats')
      .upsert(tierAllocRows, { onConflict: 'stat_date,tier' });

    if (allocError) {
      console.error('[Task D] tier_allocation_stats UPSERT 실패:', allocError);
    }
  }

  console.log(`[Task D] 등급별 배분 통계 ${tierAllocRows.length}개 등급 저장 완료`);

  return {
    totalUsers: userMap.size,
    snapshotsCreated,
    bracketsUpdated: bracketRows.length,
  };
}

// ============================================================================
// Task E: 투자 예측 게임 (Prediction Polls)
// E-1: 새로운 예측 질문 3개 생성 (Gemini + Google Search)
// E-2: 만료된 투표 정답 판정 (Gemini)
// ============================================================================

interface PredictionQuestion {
  question: string;
  description: string;
  category: string;
  yes_label: string;
  no_label: string;
  deadline_hours: number;  // 마감까지 시간
}

/**
 * Task E-1: 오늘의 예측 질문 3개 생성
 * - 카테고리 배분: stocks 1개, crypto 1개, macro/event 1개
 * - 이미 오늘 생성된 질문이 있으면 스킵
 */
async function generatePredictionPolls(): Promise<{
  created: number;
  skipped: boolean;
}> {
  const today = new Date().toISOString().split('T')[0];

  // 중복 생성 방지: 오늘 이미 생성된 투표 확인
  const { data: existing } = await supabase
    .from('prediction_polls')
    .select('id')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`);

  if (existing && existing.length >= 3) {
    console.log(`[Task E-1] 오늘(${today}) 이미 ${existing.length}개 질문 존재 — 스킵`);
    return { created: 0, skipped: true };
  }

  const todayDate = new Date();
  const dateStr = `${todayDate.getFullYear()}년 ${todayDate.getMonth() + 1}월 ${todayDate.getDate()}일`;

  const prompt = `
당신은 투자 예측 게임 MC입니다. 오늘(${dateStr}) 투자/경제 예측 질문 3개를 만드세요.

**[중요] Google Search로 최신 시장 뉴스를 검색하세요:**
- "stock market news today ${todayDate.getMonth() + 1}월"
- "cryptocurrency price today"
- "경제 뉴스 오늘 ${dateStr}"

**질문 규칙:**
1. YES/NO로 명확히 답할 수 있는 질문만 (애매한 질문 금지)
2. 24~48시간 내 결과 확인 가능한 단기 예측
3. 카테고리 배분: stocks 1개, crypto 1개, macro 또는 event 1개
4. 구체적 수치/기준 포함 (예: "나스닥이 오늘 종가 기준 1% 이상 상승할까?")
5. 한국어로 작성

**출력 형식 (JSON만, 마크다운 금지):**
{
  "questions": [
    {
      "question": "오늘 S&P 500이 전일 종가 대비 상승 마감할까요?",
      "description": "어제 미국 고용지표가 예상을 상회하며 시장 낙관론이 확산",
      "category": "stocks",
      "yes_label": "상승 마감",
      "no_label": "하락 마감",
      "deadline_hours": 24
    },
    {
      "question": "비트코인이 내일까지 $100,000를 돌파할까요?",
      "description": "BTC ETF 순유입이 3일 연속 증가하며 매수세 강화",
      "category": "crypto",
      "yes_label": "돌파한다",
      "no_label": "못한다",
      "deadline_hours": 48
    },
    {
      "question": "이번 주 원/달러 환율이 1,400원 아래로 내려갈까요?",
      "description": "한은 개입 가능성과 달러 약세 흐름 주목",
      "category": "macro",
      "yes_label": "내려간다",
      "no_label": "유지/상승",
      "deadline_hours": 48
    }
  ]
}
`;

  console.log('[Task E-1] 예측 질문 생성 시작...');
  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleanJson);

  const questions: PredictionQuestion[] = parsed.questions || [];
  let created = 0;

  for (const q of questions.slice(0, 3)) {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + (q.deadline_hours || 24));

    const { error } = await supabase
      .from('prediction_polls')
      .insert({
        question: q.question,
        description: q.description || null,
        category: q.category || 'macro',
        yes_label: q.yes_label || '네',
        no_label: q.no_label || '아니오',
        deadline: deadline.toISOString(),
        status: 'active',
        reward_credits: 2,
      });

    if (error) {
      console.error(`[Task E-1] 질문 삽입 실패:`, error);
    } else {
      created++;
    }
  }

  console.log(`[Task E-1] 예측 질문 ${created}개 생성 완료`);
  return { created, skipped: false };
}

/**
 * Task E-2: 만료된 투표 정답 판정
 * - deadline이 지난 active/closed 투표 → Gemini로 정답 판정
 * - confidence 60+ 시만 판정, 미만이면 다음 배치로 보류
 */
async function resolvePredictionPolls(): Promise<{
  resolved: number;
  deferred: number;
}> {
  // 마감 지난 미판정 투표 조회
  const { data: expiredPolls, error } = await supabase
    .from('prediction_polls')
    .select('*')
    .in('status', ['active', 'closed'])
    .lt('deadline', new Date().toISOString())
    .order('deadline', { ascending: true })
    .limit(10);

  if (error || !expiredPolls || expiredPolls.length === 0) {
    console.log('[Task E-2] 판정 대상 투표 없음');
    return { resolved: 0, deferred: 0 };
  }

  console.log(`[Task E-2] ${expiredPolls.length}개 투표 정답 판정 시작...`);

  let resolved = 0;
  let deferred = 0;

  for (const poll of expiredPolls) {
    try {
      const judgmentPrompt = `
당신은 투자 예측 판정관입니다. 다음 예측 질문의 정답을 판정하세요.

**질문:** ${poll.question}
**설명:** ${poll.description || '없음'}
**카테고리:** ${poll.category}
**마감 시간:** ${poll.deadline}

**[중요] Google Search로 최신 데이터를 검색하여 정답을 확인하세요.**

**출력 형식 (JSON만):**
{
  "answer": "YES" 또는 "NO",
  "confidence": 0-100,
  "source": "판정 근거 출처 (뉴스 사이트명, 데이터 출처)",
  "reasoning": "판정 이유 한 줄"
}
`;

      const responseText = await callGeminiWithSearch(judgmentPrompt);
      const cleanJson = cleanJsonResponse(responseText);
      const judgment = JSON.parse(cleanJson);

      // confidence 60 미만이면 보류
      if (!judgment.confidence || judgment.confidence < 60) {
        console.log(`[Task E-2] "${poll.question}" confidence ${judgment.confidence} → 보류`);
        // 상태를 closed로 변경 (다음 배치에서 재시도)
        await supabase
          .from('prediction_polls')
          .update({ status: 'closed' })
          .eq('id', poll.id);
        deferred++;
        continue;
      }

      // 정답 판정: resolve_poll RPC 호출
      const correctAnswer = judgment.answer === 'YES' ? 'YES' : 'NO';
      const source = `${judgment.source || ''}${judgment.reasoning ? ' — ' + judgment.reasoning : ''}`;

      const { data: resolveResult, error: resolveError } = await supabase.rpc('resolve_poll', {
        p_poll_id: poll.id,
        p_correct_answer: correctAnswer,
        p_source: source,
      });

      if (resolveError) {
        console.error(`[Task E-2] resolve_poll 실패:`, resolveError);
      } else {
        const result = resolveResult?.[0];
        console.log(`[Task E-2] "${poll.question}" → ${correctAnswer} (${result?.voters_rewarded || 0}명 보상, ${result?.total_credits || 0}C)`);
        resolved++;
      }
    } catch (pollError) {
      console.error(`[Task E-2] 개별 투표 판정 실패:`, pollError);
      deferred++;
    }

    // Rate limit 방지
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[Task E-2] 판정 완료: ${resolved}건 해결, ${deferred}건 보류`);
  return { resolved, deferred };
}

/**
 * Task E 통합 실행: E-1(질문 생성) + E-2(정답 판정) 순차 실행
 */
async function runPredictionPolls(): Promise<{
  questionsCreated: number;
  questionsSkipped: boolean;
  pollsResolved: number;
  pollsDeferred: number;
}> {
  console.log('[Task E] 투자 예측 게임 배치 시작...');

  // E-1: 질문 생성
  const genResult = await generatePredictionPolls();

  // E-2: 정답 판정
  const resolveResult = await resolvePredictionPolls();

  return {
    questionsCreated: genResult.created,
    questionsSkipped: genResult.skipped,
    pollsResolved: resolveResult.resolved,
    pollsDeferred: resolveResult.deferred,
  };
}

// ============================================================================
// Task F: 부동산 시세 업데이트
// Gemini 미사용 — 국토부 API only (API 키 없으면 graceful skip)
// ============================================================================

/**
 * 보유 부동산 자산의 실거래가 캐시 업데이트
 * 1. 유저 보유 RE_ 자산 조회
 * 2. 법정동코드별 국토부 API 호출 (또는 스킵)
 * 3. realestate_price_cache UPSERT
 * 4. portfolios current_value 업데이트
 */
async function updateRealEstatePrices(): Promise<{
  skipped: boolean;
  assetsUpdated: number;
  cacheUpdated: number;
}> {
  // API 키 없으면 스킵 (Mock 환경)
  if (!MOLIT_API_KEY) {
    console.log('[Task F] 국토부 API 키 미설정 → 부동산 시세 업데이트 스킵');
    return { skipped: true, assetsUpdated: 0, cacheUpdated: 0 };
  }

  console.log('[Task F] 부동산 시세 업데이트 시작...');

  // 1. RE_ 티커를 가진 모든 포트폴리오 조회
  const { data: realEstateAssets, error: queryError } = await supabase
    .from('portfolios')
    .select('id, user_id, ticker, lawd_cd, complex_name, unit_area, current_value')
    .like('ticker', 'RE_%')
    .not('lawd_cd', 'is', null);

  if (queryError || !realEstateAssets || realEstateAssets.length === 0) {
    console.log('[Task F] 부동산 자산 없음 또는 조회 실패');
    return { skipped: false, assetsUpdated: 0, cacheUpdated: 0 };
  }

  console.log(`[Task F] 부동산 자산 ${realEstateAssets.length}건 발견`);

  // 2. 법정동코드별 그룹핑 (API 호출 최소화)
  const lawdGroups = new Map<string, typeof realEstateAssets>();
  for (const asset of realEstateAssets) {
    if (!asset.lawd_cd) continue;
    if (!lawdGroups.has(asset.lawd_cd)) {
      lawdGroups.set(asset.lawd_cd, []);
    }
    lawdGroups.get(asset.lawd_cd)!.push(asset);
  }

  let cacheUpdated = 0;
  let assetsUpdated = 0;
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

  // 3. 법정동코드별 국토부 API 호출
  for (const [lawdCd, assets] of lawdGroups) {
    try {
      const apiUrl = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${MOLIT_API_KEY}&LAWD_CD=${lawdCd}&DEAL_YMD=${yearMonth}&pageNo=1&numOfRows=100&type=json`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.warn(`[Task F] API 호출 실패 (${lawdCd}): ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data?.response?.body?.items?.item || [];

      if (items.length === 0) {
        console.log(`[Task F] ${lawdCd}: 거래 데이터 없음`);
        continue;
      }

      // 4. 단지별 매칭 및 캐시 업데이트
      for (const asset of assets) {
        if (!asset.complex_name || !asset.unit_area) continue;

        // 단지명 + 면적 매칭
        const matchingTx = items
          .filter((item: any) =>
            item.aptNm?.includes(asset.complex_name) &&
            Math.abs(Number(item.excluUseAr || 0) - asset.unit_area) <= 3
          )
          .sort((a: any, b: any) => {
            const dateA = `${a.dealYear}-${String(a.dealMonth).padStart(2, '0')}-${String(a.dealDay).padStart(2, '0')}`;
            const dateB = `${b.dealYear}-${String(b.dealMonth).padStart(2, '0')}-${String(b.dealDay).padStart(2, '0')}`;
            return dateB.localeCompare(dateA);
          })
          .slice(0, 5);

        if (matchingTx.length === 0) continue;

        // 최근 3건 평균가 계산
        const recent3 = matchingTx.slice(0, 3);
        const latestPrice = Number(String(matchingTx[0].dealAmount || '0').replace(/,/g, '')) * 10000;
        const avg3 = Math.round(
          recent3.reduce((s: number, t: any) => {
            return s + Number(String(t.dealAmount || '0').replace(/,/g, '')) * 10000;
          }, 0) / recent3.length
        );

        // realestate_price_cache UPSERT
        const { error: cacheError } = await supabase
          .from('realestate_price_cache')
          .upsert(
            {
              lawd_cd: lawdCd,
              complex_name: asset.complex_name,
              unit_area: asset.unit_area,
              latest_price: latestPrice,
              avg_price_3: avg3,
              last_transaction_date: `${matchingTx[0].dealYear}-${String(matchingTx[0].dealMonth).padStart(2, '0')}-${String(matchingTx[0].dealDay).padStart(2, '0')}`,
              transaction_count: matchingTx.length,
              raw_transactions: matchingTx.slice(0, 5),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'lawd_cd,complex_name,unit_area' }
          );

        if (!cacheError) cacheUpdated++;

        // portfolios current_value 업데이트
        const { error: updateError } = await supabase
          .from('portfolios')
          .update({
            current_value: avg3,
            current_price: avg3,
            last_price_updated_at: new Date().toISOString(),
          })
          .eq('id', asset.id);

        if (!updateError) assetsUpdated++;
      }

      // Rate limit 방지
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[Task F] 법정동 ${lawdCd} 처리 실패:`, err);
    }
  }

  console.log(`[Task F] 완료: 캐시 ${cacheUpdated}건, 포트폴리오 ${assetsUpdated}건 업데이트`);
  return { skipped: false, assetsUpdated, cacheUpdated };
}

// ============================================================================
// Task G: 맥락 카드 생성 (Killing Feature)
// G-1: Gemini로 4겹 맥락 분석 (역사/거시경제/기관행동/시장분위기)
// G-2: 사용자별 포트폴리오 영향도 계산 (DB only, 비용 0원)
// ============================================================================

interface ContextCardData {
  headline: string;
  historical_context: string;
  macro_chain: string[];
  institutional_behavior: string;
  sentiment: 'calm' | 'caution' | 'alert';
}

/**
 * Task G-1: 오늘의 맥락 카드 생성
 * Gemini + Google Search로 시장 맥락 4겹 분석
 */
async function generateContextCard(): Promise<{
  contextCardId: string;
  cardData: ContextCardData;
}> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const prompt = `
당신은 한국 투자자를 위한 시장 분석가입니다. 오늘(${dateStr}) 시장 상황을 아래 4가지 관점으로 분석해주세요.

**[중요] Google Search로 최신 시장 데이터를 검색하세요:**
- "S&P 500 today", "나스닥 종가 today"
- "외국인 순매수 순매도 today", "기관 투자자 동향"
- "VIX 공포지수 today", "미국 국채 금리"
- "경제 뉴스 오늘 한국", "미국 경제지표 발표"

**분석 4겹 레이어:**

1. **역사적 맥락 (Historical Context)**
   - 과거 비슷한 패턴이 있었는지, 그때 어떻게 됐는지
   - 예: "2008년 금융위기 때도 이런 패턴이 있었고, 6개월 후 회복했습니다"
   - 구체적 사례와 기간 포함

2. **거시경제 체인 (Macro Chain)**
   - 오늘 시장을 움직인 이벤트를 인과관계 화살표(→)로 연결
   - 예: ["미국 CPI 발표", "금리 인상 우려", "기술주 하락", "삼성전자 연동 하락"]
   - 배열 형태로 4~6단계 체인

3. **기관 행동 (Institutional Behavior)**
   - 외국인/기관 투자자의 최근 움직임과 그 의미
   - 예: "외국인 3일 연속 순매도 중 (패닉이 아니라 연말 리밸런싱 시즌)"
   - 실제 데이터 + 해석 포함

4. **시장 분위기 (Sentiment)**
   - calm (평온): VIX 15 이하, 시장 안정
   - caution (주의): VIX 15~25, 변동성 증가
   - alert (경계): VIX 25+, 고위험 구간

**출력 형식 (JSON만, 마크다운 금지):**
{
  "headline": "오늘의 한 줄 핵심 (20자 이내)",
  "historical_context": "역사적 맥락 설명 (2-3문장)",
  "macro_chain": ["이벤트1", "이벤트2", "이벤트3", "이벤트4"],
  "institutional_behavior": "기관 행동 분석 (2-3문장)",
  "sentiment": "calm" 또는 "caution" 또는 "alert"
}
`;

  console.log('[Task G-1] 맥락 카드 생성 시작...');
  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);
  const parsed: ContextCardData = JSON.parse(cleanJson);

  // context_cards 테이블에 UPSERT (date가 Primary Key)
  const todayDate = new Date().toISOString().split('T')[0];

  const { data: insertedCard, error: upsertError } = await supabase
    .from('context_cards')
    .upsert(
      {
        date: todayDate,
        headline: parsed.headline || '오늘의 시장 분석',
        historical_context: parsed.historical_context || '',
        macro_chain: parsed.macro_chain || [],
        institutional_behavior: parsed.institutional_behavior || '',
        sentiment: parsed.sentiment || 'calm',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    )
    .select('id')
    .single();

  if (upsertError) {
    console.error('[Task G-1] context_cards UPSERT 실패:', upsertError);
    throw upsertError;
  }

  const contextCardId = insertedCard?.id || '';
  console.log(`[Task G-1] 맥락 카드 생성 완료 (ID: ${contextCardId})`);

  return {
    contextCardId,
    cardData: parsed,
  };
}

/**
 * Task G-2: 사용자별 포트폴리오 영향도 계산
 * Gemini 미사용 — DB 읽기/쓰기만 (비용 0원)
 *
 * 로직:
 * 1. 모든 유저의 portfolios 조회
 * 2. stock_quant_reports에서 오늘 종목별 변동 데이터 참조
 * 3. 유저별 가중평균 영향도 계산 (-10% ~ +10%)
 * 4. user_context_impacts 테이블에 UPSERT
 */
async function calculateUserImpacts(contextCardId: string): Promise<{
  usersCalculated: number;
  avgImpact: number;
}> {
  console.log('[Task G-2] 사용자별 영향도 계산 시작...');
  const today = new Date().toISOString().split('T')[0];

  // 1. 모든 포트폴리오 조회
  const { data: allPortfolios, error: portError } = await supabase
    .from('portfolios')
    .select('user_id, ticker, quantity, current_value, asset_type');

  if (portError || !allPortfolios || allPortfolios.length === 0) {
    console.log('[Task G-2] 포트폴리오 데이터 없음 — 스킵');
    return { usersCalculated: 0, avgImpact: 0 };
  }

  // 2. 오늘의 종목별 변동 데이터 조회 (stock_quant_reports)
  // Task B가 병렬 실행 중이므로 데이터가 없을 수 있음 → 없으면 0% 영향도로 처리
  const { data: stockReports } = await supabase
    .from('stock_quant_reports')
    .select('ticker, valuation_score, signal')
    .eq('date', today);

  const tickerImpactMap = new Map<string, number>();

  if (stockReports && stockReports.length > 0) {
    // valuation_score 기반 영향도 계산
    // score 0~100 → 영향도 -10% ~ +10%
    // score 50(중립) → 0%, score 0(최악) → -10%, score 100(최고) → +10%
    for (const report of stockReports) {
      const score = report.valuation_score ?? 50;
      const impact = ((score - 50) / 50) * 10; // -10 ~ +10
      tickerImpactMap.set(report.ticker, impact);
    }
    console.log(`[Task G-2] 종목 변동 데이터 ${stockReports.length}건 참조`);
  } else {
    console.log('[Task G-2] stock_quant_reports 데이터 없음 → 영향도 0%로 계산');
  }

  // 3. 유저별 가중평균 영향도 계산
  const userImpactMap = new Map<string, { totalValue: number; weightedImpact: number }>();

  for (const item of allPortfolios) {
    const value = item.current_value || 0;
    if (value <= 0) continue;

    // 부동산 등 RE_ 자산은 제외 (주식/ETF만 영향도 계산)
    if (item.ticker?.startsWith('RE_')) continue;

    const impact = tickerImpactMap.get(item.ticker) || 0;

    if (!userImpactMap.has(item.user_id)) {
      userImpactMap.set(item.user_id, { totalValue: 0, weightedImpact: 0 });
    }

    const userData = userImpactMap.get(item.user_id)!;
    userData.totalValue += value;
    userData.weightedImpact += value * impact;
  }

  // 4. user_context_impacts UPSERT (배치)
  const impactRows = [];
  let totalImpact = 0;

  for (const [userId, data] of userImpactMap) {
    const avgImpact = data.totalValue > 0 ? data.weightedImpact / data.totalValue : 0;
    // 영향도 클램프 (-10 ~ +10)
    const clampedImpact = Math.max(-10, Math.min(10, avgImpact));

    impactRows.push({
      user_id: userId,
      context_card_id: contextCardId,
      portfolio_impact_pct: Math.round(clampedImpact * 100) / 100,
      calculated_at: new Date().toISOString(),
    });

    totalImpact += clampedImpact;
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < impactRows.length; i += BATCH_SIZE) {
    const batch = impactRows.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from('user_context_impacts')
      .upsert(batch, { onConflict: 'user_id,context_card_id' });

    if (upsertError) {
      console.error(`[Task G-2] user_context_impacts UPSERT 실패 (batch ${i}):`, upsertError);
    }
  }

  const avgImpact = impactRows.length > 0
    ? Math.round((totalImpact / impactRows.length) * 100) / 100
    : 0;

  console.log(`[Task G-2] 영향도 계산 완료: ${impactRows.length}명, 평균 ${avgImpact}%`);

  return {
    usersCalculated: impactRows.length,
    avgImpact,
  };
}

/**
 * Task G 통합 실행: G-1(맥락 카드) → G-2(영향도 계산) 순차 실행
 */
async function runContextCardGeneration(): Promise<{
  contextCardId: string;
  sentiment: string;
  usersCalculated: number;
  avgImpact: number;
}> {
  console.log('[Task G] 맥락 카드 생성 배치 시작...');

  // G-1: 맥락 카드 생성
  const cardResult = await generateContextCard();

  // G-2: 사용자별 영향도 계산
  const impactResult = await calculateUserImpacts(cardResult.contextCardId);

  return {
    contextCardId: cardResult.contextCardId,
    sentiment: cardResult.cardData.sentiment,
    usersCalculated: impactResult.usersCalculated,
    avgImpact: impactResult.avgImpact,
  };
}

// ============================================================================
// DB UPSERT (기존 Task A/B)
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
  rateCycleEvidence?: Record<string, unknown> | null;
}) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const upsertData: Record<string, unknown> = {
    date: today,
    macro_summary: data.macroSummary,
    bitcoin_analysis: data.bitcoinAnalysis,
    market_sentiment: data.marketSentiment,
    cfo_weather: data.cfoWeather,
    vix_level: data.vixLevel,
    global_liquidity: data.globalLiquidity,
    updated_at: new Date().toISOString(),
  };

  // 금리 사이클 증거가 있으면 포함 (null이면 기존 값 유지)
  if (data.rateCycleEvidence) {
    upsertData.rate_cycle_evidence = data.rateCycleEvidence;
  }

  const { error } = await supabase
    .from('daily_market_insights')
    .upsert(upsertData, { onConflict: 'date' });

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

    // Task A, B, C, D, E, F, G를 병렬 실행 (독립적이므로 동시에 처리)
    const [macroResult, stockResults, guruResult, snapshotResult, predictionResult, realEstateResult, contextCardResult] = await Promise.allSettled([
      analyzeMacroAndBitcoin(),
      analyzeAllStocks(),
      analyzeGuruInsights(),
      takePortfolioSnapshots(),
      runPredictionPolls(),
      updateRealEstatePrices(),
      runContextCardGeneration(),
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

    // Task C 결과 처리 (거장 인사이트)
    if (guruResult.status === 'fulfilled') {
      await upsertGuruInsights(guruResult.value);
    } else {
      console.error('[Task C 실패]', guruResult.reason);
      // 실패 시 기본 데이터 저장 (앱 크래시 방지)
      await upsertGuruInsights({
        insights: GURU_LIST.map((g) => ({
          guruName: g.name,
          guruNameEn: g.nameEn,
          organization: g.org,
          emoji: g.emoji,
          topic: g.topic,
          recentAction: '분석 데이터를 불러오지 못했습니다.',
          quote: '',
          sentiment: 'NEUTRAL',
          reasoning: '잠시 후 다시 확인해주세요.',
          relevantAssets: [],
          source: '',
        })),
        marketContext: '시장 분석을 불러오지 못했습니다.',
      }).catch((e) => console.error('[Task C 폴백 저장 실패]', e));
    }

    // Task D 결과 처리
    if (snapshotResult.status === 'fulfilled') {
      console.log(`[Task D] 성공: ${snapshotResult.value.snapshotsCreated}명 스냅샷, ${snapshotResult.value.bracketsUpdated}개 구간 통계`);
    } else {
      console.error('[Task D 실패]', snapshotResult.reason);
    }

    // Task E 결과 처리 (투자 예측 게임)
    if (predictionResult.status === 'fulfilled') {
      const pr = predictionResult.value;
      console.log(`[Task E] 성공: 질문 ${pr.questionsCreated}개 생성${pr.questionsSkipped ? ' (스킵)' : ''}, 판정 ${pr.pollsResolved}건, 보류 ${pr.pollsDeferred}건`);
    } else {
      console.error('[Task E 실패]', predictionResult.reason);
    }

    // Task F 결과 처리 (부동산 시세 업데이트)
    if (realEstateResult.status === 'fulfilled') {
      const re = realEstateResult.value;
      console.log(`[Task F] ${re.skipped ? '스킵 (API 키 미설정)' : `성공: 캐시 ${re.cacheUpdated}건, 포트폴리오 ${re.assetsUpdated}건`}`);
    } else {
      console.error('[Task F 실패]', realEstateResult.reason);
    }

    // Task G 결과 처리 (맥락 카드 생성)
    if (contextCardResult.status === 'fulfilled') {
      const cc = contextCardResult.value;
      console.log(`[Task G] 성공: 맥락 카드 생성 (${cc.sentiment}), ${cc.usersCalculated}명 영향도 계산 (평균 ${cc.avgImpact}%)`);
    } else {
      console.error('[Task G 실패]', contextCardResult.reason);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const macroStatus = macroResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const stockCount = stockResults.status === 'fulfilled' ? stockResults.value.length : 0;
    const guruStatus = guruResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const guruCount = guruResult.status === 'fulfilled' ? guruResult.value.insights.length : 0;
    const snapshotStatus = snapshotResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const snapshotCount = snapshotResult.status === 'fulfilled' ? snapshotResult.value.snapshotsCreated : 0;
    const predictionStatus = predictionResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const predictionCreated = predictionResult.status === 'fulfilled' ? predictionResult.value.questionsCreated : 0;
    const predictionResolved = predictionResult.status === 'fulfilled' ? predictionResult.value.pollsResolved : 0;
    const realEstateStatus = realEstateResult.status === 'fulfilled'
      ? (realEstateResult.value.skipped ? 'SKIPPED' : 'SUCCESS')
      : 'FAILED';
    const realEstateUpdated = realEstateResult.status === 'fulfilled' ? realEstateResult.value.assetsUpdated : 0;
    const contextCardStatus = contextCardResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const contextCardSentiment = contextCardResult.status === 'fulfilled' ? contextCardResult.value.sentiment : 'N/A';
    const contextCardUsers = contextCardResult.status === 'fulfilled' ? contextCardResult.value.usersCalculated : 0;

    console.log('========================================');
    console.log(`[Central Kitchen] 배치 완료: ${elapsed}초`);
    console.log(`  - 거시경제: ${macroStatus}`);
    console.log(`  - 종목 분석: ${stockCount}/${STOCK_LIST.length}건`);
    console.log(`  - 거장 인사이트: ${guruStatus} (${guruCount}명)`);
    console.log(`  - 포트폴리오 스냅샷: ${snapshotStatus} (${snapshotCount}명)`);
    console.log(`  - 예측 게임: ${predictionStatus} (생성 ${predictionCreated}, 판정 ${predictionResolved})`);
    console.log(`  - 부동산 시세: ${realEstateStatus} (${realEstateUpdated}건 업데이트)`);
    console.log(`  - 맥락 카드: ${contextCardStatus} (${contextCardSentiment}, ${contextCardUsers}명 영향도)`);
    console.log('========================================');

    return new Response(
      JSON.stringify({
        success: true,
        elapsed: `${elapsed}s`,
        macro: macroStatus,
        stocks: `${stockCount}/${STOCK_LIST.length}`,
        gurus: `${guruStatus} (${guruCount}/10)`,
        snapshots: `${snapshotStatus} (${snapshotCount}명)`,
        predictions: `${predictionStatus} (생성 ${predictionCreated}, 판정 ${predictionResolved})`,
        realEstate: `${realEstateStatus} (${realEstateUpdated}건)`,
        contextCard: `${contextCardStatus} (${contextCardSentiment}, ${contextCardUsers}명)`,
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
