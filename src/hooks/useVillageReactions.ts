/**
 * useVillageReactions -- 마을 구루 축하/반응 트리거 훅
 *
 * 역할: "마을 이벤트 연출 매니저" -- 사용자 행동(예측 적중, 스트릭, 맥락카드 읽기 등)에
 *       구루가 반응하는 이벤트를 발생시키고, 마을 말풍선/배너에 전달
 *
 * 비유: 동물의숲에서 주민이 뛰어와서 "축하해!" 하는 그 순간을 만드는 연출가
 *
 * 기능:
 * - 마운트 시 first_visit_today 자동 체크 (하루 1회)
 * - triggerReaction(type) 외부 호출용 함수
 * - activeReaction 상태 → 마을 탭 + 오늘 탭 배너 표시
 * - duration 후 자동 소멸
 *
 * 사용처:
 * - useVillageWorld (마스터 훅에서 통합)
 * - app/(tabs)/index.tsx (오늘 탭 배너)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getReaction,
  type VillageReaction,
  type VillageReactionType,
} from '../services/villageReactionService';

// ============================================================================
// 상수
// ============================================================================

/** AsyncStorage key: 오늘 첫 방문 기록 */
const FIRST_VISIT_KEY = '@baln:village_first_visit';

// ============================================================================
// 타입
// ============================================================================

/** 배너/말풍선에 표시할 단순화된 반응 객체 */
export interface ActiveReaction {
  /** 반응 타입 */
  type: VillageReactionType;
  /** 대표 구루 ID */
  guruId: string;
  /** 표시할 메시지 (로케일 적용 전 -- ko/en 둘 다 포함) */
  messageKo: string;
  messageEn: string;
  /** 이모지 */
  emoji: string;
  /** 전원 모이기 여부 */
  isGroupReaction: boolean;
  /** 원본 VillageReaction (마을 탭에서 전체 구루 위치 업데이트에 사용) */
  raw: VillageReaction;
}

export interface UseVillageReactionsReturn {
  /** 현재 활성 반응 (null이면 없음) */
  activeReaction: ActiveReaction | null;
  /** 외부에서 반응 트리거 호출 */
  triggerReaction: (
    type: VillageReactionType,
    closestGuruId?: string,
  ) => void;
}

// ============================================================================
// 훅
// ============================================================================

export function useVillageReactions(
  /** 가장 친한 구루 ID (useGuruFriendship.getTopFriends(1)로 얻음) */
  closestGuruId?: string,
): UseVillageReactionsReturn {
  const [activeReaction, setActiveReaction] = useState<ActiveReaction | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 오늘 첫 방문 체크 (마운트 시 1회) ───────────────────────────────────

  useEffect(() => {
    const checkFirstVisit = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const stored = await AsyncStorage.getItem(FIRST_VISIT_KEY);

        if (stored !== today) {
          // 오늘 첫 방문 기록
          await AsyncStorage.setItem(FIRST_VISIT_KEY, today);

          // 약간 딜레이 후 인사 (마을 로딩 완료 대기)
          setTimeout(() => {
            triggerReactionInternal('first_visit_today');
          }, 1500);
        }
      } catch {
        // AsyncStorage 실패는 무시
      }
    };

    checkFirstVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 반응 트리거 (내부 구현) ─────────────────────────────────────────────

  const triggerReactionInternal = useCallback(
    (type: VillageReactionType, overrideGuruId?: string) => {
      const guruId = overrideGuruId ?? closestGuruId;
      const dayOfWeek = new Date().getDay();
      const reaction = getReaction(type, guruId, dayOfWeek);

      if (!reaction) return;

      // 이전 타이머 정리
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // 대표 구루 (첫 번째 reactingGuru)
      const primaryGuru = reaction.reactingGurus[0] ?? 'buffett';
      const primaryMsg = reaction.messages[primaryGuru];
      const primaryEmoji = reaction.emojis[primaryGuru] ?? '🐾';

      const active: ActiveReaction = {
        type,
        guruId: primaryGuru,
        messageKo: primaryMsg?.ko ?? '',
        messageEn: primaryMsg?.en ?? '',
        emoji: primaryEmoji,
        isGroupReaction: reaction.isGroupReaction,
        raw: reaction,
      };

      setActiveReaction(active);

      // duration 후 자동 소멸
      timerRef.current = setTimeout(() => {
        setActiveReaction(null);
        timerRef.current = null;
      }, reaction.duration);
    },
    [closestGuruId],
  );

  // ── 외부 공개 함수 (useCallback으로 안정화) ─────────────────────────────

  const triggerReaction = useCallback(
    (type: VillageReactionType, overrideGuruId?: string) => {
      triggerReactionInternal(type, overrideGuruId);
    },
    [triggerReactionInternal],
  );

  // ── 정리 ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    activeReaction,
    triggerReaction,
  };
}
