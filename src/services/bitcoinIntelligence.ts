// ============================================================================
// Bitcoin Intelligence Service (비트코인 전문 리서치팀)
// 5개 데이터 소스를 수집하고 가중 평균으로 종합 점수(0-100) 산출
// CNN Fear & Greed / VIX 스타일의 "확신 지수" 제공
// ============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getTodayMarketInsight } from './centralKitchen';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';

// ============================================================================
// 타입 정의
// ============================================================================

/** 점수 존 (Score Zone) */
export type ScoreZone =
  | 'EXTREME_FEAR'   // 0-20
  | 'FEAR'           // 21-40
  | 'NEUTRAL'        // 41-60
  | 'GREED'          // 61-80
  | 'EXTREME_GREED'; // 81-100

/** 존별 설정 */
export const ZONE_CONFIG: Record<ScoreZone, { label: string; color: string; bgColor: string }> = {
  EXTREME_FEAR:  { label: '극도의 공포', color: '#B71C1C', bgColor: '#2E1A1A' },
  FEAR:          { label: '공포',       color: '#CF6679', bgColor: '#2E1A1E' },
  NEUTRAL:       { label: '중립',       color: '#FFB74D', bgColor: '#2E2A1A' },
  GREED:         { label: '탐욕',       color: '#81C784', bgColor: '#1A2E1C' },
  EXTREME_GREED: { label: '극도의 탐욕', color: '#4CAF50', bgColor: '#1A2E1A' },
};

/** 6개 팩터 점수 */
export interface BitcoinSubScores {
  fearGreed: number;       // Fear & Greed 지수 (20%)
  momentum7d: number;      // 7일 가격 모멘텀 (10%)
  momentum30d: number;     // 30일 가격 모멘텀 (10%)
  hashrate: number;        // 해시레이트 네트워크 건강도 (15%)
  dominance: number;       // BTC 시장 지배율 (15%)
  aiAnalysis: number;      // AI 분석 (30%)
}

/** Gemini AI 인사이트 */
export interface GeminiInsight {
  score: number;           // 0-100
  hashrateScore: number;   // 해시레이트 건강도 점수 (0-100)
  hashrateTrend: string;   // 해시레이트 동향 요약
  politicsImpact: string;  // 정치/규제 영향 요약
  macroOutlook: string;    // 매크로 환경 요약
  keyEvents: string[];     // 핵심 이벤트 3개
}

/** 최종 결과 */
export interface BitcoinIntelligenceResult {
  compositeScore: number;      // 종합 점수 (0-100)
  zone: ScoreZone;             // 점수 존
  subScores: BitcoinSubScores; // 5개 팩터 점수
  currentPrice: number;        // BTC 현재 가격 (USD)
  priceChange24h: number;      // 24시간 변동률 (%)
  aiInsight: GeminiInsight | null; // AI 분석 인사이트
  source: 'central-kitchen' | 'live-api'; // 데이터 출처
  updatedAt: string;           // 데이터 수집 시각
}

// ============================================================================
// 점수 → 존 매핑
// ============================================================================

function getScoreZone(score: number): ScoreZone {
  if (score <= 20) return 'EXTREME_FEAR';
  if (score <= 40) return 'FEAR';
  if (score <= 60) return 'NEUTRAL';
  if (score <= 80) return 'GREED';
  return 'EXTREME_GREED';
}

// ============================================================================
// 정규화 함수 (선형 매핑)
// ============================================================================

/** 가격 모멘텀 → 0-100 점수 (-30% → 0점, +30% → 100점) */
function normalizeMomentum(changePercent: number): number {
  const clamped = Math.max(-30, Math.min(30, changePercent));
  return Math.round(((clamped + 30) / 60) * 100);
}

/** BTC 도미넌스 → 0-100 점수 (40% → 0점, 60% → 100점) */
function normalizeDominance(dominancePercent: number): number {
  const clamped = Math.max(40, Math.min(60, dominancePercent));
  return Math.round(((clamped - 40) / 20) * 100);
}

// ============================================================================
// API 호출 함수 (개별 실패 시 기본값 반환)
// ============================================================================

/** Fear & Greed 지수 조회 (alternative.me) */
async function fetchFearGreedIndex(): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      signal: controller.signal,
    });
    const json = await res.json();
    const value = parseInt(json?.data?.[0]?.value, 10);
    return isNaN(value) ? 50 : Math.max(0, Math.min(100, value));
  } catch (err) {
    console.warn('[Bitcoin] Fear & Greed API 실패:', err);
    return 50; // 기본값: 중립
  } finally {
    clearTimeout(timeout);
  }
}

/** CoinGecko 비트코인 시장 데이터 조회 */
async function fetchBitcoinMarketData(): Promise<{
  currentPrice: number;
  priceChange24h: number;
  change7d: number;
  change30d: number;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false',
      { signal: controller.signal }
    );
    const json = await res.json();
    const md = json?.market_data;

    return {
      currentPrice: md?.current_price?.usd ?? 0,
      priceChange24h: md?.price_change_percentage_24h ?? 0,
      change7d: md?.price_change_percentage_7d ?? 0,
      change30d: md?.price_change_percentage_30d ?? 0,
    };
  } catch (err) {
    console.warn('[Bitcoin] CoinGecko 시장 데이터 실패:', err);
    return { currentPrice: 0, priceChange24h: 0, change7d: 0, change30d: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

/** CoinGecko 글로벌 시장 데이터 → BTC 도미넌스 */
async function fetchMarketDominance(): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      signal: controller.signal,
    });
    const json = await res.json();
    const btcDominance = json?.data?.market_cap_percentage?.btc ?? 50;
    return btcDominance;
  } catch (err) {
    console.warn('[Bitcoin] CoinGecko 도미넌스 실패:', err);
    return 50; // 기본값: 중간
  } finally {
    clearTimeout(timeout);
  }
}

/** Gemini AI 비트코인 분석 (Google Search 그라운딩) */
async function analyzeBitcoinWithGemini(): Promise<GeminiInsight> {
  const defaultInsight: GeminiInsight = {
    score: 50,
    hashrateScore: 50,
    hashrateTrend: '데이터 없음',
    politicsImpact: '데이터 없음',
    macroOutlook: '데이터 없음',
    keyEvents: [],
  };

  if (!API_KEY) return defaultInsight;

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      tools: [
        {
          // @ts-ignore - Gemini 2.0 Google Search Tool
          google_search: {},
        },
      ],
    });

    const prompt = `
당신은 Goldman Sachs 디지털 자산 리서치팀 수석 분석가입니다.
현재 비트코인(BTC)의 투자 매력도를 0-100 점수로 평가해주세요.

다음 4가지 팩터를 반드시 분석하세요:
1. **해시레이트 건강도**: 비트코인 해시레이트의 최근 추세, 전월 대비 증감률, 네트워크 보안 수준. 해시레이트가 높을수록 채굴자들이 비트코인 네트워크에 장기 투자하고 있다는 신호입니다.
2. **정치/규제 영향**: 미국, EU, 아시아 주요국의 최신 암호화폐 규제 동향 및 정치적 지지/반대
3. **매크로 환경**: 미 연준 금리 전망, 달러 인덱스(DXY), 글로벌 유동성이 비트코인에 미치는 영향
4. **종합 투자 매력도**: 위 3가지를 종합한 전체 평가

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "score": (0-100 정수, 종합 투자 매력도),
  "hashrateScore": (0-100 정수, 해시레이트 건강도. 역대 최고치 대비 현재 수준 + 추세 반영. 높을수록 네트워크가 건강),
  "hashrateTrend": "(해시레이트 동향 2줄 요약, 한국어. 수치와 추세 포함)",
  "politicsImpact": "(정치/규제 영향 1줄 요약, 한국어)",
  "macroOutlook": "(매크로 환경 1줄 요약, 한국어)",
  "keyEvents": ["(핵심 이벤트 1)", "(핵심 이벤트 2)", "(핵심 이벤트 3)"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // JSON 추출 (Gemini가 마크다운 코드블록으로 감쌀 수 있음)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaultInsight;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.max(0, Math.min(100, parsed.score ?? 50)),
      hashrateScore: Math.max(0, Math.min(100, parsed.hashrateScore ?? 50)),
      hashrateTrend: parsed.hashrateTrend || '데이터 없음',
      politicsImpact: parsed.politicsImpact || '데이터 없음',
      macroOutlook: parsed.macroOutlook || '데이터 없음',
      keyEvents: Array.isArray(parsed.keyEvents) ? parsed.keyEvents.slice(0, 3) : [],
    };
  } catch (err) {
    console.warn('[Bitcoin] Gemini AI 분석 실패:', err);
    return defaultInsight;
  }
}

// ============================================================================
// 실시간 BTC 가격 조회 (경량 — "시세 전광판 부서")
// 확신 점수와 별도로 30초마다 가격만 빠르게 갱신
// ============================================================================

export interface BitcoinLivePrice {
  currentPrice: number;     // BTC 현재 가격 (USD)
  priceChange24h: number;   // 24시간 변동률 (%)
  updatedAt: string;
}

/**
 * BTC 실시간 가격만 조회 (CoinGecko simple/price — 경량 API)
 * 확신 점수 계산 없이 가격+24h 변동률만 반환
 */
export async function fetchBitcoinLivePrice(): Promise<BitcoinLivePrice> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { signal: controller.signal }
    );
    const json = await res.json();
    const btc = json?.bitcoin;

    return {
      currentPrice: btc?.usd ?? 0,
      priceChange24h: btc?.usd_24h_change ?? 0,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Bitcoin] 실시간 가격 조회 실패:', err);
    return { currentPrice: 0, priceChange24h: 0, updatedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// 메인 진입점: 비트코인 인텔리전스 로드
// ============================================================================

/**
 * Bitcoin Conviction Score 전체 로드
 * 1단계: Central Kitchen (DB) 조회 → 있으면 즉시 반환
 * 2단계: 4개 API 병렬 호출 → 가중 평균 산출
 */
export async function loadBitcoinIntelligence(): Promise<BitcoinIntelligenceResult> {
  // 기본값 (모든 API 실패 시에도 앱 크래시 방지)
  const fallbackResult: BitcoinIntelligenceResult = {
    compositeScore: 50,
    zone: 'NEUTRAL',
    subScores: {
      fearGreed: 50,
      momentum7d: 50,
      momentum30d: 50,
      hashrate: 50,
      dominance: 50,
      aiAnalysis: 50,
    },
    currentPrice: 0,
    priceChange24h: 0,
    aiInsight: null,
    source: 'live-api',
    updatedAt: new Date().toISOString(),
  };

  try {
    // ========================================================================
    // 1단계: Central Kitchen DB 조회 (< 100ms)
    // ========================================================================
    const dbInsight = await getTodayMarketInsight();
    if (dbInsight?.bitcoin_analysis) {
      const ba = dbInsight.bitcoin_analysis;
      // DB에 저장된 사전 계산 데이터가 있으면 그대로 사용
      const score = Math.max(0, Math.min(100, ba.score ?? 50));
      return {
        compositeScore: score,
        zone: getScoreZone(score),
        subScores: {
          fearGreed: 50,    // DB에는 개별 팩터가 없으므로 기본값
          momentum7d: 50,
          momentum30d: 50,
          hashrate: 50,
          dominance: 50,
          aiAnalysis: score,
        },
        currentPrice: 0,
        priceChange24h: 0,
        aiInsight: {
          score,
          hashrateScore: 50,
          hashrateTrend: '사전 분석 데이터',
          politicsImpact: ba.politicsImpact || '데이터 없음',
          macroOutlook: '사전 분석 데이터',
          keyEvents: ba.whaleAlerts || [],
        },
        source: 'central-kitchen',
        updatedAt: new Date().toISOString(),
      };
    }

    // ========================================================================
    // 2단계: 라이브 API 병렬 호출 (Promise.allSettled — 개별 실패 허용)
    // ========================================================================
    const [fearGreedResult, marketDataResult, dominanceResult, geminiResult] =
      await Promise.allSettled([
        fetchFearGreedIndex(),
        fetchBitcoinMarketData(),
        fetchMarketDominance(),
        analyzeBitcoinWithGemini(),
      ]);

    // 결과 추출 (실패 시 기본값)
    const fearGreed = fearGreedResult.status === 'fulfilled' ? fearGreedResult.value : 50;
    const marketData = marketDataResult.status === 'fulfilled'
      ? marketDataResult.value
      : { currentPrice: 0, priceChange24h: 0, change7d: 0, change30d: 0 };
    const dominanceRaw = dominanceResult.status === 'fulfilled' ? dominanceResult.value : 50;
    const geminiInsight = geminiResult.status === 'fulfilled' ? geminiResult.value : fallbackResult.aiInsight as GeminiInsight;

    // 정규화
    const momentum7dScore = normalizeMomentum(marketData.change7d);
    const momentum30dScore = normalizeMomentum(marketData.change30d);
    const dominanceScore = normalizeDominance(dominanceRaw);
    const aiScore = geminiInsight?.score ?? 50;
    const hashrateScore = geminiInsight?.hashrateScore ?? 50;

    const subScores: BitcoinSubScores = {
      fearGreed,
      momentum7d: momentum7dScore,
      momentum30d: momentum30dScore,
      hashrate: hashrateScore,
      dominance: dominanceScore,
      aiAnalysis: aiScore,
    };

    // ========================================================================
    // 가중 평균 산출 (6개 팩터, 합계 100%)
    // ========================================================================
    const compositeScore = Math.round(
      subScores.fearGreed * 0.20 +
      subScores.momentum7d * 0.10 +
      subScores.momentum30d * 0.10 +
      subScores.hashrate * 0.15 +
      subScores.dominance * 0.15 +
      subScores.aiAnalysis * 0.30
    );

    return {
      compositeScore,
      zone: getScoreZone(compositeScore),
      subScores,
      currentPrice: marketData.currentPrice,
      priceChange24h: marketData.priceChange24h,
      aiInsight: geminiInsight,
      source: 'live-api',
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[Bitcoin] 전체 로드 실패:', err);
    return fallbackResult;
  }
}
