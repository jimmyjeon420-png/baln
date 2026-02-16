// @ts-nocheck
// ============================================================================
// 공유 유틸리티 & 상수 (Shared Utilities & Constants)
// 모든 Task 파일에서 import하여 사용
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// 환경변수 (Supabase Dashboard > Edge Functions > Secrets에서 설정)
// ============================================================================
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
export const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
export const GEMINI_MODEL = 'gemini-3-flash-preview';
export const MOLIT_API_KEY = Deno.env.get('MOLIT_API_KEY') || ''; // 국토부 API 키 (없으면 Task F 스킵)

// Service Role 클라이언트 (RLS 우회하여 쓰기 가능)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// 분석 대상 종목 리스트 (인기 글로벌 + 한국 종목)
// ============================================================================
export const STOCK_LIST = [
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
// 투자 거장 리스트
// ============================================================================
export const GURU_LIST = [
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

// ============================================================================
// 타입 정의
// ============================================================================

export interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

// ============================================================================
// Gemini API 호출 유틸리티 (Google Search 그라운딩 포함)
// ============================================================================

/**
 * Gemini 응답에서 순수 JSON만 추출 (강화 버전)
 * - "알겠습니다..." 같은 사족 제거
 * - ```json ``` 코드 블록 제거
 * - { } 또는 [ ] 사이의 JSON만 파싱
 */
export function cleanJsonResponse(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('[JSON Clean] 빈 응답 또는 비문자열');
  }

  try {
    // 1. 모든 백틱 코드 블록 제거 (강화)
    let cleaned = text
      .replace(/```json\s*/gi, '')  // ```json 제거
      .replace(/```javascript\s*/gi, '')  // ```javascript 제거
      .replace(/```\s*/g, '')  // 나머지 ``` 제거
      .trim();

    // 2. { } 또는 [ ] 찾기 (배열 지원)
    let jsonStart = -1;
    let jsonEnd = -1;
    let isArray = false;

    // 객체 { } 찾기
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');

    // 배열 [ ] 찾기
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');

    // 먼저 나오는 것 선택
    if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) {
      jsonStart = objStart;
      jsonEnd = objEnd;
      isArray = false;
    } else if (arrStart !== -1) {
      jsonStart = arrStart;
      jsonEnd = arrEnd;
      isArray = true;
    }

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('JSON 객체/배열을 찾을 수 없음');
    }

    // 3. JSON 부분만 추출
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

    // 4. 유효성 검증 (파싱 시도)
    const parsed = JSON.parse(cleaned);

    // 5. 성공적으로 파싱되면 반환
    return JSON.stringify(parsed);  // 재직렬화하여 포맷 정리

  } catch (error) {
    console.error('[JSON Clean] 정제 실패:', error);
    console.error('[JSON Clean] 원본 텍스트 (처음 500자):', text.substring(0, 500));

    // 마지막 시도: 원본 그대로 파싱
    try {
      JSON.parse(text);
      return text;  // 원본이 이미 valid JSON이면 반환
    } catch {
      throw new Error(`JSON 파싱 불가능: ${error}`);
    }
  }
}

/**
 * 지연 함수 (Rate Limit 방지용)
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Phase 3-2: 재시도 로직 (Exponential Backoff)
 * - 최대 3번 재시도
 * - 재시도 간격: 10초 → 30초 → 60초
 * - 로그 기록
 */
export async function retryWithBackoff<T>(
  taskName: string,
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const delays = [10000, 30000, 60000]; // 10초, 30초, 60초
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = delays[attempt - 1] || 60000;
        console.log(`[재시도] ${taskName} - ${attempt}/${maxRetries} (${delayMs / 1000}초 후)`);
        await sleep(delayMs);
      }

      const result = await fn();
      if (attempt > 0) {
        console.log(`[재시도 성공] ${taskName} - ${attempt}번째 시도에서 성공`);
      }
      return result;

    } catch (error) {
      lastError = error;
      console.error(`[재시도 ${attempt + 1}/${maxRetries + 1}] ${taskName} 실패:`, error.message);

      if (attempt >= maxRetries) {
        console.error(`[재시도 포기] ${taskName} - ${maxRetries + 1}번 모두 실패`);
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Gemini API 직접 호출 (Google Search 그라운딩 활성화)
 * - Rate Limit 방지: 호출 전 자동 1초 대기
 * - JSON 정제 실패 시 원본 텍스트 반환 (호출자가 직접 파싱)
 */
export async function callGeminiWithSearch(prompt: string, timeoutMs: number = 60000): Promise<string> {
  // Rate Limit 방지: 호출 전 1초 대기
  await sleep(1000);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain',
    },
  };

  // ★ AbortController로 타임아웃 추가 — 무한 대기 방지
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 에러 (${response.status}): ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    // ★ 빈 응답 검증 추가
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini API가 빈 응답을 반환했습니다');
    }

    // ★ 모든 parts의 텍스트를 합쳐서 반환 (그라운딩 응답에 여러 part가 있을 수 있음)
    const allParts = data.candidates[0]?.content?.parts || [];
    const rawText = allParts.map((p: any) => p.text || '').join('');
    if (!rawText) {
      throw new Error('Gemini API 응답에 텍스트가 없습니다');
    }

    // JSON 정제 시도 — 실패해도 원본 반환 (호출자가 직접 파싱 가능)
    try {
      return cleanJsonResponse(rawText);
    } catch {
      console.warn('[Gemini] cleanJsonResponse 실패 — 원본 텍스트 반환 (호출자가 직접 파싱)');
      return rawText;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Gemini API ${timeoutMs / 1000}초 타임아웃. 다시 시도해주세요.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 한국 시간(KST, UTC+9) 기준 오늘 날짜 반환
 * Edge Function은 UTC 서버에서 실행되지만, 앱 타겟 유저가 한국이므로 KST 기준 사용
 * 예: 22:00 UTC (=07:00 KST 다음날) → KST 날짜 반환
 * @returns YYYY-MM-DD (KST)
 */
export function getKSTDate(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

/**
 * 한국 시간(KST) 기준 사람이 읽을 수 있는 날짜 문자열
 * @returns "2026년 2월 15일" 형태
 */
export function getKSTDateStr(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
}

/**
 * 자산 구간 결정 (DB 함수 get_asset_bracket과 동일 로직)
 */
export function getAssetBracket(total: number): string {
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
export function getTier(total: number): string {
  if (total >= 1000000000) return 'DIAMOND';
  if (total >= 500000000) return 'PLATINUM';
  if (total >= 100000000) return 'GOLD';
  return 'SILVER';
}

// ============================================================================
// 로그 기록 함수 (모니터링)
// ============================================================================

/**
 * Edge Function Task 실행 로그 기록
 *
 * @param taskName Task 이름 (macro, stocks, gurus, snapshots, predictions, resolve, realestate, context_card)
 * @param status 실행 상태 (SUCCESS, FAILED, SKIPPED)
 * @param elapsed 실행 시간 (밀리초)
 * @param summary 결과 요약 (JSON 객체, 예: {count: 35, sentiment: "BULLISH"})
 * @param error 에러 메시지 (실패 시)
 */
export async function logTaskResult(
  taskName: string,
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
  elapsed: number,
  summary?: Record<string, unknown>,
  error?: string
): Promise<void> {
  try {
    const { error: insertError } = await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'daily-briefing',
        task_name: taskName,
        status,
        elapsed_ms: elapsed,
        result_summary: summary || {},
        error_message: error || null,
      });

    if (insertError) {
      console.warn(`[로그 기록 실패] Task ${taskName}:`, insertError);
    }
  } catch (e) {
    // 로그 기록 실패는 Task 실행에 영향 없음 (무시)
    console.warn(`[로그 기록 예외] Task ${taskName}:`, e);
  }
}
