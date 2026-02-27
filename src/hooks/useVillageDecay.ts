/**
 * useVillageDecay — 장기 이탈 시 마을 쇠퇴 효과 (타마고치)
 *
 * 역할: "마을 시간 관리관" — 유저가 오래 안 들어오면 마을이 황폐해지는 시각 효과
 * 비유: 동물의숲에서 오래 안 들어가면 잡초가 가득하고 주민이 슬퍼하는 것처럼
 *
 * 3일 안 들어오면 잡초가 나고 구루들이 슬퍼지고,
 * 7일 이상이면 가로등이 꺼지고 마을 전체가 바래짐
 *
 * 중요: 실제 데이터 손실 없음 — 순수 시각 효과만
 *       돌아오면 즉시 복원 (환영 메시지와 함께)
 *
 * 사용처:
 * - 마을 탭: 꽃 투명도, 잡초, 먼지, 가로등 on/off
 * - 구루 감정: forceGuruSad로 전원 슬픈 표정
 * - 복귀 모달: isReturning으로 환영 연출 트리거
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// 상수
// ============================================================================

const LAST_VISIT_KEY = 'village_last_visit';

// ============================================================================
// 타입
// ============================================================================

export interface VillageDecayState {
  /** 마지막 방문 이후 경과 일수 (0 = 오늘 방문함) */
  daysSinceVisit: number;
  /** 오래 이탈 후 복귀했는지 여부 (환영 애니메이션 트리거) */
  isReturning: boolean;
  /** 꽃 투명도 배수 (1.0 = 정상, 0.3 = 7일+) */
  flowerOpacity: number;
  /** 잡초 이모지 개수 (0~5) */
  weedCount: number;
  /** 구루 감정을 강제로 슬픔으로 변경할지 */
  forceGuruSad: boolean;
  /** 가구/건물 먼지 오버레이 투명도 (0 = 없음, 0.4 = 7일+) */
  dustOverlayOpacity: number;
  /** 전체 채도 감소량 (0 = 정상, 0.5 = 7일+) */
  desaturationAmount: number;
  /** 가로등 꺼짐 여부 */
  lightsOff: boolean;
  /** 복귀 환영 메시지 해제 (환영 애니메이션 끝난 후 호출) */
  dismissReturn: () => void;
}

// ============================================================================
// 경과 일수별 쇠퇴 수치 계산
// ============================================================================

function calculateDecay(days: number) {
  if (days >= 7) {
    return {
      flowerOpacity: 0.65,
      weedCount: 3,
      forceGuruSad: true,
      dustOverlayOpacity: 0.12,
      desaturationAmount: 0.12,
      lightsOff: true,
    };
  }
  if (days >= 5) {
    return {
      flowerOpacity: 0.72,
      weedCount: 2,
      forceGuruSad: true,
      dustOverlayOpacity: 0.08,
      desaturationAmount: 0.05,
      lightsOff: true,
    };
  }
  if (days >= 3) {
    return {
      flowerOpacity: 0.82,
      weedCount: 1,
      forceGuruSad: true,
      dustOverlayOpacity: 0,
      desaturationAmount: 0,
      lightsOff: false,
    };
  }
  if (days >= 2) {
    return {
      flowerOpacity: 0.7,
      weedCount: 0,
      forceGuruSad: false,
      dustOverlayOpacity: 0,
      desaturationAmount: 0,
      lightsOff: false,
    };
  }
  // 0~1일: 정상 상태
  return {
    flowerOpacity: 1.0,
    weedCount: 0,
    forceGuruSad: false,
    dustOverlayOpacity: 0,
    desaturationAmount: 0,
    lightsOff: false,
  };
}

// ============================================================================
// 훅
// ============================================================================

export function useVillageDecay(): VillageDecayState {
  const [daysSinceVisit, setDaysSinceVisit] = useState(0);
  const [isReturning, setIsReturning] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LAST_VISIT_KEY);
        const now = new Date();

        if (stored) {
          const lastVisit = new Date(stored);
          // 날짜 단위 차이 계산 (시간 무시, 자정 기준)
          const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const lastMidnight = new Date(
            lastVisit.getFullYear(),
            lastVisit.getMonth(),
            lastVisit.getDate(),
          );
          const diffMs = todayMidnight.getTime() - lastMidnight.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          setDaysSinceVisit(Math.max(0, diffDays));

          // 3일 이상 이탈 후 복귀 시 환영 메시지
          if (diffDays >= 3) {
            setIsReturning(true);
          }
        }

        // 방문 시각 갱신
        await AsyncStorage.setItem(LAST_VISIT_KEY, now.toISOString());
      } catch {
        // AsyncStorage 실패 시 기본 상태 유지 (정상 마을)
        setDaysSinceVisit(0);
      }
    })();
  }, []);

  const dismissReturn = useCallback(() => {
    setIsReturning(false);
  }, []);

  const decay = calculateDecay(daysSinceVisit);

  return {
    daysSinceVisit,
    isReturning,
    flowerOpacity: decay.flowerOpacity,
    weedCount: decay.weedCount,
    forceGuruSad: decay.forceGuruSad,
    dustOverlayOpacity: decay.dustOverlayOpacity,
    desaturationAmount: decay.desaturationAmount,
    lightsOff: decay.lightsOff,
    dismissReturn,
  };
}
