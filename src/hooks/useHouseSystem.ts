/**
 * useHouseSystem — 유저 집 시스템 관리 훅
 *
 * 역할: "부동산 관리사" — 번영도에 따라 집 자동 업그레이드 + 가구 배치 관리
 * 비유: 동물의숲의 너굴(Tom Nook) 시스템
 *       활동할수록 마을이 번영 → 집이 자동으로 커짐 → 가구 슬롯 해금
 *
 * 데이터 흐름:
 * - useVillageProsperity → 번영도 레벨 → 집 레벨 자동 결정
 * - AsyncStorage에 배치된 가구 목록 저장
 * - 번영도 레벨이 올라가면 집이 자동 업그레이드
 *
 * 사용처:
 * - HouseView: 마을 씬 내 집 외관 표시
 * - HouseInteriorModal: 가구 배치 UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HOUSE_LEVELS,
  FURNITURE_ITEMS,
  getHouseLevelForProsperity,
  getUnlockedFurniture,
} from '../data/houseConfig';
import type { HouseLevel, FurnitureItem } from '../data/houseConfig';

// ============================================================================
// 상수
// ============================================================================

const HOUSE_STORAGE_KEY = 'baln_house_system';

interface HouseStorageData {
  /** 배치된 가구 ID 목록 */
  placedFurnitureIds: string[];
  /** 마지막 확인된 집 레벨 (업그레이드 감지용) */
  lastHouseLevel: number;
}

// ============================================================================
// 반환 타입
// ============================================================================

export interface UseHouseSystemReturn {
  /** 현재 집 레벨 정보 */
  houseLevel: HouseLevel;
  /** 집 이름 (한국어) */
  houseNameKo: string;
  /** 집 이름 (영어) */
  houseNameEn: string;
  /** 해금된 가구 목록 (배치 가능) */
  availableFurniture: FurnitureItem[];
  /** 현재 배치된 가구 목록 */
  placedFurniture: FurnitureItem[];
  /** 배치되지 않은 해금 가구 (인벤토리) */
  inventoryFurniture: FurnitureItem[];
  /** 가구 배치 */
  placeFurniture: (furnitureId: string) => Promise<boolean>;
  /** 가구 제거 */
  removeFurniture: (furnitureId: string) => Promise<void>;
  /** 현재 슬롯 사용량 */
  usedSlots: number;
  /** 최대 슬롯 수 */
  maxSlots: number;
  /** 슬롯 여유 있는지 */
  hasEmptySlot: boolean;
  /** 집이 업그레이드되었는지 (이전 세션 대비) */
  wasUpgraded: boolean;
  /** 업그레이드 확인 완료 처리 */
  acknowledgeUpgrade: () => void;
  /** 로딩 상태 */
  isLoading: boolean;
}

// ============================================================================
// 훅
// ============================================================================

export function useHouseSystem(prosperityLevel: number): UseHouseSystemReturn {
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [wasUpgraded, setWasUpgraded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  // 현재 집 레벨 (번영도 기반)
  const houseLevel = getHouseLevelForProsperity(prosperityLevel);

  // 해금된 가구
  const availableFurniture = getUnlockedFurniture(prosperityLevel);

  // 배치된 가구 (유효한 것만 필터)
  const placedFurniture = placedIds
    .map(id => FURNITURE_ITEMS.find(f => f.id === id))
    .filter((f): f is FurnitureItem => f !== undefined)
    .slice(0, houseLevel.furnitureSlots);

  // 인벤토리 (해금되었지만 배치되지 않은 가구)
  const placedIdSet = new Set(placedFurniture.map(f => f.id));
  const inventoryFurniture = availableFurniture.filter(f => !placedIdSet.has(f.id));

  const usedSlots = placedFurniture.length;
  const maxSlots = houseLevel.furnitureSlots;
  const hasEmptySlot = usedSlots < maxSlots;

  // ── AsyncStorage 로드 ──
  useEffect(() => {
    isMountedRef.current = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(HOUSE_STORAGE_KEY);
        if (raw) {
          const data: HouseStorageData = JSON.parse(raw);
          if (isMountedRef.current) {
            setPlacedIds(data.placedFurnitureIds || []);

            // 업그레이드 감지
            if (data.lastHouseLevel < houseLevel.level) {
              setWasUpgraded(true);
            }
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('[useHouseSystem] 로드 에러:', err);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 저장 ──
  const save = useCallback(async (ids: string[]) => {
    try {
      const data: HouseStorageData = {
        placedFurnitureIds: ids,
        lastHouseLevel: houseLevel.level,
      };
      await AsyncStorage.setItem(HOUSE_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      if (__DEV__) console.warn('[useHouseSystem] 저장 에러:', err);
    }
  }, [houseLevel.level]);

  // ── 가구 배치 ──
  const placeFurniture = useCallback(async (furnitureId: string): Promise<boolean> => {
    // 슬롯 체크
    if (placedIds.length >= houseLevel.furnitureSlots) {
      if (__DEV__) console.log('[useHouseSystem] 슬롯 부족');
      return false;
    }

    // 이미 배치됨
    if (placedIds.includes(furnitureId)) {
      if (__DEV__) console.log('[useHouseSystem] 이미 배치된 가구:', furnitureId);
      return false;
    }

    // 해금 여부
    const item = availableFurniture.find(f => f.id === furnitureId);
    if (!item) {
      if (__DEV__) console.log('[useHouseSystem] 미해금 가구:', furnitureId);
      return false;
    }

    const newIds = [...placedIds, furnitureId];
    setPlacedIds(newIds);
    await save(newIds);
    return true;
  }, [placedIds, houseLevel.furnitureSlots, availableFurniture, save]);

  // ── 가구 제거 ──
  const removeFurniture = useCallback(async (furnitureId: string) => {
    const newIds = placedIds.filter(id => id !== furnitureId);
    setPlacedIds(newIds);
    await save(newIds);
  }, [placedIds, save]);

  // ── 업그레이드 확인 ──
  const acknowledgeUpgrade = useCallback(() => {
    setWasUpgraded(false);
    save(placedIds);
  }, [placedIds, save]);

  return {
    houseLevel,
    houseNameKo: houseLevel.nameKo,
    houseNameEn: houseLevel.nameEn,
    availableFurniture,
    placedFurniture,
    inventoryFurniture,
    placeFurniture,
    removeFurniture,
    usedSlots,
    maxSlots,
    hasEmptySlot,
    wasUpgraded,
    acknowledgeUpgrade,
    isLoading,
  };
}
