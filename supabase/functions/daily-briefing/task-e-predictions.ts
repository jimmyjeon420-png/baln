// @ts-nocheck
// ============================================================================
// Task E-1: 예측 질문 생성 (Prediction Question Generation)
// MAU 성장을 위한 게임형 인게이지먼트 — 습관 루프의 핵심
//
// [습관 루프]
// 맥락 카드 읽기 → 예측 투표 → 복기 & 정답 확인 → 크레딧 보상 → 패닉셀 방지
//
// [목표]
// - Gemini + Google Search로 오늘의 예측 질문 3개 생성
// - 카테고리 자동 배분 (stocks 1개, crypto 1개, macro/event 1개)
// - 24~48시간 내 결과 확인 가능한 단기 예측
// - prediction_polls 테이블 INSERT
// ============================================================================

import {
  supabase,
  callGeminiWithSearch,
  cleanJsonResponse,
  logTaskResult,
  getKSTDate,
  getKSTDateStr,
} from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

type PredictionCategory = 'stocks' | 'crypto' | 'macro';

interface ExistingPollRow {
  id: string;
  category: string | null;
  question: string | null;
}

interface MarketSnapshotPoint {
  key: 'kospi' | 'sp500' | 'nasdaq100' | 'btc' | 'usdkrw';
  label: string;
  symbol: string;
  unit: 'pts' | 'usd' | 'krw';
  price: number | null;
  previousClose: number | null;
}

export interface PredictionQuestion {
  question: string;
  description: string;
  category: string;
  yes_label: string;
  no_label: string;
  deadline_hours: number;  // 마감까지 시간
  difficulty?: string;     // easy / medium / hard
  context_hint?: string;   // 복기 시 보여줄 맥락 힌트
  related_ticker?: string; // 관련 종목 티커
  up_reason?: string;      // [NEW] 오를 근거 (뉴스 기반)
  down_reason?: string;    // [NEW] 내릴 근거 (뉴스 기반)
  generation_source?: 'ai' | 'fallback'; // 내부 판별용
}

export interface PredictionGenerationResult {
  created: number;
  skipped: boolean;
}

const CATEGORY_ORDER: PredictionCategory[] = ['stocks', 'crypto', 'macro'];

function getKSTDayBounds(dateKey: string): { startIso: string; endIso: string } {
  const dayStart = new Date(`${dateKey}T00:00:00+09:00`);
  return {
    startIso: dayStart.toISOString(),
    endIso: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function normalizeCategory(category?: string | null): PredictionCategory {
  const value = (category || '').toLowerCase();
  if (value === 'stocks') return 'stocks';
  if (value === 'crypto') return 'crypto';
  return 'macro';
}

function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function guessStep(value: number): number {
  if (value >= 100000) return 500;
  if (value >= 10000) return 100;
  if (value >= 1000) return 10;
  if (value >= 100) return 1;
  if (value >= 10) return 0.1;
  return 0.01;
}

function roundByStep(value: number, step: number, mode: 'up' | 'down' = 'up'): number {
  if (mode === 'up') return Math.ceil(value / step) * step;
  return Math.floor(value / step) * step;
}

function extractNumericTokens(text: string): number[] {
  const matches = text.match(/\d[\d,]*(?:\.\d+)?/g) || [];
  return matches
    .map((raw) => Number(raw.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function inferDirection(question: string): 'up' | 'down' | 'neutral' {
  const q = question.toLowerCase();
  const upKeywords = ['돌파', '상회', '회복', '넘', '상승', '위로', '이상'];
  const downKeywords = ['하회', '아래', '밑', '내려', '하락', '미만'];
  if (upKeywords.some((kw) => q.includes(kw))) return 'up';
  if (downKeywords.some((kw) => q.includes(kw))) return 'down';
  return 'neutral';
}

function detectMarketKey(question: string, relatedTicker?: string | null): MarketSnapshotPoint['key'] | null {
  const q = `${question} ${relatedTicker || ''}`.toLowerCase();
  if (/코스피|kospi|\^ks11/.test(q)) return 'kospi';
  if (/s&p|sp500|\^gspc/.test(q)) return 'sp500';
  if (/나스닥\s?100|nasdaq\s?100|ndx|\^ndx/.test(q)) return 'nasdaq100';
  if (/비트코인|btc|btc-usd/.test(q)) return 'btc';
  if (/원\/달러|달러\/원|usd\/krw|krw=x|환율/.test(q)) return 'usdkrw';
  return null;
}

function isQuestionMeaningful(question: string, currentPrice: number | null): boolean {
  if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) return true;
  const nums = extractNumericTokens(question);
  if (nums.length === 0) return true;

  const threshold = nums.reduce((best, n) => {
    if (best === null) return n;
    const bestGap = Math.abs(best - currentPrice);
    const nextGap = Math.abs(n - currentPrice);
    return nextGap < bestGap ? n : best;
  }, null as number | null);

  if (!threshold) return true;

  // 현재가 대비 35% 이상 동떨어진 목표치는 노이즈로 간주
  const relGap = Math.abs(threshold - currentPrice) / currentPrice;
  if (relGap > 0.35) return false;

  const direction = inferDirection(question);
  if (direction === 'up' && threshold <= currentPrice * 1.002) return false;
  if (direction === 'down' && threshold >= currentPrice * 0.998) return false;
  return true;
}

function formatSnapshotLine(point: MarketSnapshotPoint): string {
  if (!point.price) return `- ${point.label}: 데이터 미확보`;
  const decimals = point.unit === 'usd' ? 2 : 0;
  const prevText = point.previousClose
    ? ` / 전일: ${formatNumber(point.previousClose, decimals)}`
    : '';
  const unitLabel = point.unit === 'usd' ? 'USD' : point.unit === 'krw' ? '원' : 'pt';
  return `- ${point.label}: ${formatNumber(point.price, decimals)} ${unitLabel}${prevText}`;
}

async function fetchYahooPrice(symbol: string): Promise<{ price: number | null; previousClose: number | null }> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
      { headers: { 'User-Agent': 'baln-daily-briefing/1.0' } },
    );
    if (!response.ok) throw new Error(`Yahoo ${symbol} ${response.status}`);

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta || {};

    const rawPrice = Number(meta.regularMarketPrice ?? meta.chartPreviousClose ?? meta.previousClose);
    const rawPrev = Number(meta.previousClose ?? meta.chartPreviousClose);

    return {
      price: Number.isFinite(rawPrice) ? rawPrice : null,
      previousClose: Number.isFinite(rawPrev) ? rawPrev : null,
    };
  } catch (error) {
    console.warn(`[Task E-1] Yahoo 가격 조회 실패 (${symbol}):`, error);
    return { price: null, previousClose: null };
  }
}

async function fetchMarketSnapshot(): Promise<Record<MarketSnapshotPoint['key'], MarketSnapshotPoint>> {
  const base: Record<MarketSnapshotPoint['key'], Omit<MarketSnapshotPoint, 'price' | 'previousClose'>> = {
    kospi: { key: 'kospi', label: '코스피', symbol: '^KS11', unit: 'pts' },
    sp500: { key: 'sp500', label: 'S&P 500', symbol: '^GSPC', unit: 'pts' },
    nasdaq100: { key: 'nasdaq100', label: '나스닥100', symbol: '^NDX', unit: 'pts' },
    btc: { key: 'btc', label: '비트코인', symbol: 'BTC-USD', unit: 'usd' },
    usdkrw: { key: 'usdkrw', label: 'USD/KRW', symbol: 'KRW=X', unit: 'krw' },
  };

  const keys = Object.keys(base) as MarketSnapshotPoint['key'][];
  const results = await Promise.all(keys.map((key) => fetchYahooPrice(base[key].symbol)));

  const snapshot = {} as Record<MarketSnapshotPoint['key'], MarketSnapshotPoint>;
  keys.forEach((key, idx) => {
    snapshot[key] = {
      ...base[key],
      price: results[idx].price,
      previousClose: results[idx].previousClose,
    };
  });

  return snapshot;
}

function buildFallbackQuestions(
  snapshot: Record<MarketSnapshotPoint['key'], MarketSnapshotPoint>,
): Record<PredictionCategory, PredictionQuestion> {
  const kospiNow = snapshot.kospi.price ?? 2800;
  const kospiStep = guessStep(kospiNow);
  const kospiTarget = roundByStep(kospiNow * 1.01, kospiStep, 'up');

  const btcNow = snapshot.btc.price ?? 90000;
  const btcStep = guessStep(btcNow);
  const btcTarget = roundByStep(btcNow * 1.03, Math.max(100, btcStep), 'up');

  const usdkrwNow = snapshot.usdkrw.price ?? 1450;
  const fxStep = usdkrwNow >= 1000 ? 1 : 0.1;
  const usdkrwTarget = roundByStep(usdkrwNow * 0.99, fxStep, 'down');

  return {
    stocks: {
      question: `코스피가 24시간 내 ${formatNumber(kospiTarget)}선을 상회할까요?`,
      description: `현재 코스피는 ${formatNumber(kospiNow)}pt 부근입니다. 단기 반등 모멘텀이 이어질지 확인하는 질문입니다.`,
      category: 'stocks',
      yes_label: '상회한다',
      no_label: '못 넘는다',
      deadline_hours: 24,
      difficulty: 'easy',
      context_hint: '지수 예측은 방향 자체보다 진입/이탈 기준선을 잡는 훈련이 핵심입니다.',
      related_ticker: '^KS11',
      up_reason: '외국인 순매수와 반도체 강세가 지수 상단을 지지할 수 있습니다.',
      down_reason: '단기 급등 구간의 차익실현이 나오면 기준선 돌파가 지연될 수 있습니다.',
      generation_source: 'fallback',
    },
    crypto: {
      question: `비트코인이 48시간 내 ${formatNumber(btcTarget)}달러를 돌파할까요?`,
      description: `현재 비트코인은 약 ${formatNumber(btcNow, 0)}달러입니다. ETF 자금 흐름과 변동성 재확대를 점검합니다.`,
      category: 'crypto',
      yes_label: '돌파한다',
      no_label: '돌파 못한다',
      deadline_hours: 48,
      difficulty: 'medium',
      context_hint: '가상자산은 거래량 급증 구간에서 방향성이 강화되는지 함께 확인해야 합니다.',
      related_ticker: 'BTC',
      up_reason: '현물 ETF 순유입이 이어지면 상단 돌파 확률이 커집니다.',
      down_reason: '레버리지 청산과 차익실현이 겹치면 돌파 직전 되돌림이 빈번합니다.',
      generation_source: 'fallback',
    },
    macro: {
      question: `이번 주 원/달러 환율이 ${formatNumber(usdkrwTarget)}원 아래로 내려갈까요?`,
      description: `현재 환율은 ${formatNumber(usdkrwNow, 0)}원 수준입니다. 달러 강세 완화 여부를 확인하는 질문입니다.`,
      category: 'macro',
      yes_label: '내려간다',
      no_label: '유지/상승',
      deadline_hours: 48,
      difficulty: 'hard',
      context_hint: '환율은 금리차, 위험자산 선호, 무역 흐름이 동시에 반영되므로 단일 뉴스보다 방향성 누적을 봐야 합니다.',
      related_ticker: 'KRW=X',
      up_reason: '미국 금리 하향 기대가 확대되면 원화 강세(환율 하락)에 우호적입니다.',
      down_reason: '지정학 리스크 확대 시 안전자산 선호로 달러 수요가 재차 늘 수 있습니다.',
      generation_source: 'fallback',
    },
  };
}

function normalizeQuestion(
  raw: Partial<PredictionQuestion>,
  fallbackByCategory: Record<PredictionCategory, PredictionQuestion>,
): PredictionQuestion {
  const category = normalizeCategory(raw.category);
  const fallback = fallbackByCategory[category];

  return {
    question: (raw.question || fallback.question).trim(),
    description: (raw.description || fallback.description).trim(),
    category,
    yes_label: (raw.yes_label || fallback.yes_label || 'YES').trim(),
    no_label: (raw.no_label || fallback.no_label || 'NO').trim(),
    deadline_hours: [24, 36, 48].includes(Number(raw.deadline_hours))
      ? Number(raw.deadline_hours)
      : fallback.deadline_hours,
    difficulty: ['easy', 'medium', 'hard'].includes(String(raw.difficulty))
      ? String(raw.difficulty)
      : (fallback.difficulty || 'medium'),
    context_hint: (raw.context_hint || fallback.context_hint || '').trim() || null,
    related_ticker: (raw.related_ticker || fallback.related_ticker || '').trim() || null,
    up_reason: (raw.up_reason || fallback.up_reason || '').trim() || null,
    down_reason: (raw.down_reason || fallback.down_reason || '').trim() || null,
    generation_source: raw.generation_source || 'ai',
  };
}

function curateQuestions(
  aiQuestions: PredictionQuestion[],
  fallbackByCategory: Record<PredictionCategory, PredictionQuestion>,
  snapshot: Record<MarketSnapshotPoint['key'], MarketSnapshotPoint>,
): Record<PredictionCategory, PredictionQuestion> {
  const bucket: Record<PredictionCategory, PredictionQuestion[]> = {
    stocks: [],
    crypto: [],
    macro: [],
  };

  for (const q of aiQuestions) {
    const normalized = normalizeQuestion(q, fallbackByCategory);
    const marketKey = detectMarketKey(normalized.question, normalized.related_ticker);
    const currentPrice = marketKey ? snapshot[marketKey].price : null;
    if (!isQuestionMeaningful(normalized.question, currentPrice)) {
      console.warn(`[Task E-1] 비상식 질문 필터링: ${normalized.question}`);
      continue;
    }
    bucket[normalizeCategory(normalized.category)].push(normalized);
  }

  return {
    stocks: bucket.stocks[0] || fallbackByCategory.stocks,
    crypto: bucket.crypto[0] || fallbackByCategory.crypto,
    macro: bucket.macro[0] || fallbackByCategory.macro,
  };
}

// ============================================================================
// E-1: 예측 질문 3개 생성
// ============================================================================

/**
 * Task E-1: 오늘의 예측 질문 3개 생성
 *
 * [카테고리 배분]
 * - stocks: 1개 (주식 시장 예측)
 * - crypto: 1개 (암호화폐 가격 예측)
 * - macro/event: 1개 (경제 지표, 정치 이벤트)
 *
 * [중복 방지]
 * - 오늘 이미 생성된 질문이 3개 이상 있으면 스킵
 * - created_at 기준으로 판단 (UTC 기준 오늘)
 *
 * [질문 규칙]
 * 1. YES/NO로 명확히 답할 수 있는 질문만
 * 2. 24~48시간 내 결과 확인 가능
 * 3. 구체적 수치/기준 포함 (예: "나스닥 1% 이상 상승")
 * 4. 한국어로 작성
 *
 * [Gemini Prompt]
 * - Google Search로 최신 시장 뉴스 검색
 * - 실시간 데이터 기반 질문 생성
 * - JSON 형식으로 반환
 *
 * @returns { created, skipped }
 */
export async function generatePredictionPolls(): Promise<PredictionGenerationResult> {
  const startTime = Date.now();
  const todayKst = getKSTDate();
  const { startIso, endIso } = getKSTDayBounds(todayKst);

  try {
    // 중복 생성 방지: KST 기준 오늘 생성된 투표 확인
    const { data: existingRaw, error: existingError } = await supabase
      .from('prediction_polls')
      .select('id, category, question')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true });

    if (existingError) throw existingError;

    const existing = (existingRaw || []) as ExistingPollRow[];
    if (existing.length >= 3) {
      console.log(`[Task E-1] 오늘(${todayKst}, KST) 이미 ${existing.length}개 질문 존재 — 스킵`);
      const elapsed = Date.now() - startTime;
      await logTaskResult('predictions', 'SKIPPED', elapsed, {
        existing: existing.length,
        date: todayKst,
      });
      return { created: 0, skipped: true };
    }

    const missingCount = Math.max(0, 3 - existing.length);
    if (missingCount === 0) {
      const elapsed = Date.now() - startTime;
      await logTaskResult('predictions', 'SKIPPED', elapsed, {
        existing: existing.length,
        reason: 'no_missing_slots',
      });
      return { created: 0, skipped: true };
    }

    const snapshot = await fetchMarketSnapshot();
    const fallbackByCategory = buildFallbackQuestions(snapshot);
    const snapshotContext = [
      formatSnapshotLine(snapshot.kospi),
      formatSnapshotLine(snapshot.sp500),
      formatSnapshotLine(snapshot.nasdaq100),
      formatSnapshotLine(snapshot.btc),
      formatSnapshotLine(snapshot.usdkrw),
    ].join('\n');

    const todayDateStr = getKSTDateStr();
    const prompt = `당신은 baln(발른) 앱의 예측 게임 AI입니다.
오늘(KST): ${todayDateStr} (${todayKst})

아래 서버 실시간 기준값을 먼저 읽고, 이 숫자를 기준으로 예측 질문 3개를 작성하세요.
${snapshotContext}

[반드시 지킬 규칙]
- 질문은 정확히 3개: stocks 1개, crypto 1개, macro 1개
- YES/NO로 명확히 판정 가능해야 함
- 24~48시간 내 결과 확인 가능해야 함
- 한국어 자연문으로 작성
- 목표 수치가 현재가와 동떨어지면 안 됨
- 이미 돌파한 수치를 다시 "회복/돌파"로 묻지 말 것

[품질 규칙]
- description에 현재 기준값(숫자)을 명시
- context_hint는 학습 관점 1~2문장
- up_reason / down_reason은 뉴스 기반 1문장씩

[응답 형식: JSON만]
{
  "questions": [
    {
      "question": "코스피가 24시간 내 2,840선을 상회할까요?",
      "description": "현재 코스피는 2,812pt 수준입니다. 반도체 강세가 지수 상단을 지지할지 확인합니다.",
      "category": "stocks",
      "yes_label": "상회한다",
      "no_label": "못 넘는다",
      "deadline_hours": 24,
      "difficulty": "easy",
      "context_hint": "지수 예측은 숫자 기준을 잡고 사후 복기하는 습관이 중요합니다.",
      "related_ticker": "^KS11",
      "up_reason": "외국인 순매수와 반도체 강세 지속",
      "down_reason": "단기 급등 후 차익실현 매물 출회"
    }
  ]
}`;

    console.log('[Task E-1] 예측 질문 생성 시작...');
    let aiQuestions: PredictionQuestion[] = [];
    try {
      const responseText = await callGeminiWithSearch(prompt);
      const cleanJson = cleanJsonResponse(responseText);
      const parsed = JSON.parse(cleanJson);
      aiQuestions = (parsed?.questions || []).map((q: PredictionQuestion) => ({
        ...q,
        generation_source: 'ai',
      }));
    } catch (parseErr) {
      console.error('[Task E-1] Gemini 응답 파싱 실패 — fallback 질문 사용:', parseErr);
      aiQuestions = [];
    }

    const curatedByCategory = curateQuestions(aiQuestions, fallbackByCategory, snapshot);
    const existingCategories = new Set(existing.map((row) => normalizeCategory(row.category)));

    const categoriesToInsert: PredictionCategory[] = [];
    for (const category of CATEGORY_ORDER) {
      if (!existingCategories.has(category) && categoriesToInsert.length < missingCount) {
        categoriesToInsert.push(category);
      }
    }
    for (const category of CATEGORY_ORDER) {
      if (categoriesToInsert.length < missingCount) {
        categoriesToInsert.push(category);
      }
    }

    let created = 0;
    for (const category of categoriesToInsert) {
      const q = curatedByCategory[category] || fallbackByCategory[category];
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + (q.deadline_hours || 24));

      const { error } = await supabase
        .from('prediction_polls')
        .insert({
          question: q.question,
          description: q.description || null,
          category: normalizeCategory(q.category),
          yes_label: q.yes_label || '네',
          no_label: q.no_label || '아니오',
          deadline: deadline.toISOString(),
          status: 'active',
          reward_credits: 2,
          difficulty: q.difficulty || 'medium',
          context_hint: q.context_hint || null,
          related_ticker: q.related_ticker || null,
          up_reason: q.up_reason || null,
          down_reason: q.down_reason || null,
          source: q.generation_source === 'fallback' ? 'fallback' : null,
        });

      if (error) {
        console.error(`[Task E-1] 질문 삽입 실패:`, error);
        continue;
      }

      created++;
    }

    console.log(`[Task E-1] 예측 질문 ${created}개 생성 완료 (필요 슬롯: ${missingCount})`);

    const elapsed = Date.now() - startTime;
    await logTaskResult('predictions', 'SUCCESS', elapsed, {
      created,
      existing: existing.length,
      requested: missingCount,
      date: todayKst,
    });

    return { created, skipped: false };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('predictions', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
