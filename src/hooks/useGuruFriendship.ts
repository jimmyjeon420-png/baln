/**
 * useGuruFriendship — 구루 우정 관리 훅
 *
 * 역할: "우정 관리소" — 유저와 각 구루 사이의 친밀도를 추적/관리
 * - 대화, 투표, 선물, 편지 등 상호작용 시 우정 포인트 적립
 * - 포인트에 따라 6단계 우정 티어 자동 결정
 * - AsyncStorage로 로컬 영속화
 *
 * 비유: 동물의숲의 주민 친밀도 — 숫자는 보이지 않지만
 *       대화 방식과 선물이 달라짐
 *
 * 사용처:
 * - 마을 탭: 구루 호칭/대화 톤 결정
 * - 구루 상세: 우정 레벨 표시
 * - 편지 시스템: 해금 조건 확인
 * - 프리미엄 전환 트리거: "구루가 특별한 말을 해주는" 순간
 */

import { useState, useEffect, useCallback } from 'react';
import type { GuruFriendship, FriendshipTier } from '../types/village';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FRIENDSHIP_KEY = 'guru_friendships';

// ============================================================================
// 상수
// ============================================================================

/** 우정 티어 진입 임계값 (village.ts 타입 기준) */
const TIER_THRESHOLDS: Record<FriendshipTier, number> = {
  stranger: 0,
  acquaintance: 20,
  friend: 50,
  close_friend: 100,
  best_friend: 150,
  mentor: 150,
  soulmate: 200,
};

/** 상호작용 종류별 우정 포인트 */
const INTERACTION_POINTS: Record<string, number> = {
  chat: 2,              // 대화 1회
  vote: 1,              // 해당 구루 분야 예측 투표
  gift: 5,              // 선물 보내기
  letter: 3,            // 편지 답장
  roundtable: 3,        // 라운드테이블에서 만남
  correct_prediction: 5, // 해당 구루 분야 예측 적중
};

/** 10명 구루 ID 목록 */
const ALL_GURU_IDS = [
  'buffett', 'dalio', 'cathie_wood', 'druckenmiller', 'saylor',
  'dimon', 'musk', 'lynch', 'marks', 'rogers',
];

/** 일일 최대 우정 포인트 획득량 (구루 1명당) */
const DAILY_CAP_PER_GURU = 20;

/** AsyncStorage 일일 포인트 추적 키 */
const DAILY_POINTS_KEY = 'guru_friendship_daily';

// ============================================================================
// 유틸
// ============================================================================

/** 포인트 → 우정 티어 변환 */
function pointsToTier(points: number): FriendshipTier {
  if (points >= TIER_THRESHOLDS.soulmate) return 'soulmate';
  if (points >= TIER_THRESHOLDS.best_friend) return 'best_friend';
  if (points >= TIER_THRESHOLDS.close_friend) return 'close_friend';
  if (points >= TIER_THRESHOLDS.friend) return 'friend';
  if (points >= TIER_THRESHOLDS.acquaintance) return 'acquaintance';
  return 'stranger';
}

/** 오늘 날짜 문자열 (YYYY-MM-DD) */
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/** 기본 우정 데이터 생성 (첫 로드 시) — village.ts GuruFriendship 타입 준수 */
function createDefaultFriendship(guruId: string): GuruFriendship {
  return {
    guruId,
    score: 0,
    tier: 'stranger',
    totalInteractions: 0,
    lastInteraction: '',
    unlockedDialogues: [],
    giftsGiven: 0,
    lettersSent: 0,
    lettersReceived: 0,
  };
}

// ============================================================================
// 일일 포인트 추적 (별도 스토리지)
// ============================================================================

interface DailyPoints {
  date: string;
  points: Record<string, number>; // guruId → 오늘 획득 포인트
}

async function getDailyPoints(): Promise<DailyPoints> {
  try {
    const stored = await AsyncStorage.getItem(DAILY_POINTS_KEY);
    if (stored) {
      const parsed: DailyPoints = JSON.parse(stored);
      if (parsed.date === getTodayKey()) return parsed;
    }
  } catch {
    // 무시
  }
  return { date: getTodayKey(), points: {} };
}

async function saveDailyPoints(data: DailyPoints): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_POINTS_KEY, JSON.stringify(data));
  } catch {
    // 무시
  }
}

// ============================================================================
// 훅
// ============================================================================

export interface UseGuruFriendshipReturn {
  /** 전체 우정 맵 (guruId -> GuruFriendship) */
  friendships: Record<string, GuruFriendship>;
  /** 상호작용 추가 (우정 포인트 적립) */
  addInteraction: (guruId: string, type: string) => Promise<void>;
  /** 특정 구루 우정 조회 */
  getFriendship: (guruId: string) => GuruFriendship;
  /** 특정 구루 우정 티어 조회 */
  getTier: (guruId: string) => FriendshipTier;
  /** 우정 점수 상위 N명 조회 */
  getTopFriends: (n: number) => GuruFriendship[];
  /** 다음 티어까지 남은 포인트 */
  getPointsToNextTier: (guruId: string) => number;
  /** 로딩 중 여부 */
  isLoading: boolean;
}

export function useGuruFriendship(): UseGuruFriendshipReturn {
  const [friendships, setFriendships] = useState<Record<string, GuruFriendship>>({});
  const [isLoading, setIsLoading] = useState(true);

  // AsyncStorage에서 우정 데이터 로드
  useEffect(() => {
    let isMounted = true;

    const loadFriendships = async () => {
      try {
        const stored = await AsyncStorage.getItem(FRIENDSHIP_KEY);

        if (stored) {
          const parsed: Record<string, GuruFriendship> = JSON.parse(stored);

          // 누락된 구루 보충
          const updated: Record<string, GuruFriendship> = {};
          for (const guruId of ALL_GURU_IDS) {
            updated[guruId] = parsed[guruId] || createDefaultFriendship(guruId);
          }

          if (isMounted) setFriendships(updated);
        } else {
          // 첫 로드: 모든 구루를 stranger로 초기화
          const initial: Record<string, GuruFriendship> = {};
          for (const guruId of ALL_GURU_IDS) {
            initial[guruId] = createDefaultFriendship(guruId);
          }
          if (isMounted) setFriendships(initial);
          await AsyncStorage.setItem(FRIENDSHIP_KEY, JSON.stringify(initial));
        }
      } catch (err) {
        if (__DEV__) console.warn('[useGuruFriendship] 로드 에러:', err);
        // 에러 시 기본값
        const initial: Record<string, GuruFriendship> = {};
        for (const guruId of ALL_GURU_IDS) {
          initial[guruId] = createDefaultFriendship(guruId);
        }
        if (isMounted) setFriendships(initial);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFriendships();

    return () => {
      isMounted = false;
    };
  }, []);

  // 우정 데이터 저장 (friendships 변경 시)
  const saveFriendships = useCallback(async (data: Record<string, GuruFriendship>) => {
    try {
      await AsyncStorage.setItem(FRIENDSHIP_KEY, JSON.stringify(data));
    } catch (err) {
      if (__DEV__) console.warn('[useGuruFriendship] 저장 에러:', err);
    }
  }, []);

  // 상호작용 추가 (우정 포인트 적립)
  const addInteraction = useCallback(async (guruId: string, type: string) => {
    const points = INTERACTION_POINTS[type] || 1;

    // 일일 상한 체크
    const daily = await getDailyPoints();
    const currentDailyPoints = daily.points[guruId] || 0;

    if (currentDailyPoints >= DAILY_CAP_PER_GURU) {
      if (__DEV__) console.log(`[useGuruFriendship] ${guruId} 일일 상한 도달 (${DAILY_CAP_PER_GURU})`);
      return;
    }

    // 상한 내에서 적립 가능한 포인트 계산
    const actualPoints = Math.min(points, DAILY_CAP_PER_GURU - currentDailyPoints);

    // 일일 포인트 업데이트
    daily.points[guruId] = currentDailyPoints + actualPoints;
    await saveDailyPoints(daily);

    setFriendships(prev => {
      const current = prev[guruId] || createDefaultFriendship(guruId);
      const newScore = current.score + actualPoints;

      const updated: Record<string, GuruFriendship> = {
        ...prev,
        [guruId]: {
          ...current,
          score: newScore,
          tier: pointsToTier(newScore),
          totalInteractions: current.totalInteractions + 1,
          lastInteraction: new Date().toISOString(),
          giftsGiven: type === 'gift' ? current.giftsGiven + 1 : current.giftsGiven,
          lettersSent: type === 'letter' ? current.lettersSent + 1 : current.lettersSent,
        },
      };

      // 비동기 저장
      saveFriendships(updated);

      if (__DEV__) {
        console.log(
          `[useGuruFriendship] ${guruId} +${actualPoints}pts (${type}) → total ${newScore}, tier: ${pointsToTier(newScore)}`
        );
      }

      return updated;
    });
  }, [saveFriendships]);

  // 특정 구루 우정 조회
  const getFriendship = useCallback((guruId: string): GuruFriendship => {
    return friendships[guruId] || createDefaultFriendship(guruId);
  }, [friendships]);

  // 특정 구루 우정 티어 조회
  const getTier = useCallback((guruId: string): FriendshipTier => {
    const f = friendships[guruId];
    return f ? f.tier : 'stranger';
  }, [friendships]);

  // 우정 점수 상위 N명 조회
  const getTopFriends = useCallback((n: number): GuruFriendship[] => {
    return Object.values(friendships)
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }, [friendships]);

  // 다음 티어까지 남은 포인트
  const getPointsToNextTier = useCallback((guruId: string): number => {
    const f = friendships[guruId];
    if (!f) return TIER_THRESHOLDS.acquaintance;

    const tiers: FriendshipTier[] = [
      'stranger', 'acquaintance', 'friend', 'close_friend', 'best_friend', 'soulmate',
    ];
    const currentIndex = tiers.indexOf(f.tier);

    // 이미 최고 티어
    if (currentIndex >= tiers.length - 1) return 0;

    const nextTier = tiers[currentIndex + 1];
    return Math.max(0, TIER_THRESHOLDS[nextTier] - f.score);
  }, [friendships]);

  return {
    friendships,
    addInteraction,
    getFriendship,
    getTier,
    getTopFriends,
    getPointsToNextTier,
    isLoading,
  };
}
