/**
 * useVillageLetters — 구루 편지함 상태 관리 훅
 *
 * 역할: "마을 우체통 관리인" — 구루에게 도착한 편지를 로드하고, 읽음 처리하고,
 *       우정 티어가 올라갈 때 새 편지가 해금되었는지 확인
 *
 * 비유: 동물의숲에서 우체통을 열면 주민 편지가 쌓여있는 것 — 매일 확인하는 재미
 *
 * 동작 방식:
 * - 마운트 시: AsyncStorage에서 기존 편지 모두 로드
 * - friendships가 변경될 때: checkForNewLetters() 호출 (단, 하루 1회만)
 *   → 우정 티어가 오르면 새 편지 해금 → 편지함에 추가
 * - openLetter(id): 편지 열면 isRead = true로 처리 + unreadCount 감소
 * - refreshLetters(): 수동으로 새 편지 체크 (강제)
 *
 * 사용처:
 * - 마을 탭: 편지함 배지(빨간 점) 표시 (unreadCount > 0)
 * - 구루 상세: 해당 구루와 주고받은 편지 목록
 * - 전체 탭: 편지함 화면
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GuruLetter, FriendshipTier } from '../types/village';
import {
  checkForNewLetters,
  getAllLetters,
  markLetterRead,
  getUnreadCount,
} from '../services/villageLetterService';

// ============================================================================
// 타입
// ============================================================================

export interface UseVillageLettersReturn {
  /** 전체 편지 목록 (최신순 정렬) */
  letters: GuruLetter[];
  /** 읽지 않은 편지 수 (탭 배지용) */
  unreadCount: number;
  /** 편지 열기 (읽음 처리 + 상태 업데이트) */
  openLetter: (id: string) => Promise<void>;
  /** 새 편지 체크 (수동 새로고침) */
  refreshLetters: () => Promise<void>;
  /** 로딩 중 여부 */
  isLoading: boolean;
}

// ============================================================================
// 훅
// ============================================================================

export function useVillageLetters(
  friendships?: Map<string, { tier: FriendshipTier; score: number }>,
): UseVillageLettersReturn {
  const [letters, setLetters] = useState<GuruLetter[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  /**
   * 이전 우정 티어 스냅샷 — 티어가 실제로 변경되었을 때만 새 편지 체크
   * Map<guruId, FriendshipTier> 형태로 유지
   */
  const prevTiersRef = useRef<Map<string, FriendshipTier>>(new Map());

  // ============================================================================
  // 내부 유틸
  // ============================================================================

  /** AsyncStorage에서 편지 목록 + 미읽음 수 로드 후 상태 업데이트 */
  const loadLettersFromStorage = useCallback(async () => {
    try {
      const [allLetters, count] = await Promise.all([
        getAllLetters(),
        getUnreadCount(),
      ]);

      if (isMountedRef.current) {
        setLetters(allLetters);
        setUnreadCount(count);
      }
    } catch (err) {
      if (__DEV__) console.warn('[useVillageLetters] 편지 로드 에러:', err);
    }
  }, []);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      setIsLoading(true);
      await loadLettersFromStorage();
      if (isMountedRef.current) setIsLoading(false);
    };

    init();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadLettersFromStorage]);

  // ============================================================================
  // 우정 티어 변경 감지 → 새 편지 체크
  // ============================================================================

  useEffect(() => {
    if (!friendships || friendships.size === 0) return;

    // 실제로 티어가 바뀐 구루가 있는지 확인
    let tierChanged = false;
    for (const [guruId, friendship] of friendships) {
      const prevTier = prevTiersRef.current.get(guruId);
      if (prevTier !== friendship.tier) {
        tierChanged = true;
        break;
      }
    }

    // 첫 실행(prevTiers가 비어있을 때)도 체크 실행
    const isFirstRun = prevTiersRef.current.size === 0;

    if (!tierChanged && !isFirstRun) return;

    // 현재 티어를 스냅샷으로 저장
    const newSnapshot = new Map<string, FriendshipTier>();
    for (const [guruId, friendship] of friendships) {
      newSnapshot.set(guruId, friendship.tier);
    }
    prevTiersRef.current = newSnapshot;

    // 새 편지 체크 (villageLetterService에서 24시간 쿨다운 자체 적용)
    const fetchNewLetters = async () => {
      try {
        const newLetters = await checkForNewLetters(friendships);

        if (newLetters.length > 0 && isMountedRef.current) {
          if (__DEV__) {
            if (__DEV__) console.log(
              `[useVillageLetters] 새 편지 ${newLetters.length}통 도착: `,
              newLetters.map(l => `${l.fromGuruId}(${l.subject})`).join(', '),
            );
          }
          // 전체 편지 목록 & 미읽음 수 갱신
          await loadLettersFromStorage();
        }
      } catch (err) {
        if (__DEV__) console.warn('[useVillageLetters] 새 편지 체크 에러:', err);
      }
    };

    fetchNewLetters();
  }, [friendships, loadLettersFromStorage]);

  // ============================================================================
  // 액션
  // ============================================================================

  /**
   * 편지 열기 — isRead = true 처리 + UI 즉시 반영
   */
  const openLetter = useCallback(async (id: string) => {
    // AsyncStorage 읽음 처리
    await markLetterRead(id);

    if (!isMountedRef.current) return;

    // UI 즉시 반영 (re-fetch 없이 로컬 상태만 업데이트)
    setLetters(prev =>
      prev.map(l => (l.id === id && !l.isRead ? { ...l, isRead: true } : l)),
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    if (__DEV__) {
      if (__DEV__) console.log(`[useVillageLetters] 편지 열람: ${id}`);
    }
  }, []);

  /**
   * 새 편지 수동 새로고침
   * friendships가 없어도 호출 가능 (저장된 편지만 다시 로드)
   */
  const refreshLetters = useCallback(async () => {
    setIsLoading(true);

    try {
      if (friendships && friendships.size > 0) {
        await checkForNewLetters(friendships);
      }
      await loadLettersFromStorage();
    } catch (err) {
      if (__DEV__) console.warn('[useVillageLetters] 새로고침 에러:', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [friendships, loadLettersFromStorage]);

  return {
    letters,
    unreadCount,
    openLetter,
    refreshLetters,
    isLoading,
  };
}
