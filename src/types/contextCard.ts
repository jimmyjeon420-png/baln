/**
 * 맥락 카드 (Context Card) 타입 정의
 *
 * 역할: 시장 변동의 "왜"를 4겹으로 설명하는 카드의 데이터 구조
 * 비유: 일기예보처럼 "오늘 왜 이렇게 더운지" 설명하는 정보 패키지
 */

/** 센티먼트 타입 (시장 분위기) */
export type ContextCardSentiment = 'calm' | 'caution' | 'alert';

/** DB 맥락 카드 (context_cards 테이블) */
export interface ContextCard {
  id: string;
  date: string;                         // YYYY-MM-DD
  headline: string;                     // "오늘 당신의 자산이 -1.2% 빠진 이유"
  historical_context: string | null;    // 역사적 맥락 (레이어 1)
  macro_chain: string[];                // 거시경제 체인 (레이어 2)
  institutional_behavior: string | null; // 기관 행동 (레이어 3, Premium)
  sentiment: ContextCardSentiment;      // 심리 상태
  is_premium_only: boolean;             // 프리미엄 잠금 여부
  market_data: Record<string, any>;     // 추가 시장 데이터
  created_at: string;
}

/** 유저별 영향도 (user_context_impacts 테이블) */
export interface UserContextImpact {
  id: string;
  user_id: string;
  context_card_id: string;
  percent_change: number | null;        // 수익률 변화 (예: -1.2)
  health_score_change: number | null;   // 건강 점수 변화 (예: -5.0)
  impact_message: string | null;        // "당신의 포트폴리오는 -1.2% 영향"
  created_at: string;
}

/** 맥락 카드 + 유저 영향도 통합 결과 */
export interface ContextCardWithImpact {
  card: ContextCard;
  userImpact: UserContextImpact | null; // 영향도 없으면 null

  /** 데이터 수집/분석 시점 (ISO 8601) */
  dataTimestamp?: string | null;
  /** 데이터 출처 */
  dataSource?: string | null;
  /** AI 신뢰도 메모 */
  confidenceNote?: string | null;
}

/** UI 컴포넌트용 맥락 카드 데이터 (ContextCard.tsx prop) */
export interface ContextCardData {
  /** 날짜 (ISO 형식: '2026-02-08') */
  date: string;

  /** 헤드라인 - 한 문장 요약 */
  headline: string; // 예: "미국 CPI 예상 상회, 금리 인상 우려 확산"

  /** 1번 레이어: 역사적 맥락 - "과거에도 이런 일이 있었다" */
  historicalContext: string; // 예: "2022년 6월에도 비슷한 패턴이 있었고, 3개월 후 반등"

  /** 2번 레이어: 거시경제 체인 - "A 때문에 B가 되고, B 때문에 C가 됐다" */
  macroChain: string[]; // 예: ["미국 CPI 3.2% 발표", "금리 인상 우려", "기술주 하락", "삼성전자 연동 하락"]

  /** 3번 레이어: 기관 행동 - "큰손들은 지금 뭘 하고 있나" (Premium 전용) */
  institutionalBehavior: string; // 예: "외국인 3일 연속 순매도 (패닉 아닌 리밸런싱 시즌)"

  /** 4번 레이어: 포트폴리오 영향 - "이게 내 자산에 어떤 영향?" (Premium 전용) */
  portfolioImpact: {
    percentChange: number; // 예: -1.2 (%)
    healthScoreChange: number; // 예: 0 (건강 점수 변동)
    message: string; // 예: "당신의 포트폴리오는 -1.2% 영향, 건강 점수 변동 없음"
  };

  /** 시장 분위기 (카드 상단 색상 결정) */
  sentiment: ContextCardSentiment;

  /** Premium 콘텐츠 여부 (3-4번 레이어 잠금) */
  isPremiumContent: boolean;
}

/**
 * 센티먼트별 색상 매핑
 */
export const SENTIMENT_COLORS = {
  calm: '#4CAF50', // 초록 - 평온
  caution: '#FFC107', // 주황 - 주의
  alert: '#CF6679', // 빨강 - 경고
} as const;

/**
 * 센티먼트별 아이콘 매핑
 */
export const SENTIMENT_ICONS = {
  calm: 'checkmark-circle-outline',
  caution: 'alert-circle-outline',
  alert: 'warning-outline',
} as const;

/**
 * 센티먼트별 라벨
 */
export const SENTIMENT_LABELS = {
  calm: '안정',
  caution: '주의',
  alert: '경계',
} as const;
