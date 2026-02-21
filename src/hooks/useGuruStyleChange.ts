/**
 * useGuruStyleChange — 투자 철학 변경 감지
 * 전체 탭에서 철학 변경 시 홈 탭에 알림 표시
 */
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React from 'react';

const GURU_CHANGE_KEY = '@baln:guru_style_changed';
const GURU_NAMES: Record<string, string> = {
  dalio: '레이 달리오',
  buffett: '워렌 버핏',
  cathie_wood: '캐시 우드',
  kostolany: '코스톨라니',
};

export function useGuruStyleChange() {
  const [changeInfo, setChangeInfo] = useState<{ from: string; to: string } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const check = async () => {
        try {
          const raw = await AsyncStorage.getItem(GURU_CHANGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            setChangeInfo(parsed);
          }
        } catch {}
      };
      check();
    }, [])
  );

  const dismiss = async () => {
    setChangeInfo(null);
    await AsyncStorage.removeItem(GURU_CHANGE_KEY);
  };

  const getDisplayName = (key: string) => GURU_NAMES[key] || key;

  return {
    hasChange: !!changeInfo,
    fromName: changeInfo ? getDisplayName(changeInfo.from) : '',
    toName: changeInfo ? getDisplayName(changeInfo.to) : '',
    dismiss,
  };
}

/**
 * 철학 변경 시 호출 (전체 탭 guru-style.tsx에서)
 * 현재는 useGuruStyle.ts의 setGuruStyle 호출 후 별도 기록
 */
export async function recordGuruStyleChange(from: string, to: string) {
  if (from === to) return;
  await AsyncStorage.setItem(
    GURU_CHANGE_KEY,
    JSON.stringify({ from, to, timestamp: Date.now() })
  );
}
