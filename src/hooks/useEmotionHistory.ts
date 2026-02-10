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

export function useEmotionHistory(): EmotionHistoryResult {
  const [history, setHistory] = useState<EmotionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: EmotionEntry[] = JSON.parse(raw);
        // 날짜 내림차순 정렬 (최신이 먼저)
        data.sort((a, b) => b.date.localeCompare(a.date));
        setHistory(data);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to load emotion history:', error);
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
