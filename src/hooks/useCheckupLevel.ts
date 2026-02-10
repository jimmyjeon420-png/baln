/**
 * useCheckupLevel - 분석 탭 레벨 관리 훅
 *
 * AsyncStorage에 투자 경험 레벨(초급/중급/고급)을 저장하고 읽는다.
 * 온보딩에서 수집하거나, 분석 탭 내 LevelSwitcher로 전환 가능.
 * 기본값: 'beginner' (온보딩 스킵 시)
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InvestorLevel = 'beginner' | 'intermediate' | 'advanced';

const STORAGE_KEY = '@baln:investor_level';
const DEFAULT_LEVEL: InvestorLevel = 'beginner';

export function useCheckupLevel() {
  const [level, setLevelState] = useState<InvestorLevel>(DEFAULT_LEVEL);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 저장된 레벨 읽기
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && stored && isValidLevel(stored)) {
          setLevelState(stored as InvestorLevel);
        }
      } catch (err) {
        console.warn('[useCheckupLevel] 레벨 로드 실패:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 레벨 변경 + 저장
  const setLevel = useCallback(async (newLevel: InvestorLevel) => {
    setLevelState(newLevel);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLevel);
    } catch (err) {
      console.warn('[useCheckupLevel] 레벨 저장 실패:', err);
    }
  }, []);

  return { level, isLoading, setLevel };
}

function isValidLevel(value: string): value is InvestorLevel {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}
