/**
 * useAchievements.ts - 성취 배지 시스템 훅
 *
 * 역할: "성취 관리 창구"
 * - 배지 목록 + 해금 상태 조회
 * - 자동 해금 체크 (스트릭, 예측, 포트폴리오 데이터 참조)
 * - 새로 해금된 배지 토스트 + 햅틱 진동
 * - 해금된 배지 수 카운트 (profile.tsx에서 표시)
 *
 * [사용처]
 * - app/achievements.tsx: 전체 배지 그리드
 * - app/(tabs)/profile.tsx: 해금 수 표시
 * - _layout.tsx: 자동 해금 체크
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAchievementsWithStatus,
  getUnlockedCount,
  checkAndUnlockAchievements,
  type AchievementWithStatus,
  type AchievementId,
  type AutoCheckParams,
  ACHIEVEMENTS,
} from '../services/achievementService';
import { grantAchievementReward, ACHIEVEMENT_REWARDS } from '../services/rewardService';
import supabase from '../services/supabase';

// ============================================================================
// Supabase 뱃지 동기화 (best-effort — 실패해도 앱 동작에 영향 없음)
// ============================================================================

async function syncBadgeToSupabase(badgeId: AchievementId): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { error } = await supabase.from('user_badges').upsert(
      { user_id: userId, badge_id: badgeId },
      { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
    );

    if (error) {
      console.warn('[useAchievements] Supabase 동기화 실패 (무시됨):', error.message);
    }
  } catch (err) {
    console.warn('[useAchievements] Supabase 동기화 예외 (무시됨):', err);
  }
}

// ============================================================================
// 훅 반환 타입
// ============================================================================

interface UseAchievementsReturn {
  /** 전체 배지 목록 (해금 상태 포함) */
  achievements: AchievementWithStatus[];
  /** 해금된 배지 수 */
  unlockedCount: number;
  /** 전체 배지 수 */
  totalCount: number;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 새로 해금된 배지 (토스트 표시용) */
  newlyUnlocked: AchievementId[];
  /** 새로 해금된 배지의 보상 크레딧 총합 */
  rewardCreditsEarned: number;
  /** 새로 해금 알림 초기화 */
  clearNewlyUnlocked: () => void;
  /** 데이터 새로고침 */
  refresh: () => Promise<void>;
  /** 자동 해금 체크 실행 */
  checkAchievements: (params: AutoCheckParams) => Promise<AchievementId[]>;
}

// ============================================================================
// 메인 훅
// ============================================================================

/**
 * 성취 배지 훅
 *
 * [흐름]
 * 1. 마운트 시 AsyncStorage에서 배지 데이터 로드
 * 2. 배지 목록 + 해금 상태 반환
 * 3. checkAchievements 호출 시 → 조건 체크 → 새 해금 → 진동 + 토스트
 */
export function useAchievements(): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementId[]>([]);
  const [rewardCreditsEarned, setRewardCreditsEarned] = useState(0);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [achievementsData, countData] = await Promise.all([
        getAchievementsWithStatus(),
        getUnlockedCount(),
      ]);
      setAchievements(achievementsData);
      setUnlockedCount(countData.unlocked);
    } catch (error) {
      console.warn('[useAchievements] 데이터 로드 에러:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 마운트 시 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 자동 해금 체크 실행
  const checkAchievements = useCallback(
    async (params: AutoCheckParams): Promise<AchievementId[]> => {
      try {
        const newBadges = await checkAndUnlockAchievements(params);

        if (newBadges.length > 0) {
          // 새로 해금된 배지 저장 (토스트 표시용)
          setNewlyUnlocked((prev) => [...prev, ...newBadges]);

          // 배지 보상 크레딧 지급 + Supabase 동기화 (best-effort)
          let totalReward = 0;
          for (const badgeId of newBadges) {
            const result = await grantAchievementReward(badgeId);
            if (result.success) {
              totalReward += result.creditsEarned;
            }
            // Supabase 동기화 — 실패해도 앱 동작에 영향 없음
            syncBadgeToSupabase(badgeId);
          }
          if (totalReward > 0) {
            setRewardCreditsEarned(totalReward);
          }

          // 데이터 리로드
          await loadData();
        }

        return newBadges;
      } catch (error) {
        console.warn('[useAchievements] 자동 해금 체크 에러:', error);
        return [];
      }
    },
    [loadData]
  );

  // 새로 해금 알림 초기화
  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
    setRewardCreditsEarned(0);
  }, []);

  return {
    achievements,
    unlockedCount,
    totalCount: ACHIEVEMENTS.length,
    isLoading,
    newlyUnlocked,
    rewardCreditsEarned,
    clearNewlyUnlocked,
    refresh: loadData,
    checkAchievements,
  };
}

// ============================================================================
// 간단 카운트 훅 (profile.tsx용 — 가볍게)
// ============================================================================

/**
 * 해금 배지 수만 빠르게 가져오는 경량 훅
 * profile.tsx 메뉴 아이템 뱃지에 표시용
 */
export function useAchievementCount(): {
  unlockedCount: number;
  totalCount: number;
  isLoading: boolean;
} {
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await getUnlockedCount();
        if (isMounted) {
          setUnlockedCount(data.unlocked);
        }
      } catch (error) {
        console.warn('[useAchievementCount] 에러:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    unlockedCount,
    totalCount: ACHIEVEMENTS.length,
    isLoading,
  };
}
