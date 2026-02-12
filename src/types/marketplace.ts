/**
 * AI 프리미엄 마켓플레이스 타입 정의
 * 크레딧(코인) 기반 건별 과금 시스템의 전체 데이터 구조
 */

import { UserTier } from './database';

// ============================================================================
// AI 기능 타입
// ============================================================================

/** 마켓플레이스에서 제공하는 AI 기능 종류 */
export type AIFeatureType = 'deep_dive' | 'what_if' | 'tax_report' | 'ai_cfo_chat' | 'tier_insights';

/** 크레딧 거래 유형 */
export type CreditTransactionType = 'purchase' | 'spend' | 'refund' | 'bonus' | 'subscription_bonus';

// ============================================================================
// 크레딧 시스템
// ============================================================================

/** 사용자 크레딧 잔액 (user_credits 테이블) */
export interface UserCredits {
  user_id: string;
  balance: number;
  lifetime_purchased: number; // 누적 구매 크레딧
  lifetime_spent: number;     // 누적 사용 크레딧
  last_bonus_at: string | null; // 마지막 구독 보너스 지급일
  updated_at: string;
}

/** 크레딧 거래 내역 (credit_transactions 테이블) */
export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditTransactionType;
  amount: number;          // 양수: 충전/환불, 음수: 차감
  balance_after: number;   // 거래 후 잔액
  feature_type: AIFeatureType | null;
  feature_ref_id: string | null; // AI 분석 결과 ID 참조
  metadata: Record<string, any> | null; // 패키지 정보, IAP 영수증 등
  created_at: string;
}

/** 크레딧 패키지 (앱 내 하드코딩) */
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonus: number;        // 보너스 크레딧
  price: number;        // KRW 가격
  priceLabel: string;   // "₩4,900"
  badge?: string;       // "인기", "+30 보너스" 등
  popular?: boolean;    // 인기 배지 표시 여부
  appleProductId: string; // Apple App Store 인앱결제 상품 ID
}

// ============================================================================
// AI 기능별 Input/Result 타입
// ============================================================================

// --- 재무 팩트 데이터 (Yahoo Finance API 조회 결과) ---
export interface StockFundamentals {
  ticker: string;
  name: string;
  marketCap?: number;
  marketCapKRW?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  returnOnEquity?: number;
  operatingMargins?: number;
  profitMargins?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  debtToEquity?: number;
  currentPrice?: number;
  currency?: string;
  quarterlyEarnings?: Array<{
    quarter: string;
    date: string;
    revenue?: number;
    earnings?: number;
    revenueKRW?: number;
    earningsKRW?: number;
  }>;
  exchangeRate?: number;     // 적용된 실시간 환율 (USD/KRW)
  fetchedAt: string;
  dataSource: 'yahoo_finance_v10';
}

// --- AI 종목 딥다이브 ---
export interface DeepDiveInput {
  ticker: string;
  name: string;
  currentPrice?: number;
  avgPrice?: number;
  quantity?: number;
  fundamentals?: StockFundamentals;
}

export interface DeepDiveResult {
  ticker: string;
  name: string;
  overallScore: number; // 0-100 종합 점수
  recommendation: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
  sections: {
    financial: {
      title: string;
      score: number;
      highlights: string[];
      metrics: { label: string; value: string; status: 'good' | 'neutral' | 'bad' }[];
    };
    technical: {
      title: string;
      score: number;
      highlights: string[];
      signals: { indicator: string; signal: string; value: string }[];
    };
    news: {
      title: string;
      sentiment: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
      highlights: string[];
      recentNews: { title: string; impact: string; date: string }[];
    };
    quality?: {
      title: string;
      score: number;
      highlights: string[];
      metrics?: { label: string; value: string; status: 'good' | 'neutral' | 'bad'; detail?: string }[];
    };
    aiOpinion: {
      title: string;
      summary: string;
      bullCase: string[];
      bearCase: string[];
      targetPrice: string;
      timeHorizon: string;
    };
  };
  generatedAt: string;

  // --- 분기별 실적 데이터 (optional) ---
  quarterlyData?: Array<{
    quarter: string;
    revenue: number;
    operatingIncome: number;
    netIncome: number;
  }>;
  quarterDetail?: {
    quarter: string;
    revenueSegments: Array<{
      name: string;
      amount: number;
      percentage: number;
      color: string;
      growth?: number;
    }>;
    costItems: Array<{
      name: string;
      amount: number;
      percentage: number;
    }>;
    waterfall: Array<{
      label: string;
      amount: number;
      type: 'revenue' | 'cost' | 'subtotal' | 'income';
    }>;
    operatingMargin?: number;
    netMargin?: number;
    keyTakeaway?: string;
  };
  marketCap?: number;
  per?: number;
  pbr?: number;
  dataSources?: Array<{
    name: string;
    detail: string;
    date: string;
  }>;
}

// --- What-If 시뮬레이터 ---
export type WhatIfScenario =
  | 'interest_rate_change'  // 금리 변동
  | 'stock_crash'           // 특정 종목 하락
  | 'market_crash'          // 시장 전체 하락
  | 'currency_change'       // 환율 변동
  | 'custom';               // 자유 시나리오

export interface WhatIfInput {
  scenario: WhatIfScenario;
  description: string;      // 시나리오 상세 설명
  magnitude?: number;       // 변동 크기 (%, 선택)
  portfolio: {
    ticker: string;
    name: string;
    currentValue: number;
    allocation: number;     // 비중 (%)
  }[];
}

export interface WhatIfResult {
  scenario: string;
  summary: string;          // 전체 요약
  totalImpact: {
    currentTotal: number;
    projectedTotal: number;
    changePercent: number;
    changeAmount: number;
  };
  assetImpacts: {
    ticker: string;
    name: string;
    currentValue: number;
    projectedValue: number;
    changePercent: number;
    impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    explanation: string;
  }[];
  riskAssessment: {
    overallRisk: 'HIGH' | 'MEDIUM' | 'LOW';
    vulnerabilities: string[];
    hedgingSuggestions: string[];
  };
  generatedAt: string;
}

// --- 세금 최적화 리포트 ---
export type TaxResidency = 'KR' | 'US';

export interface TaxReportInput {
  residency: TaxResidency;
  annualIncome?: number;        // 연 소득 (KRW)
  portfolio: {
    ticker: string;
    name: string;
    currentValue: number;
    costBasis: number;
    purchaseDate: string;
    quantity: number;
  }[];
}

export interface TaxReportResult {
  residency: TaxResidency;
  taxSummary: {
    estimatedCapitalGainsTax: number;   // 예상 양도세
    estimatedIncomeTax: number;         // 예상 종합소득세
    totalTaxBurden: number;             // 총 세금 부담
    effectiveTaxRate: number;           // 실효 세율 (%)
  };
  strategies: {
    title: string;
    description: string;
    potentialSaving: number;    // 예상 절세 금액
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    actionItems: string[];
  }[];
  sellTimeline: {
    ticker: string;
    name: string;
    suggestedAction: 'SELL_NOW' | 'HOLD_FOR_TAX' | 'TAX_LOSS_HARVEST';
    reason: string;
    optimalTiming: string;
  }[];
  annualPlan: {
    quarter: string;
    actions: string[];
  }[];
  generatedAt: string;
}

// --- AI 버핏과 티타임 1:1 채팅 ---
export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  credits_charged: number;      // 이 메시지에 과금된 크레딧
  created_at: string;
}

export interface CFOChatInput {
  sessionId: string;
  message: string;
  portfolioContext?: {
    totalAssets: number;
    tier: UserTier;
    topHoldings: { ticker: string; name: string; allocation: number }[];
  };
}

// ============================================================================
// AI 분석 결과 캐시 (ai_feature_results 테이블)
// ============================================================================

export interface AIFeatureResult {
  id: string;
  user_id: string;
  feature_type: AIFeatureType;
  input_hash: string;         // 입력 해시 (캐시 키)
  result: DeepDiveResult | WhatIfResult | TaxReportResult;
  credits_charged: number;
  expires_at: string;         // 캐시 만료 (24시간)
  created_at: string;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 크레딧 패키지 목록 (네이버 웹툰식 심플 3단계, 1크레딧 = ₩100) */
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'lite',
    name: '라이트',
    credits: 50,
    bonus: 0,
    price: 5000,
    priceLabel: '₩5,000',
    appleProductId: 'com.smartrebalancer.credits.lite',
  },
  {
    id: 'standard',
    name: '스탠다드',
    credits: 100,
    bonus: 10,
    price: 10000,
    priceLabel: '₩10,000',
    badge: '+10 보너스',
    popular: true,
    appleProductId: 'com.smartrebalancer.credits.standard',
  },
  {
    id: 'premium',
    name: '프리미엄',
    credits: 300,
    bonus: 50,
    price: 30000,
    priceLabel: '₩30,000',
    badge: '+50 보너스',
    appleProductId: 'com.smartrebalancer.credits.premium',
  },
];

/** 기능별 크레딧 비용 (웹툰 1화 = ₩300 컨셉, 1크레딧 = ₩100) */
export const FEATURE_COSTS: Record<AIFeatureType, number> = {
  deep_dive: 1,       // ₩100 — 1크레딧 = 1액션 통일
  what_if: 1,         // ₩100 — 1크레딧 = 1액션 통일
  tax_report: 10,     // ₩1,000 — 천원에 세금 계산
  ai_cfo_chat: 1,     // ₩100/메시지 — 부담 없이 대화
  tier_insights: 3,   // ₩300 — 웹툰 1화
};

/** 기능별 한국어 라벨 */
export const FEATURE_LABELS: Record<AIFeatureType, string> = {
  deep_dive: 'AI 종목 딥다이브',
  what_if: 'What-If 시뮬레이터',
  tax_report: '세금 최적화 리포트',
  ai_cfo_chat: 'AI 버핏과 티타임',
  tier_insights: '투자 DNA 비교',
};

/** 티어별 할인율 (%) — 고액 자산가 록인 강화 */
export const TIER_DISCOUNTS: Record<UserTier, number> = {
  SILVER: 0,
  GOLD: 10,
  PLATINUM: 20,
  DIAMOND: 30,
};

/** 구독자 월 보너스 크레딧 */
export const SUBSCRIPTION_MONTHLY_BONUS = 30;

/** 매일 무료 AI 진단 횟수 */
export const DAILY_FREE_ANALYSIS = {
  free: 1,        // 무료 유저: 1일 1회
  subscriber: 3,  // 구독자: 1일 3회
};
