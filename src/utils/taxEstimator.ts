/**
 * 세금/수수료 예상 계산기 — 매도 시 예상 비용 시뮬레이션
 *
 * 비유: "회계 부서" — 매도하면 실제로 얼마가 남는지 미리 계산
 *
 * 지원 자산 (한국 로케일):
 * - 한국 주식: 거래세 0.18% + 수수료 0.015%
 * - 해외 주식: 양도소득세 22% (250만원 공제 후) + 수수료 0.25%
 * - 가상자산: 2027년까지 과세 유예 (수수료만)
 *
 * 지원 자산 (영어 로케일):
 * - 한국 주식: 거래세 0.18% + 수수료 0.015%
 * - 미국 주식: 단기 양도소득세 22%, 장기 15% + 수수료 0.25%
 * - 가상자산: 단기 22%, 장기 15% (주식과 동일 취급)
 *
 * ⚠️ 면책: 실제 세금은 개인 상황에 따라 달라집니다. 참고용입니다.
 */

import { isKoreanLocale } from './formatters';

// ── 자산 유형 분류 ──

export type TaxAssetType = 'kr_stock' | 'us_stock' | 'crypto' | 'other';

/** 티커로 자산 유형 추정 */
export function inferTaxAssetType(ticker: string): TaxAssetType {
  if (!ticker) return 'other';
  const t = ticker.toUpperCase();

  // 한국 주식: 6자리 숫자 또는 .KS/.KQ 접미사
  if (/^\d{6}$/.test(t) || t.endsWith('.KS') || t.endsWith('.KQ')) return 'kr_stock';

  // 가상자산: BTC, ETH, 알트코인
  const cryptoTickers = ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI', 'ATOM'];
  if (cryptoTickers.includes(t) || t.endsWith('-USD') || t.endsWith('USDT')) return 'crypto';

  // 해외 주식: 영문 1-5자리 (알파벳만)
  if (/^[A-Z]{1,5}$/.test(t)) return 'us_stock';

  return 'other';
}

// ── 세율/수수료 상수 ──

const TAX_RATES_KR = {
  // 한국 주식 (2025 기준)
  kr_stock: {
    transactionTax: 0.0018,    // 거래세 0.18% (코스피 기준)
    brokerageFee: 0.00015,     // 증권사 수수료 0.015% (온라인 평균)
    capitalGainsTax: 0,        // 소액주주 비과세 (대주주 아닌 경우)
    capitalGainsExemption: 0,
  },
  // 해외 주식 (미국) — 한국 거주자 기준
  us_stock: {
    transactionTax: 0,
    brokerageFee: 0.0025,      // 해외주식 수수료 0.25%
    capitalGainsTax: 0.22,     // 양도소득세 22% (지방세 포함)
    capitalGainsExemption: 2500000, // 250만원 기본 공제
  },
  // 가상자산 (2027년까지 과세 유예)
  crypto: {
    transactionTax: 0,
    brokerageFee: 0.001,       // 거래소 수수료 0.1%
    capitalGainsTax: 0,        // 과세 유예 중
    capitalGainsExemption: 0,
  },
  // 기타
  other: {
    transactionTax: 0,
    brokerageFee: 0.001,
    capitalGainsTax: 0,
    capitalGainsExemption: 0,
  },
};

const TAX_RATES_US = {
  // 한국 주식 (비거주자도 동일 거래세)
  kr_stock: {
    transactionTax: 0.0018,
    brokerageFee: 0.00015,
    capitalGainsTax: 0,
    capitalGainsExemption: 0,
  },
  // 미국 주식 — 미국 세법 기준 (단기 22%, 장기 15%)
  us_stock: {
    transactionTax: 0,
    brokerageFee: 0.0025,
    capitalGainsTax: 0.22,     // short-term rate (held <1 year)
    capitalGainsExemption: 0,
    longTermRate: 0.15,        // long-term rate (held ≥1 year)
  },
  // 가상자산 — 미국에서는 주식과 동일하게 단기/장기 구분
  crypto: {
    transactionTax: 0,
    brokerageFee: 0.001,
    capitalGainsTax: 0.22,     // short-term
    capitalGainsExemption: 0,
    longTermRate: 0.15,
  },
  // 기타
  other: {
    transactionTax: 0,
    brokerageFee: 0.001,
    capitalGainsTax: 0,
    capitalGainsExemption: 0,
  },
};

// ── 결과 타입 ──

export interface TaxEstimate {
  assetType: TaxAssetType;
  assetTypeLabel: string;
  sellAmount: number;          // 매도 금액
  gain: number;                // 차익 (매도가 - 매입가)
  transactionTax: number;      // 거래세
  brokerageFee: number;        // 수수료
  capitalGainsTax: number;     // 양도소득세
  totalCost: number;           // 총 비용 (세금 + 수수료)
  netProceeds: number;         // 실수령액
  costRate: number;            // 비용률 (%)
  note: string;                // 참고 메모
}

// ── 라벨 매핑 ──

const TYPE_LABELS_KR: Record<TaxAssetType, string> = {
  kr_stock: '국내주식',
  us_stock: '해외주식',
  crypto: '가상자산',
  other: '기타',
};

const TYPE_LABELS_EN: Record<TaxAssetType, string> = {
  kr_stock: 'KR Stock',
  us_stock: 'US Stock',
  crypto: 'Crypto',
  other: 'Other',
};

// ── 메인 계산 ──

/**
 * 매도 시 예상 세금/수수료 계산
 * @param ticker 종목 티커
 * @param sellAmount 매도 금액
 * @param avgPrice 평균 매입가
 * @param currentPrice 현재가
 * @param quantity 매도 수량
 * @param isLongTerm 장기 보유 여부 (1년 이상, 영어 로케일에서 장기 세율 적용 시)
 */
export function estimateTax(
  ticker: string,
  sellAmount: number,
  avgPrice: number,
  currentPrice: number,
  quantity: number,
  isLongTerm = false,
): TaxEstimate {
  const assetType = inferTaxAssetType(ticker);
  const korean = isKoreanLocale();
  const rates = korean ? TAX_RATES_KR[assetType] : TAX_RATES_US[assetType];
  const typeLabels = korean ? TYPE_LABELS_KR : TYPE_LABELS_EN;

  // 차익 계산
  const gain = (currentPrice - avgPrice) * quantity;

  // 거래세
  const transactionTax = Math.floor(sellAmount * rates.transactionTax);

  // 중개 수수료
  const brokerageFee = Math.floor(sellAmount * rates.brokerageFee);

  // 양도소득세
  let capitalGainsTax = 0;
  let note = '';

  if (korean) {
    // ── 한국 세법 ──
    if (assetType === 'us_stock' && gain > 0) {
      const taxableGain = Math.max(0, gain - rates.capitalGainsExemption);
      capitalGainsTax = Math.floor(taxableGain * rates.capitalGainsTax);
      if (gain <= rates.capitalGainsExemption) {
        note = `연 250만원 기본공제 이내 (비과세)`;
      } else {
        note = `250만원 공제 후 ${Math.floor(taxableGain).toLocaleString()}원에 22% 과세`;
      }
    } else if (assetType === 'kr_stock') {
      note = '소액주주 양도소득세 비과세';
    } else if (assetType === 'crypto') {
      note = '가상자산 과세 2027년까지 유예';
    }
  } else {
    // ── 미국 세법 ──
    if ((assetType === 'us_stock' || assetType === 'crypto') && gain > 0) {
      const usRates = TAX_RATES_US[assetType] as typeof TAX_RATES_US['us_stock'];
      const rate = isLongTerm ? (usRates.longTermRate ?? 0.15) : usRates.capitalGainsTax;
      capitalGainsTax = Math.floor(gain * rate);
      if (isLongTerm) {
        note = `Long-term capital gains (held ≥1yr): ${(rate * 100).toFixed(0)}%`;
      } else {
        note = `Short-term capital gains (held <1yr): ${(rate * 100).toFixed(0)}%`;
      }
    } else if (assetType === 'kr_stock') {
      note = 'KR transaction tax only (no US capital gains tax on KR stocks)';
    }
  }

  const totalCost = transactionTax + brokerageFee + capitalGainsTax;
  const netProceeds = sellAmount - totalCost;
  const costRate = sellAmount > 0 ? (totalCost / sellAmount) * 100 : 0;

  return {
    assetType,
    assetTypeLabel: typeLabels[assetType],
    sellAmount,
    gain,
    transactionTax,
    brokerageFee,
    capitalGainsTax,
    totalCost,
    netProceeds,
    costRate,
    note,
  };
}
