/**
 * geminiChat.ts — AI CFO 채팅, 포트폴리오 어드바이스, 대화 요약
 *
 * gemini.ts에서 분리된 채팅/대화 모듈.
 */

import * as Sentry from '@sentry/react-native';
import { getResponseLanguage } from '../utils/promptLanguage';
import { invokeGeminiProxy } from './geminiProxy';
import {
  API_KEY,
  model,
  modelWithSearch,
  callGeminiSafe,
  isGeminiCredentialError,
  getCurrentDisplayLanguage,
  getCurrencySymbol,
} from './geminiCore';

import type {
  CFOChatInput,
} from '../types/marketplace';

// ============================================================================
// 프록시 응답 타입
// ============================================================================

interface ProxyCFOChatResponse {
  warren?: string;
  dalio?: string;
  wood?: string;
  kostolany?: string;
  summary?: string;
  answer?: string;
}

function formatCfoProxyResponse(data: ProxyCFOChatResponse): string {
  const answer = typeof data.answer === 'string' ? data.answer.trim() : '';
  if (answer.length > 0) return answer;

  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  const parts = [
    data.warren,
    data.dalio,
    data.wood,
    data.kostolany,
    summary,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  return parts.slice(0, 2).join('\n\n') || '현재 분석 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
}

// ============================================================================
// 기본 함수들
// ============================================================================

export const getPortfolioAdvice = async (prompt: string | Record<string, unknown>) => {
  try {
    const msg = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    return await callGeminiSafe(model, msg);
  } catch (error) {
    console.warn("Gemini Text Error:", error);
    Sentry.addBreadcrumb({
      category: 'api',
      message: 'getPortfolioAdvice failed',
      level: 'error',
      data: { error: String(error) },
    });
    return "AI 응답 오류. 잠시 후 다시 시도해주세요.";
  }
};

export const summarizeChat = async (messages: { user: { name: string }; text: string }[]) => {
  try {
    const conversation = messages.map(m => `${m.user.name}: ${m.text}`).join('\n');
    const result = await model.generateContent(`Summarize this logic into 3 bullet points (${getResponseLanguage()}):\n${conversation}`);
    return result.response.text();
  } catch (error) {
    return "요약 실패";
  }
};

// ============================================================================
// AI CFO 채팅
// ============================================================================

export const generateAICFOResponse = async (
  input: CFOChatInput,
  conversationHistory: { role: string; content: string }[]
): Promise<string> => {
  const isKo = getCurrentDisplayLanguage() === 'ko';

  const historyPayload = conversationHistory
    .slice(-10)
    .map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      text: String(m.content || ''),
    }))
    .filter((m) => m.text.trim().length > 0);

  const shouldPreferProxy = !__DEV__;
  if (shouldPreferProxy || !API_KEY) {
    try {
      const proxyResponse = await invokeGeminiProxy<ProxyCFOChatResponse>(
        'cfo-chat',
        {
          question: input.message,
          conversationHistory: historyPayload,
        },
        30000,
      );
      return formatCfoProxyResponse(proxyResponse);
    } catch (proxyErr) {
      console.warn('[AICFO] 프록시 실패, 안전 폴백 응답 사용:', proxyErr);
      return isKo
        ? '지금은 분석 서버가 잠시 지연되고 있습니다. 잠시 후 다시 시도해 주세요. 투자 판단은 분산과 리스크 관리 원칙을 우선해 주세요.'
        : 'The analysis server is temporarily delayed. Please try again shortly. Prioritize diversification and risk management principles in your investment decisions.';
    }
  }

  const historyStr = conversationHistory
    .slice(-10)
    .map(m => isKo
      ? `${m.role === 'user' ? '사용자' : 'AI 어드바이저'}: ${m.content}`
      : `${m.role === 'user' ? 'User' : 'AI Advisor'}: ${m.content}`)
    .join('\n');

  const portfolioContext = input.portfolioContext
    ? isKo ? `
[사용자 포트폴리오 컨텍스트]
- 총 자산: ${getCurrencySymbol()}${input.portfolioContext.totalAssets.toLocaleString()}
- 투자 등급: ${input.portfolioContext.tier}
- 주요 보유: ${input.portfolioContext.topHoldings.map(h => `${h.name}(${h.ticker}) ${h.allocation}%`).join(', ')}
` : `
[User Portfolio Context]
- Total Assets: ${getCurrencySymbol()}${input.portfolioContext.totalAssets.toLocaleString()}
- Investment Tier: ${input.portfolioContext.tier}
- Top Holdings: ${input.portfolioContext.topHoldings.map(h => `${h.name}(${h.ticker}) ${h.allocation}%`).join(', ')}
`
    : '';

  const prompt = isKo ? `
당신은 AI 투자 어드바이저입니다. 사용자의 재무 상담에 친절하고 전문적으로 응답하세요.

${portfolioContext}

[대화 히스토리]
${historyStr || '(첫 대화)'}

[사용자 질문]
${input.message}

[응답 규칙]
1. 한국어로 자연스럽게 작성한다.
2. 사용자의 포트폴리오 상황을 고려한 맞춤 조언
3. 구체적 수치와 근거 제시
4. 법적 면책: "투자 권유가 아닌 정보 제공 목적"
5. 너무 길지 않게, 핵심 위주로 (300자 내외)
6. 마크다운 없이 순수 텍스트로 응답
` : `
You are an AI investment advisor. Respond to the user's financial questions in a friendly and professional manner.

${portfolioContext}

[Conversation History]
${historyStr || '(First message)'}

[User Question]
${input.message}

[Response Rules]
1. Write naturally in English.
2. Tailor advice based on the user's portfolio situation.
3. Provide specific figures and reasoning.
4. Legal disclaimer: "For informational purposes only, not investment advice."
5. Keep it concise and focused on key points (around 300 characters or less).
6. Respond in plain text without markdown formatting.
`;

  try {
    return await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 30000, maxRetries: 1 });
  } catch (error: unknown) {
    const message = String(error instanceof Error ? error.message : error || '');
    if (isGeminiCredentialError(message) || !API_KEY) {
      try {
        const proxyResponse = await invokeGeminiProxy<ProxyCFOChatResponse>(
          'cfo-chat',
          {
            question: input.message,
            conversationHistory: historyPayload,
          },
          30000,
        );
        return formatCfoProxyResponse(proxyResponse);
      } catch (proxyErr) {
        console.warn('[AICFO] 직접 호출 키 오류 + 프록시 실패:', proxyErr);
      }
    }
    console.warn('AI 버핏 응답 오류:', error);
    return isKo
      ? '현재 AI 상담 서버가 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
      : 'The AI advisor is temporarily unavailable. Please try again shortly.';
  }
};
