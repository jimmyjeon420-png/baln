// ============================================================================
// Task K: Polymarket 예측 시장 자동 수집 파이프라인
//
// [역할]
// Polymarket Gamma API에서 활성 예측 시장 데이터를 수집하여
// ops_pm_predictions 테이블에 저장 → 앱의 "예측 시장" 탭에 표시
//
// [흐름]
// 1. Gamma API → 활성 시장 100건 조회 (거래량 순)
// 2. 사전 분류: 키워드 기반 stock/crypto/macro 태깅 (AI 비용 절감)
// 3. Gemini 배치 처리 (20건씩): 한국어 번역 + 카테고리 확정 + 영향 분석
// 4. DB UPSERT (polymarket_id 기준 중복 방지)
// 5. 오래된 데이터 정리 (7일 이상)
//
// [갱신 주기]
// 3시간 간격 (맥락카드와 동일: 0 */3 * * * UTC)
// ============================================================================

import {
  supabase,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  STOCK_LIST,
  sleep,
  logTaskResult,
} from './_shared.ts';

// ============================================================================
// 결과 인터페이스
// ============================================================================

export interface PolymarketCollectionResult {
  totalFetched: number;
  totalProcessed: number;
  totalUpserted: number;
  totalCleaned: number;
  aiProcessed: number;
  fallbackProcessed: number;
  categoryBreakdown: Record<string, number>;
  upsertErrorSample?: string[];
}

// ============================================================================
// 상수
// ============================================================================

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
const BATCH_SIZE = 20;
const MAX_MARKETS = 100;
const STALE_DAYS = 7; // 7일 이상 된 데이터 삭제

// ============================================================================
// 사전 분류 키워드 (AI 호출 전 기계적 분류)
// ============================================================================

const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'sol',
  'ripple', 'xrp', 'dogecoin', 'doge', 'blockchain', 'defi',
  'nft', 'altcoin', 'stablecoin', 'usdt', 'usdc', 'binance',
  'coinbase', 'mining', 'halving', 'memecoin', 'token',
];

const STOCK_KEYWORDS = [
  'stock', 'nasdaq', 's&p', 'dow jones', 'earnings', 'ipo',
  'tesla', 'apple', 'nvidia', 'microsoft', 'amazon', 'google',
  'meta', 'samsung', 'tsmc', 'berkshire', 'market cap',
  'dividend', 'share price', 'stock market', 'wall street',
  'nyse', 'index fund', 'etf',
];

const MACRO_KEYWORDS = [
  'fed', 'interest rate', 'inflation', 'gdp', 'recession',
  'unemployment', 'cpi', 'pce', 'fomc', 'treasury', 'bond',
  'tariff', 'trade war', 'sanctions', 'oil price', 'gold',
  'dollar', 'euro', 'yen', 'currency', 'central bank',
  'fiscal', 'monetary', 'debt ceiling', 'government shutdown',
  'economic', 'rate cut', 'rate hike',
];

type PredictionCategory = 'stock' | 'crypto' | 'macro';

// ============================================================================
// Gamma API 응답 타입
// ============================================================================

interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  markets: GammaMarket[];
}

interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomePrices: string; // JSON string: '["0.65","0.35"]'
  volume: string;
  volume24hr: string;
  active: boolean;
  closed: boolean;
  groupItemTitle?: string;
}

// ============================================================================
// Phase 1: Gamma API에서 활성 시장 데이터 가져오기
// ============================================================================

async function fetchPolymarketEvents(): Promise<GammaEvent[]> {
  console.log('[Task K] Gamma API 호출 시작...');

  const url = `${GAMMA_API_BASE}/events?limit=${MAX_MARKETS}&active=true&closed=false&order=volume24hr&ascending=false`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gamma API 에러 (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const events: GammaEvent[] = await response.json();
    console.log(`[Task K] Gamma API: ${events.length}개 이벤트 수신`);
    return events;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Gamma API 30초 타임아웃');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Phase 2: 이벤트 → 플랫 마켓 목록 변환 + 사전 분류
// ============================================================================

interface ProcessedMarket {
  polymarket_id: string;
  question_en: string;
  slug: string;
  probability: number;
  volume_usd: number;
  volume_24h_usd: number;
  end_date: string | null;
  pre_category: PredictionCategory | null;
}

function flattenAndPreClassify(events: GammaEvent[]): ProcessedMarket[] {
  const markets: ProcessedMarket[] = [];

  for (const event of events) {
    if (!event.markets || event.markets.length === 0) continue;

    for (const market of event.markets) {
      if (market.closed || !market.active) continue;

      // outcomePrices 파싱
      let probability = 0.5;
      try {
        const prices = JSON.parse(market.outcomePrices || '[]');
        if (prices.length >= 1) {
          probability = parseFloat(prices[0]) || 0.5;
        }
      } catch {
        // 파싱 실패 시 기본값 0.5
      }

      const volumeUsd = parseFloat(market.volume || '0');
      const volume24h = parseFloat(market.volume24hr || '0');

      // 거래량이 너무 낮은 시장 필터링 ($1,000 미만)
      if (volumeUsd < 1000) continue;

      const question = market.question || event.title;
      const preCategory = classifyByKeywords(question, event.description || '');

      markets.push({
        polymarket_id: market.id,
        question_en: question,
        slug: market.slug || event.slug,
        probability,
        volume_usd: volumeUsd,
        volume_24h_usd: volume24h,
        end_date: event.endDate || null,
        pre_category: preCategory,
      });
    }
  }

  // 24시간 거래량 순으로 정렬, 상위 MAX_MARKETS개만
  markets.sort((a, b) => b.volume_24h_usd - a.volume_24h_usd);
  return markets.slice(0, MAX_MARKETS);
}

function classifyByKeywords(question: string, description: string): PredictionCategory | null {
  const text = `${question} ${description}`.toLowerCase();

  // 우선순위: crypto > stock > macro (Task J 패턴과 동일)
  for (const kw of CRYPTO_KEYWORDS) {
    if (text.includes(kw)) return 'crypto';
  }
  for (const kw of STOCK_KEYWORDS) {
    if (text.includes(kw)) return 'stock';
  }
  for (const kw of MACRO_KEYWORDS) {
    if (text.includes(kw)) return 'macro';
  }

  return null; // AI가 분류 결정
}

// ============================================================================
// Phase 3: Gemini 배치 처리 — 한국어 번역 + 카테고리 확정 + 영향 분석
// ============================================================================

interface GeminiAnalyzedMarket {
  polymarket_id: string;
  question_ko: string;
  question_en: string;
  category: PredictionCategory;
  probability: number;
  probability_change_24h: number | null;
  volume_usd: number;
  volume_24h_usd: number;
  whale_signal: any | null;
  related_tickers: string[];
  impact_analysis: any | null;
  yes_label: string;
  no_label: string;
  summary_ko: string | null;
  end_date: string | null;
  slug: string;
}

async function callGeminiDirect(prompt: string): Promise<string> {
  await sleep(1000); // Rate limiting
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 에러 (${response.status}): ${errorText.slice(0, 300)}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts) {
      throw new Error('Gemini API 빈 응답');
    }

    return data.candidates[0].content.parts.map((p: any) => p.text || '').join('');
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Gemini API 90초 타임아웃');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// STOCK_LIST에서 관련 종목 매핑용 티커 목록 생성
function getTickerReference(): string {
  return STOCK_LIST.map(s => `${s.ticker}(${s.name})`).join(', ');
}

async function analyzeWithGemini(
  batch: ProcessedMarket[]
): Promise<GeminiAnalyzedMarket[]> {
  const tickerRef = getTickerReference();

  const marketsForPrompt = batch.map((m, i) => ({
    idx: i,
    id: m.polymarket_id,
    q: m.question_en,
    prob: m.probability,
    vol: m.volume_usd,
    vol24h: m.volume_24h_usd,
    pre_cat: m.pre_category,
    end: m.end_date,
    slug: m.slug,
  }));

  const prompt = `당신은 금융 예측 시장 전문 분석가입니다. Polymarket 예측 시장 데이터를 한국 투자자를 위해 분석하세요.

## 입력 데이터
${JSON.stringify(marketsForPrompt)}

## 분석 가능 종목
${tickerRef}

## 각 시장에 대해 반환할 JSON 배열:
[
  {
    "idx": 0,
    "question_ko": "한국어로 자연스럽게 번역된 질문 (투자자가 이해하기 쉽게)",
    "category": "stock|crypto|macro 중 하나 (pre_cat이 있으면 참고하되 필요시 수정)",
    "related_tickers": ["관련 종목 티커 배열 (위 종목 목록에서 매칭, 없으면 빈 배열)"],
    "impact_analysis": {
      "TICKER": {
        "direction": "up|down|neutral",
        "magnitude": "+5~10% 형태의 예상 영향",
        "reason_ko": "한국어로 영향 이유 설명"
      }
    },
    "yes_label": "YES 라벨 한국어 (예: '오른다', '인하한다')",
    "no_label": "NO 라벨 한국어 (예: '내린다', '동결한다')",
    "summary_ko": "한국 투자자에게 중요한 이유를 1~2문장으로 (포트폴리오 영향 관점)"
  }
]

## 규칙:
- category는 반드시 "stock", "crypto", "macro" 중 하나
- pre_cat이 null이면 질문 내용으로 판단
- 금융/투자와 무관한 시장(정치 예측, 스포츠 등)은 category를 "macro"로
- related_tickers는 실제 영향받는 종목만 (무관하면 빈 배열)
- impact_analysis는 related_tickers가 있을 때만 작성
- summary_ko는 "이 예측이 실현되면 당신의 포트폴리오에 어떤 영향?" 관점`;

  const responseText = await callGeminiDirect(prompt);
  const parsed = JSON.parse(responseText);

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini 응답이 배열이 아님');
  }

  // Gemini 응답을 원본 데이터와 병합
  const results: GeminiAnalyzedMarket[] = [];
  for (const item of parsed) {
    const idx = item.idx;
    if (idx === undefined || idx < 0 || idx >= batch.length) continue;

    const original = batch[idx];
    const category = validateCategory(item.category, original.pre_category);

    results.push({
      polymarket_id: original.polymarket_id,
      question_ko: item.question_ko || original.question_en,
      question_en: original.question_en,
      category,
      probability: original.probability,
      probability_change_24h: null, // Gamma API에서 직접 제공하지 않음
      volume_usd: original.volume_usd,
      volume_24h_usd: original.volume_24h_usd,
      whale_signal: null, // 향후 Polymarket CLOB API로 확장 가능
      related_tickers: Array.isArray(item.related_tickers) ? item.related_tickers : [],
      impact_analysis: item.impact_analysis || null,
      yes_label: item.yes_label || 'YES',
      no_label: item.no_label || 'NO',
      summary_ko: item.summary_ko || null,
      end_date: original.end_date,
      slug: original.slug,
    });
  }

  return results;
}

function validateCategory(
  aiCategory: string | undefined,
  preCategory: PredictionCategory | null
): PredictionCategory {
  const validCategories: PredictionCategory[] = ['stock', 'crypto', 'macro'];
  if (aiCategory && validCategories.includes(aiCategory as PredictionCategory)) {
    return aiCategory as PredictionCategory;
  }
  return preCategory || 'macro'; // 기본값: macro
}

// ============================================================================
// Phase 3b: Gemini 실패 시 폴백 (기계적 처리)
// ============================================================================

function createFallbackResult(market: ProcessedMarket): GeminiAnalyzedMarket {
  const category = market.pre_category || 'macro';

  // 간단한 기계적 한국어 번역 시도 (AI 없이)
  let questionKo = market.question_en;
  // 영어 질문 그대로 사용 (번역 실패보다 원문이 나음)

  return {
    polymarket_id: market.polymarket_id,
    question_ko: questionKo,
    question_en: market.question_en,
    category,
    probability: market.probability,
    probability_change_24h: null,
    volume_usd: market.volume_usd,
    volume_24h_usd: market.volume_24h_usd,
    whale_signal: null,
    related_tickers: [],
    impact_analysis: null,
    yes_label: 'YES',
    no_label: 'NO',
    summary_ko: null,
    end_date: market.end_date,
    slug: market.slug,
  };
}

// ============================================================================
// Phase 4: DB UPSERT
// ============================================================================

async function upsertPredictions(
  predictions: GeminiAnalyzedMarket[]
): Promise<{ upserted: number; errors: string[] }> {
  if (predictions.length === 0) return { upserted: 0, errors: [] };

  const rows = predictions.map(p => ({
    polymarket_id: p.polymarket_id,
    question_ko: p.question_ko.substring(0, 1000),
    question_en: p.question_en.substring(0, 1000),
    category: p.category,
    probability: p.probability,
    probability_change_24h: p.probability_change_24h,
    volume_usd: p.volume_usd,
    volume_24h_usd: p.volume_24h_usd,
    whale_signal: p.whale_signal,
    related_tickers: p.related_tickers,
    impact_analysis: p.impact_analysis,
    yes_label: p.yes_label,
    no_label: p.no_label,
    summary_ko: p.summary_ko,
    end_date: p.end_date,
    slug: p.slug,
    updated_at: new Date().toISOString(),
  }));

  // 배치 UPSERT 시도
  const { error } = await supabase
    .from('ops_pm_predictions')
    .upsert(rows, { onConflict: 'polymarket_id' });

  if (!error) {
    return { upserted: rows.length, errors: [] };
  }

  console.warn(`[Task K] 배치 UPSERT 실패, row-by-row 복구 시도: ${error.message}`);

  // Row-by-row 복구 (Task J 패턴)
  let upserted = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const { error: rowError } = await supabase
      .from('ops_pm_predictions')
      .upsert(row, { onConflict: 'polymarket_id' });

    if (rowError) {
      if (errors.length < 5) {
        errors.push(`${row.polymarket_id}: ${rowError.message}`);
      }
    } else {
      upserted++;
    }
  }

  return { upserted, errors };
}

// ============================================================================
// Phase 5: 오래된 데이터 정리
// ============================================================================

async function cleanupOldPredictions(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - STALE_DAYS);

  const { data, error } = await supabase
    .from('ops_pm_predictions')
    .delete()
    .lt('updated_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.warn(`[Task K] 정리 실패: ${error.message}`);
    return 0;
  }

  const deleted = data?.length || 0;
  if (deleted > 0) {
    console.log(`[Task K] ${deleted}건 오래된 데이터 삭제 (${STALE_DAYS}일 이상)`);
  }
  return deleted;
}

// ============================================================================
// 메인 함수
// ============================================================================

export async function runPolymarketCollection(): Promise<PolymarketCollectionResult> {
  const startTime = Date.now();
  console.log('[Task K] Polymarket 예측 시장 수집 시작...');

  try {
    // Phase 1: Gamma API에서 이벤트 가져오기
    const events = await fetchPolymarketEvents();
    if (events.length === 0) {
      console.log('[Task K] Gamma API에서 이벤트 0건 — 스킵');
      return {
        totalFetched: 0,
        totalProcessed: 0,
        totalUpserted: 0,
        totalCleaned: 0,
        aiProcessed: 0,
        fallbackProcessed: 0,
        categoryBreakdown: {},
      };
    }

    // Phase 2: 플랫 마켓 목록 변환 + 사전 분류
    const markets = flattenAndPreClassify(events);
    console.log(`[Task K] 사전 분류 완료: ${markets.length}개 시장 (이벤트 ${events.length}개에서)`);

    if (markets.length === 0) {
      console.log('[Task K] 유효한 시장 0건 — 스킵');
      return {
        totalFetched: events.length,
        totalProcessed: 0,
        totalUpserted: 0,
        totalCleaned: 0,
        aiProcessed: 0,
        fallbackProcessed: 0,
        categoryBreakdown: {},
      };
    }

    // Phase 3: Gemini 배치 처리
    const allResults: GeminiAnalyzedMarket[] = [];
    let aiProcessed = 0;
    let fallbackProcessed = 0;

    for (let i = 0; i < markets.length; i += BATCH_SIZE) {
      const batch = markets.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(markets.length / BATCH_SIZE);

      console.log(`[Task K] Gemini 배치 ${batchNum}/${totalBatches} (${batch.length}건)...`);

      try {
        const analyzed = await analyzeWithGemini(batch);
        allResults.push(...analyzed);
        aiProcessed += analyzed.length;

        // 배치에서 누락된 항목은 폴백 처리
        const analyzedIds = new Set(analyzed.map(a => a.polymarket_id));
        for (const market of batch) {
          if (!analyzedIds.has(market.polymarket_id)) {
            allResults.push(createFallbackResult(market));
            fallbackProcessed++;
          }
        }
      } catch (err) {
        console.warn(`[Task K] 배치 ${batchNum} Gemini 실패, 폴백 처리:`, err);
        for (const market of batch) {
          allResults.push(createFallbackResult(market));
          fallbackProcessed++;
        }
      }

      // 배치 간 딜레이 (Rate Limit 방지)
      if (i + BATCH_SIZE < markets.length) {
        await sleep(2000);
      }
    }

    console.log(`[Task K] 분석 완료: AI ${aiProcessed}건, 폴백 ${fallbackProcessed}건`);

    // Phase 4: DB UPSERT
    const { upserted, errors } = await upsertPredictions(allResults);
    console.log(`[Task K] DB 저장: ${upserted}/${allResults.length}건 UPSERT 완료`);

    if (errors.length > 0) {
      console.warn(`[Task K] UPSERT 에러 샘플:`, errors.slice(0, 3));
    }

    // Phase 5: 오래된 데이터 정리
    const cleaned = await cleanupOldPredictions();

    // 카테고리별 통계
    const categoryBreakdown: Record<string, number> = {};
    for (const r of allResults) {
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;
    }

    const elapsed = Date.now() - startTime;
    const result: PolymarketCollectionResult = {
      totalFetched: events.length,
      totalProcessed: allResults.length,
      totalUpserted: upserted,
      totalCleaned: cleaned,
      aiProcessed,
      fallbackProcessed,
      categoryBreakdown,
      upsertErrorSample: errors.length > 0 ? errors : undefined,
    };

    await logTaskResult('polymarket_collection', 'SUCCESS', elapsed, result);

    console.log(`[Task K] 완료 (${(elapsed / 1000).toFixed(1)}초) — ` +
      `수집 ${events.length}, 처리 ${allResults.length}, 저장 ${upserted}, 정리 ${cleaned}`);
    console.log(`[Task K] 카테고리: ${JSON.stringify(categoryBreakdown)}`);

    return result;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult(
      'polymarket_collection',
      'FAILED',
      elapsed,
      null,
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}
