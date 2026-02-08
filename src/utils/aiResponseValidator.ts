/**
 * AI 응답 검증기 — Gemini가 반환한 재무 수치의 합리성 체크
 *
 * 비유: "감사 부서" — AI가 만든 보고서를 출간 전에 수치 검증
 *
 * 검증 규칙:
 * 1. panicShieldIndex: 0~100 범위
 * 2. fomoAlerts overvaluationScore: 0~100 범위
 * 3. portfolioSnapshot.totalValue: 실제 포트폴리오와 ±50% 이내
 * 4. 필수 필드 존재 여부
 *
 * 검증 실패 시: 클라이언트 계산값으로 대체 (자동 보정)
 */

import type { RiskAnalysisResult } from '../services/gemini';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  corrected: boolean;
}

/** panicShieldIndex 범위 보정 (0~100) */
function clampScore(value: number, min = 0, max = 100): number {
  if (typeof value !== 'number' || isNaN(value)) return 50; // 기본값
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * RiskAnalysisResult를 검증하고 필요 시 보정
 * @param result Gemini가 반환한 분석 결과
 * @param clientTotalAssets 클라이언트에서 계산한 총자산
 * @returns 보정된 결과 + 검증 보고서
 */
export function validateAndCorrectRiskAnalysis(
  result: RiskAnalysisResult,
  clientTotalAssets: number,
): { corrected: RiskAnalysisResult; validation: ValidationResult } {
  const warnings: string[] = [];
  let correctedAny = false;
  const corrected = { ...result };

  // 1. panicShieldIndex 범위 체크 (0~100)
  if (typeof result.panicShieldIndex !== 'number' || result.panicShieldIndex < 0 || result.panicShieldIndex > 100) {
    warnings.push(`panicShieldIndex 범위 초과 (${result.panicShieldIndex}) → 보정됨`);
    corrected.panicShieldIndex = clampScore(result.panicShieldIndex);
    correctedAny = true;
  }

  // 2. panicShieldLevel 유효성
  const validLevels = ['SAFE', 'CAUTION', 'DANGER'] as const;
  if (!validLevels.includes(result.panicShieldLevel as any)) {
    // 점수 기반으로 레벨 재산정
    const idx = corrected.panicShieldIndex;
    corrected.panicShieldLevel = idx >= 70 ? 'SAFE' : idx >= 40 ? 'CAUTION' : 'DANGER';
    warnings.push(`panicShieldLevel 무효 (${result.panicShieldLevel}) → ${corrected.panicShieldLevel}`);
    correctedAny = true;
  }

  // 3. fomoAlerts 검증
  if (Array.isArray(result.fomoAlerts)) {
    corrected.fomoAlerts = result.fomoAlerts.map(alert => {
      if (typeof alert.overvaluationScore !== 'number' || alert.overvaluationScore < 0 || alert.overvaluationScore > 100) {
        warnings.push(`fomoAlert ${alert.ticker}: overvaluationScore 보정 (${alert.overvaluationScore})`);
        correctedAny = true;
        return { ...alert, overvaluationScore: clampScore(alert.overvaluationScore) };
      }
      return alert;
    });
  }

  // 4. portfolioSnapshot 총액 검증 (실제 총자산과 ±50% 이내)
  if (result.portfolioSnapshot && clientTotalAssets > 0) {
    const aiTotal = result.portfolioSnapshot.totalValue;
    const ratio = aiTotal / clientTotalAssets;
    if (ratio < 0.5 || ratio > 1.5) {
      warnings.push(`AI 총자산(₩${aiTotal.toLocaleString()})이 실제(₩${clientTotalAssets.toLocaleString()})와 ${Math.round((ratio - 1) * 100)}% 차이 → 실제값으로 대체`);
      corrected.portfolioSnapshot = {
        ...result.portfolioSnapshot,
        totalValue: clientTotalAssets,
      };
      correctedAny = true;
    }
  }

  // 5. panicSubScores 범위 체크
  if (result.panicSubScores) {
    const subKeys = ['portfolioLoss', 'concentrationRisk', 'volatilityExposure', 'stopLossProximity', 'marketSentiment'] as const;
    const correctedSubs = { ...result.panicSubScores };
    for (const key of subKeys) {
      const val = correctedSubs[key];
      if (typeof val === 'number' && (val < 0 || val > 100)) {
        correctedSubs[key] = clampScore(val);
        warnings.push(`panicSubScores.${key} 보정 (${val})`);
        correctedAny = true;
      }
    }
    corrected.panicSubScores = correctedSubs;
  }

  // 6. personalizedAdvice 길이 제한 (너무 많으면 잘라냄)
  if (Array.isArray(result.personalizedAdvice) && result.personalizedAdvice.length > 10) {
    corrected.personalizedAdvice = result.personalizedAdvice.slice(0, 10);
    warnings.push(`personalizedAdvice ${result.personalizedAdvice.length}건 → 10건으로 제한`);
    correctedAny = true;
  }

  return {
    corrected,
    validation: {
      isValid: warnings.length === 0,
      warnings,
      corrected: correctedAny,
    },
  };
}

/** 포트폴리오 액션 타입 */
interface PortfolioActionItem {
  ticker: string;
  name: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * MorningBriefing 포트폴리오 액션 검증
 * - 중복 티커 제거
 * - 유효하지 않은 action 타입 필터
 */
export function validatePortfolioActions(
  actions: PortfolioActionItem[],
): PortfolioActionItem[] {
  const validActions = ['BUY', 'SELL', 'HOLD', 'WATCH'];
  const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
  const seen = new Set<string>();

  return actions.filter(a => {
    // 중복 티커 제거
    if (seen.has(a.ticker)) return false;
    seen.add(a.ticker);
    // 유효 액션만
    if (!validActions.includes(a.action)) return false;
    // 우선순위 보정
    if (!validPriorities.includes(a.priority)) {
      (a as any).priority = 'LOW';
    }
    return true;
  });
}
