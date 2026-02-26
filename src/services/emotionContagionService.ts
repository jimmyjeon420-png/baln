/**
 * 감정 전이 서비스 (Emotion Contagion Service)
 *
 * 역할: "마을 감정 전파기" — 구루 간 감정이 서로 영향을 주는 시스템
 * 비유: 옆집 올빼미가 신나면 동맹인 사슴도 기분이 좋아지고,
 *       라이벌인 늑대는 오히려 짜증이 남
 *
 * 규칙:
 * - 동맹(ally) + 흥분(excited) → 기분 상승
 * - 라이벌(rival) + 흥분(excited) → 기분 하락
 * - 동맹(ally) + 걱정(worried) → 같이 걱정
 * - 라이벌(rival) + 걱정(worried) → 오히려 차분 (역발상)
 *
 * WORLD_DESIGN.md 섹션 26-4
 */

import type { GuruMood } from '../types/village';

// ============================================================================
// Types
// ============================================================================

export interface GuruRelation {
  guruIdA: string;
  guruIdB: string;
  type: 'ally' | 'rival' | 'neutral';
}

// ============================================================================
// Mood ordering (for shift calculations)
// ============================================================================

/** Mood spectrum from most negative to most positive */
const MOOD_SPECTRUM: GuruMood[] = [
  'sad',
  'angry',
  'grumpy',
  'worried',
  'sleepy',
  'thinking',
  'thoughtful',
  'calm',
  'joy',
  'joyful',
  'surprised',
  'excited',
];

function getMoodIndex(mood: GuruMood): number {
  const idx = MOOD_SPECTRUM.indexOf(mood);
  return idx >= 0 ? idx : 7; // default to 'calm' position
}

function getMoodByIndex(index: number): GuruMood {
  const clamped = Math.max(0, Math.min(MOOD_SPECTRUM.length - 1, index));
  return MOOD_SPECTRUM[clamped];
}

/**
 * Shift a mood toward a target direction
 * direction > 0 = more positive, direction < 0 = more negative
 */
function shiftMood(currentMood: GuruMood, direction: number): GuruMood {
  const currentIndex = getMoodIndex(currentMood);
  const newIndex = currentIndex + direction;
  return getMoodByIndex(newIndex);
}

// ============================================================================
// Main API
// ============================================================================

/**
 * 감정 전파 계산
 *
 * 각 구루의 감정을 동맹/라이벌 관계에 따라 조정
 *
 * @param moods - 현재 구루별 감정 맵 (guruId → GuruMood)
 * @param relations - 구루 간 관계 배열
 * @returns 전파 후 감정 맵
 */
export function spreadEmotions(
  moods: Map<string, GuruMood>,
  relations: GuruRelation[],
): Map<string, GuruMood> {
  const result = new Map<string, GuruMood>(moods);

  // For each guru, accumulate mood shifts from related gurus
  const shifts = new Map<string, number>();

  for (const relation of relations) {
    const moodA = moods.get(relation.guruIdA);
    const moodB = moods.get(relation.guruIdB);

    if (!moodA || !moodB) continue;

    // Calculate influence of A on B, and B on A
    applyInfluence(relation.guruIdA, moodA, relation.guruIdB, relation.type, shifts);
    applyInfluence(relation.guruIdB, moodB, relation.guruIdA, relation.type, shifts);
  }

  // Apply accumulated shifts
  for (const [guruId, shift] of shifts) {
    const currentMood = moods.get(guruId);
    if (currentMood && shift !== 0) {
      result.set(guruId, shiftMood(currentMood, shift));
    }
  }

  return result;
}

/**
 * Convert GURU_RELATIONS record format to GuruRelation array
 */
export function relationsRecordToArray(
  record: Record<string, Record<string, 'ally' | 'rival' | 'neutral'>>,
): GuruRelation[] {
  const seen = new Set<string>();
  const result: GuruRelation[] = [];

  for (const [guruA, rels] of Object.entries(record)) {
    for (const [guruB, type] of Object.entries(rels)) {
      const key = [guruA, guruB].sort().join(':');
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ guruIdA: guruA, guruIdB: guruB, type });
      }
    }
  }

  return result;
}

// ============================================================================
// Internal
// ============================================================================

function applyInfluence(
  sourceId: string,
  sourceMood: GuruMood,
  targetId: string,
  relationType: 'ally' | 'rival' | 'neutral',
  shifts: Map<string, number>,
): void {
  // Don't influence self
  if (sourceId === targetId) return;

  let shift = 0;

  if (sourceMood === 'excited' || sourceMood === 'joy' || sourceMood === 'joyful') {
    // Source is happy
    if (relationType === 'ally') {
      shift = 1; // Ally gets mood boost
    } else if (relationType === 'rival') {
      shift = -1; // Rival gets mood drop
    }
  } else if (sourceMood === 'worried' || sourceMood === 'sad') {
    // Source is worried/sad
    if (relationType === 'ally') {
      shift = -1; // Ally worries too
    } else if (relationType === 'rival') {
      shift = 1; // Rival stays calm (contrarian)
    }
  } else if (sourceMood === 'angry' || sourceMood === 'grumpy') {
    // Source is angry
    if (relationType === 'ally') {
      shift = -1; // Ally gets pulled down
    } else if (relationType === 'rival') {
      shift = 0; // Rival ignores
    }
  }
  // Neutral and other moods: no influence

  if (shift !== 0) {
    const current = shifts.get(targetId) || 0;
    shifts.set(targetId, current + shift);
  }
}
