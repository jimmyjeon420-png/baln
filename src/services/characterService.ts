/**
 * 캐릭터 서비스 — 표정 매핑 & 설정 조회 유틸리티
 *
 * 역할: "캐릭터 매니저" — 센티먼트를 표정으로 변환하고 캐릭터 설정을 조회
 * 비유: 감정 번역기 — AI 분석 결과(BULLISH/BEARISH)를 캐릭터 얼굴 표정으로 바꿔줌
 */

import type { CharacterExpression } from '../types/character';
import { GURU_CHARACTER_CONFIGS, findCharacterConfigByName } from '../data/guruCharacterConfig';
import type { GuruCharacterConfig } from '../types/character';
import { getCurrentLanguage } from '../locales';

/**
 * 센티먼트 → 캐릭터 표정 변환
 * GuruInsight.sentiment 값을 CharacterExpression으로 매핑
 */
export function sentimentToExpression(
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS' | string | undefined
): CharacterExpression {
  switch (sentiment) {
    case 'BULLISH':
      return 'bullish';
    case 'BEARISH':
      return 'bearish';
    case 'CAUTIOUS':
      return 'cautious';
    case 'NEUTRAL':
    default:
      return 'neutral';
  }
}

/**
 * guruId로 캐릭터 설정 조회
 */
export function getCharacterConfig(guruId: string): GuruCharacterConfig | null {
  return GURU_CHARACTER_CONFIGS[guruId] || null;
}

/**
 * 구루 이름(한글/영문)으로 guruId 추론
 * gurus.tsx의 GuruInsight → CharacterAvatar 연결에 사용
 */
export function guruNameToCharacterId(name: string): string | null {
  const config = findCharacterConfigByName(name);
  return config?.guruId || null;
}

/**
 * 현재 언어에 맞는 구루 표시 이름 반환
 * ko → guruName (워렌 버핏), en → guruNameEn (Warren Buffett)
 */
export function getGuruDisplayName(guruId: string): string {
  const config = GURU_CHARACTER_CONFIGS[guruId];
  if (!config) return guruId;
  return getCurrentLanguage() === 'ko' ? config.guruName : (config.guruNameEn || config.guruName);
}

/**
 * SVG 캐릭터가 있는지 확인
 */
export function hasCharacterSvg(guruId: string): boolean {
  return GURU_CHARACTER_CONFIGS[guruId]?.hasSvg === true;
}
