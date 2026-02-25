/**
 * 구루 활동 서비스 (Activity Service)
 *
 * 역할: "마을 일과 관리자" — 각 구루가 지금 뭘 하고 있는지 결정
 * - 30초마다 각 구루의 활동을 업데이트 (설계 문서의 "30초 결정 알고리즘")
 * - 구루별 성격에 맞는 활동 가중치 (버핏=독서, 머스크=디버깅)
 * - 날씨/시간/감정 제약 조건 적용 (비 올 때 별보기 금지 등)
 * - 같은 활동 연속 방지
 *
 * 비유: "구루 스케줄 매니저" — 누가, 언제, 뭘 하는지 결정하는 시스템
 */

import type { GuruActivity, GuruMood, VillageWeather, WeatherCondition } from '../types/village';

// ============================================================================
// 구루별 활동 가중치 (성격 DNA → 어떤 활동을 선호하는지)
// ============================================================================

/**
 * 각 구루가 활동별로 얼마나 선호하는지 가중치 (0~100)
 * 합계가 100일 필요는 없음 — 상대 비율로 확률 계산
 */
interface ActivityWeights {
  [activity: string]: number;
}

const GURU_ACTIVITY_WEIGHTS: Record<string, ActivityWeights> = {
  buffett: {
    reading: 30,
    walking: 15,
    fishing: 15,
    tea_ceremony: 10,
    chess: 10,
    napping: 10,
    cooking: 5,
    gardening: 5,
  },
  dalio: {
    meditating: 25,
    yoga: 20,
    reading: 15,
    walking: 10,
    gardening: 10,
    painting: 10,
    tea_ceremony: 5,
    writing: 5,
  },
  cathie_wood: {
    reading: 20,
    walking: 15,
    exercising: 15,
    debugging: 15,
    dancing: 10,
    photography: 10,
    stargazing: 10,
    painting: 5,
  },
  druckenmiller: {
    reading: 25,
    chess: 20,
    walking: 15,
    exercising: 10,
    fishing: 10,
    birdwatching: 10,
    tea_ceremony: 5,
    cooking: 5,
  },
  saylor: {
    reading: 20,
    surfing: 20,
    exercising: 15,
    stargazing: 15,
    walking: 10,
    debugging: 10,
    singing: 5,
    dancing: 5,
  },
  dimon: {
    reading: 25,
    walking: 20,
    tea_ceremony: 15,
    chess: 15,
    exercising: 10,
    cooking: 10,
    gardening: 5,
  },
  musk: {
    debugging: 25,
    stargazing: 20,
    dancing: 15,
    singing: 10,
    exercising: 10,
    painting: 10,
    surfing: 5,
    photography: 5,
  },
  lynch: {
    walking: 25,
    gardening: 20,
    cooking: 20,
    reading: 15,
    fishing: 10,
    birdwatching: 5,
    napping: 5,
  },
  marks: {
    writing: 30,
    reading: 25,
    walking: 15,
    tea_ceremony: 10,
    chess: 10,
    napping: 5,
    painting: 5,
  },
  rogers: {
    walking: 25,
    photography: 20,
    cooking: 15,
    fishing: 10,
    gardening: 10,
    birdwatching: 10,
    stargazing: 5,
    surfing: 5,
  },
};

/** 기본 활동 가중치 (설정 없는 구루용 안전장치) */
const DEFAULT_ACTIVITY_WEIGHTS: ActivityWeights = {
  walking: 25,
  reading: 20,
  tea_ceremony: 15,
  napping: 10,
  gardening: 10,
  cooking: 10,
  chess: 10,
};

// ============================================================================
// 감정 → 활동 보정
// ============================================================================

/**
 * 감정 상태에 따라 특정 활동의 가중치를 보정
 * 예: 기분 좋으면 춤추기/노래 가중치 증가, 슬프면 낮잠/독서 증가
 */
const MOOD_ACTIVITY_BONUS: Partial<Record<GuruMood, Record<string, number>>> = {
  joy: { dancing: 20, singing: 15, cooking: 10, gardening: 10 },
  joyful: { dancing: 20, singing: 15, cooking: 10, gardening: 10 },
  excited: { dancing: 30, singing: 20, exercising: 15, surfing: 10 },
  calm: { tea_ceremony: 15, reading: 10, gardening: 10, meditating: 10 },
  thinking: { reading: 20, writing: 15, chess: 15, walking: 10 },
  thoughtful: { reading: 20, writing: 15, chess: 15, walking: 10 },
  worried: { walking: 15, tea_ceremony: 10, reading: 10, meditating: 5 },
  sad: { napping: 20, reading: 15, walking: 10, writing: 5 },
  angry: { exercising: 25, walking: 20, debugging: 10 },
  grumpy: { exercising: 25, walking: 20, debugging: 10 },
  sleepy: { napping: 50 }, // 졸리면 거의 무조건 낮잠
  surprised: { walking: 10, dancing: 10, photography: 10 },
};

// ============================================================================
// 날씨 & 시간 제약 조건
// ============================================================================

/** 날씨에 따라 금지되는 활동 */
const WEATHER_RESTRICTIONS: Record<string, WeatherCondition[]> = {
  stargazing: ['rain', 'clouds', 'cloudy', 'storm', 'thunderstorm', 'fog'],
  surfing: ['snow', 'storm', 'thunderstorm', 'fog'],
  fishing: ['storm', 'thunderstorm'],
  gardening: ['storm', 'thunderstorm', 'snow'],
  photography: ['storm', 'thunderstorm'],
  birdwatching: ['storm', 'thunderstorm', 'snow'],
  painting: ['storm', 'thunderstorm', 'rain'], // 실외 그림 가정
  yoga: ['storm', 'thunderstorm', 'rain'],
};

/** 시간대에 따라 부적절한 활동 */
const TIME_RESTRICTIONS: Record<string, { notBefore?: number; notAfter?: number }> = {
  stargazing: { notBefore: 0, notAfter: 5 }, // 19시~05시만 가능 (반전: 이 시간대만 허용)
  napping: { notBefore: 6, notAfter: 8 },     // 아침 일찍은 낮잠 부적절
  singing: { notBefore: 23, notAfter: 6 },     // 밤에 노래 금지
  dancing: { notBefore: 23, notAfter: 6 },     // 밤에 춤 금지
  exercising: { notBefore: 22, notAfter: 5 },  // 야간 운동 금지
};

/**
 * 해당 날씨에서 활동이 허용되는지 확인
 */
export function isActivityAllowed(activity: GuruActivity, weather: VillageWeather): boolean {
  const restrictions = WEATHER_RESTRICTIONS[activity];
  if (!restrictions) return true;
  return !restrictions.includes(weather.condition);
}

/**
 * 해당 시간대에 활동이 적절한지 확인
 */
export function isActivityTimeAppropriate(activity: GuruActivity, hour: number): boolean {
  // 별보기는 특별 처리: 밤(19시~05시)에만 가능
  if (activity === 'stargazing') {
    return hour >= 19 || hour < 5;
  }

  const restriction = TIME_RESTRICTIONS[activity];
  if (!restriction) return true;

  const { notBefore, notAfter } = restriction;
  if (notBefore !== undefined && notAfter !== undefined) {
    // notBefore ~ notAfter 시간대에는 부적절
    if (notBefore <= notAfter) {
      return !(hour >= notBefore && hour < notAfter);
    }
    // 자정 넘는 경우 (예: 23~6)
    return !(hour >= notBefore || hour < notAfter);
  }
  return true;
}

// ============================================================================
// 핵심: 활동 선택 알고리즘
// ============================================================================

/**
 * 구루의 현재 활동 선택 (가중 랜덤 + 제약 조건)
 *
 * 결정 알고리즘:
 * 1. 구루별 기본 가중치 로드
 * 2. 감정 보정 적용
 * 3. 날씨/시간 제약으로 부적절한 활동 제거
 * 4. 현재 활동과 같은 것 가중치 감소 (연속 방지)
 * 5. 가중 랜덤으로 최종 선택
 *
 * @param guruId 구루 식별자
 * @param mood 현재 감정 상태
 * @param weather 현재 날씨
 * @param timeOfDay 현재 시각 (0~23)
 * @param currentActivity 현재 하고 있는 활동 (연속 방지용)
 */
export function selectActivity(
  guruId: string,
  mood: GuruMood,
  weather: VillageWeather,
  timeOfDay: number,
  currentActivity?: GuruActivity,
): GuruActivity {
  // 1. 기본 가중치
  const baseWeights = { ...(GURU_ACTIVITY_WEIGHTS[guruId] || DEFAULT_ACTIVITY_WEIGHTS) };

  // 2. 감정 보정
  const moodBonuses = MOOD_ACTIVITY_BONUS[mood] || {};
  for (const [act, bonus] of Object.entries(moodBonuses)) {
    baseWeights[act] = (baseWeights[act] || 0) + bonus;
  }

  // 3. 날씨/시간 필터링
  const filtered: Record<string, number> = {};
  for (const [act, weight] of Object.entries(baseWeights)) {
    const activity = act as GuruActivity;
    if (!isActivityAllowed(activity, weather)) continue;
    if (!isActivityTimeAppropriate(activity, timeOfDay)) continue;
    filtered[act] = weight;
  }

  // 4. 현재 활동과 동일하면 가중치 1/3로 감소 (연속 방지)
  if (currentActivity && filtered[currentActivity]) {
    filtered[currentActivity] = Math.round(filtered[currentActivity] / 3);
  }

  // 5. 가중 랜덤 선택
  const entries = Object.entries(filtered);
  if (entries.length === 0) {
    return 'walking'; // 아무것도 없으면 산책
  }

  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [act, w] of entries) {
    random -= w;
    if (random <= 0) return act as GuruActivity;
  }

  // 폴백
  return entries[0][0] as GuruActivity;
}

// ============================================================================
// 활동별 메타데이터
// ============================================================================

/**
 * 활동 → 이모지 (UI 표시용)
 */
export function getActivityEmoji(activity: GuruActivity): string {
  const emojiMap: Record<string, string> = {
    walking: '🚶',
    reading: '📖',
    fishing: '🎣',
    tea_ceremony: '🍵',
    chess: '♟️',
    napping: '💤',
    cooking: '🍳',
    gardening: '🌱',
    meditating: '🧘',
    yoga: '🧘',
    painting: '🎨',
    writing: '✍️',
    exercising: '🏋️',
    debugging: '💻',
    dancing: '💃',
    photography: '📷',
    stargazing: '🔭',
    surfing: '🏄',
    singing: '🎵',
    birdwatching: '🐦',
  };
  return emojiMap[activity] || '🚶';
}

/**
 * 활동 → 한국어/영어 설명 (말풍선/툴팁용)
 */
export function getActivityDescription(activity: GuruActivity): { ko: string; en: string } {
  const descriptions: Record<string, { ko: string; en: string }> = {
    walking: { ko: '산책 중', en: 'Taking a walk' },
    reading: { ko: '독서 중', en: 'Reading' },
    fishing: { ko: '낚시 중', en: 'Fishing' },
    tea_ceremony: { ko: '차 마시는 중', en: 'Having tea' },
    chess: { ko: '체스 두는 중', en: 'Playing chess' },
    napping: { ko: '낮잠 중 zzz', en: 'Napping zzz' },
    cooking: { ko: '요리 중', en: 'Cooking' },
    gardening: { ko: '정원 가꾸는 중', en: 'Gardening' },
    meditating: { ko: '명상 중', en: 'Meditating' },
    yoga: { ko: '요가 중', en: 'Doing yoga' },
    painting: { ko: '그림 그리는 중', en: 'Painting' },
    writing: { ko: '글 쓰는 중', en: 'Writing' },
    exercising: { ko: '운동 중', en: 'Exercising' },
    debugging: { ko: '코딩 중', en: 'Debugging' },
    dancing: { ko: '춤추는 중', en: 'Dancing' },
    photography: { ko: '사진 찍는 중', en: 'Taking photos' },
    stargazing: { ko: '별 보는 중', en: 'Stargazing' },
    surfing: { ko: '서핑 중', en: 'Surfing' },
    singing: { ko: '노래하는 중', en: 'Singing' },
    birdwatching: { ko: '새 관찰 중', en: 'Birdwatching' },
  };
  return descriptions[activity] || { ko: '산책 중', en: 'Taking a walk' };
}

/**
 * 활동 지속 시간 (분 단위) — 다음 활동으로 전환되기까지의 시간
 *
 * 짧은 활동 = 자주 전환되어 활기 있는 느낌
 * 긴 활동 = 안정적이고 몰입하는 느낌
 */
export function getActivityDuration(activity: GuruActivity): number {
  const durationMap: Record<string, number> = {
    walking: 5,        // 짧은 산책
    reading: 15,       // 독서는 오래
    fishing: 20,       // 낚시도 오래
    tea_ceremony: 10,  // 차 한잔
    chess: 15,         // 체스 한 판
    napping: 20,       // 낮잠은 좀 김
    cooking: 12,       // 요리
    gardening: 10,     // 정원 관리
    meditating: 15,    // 명상
    yoga: 12,          // 요가
    painting: 15,      // 그림
    writing: 20,       // 글쓰기는 오래
    exercising: 10,    // 운동
    debugging: 15,     // 코딩
    dancing: 5,        // 춤은 짧게
    photography: 8,    // 사진
    stargazing: 15,    // 별보기
    surfing: 10,       // 서핑
    singing: 5,        // 노래
    birdwatching: 12,  // 새 관찰
  };
  return durationMap[activity] || 10;
}

// ============================================================================
// 전체 활동 목록 (타입 검증용)
// ============================================================================

/** 사용 가능한 모든 활동 목록 */
export const ALL_ACTIVITIES: GuruActivity[] = [
  'walking',
  'reading',
  'fishing',
  'tea_ceremony',
  'chess',
  'napping',
  'cooking',
  'gardening',
  'meditating',
  'yoga',
  'painting',
  'writing',
  'exercising',
  'debugging',
  'dancing',
  'photography',
  'stargazing',
  'surfing',
  'singing',
  'birdwatching',
];
