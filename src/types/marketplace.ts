/**
 * AI 프리미엄 마켓플레이스 타입 정의
 * 크레딧(코인) 기반 건별 과금 시스템의 전체 데이터 구조
 */

import { UserTier } from './database';

// ============================================================================
// AI 기능 타입
// ============================================================================

/** 마켓플레이스에서 제공하는 AI 기능 종류 */
export type AIFeatureType = 'deep_dive' | 'what_if' | 'tax_report' | 'ai_cfo_chat';

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
}

// ============================================================================
// AI 기능별 Input/Result 타입
// ============================================================================

// --- AI 종목 딥다이브 ---
export interface DeepDiveInput {
  ticker: string;
  name: string;
  currentPrice?: number;
  avgPrice?: number;
  quantity?: number;
}

export interface DeepDiveResult {
  ticker: string;
  name: string;
  overallScore: number; // 0-100 종합 점수
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
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
      sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      highlights: string[];
      recentNews: { title: string; impact: string; date: string }[];
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

// --- AI CFO 1:1 채팅 ---
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

/** 크레딧 패키지 목록 */
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: '스타터',
    credits: 50,
    bonus: 0,
    price: 4900,
    priceLabel: '₩4,900',
  },
  {
    id: 'standard',
    name: '스탠다드',
    credits: 100,
    bonus: 0,
    price: 9900,
    priceLabel: '₩9,900',
    badge: '인기',
    popular: true,
  },
  {
    id: 'premium',
    name: '프리미엄',
    credits: 300,
    bonus: 30,
    price: 24900,
    priceLabel: '₩24,900',
    badge: '+30 보너스',
  },
  {
    id: 'whale',
    name: '웨일',
    credits: 1000,
    bonus: 150,
    price: 69900,
    priceLabel: '₩69,900',
    badge: '+150 보너스',
  },
];

/** 기능별 크레딧 비용 */
export const FEATURE_COSTS: Record<AIFeatureType, number> = {
  deep_dive: 30,
  what_if: 20,
  tax_report: 50,
  ai_cfo_chat: 10,
};

/** 기능별 한국어 라벨 */
export const FEATURE_LABELS: Record<AIFeatureType, string> = {
  deep_dive: 'AI 종목 딥다이브',
  what_if: 'What-If 시뮬레이터',
  tax_report: '세금 최적화 리포트',
  ai_cfo_chat: 'AI CFO 1:1 채팅',
};

/** 티어별 할인율 (%) */
export const TIER_DISCOUNTS: Record<UserTier, number> = {
  SILVER: 0,
  GOLD: 5,
  PLATINUM: 10,
  DIAMOND: 20,
};

/** 구독자 월 보너스 크레딧 */
export const SUBSCRIPTION_MONTHLY_BONUS = 50;
