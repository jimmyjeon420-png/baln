/**
 * useEasterEggs — 이스터에그 감지 & 관리 훅
 *
 * 역할: "비밀 탐지기" — 시간/행동/시장 조건을 실시간 확인하여
 *       이스터에그 발견 이벤트를 마을 탭에 전달
 *
 * 비유: 동물의숲에서 특정 시간에 마을을 돌아다니면 깜짝 이벤트가 뜨는 것
 *
 * 동작:
 * 1. 마운트 시 시간 기반 이스터에그 체크 (KST 시간/요일)
 * 2. 행동 기반 이스터에그 체크 (AsyncStorage 누적 데이터)
 * 3. 발견된 에그 AsyncStorage에 저장 (중복 방지)
 * 4. 토스트 표시용 상태 반환
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GuruFriendship } from '../types/village';
import {
  ALL_EASTER_EGGS,
  TIME_EGG_CONDITIONS,
  type EasterEgg,
} from '../data/easterEggConfig';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

/** All-time discovered egg IDs (JSON string[]) */
const DISCOVERED_KEY = '@baln:easter_eggs_discovered';

/** Today's discovered time-based egg IDs (JSON { date, ids[] }) */
const DAILY_DISCOVERED_KEY = '@baln:easter_eggs_daily';

/** Behavior counters (JSON object) */
const BEHAVIOR_COUNTERS_KEY = '@baln:easter_eggs_behavior';

// ---------------------------------------------------------------------------
// KST Helpers
// ---------------------------------------------------------------------------

function getKSTDate(): { hour: number; dayOfWeek: number; dateStr: string } {
  const now = new Date();
  // KST = UTC + 9
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kstDate = new Date(kstMs);
  return {
    hour: kstDate.getUTCHours(),
    dayOfWeek: kstDate.getUTCDay(), // 0=Sun..6=Sat
    dateStr: kstDate.toISOString().split('T')[0],
  };
}

// ---------------------------------------------------------------------------
// Behavior Counter Persistence
// ---------------------------------------------------------------------------

interface BehaviorCounters {
  /** Consecutive days chatting with each guru: { guruId: count } */
  consecutiveChatDays?: Record<string, number>;
  /** Consecutive correct predictions */
  consecutiveCorrect?: number;
  /** Consecutive early-bird days (before 7 AM KST) */
  earlyBirdStreak?: number;
  /** Consecutive night-owl days (after midnight KST) */
  nightOwlStreak?: number;
  /** Last updated date */
  lastDate?: string;
}

async function loadBehaviorCounters(): Promise<BehaviorCounters> {
  try {
    const raw = await AsyncStorage.getItem(BEHAVIOR_COUNTERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

// ---------------------------------------------------------------------------
// Hook Return Type
// ---------------------------------------------------------------------------

export interface EasterEggToast {
  egg: EasterEgg;
  visible: boolean;
}

export interface UseEasterEggsReturn {
  /** Currently active (just discovered) eggs */
  discoveredEggs: EasterEgg[];
  /** All-time discovered egg IDs */
  allDiscovered: string[];
  /** Toast to display (one at a time) */
  easterEggToast: EasterEggToast | null;
  /** Dismiss current toast */
  dismissToast: () => void;
  /** Manually trigger a behavior check (e.g., after prediction) */
  checkBehaviorEgg: (behaviorId: string) => Promise<void>;
  /** Total discovered count */
  totalDiscovered: number;
  /** Total available eggs */
  totalEggs: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEasterEggs(
  friendships?: Record<string, GuruFriendship>,
): UseEasterEggsReturn {
  const [discoveredEggs, setDiscoveredEggs] = useState<EasterEgg[]>([]);
  const [allDiscovered, setAllDiscovered] = useState<string[]>([]);
  const [toastQueue, setToastQueue] = useState<EasterEgg[]>([]);
  const [currentToast, setCurrentToast] = useState<EasterEggToast | null>(null);
  const isProcessing = useRef(false);

  // -----------------------------------------------------------------------
  // Load all-time discovered list
  // -----------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DISCOVERED_KEY);
        if (raw) {
          setAllDiscovered(JSON.parse(raw));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // -----------------------------------------------------------------------
  // Save a newly discovered egg
  // -----------------------------------------------------------------------
  const markDiscovered = useCallback(async (eggId: string, isTimeBased: boolean) => {
    // Update all-time list
    setAllDiscovered(prev => {
      if (prev.includes(eggId)) return prev;
      const updated = [...prev, eggId];
      AsyncStorage.setItem(DISCOVERED_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // For time-based: also mark in daily store to prevent same-day re-trigger
    if (isTimeBased) {
      try {
        const raw = await AsyncStorage.getItem(DAILY_DISCOVERED_KEY);
        const { dateStr } = getKSTDate();
        let daily: { date: string; ids: string[] } = { date: dateStr, ids: [] };
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.date === dateStr) {
            daily = parsed;
          }
        }
        if (!daily.ids.includes(eggId)) {
          daily.ids.push(eggId);
        }
        await AsyncStorage.setItem(DAILY_DISCOVERED_KEY, JSON.stringify(daily));
      } catch {
        // ignore
      }
    }
  }, []);

  // -----------------------------------------------------------------------
  // Check time-based eggs on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const { hour, dayOfWeek, dateStr } = getKSTDate();

      // Load today's already-discovered time eggs
      let todayDiscovered: string[] = [];
      try {
        const raw = await AsyncStorage.getItem(DAILY_DISCOVERED_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.date === dateStr) {
            todayDiscovered = parsed.ids || [];
          }
        }
      } catch {
        // ignore
      }

      const newlyFound: EasterEgg[] = [];

      for (const [eggId, condition] of Object.entries(TIME_EGG_CONDITIONS)) {
        // Already discovered today
        if (todayDiscovered.includes(eggId)) continue;

        // Check hour range
        if (hour < condition.hours[0] || hour >= condition.hours[1]) continue;

        // Check day-of-week (if specified)
        if (condition.days && !condition.days.includes(dayOfWeek)) continue;

        // Find the egg definition
        const egg = ALL_EASTER_EGGS.find(e => e.id === eggId);
        if (egg) {
          newlyFound.push(egg);
          await markDiscovered(eggId, true);
        }
      }

      if (newlyFound.length > 0) {
        setDiscoveredEggs(prev => [...prev, ...newlyFound]);
        setToastQueue(prev => [...prev, ...newlyFound]);
      }
    })();
  }, [markDiscovered]);

  // -----------------------------------------------------------------------
  // Check behavior-based eggs on mount (when friendships are available)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!friendships) return;

    (async () => {
      const alreadyDiscovered = await (async () => {
        try {
          const raw = await AsyncStorage.getItem(DISCOVERED_KEY);
          return raw ? JSON.parse(raw) as string[] : [];
        } catch {
          return [] as string[];
        }
      })();

      const counters = await loadBehaviorCounters();
      const newlyFound: EasterEgg[] = [];

      // all_friends_lv3: all gurus at friendship tier >= 'friend' (score >= 50)
      if (!alreadyDiscovered.includes('all_friends_lv3')) {
        const allAtLv3 = Object.values(friendships).every(f => f.score >= 50);
        if (allAtLv3 && Object.keys(friendships).length >= 10) {
          const egg = ALL_EASTER_EGGS.find(e => e.id === 'all_friends_lv3');
          if (egg) {
            newlyFound.push(egg);
            await markDiscovered('all_friends_lv3', false);
          }
        }
      }

      // guru_bestie_30: any guru with consecutiveChatDays >= 30
      if (!alreadyDiscovered.includes('guru_bestie_30') && counters.consecutiveChatDays) {
        const has30 = Object.values(counters.consecutiveChatDays).some(v => v >= 30);
        if (has30) {
          const egg = ALL_EASTER_EGGS.find(e => e.id === 'guru_bestie_30');
          if (egg) {
            newlyFound.push(egg);
            await markDiscovered('guru_bestie_30', false);
          }
        }
      }

      // perfect_10: 10 consecutive correct predictions
      if (!alreadyDiscovered.includes('perfect_10') && (counters.consecutiveCorrect ?? 0) >= 10) {
        const egg = ALL_EASTER_EGGS.find(e => e.id === 'perfect_10');
        if (egg) {
          newlyFound.push(egg);
          await markDiscovered('perfect_10', false);
        }
      }

      // early_bird_7: 7 consecutive early mornings
      if (!alreadyDiscovered.includes('early_bird_7') && (counters.earlyBirdStreak ?? 0) >= 7) {
        const egg = ALL_EASTER_EGGS.find(e => e.id === 'early_bird_7');
        if (egg) {
          newlyFound.push(egg);
          await markDiscovered('early_bird_7', false);
        }
      }

      // night_streak_7: 7 consecutive late nights
      if (!alreadyDiscovered.includes('night_streak_7') && (counters.nightOwlStreak ?? 0) >= 7) {
        const egg = ALL_EASTER_EGGS.find(e => e.id === 'night_streak_7');
        if (egg) {
          newlyFound.push(egg);
          await markDiscovered('night_streak_7', false);
        }
      }

      if (newlyFound.length > 0) {
        setDiscoveredEggs(prev => [...prev, ...newlyFound]);
        setToastQueue(prev => [...prev, ...newlyFound]);
      }
    })();
  }, [friendships, markDiscovered]);

  // -----------------------------------------------------------------------
  // Toast queue processor — show one at a time
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (isProcessing.current || toastQueue.length === 0) return;

    isProcessing.current = true;
    const nextEgg = toastQueue[0];
    setCurrentToast({ egg: nextEgg, visible: true });

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setCurrentToast(null);
      setToastQueue(prev => prev.slice(1));
      isProcessing.current = false;
    }, 5000);

    return () => clearTimeout(timer);
  }, [toastQueue]);

  // -----------------------------------------------------------------------
  // Manual dismiss
  // -----------------------------------------------------------------------
  const dismissToast = useCallback(() => {
    setCurrentToast(null);
    setToastQueue(prev => prev.slice(1));
    isProcessing.current = false;
  }, []);

  // -----------------------------------------------------------------------
  // Manual behavior check (called externally, e.g., after prediction result)
  // -----------------------------------------------------------------------
  const checkBehaviorEgg = useCallback(async (behaviorId: string) => {
    // Avoid duplicate discovery
    const raw = await AsyncStorage.getItem(DISCOVERED_KEY).catch(() => null);
    let discovered: string[];
    try {
      discovered = raw ? JSON.parse(raw) : [];
    } catch {
      discovered = [];
    }
    if (discovered.includes(behaviorId)) return;

    const egg = ALL_EASTER_EGGS.find(e => e.id === behaviorId);
    if (!egg) return;

    await markDiscovered(behaviorId, false);
    setDiscoveredEggs(prev => [...prev, egg]);
    setToastQueue(prev => [...prev, egg]);
  }, [markDiscovered]);

  return {
    discoveredEggs,
    allDiscovered,
    easterEggToast: currentToast,
    dismissToast,
    checkBehaviorEgg,
    totalDiscovered: allDiscovered.length,
    totalEggs: ALL_EASTER_EGGS.length,
  };
}
