/**
 * villageReactionService — 사용자 행동에 구루가 반응하는 로직
 *
 * 역할: "마을 이벤트 연출가" — 유저가 뭔가를 하면 구루들이 반응
 * 비유: 동물의숲에서 주민이 뛰어와서 "선물 있어!" 하는 그 느낌
 *
 * "예측 적중하면 가장 친한 구루가 축하해주고,
 *  스트릭 달성하면 전원 파티, 시장 급락하면 버핏이 안심시키는"
 *  그런 살아있는 반응 시스템
 *
 * 사용처:
 * - 마을 탭: 반응 이벤트 표시 (이모지 + 말풍선)
 * - 오늘 탭: 예측 적중/스트릭 달성 시 반응 트리거
 */

import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';

// ============================================================================
// 타입
// ============================================================================

export type VillageReactionType =
  | 'prediction_correct'    // 예측 적중
  | 'streak_7'              // 7일 스트릭
  | 'streak_30'             // 30일 스트릭
  | 'streak_90'             // 90일 스트릭
  | 'context_card_read'     // 맥락카드 읽기
  | 'first_visit_today'     // 오늘 첫 방문
  | 'market_crash'          // 시장 급락 -3%
  | 'level_up';             // 번영도 레벨업

export interface VillageReaction {
  type: VillageReactionType;
  /** 반응할 구루 ID 목록 */
  reactingGurus: string[];
  /** 구루별 이모지 */
  emojis: Record<string, string>;
  /** 구루별 말풍선 메시지 (ko/en) */
  messages: Record<string, { ko: string; en: string }>;
  /** 반응 지속 시간 (ms) */
  duration: number;
  /** 전원 모이기 여부 */
  isGroupReaction: boolean;
}

// ============================================================================
// 상수
// ============================================================================

/** 10명 전원 ID 목록 */
const ALL_GURU_IDS = Object.keys(GURU_CHARACTER_CONFIGS);

/** 요일별 당직 구루 (0=일~6=토) */
const DUTY_GURUS: string[] = [
  'buffett',       // 일요일
  'dalio',         // 월요일
  'cathie_wood',   // 화요일
  'druckenmiller', // 수요일
  'saylor',        // 목요일
  'dimon',         // 금요일
  'musk',          // 토요일
];

// ============================================================================
// 유틸
// ============================================================================

/** 구루 이모지 가져오기 (없으면 기본 이모지) */
function getEmoji(guruId: string): string {
  return GURU_CHARACTER_CONFIGS[guruId]?.emoji ?? '🐾';
}

/** 구루 이름(한글) 가져오기 */
function getName(guruId: string): string {
  return GURU_CHARACTER_CONFIGS[guruId]?.guruName ?? guruId;
}

/** 구루 이름(영문) 가져오기 */
function getNameEn(guruId: string): string {
  return GURU_CHARACTER_CONFIGS[guruId]?.guruNameEn ?? guruId;
}

/** 전원 이모지 맵 생성 */
function allEmojis(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const id of ALL_GURU_IDS) {
    result[id] = getEmoji(id);
  }
  return result;
}

// ============================================================================
// 핵심 함수
// ============================================================================

/**
 * getReaction — 사용자 행동에 대한 구루 반응 생성
 *
 * @param type        - 행동 타입
 * @param closestGuruId - 가장 친한 구루 ID (useGuruFriendship.getTopFriends(1)에서 가져옴)
 * @param dayOfWeek   - 요일 (0=일~6=토, first_visit_today 당직 구루 결정용)
 * @returns 반응 객체 또는 null (해당 없음)
 */
export function getReaction(
  type: VillageReactionType,
  closestGuruId?: string,
  dayOfWeek?: number,
): VillageReaction | null {
  switch (type) {
    // ─── 예측 적중: 가장 친한 구루가 달려와서 축하 ───
    case 'prediction_correct': {
      const guru = closestGuruId ?? 'buffett';
      return {
        type,
        reactingGurus: [guru],
        emojis: { [guru]: '🎉' },
        messages: {
          [guru]: {
            ko: `${getName(guru)}: 잘했어! 역시 네 판단이 맞았지!`,
            en: `${getNameEn(guru)}: Great call! I knew your judgment was right!`,
          },
        },
        duration: 4000,
        isGroupReaction: false,
      };
    }

    // ─── 7일 스트릭: 전원 축하 ───
    case 'streak_7': {
      const messages: Record<string, { ko: string; en: string }> = {};
      for (const id of ALL_GURU_IDS) {
        messages[id] = {
          ko: '일주일 연속! 대단해!',
          en: '7 days! Impressive!',
        };
      }
      return {
        type,
        reactingGurus: ALL_GURU_IDS,
        emojis: allEmojis(),
        messages,
        duration: 6000,
        isGroupReaction: true,
      };
    }

    // ─── 30일 스트릭: 전원 경의 ───
    case 'streak_30': {
      const messages: Record<string, { ko: string; en: string }> = {};
      for (const id of ALL_GURU_IDS) {
        messages[id] = {
          ko: '한 달이라니... 진짜 투자자야!',
          en: 'One month... A real investor!',
        };
      }
      return {
        type,
        reactingGurus: ALL_GURU_IDS,
        emojis: allEmojis(),
        messages,
        duration: 6000,
        isGroupReaction: true,
      };
    }

    // ─── 90일 스트릭: 전원 레전드 ───
    case 'streak_90': {
      const messages: Record<string, { ko: string; en: string }> = {};
      for (const id of ALL_GURU_IDS) {
        messages[id] = {
          ko: '전설이 되어가고 있어!',
          en: 'Becoming a legend!',
        };
      }
      return {
        type,
        reactingGurus: ALL_GURU_IDS,
        emojis: allEmojis(),
        messages,
        duration: 6000,
        isGroupReaction: true,
      };
    }

    // ─── 맥락카드 읽기: 달리오가 고개를 끄덕임 ───
    case 'context_card_read': {
      return {
        type,
        reactingGurus: ['dalio'],
        emojis: { dalio: '📖' },
        messages: {
          dalio: {
            ko: '달리오: 잘 봤어 🦌',
            en: 'Dalio: Good read 🦌',
          },
        },
        duration: 3000,
        isGroupReaction: false,
      };
    }

    // ─── 오늘 첫 방문: 당직 구루가 인사 ───
    case 'first_visit_today': {
      const dow = dayOfWeek ?? new Date().getDay();
      const dutyGuru = DUTY_GURUS[dow] ?? 'buffett';
      return {
        type,
        reactingGurus: [dutyGuru],
        emojis: { [dutyGuru]: '👋' },
        messages: {
          [dutyGuru]: {
            ko: `${getName(dutyGuru)}: 안녕! 오늘도 잘 왔어!`,
            en: `${getNameEn(dutyGuru)}: Hey! Glad you're here today!`,
          },
        },
        duration: 3500,
        isGroupReaction: false,
      };
    }

    // ─── 시장 급락: 버핏이 안심시키고 세일러가 하울링 ───
    case 'market_crash': {
      return {
        type,
        reactingGurus: ['buffett', 'saylor'],
        emojis: {
          buffett: '🦉',
          saylor: '🐺',
        },
        messages: {
          buffett: {
            ko: '버핏: 괜찮아, 이럴 때가 기회야. 두려워할 때 사는 거야.',
            en: 'Buffett: It\'s okay, this is opportunity. Be greedy when others are fearful.',
          },
          saylor: {
            ko: '세일러: 아우우우! 할인이다! 🌕',
            en: 'Saylor: Awooo! Discount time! 🌕',
          },
        },
        duration: 5000,
        isGroupReaction: false,
      };
    }

    // ─── 번영도 레벨업: 전원 축하 파티 ───
    case 'level_up': {
      const messages: Record<string, { ko: string; en: string }> = {};
      for (const id of ALL_GURU_IDS) {
        messages[id] = {
          ko: '마을이 한 단계 성장했어! 🎉',
          en: 'Village leveled up! 🎉',
        };
      }
      return {
        type,
        reactingGurus: ALL_GURU_IDS,
        emojis: allEmojis(),
        messages,
        duration: 5000,
        isGroupReaction: true,
      };
    }

    default:
      return null;
  }
}
