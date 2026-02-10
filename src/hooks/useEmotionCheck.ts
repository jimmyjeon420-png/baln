/**
 * useEmotionCheck - 감정 체크 훅
 *
 * 코스톨라니: "투자 심리 관리" — 매일 감정을 기록하여 자기 인식.
 * 하루에 한 번만 기록 가능, 다음 날 자동 리셋.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@baln:emotion_check';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface EmotionCheckResult {
  todayEmotion: string | null;
  setEmotion: (emotion: string) => void;
  isChecked: boolean;
}

export function useEmotionCheck(): EmotionCheckResult {
  const [todayEmotion, setTodayEmotion] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.date === getTodayString()) {
            setTodayEmotion(parsed.emotion);
          }
        }
      } catch {}
    })();
  }, []);

  const setEmotion = useCallback((emotion: string) => {
    setTodayEmotion(emotion);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: getTodayString(),
      emotion,
    })).catch(() => {});
  }, []);

  return { todayEmotion, setEmotion, isChecked: todayEmotion !== null };
}
