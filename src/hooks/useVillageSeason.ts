/**
 * useVillageSeason -- 계절 시스템 활성화
 *
 * 역할: 현재 날짜 기반으로 계절을 결정하고
 *       계절별 시각적 파라미터(파티클 타입, 잎 색상, 환경 요소)를 반환
 * 비유: "마을 계절 달력" -- 자동으로 봄이면 벚꽃, 겨울이면 눈을 뿌려주는 시스템
 *
 * 사용처:
 * - SeasonParticles 컴포넌트에 파티클 타입/이모지 전달
 * - 마을 배경 나무 잎 색상 결정
 * - 계절 분위기 텍스트 표시
 */

import { useMemo } from 'react';
import type { Season } from '../types/village';

// ============================================================================
// 타입
// ============================================================================

export interface SeasonVisuals {
  /** 현재 계절 */
  season: Season;
  /** 렌더링할 파티클 종류 */
  particleType: 'cherry_blossom' | 'firefly' | 'falling_leaf' | 'snowflake' | 'none';
  /** 파티클 이모지 */
  particleEmoji: string;
  /** 나무 잎 색상 */
  leafColor: string;
  /** 지면 틴트 색상 */
  groundTint: string;
  /** 분위기 설명 (ko/en) */
  ambientText: { ko: string; en: string };
}

// ============================================================================
// 계절별 시각 데이터
// ============================================================================

const SEASON_DATA: Record<Season, Omit<SeasonVisuals, 'season'>> = {
  spring: {
    particleType: 'cherry_blossom',
    particleEmoji: '\uD83C\uDF38', // 벚꽃
    leafColor: '#A8D5A2',
    groundTint: '#E8F5E9',
    ambientText: {
      ko: '벚꽃이 흩날리는 마을...',
      en: 'Cherry blossoms drift through the village...',
    },
  },
  summer: {
    particleType: 'firefly',
    particleEmoji: '\u2728', // 반딧불
    leafColor: '#66BB6A',
    groundTint: '#F1F8E9',
    ambientText: {
      ko: '반딧불이 마을을 밝힌다...',
      en: 'Fireflies light up the village...',
    },
  },
  autumn: {
    particleType: 'falling_leaf',
    particleEmoji: '\uD83C\uDF42', // 낙엽
    leafColor: '#D4682A',
    groundTint: '#FFF3E0',
    ambientText: {
      ko: '낙엽이 바스락거린다...',
      en: 'Leaves crinkle underfoot...',
    },
  },
  winter: {
    particleType: 'snowflake',
    particleEmoji: '\u2744\uFE0F', // 눈
    leafColor: '#A0B8C0',
    groundTint: '#E3F2FD',
    ambientText: {
      ko: '눈이 소복이 쌓인다...',
      en: 'Snow gently blankets the village...',
    },
  },
};

// ============================================================================
// 월 -> 계절 매핑 (북반구 기준)
// ============================================================================

function getSeasonFromMonth(month: number): Season {
  // month: 0(Jan) ~ 11(Dec)
  if (month >= 2 && month <= 4) return 'spring';   // Mar-May
  if (month >= 5 && month <= 7) return 'summer';   // Jun-Aug
  if (month >= 8 && month <= 10) return 'autumn';  // Sep-Nov
  return 'winter';                                   // Dec-Feb
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 현재 날짜의 계절과 시각적 파라미터를 반환
 *
 * @returns SeasonVisuals 객체 (파티클 타입, 잎 색상, 분위기 텍스트 등)
 */
export function useVillageSeason(): SeasonVisuals {
  return useMemo(() => {
    const month = new Date().getMonth(); // 0~11
    const season = getSeasonFromMonth(month);
    const data = SEASON_DATA[season];

    return {
      season,
      ...data,
    };
  }, []);
}
