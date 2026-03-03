/**
 * contentFilter — 커뮤니티 게시물 금칙어 필터
 *
 * VIP 라운지 등 커뮤니티 기능에서 자본시장법 위반 소지가 있는
 * 종목 추천, 투자 사기, 불법 행위 관련 표현을 필터링합니다.
 */

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

/** 금칙어 카테고리 */
export type ForbiddenCategory =
  | 'stock_recommendation'   // 종목 추천 관련
  | 'investment_fraud'       // 투자 사기 관련
  | 'illegal_activity'       // 불법 행위 관련
  | 'profanity'              // 욕설/비속어 (Apple 1.2)
  | 'spam'                   // 스팸/광고 (Apple 1.2)
  | 'harassment';            // 혐오/괴롭힘 (Apple 1.2)

/** 금칙어 패턴 항목 */
export interface ForbiddenPattern {
  /** 금칙어 문자열 */
  pattern: string;
  /** 카테고리 분류 */
  category: ForbiddenCategory;
}

/** 필터링 결과 */
export interface FilterResult {
  /** 위반 사항이 없으면 true */
  isClean: boolean;
  /** 감지된 위반 문구 목록 */
  violations: string[];
}

// ---------------------------------------------------------------------------
// 금칙어 패턴 목록
// ---------------------------------------------------------------------------

/**
 * 금칙어 패턴 전체 목록.
 * 관리자 화면 등에서 참조할 수 있도록 export 합니다.
 */
export const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  // ── 종목 추천 관련 ──
  { pattern: '꼭 사세요',       category: 'stock_recommendation' },
  { pattern: '무조건 올라',     category: 'stock_recommendation' },
  { pattern: '100% 수익',       category: 'stock_recommendation' },
  { pattern: '확실한 종목',     category: 'stock_recommendation' },
  { pattern: '비밀 정보',       category: 'stock_recommendation' },

  // ── 투자 사기 관련 ──
  { pattern: '원금 보장',       category: 'investment_fraud' },
  { pattern: '수익 보장',       category: 'investment_fraud' },
  { pattern: '손실 없는',       category: 'investment_fraud' },
  { pattern: '확정 수익',       category: 'investment_fraud' },

  // ── 불법 행위 ──
  { pattern: '리딩방',          category: 'illegal_activity' },
  { pattern: '선물 대리',       category: 'illegal_activity' },
  { pattern: '계좌 대여',       category: 'illegal_activity' },
  { pattern: '차명 거래',       category: 'illegal_activity' },

  // ── 욕설/비속어 (Apple 1.2 — objectionable content filter) ──
  { pattern: '시발',            category: 'profanity' },
  { pattern: '씨발',            category: 'profanity' },
  { pattern: '씨팔',            category: 'profanity' },
  { pattern: '개새끼',          category: 'profanity' },
  { pattern: '병신',            category: 'profanity' },
  { pattern: '미친놈',          category: 'profanity' },
  { pattern: '미친년',          category: 'profanity' },
  { pattern: '느그마',          category: 'profanity' },
  { pattern: '니엄마',          category: 'profanity' },
  { pattern: '지랄',            category: 'profanity' },
  { pattern: '또라이',          category: 'profanity' },

  // ── 스팸 패턴 (Apple 1.2) ──
  { pattern: '단톡방 수익',     category: 'spam' },
  { pattern: '카톡 추가',       category: 'spam' },
  { pattern: '텔레그램 가입',   category: 'spam' },
  { pattern: 'VIP방 초대',      category: 'spam' },
  { pattern: '무료 체험 리딩',  category: 'spam' },

  // ── 영문 비속어 (Apple 1.2) ──
  { pattern: 'fuck',            category: 'profanity' },
  { pattern: 'shit',            category: 'profanity' },
  { pattern: 'asshole',         category: 'profanity' },
  { pattern: 'bitch',           category: 'profanity' },
  { pattern: 'nigger',          category: 'harassment' },
  { pattern: 'faggot',          category: 'harassment' },
  { pattern: 'retard',          category: 'harassment' },
];

// ---------------------------------------------------------------------------
// 필터 함수
// ---------------------------------------------------------------------------

/**
 * 텍스트에 포함된 금칙어를 모두 찾아 반환합니다.
 *
 * @param text - 검사할 텍스트 (커뮤니티 게시물 본문 등)
 * @returns isClean: 위반 없으면 true, violations: 감지된 금칙어 배열
 *
 * @example
 * ```ts
 * const result = filterContent('이 종목은 100% 수익 가능합니다');
 * // result → { isClean: false, violations: ['100% 수익'] }
 * ```
 */
export function filterContent(text: string): FilterResult {
  const normalizedText = text.toLowerCase();
  const violations: string[] = [];

  for (const { pattern } of FORBIDDEN_PATTERNS) {
    // 대소문자 무시 비교 (한글은 대소문자 없지만, 혼합 텍스트 대비)
    if (normalizedText.includes(pattern.toLowerCase())) {
      violations.push(pattern);
    }
  }

  return {
    isClean: violations.length === 0,
    violations,
  };
}

/** 카테고리별 사용자 경고 메시지 */
const CATEGORY_MESSAGES: Record<ForbiddenCategory, string> = {
  stock_recommendation: '종목 추천 관련 표현이 포함되어 있습니다. 커뮤니티 규정을 확인해주세요.',
  investment_fraud: '투자 사기 관련 표현이 감지되었습니다.',
  illegal_activity: '불법 활동 관련 내용이 감지되었습니다.',
  profanity: '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.',
  spam: '스팸 또는 광고성 내용이 감지되었습니다.',
  harassment: '혐오 또는 차별적 표현이 포함되어 있습니다. 이러한 내용은 게시할 수 없습니다.',
};

/**
 * 필터링 결과에서 첫 번째 위반 카테고리의 경고 메시지를 반환합니다.
 */
export function getFilterMessage(text: string): string | null {
  const normalizedText = text.toLowerCase();
  for (const { pattern, category } of FORBIDDEN_PATTERNS) {
    if (normalizedText.includes(pattern.toLowerCase())) {
      return CATEGORY_MESSAGES[category];
    }
  }
  return null;
}

/**
 * 특정 카테고리의 금칙어만 검사합니다.
 *
 * @param text - 검사할 텍스트
 * @param category - 검사할 카테고리
 * @returns FilterResult
 */
export function filterContentByCategory(
  text: string,
  category: ForbiddenCategory,
): FilterResult {
  const normalizedText = text.toLowerCase();
  const violations: string[] = [];

  for (const item of FORBIDDEN_PATTERNS) {
    if (item.category !== category) continue;
    if (normalizedText.includes(item.pattern.toLowerCase())) {
      violations.push(item.pattern);
    }
  }

  return {
    isClean: violations.length === 0,
    violations,
  };
}
