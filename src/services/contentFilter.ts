/**
 * contentFilter - 부적절 콘텐츠 필터링 서비스
 *
 * 기능:
 * - 금지어 필터 (리딩방, 단타방, 텔레그램 등)
 * - 전화번호 패턴 감지
 * - URL 패턴 감지
 * - 글 작성 시 자동 검증
 *
 * 비유: 보안 검색대 — 위험 물품(금지어)을 사전에 차단
 */

// ================================================================
// 금지어 목록 (자본시장법 위반, 불법 리딩방 등)
// ================================================================

const FORBIDDEN_WORDS = [
  // 리딩방 관련
  '리딩방',
  '리딩',
  '단타방',
  '주식방',
  '코인방',
  '텔레그램',
  '텔그',
  '카톡방',
  '오픈챗',
  '오픈카톡',
  '카카오톡',
  '단톡방',
  '방장',

  // 수익률 보장
  '수익보장',
  '100% 수익',
  '무조건',
  '확실한 수익',
  '원금보장',

  // 투자 리딩
  '매수 추천',
  '매수하세요',
  '지금 사세요',
  '지금 매수',
  '급등 예상',
  '급등주',
  '대박주',

  // 불법 광고
  '입금',
  '계좌번호',
  '환전',
  '대출',
  '사채',
];

// 패턴 검사 (정규식)
const FORBIDDEN_PATTERNS = {
  // 전화번호 (010-1234-5678, 01012345678)
  phoneNumber: /01[0-9]-?\d{3,4}-?\d{4}/g,

  // URL (http://, https://, www.)
  url: /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi,

  // 카카오톡 ID (kakaotalk.me/...)
  kakaoId: /kakaotalk\.me\/[^\s]+/gi,

  // 텔레그램 링크 (t.me/...)
  telegramLink: /t\.me\/[^\s]+/gi,
};

// ================================================================
// 필터링 결과 타입
// ================================================================

export interface FilterResult {
  isValid: boolean;
  violations: string[];
  detectedWords: string[];
  detectedPatterns: string[];
}

// ================================================================
// 콘텐츠 검증 함수
// ================================================================

/**
 * 콘텐츠 검증 (게시글/댓글 작성 전 호출)
 *
 * @param content - 검증할 텍스트
 * @returns FilterResult - 검증 결과
 */
export function validateContent(content: string): FilterResult {
  const violations: string[] = [];
  const detectedWords: string[] = [];
  const detectedPatterns: string[] = [];

  if (!content || content.trim().length === 0) {
    return { isValid: true, violations, detectedWords, detectedPatterns };
  }

  const normalizedContent = content.toLowerCase().replace(/\s/g, '');

  // 1. 금지어 검사
  for (const word of FORBIDDEN_WORDS) {
    const normalizedWord = word.toLowerCase().replace(/\s/g, '');
    if (normalizedContent.includes(normalizedWord)) {
      detectedWords.push(word);
      violations.push(`금지어 감지: "${word}"`);
    }
  }

  // 2. 전화번호 패턴 검사
  const phoneMatches = content.match(FORBIDDEN_PATTERNS.phoneNumber);
  if (phoneMatches) {
    detectedPatterns.push('전화번호');
    violations.push('전화번호는 입력할 수 없습니다');
  }

  // 3. URL 패턴 검사 (특정 도메인 허용 가능)
  const urlMatches = content.match(FORBIDDEN_PATTERNS.url);
  if (urlMatches) {
    // 허용 도메인 (뉴스 사이트 등)
    const allowedDomains = ['naver.com', 'daum.net', 'chosun.com', 'hankyung.com'];
    const isAllowed = urlMatches.some((url) =>
      allowedDomains.some((domain) => url.includes(domain))
    );

    if (!isAllowed) {
      detectedPatterns.push('URL');
      violations.push('외부 링크는 입력할 수 없습니다');
    }
  }

  // 4. 카카오톡 ID 패턴 검사
  const kakaoMatches = content.match(FORBIDDEN_PATTERNS.kakaoId);
  if (kakaoMatches) {
    detectedPatterns.push('카카오톡 ID');
    violations.push('카카오톡 링크는 입력할 수 없습니다');
  }

  // 5. 텔레그램 링크 패턴 검사
  const telegramMatches = content.match(FORBIDDEN_PATTERNS.telegramLink);
  if (telegramMatches) {
    detectedPatterns.push('텔레그램 링크');
    violations.push('텔레그램 링크는 입력할 수 없습니다');
  }

  const isValid = violations.length === 0;

  return {
    isValid,
    violations,
    detectedWords,
    detectedPatterns,
  };
}

/**
 * 간단 검증 (boolean만 반환)
 */
export function isContentValid(content: string): boolean {
  return validateContent(content).isValid;
}

/**
 * 위반 사유 문자열 생성
 */
export function getViolationMessage(result: FilterResult): string {
  if (result.isValid) return '';

  return result.violations.join('\n');
}

/**
 * 콘텐츠 필터링 + 자동 마스킹 (선택 사항)
 *
 * 예: "010-1234-5678" -> "010-****-****"
 */
export function maskSensitiveInfo(content: string): string {
  let masked = content;

  // 전화번호 마스킹
  masked = masked.replace(FORBIDDEN_PATTERNS.phoneNumber, (match) => {
    return match.substring(0, 3) + '-****-****';
  });

  // URL 마스킹
  masked = masked.replace(FORBIDDEN_PATTERNS.url, '[링크 제거됨]');

  return masked;
}

/**
 * 위험도 점수 계산 (0~100)
 *
 * - 금지어 1개당 +20점
 * - 패턴 1개당 +15점
 * - 60점 이상 = 고위험
 */
export function calculateRiskScore(result: FilterResult): number {
  let score = 0;

  score += result.detectedWords.length * 20;
  score += result.detectedPatterns.length * 15;

  return Math.min(score, 100);
}

/**
 * 위험도 등급 판정
 */
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high';

export function getRiskLevel(score: number): RiskLevel {
  if (score === 0) return 'safe';
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  return 'high';
}
