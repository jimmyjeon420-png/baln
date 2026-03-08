/**
 * geminiCore.ts — Gemini API 초기화, 공통 유틸리티, JSON 파서
 *
 * gemini.ts에서 분리된 핵심 모듈.
 * 다른 gemini* 모듈들이 공유하는 기반 코드.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Sentry from '@sentry/react-native';
import type {
  DeepDiveResult,
} from '../types/marketplace';

// ⚠️ 보안 경고: EXPO_PUBLIC_ 접두사가 붙은 환경변수는 클라이언트 번들에 포함됩니다.
//    Gemini API 키는 현재 클라이언트에서 직접 호출하는 구조이므로 EXPO_PUBLIC_ 사용이 불가피하지만,
//    프로덕션에서는 Supabase Edge Function 등 서버 사이드 프록시를 통해 호출하는 것을 권장합니다.
//    절대 API 키를 소스 코드에 하드코딩하지 마세요. 반드시 .env 파일을 통해 주입하세요.
export const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
export const MODEL_NAME = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview';

// 🔍 디버그: API 키 로드 확인
if (!API_KEY) {
  console.warn('[Gemini] API 키가 설정되지 않았습니다. AI 기능은 제한됩니다.');
} else if (__DEV__) {
  if (__DEV__) console.log('[Gemini] API key configured');
  if (__DEV__) console.log('[Gemini] model:', MODEL_NAME);
}

export const genAI = new GoogleGenerativeAI(API_KEY);

// 환경변수로 모델 설정 (기본값: gemini-3-flash-preview)
export const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// ============================================================================
// [실시간 그라운딩] Google Search 도구 설정
// ============================================================================
// 실시간 뉴스/시장 데이터를 위한 Google Search 도구가 포함된 모델
// 참고: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini

// ⚠️ TEMPORARY FIX: google_search 도구가 네트워크 에러를 일으키면 임시로 제거
// TODO: Gemini 3-flash-preview의 올바른 google_search 형식 확인 후 재활성화
const USE_GOOGLE_SEARCH = false; // Gemini 3-flash-preview에서 google_search 불안정 → 비활성화

export const modelWithSearch = genAI.getGenerativeModel(
  USE_GOOGLE_SEARCH
    ? {
        model: MODEL_NAME,
        tools: [
          {
            // SDK v0.24는 타입에 google_search가 없지만, tools 배열을 그대로
            // JSON으로 직렬화해서 REST API에 전달하므로 snake_case가 올바름
            // REST API: google_search: {} (snake_case 필수)
            // @ts-expect-error - SDK 타입에는 없지만 REST API에서 인식함
            google_search: {},
          },
        ],
      }
    : { model: MODEL_NAME } // google_search 비활성화 시 일반 모델 사용
);

// ============================================================================
// [유틸리티] Gemini 호출 래퍼 + JSON 파서 (2.5 업그레이드)
// ============================================================================

/** Gemini 호출 + 타임아웃 + 재시도 래퍼 */
export async function callGeminiSafe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targetModel: any,
  prompt: string | unknown[],
  options?: { timeoutMs?: number; maxRetries?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 30000;
  const maxRetries = options?.maxRetries ?? 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const result = await targetModel.generateContent(prompt, { signal: controller.signal });
      clearTimeout(timer);

      const text = result.response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('빈 응답');
      }
      return text;
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string };
      if (attempt < maxRetries && (
        errObj.name === 'AbortError' ||
        errObj.message?.includes('429') ||
        errObj.message?.includes('503') ||
        errObj.message?.includes('RESOURCE_EXHAUSTED')
      )) {
        const delay = Math.pow(2, attempt) * 1000;
        if (__DEV__) console.log(`[Gemini] 재시도 ${attempt + 1}/${maxRetries} (${delay}ms 후)`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (errObj.name === 'AbortError') {
        const timeoutErr = new Error(`AI 분석 시간 초과 (${timeoutMs / 1000}초). 다시 시도해주세요.`);
        Sentry.captureException(timeoutErr, { tags: { service: 'gemini', type: 'timeout' } });
        throw timeoutErr;
      }
      // Gemini API 호출 실패를 Sentry에 기록
      Sentry.captureException(err, {
        tags: { service: 'gemini', type: 'api_error' },
        extra: { attempt, maxRetries, timeoutMs },
      });
      throw err;
    }
  }
  const exhaustedErr = new Error('AI 분석 실패. 잠시 후 다시 시도해주세요.');
  Sentry.captureException(exhaustedErr, { tags: { service: 'gemini', type: 'retries_exhausted' } });
  throw exhaustedErr;
}

/** JSON 응답 안전 파싱 (Gemini의 markdown 코드블록 제거) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseGeminiJson<T = any>(text: string): T {
  let cleaned = text.trim();
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json|javascript)?\s*/i, '').replace(/\s*```$/i, '');
  // Remove all remaining code block markers
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```javascript\s*/gi, '').replace(/```\s*/g, '');
  cleaned = cleaned.trim();
  // Remove markdown formatting inside JSON strings (*, _, #)
  cleaned = cleaned
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/^#+\s*/gm, '');
  // Find JSON boundaries
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    // Try array
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      cleaned = cleaned.substring(arrStart, arrEnd + 1);
    } else {
      throw new Error('JSON 형식을 찾을 수 없습니다');
    }
  } else {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  // Fix trailing commas
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  // Fix ₩ symbols before numbers in JSON number fields
  cleaned = cleaned.replace(/:\s*₩\s*([0-9])/g, ': $1');
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`[Gemini] JSON 파싱 실패: ${err instanceof Error ? err.message : String(err)} — 원본: ${cleaned.slice(0, 200)}`);
  }
}

// ============================================================================
// 공통 유틸리티 함수
// ============================================================================

export type DeepDiveRecommendation = DeepDiveResult['recommendation'];
export type DeepDiveSentiment = DeepDiveResult['sections']['news']['sentiment'];
export type DeepDiveMetricStatus = 'good' | 'neutral' | 'bad';

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function roundTo(value: number, decimals: number): number {
  const base = 10 ** decimals;
  return Math.round(value * base) / base;
}

export function sentimentToNumericScore(sentiment: DeepDiveSentiment | string | undefined): number {
  switch (sentiment) {
    case 'VERY_POSITIVE':
      return 90;
    case 'POSITIVE':
      return 70;
    case 'NEUTRAL':
      return 50;
    case 'NEGATIVE':
      return 30;
    case 'VERY_NEGATIVE':
      return 10;
    default:
      return 50;
  }
}

export function recommendationFromScore(score: number): DeepDiveRecommendation {
  if (score >= 78) return 'VERY_POSITIVE';
  if (score >= 63) return 'POSITIVE';
  if (score >= 42) return 'NEUTRAL';
  if (score >= 28) return 'NEGATIVE';
  return 'VERY_NEGATIVE';
}

export function isGeminiCredentialError(message: string): boolean {
  const normalized = message.toUpperCase();
  return (
    normalized.includes('API_KEY_INVALID') ||
    normalized.includes('API KEY EXPIRED') ||
    normalized.includes('PERMISSION_DENIED') ||
    normalized.includes('AUTHENTICATION') ||
    normalized.includes('403')
  );
}

export function normalizeDeepDiveRecommendation(value: unknown): DeepDiveRecommendation {
  const raw = String(value ?? '').toUpperCase();

  if (
    raw === 'VERY_POSITIVE' ||
    raw === 'POSITIVE' ||
    raw === 'NEUTRAL' ||
    raw === 'NEGATIVE' ||
    raw === 'VERY_NEGATIVE'
  ) {
    return raw;
  }

  if (raw.includes('STRONG') && raw.includes('BUY')) return 'VERY_POSITIVE';
  if (raw.includes('BUY') || raw.includes('POSITIVE')) return 'POSITIVE';
  if (raw.includes('SELL') || raw.includes('NEGATIVE')) return 'NEGATIVE';
  return 'NEUTRAL';
}

export function parseKoreanMarketCap(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value !== 'string') return null;

  const normalized = value.replace(/,/g, '').trim();
  const numMatch = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!numMatch) return null;

  const base = Number(numMatch[0]);
  if (!Number.isFinite(base)) return null;

  if (normalized.includes('조')) return Math.round(base * 1_0000_0000_0000);
  if (normalized.includes('억')) return Math.round(base * 1_0000_0000);
  if (normalized.includes('만')) return Math.round(base * 10_000);

  // 순수 숫자 문자열인 경우만 숫자로 처리 (예: "1600000000000000")
  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return Math.round(base);
  }

  return null;
}

export function relativeDiff(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / denom;
}

export function formatKrwCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_0000_0000_0000) {
    return `${sign}약 ${(abs / 1_0000_0000_0000).toFixed(1)}조원`;
  }
  if (abs >= 1_0000_0000) {
    return `${sign}약 ${(abs / 1_0000_0000).toFixed(0)}억원`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}원`;
}

export function normalizeMetricStatus(status: unknown): DeepDiveMetricStatus {
  if (status === 'good' || status === 'neutral' || status === 'bad') {
    return status;
  }
  return 'neutral';
}

export function upsertMetric(
  metrics: { label: string; value: string; status: DeepDiveMetricStatus }[],
  label: string,
  value: string,
  status: DeepDiveMetricStatus,
): { label: string; value: string; status: DeepDiveMetricStatus }[] {
  const idx = metrics.findIndex((m) => m.label.toLowerCase() === label.toLowerCase());
  if (idx >= 0) {
    const next = [...metrics];
    next[idx] = { ...next[idx], value, status };
    return next;
  }
  return [...metrics, { label, value, status }];
}

export function inferMarketCapKRW(fundamentals?: { marketCapKRW?: number; marketCap?: number; currency?: string; exchangeRate?: number }): number | null {
  if (!fundamentals) return null;
  if (typeof fundamentals.marketCapKRW === 'number' && Number.isFinite(fundamentals.marketCapKRW)) {
    return fundamentals.marketCapKRW;
  }
  if (typeof fundamentals.marketCap === 'number' && Number.isFinite(fundamentals.marketCap)) {
    if (fundamentals.currency === 'KRW') {
      return fundamentals.marketCap;
    }
    if (typeof fundamentals.exchangeRate === 'number' && Number.isFinite(fundamentals.exchangeRate)) {
      return fundamentals.marketCap * fundamentals.exchangeRate;
    }
  }
  return null;
}

// Re-export commonly used utilities from other modules
export { getCurrentDisplayLanguage } from '../context/LocaleContext';
export { getCurrencySymbol } from '../utils/formatters';
