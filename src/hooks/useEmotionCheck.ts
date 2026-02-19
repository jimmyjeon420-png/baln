/**
 * useEmotionCheck - 감정 체크 훅 (메모 포함)
 *
 * 코스톨라니: "투자 심리 관리" — 매일 감정을 기록하여 자기 인식.
 * 하루에 한 번만 기록 가능, 다음 날 자동 리셋.
 * Wave 3: 메모 입력 추가 + 히스토리 배열 저장
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { grantEmotionReward, REWARD_AMOUNTS } from '../services/rewardService';
import supabase from '../services/supabase';

const STORAGE_KEY = '@baln:emotion_history';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface EmotionEntry {
  date: string;
  emotion: string;
  memo: string;
  nasdaqClose?: number;   // 나스닥 종가 (사용자 직접 입력)
  btcClose?: number;      // BTC 종가 $ (사용자 직접 입력)
}

interface EmotionCheckResult {
  todayEmotion: string | null;
  todayMemo: string;
  nasdaqClose: number | undefined;
  btcClose: number | undefined;
  setEmotion: (emotion: string) => void;
  setMemo: (memo: string) => void;
  setNasdaqClose: (v: number | undefined) => void;
  setBtcClose: (v: number | undefined) => void;
  saveEmotionWithMemo: () => Promise<void>;
  isChecked: boolean;
  /** 감정 기록 보상으로 받은 크레딧 (저장 직후 한 번만 값이 있음) */
  rewardCredits: number;
}

// ============================================================================
// Supabase 동기화 유틸 (로컬 저장 성공 후 백그라운드에서 호출)
// ============================================================================

async function syncEmotionToSupabase(entry: EmotionEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_emotions').upsert({
      user_id: user.id,
      date: entry.date,
      emotion: entry.emotion,
      memo: entry.memo,
      nasdaq_close: entry.nasdaqClose ?? null,
      btc_close: entry.btcClose ?? null,
    }, { onConflict: 'user_id,date' });
  } catch (err) {
    console.warn('[감정 기록] Supabase 동기화 실패 (로컬 저장은 유지):', err);
  }
}

export function useEmotionCheck(): EmotionCheckResult {
  const [todayEmotion, setTodayEmotionState] = useState<string | null>(null);
  const [todayMemo, setTodayMemoState] = useState<string>('');
  const [nasdaqClose, setNasdaqCloseState] = useState<number | undefined>(undefined);
  const [btcClose, setBtcCloseState] = useState<number | undefined>(undefined);
  const [rewardCredits, setRewardCredits] = useState<number>(0);

  // 초기 로드: 오늘 날짜의 감정 체크
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const history: EmotionEntry[] = JSON.parse(raw);
          const todayEntry = history.find(entry => entry.date === getTodayString());
          if (todayEntry) {
            setTodayEmotionState(todayEntry.emotion);
            setTodayMemoState(todayEntry.memo);
            setNasdaqCloseState(todayEntry.nasdaqClose);
            setBtcCloseState(todayEntry.btcClose);
          }
        }
      } catch (err) {
        console.warn('[감정 체크] 오늘의 감정 로드 실패:', err);
      }
    })();
  }, []);

  const setEmotion = useCallback((emotion: string) => {
    setTodayEmotionState(emotion);
  }, []);

  const setMemo = useCallback((memo: string) => {
    setTodayMemoState(memo);
  }, []);

  const saveEmotionWithMemo = useCallback(async () => {
    if (!todayEmotion) return;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let history: EmotionEntry[] = raw ? JSON.parse(raw) : [];

      // 오늘 날짜 엔트리 제거 (중복 방지)
      history = history.filter(entry => entry.date !== getTodayString());

      // 새 엔트리 추가 (나스닥/BTC 종가 포함)
      const newEntry: EmotionEntry = {
        date: getTodayString(),
        emotion: todayEmotion,
        memo: todayMemo,
      };
      if (nasdaqClose !== undefined) newEntry.nasdaqClose = nasdaqClose;
      if (btcClose !== undefined) newEntry.btcClose = btcClose;
      history.push(newEntry);

      // 최근 60일만 유지 (용량 관리)
      if (history.length > 60) {
        history = history.slice(-60);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));

      // Supabase 클라우드 동기화 (백그라운드, 실패해도 로컬 저장은 유지)
      syncEmotionToSupabase(newEntry).catch(() => {});

      // 감정 기록 보상 지급 (1일 1회, 5크레딧)
      try {
        const reward = await grantEmotionReward();
        if (reward.success) {
          setRewardCredits(reward.creditsEarned);
          // 3초 후 보상 표시 초기화
          setTimeout(() => setRewardCredits(0), 3000);
        }
      } catch (err) {
        console.warn('[감정 체크] 보상 지급 실패 (무시):', err);
      }
    } catch (error) {
      console.warn('[감정 체크] 감정 저장 실패:', error);
    }
  }, [todayEmotion, todayMemo, nasdaqClose, btcClose]);

  return {
    todayEmotion,
    todayMemo,
    nasdaqClose,
    btcClose,
    setEmotion,
    setMemo,
    setNasdaqClose: setNasdaqCloseState,
    setBtcClose: setBtcCloseState,
    saveEmotionWithMemo,
    isChecked: todayEmotion !== null,
    rewardCredits,
  };
}
