/**
 * geminiWhatIf.ts — What-If 시뮬레이터 (Beta 기반 시나리오 분석)
 *
 * gemini.ts에서 분리된 What-If 모듈.
 */

import {
  API_KEY,
  modelWithSearch,
  callGeminiSafe,
  parseGeminiJson,
  isGeminiCredentialError,
  getCurrentDisplayLanguage,
  getCurrencySymbol,
} from './geminiCore';
import { invokeGeminiProxy } from './geminiProxy';

import type {
  WhatIfInput,
  WhatIfResult,
} from '../types/marketplace';

// ============================================================================
// Beta 매트릭스
// ============================================================================

type AssetClass = 'crypto' | 'high_vol_tech' | 'gold' | 'bond' | 'defensive' | 'korean' | 'reit' | 'energy' | 'large_value';

const BETA_MATRIX: Record<string, Record<AssetClass, number>> = {
  market_crash: {
    crypto: 1.8, high_vol_tech: 1.4, gold: -0.3, bond: -0.2,
    defensive: 0.6, korean: 1.2, reit: 0.9, energy: 0.8, large_value: 0.95,
  },
  interest_rate_change: {
    crypto: 0.8, high_vol_tech: 1.1, gold: 0.4, bond: 1.6,
    defensive: 0.3, korean: 0.7, reit: 1.4, energy: 0.5, large_value: 0.6,
  },
  stock_crash: {
    crypto: 0.3, high_vol_tech: 0.8, gold: -0.1, bond: -0.1,
    defensive: 0.2, korean: 0.5, reit: 0.3, energy: 0.4, large_value: 0.6,
  },
  currency_change: {
    crypto: 0.5, high_vol_tech: 0.3, gold: 0.6, bond: 0.2,
    defensive: 0.2, korean: 1.5, reit: 0.8, energy: 0.7, large_value: 0.3,
  },
  custom: {
    crypto: 1.8, high_vol_tech: 1.4, gold: -0.3, bond: -0.2,
    defensive: 0.6, korean: 1.2, reit: 0.9, energy: 0.8, large_value: 0.95,
  },
};

function classifyAsset(ticker: string): AssetClass {
  const t = ticker.toUpperCase();
  if (['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'ADA', 'BNB', 'AVAX', 'DOT', 'MATIC'].includes(t)) return 'crypto';
  if (['NVDA', 'TSLA', 'META', 'AMD', 'PLTR', 'COIN', 'SHOP', 'SQ', 'SNOW'].includes(t)) return 'high_vol_tech';
  if (['GLD', 'IAU', 'GOLD', 'SLV', 'PPLT'].includes(t)) return 'gold';
  if (['TLT', 'AGG', 'BND', 'SHY', 'IEF', 'LQD', 'HYG', 'TIPS'].includes(t)) return 'bond';
  if (['BRK.B', 'JNJ', 'KO', 'PG', 'WMT', 'PEP', 'CL', 'MCD'].includes(t)) return 'defensive';
  if (['VNQ', 'O', 'IYR', 'XLRE', 'SPG'].includes(t)) return 'reit';
  if (['XOM', 'CVX', 'CEG', 'OXY', 'COP', 'SLB'].includes(t)) return 'energy';
  if (t.match(/^\d{6}$/) || ['삼성전자', '005930', 'SK하이닉스', '000660'].includes(t)) return 'korean';
  return 'large_value';
}

function getAssetBeta(ticker: string, scenario: string = 'market_crash'): number {
  const assetClass = classifyAsset(ticker);
  const matrix = BETA_MATRIX[scenario] || BETA_MATRIX.market_crash;
  return matrix[assetClass];
}

function getImpactLevel(changePercent: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  const abs = Math.abs(changePercent);
  if (abs >= 15) return 'HIGH';
  if (abs >= 5) return 'MEDIUM';
  return 'LOW';
}

function getScenarioExplanation(scenario: string, assetClass: AssetClass, beta: number): string {
  const lang = getCurrentDisplayLanguage();

  const explanations: Record<string, Record<string, Partial<Record<AssetClass, string>>>> = {
    ko: {
      market_crash: { crypto: '암호화폐는 위험자산 선호 후퇴 시 가장 크게 하락하는 경향', high_vol_tech: '고변동 기술주는 시장 폭락 시 평균 이상 하락', gold: '금은 대표적 안전자산으로 위기 시 가치 상승', bond: '채권은 안전자산 수요 증가로 소폭 상승 경향', defensive: '방어주는 필수소비재 특성상 상대적으로 안정적', reit: '부동산은 경기침체 우려로 하락하지만 시장보다는 덜', korean: '한국 주식은 외국인 자금 유출로 추가 하락 압력' },
      interest_rate_change: { crypto: '암호화폐는 금리 변동에 간접적으로만 영향', high_vol_tech: '기술주는 미래 수익 할인율 상승으로 하락 압력', gold: '금은 금리 인상 시 기회비용 증가로 소폭 하락', bond: '채권은 금리 변동에 가장 민감한 자산, 가격 하락', defensive: '배당 안정주는 금리 영향이 상대적으로 적음', reit: '리츠/부동산은 이자비용 증가로 큰 타격', korean: '금리 인상은 신흥국 자금 유출을 유발, 한국 주식 하락' },
      stock_crash: { crypto: '개별 종목 이슈는 암호화폐에 미미한 영향', high_vol_tech: '같은 섹터 종목은 심리적 연쇄 하락 가능', gold: '개별 종목 이슈와 무관한 안전자산', bond: '개별 종목 이슈와 무관한 채권', defensive: '방어주는 개별 종목 폭락의 간접 영향 제한적', korean: '한국 시장은 글로벌 개별주 이슈에 제한적 영향' },
      currency_change: { crypto: '암호화폐는 달러 기반이라 환율 영향 중간 수준', high_vol_tech: '미국 기술주는 원화 환산 시 환율 이익/손실 발생', gold: '금은 달러 표시 자산으로 환율 반영 직접 영향', bond: '채권은 환율 변동에 상대적으로 적은 영향', defensive: '미국 방어주도 환율 환산 영향은 제한적', reit: '리츠는 환율과 금리 모두에 민감', korean: '원화 약세 시 한국 주식은 외국인 매도 압력 증가' },
    },
    ja: {
      market_crash: { crypto: '暗号資産はリスクオフ時に最も大きく下落する傾向', high_vol_tech: '高ボラティリティのテック株は市場暴落時に平均以上下落', gold: '金は代表的な安全資産で危機時に価値が上昇', bond: '債券は安全資産への需要増加で小幅上昇する傾向', defensive: 'ディフェンシブ株は生活必需品の性質上比較的安定', reit: '不動産は景気後退懸念で下落するが市場ほどではない', korean: '韓国株式は外国人資金流出により追加的な下落圧力' },
      interest_rate_change: { crypto: '暗号資産は金利変動に間接的にのみ影響', high_vol_tech: 'テック株は将来収益の割引率上昇により下落圧力', gold: '金は金利上昇時に機会費用増加で小幅下落', bond: '債券は金利変動に最も敏感な資産、価格が下落', defensive: '配当安定株は金利の影響が比較的少ない', reit: 'REIT/不動産は利払いコスト増加で大きな打撃', korean: '金利上昇は新興国からの資金流出を誘発、韓国株式下落' },
      stock_crash: { crypto: '個別銘柄の問題は暗号資産にほとんど影響なし', high_vol_tech: '同セクターの銘柄は心理的な連鎖下落の可能性', gold: '個別銘柄の問題とは無関係の安全資産', bond: '個別銘柄の問題とは無関係の債券', defensive: 'ディフェンシブ株は個別銘柄暴落の間接的影響が限定的', korean: '韓国市場はグローバル個別株の問題に限定的な影響' },
      currency_change: { crypto: '暗号資産はドルベースのため為替影響は中程度', high_vol_tech: '米国テック株はウォン換算時に為替損益が発生', gold: '金はドル建て資産で為替が直接影響', bond: '債券は為替変動に比較的少ない影響', defensive: '米国ディフェンシブ株も為替換算の影響は限定的', reit: 'REITは為替と金利の両方に敏感', korean: 'ウォン安時に韓国株式は外国人の売り圧力増加' },
    },
    en: {
      market_crash: { crypto: 'Crypto tends to drop the most during risk-off sentiment', high_vol_tech: 'High-volatility tech falls more than average during crashes', gold: 'Gold is a classic safe-haven asset that gains value in crises', bond: 'Bonds tend to rise slightly from increased safe-haven demand', defensive: 'Defensive stocks are relatively stable due to consumer staple nature', reit: 'Real estate declines on recession fears but less than the market', korean: 'Korean stocks face additional selling pressure from foreign outflows' },
      interest_rate_change: { crypto: 'Crypto is only indirectly affected by rate changes', high_vol_tech: 'Tech faces downward pressure from higher discount rates', gold: 'Gold declines slightly from increased opportunity cost during rate hikes', bond: 'Bonds are the most rate-sensitive asset, prices decline', defensive: 'Dividend-stable stocks are relatively less affected by rates', reit: 'REITs are hit hard by increased interest costs', korean: 'Rate hikes trigger emerging market outflows, Korean stocks decline' },
      stock_crash: { crypto: 'Individual stock issues have minimal impact on crypto', high_vol_tech: 'Same-sector stocks may face psychological chain selling', gold: 'Safe-haven asset unrelated to individual stock issues', bond: 'Bonds are unrelated to individual stock issues', defensive: 'Defensive stocks have limited indirect impact from individual crashes', korean: 'Korean market has limited exposure to global individual stock issues' },
      currency_change: { crypto: 'Crypto has moderate FX impact as dollar-based assets', high_vol_tech: 'US tech stocks generate FX gains/losses when converted to KRW', gold: 'Gold is directly affected by FX as a dollar-denominated asset', bond: 'Bonds are relatively less affected by FX fluctuations', defensive: 'US defensive stocks also have limited FX conversion impact', reit: 'REITs are sensitive to both FX and interest rates', korean: 'Korean stocks face increased foreign selling pressure during KRW weakness' },
    },
  };

  const langMap = explanations[lang] || explanations.en;
  const scenarioMap = langMap[scenario] || langMap.market_crash;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (scenarioMap[assetClass]) return scenarioMap[assetClass]!;
  if (lang === 'ko') {
    return beta < 0 ? '이 시나리오에서 방어적으로 작용하는 자산' : beta >= 1.5 ? '이 시나리오에서 가장 크게 영향받는 자산' : beta <= 0.7 ? '이 시나리오에서 상대적으로 안정적인 자산' : '이 시나리오에서 중간 수준의 영향';
  } else if (lang === 'ja') {
    return beta < 0 ? 'このシナリオで防御的に作用する資産' : beta >= 1.5 ? 'このシナリオで最も大きく影響を受ける資産' : beta <= 0.7 ? 'このシナリオで比較的安定した資産' : 'このシナリオで中程度の影響';
  }
  return beta < 0 ? 'Defensive asset in this scenario' : beta >= 1.5 ? 'Most impacted asset in this scenario' : beta <= 0.7 ? 'Relatively stable asset in this scenario' : 'Moderately impacted in this scenario';
}

function computeWhatIfFallback(input: WhatIfInput, magnitude: number): WhatIfResult {
  const currentTotal = input.portfolio.reduce((s, a) => s + a.currentValue, 0);
  const lang = getCurrentDisplayLanguage();

  const assetImpacts = input.portfolio.map(a => {
    const beta = getAssetBeta(a.ticker, input.scenario);
    const changePercent = Math.round(magnitude * beta * 10) / 10;
    const projectedValue = Math.round(a.currentValue * (1 + changePercent / 100));
    return {
      ticker: a.ticker,
      name: a.name,
      currentValue: a.currentValue,
      projectedValue,
      changePercent,
      impactLevel: getImpactLevel(changePercent),
      explanation: getScenarioExplanation(input.scenario, classifyAsset(a.ticker), beta),
    };
  });

  const projectedTotal = assetImpacts.reduce((s, a) => s + a.projectedValue, 0);
  const changeAmount = projectedTotal - currentTotal;
  const changePercent = currentTotal > 0
    ? Math.round((changeAmount / currentTotal) * 1000) / 10
    : 0;

  const highImpactAssets = assetImpacts.filter(a => a.impactLevel === 'HIGH');
  const safeAssets = assetImpacts.filter(a => a.changePercent > 0);

  const highNames = highImpactAssets.map(a => a.name).join(', ');
  const safeNames = safeAssets.map(a => a.name).join(', ');
  const chgStr = `${changePercent > 0 ? '+' : ''}${changePercent}%`;

  const summaryText = lang === 'ko'
    ? `이 시나리오에서 포트폴리오는 약 ${chgStr} 영향을 받을 것으로 추정됩니다. ${highImpactAssets.length > 0 ? `${highNames}이(가) 가장 큰 영향을 받습니다.` : '전체적으로 안정적인 구성입니다.'}`
    : lang === 'ja'
    ? `このシナリオでは、ポートフォリオは約${chgStr}の影響を受けると推定されます。${highImpactAssets.length > 0 ? `${highNames}が最も大きな影響を受けます。` : '全体的に安定した構成です。'}`
    : `Under this scenario, the portfolio is estimated to be impacted by approximately ${chgStr}. ${highImpactAssets.length > 0 ? `${highNames} would be most affected.` : 'The overall composition is relatively stable.'}`;

  const vulnText = highImpactAssets.length > 0
    ? (lang === 'ko' ? `${highNames} — 고변동 자산 비중 주의` : lang === 'ja' ? `${highNames} — 高変動資産の比重に注意` : `${highNames} — Watch high-volatility asset allocation`)
    : (lang === 'ko' ? '현재 포트폴리오는 비교적 안정적 구성' : lang === 'ja' ? '現在のポートフォリオは比較的安定した構成です' : 'Current portfolio has a relatively stable composition');

  const hedgeText = safeAssets.length > 0
    ? (lang === 'ko' ? `${safeNames} 등 안전자산이 방어 역할` : lang === 'ja' ? `${safeNames}などの安全資産が防御的役割` : `${safeNames} act as defensive safe-haven assets`)
    : (lang === 'ko' ? '금(GLD) 또는 채권(TLT) ETF 추가를 고려해 보세요' : lang === 'ja' ? '金（GLD）または債券（TLT）ETFの追加を検討してください' : 'Consider adding gold (GLD) or bond (TLT) ETFs');

  return {
    scenario: input.description,
    summary: summaryText,
    totalImpact: { currentTotal, projectedTotal, changePercent, changeAmount },
    assetImpacts,
    riskAssessment: {
      overallRisk: Math.abs(changePercent) >= 15 ? 'HIGH' : Math.abs(changePercent) >= 5 ? 'MEDIUM' : 'LOW',
      vulnerabilities: [vulnText],
      hedgingSuggestions: [hedgeText],
    },
    generatedAt: new Date().toISOString(),
  };
}

async function generateWhatIfViaProxy(input: WhatIfInput): Promise<WhatIfResult> {
  return invokeGeminiProxy<WhatIfResult>('what-if', input, 30000);
}

// ============================================================================
// 메인 generateWhatIf 함수
// ============================================================================

export const generateWhatIf = async (
  input: WhatIfInput
): Promise<WhatIfResult> => {
  const isKo = getCurrentDisplayLanguage() === 'ko';

  const portfolioStr = input.portfolio
    .map(a => isKo
      ? `${a.name}(${a.ticker}): ${getCurrencySymbol()}${a.currentValue.toLocaleString()} / 비중 ${a.allocation}%`
      : `${a.name}(${a.ticker}): ${getCurrencySymbol()}${a.currentValue.toLocaleString()} / Weight ${a.allocation}%`)
    .join('\n');

  const magnitude = input.magnitude || -20;

  const scenarioKey = input.scenario === 'custom' ? 'market_crash' : input.scenario;
  const betaTable = BETA_MATRIX[scenarioKey] || BETA_MATRIX.market_crash;

  const scenarioLabels: Record<string, string> = isKo ? {
    market_crash: '시장 폭락',
    interest_rate_change: '금리 변동',
    stock_crash: '종목 폭락',
    currency_change: '환율 변동',
  } : {
    market_crash: 'Market Crash',
    interest_rate_change: 'Interest Rate Change',
    stock_crash: 'Stock Crash',
    currency_change: 'Currency Shift',
  };
  const scenarioLabel = scenarioLabels[scenarioKey] || (isKo ? '시장 변동' : 'Market Movement');

  const betaGuideStr = isKo ? [
    `- 고변동 기술주 (NVDA, TSLA, META): beta ${betaTable.high_vol_tech}`,
    `- 대형 가치주 (AAPL, MSFT, GOOGL): beta ${betaTable.large_value}`,
    `- 방어주/가치주 (BRK.B, JNJ, KO): beta ${betaTable.defensive}`,
    `- 금/금ETF (GLD, IAU): beta ${betaTable.gold}`,
    `- 채권ETF (TLT, AGG, BND): beta ${betaTable.bond}`,
    `- 암호화폐 (BTC, ETH, XRP): beta ${betaTable.crypto}`,
    `- 에너지 (XOM, CEG): beta ${betaTable.energy}`,
    `- 리츠/부동산 (VNQ, O): beta ${betaTable.reit}`,
    `- 한국주식 (삼성전자, SK하이닉스): beta ${betaTable.korean}`,
  ].join('\n') : [
    `- High-vol tech (NVDA, TSLA, META): beta ${betaTable.high_vol_tech}`,
    `- Large-cap value (AAPL, MSFT, GOOGL): beta ${betaTable.large_value}`,
    `- Defensive/value (BRK.B, JNJ, KO): beta ${betaTable.defensive}`,
    `- Gold/Gold ETF (GLD, IAU): beta ${betaTable.gold}`,
    `- Bond ETF (TLT, AGG, BND): beta ${betaTable.bond}`,
    `- Crypto (BTC, ETH, XRP): beta ${betaTable.crypto}`,
    `- Energy (XOM, CEG): beta ${betaTable.energy}`,
    `- REITs (VNQ, O): beta ${betaTable.reit}`,
    `- Korean stocks (Samsung, SK Hynix): beta ${betaTable.korean}`,
  ].join('\n');

  const prompt = isKo ? `
당신은 골드만삭스 출신 리스크 관리 전문가(CRM)입니다.
사용자의 포트폴리오에 특정 시나리오가 발생할 경우, 자산별로 **서로 다른 영향도**를 분석하세요.

[시나리오]
- 유형: ${input.scenario}
- 상세: ${input.description}
- 기준 변동폭: ${magnitude}%

[현재 포트폴리오]
${portfolioStr}

[★★★ 핵심 규칙: 자산 클래스별 감응도(Beta) — ${scenarioLabel} 시나리오 기준 ★★★]
${betaGuideStr}

계산 예시 (${scenarioLabel} ${magnitude}% 시나리오):
- 기술주: ${magnitude}% × ${betaTable.high_vol_tech} = ${(magnitude * betaTable.high_vol_tech).toFixed(1)}%
- 금: ${magnitude}% × ${betaTable.gold} = ${(magnitude * betaTable.gold).toFixed(1)}%${betaTable.gold < 0 ? ' (역상관!)' : ''}

[출력 형식] JSON만 반환:
{ "scenario": "${input.description}", "summary": "...", "totalImpact": { "currentTotal": n, "projectedTotal": n, "changePercent": n, "changeAmount": n }, "assetImpacts": [...], "riskAssessment": { "overallRisk": "HIGH/MEDIUM/LOW", "vulnerabilities": [...], "hedgingSuggestions": [...] }, "generatedAt": "${new Date().toISOString()}" }
` : `
You are a Goldman Sachs risk management expert (CRM).
Analyze the impact of a specific scenario on the user's portfolio, applying **different impact levels** per asset.

[Scenario]
- Type: ${input.scenario}
- Details: ${input.description}
- Base magnitude: ${magnitude}%

[Current Portfolio]
${portfolioStr}

[★★★ Core Rule: Asset Class Beta — ${scenarioLabel} Scenario ★★★]
${betaGuideStr}

[Output Format] Return only JSON:
{ "scenario": "${input.description}", "summary": "...", "totalImpact": { "currentTotal": n, "projectedTotal": n, "changePercent": n, "changeAmount": n }, "assetImpacts": [...], "riskAssessment": { "overallRisk": "HIGH/MEDIUM/LOW", "vulnerabilities": [...], "hedgingSuggestions": [...] }, "generatedAt": "${new Date().toISOString()}" }

Important: Return valid JSON only. Write text in ${getCurrentDisplayLanguage() === 'ja' ? 'Japanese' : 'English'}.
`;

  const shouldPreferProxy = !__DEV__;

  if (shouldPreferProxy || !API_KEY) {
    try {
      return await generateWhatIfViaProxy(input);
    } catch (proxyErr) {
      console.warn('[What-If] 프록시 실패, 로컬 계산 폴백 사용:', proxyErr);
      return computeWhatIfFallback(input, magnitude);
    }
  }

  try {
    const text = await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 30000, maxRetries: 1 });
    try {
      return parseGeminiJson<WhatIfResult>(text);
    } catch (parseErr) {
      console.warn('[What-If] JSON 파싱 실패, 클라이언트 폴백 계산:', parseErr);
      return computeWhatIfFallback(input, magnitude);
    }
  } catch (error: unknown) {
    const message = String(error instanceof Error ? error.message : error || '');
    if (isGeminiCredentialError(message) || !API_KEY) {
      try {
        return await generateWhatIfViaProxy(input);
      } catch (proxyErr) {
        console.warn('[What-If] 직접 호출 키 오류 + 프록시 실패, 로컬 계산 사용:', proxyErr);
      }
    }
    console.warn('What-If 시뮬레이션 오류:', error);
    try {
      return computeWhatIfFallback(input, magnitude);
    } catch {
      throw new Error((error instanceof Error ? error.message : String(error)) || 'What-If 시뮬레이션에 실패했습니다');
    }
  }
};
