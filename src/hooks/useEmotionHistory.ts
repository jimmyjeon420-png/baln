/**
 * useEmotionHistory - 감정 히스토리 훅
 *
 * 워렌 버핏: "감정 일기를 쓰면, 공포 때 판 걸 나중에 후회하게 된다. 좋은 교육이다."
 *
 * 기능:
 * - AsyncStorage에서 최근 30일 감정 히스토리 로드
 * - 리마인더 계산 (30일 전 감정 vs 현재 자산 변화)
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmotionEntry } from './useEmotionCheck';
import supabase from '../services/supabase';

const STORAGE_KEY = '@baln:emotion_history';

interface EmotionHistoryResult {
  history: EmotionEntry[];
  last30Days: EmotionEntry[];
  reminderText: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * 날짜 문자열을 Date 객체로 변환
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 오늘부터 N일 전 날짜 계산
 */
function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * 두 날짜가 같은 날인지 확인
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 감정 키를 이모지로 변환
 */
function getEmotionEmoji(key: string): string {
  const map: Record<string, string> = {
    anxious: '😰',
    worried: '😟',
    neutral: '😐',
    calm: '😊',
    confident: '🤑',
  };
  return map[key] || '😐';
}

/**
 * 감정 키를 레이블로 변환
 */
function getEmotionLabel(key: string): string {
  const map: Record<string, string> = {
    anxious: '불안',
    worried: '걱정',
    neutral: '보통',
    calm: '안심',
    confident: '확신',
  };
  return map[key] || '보통';
}

/**
 * 리마인더 텍스트 생성
 * "한 달 전 당신은 '😰불안'이었는데, 지금 자산은 +8%예요"
 */
function generateReminder(history: EmotionEntry[]): string | null {
  if (history.length === 0) return null;

  // 30일 전 감정 찾기
  const thirtyDaysAgo = getDaysAgo(30);
  const oldEntry = history.find(entry => {
    const entryDate = parseDate(entry.date);
    return isSameDay(entryDate, thirtyDaysAgo);
  });

  if (!oldEntry) return null;

  // 오늘 감정 찾기
  const today = new Date();
  const todayEntry = history.find(entry => {
    const entryDate = parseDate(entry.date);
    return isSameDay(entryDate, today);
  });

  if (!todayEntry) return null;

  // 감정 변화 메시지 생성
  const oldEmoji = getEmotionEmoji(oldEntry.emotion);
  const oldLabel = getEmotionLabel(oldEntry.emotion);
  const newEmoji = getEmotionEmoji(todayEntry.emotion);
  const newLabel = getEmotionLabel(todayEntry.emotion);

  // 감정이 개선된 경우
  const emotionScore: Record<string, number> = {
    anxious: 1,
    worried: 2,
    neutral: 3,
    calm: 4,
    confident: 5,
  };

  const oldScore = emotionScore[oldEntry.emotion] || 3;
  const newScore = emotionScore[todayEntry.emotion] || 3;

  if (newScore > oldScore) {
    return `💡 한 달 전 당신은 "${oldEmoji}${oldLabel}"이었는데, 지금은 "${newEmoji}${newLabel}"이에요. 감정이 안정되었네요!`;
  } else if (newScore < oldScore) {
    return `💡 한 달 전 당신은 "${oldEmoji}${oldLabel}"이었어요. 시장은 언제나 변동이 있답니다.`;
  } else {
    return `💡 한 달 전과 지금 모두 "${oldEmoji}${oldLabel}"이네요. 일관된 마음가짐입니다.`;
  }
}

// ============================================================================
// Supabase에서 감정 기록 로드 (앱 재설치 후 복원 / 크로스 디바이스 동기화)
// ============================================================================

async function loadFromSupabase(): Promise<EmotionEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_emotions')
      .select('date, emotion, memo, nasdaq_close, btc_close')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(365); // 최대 1년치

    if (error || !data) return [];

    return data.map((row: any) => ({
      date: row.date as string,
      emotion: row.emotion as string,
      memo: row.memo ?? '',
      nasdaqClose: row.nasdaq_close != null ? Number(row.nasdaq_close) : undefined,
      btcClose: row.btc_close != null ? Number(row.btc_close) : undefined,
    }));
  } catch {
    return [];
  }
}

/** 로컬 + Supabase 기록을 병합 (날짜 기준 dedup, 최신 우선) */
function mergeEntries(local: EmotionEntry[], remote: EmotionEntry[]): EmotionEntry[] {
  const map = new Map<string, EmotionEntry>();
  // remote 먼저 (클라우드 기준), 이후 local이 덮어씀 (디바이스 최신 반영)
  for (const e of remote) map.set(e.date, e);
  for (const e of local)  map.set(e.date, e);
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function useEmotionHistory(): EmotionHistoryResult {
  const [history, setHistory] = useState<EmotionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setIsLoading(true);

      // 로컬 AsyncStorage 읽기
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const localData: EmotionEntry[] = raw ? JSON.parse(raw) : [];

      // Supabase에서 병렬로 읽기 (실패해도 로컬로 폴백)
      const remoteData = await loadFromSupabase().catch(() => [] as EmotionEntry[]);

      // 병합: 로컬 우선 (최신 데이터 우선)
      const merged = mergeEntries(localData, remoteData);

      // 병합 결과를 로컬에 다시 저장 (앱 재설치 후 Supabase 데이터 복원)
      if (remoteData.length > 0) {
        const limitedMerged = merged.slice(0, 60); // 60일 제한 유지
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limitedMerged)).catch(() => {});
      }

      setHistory(merged);
    } catch (error) {
      console.warn('Failed to load emotion history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // 최근 30일 필터링
  const last30Days = history.filter(entry => {
    const entryDate = parseDate(entry.date);
    const thirtyDaysAgo = getDaysAgo(30);
    return entryDate >= thirtyDaysAgo;
  });

  // 리마인더 생성
  const reminderText = generateReminder(history);

  return {
    history,
    last30Days,
    reminderText,
    isLoading,
    refresh: loadHistory,
  };
}
