/**
 * 구루 감정 엔진 (Mood Engine)
 *
 * 역할: "마을 심리학자" — 각 구루의 현재 감정을 계산
 * - 시장 센티먼트, 날씨, 시간, 주변 구루의 감정을 종합
 * - 구루별 성격 가중치로 개성 표현 (버핏=항상 침착, 머스크=예측불가)
 * - 감정 전이(emotional contagion): 동맹이 기뻐하면 나도 기뻐지고, 라이벌이 기뻐하면 짜증
 * - 결정론적(deterministic): 같은 입력이면 같은 출력 → UI 깜빡임 방지
 *
 * 비유: 각 구루의 "감정 온도계" — 여러 요소를 넣으면 지금 기분이 나옴
 */

import type { GuruMood, VillageWeather } from '../types/village';

// ============================================================================
// 구루별 감정 가중치 (성격 DNA)
// ============================================================================

/**
 * 각 구루의 성격 파라미터
 *
 * marketSentiment: 시장이 감정에 미치는 영향 (0~1)
 * weatherSensitivity: 날씨가 감정에 미치는 영향 (0~1)
 * socialInfluence: 주변 구루가 감정에 미치는 영향 (0~1)
 * baseOptimism: 타고난 낙관도 (-1 비관 ~ 1 낙관)
 */
interface MoodWeights {
  marketSentiment: number;
  weatherSensitivity: number;
  socialInfluence: number;
  baseOptimism: number;
}

const GURU_MOOD_WEIGHTS: Record<string, MoodWeights> = {
  buffett: {
    marketSentiment: 0.2,
    weatherSensitivity: 0.3,
    socialInfluence: 0.1,
    baseOptimism: 0.6,
  },
  dalio: {
    marketSentiment: 0.4,
    weatherSensitivity: 0.2,
    socialInfluence: 0.3,
    baseOptimism: 0.3,
  },
  cathie_wood: {
    marketSentiment: 0.7,
    weatherSensitivity: 0.2,
    socialInfluence: 0.3,
    baseOptimism: 0.8,
  },
  druckenmiller: {
    marketSentiment: 0.8,
    weatherSensitivity: 0.1,
    socialInfluence: 0.2,
    baseOptimism: 0.4,
  },
  saylor: {
    marketSentiment: 0.5,
    weatherSensitivity: 0.1,
    socialInfluence: 0.1,
    baseOptimism: 0.9, // BTC moon forever
  },
  dimon: {
    marketSentiment: 0.5,
    weatherSensitivity: 0.3,
    socialInfluence: 0.4,
    baseOptimism: 0.5,
  },
  musk: {
    marketSentiment: 0.3,
    weatherSensitivity: 0.1,
    socialInfluence: 0.2,
    baseOptimism: 0.7, // chaotic neutral
  },
  lynch: {
    marketSentiment: 0.3,
    weatherSensitivity: 0.5,
    socialInfluence: 0.3,
    baseOptimism: 0.6,
  },
  marks: {
    marketSentiment: 0.6,
    weatherSensitivity: 0.2,
    socialInfluence: 0.3,
    baseOptimism: 0.2, // cautious by nature
  },
  rogers: {
    marketSentiment: 0.4,
    weatherSensitivity: 0.4,
    socialInfluence: 0.2,
    baseOptimism: 0.5,
  },
};

/** 기본 가중치 (설정 없는 구루 대비 안전장치) */
const DEFAULT_WEIGHTS: MoodWeights = {
  marketSentiment: 0.4,
  weatherSensitivity: 0.2,
  socialInfluence: 0.2,
  baseOptimism: 0.5,
};

// ============================================================================
// 구루 간 관계 (감정 전이에 사용)
// ============================================================================

const GURU_RELATIONS: Record<string, Record<string, 'ally' | 'rival'>> = {
  buffett: { cathie_wood: 'rival', saylor: 'rival', dalio: 'ally', lynch: 'ally', marks: 'ally' },
  dalio: { buffett: 'ally', rogers: 'ally', druckenmiller: 'ally' },
  cathie_wood: { buffett: 'rival', musk: 'ally', saylor: 'ally', dimon: 'rival' },
  druckenmiller: { dalio: 'ally', musk: 'rival' },
  saylor: { buffett: 'rival', dimon: 'rival', musk: 'ally', cathie_wood: 'ally' },
  dimon: { saylor: 'rival', musk: 'rival', marks: 'ally', buffett: 'ally' },
  musk: { cathie_wood: 'ally', saylor: 'ally', dimon: 'rival', marks: 'rival' },
  lynch: { buffett: 'ally', marks: 'ally' },
  marks: { buffett: 'ally', lynch: 'ally', dimon: 'ally' },
  rogers: { dalio: 'ally', druckenmiller: 'ally' },
};

// ============================================================================
// 날씨 → 감정 스코어
// ============================================================================

/**
 * 날씨 상태 → 감정 점수 (-1 불쾌 ~ 1 쾌적)
 */
function weatherToMoodScore(weather: VillageWeather): number {
  switch (weather.condition) {
    case 'clear': return 0.6;
    case 'rainbow': return 0.9;
    case 'clouds': return 0.1;
    case 'fog': return -0.1;
    case 'rain': return -0.3;
    case 'snow': return -0.1; // 눈은 예쁘니까 약간만 감소
    case 'storm': return -0.7;
    default: return 0;
  }
}

/**
 * 시간대 → 감정 보정 (0~23시)
 * 아침/낮 = 활기, 밤 = 졸림, 새벽 = 평온
 */
function timeToMoodModifier(hour: number): { moodBonus: number; isSleepy: boolean } {
  if (hour >= 23 || hour < 5) return { moodBonus: -0.3, isSleepy: true };
  if (hour >= 5 && hour < 8) return { moodBonus: 0.1, isSleepy: false };   // 이른 아침
  if (hour >= 8 && hour < 12) return { moodBonus: 0.3, isSleepy: false };  // 오전
  if (hour >= 12 && hour < 14) return { moodBonus: 0.1, isSleepy: false }; // 점심
  if (hour >= 14 && hour < 16) return { moodBonus: 0.0, isSleepy: false }; // 오후
  if (hour >= 16 && hour < 19) return { moodBonus: 0.2, isSleepy: false }; // 늦은 오후
  return { moodBonus: -0.1, isSleepy: false }; // 저녁
}

// ============================================================================
// 핵심: 감정 계산
// ============================================================================

/**
 * 구루의 현재 감정 계산 (결정론적 — 같은 입력이면 같은 출력)
 *
 * @param guruId 구루 식별자
 * @param marketSentiment 시장 센티먼트 (-1 급락 ~ 1 급등)
 * @param weather 현재 마을 날씨
 * @param timeOfDay 현재 시각 (0~23)
 * @param nearbyGuruMoods 주변 구루들의 감정 (감정 전이용, 선택적)
 * @returns 계산된 감정 상태
 */
export function calculateGuruMood(
  guruId: string,
  marketSentiment: number, // -1 (crash) to 1 (boom)
  weather: VillageWeather,
  timeOfDay: number,
  nearbyGuruMoods?: Map<string, GuruMood>,
): GuruMood {
  const weights = GURU_MOOD_WEIGHTS[guruId] || DEFAULT_WEIGHTS;
  const { moodBonus, isSleepy } = timeToMoodModifier(timeOfDay);

  // 밤이면 졸림 우선
  if (isSleepy) return 'sleepy';

  // 1. 시장 영향 점수 (-1 ~ 1)
  const marketScore = marketSentiment * weights.marketSentiment;

  // 2. 날씨 영향 점수 (-1 ~ 1)
  const weatherScore = weatherToMoodScore(weather) * weights.weatherSensitivity;

  // 3. 시간 영향
  const timeScore = moodBonus * 0.3;

  // 4. 기본 낙관도 (성격)
  const baseScore = weights.baseOptimism * 0.4; // -0.4 ~ 0.4

  // 5. 사회적 영향 (주변 구루 감정 전이)
  let socialScore = 0;
  if (nearbyGuruMoods && nearbyGuruMoods.size > 0) {
    const contagionResult = calculateSocialInfluence(guruId, nearbyGuruMoods);
    socialScore = contagionResult * weights.socialInfluence;
  }

  // 종합 점수 (-1 ~ 1)
  const totalScore = clamp(
    marketScore + weatherScore + timeScore + baseScore + socialScore,
    -1,
    1,
  );

  // 점수 → 감정 변환
  return scoreToMood(totalScore, marketSentiment);
}

/**
 * 종합 점수 → 감정(GuruMood) 변환
 */
function scoreToMood(score: number, marketSentiment: number): GuruMood {
  // 극단적 시장 상황에서는 강한 감정 우선
  if (marketSentiment >= 0.05) return 'excited';
  if (marketSentiment <= -0.05) return 'sad';

  // 일반 점수 기반
  if (score >= 0.6) return 'excited';
  if (score >= 0.3) return 'joy';
  if (score >= 0.1) return 'calm';
  if (score >= -0.1) return 'thinking';
  if (score >= -0.3) return 'worried';
  if (score >= -0.6) return 'sad';
  return 'angry';
}

/**
 * 주변 구루들의 감정으로부터 사회적 영향 점수 계산
 */
function calculateSocialInfluence(
  guruId: string,
  nearbyMoods: Map<string, GuruMood>,
): number {
  const relations = GURU_RELATIONS[guruId] || {};
  let influence = 0;
  let count = 0;

  for (const [otherGuruId, otherMood] of nearbyMoods) {
    if (otherGuruId === guruId) continue;

    const moodValue = moodToScore(otherMood);
    const relation = relations[otherGuruId];

    if (relation === 'ally') {
      // 동맹의 기분에 동조 (같은 방향)
      influence += moodValue * 0.5;
    } else if (relation === 'rival') {
      // 라이벌의 기분에 반발 (반대 방향 + 짜증 가중)
      influence -= moodValue * 0.3;
    } else {
      // 중립 — 약한 동조
      influence += moodValue * 0.1;
    }
    count++;
  }

  return count > 0 ? influence / count : 0;
}

/**
 * 감정 → 점수 (사회적 영향 계산용)
 * 짧은 형태(joy)와 긴 형태(joyful) 모두 처리
 */
function moodToScore(mood: GuruMood): number {
  switch (mood) {
    case 'excited': return 0.8;
    case 'joy':
    case 'joyful': return 0.5;
    case 'calm': return 0.2;
    case 'thinking':
    case 'thoughtful': return 0;
    case 'worried': return -0.3;
    case 'sad': return -0.6;
    case 'angry':
    case 'grumpy': return -0.8;
    case 'surprised': return 0.3;
    case 'sleepy': return 0;
    default: return 0;
  }
}

// ============================================================================
// 감정 전이 (Emotional Contagion)
// ============================================================================

/**
 * 감정 전이 적용 — 근처 구루들의 감정이 자신의 감정에 영향
 *
 * 동맹이 근처에 있으면 감정이 수렴하고,
 * 라이벌이 좋은 감정이면 짜증이 남
 *
 * @param guruId 대상 구루
 * @param baseMood 기본 감정 (시장/날씨 기반)
 * @param nearbyGurus 주변 구루 정보 (거리 포함)
 * @returns 전이 적용 후 감정
 */
export function applyEmotionalContagion(
  guruId: string,
  baseMood: GuruMood,
  nearbyGurus: { guruId: string; mood: GuruMood; distance: number }[],
): GuruMood {
  if (nearbyGurus.length === 0) return baseMood;

  const weights = GURU_MOOD_WEIGHTS[guruId] || DEFAULT_WEIGHTS;
  const relations = GURU_RELATIONS[guruId] || {};

  let baseScore = moodToScore(baseMood);
  let totalInfluence = 0;
  let totalWeight = 0;

  for (const nearby of nearbyGurus) {
    if (nearby.guruId === guruId) continue;

    // 거리가 가까울수록 영향력 증가 (0~1 범위, 0.12 이하가 '근처')
    const distanceFactor = Math.max(0, 1 - nearby.distance / 0.3);
    if (distanceFactor <= 0) continue;

    const otherScore = moodToScore(nearby.mood);
    const relation = relations[nearby.guruId];

    let influence: number;
    if (relation === 'ally') {
      // 동맹: 감정 동조 (차이를 줄이는 방향)
      influence = (otherScore - baseScore) * 0.3 * distanceFactor;
    } else if (relation === 'rival') {
      // 라이벌: 상대가 기쁘면 짜증, 슬프면 약간 기분 좋음
      influence = -otherScore * 0.2 * distanceFactor;
    } else {
      // 중립: 약한 동조
      influence = (otherScore - baseScore) * 0.1 * distanceFactor;
    }

    totalInfluence += influence;
    totalWeight += distanceFactor;
  }

  // socialInfluence 가중치 적용
  const adjustedScore = baseScore + totalInfluence * weights.socialInfluence;
  const clampedScore = clamp(adjustedScore, -1, 1);

  // sleepy는 전이 대상이 아님
  if (baseMood === 'sleepy') return 'sleepy';

  return scoreToMoodGeneral(clampedScore);
}

/**
 * 점수 → 감정 (시장 센티먼트 없는 일반 변환)
 */
function scoreToMoodGeneral(score: number): GuruMood {
  if (score >= 0.6) return 'excited';
  if (score >= 0.3) return 'joy';
  if (score >= 0.1) return 'calm';
  if (score >= -0.1) return 'thinking';
  if (score >= -0.3) return 'worried';
  if (score >= -0.6) return 'sad';
  return 'angry';
}

// ============================================================================
// 하위 호환: 기존 4-표정 시스템과 호환
// ============================================================================

/**
 * GuruMood → CharacterExpression (기존 4-표정 시스템 호환)
 *
 * 8가지 감정을 기존 bullish/bearish/cautious/neutral 4개로 매핑
 */
export function moodToExpression(mood: GuruMood): 'bullish' | 'bearish' | 'cautious' | 'neutral' {
  switch (mood) {
    case 'excited':
    case 'joy':
    case 'joyful':
    case 'surprised':
      return 'bullish';
    case 'sad':
    case 'angry':
    case 'grumpy':
      return 'bearish';
    case 'worried':
    case 'thinking':
    case 'thoughtful':
      return 'cautious';
    case 'calm':
    case 'sleepy':
    default:
      return 'neutral';
  }
}

// ============================================================================
// UI 유틸
// ============================================================================

/**
 * 감정 → 이모지 (UI 표시용)
 */
export function getMoodEmoji(mood: GuruMood): string {
  switch (mood) {
    case 'joy':
    case 'joyful': return '😊';
    case 'excited': return '😤';
    case 'calm': return '😌';
    case 'thinking':
    case 'thoughtful': return '🤔';
    case 'worried': return '😟';
    case 'sad': return '😢';
    case 'angry':
    case 'grumpy': return '😠';
    case 'sleepy': return '😴';
    case 'surprised': return '😲';
    default: return '😌';
  }
}

/**
 * 감정 → 한국어/영어 이름
 */
export function getMoodLabel(mood: GuruMood): { ko: string; en: string } {
  switch (mood) {
    case 'joy':
    case 'joyful': return { ko: '기쁨', en: 'Happy' };
    case 'excited': return { ko: '흥분', en: 'Excited' };
    case 'calm': return { ko: '평온', en: 'Calm' };
    case 'thinking':
    case 'thoughtful': return { ko: '고민', en: 'Thinking' };
    case 'worried': return { ko: '걱정', en: 'Worried' };
    case 'sad': return { ko: '슬픔', en: 'Sad' };
    case 'angry':
    case 'grumpy': return { ko: '분노', en: 'Angry' };
    case 'sleepy': return { ko: '졸림', en: 'Sleepy' };
    case 'surprised': return { ko: '놀람', en: 'Surprised' };
    default: return { ko: '평온', en: 'Calm' };
  }
}

/**
 * 감정 → 색상 틴트 (미묘한 UI 색상 변화용)
 */
export function getMoodColor(mood: GuruMood): string {
  switch (mood) {
    case 'joy':
    case 'joyful': return '#FFD54F';    // 따뜻한 노란색
    case 'excited': return '#FF7043';   // 강렬한 오렌지
    case 'calm': return '#81C784';      // 부드러운 초록
    case 'thinking':
    case 'thoughtful': return '#90CAF9'; // 차분한 파랑
    case 'worried': return '#CE93D8';   // 불안한 보라
    case 'sad': return '#90A4AE';       // 침울한 회색
    case 'angry':
    case 'grumpy': return '#EF5350';    // 격앙된 빨강
    case 'sleepy': return '#B0BEC5';    // 잔잔한 회색
    case 'surprised': return '#FFB74D'; // 놀람 주황
    default: return '#81C784';
  }
}

// ============================================================================
// 유틸
// ============================================================================

/** 값을 min~max 범위로 제한 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
