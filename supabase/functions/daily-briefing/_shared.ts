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
export const GEMINI_MODEL = 'gemini-2.0-flash';
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
 * Gemini API 직접 호출 (Deno 환경에서는 npm SDK 대신 REST API 사용)
 * Google Search 그라운딩 활성화
 */
export async function callGeminiWithSearch(prompt: string): Promise<string> {
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
export function cleanJsonResponse(text: string): string {
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
// 유틸리티 함수
// ============================================================================

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
