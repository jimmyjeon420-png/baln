/**
 * newsImpact.ts
 *
 * 뉴스가 내 자산에 주는 영향을 "한 줄 + 시간축(단기/중기/장기)"으로 일관 계산합니다.
 * 입력값이 부족해도 항상 안정적인 기본값을 반환해 UI 오류를 방지합니다.
 */

import type { MarketNewsCategory } from '../hooks/useMarketNews';

export type ImpactPolarity = '긍정' | '부정' | '중립';

export interface HorizonImpactGrade {
  short: string;
  mid: string;
  long: string;
}

export interface NewsImpactSummary {
  impactIndex: number; // 0 ~ 100
  polarity: ImpactPolarity;
  strengthLabel: string;
  directionLabel: string;
  grades: HorizonImpactGrade;
  horizons: {
    short: string;
    mid: string;
    long: string;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeCategory(category?: MarketNewsCategory): MarketNewsCategory {
  if (category === 'crypto' || category === 'stock' || category === 'macro') return category;
  return 'stock';
}

function toGrade(value: number, polarity: ImpactPolarity): string {
  const abs = Math.abs(value);
  const base =
    abs >= 75 ? 'S' :
    abs >= 55 ? 'A' :
    abs >= 35 ? 'B' :
    abs >= 20 ? 'C' :
    abs >= 10 ? 'D' : 'N';

  if (base === 'N' || polarity === '중립') return 'N';
  return `${base}${polarity === '긍정' ? '+' : '-'}`;
}

function getStrengthLabel(index: number): string {
  if (index >= 45) return '강함';
  if (index >= 25) return '보통';
  if (index >= 10) return '약함';
  return '미미';
}

function getPolarity(score: number): ImpactPolarity {
  if (score > 0.15) return '긍정';
  if (score < -0.15) return '부정';
  return '중립';
}

function getDirectionLabel(polarity: ImpactPolarity): string {
  if (polarity === '긍정') return '상승 압력';
  if (polarity === '부정') return '하락 압력';
  return '중립';
}

function getCategoryHorizonWeights(category: MarketNewsCategory): { short: number; mid: number; long: number } {
  if (category === 'crypto') {
    return { short: 1.2, mid: 0.95, long: 0.75 };
  }
  if (category === 'macro') {
    return { short: 0.8, mid: 1.0, long: 1.15 };
  }
  return { short: 1.05, mid: 1.0, long: 0.9 }; // stock
}

/**
 * 뉴스 영향 요약 계산
 *
 * @param totalExposurePercent 뉴스와 연관된 포트폴리오 비중(0~100)
 * @param impactScore AI 영향 점수(-2~+2)
 * @param hasMatch 보유자산과 직접 연관 여부
 * @param category 뉴스 카테고리
 */
export function calculateNewsImpactSummary(
  totalExposurePercent: number,
  impactScore: number | null | undefined,
  hasMatch: boolean,
  category?: MarketNewsCategory,
): NewsImpactSummary {
  const safeExposure = clamp(Math.round(totalExposurePercent || 0), 0, 100);
  const safeScore = Number.isFinite(impactScore as number) ? (impactScore as number) : 0;
  const polarity = getPolarity(safeScore);
  const directionLabel = getDirectionLabel(polarity);

  if (!hasMatch || safeExposure <= 0 || Math.abs(safeScore) < 0.01) {
    return {
      impactIndex: 0,
      polarity: '중립',
      strengthLabel: '미미',
      directionLabel: '중립',
      grades: { short: 'N', mid: 'N', long: 'N' },
      horizons: {
        short: '1~3영업일',
        mid: '1~4주',
        long: '1~3개월',
      },
    };
  }

  // 기존 로직(노출 × 절대점수 / 2)을 기반으로 0~100으로 정규화
  const rawIndex = (safeExposure * Math.abs(safeScore)) / 2;
  const impactIndex = clamp(Math.round(rawIndex), 0, 100);
  const strengthLabel = getStrengthLabel(impactIndex);

  const normalizedCategory = normalizeCategory(category);
  const weights = getCategoryHorizonWeights(normalizedCategory);

  const shortValue = clamp(Math.round(impactIndex * weights.short), 0, 100);
  const midValue = clamp(Math.round(impactIndex * weights.mid), 0, 100);
  const longValue = clamp(Math.round(impactIndex * weights.long), 0, 100);

  return {
    impactIndex,
    polarity,
    strengthLabel,
    directionLabel,
    grades: {
      short: toGrade(shortValue, polarity),
      mid: toGrade(midValue, polarity),
      long: toGrade(longValue, polarity),
    },
    horizons: {
      short: '1~3영업일',
      mid: '1~4주',
      long: '1~3개월',
    },
  };
}

