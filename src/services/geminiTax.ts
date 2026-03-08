/**
 * geminiTax.ts — 세금 최적화 리포트
 *
 * gemini.ts에서 분리된 세금 분석 모듈.
 */

import {
  API_KEY,
  modelWithSearch,
  callGeminiSafe,
  parseGeminiJson,
  roundTo,
  isGeminiCredentialError,
  getCurrentDisplayLanguage,
  getCurrencySymbol,
} from './geminiCore';
import { invokeGeminiProxy } from './geminiProxy';

import type {
  TaxReportInput,
  TaxReportResult,
} from '../types/marketplace';

// ============================================================================
// 결정론적 폴백 계산
// ============================================================================

function computeTaxReportFallback(input: TaxReportInput): TaxReportResult {
  const totalValue = input.portfolio.reduce((sum, asset) => sum + Math.max(0, Number(asset.currentValue) || 0), 0);
  const gains = input.portfolio.map((asset) => {
    const currentValue = Math.max(0, Number(asset.currentValue) || 0);
    const costBasis = Math.max(0, Number(asset.costBasis) || 0);
    const gain = currentValue - costBasis;
    const purchaseDate = new Date(asset.purchaseDate);
    const daysHeld = Number.isNaN(purchaseDate.getTime())
      ? 365
      : Math.max(0, Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      ticker: asset.ticker,
      name: asset.name,
      currentValue,
      gain,
      daysHeld,
    };
  });

  const positiveGain = gains.reduce((sum, row) => sum + Math.max(0, row.gain), 0);
  const lossAmount = gains.reduce((sum, row) => sum + Math.max(0, -row.gain), 0);
  const taxableGain = input.residency === 'KR'
    ? Math.max(0, positiveGain - lossAmount - 2_500_000)
    : Math.max(0, positiveGain - lossAmount);
  const capitalTaxRate = input.residency === 'KR' ? 0.22 : 0.15;
  const estimatedCapitalGainsTax = Math.round(taxableGain * capitalTaxRate);

  const estimatedDividendTax = Math.round(totalValue * (input.residency === 'KR' ? 0.0018 : 0.0022));
  const totalTaxBurden = estimatedCapitalGainsTax + estimatedDividendTax;
  const effectiveTaxRate = totalValue > 0 ? roundTo((totalTaxBurden / totalValue) * 100, 2) : 0;
  const potentialSaving = Math.round(Math.min(lossAmount, taxableGain) * capitalTaxRate);

  const strategies: TaxReportResult['strategies'] = [
    {
      title: '손익상계 우선 적용',
      description: '평가손실 자산을 연말 전에 점검해 과세 대상 이익을 줄이는 전략입니다.',
      potentialSaving,
      priority: potentialSaving > 0 ? 'HIGH' : 'MEDIUM',
      actionItems: [
        '손실 자산과 이익 자산을 동일 과세연도에 함께 점검하세요.',
        '수수료/세금 포함 실현손익을 기준으로 매도 규모를 결정하세요.',
      ],
    },
    {
      title: input.residency === 'US' ? '장기보유 세율 구간 관리' : '연도 분할 매도 전략',
      description: input.residency === 'US'
        ? '보유기간 1년 경계 전후로 매도 시점을 조절해 세율 차이를 활용합니다.'
        : '대규모 이익 실현을 연도별로 분산해 세금 급증 구간을 완화합니다.',
      potentialSaving: Math.round(estimatedCapitalGainsTax * (input.residency === 'US' ? 0.08 : 0.05)),
      priority: 'MEDIUM',
      actionItems: input.residency === 'US'
        ? ['1년 미만 보유 고수익 자산의 예정 매도일을 재점검하세요.', '단기/장기 보유 구간별 예상 세율을 비교하세요.']
        : ['연말 직전 집중 매도 대신 분할 매도 일정을 세우세요.', '월별 실현손익 누적표를 만들어 과세표준을 관리하세요.'],
    },
    {
      title: '배당·이자 과세 데이터 정합성 점검',
      description: '배당 및 이자 내역이 누락되면 실제 신고세액과 오차가 커질 수 있습니다.',
      potentialSaving: Math.round(estimatedDividendTax * 0.15),
      priority: 'LOW',
      actionItems: ['증권사 연간 손익/배당 명세서를 앱 데이터와 대조하세요.', '누락된 계좌/자산이 없는지 분기별로 확인하세요.'],
    },
  ];

  const sellTimeline: TaxReportResult['sellTimeline'] = gains
    .map((row) => {
      if (row.gain < 0) {
        return {
          ticker: row.ticker,
          name: row.name,
          suggestedAction: 'TAX_LOSS_HARVEST' as const,
          reason: '평가손실 구간으로 손익상계 목적의 실현손실 활용이 가능합니다.',
          optimalTiming: '연말 전 손익 점검 후 실행',
        };
      }

      if (input.residency === 'US' && row.daysHeld < 365 && row.gain > 0) {
        return {
          ticker: row.ticker,
          name: row.name,
          suggestedAction: 'HOLD_FOR_TAX' as const,
          reason: '1년 장기보유 기준 충족 전 매도 시 단기 과세 부담이 커질 수 있습니다.',
          optimalTiming: '장기보유 요건 충족 직후',
        };
      }

      return {
        ticker: row.ticker,
        name: row.name,
        suggestedAction: row.gain > row.currentValue * 0.2 ? 'SELL_NOW' as const : 'HOLD_FOR_TAX' as const,
        reason: row.gain > row.currentValue * 0.2
          ? '수익률이 높아 분할 이익실현으로 변동성·세금 리스크를 관리할 필요가 있습니다.'
          : '세금 및 포지션 유지 균형 관점에서 관망이 유리합니다.',
        optimalTiming: row.gain > row.currentValue * 0.2 ? '이번 분기 내 분할 실행' : '다음 분기 실적 확인 후 판단',
      };
    })
    .slice(0, 8);

  const currentYear = new Date().getFullYear();
  const annualPlan: TaxReportResult['annualPlan'] = [
    { quarter: `Q1 ${currentYear}`, actions: ['전년 실현손익 확정 및 신고자료 정리', '손실 상계 후보 자산 점검'] },
    { quarter: `Q2 ${currentYear}`, actions: ['상반기 누적 손익 점검', '배당/이자 내역 누락 여부 점검'] },
    { quarter: `Q3 ${currentYear}`, actions: ['연말 전 손익상계 시뮬레이션 실행', '과세연도 분산 매도 초안 작성'] },
    { quarter: `Q4 ${currentYear}`, actions: ['손익상계 대상 확정', '연말 분할 매도 및 증빙 자료 보관'] },
  ];

  return {
    residency: input.residency,
    taxSummary: {
      estimatedCapitalGainsTax,
      estimatedIncomeTax: estimatedDividendTax,
      totalTaxBurden,
      effectiveTaxRate,
    },
    strategies,
    sellTimeline,
    annualPlan,
    generatedAt: new Date().toISOString(),
  };
}

async function generateTaxReportViaProxy(input: TaxReportInput): Promise<TaxReportResult> {
  return invokeGeminiProxy<TaxReportResult>('tax-report', input, 30000);
}

// ============================================================================
// 메인 generateTaxReport 함수
// ============================================================================

export const generateTaxReport = async (
  input: TaxReportInput
): Promise<TaxReportResult> => {
  const isKo = getCurrentDisplayLanguage() === 'ko';

  const portfolioStr = input.portfolio
    .map(a => isKo
      ? `${a.name}(${a.ticker}): 현재 ${getCurrencySymbol()}${a.currentValue.toLocaleString()} / ` +
        `매수 ${getCurrencySymbol()}${a.costBasis.toLocaleString()} / ${a.quantity}주 / 매수일 ${a.purchaseDate}`
      : `${a.name}(${a.ticker}): Current ${getCurrencySymbol()}${a.currentValue.toLocaleString()} / ` +
        `Cost basis ${getCurrencySymbol()}${a.costBasis.toLocaleString()} / ${a.quantity} shares / Purchased ${a.purchaseDate}`
    )
    .join('\n');

  const residencyLabel = isKo
    ? (input.residency === 'KR' ? '한국' : '미국')
    : (input.residency === 'KR' ? 'South Korea' : 'United States');

  const prompt = isKo ? `
당신은 세무 전문가(CPA/세무사)입니다. 사용자의 포트폴리오에 대한 세금 최적화 분석을 제공하세요.

[사용자 정보]
- 거주지: ${residencyLabel}
${input.annualIncome ? `- 연 소득: ${getCurrencySymbol()}${input.annualIncome.toLocaleString()}` : '- 연 소득: 미입력'}

[보유 포트폴리오]
${portfolioStr}

${input.residency === 'KR' ?
  '[한국 세법 적용]\n- 해외주식 양도소득세: 연 250만원 공제 후 22%\n- 금융소득종합과세: 2000만원 초과 시\n- ISA/연금저축 활용 여부 검토' :
  '[미국 세법 적용]\n- Long-term vs Short-term Capital Gains\n- Tax-Loss Harvesting\n- Wash Sale Rule 주의'}

[출력 형식] JSON만 반환
중요: 유효한 JSON만 반환. 금액은 숫자(KRW). 실제 세법 기반 정확한 계산.
` : `
You are a certified tax professional (CPA/Tax Advisor). Provide a tax optimization analysis for the user's portfolio.

[User Information]
- Residency: ${residencyLabel}
${input.annualIncome ? `- Annual Income: ${getCurrencySymbol()}${input.annualIncome.toLocaleString()}` : '- Annual Income: Not provided'}

[Current Portfolio]
${portfolioStr}

${input.residency === 'KR' ?
  '[Korean Tax Law]\n- Overseas stock capital gains tax: 22% after ₩2.5M annual deduction\n- Comprehensive financial income tax: applies above ₩20M' :
  '[US Tax Law]\n- Long-term vs Short-term Capital Gains\n- Tax-Loss Harvesting\n- Beware of Wash Sale Rule'}

[Output Format] Return only JSON
Important: Return valid JSON only. Amounts as numbers (KRW). Base calculations on actual tax law.
`;

  const shouldPreferProxy = !__DEV__;
  if (shouldPreferProxy || !API_KEY) {
    try {
      return await generateTaxReportViaProxy(input);
    } catch (proxyErr) {
      console.warn('[TaxReport] 프록시 실패, 결정론 폴백 사용:', proxyErr);
      return computeTaxReportFallback(input);
    }
  }

  try {
    const text = await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 30000, maxRetries: 1 });
    try {
      return parseGeminiJson<TaxReportResult>(text);
    } catch (parseErr) {
      console.warn('[TaxReport] JSON 파싱 실패, 결정론 폴백 사용:', parseErr);
      return computeTaxReportFallback(input);
    }
  } catch (error: unknown) {
    const message = String(error instanceof Error ? error.message : error || '');
    if (isGeminiCredentialError(message) || !API_KEY) {
      try {
        return await generateTaxReportViaProxy(input);
      } catch (proxyErr) {
        console.warn('[TaxReport] 직접 호출 키 오류 + 프록시 실패, 폴백 사용:', proxyErr);
      }
    }
    console.warn('세금 리포트 생성 오류:', error);
    return computeTaxReportFallback(input);
  }
};
