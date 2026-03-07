/**
 * useVillageProsperity — 마을 번영도 관리 훅
 *
 * 역할: "마을 번영 관리국" — 유저 활동이 마을 전체에 미치는 영향을 수치화
 * - 5탭 전체에서 활동 시 번영 포인트 적립
 * - 레벨 1(황무지) → 10(전설의 마을) 성장
 * - 레벨업 시 마일스톤 보상 (크레딧 + 뱃지)
 * - 매일 자정에 일일 기여 리셋 (누적 총점은 유지)
 *
 * 비유: 동물의숲의 마을 평가 시스템
 *       유저가 활동할수록 마을에 꽃이 피고 건물이 세워짐
 *
 * 사용처:
 * - 마을 탭: 건물/꽃/가로등 시각적 반영
 * - 오늘 탭: 번영도 미니 배지
 * - 전체 탭: 마일스톤 목록 + 보상 수령
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  VillageProsperity,
  ProsperityContribution,
  ProsperityMilestone,
} from '../types/village';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROSPERITY_KEY = 'village_prosperity';

// ============================================================================
// 상수
// ============================================================================

/** 활동별 번영 포인트 */
const PROSPERITY_POINTS: Record<ProsperityContribution['source'], number> = {
  context_card_read: 10,
  prediction_vote: 5,
  prediction_correct: 15,
  quiz_complete: 10,
  community_post: 5,
  guru_chat: 3,
  streak_maintained: 5,
  share: 5,
  roundtable_join: 10,
};

/** 레벨별 필요 누적 포인트 */
const LEVEL_THRESHOLDS: number[] = [
  0,     // Lv 1: 황무지
  100,   // Lv 2: 작은 마을
  300,   // Lv 3: 성장하는 마을
  600,   // Lv 4: 번영한 마을
  1000,  // Lv 5: 전설의 마을 입구
  1500,  // Lv 6: 지혜의 거리
  2200,  // Lv 7: 금빛 시장
  3100,  // Lv 8: 투자의 탑
  4200,  // Lv 9: 하늘의 정원
  5500,  // Lv 10: 전설의 마을
];

/** 기본 마일스톤 정의 */
const DEFAULT_MILESTONES: ProsperityMilestone[] = [
  { level: 1, name: '첫 번째 불꽃', nameEn: 'First Spark', reward: '2C' },
  { level: 2, name: '작은 싹', nameEn: 'Small Sprout', reward: '5C' },
  { level: 3, name: '마을 꽃밭', nameEn: 'Village Garden', reward: '10C' },
  { level: 4, name: '활기찬 시장', nameEn: 'Lively Market', reward: '15C + Badge' },
  { level: 5, name: '번영의 다리', nameEn: 'Bridge of Prosperity', reward: '20C' },
  { level: 6, name: '지혜의 도서관', nameEn: 'Library of Wisdom', reward: '25C' },
  { level: 7, name: '금빛 분수', nameEn: 'Golden Fountain', reward: '30C + Badge' },
  { level: 8, name: '투자의 탑', nameEn: 'Tower of Investment', reward: '40C' },
  { level: 9, name: '하늘의 정원', nameEn: 'Sky Garden', reward: '50C' },
  { level: 10, name: '전설의 마을', nameEn: 'Legendary Village', reward: '100C + Special Badge' },
];

/** 일일 최대 포인트 */
const DAILY_CAP = 100;

// ============================================================================
// 유틸
// ============================================================================

/** 포인트 → 레벨 변환 */
function pointsToLevel(totalPoints: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/** 다음 레벨까지 진행률 (0~100) */
function getProgressPercent(totalPoints: number): number {
  const level = pointsToLevel(totalPoints);
  if (level >= LEVEL_THRESHOLDS.length) return 100;

  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level];
  const range = nextThreshold - currentThreshold;
  if (range <= 0) return 100;

  const progress = totalPoints - currentThreshold;
  return Math.min(100, Math.round((progress / range) * 100));
}

/** 오늘 날짜 문자열 */
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/** 기본 번영도 데이터 — village.ts VillageProsperity 타입 준수 */
function createDefaultProsperity(): VillageProsperity {
  return {
    level: 1,
    score: 0,
    dailyContributions: [],
    milestones: DEFAULT_MILESTONES.map(m => ({ ...m })),
  };
}

// ============================================================================
// 일일 포인트 추적 (별도 키)
// ============================================================================

const DAILY_TRACKER_KEY = 'village_prosperity_daily';

interface DailyTracker {
  date: string;
  totalPoints: number;
}

async function getDailyTracker(): Promise<DailyTracker> {
  try {
    const stored = await AsyncStorage.getItem(DAILY_TRACKER_KEY);
    if (stored) {
      const parsed: DailyTracker = JSON.parse(stored);
      if (parsed.date === getTodayKey()) return parsed;
    }
  } catch {
    // 무시
  }
  return { date: getTodayKey(), totalPoints: 0 };
}

async function saveDailyTracker(data: DailyTracker): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_TRACKER_KEY, JSON.stringify(data));
  } catch {
    // 무시
  }
}

// ============================================================================
// 훅
// ============================================================================

// ============================================================================
// 건강 점수 ↔ 번영도 연동 (Sprint 5-2)
// ============================================================================

/**
 * 건강 점수 등급 → 번영도 시각 보너스 레벨
 * 건강 점수가 높을수록 마을 외관이 더 풍성하게 보임
 * (실제 레벨은 변하지 않고, 표시용 보너스만 추가)
 */
const HEALTH_VISUAL_BONUS: Record<string, number> = {
  A: 1,  // A등급: +1레벨 외관
  B: 0,  // B등급: 보너스 없음
  C: 0,
  D: 0,
  F: -1, // F등급: -1레벨 외관 (마을이 조금 칙칙해 보임)
};

export function getHealthVisualBonus(healthGrade: string | null): number {
  if (!healthGrade) return 0;
  return HEALTH_VISUAL_BONUS[healthGrade.toUpperCase()] ?? 0;
}

export interface UseVillageProsperityReturn {
  /** 번영도 데이터 */
  prosperity: VillageProsperity;
  /** 활동 기여 추가 (번영 포인트 적립) */
  addContribution: (source: ProsperityContribution['source']) => Promise<{
    pointsAdded: number;
    leveledUp: boolean;
    newLevel: number;
  }>;
  /** 현재 레벨 */
  level: number;
  /** 다음 레벨까지 진행률 (0~100) */
  progress: number;
  /** 전체 마일스톤 (해금 상태 포함) */
  milestones: (ProsperityMilestone & { unlocked: boolean })[];
  /** 오늘 획득한 포인트 */
  todayPoints: number;
  /** 오늘 남은 포인트 (일일 상한 기준) */
  remainingToday: number;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 건강 점수 기반 시각 보너스 적용 레벨 */
  visualLevel: (healthGrade: string | null) => number;
}

export function useVillageProsperity(): UseVillageProsperityReturn {
  const [prosperity, setProsperity] = useState<VillageProsperity>(createDefaultProsperity());
  const [todayPoints, setTodayPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  // AsyncStorage에서 번영도 로드
  useEffect(() => {
    isMountedRef.current = true;

    const loadProsperity = async () => {
      try {
        const stored = await AsyncStorage.getItem(PROSPERITY_KEY);
        if (stored) {
          const parsed: VillageProsperity = JSON.parse(stored);
          if (isMountedRef.current) setProsperity(parsed);
        }

        // 일일 포인트 로드
        const daily = await getDailyTracker();
        if (isMountedRef.current) setTodayPoints(daily.totalPoints);
      } catch (err) {
        if (__DEV__) console.warn('[useVillageProsperity] 로드 에러:', err);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    loadProsperity();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 번영도 저장
  const saveProsperity = useCallback(async (data: VillageProsperity) => {
    try {
      await AsyncStorage.setItem(PROSPERITY_KEY, JSON.stringify(data));
    } catch (err) {
      if (__DEV__) console.warn('[useVillageProsperity] 저장 에러:', err);
    }
  }, []);

  // 활동 기여 추가
  const addContribution = useCallback(async (source: ProsperityContribution['source']): Promise<{
    pointsAdded: number;
    leveledUp: boolean;
    newLevel: number;
  }> => {
    const basePoints = PROSPERITY_POINTS[source] || 1;

    // 일일 상한 체크
    const daily = await getDailyTracker();
    if (daily.totalPoints >= DAILY_CAP) {
      if (__DEV__) console.log(`[useVillageProsperity] 일일 상한 도달 (${DAILY_CAP})`);
      return { pointsAdded: 0, leveledUp: false, newLevel: prosperity.level };
    }

    const actualPoints = Math.min(basePoints, DAILY_CAP - daily.totalPoints);

    // 일일 포인트 업데이트
    daily.totalPoints += actualPoints;
    await saveDailyTracker(daily);
    if (isMountedRef.current) setTodayPoints(daily.totalPoints);

    let result = { pointsAdded: actualPoints, leveledUp: false, newLevel: prosperity.level };

    setProsperity(prev => {
      const newScore = prev.score + actualPoints;
      const prevLevel = pointsToLevel(prev.score);
      const newLevel = pointsToLevel(newScore);
      const leveledUp = newLevel > prevLevel;

      // 마일스톤 해금 업데이트
      const updatedMilestones = (prev.milestones.length > 0 ? prev.milestones : DEFAULT_MILESTONES).map(m => ({
        ...m,
        unlockedAt: m.level <= newLevel && !m.unlockedAt ? new Date().toISOString() : m.unlockedAt,
      }));

      const contribution: ProsperityContribution = {
        source,
        points: actualPoints,
        timestamp: new Date().toISOString(),
      };

      // 기여 내역은 오늘 것만 + 최근 50개
      const updatedDailyContributions = [...prev.dailyContributions, contribution].slice(-50);

      const updated: VillageProsperity = {
        level: newLevel,
        score: newScore,
        dailyContributions: updatedDailyContributions,
        milestones: updatedMilestones,
        currentEvent: prev.currentEvent,
      };

      result = { pointsAdded: actualPoints, leveledUp, newLevel };

      if (__DEV__) {
        if (__DEV__) console.log(
          `[useVillageProsperity] +${actualPoints}pts (${source}) → total ${newScore}, Lv${newLevel}${leveledUp ? ' [LEVEL UP!]' : ''}`
        );
      }

      // 비동기 저장
      saveProsperity(updated);

      return updated;
    });

    return result;
  }, [prosperity.level, saveProsperity]);

  // 파생 상태
  const level = prosperity.level || pointsToLevel(prosperity.score);
  const progress = getProgressPercent(prosperity.score);

  const milestones = (prosperity.milestones.length > 0 ? prosperity.milestones : DEFAULT_MILESTONES).map(m => ({
    ...m,
    unlocked: !!m.unlockedAt || m.level <= level,
  }));

  // 건강 점수 기반 시각 보너스 레벨 (마을 외관용)
  const visualLevel = useCallback((healthGrade: string | null) => {
    const bonus = getHealthVisualBonus(healthGrade);
    return Math.max(1, Math.min(10, level + bonus));
  }, [level]);

  return {
    prosperity,
    addContribution,
    level,
    progress,
    milestones,
    todayPoints,
    remainingToday: Math.max(0, DAILY_CAP - todayPoints),
    isLoading,
    visualLevel,
  };
}
