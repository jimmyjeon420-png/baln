import supabase from './supabase';
import { getLangParam } from '../utils/promptLanguage';
import { isTransientEdgeInvokeError } from '../utils/edgeInvokeError';

export interface GeminiProxyEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GeminiProxyClient {
  functions: {
    invoke: (
      name: string,
      options: { body: unknown }
    ) => Promise<{
      data: GeminiProxyEnvelope<unknown> | null;
      error: { message?: string } | null;
    }>;
  };
}

function isTransientEnvelopeFailure(message: string): boolean {
  return isTransientEdgeInvokeError(message)
    || /temporar/i.test(message)
    || /timeout/i.test(message)
    || /\b(?:429|502|503|504)\b/.test(message)
    || /rate.?limit/i.test(message)
    || /unavailable/i.test(message)
    || /upstream degraded/i.test(message);
}

export async function invokeGeminiProxy<T>(
  type: string,
  data: unknown,
  timeoutMs: number = 30000,
  options?: {
    client?: GeminiProxyClient;
    lang?: string;
    maxTransientRetries?: number;
  },
): Promise<T> {
  const client = options?.client ?? (supabase as unknown as GeminiProxyClient);
  const lang = options?.lang ?? getLangParam();
  const maxTransientRetries = options?.maxTransientRetries ?? 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxTransientRetries; attempt++) {
    const invokeResult = await Promise.race([
      client.functions.invoke('gemini-proxy', {
        body: { type, data, lang },
      }),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: `Edge Function 호출 ${Math.round(timeoutMs / 1000)}초 타임아웃` } }), timeoutMs)
      ),
    ]);

    const { data: envelope, error } = invokeResult as {
      data: GeminiProxyEnvelope<T> | null;
      error: { message?: string } | null;
    };

    if (error) {
      lastError = new Error(`gemini-proxy 오류: ${error.message || JSON.stringify(error)}`);
      if (attempt < maxTransientRetries && isTransientEdgeInvokeError(lastError)) {
        const backoffMs = (attempt + 1) * 700;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw lastError;
    }

    if (!envelope?.success || !envelope.data) {
      const envelopeMessage = String(envelope?.error || 'no data');
      lastError = new Error(`gemini-proxy 응답 오류: ${envelopeMessage}`);
      if (attempt < maxTransientRetries && isTransientEnvelopeFailure(envelopeMessage)) {
        const backoffMs = (attempt + 1) * 700;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw lastError;
    }

    return envelope.data;
  }

  throw lastError ?? new Error('gemini-proxy 알 수 없는 오류');
}
