/**
 * useUserAvatar — 유저 아바타 상태 관리 훅
 *
 * 역할: "내 캐릭터 옷장 관리자" — AsyncStorage에 저장된 아바타 설정을
 *       불러오고, 수정하고, 검증하고, 다시 저장하는 모든 로직을 담당
 *
 * 비유: 동물의숲 캐릭터 커스터마이즈 화면의 "내 옷장 + 선택 논리"
 *
 * 관리 항목:
 * - 동물 종류 (12종, streak/level/premium/credits 조건으로 해금)
 * - 색상 팔레트 (8색, level/premium 조건)
 * - 액세서리 (15종, credits/friendship/premium 조건, 최대 3개 착용)
 * - 닉네임
 *
 * 특징:
 * - 마운트 시 AsyncStorage에서 자동 로드
 * - streak/level/premium/credits 변경 시 해금 목록 재계산
 * - 잠긴 아이템 선택 시 기본값으로 폴백
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  USER_ANIMALS,
  USER_COLORS,
  USER_ACCESSORIES,
  getUnlockedAnimals,
  getUnlockedColors,
  getUnlockedAccessories,
  findAnimalById,
  type UserAvatarAnimal,
  type UserAvatarColor,
  type UserAccessory,
} from '../data/userAvatarConfig';

// ============================================================================
// 상수
// ============================================================================

const AVATAR_KEY = 'user_avatar_state';
const MAX_ACCESSORIES = 3;

// ============================================================================
// 내부 상태 타입 (AsyncStorage 저장 형식)
// ============================================================================

interface UserAvatarState {
  animalId: string;
  colorId: string;
  /** 착용 중인 액세서리 ID 목록 (최대 3개) */
  accessoryIds: string[];
  nickname: string;
}

const DEFAULT_STATE: UserAvatarState = {
  animalId: 'puppy',
  colorId: 'mint',
  accessoryIds: [],
  nickname: '',
};

// ============================================================================
// 반환 타입
// ============================================================================

export interface UseUserAvatarReturn {
  /** 현재 아바타 상태 */
  avatar: UserAvatarState;
  /** 현재 조건에서 해금된 동물 목록 */
  unlockedAnimals: UserAvatarAnimal[];
  /** 현재 조건에서 해금된 색상 목록 */
  unlockedColors: UserAvatarColor[];
  /** 현재 조건에서 해금된 액세서리 목록 */
  unlockedAccessories: UserAccessory[];
  /** 아직 불러오는 중이면 true */
  isLoading: boolean;
  /**
   * 동물 변경 (해금 여부 검증 후 저장)
   * @returns false: 잠긴 아이템이라 변경 실패
   */
  setAnimal: (id: string) => boolean;
  /**
   * 색상 변경 (해금 여부 검증 후 저장)
   * @returns false: 잠긴 색상이라 변경 실패
   */
  setColor: (id: string) => boolean;
  /**
   * 액세서리 토글 (착용/탈착)
   * - 착용: 해금 여부 검증, MAX_ACCESSORIES 초과 시 가장 오래된 것 제거
   * - 탈착: 목록에서 제거
   * @returns false: 잠긴 액세서리라 착용 실패
   */
  toggleAccessory: (id: string) => boolean;
  /** 닉네임 변경 및 저장 */
  setNickname: (name: string) => void;
  /** 현재 선택된 동물의 이모지 반환 */
  getAvatarEmoji: () => string;
}

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * @param streak 현재 연속 출석 일수
 * @param level 현재 사용자 레벨
 * @param isPremium 프리미엄 구독 여부
 * @param credits 보유 크레딧 수
 * @param maxFriendshipTier 모든 구루 중 최고 우정 티어 인덱스 (0=stranger, 3=close_friend...)
 */
export function useUserAvatar(
  streak: number,
  level: number,
  isPremium: boolean,
  credits: number,
  maxFriendshipTier: number,
): UseUserAvatarReturn {
  const [avatar, setAvatar] = useState<UserAvatarState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // ── 해금 목록 (조건 변경 시 재계산) ──────────────────────────────────────

  const unlockedAnimals = getUnlockedAnimals(streak, level, isPremium);
  const unlockedColors = getUnlockedColors(level, isPremium);
  const unlockedAccessories = getUnlockedAccessories(credits, maxFriendshipTier, isPremium);

  // ── 마운트 시 AsyncStorage 로드 ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      try {
        const raw = await AsyncStorage.getItem(AVATAR_KEY);
        if (cancelled) return;

        if (raw) {
          const parsed: Partial<UserAvatarState> = JSON.parse(raw);

          // 저장된 동물 ID가 실제 목록에 있는지 검증 (삭제된 데이터 방어)
          const validAnimalId = USER_ANIMALS.some((a) => a.id === parsed.animalId)
            ? (parsed.animalId ?? DEFAULT_STATE.animalId)
            : DEFAULT_STATE.animalId;

          const validColorId = USER_COLORS.some((c) => c.id === parsed.colorId)
            ? (parsed.colorId ?? DEFAULT_STATE.colorId)
            : DEFAULT_STATE.colorId;

          const validAccessoryIds = (parsed.accessoryIds ?? []).filter((id) =>
            USER_ACCESSORIES.some((a) => a.id === id),
          );

          setAvatar({
            animalId: validAnimalId,
            colorId: validColorId,
            accessoryIds: validAccessoryIds,
            nickname: parsed.nickname ?? DEFAULT_STATE.nickname,
          });
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[useUserAvatar] AsyncStorage 로드 실패:', e);
        }
        // 로드 실패 시 기본값 유지
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAvatar();
    return () => { cancelled = true; };
  }, []);

  // ── 저장 헬퍼 ────────────────────────────────────────────────────────────

  const persistAvatar = useCallback(async (next: UserAvatarState) => {
    try {
      await AsyncStorage.setItem(AVATAR_KEY, JSON.stringify(next));
      if (__DEV__) {
        // console.log('[useUserAvatar] 저장 완료:', next.animalId, next.colorId);
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[useUserAvatar] AsyncStorage 저장 실패:', e);
      }
    }
  }, []);

  // ── 동물 변경 ─────────────────────────────────────────────────────────────

  const setAnimal = useCallback(
    (id: string): boolean => {
      const isUnlocked = unlockedAnimals.some((a) => a.id === id);
      if (!isUnlocked) {
        if (__DEV__) {
          console.log('[useUserAvatar] setAnimal: 잠긴 동물 id=%s', id);
        }
        return false;
      }

      setAvatar((prev) => {
        const next = { ...prev, animalId: id };
        persistAvatar(next);
        return next;
      });
      return true;
    },
    [unlockedAnimals, persistAvatar],
  );

  // ── 색상 변경 ─────────────────────────────────────────────────────────────

  const setColor = useCallback(
    (id: string): boolean => {
      const isUnlocked = unlockedColors.some((c) => c.id === id);
      if (!isUnlocked) {
        if (__DEV__) {
          console.log('[useUserAvatar] setColor: 잠긴 색상 id=%s', id);
        }
        return false;
      }

      setAvatar((prev) => {
        const next = { ...prev, colorId: id };
        persistAvatar(next);
        return next;
      });
      return true;
    },
    [unlockedColors, persistAvatar],
  );

  // ── 액세서리 토글 ─────────────────────────────────────────────────────────

  const toggleAccessory = useCallback(
    (id: string): boolean => {
      // 이미 착용 중이면 탈착 (해금 검증 불필요)
      const isEquipped = avatar.accessoryIds.includes(id);

      if (isEquipped) {
        setAvatar((prev) => {
          const next = {
            ...prev,
            accessoryIds: prev.accessoryIds.filter((a) => a !== id),
          };
          persistAvatar(next);
          return next;
        });
        return true;
      }

      // 착용 시도 — 해금 여부 검증
      const isUnlocked = unlockedAccessories.some((a) => a.id === id);
      if (!isUnlocked) {
        if (__DEV__) {
          console.log('[useUserAvatar] toggleAccessory: 잠긴 액세서리 id=%s', id);
        }
        return false;
      }

      setAvatar((prev) => {
        let newIds = [...prev.accessoryIds, id];
        // MAX_ACCESSORIES 초과 시 가장 앞(오래된) 것 제거
        if (newIds.length > MAX_ACCESSORIES) {
          newIds = newIds.slice(newIds.length - MAX_ACCESSORIES);
        }
        const next = { ...prev, accessoryIds: newIds };
        persistAvatar(next);
        return next;
      });
      return true;
    },
    [avatar.accessoryIds, unlockedAccessories, persistAvatar],
  );

  // ── 닉네임 변경 ───────────────────────────────────────────────────────────

  const setNickname = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 12); // 최대 12자
      setAvatar((prev) => {
        const next = { ...prev, nickname: trimmed };
        persistAvatar(next);
        return next;
      });
    },
    [persistAvatar],
  );

  // ── 현재 동물 이모지 반환 ─────────────────────────────────────────────────

  const getAvatarEmoji = useCallback((): string => {
    const found = findAnimalById(avatar.animalId);
    return found?.emoji ?? '🐶';
  }, [avatar.animalId]);

  // ── 반환 ─────────────────────────────────────────────────────────────────

  return {
    avatar,
    unlockedAnimals,
    unlockedColors,
    unlockedAccessories,
    isLoading,
    setAnimal,
    setColor,
    toggleAccessory,
    setNickname,
    getAvatarEmoji,
  };
}
