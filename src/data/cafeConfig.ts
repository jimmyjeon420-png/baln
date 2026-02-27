/**
 * cafeConfig — 구루 카페 설정 데이터
 *
 * 역할: "카페 운영 매뉴얼" — 등급, 동물 리액션, 구루 방문 일정을 한곳에서 관리
 * 비유: 카페 사장님이 벽에 붙여놓은 운영 규칙표
 *
 * 사용처:
 * - src/hooks/useCafeFeatures.ts (등급 계산, 리액션 조회)
 * - src/services/cafeGuruVisitService.ts (구루 방문 일정)
 * - src/components/lounge/CafeRankBadge.tsx (등급 배지)
 * - src/components/lounge/AnimalReactions.tsx (리액션 버튼)
 */

// =============================================================================
// Cafe Rank (카페 등급 — 활동량 기반 5단계)
// =============================================================================

export interface CafeRank {
  id: string;
  nameKo: string;
  nameEn: string;
  emoji: string;
  /** 최소 게시글 수 */
  minPosts: number;
  /** 최소 댓글 수 */
  minComments: number;
  /** 등급 대표 색상 */
  color: string;
}

export const CAFE_RANKS: CafeRank[] = [
  { id: 'newbie',    nameKo: '신입',     nameEn: 'Newbie',    emoji: '🌱', minPosts: 0,  minComments: 0,   color: '#9E9E9E' },
  { id: 'regular',   nameKo: '단골',     nameEn: 'Regular',   emoji: '☕', minPosts: 5,  minComments: 10,  color: '#8D6E63' },
  { id: 'barista',   nameKo: '바리스타', nameEn: 'Barista',   emoji: '🧑‍🍳', minPosts: 15, minComments: 30,  color: '#FF8F00' },
  { id: 'manager',   nameKo: '매니저',   nameEn: 'Manager',   emoji: '🏅', minPosts: 30, minComments: 60,  color: '#1565C0' },
  { id: 'elder',     nameKo: '원로',     nameEn: 'Elder',     emoji: '👑', minPosts: 50, minComments: 100, color: '#FFD700' },
];

/**
 * 게시글/댓글 수로 카페 등급 계산
 * 두 조건(게시글 AND 댓글) 모두 충족해야 승급
 */
export function calculateCafeRank(postCount: number, commentCount: number): CafeRank {
  // 높은 등급부터 역순으로 확인
  for (let i = CAFE_RANKS.length - 1; i >= 0; i--) {
    const rank = CAFE_RANKS[i];
    if (postCount >= rank.minPosts && commentCount >= rank.minComments) {
      return rank;
    }
  }
  return CAFE_RANKS[0];
}

// =============================================================================
// Animal Reactions (동물 리액션 — 좋아요 대체 4종)
// =============================================================================

export interface AnimalReaction {
  id: string;
  emoji: string;
  nameKo: string;
  nameEn: string;
}

export const ANIMAL_REACTIONS: AnimalReaction[] = [
  { id: 'paw_up',         emoji: '🐾', nameKo: '발자국',   nameEn: 'Paw Up' },
  { id: 'helpful_star',   emoji: '⭐', nameKo: '도움돼요', nameEn: 'Helpful' },
  { id: 'laugh_cat',      emoji: '😹', nameKo: '웃겨요',   nameEn: 'Funny' },
  { id: 'concern_turtle',  emoji: '🐢', nameKo: '걱정돼요', nameEn: 'Concerned' },
];

// =============================================================================
// Guru Visit Schedule (구루 카페 방문 일정)
// =============================================================================

/** 구루 카페 방문 슬롯 */
export interface GuruVisitSlot {
  guruId: string;
  /** 방문 시작 시간 (KST, 0~23) */
  startHour: number;
  /** 방문 종료 시간 (KST, 0~23) */
  endHour: number;
}

/**
 * 요일별 구루 방문 일정 (0=일요일 ~ 6=토요일)
 * 매일 1~2명의 구루가 카페를 방문
 */
export const GURU_VISIT_SCHEDULE: Record<number, GuruVisitSlot[]> = {
  0: [{ guruId: 'buffett', startHour: 10, endHour: 12 }, { guruId: 'marks', startHour: 15, endHour: 17 }],
  1: [{ guruId: 'dalio', startHour: 14, endHour: 16 }, { guruId: 'lynch', startHour: 10, endHour: 12 }],
  2: [{ guruId: 'cathie_wood', startHour: 13, endHour: 15 }, { guruId: 'rogers', startHour: 17, endHour: 19 }],
  3: [{ guruId: 'druckenmiller', startHour: 11, endHour: 13 }, { guruId: 'saylor', startHour: 16, endHour: 18 }],
  4: [{ guruId: 'dimon', startHour: 14, endHour: 16 }, { guruId: 'musk', startHour: 19, endHour: 21 }],
  5: [{ guruId: 'buffett', startHour: 15, endHour: 17 }, { guruId: 'cathie_wood', startHour: 10, endHour: 12 }],
  6: [{ guruId: 'lynch', startHour: 11, endHour: 13 }, { guruId: 'dalio', startHour: 16, endHour: 18 }],
};

// =============================================================================
// Cafe Tables (카페 테이블 — 토픽별 대화 공간)
// =============================================================================

export interface CafeTable {
  id: string;
  nameKo: string;
  nameEn: string;
  emoji: string;
  /** 커뮤니티 카테고리 필터 매핑 (선택적) */
  categoryFilter?: string;
}

export const CAFE_TABLES: CafeTable[] = [
  { id: 'market_talk',   nameKo: '매크로 라운지', nameEn: 'Macro Lounge',    emoji: '🌍', categoryFilter: 'market' },
  { id: 'stock_debate',  nameKo: '종목 분석방',   nameEn: 'Stock Analysis',  emoji: '📊', categoryFilter: 'analysis' },
  { id: 'free_chat',     nameKo: '자유 수다',     nameEn: 'Free Chat',       emoji: '💬', categoryFilter: 'free' },
  { id: 'beginner_qa',   nameKo: '멘토 Q&A',     nameEn: 'Mentor Q&A',      emoji: '🎓', categoryFilter: 'question' },
];
