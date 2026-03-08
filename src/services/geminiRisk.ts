/**
 * geminiRisk.ts — 포트폴리오 리스크 분석 (Panic Shield & FOMO Vaccine)
 *
 * gemini.ts에서 분리된 리스크 분석 모듈.
 */

import {
  API_KEY,
  modelWithSearch,
  callGeminiSafe,
  parseGeminiJson,
  getCurrentDisplayLanguage,
} from './geminiCore';

// ============================================================================
// 타입 정의
// ============================================================================

export interface PortfolioAsset {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  allocation?: number; // 비중 (%)
}

export interface UserProfile {
  age: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentGoal: string;
  dependents: number; // 부양가족 수
}

// Panic Shield 5개 하위 지표 (CNN Fear & Greed 스타일 분해)
export interface PanicSubScores {
  portfolioLoss: number;       // 포트폴리오 손실률 (0-100)
  concentrationRisk: number;   // 자산 집중도 (0-100)
  volatilityExposure: number;  // 변동성 노출 (0-100)
  stopLossProximity: number;   // 손절선 근접도 (0-100)
  marketSentiment: number;     // 시장 심리 (0-100)
}

// FOMO Vaccine 3개 하위 지표 (종목별 경고 근거 분해)
export interface FomoSubScores {
  valuationHeat: number;    // 밸류에이션 과열도 (0-100, PER/PBR 기반)
  shortTermSurge: number;   // 단기 급등률 (0-100, 최근 1개월)
  marketOverheat: number;   // 시장 과열 신호 (0-100, RSI/공매도)
}

export interface RiskAnalysisResult {
  panicShieldIndex: number; // 0-100 (높을수록 안전)
  panicShieldLevel: 'SAFE' | 'CAUTION' | 'DANGER';
  panicShieldReason?: string;
  panicSubScores?: PanicSubScores;
  stopLossGuidelines: {
    ticker: string;
    name: string;
    suggestedStopLoss: number;
    currentLoss: number;
    action: 'HOLD' | 'WATCH' | 'REVIEW';
  }[];
  fomoAlerts: {
    ticker: string;
    name: string;
    overvaluationScore: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
    subScores?: FomoSubScores;
  }[];
  personalizedAdvice: string[];
  portfolioSnapshot: {
    totalValue: number;
    totalGainLoss: number;
    gainLossPercent: number;
    diversificationScore: number;
  };
}

// ============================================================================
// 포트폴리오 리스크 분석
// ============================================================================

export const analyzePortfolioRisk = async (
  portfolio: PortfolioAsset[],
  userProfile?: UserProfile
): Promise<RiskAnalysisResult> => {
  try {
    const profile: UserProfile = userProfile || {
      age: 0,
      riskTolerance: 'moderate',
      investmentGoal: '사용자 프로필 정보 없음',
      dependents: 0,
    };

    const totalValue = portfolio.reduce((sum, asset) => sum + asset.currentValue, 0);
    const portfolioWithAllocation = portfolio.map(asset => {
      const profitLossRate = asset.avgPrice > 0
        ? ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100
        : 0;
      return {
        ...asset,
        allocation: totalValue > 0 ? (asset.currentValue / totalValue) * 100 : 0,
        profit_loss_rate: profitLossRate,
        gainLossPercent: profitLossRate,
      };
    });

    const today = new Date();
    const isKo = getCurrentDisplayLanguage() === 'ko';
    const dateStr = isKo
      ? `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
      : `${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

    const prompt = isKo ? `
당신은 행동재무학 전문가입니다. 다음 포트폴리오를 분석하여 "Panic Shield"와 "FOMO Vaccine" 지표를 계산해주세요.

**[중요] 실시간 시장 데이터 활용:**
- Google Search로 각 종목의 *오늘* 시장 상황을 검색하세요
- 검색 키워드 예시: "${portfolioWithAllocation.map(p => p.ticker).join(' 주가')}", "VIX 지수", "공포탐욕지수"
- 실시간 뉴스를 기반으로 리스크 평가에 반영하세요

**오늘 날짜:** ${dateStr}

**사용자 프로필:**
${profile.age > 0 ? `- 나이: ${profile.age}세` : '- 나이: 정보 없음 (포트폴리오 데이터 기반으로 분석)'}
- 투자 성향: ${profile.riskTolerance}
- 투자 목표: ${profile.investmentGoal}
${profile.dependents > 0 ? `- 부양가족: ${profile.dependents}명` : '- 부양가족: 정보 없음'}

**포트폴리오 (수익률 포함):**
${JSON.stringify(portfolioWithAllocation.map(p => ({
  ticker: p.ticker,
  name: p.name,
  quantity: p.quantity,
  avgPrice: p.avgPrice,
  currentPrice: p.currentPrice,
  currentValue: p.currentValue,
  allocation: p.allocation.toFixed(1) + '%',
  profit_loss_rate: p.profit_loss_rate.toFixed(2) + '%',
})), null, 2)}

**수익률 기반 분석 지침:**
- profit_loss_rate > +30%: FOMO 고위험 (익절 검토)
- profit_loss_rate > +50%: FOMO 최고위험 (부분 익절 강력 권고)
- profit_loss_rate < -10%: Panic 주의 (손절선 확인)
- profit_loss_rate < -20%: Panic 위험 (즉각 행동 필요)

**분석 요청:**

1. **Panic Shield Index (0-100)**
   - 포트폴리오의 전반적인 안정성 점수
   - 70 이상: SAFE (안전)
   - 40-69: CAUTION (주의)
   - 40 미만: DANGER (위험)

2. **손절 가이드라인** — 각 자산별 권장 손절선 (%)

3. **FOMO Vaccine (고평가 경고)** — profit_loss_rate가 높은 자산 우선 분석

4. **맞춤 조언** — 3가지 핵심 조언

**출력 형식 (JSON만, 마크다운 코드블록 금지):**
{
  "panicShieldIndex": number,
  "panicShieldLevel": "SAFE" | "CAUTION" | "DANGER",
  "panicShieldReason": "한 줄 설명",
  "panicSubScores": { "portfolioLoss": 0-100, "concentrationRisk": 0-100, "volatilityExposure": 0-100, "stopLossProximity": 0-100, "marketSentiment": 0-100 },
  "stopLossGuidelines": [...],
  "fomoAlerts": [{ "ticker": "NVDA", "name": "엔비디아", "overvaluationScore": 75, "severity": "HIGH", "reason": "설명", "subScores": { "valuationHeat": 0-100, "shortTermSurge": 0-100, "marketOverheat": 0-100 } }],
  "personalizedAdvice": ["조언1", "조언2", "조언3"],
  "diversificationScore": number
}
` : `
You are a behavioral finance expert. Analyze the following portfolio and calculate the "Panic Shield" and "FOMO Vaccine" metrics.

**[IMPORTANT] Use real-time market data:**
- Use Google Search to look up today's market situation for each ticker
- Example search queries: "${portfolioWithAllocation.map(p => p.ticker).join(' stock price')}", "VIX index", "Fear & Greed index"
- Incorporate real-time news into your risk assessment

**Today's Date:** ${dateStr}

**User Profile:**
${profile.age > 0 ? `- Age: ${profile.age}` : '- Age: Not provided (analyze based on portfolio data)'}
- Risk tolerance: ${profile.riskTolerance}
- Investment goal: ${profile.investmentGoal}
${profile.dependents > 0 ? `- Dependents: ${profile.dependents}` : '- Dependents: Not provided'}

**Portfolio (including return rates):**
${JSON.stringify(portfolioWithAllocation.map(p => ({
  ticker: p.ticker,
  name: p.name,
  quantity: p.quantity,
  avgPrice: p.avgPrice,
  currentPrice: p.currentPrice,
  currentValue: p.currentValue,
  allocation: p.allocation.toFixed(1) + '%',
  profit_loss_rate: p.profit_loss_rate.toFixed(2) + '%',
})), null, 2)}

**Return-based analysis guidelines:**
- profit_loss_rate > +30%: FOMO high risk
- profit_loss_rate > +50%: FOMO extreme risk
- profit_loss_rate < -10%: Panic caution
- profit_loss_rate < -20%: Panic danger

**Output format (JSON only, no markdown code blocks):**
{
  "panicShieldIndex": number,
  "panicShieldLevel": "SAFE" | "CAUTION" | "DANGER",
  "panicShieldReason": "One-line explanation",
  "panicSubScores": { "portfolioLoss": 0-100, "concentrationRisk": 0-100, "volatilityExposure": 0-100, "stopLossProximity": 0-100, "marketSentiment": 0-100 },
  "stopLossGuidelines": [...],
  "fomoAlerts": [{ "ticker": "NVDA", "name": "NVIDIA", "overvaluationScore": 75, "severity": "HIGH", "reason": "explanation", "subScores": { "valuationHeat": 0-100, "shortTermSurge": 0-100, "marketOverheat": 0-100 } }],
  "personalizedAdvice": ["advice1", "advice2", "advice3"],
  "diversificationScore": number
}
`;

    const responseText = await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 60000, maxRetries: 1 });
    const analysisResult = parseGeminiJson(responseText);

    const totalCostBasis = portfolio.reduce(
      (sum, asset) => sum + (asset.avgPrice * asset.quantity),
      0
    );
    const totalGainLoss = totalValue - totalCostBasis;
    const gainLossPercent = totalCostBasis > 0
      ? (totalGainLoss / totalCostBasis) * 100
      : 0;

    return {
      panicShieldIndex: analysisResult.panicShieldIndex || 50,
      panicShieldLevel: analysisResult.panicShieldLevel || 'CAUTION',
      panicShieldReason: analysisResult.panicShieldReason || undefined,
      panicSubScores: analysisResult.panicSubScores || undefined,
      stopLossGuidelines: analysisResult.stopLossGuidelines || [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fomoAlerts: (analysisResult.fomoAlerts || []).map((alert: any) => ({
        ...alert,
        subScores: alert.subScores || undefined,
      })),
      personalizedAdvice: analysisResult.personalizedAdvice || [],
      portfolioSnapshot: {
        totalValue,
        totalGainLoss,
        gainLossPercent,
        diversificationScore: analysisResult.diversificationScore || 50,
      },
    };

  } catch (error) {
    console.warn("[Portfolio Risk] 분석 실패 (폴백값 사용):", error instanceof Error ? error.message : error);

    if (!API_KEY) {
      console.warn('[Portfolio Risk] API 키가 없습니다. .env 파일을 확인하세요.');
    }

    const totalValue = portfolio.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalCostBasis = portfolio.reduce(
      (sum, asset) => sum + (asset.avgPrice * asset.quantity),
      0
    );

    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError = errorMessage.includes('Network request failed');
    const isAPIKeyError = errorMessage.includes('API_KEY_INVALID') || !API_KEY;

    let adviceMessages = [
      '포트폴리오 분석 중 오류가 발생했습니다.',
      '잠시 후 다시 시도해주세요.',
    ];

    if (isNetworkError) {
      adviceMessages = [
        '⚠️ 네트워크 연결 오류',
        'Wi-Fi 또는 모바일 데이터 연결을 확인해주세요.',
        '앱을 완전히 종료 후 재시작해보세요.',
      ];
    } else if (isAPIKeyError) {
      adviceMessages = [
        '⚠️ API 설정 오류',
        '앱을 재시작해주세요. (설정 → 앱 강제 종료)',
        '문제가 지속되면 개발자에게 문의해주세요.',
      ];
    }

    return {
      panicShieldIndex: 50,
      panicShieldLevel: 'CAUTION',
      stopLossGuidelines: [],
      fomoAlerts: [],
      personalizedAdvice: adviceMessages,
      portfolioSnapshot: {
        totalValue,
        totalGainLoss: totalValue - totalCostBasis,
        gainLossPercent: totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0,
        diversificationScore: 50,
      },
    };
  }
};
