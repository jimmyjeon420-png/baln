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

const STORAGE_KEY = '@baln:emotion_history';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface EmotionEntry {
  date: string;
  emotion: string;
  memo: string;
}

interface EmotionCheckResult {
  todayEmotion: string | null;
  todayMemo: string;
  setEmotion: (emotion: string) => void;
  setMemo: (memo: string) => void;
  saveEmotionWithMemo: () => Promise<void>;
  isChecked: boolean;
  /** 감정 기록 보상으로 받은 크레딧 (저장 직후 한 번만 값이 있음) */
  rewardCredits: number;
}

export function useEmotionCheck(): EmotionCheckResult {
  const [todayEmotion, setTodayEmotionState] = useState<string | null>(null);
  const [todayMemo, setTodayMemoState] = useState<string>('');
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

      // 새 엔트리 추가
      history.push({
        date: getTodayString(),
        emotion: todayEmotion,
        memo: todayMemo,
      });

      // 최근 60일만 유지 (용량 관리)
      if (history.length > 60) {
        history = history.slice(-60);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));

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
      console.error('[감정 체크] 감정 저장 실패:', error);
    }
  }, [todayEmotion, todayMemo]);

  return {
    todayEmotion,
    todayMemo,
    setEmotion,
    setMemo,
    saveEmotionWithMemo,
    isChecked: todayEmotion !== null,
    rewardCredits,
  };
}
