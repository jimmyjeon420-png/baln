/**
 * easterEggConfig — 마을 이스터에그 정의 (15개+)
 *
 * 역할: "비밀 도감" — 특정 조건에서만 발견되는 숨겨진 이벤트 목록
 * 비유: 동물의숲에서 특정 시간/날짜에만 나타나는 특별 이벤트
 *
 * 카테고리:
 * - time: 특정 시간/요일에 접속하면 발동
 * - behavior: 유저 행동 패턴 누적으로 발동
 * - market: 시장 상황 조건으로 발동
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EasterEggCategory = 'time' | 'behavior' | 'market';

export interface EasterEgg {
  id: string;
  nameKo: string;
  nameEn: string;
  category: EasterEggCategory;
  descriptionKo: string;
  descriptionEn: string;
  /** Which guru triggers this */
  guruId: string;
  /** Emoji shown when discovered */
  emoji: string;
  /** Reward credits */
  rewardCredits: number;
}

// ---------------------------------------------------------------------------
// Time-based Easter Eggs (7)
// ---------------------------------------------------------------------------

const TIME_EGGS: EasterEgg[] = [
  {
    id: 'night_owl_dalio',
    nameKo: '새벽의 명상가',
    nameEn: 'Midnight Meditator',
    category: 'time',
    descriptionKo: '달리오가 새벽에 별을 보며 명상하고 있습니다',
    descriptionEn: 'Dalio is meditating under the stars at dawn',
    guruId: 'dalio',
    emoji: '\u{1F31F}', // 🌟
    rewardCredits: 3,
  },
  {
    id: 'friday_buffett_letter',
    nameKo: '주주서한의 시간',
    nameEn: "Buffett's Friday Letter",
    category: 'time',
    descriptionKo: '버핏이 금요일 오후에 주주서한을 쓰고 있습니다',
    descriptionEn: 'Buffett is writing his shareholder letter on Friday afternoon',
    guruId: 'buffett',
    emoji: '\u{2709}\u{FE0F}', // ✉️
    rewardCredits: 3,
  },
  {
    id: 'monday_morning_dimon',
    nameKo: '월요일의 리더',
    nameEn: "Dimon's Monday Prep",
    category: 'time',
    descriptionKo: '다이먼이 월요일 아침 넥타이를 매고 있습니다',
    descriptionEn: 'Dimon is tying his tie on Monday morning',
    guruId: 'dimon',
    emoji: '\u{1F454}', // 👔
    rewardCredits: 3,
  },
  {
    id: 'lunch_lynch_research',
    nameKo: '린치의 현장 조사',
    nameEn: "Lynch's Field Research",
    category: 'time',
    descriptionKo: '린치가 점심시간에 마트에서 종목을 찾고 있습니다',
    descriptionEn: 'Lynch is researching stocks at the supermarket during lunch',
    guruId: 'lynch',
    emoji: '\u{1F6D2}', // 🛒
    rewardCredits: 3,
  },
  {
    id: 'dawn_rogers_travel',
    nameKo: '탐험가의 새벽',
    nameEn: "Rogers' Dawn Journey",
    category: 'time',
    descriptionKo: '로저스가 새벽에 세계 여행을 준비하고 있습니다',
    descriptionEn: 'Rogers is preparing for his world journey at dawn',
    guruId: 'rogers',
    emoji: '\u{1F30D}', // 🌍
    rewardCredits: 3,
  },
  {
    id: 'midnight_saylor_bitcoin',
    nameKo: '자정의 비트코인',
    nameEn: "Saylor's Midnight Chart",
    category: 'time',
    descriptionKo: '세일러가 자정에 비트코인 차트를 분석하고 있습니다',
    descriptionEn: 'Saylor is analyzing Bitcoin charts at midnight',
    guruId: 'saylor',
    emoji: '\u{1F4CA}', // 📊
    rewardCredits: 3,
  },
  {
    id: 'sunset_marks_memo',
    nameKo: '저녁의 메모 작가',
    nameEn: "Marks' Sunset Memo",
    category: 'time',
    descriptionKo: '막스가 저녁노을 아래 메모를 쓰고 있습니다',
    descriptionEn: 'Marks is writing his memo under the sunset',
    guruId: 'marks',
    emoji: '\u{1F4DD}', // 📝
    rewardCredits: 3,
  },
];

// ---------------------------------------------------------------------------
// Behavior-based Easter Eggs (5)
// ---------------------------------------------------------------------------

const BEHAVIOR_EGGS: EasterEgg[] = [
  {
    id: 'guru_bestie_30',
    nameKo: '30일의 우정',
    nameEn: '30-Day Friendship',
    category: 'behavior',
    descriptionKo: '한 구루와 30일 연속 대화를 나누었습니다!',
    descriptionEn: 'You talked with a guru for 30 days straight!',
    guruId: 'buffett', // placeholder — resolved dynamically
    emoji: '\u{1F91D}', // 🤝
    rewardCredits: 10,
  },
  {
    id: 'all_friends_lv3',
    nameKo: '마을의 인싸',
    nameEn: 'Village Social Star',
    category: 'behavior',
    descriptionKo: '모든 구루와 우정 Lv3 이상을 달성했습니다!',
    descriptionEn: 'All gurus are now at friendship Lv3+!',
    guruId: 'dalio', // placeholder — all gurus involved
    emoji: '\u{2B50}', // ⭐
    rewardCredits: 15,
  },
  {
    id: 'perfect_10',
    nameKo: '10연속 적중!',
    nameEn: '10-Hit Streak!',
    category: 'behavior',
    descriptionKo: '예측을 10번 연속 적중! 캐시우드가 감탄합니다',
    descriptionEn: '10 correct predictions in a row! Cathie is impressed',
    guruId: 'cathie_wood',
    emoji: '\u{1F3AF}', // 🎯
    rewardCredits: 10,
  },
  {
    id: 'early_bird_7',
    nameKo: '7일 연속 얼리버드',
    nameEn: '7-Day Early Bird',
    category: 'behavior',
    descriptionKo: '7일 연속 아침 7시 전 접속! 버핏의 아침 루틴을 공유합니다',
    descriptionEn: '7 days of early access! Buffett shares his morning routine',
    guruId: 'buffett',
    emoji: '\u{1F305}', // 🌅
    rewardCredits: 5,
  },
  {
    id: 'night_streak_7',
    nameKo: '7일 연속 올빼미',
    nameEn: '7-Night Owl Streak',
    category: 'behavior',
    descriptionKo: '7일 연속 자정 이후 접속! 세일러의 비밀 메시지',
    descriptionEn: '7 nights of late access! Saylor has a secret message',
    guruId: 'saylor',
    emoji: '\u{1F319}', // 🌙
    rewardCredits: 5,
  },
];

// ---------------------------------------------------------------------------
// Market-based Easter Eggs (3)
// ---------------------------------------------------------------------------

const MARKET_EGGS: EasterEgg[] = [
  {
    id: 'btc_ath',
    nameKo: '비트코인 신고가!',
    nameEn: 'Bitcoin ATH!',
    category: 'market',
    descriptionKo: '세일러가 깃발을 흔들며 축하하고 있습니다!',
    descriptionEn: 'Saylor is waving a flag in celebration!',
    guruId: 'saylor',
    emoji: '\u{1F6A9}', // 🚩
    rewardCredits: 5,
  },
  {
    id: 'vix_fear',
    nameKo: '공포의 안개',
    nameEn: 'Fear Fog',
    category: 'market',
    descriptionKo: 'VIX 30 돌파! 마을에 안개가 끼지만 버핏은 미소 짓습니다',
    descriptionEn: 'VIX above 30! Fog rolls in but Buffett is smiling',
    guruId: 'buffett',
    emoji: '\u{1F60C}', // 😌
    rewardCredits: 5,
  },
  {
    id: 'gold_rush',
    nameKo: '금 열풍',
    nameEn: 'Gold Rush',
    category: 'market',
    descriptionKo: '금 가격 상승 중! 로저스가 행복해하고 있습니다',
    descriptionEn: 'Gold is rising! Rogers is overjoyed',
    guruId: 'rogers',
    emoji: '\u{1F49B}', // 💛
    rewardCredits: 5,
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** All 15 easter eggs */
export const ALL_EASTER_EGGS: EasterEgg[] = [
  ...TIME_EGGS,
  ...BEHAVIOR_EGGS,
  ...MARKET_EGGS,
];

/** Time-based eggs only */
export const TIME_EASTER_EGGS: EasterEgg[] = TIME_EGGS;

/** Behavior-based eggs only */
export const BEHAVIOR_EASTER_EGGS: EasterEgg[] = BEHAVIOR_EGGS;

/** Market-based eggs only */
export const MARKET_EASTER_EGGS: EasterEgg[] = MARKET_EGGS;

/** Lookup an egg by ID */
export function getEasterEggById(id: string): EasterEgg | undefined {
  return ALL_EASTER_EGGS.find(egg => egg.id === id);
}

// ---------------------------------------------------------------------------
// Time-based condition helpers
// ---------------------------------------------------------------------------

/**
 * KST hour & day-of-week ranges for time-based eggs.
 * { eggId: { hours: [start, endExclusive], days?: number[] (0=Sun..6=Sat) } }
 */
export const TIME_EGG_CONDITIONS: Record<string, { hours: [number, number]; days?: number[] }> = {
  night_owl_dalio:       { hours: [2, 3] },                     // 2-3 AM KST
  friday_buffett_letter: { hours: [15, 16], days: [5] },        // Fri 15:30-16:00 → 15-16 window
  monday_morning_dimon:  { hours: [7, 8], days: [1] },          // Mon 7-8 AM KST
  lunch_lynch_research:  { hours: [12, 13], days: [1, 2, 3, 4, 5] }, // Weekday 12-13
  dawn_rogers_travel:    { hours: [5, 6] },                     // 5-6 AM KST
  midnight_saylor_bitcoin: { hours: [0, 1] },                   // Midnight 0-1 AM KST
  sunset_marks_memo:     { hours: [18, 19] },                   // 18-19 KST
};
