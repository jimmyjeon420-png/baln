/**
 * geminiBriefing.ts — 시장 브리핑, 최적 배분, 티커 분류
 *
 * gemini.ts에서 분리된 브리핑/분류 모듈.
 */

import * as Sentry from '@sentry/react-native';
import { getPromptLanguageInstruction, getLangParam } from '../utils/promptLanguage';
import { edgeInvokeErrorMessage, isTransientEdgeInvokeError } from '../utils/edgeInvokeError';
import supabase from './supabase';
import { invokeGeminiProxy } from './geminiProxy';
import {
  model,
  callGeminiSafe,
  parseGeminiJson,
  getCurrentDisplayLanguage,
} from './geminiCore';

import type { PortfolioAsset } from './geminiRisk';

// ============================================================================
// 시장 브리핑
// ============================================================================

export interface MorningBriefingResult {
  macroSummary: {
    title: string;
    highlights: string[];
    interestRateProbability: string;
    marketSentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  };
  portfolioActions: {
    ticker: string;
    name: string;
    action: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    reason: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  realEstateInsight?: {
    title: string;
    analysis: string;
    recommendation: string;
  };
  cfoWeather: {
    emoji: string;
    status: string;
    message: string;
  };
  generatedAt: string;
}

export const generateMorningBriefing = async (
  portfolio: PortfolioAsset[],
  options?: {
    includeRealEstate?: boolean;
    realEstateContext?: string;
    guruStyle?: string;
  }
): Promise<MorningBriefingResult> => {
  try {
    return await invokeGeminiProxy<MorningBriefingResult>(
      'morning-briefing',
      {
        portfolio: portfolio.map((p) => ({
          ticker: p.ticker,
          name: p.name,
          currentValue: p.currentValue,
          avgPrice: p.avgPrice,
          currentPrice: p.currentPrice,
          allocation: p.allocation,
        })),
        options,
      },
      30000
    );

  } catch (error) {
    if (isTransientEdgeInvokeError(error)) {
      console.warn('[MorningBriefing] 일시적 네트워크/앱 상태 오류:', edgeInvokeErrorMessage(error));
    } else {
      console.warn('Morning Briefing Error:', error);
    }
    Sentry.addBreadcrumb({
      category: 'api',
      message: 'generateMorningBriefing failed',
      level: 'error',
      data: { error: String(error) },
    });
    throw error;
  }
};

// ============================================================================
// 티커 분류
// ============================================================================

export const classifyTicker = async (
  ticker: string,
  name?: string,
): Promise<{ ticker: string; name: string; sector: string; style: string; geo: string } | null> => {
  try {
    const invokeResult = await Promise.race([
      supabase.functions.invoke('gemini-proxy', {
        body: {
          type: 'classify-ticker',
          data: { ticker, name },
          lang: getLangParam(),
        },
      }),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: '타임아웃' } }), 15000)
      ),
    ]);

    const { data, error } = invokeResult;
    if (error || !data?.success) return null;

    const profile = data.data;
    if (!profile?.ticker || !profile?.style) return null;

    const { saveDynamicProfile } = await import('../data/tickerProfile');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await saveDynamicProfile(profile as any);

    return profile;
  } catch {
    return null;
  }
};

// ============================================================================
// 배분 최적화
// ============================================================================

export interface OptimalAllocationInput {
  assets: PortfolioAsset[];
  currentHealthScore: number;
  targetAllocation?: Record<string, number>;
}

export interface OptimalAllocationResult {
  summary: string;
  recommendations: {
    ticker: string;
    name: string;
    currentAllocation: number;
    suggestedAllocation: number;
    adjustmentPercent: number;
    reason: string;
  }[];
  expectedHealthScore: number;
  expectedImprovement: number;
  generatedAt: string;
}

export const generateOptimalAllocation = async (
  input: OptimalAllocationInput
): Promise<OptimalAllocationResult> => {
  try {
    const totalValue = input.assets.reduce((s, a) => s + a.currentValue, 0);

    const assetsSummary = input.assets.slice(0, 5).map(a => ({
      ticker: a.ticker,
      name: a.name,
      allocation: totalValue > 0 ? ((a.currentValue / totalValue) * 100).toFixed(1) : '0',
      value: a.currentValue,
    }));

    const isKo = getCurrentDisplayLanguage() === 'ko';
    const prompt = isKo ? `
당신은 포트폴리오 최적화 전문가입니다. 다음 포트폴리오의 건강 점수를 최대화하는 배분을 제안하세요.

**현재 포트폴리오 (상위 5개):**
${JSON.stringify(assetsSummary, null, 2)}

**현재 건강 점수:** ${input.currentHealthScore}점

**최적화 목표:**
1. 건강 점수 최대화 (목표: 80점 이상)
2. 배분 이탈도 최소화 (균형 잡힌 포트폴리오)
3. 리스크 분산 (단일 자산 과도 집중 방지)

**출력 형식 (JSON만):**
{
  "summary": "전체 요약 1-2문장",
  "recommendations": [
    { "ticker": "NVDA", "name": "엔비디아", "currentAllocation": 25.0, "suggestedAllocation": 20.0, "adjustmentPercent": -20, "reason": "집중도 완화로 리스크 분산" }
  ],
  "expectedHealthScore": 90,
  "expectedImprovement": 10
}

중요: 유효한 JSON만 반환. 마크다운 금지. ${getPromptLanguageInstruction()}
` : `
You are a portfolio optimization expert. Suggest an allocation that maximizes the Health Score for the following portfolio.

**Current Portfolio (top 5 holdings):**
${JSON.stringify(assetsSummary, null, 2)}

**Current Health Score:** ${input.currentHealthScore}

**Output format (JSON only):**
{
  "summary": "Overall summary in 1-2 sentences",
  "recommendations": [
    { "ticker": "NVDA", "name": "NVIDIA", "currentAllocation": 25.0, "suggestedAllocation": 20.0, "adjustmentPercent": -20, "reason": "Reduce concentration to improve diversification" }
  ],
  "expectedHealthScore": 90,
  "expectedImprovement": 10
}

Important: Return valid JSON only. No markdown. ${getPromptLanguageInstruction()}
`;

    const text = await callGeminiSafe(model, prompt);
    const optimizationResult = parseGeminiJson(text);

    return {
      ...optimizationResult,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.warn('배분 최적화 생성 오류:', error);
    throw new Error('배분 최적화 분석에 실패했습니다');
  }
};
