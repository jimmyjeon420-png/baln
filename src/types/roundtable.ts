/**
 * 라운드테이블 타입 정의
 *
 * 역할: 투자 거장 라운드테이블 토론의 데이터 구조
 * 비유: "회의록 양식" — 누가, 언제, 무슨 말을 했는지 기록하는 형식
 */

/** 하나의 발언 턴 */
export interface RoundtableTurn {
  /** 발언자 guruId (buffett, dalio 등) */
  speaker: string;
  /** 발언 내용 (한국어, 2-3문장) */
  message: string;
  /** 발언의 시장 관점 */
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS';
}

/** 사용자 질문 + 거장들의 답변 */
export interface UserQuestion {
  /** 사용자가 입력한 질문 */
  question: string;
  /** 각 거장의 1문장 답변 */
  responses: RoundtableTurn[];
}

/** 하나의 라운드테이블 세션 (전체 토론 기록) */
export interface RoundtableSession {
  /** 고유 ID (생성 시 UUID) */
  id: string;
  /** 토론 주제 (사용자 입력 또는 자동 생성) */
  topic: string;
  /** AI가 생성한 주제 요약 (1줄) */
  topicSummary: string;
  /** 참석자 guruId 배열 (3~5명) */
  participants: string[];
  /** 토론 턴 목록 (5~7턴) */
  turns: RoundtableTurn[];
  /** 토론 종합 결론 (1-2문장) */
  conclusion: string;
  /** 사용자 추가 질문 목록 */
  userQuestions: UserQuestion[];
  /** 세션 생성 시각 (ISO string) */
  createdAt: string;
}

/** Gemini API 응답 파싱 결과 */
export interface RoundtableGeminiResponse {
  topic_summary: string;
  turns: {
    speaker: string;
    message: string;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS';
  }[];
  conclusion: string;
}

/** 추가 질문 Gemini 응답 */
export interface FollowUpGeminiResponse {
  responses: {
    speaker: string;
    message: string;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS';
  }[];
}
