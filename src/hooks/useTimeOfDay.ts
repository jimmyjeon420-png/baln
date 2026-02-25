/**
 * useTimeOfDay — 시간대별 테마 변화 훅
 *
 * 역할: "하늘 관리자" — 현재 KST 시간에 따라 배경 색상/분위기 자동 변경
 * - 새벽 (05-07): 부드러운 핑크/주황 (동이 트는 느낌)
 * - 아침 (07-11): 따뜻한 골드 (활기찬 아침)
 * - 낮 (11-16): 맑은 하늘 (밝고 청명)
 * - 저녁 (16-19): 노을 (오렌지/분홍)
 * - 밤 (19-05): 네이비 밤하늘 (별 반짝)
 */

import { useState, useEffect } from 'react';

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

interface TimeOfDayTheme {
  period: TimeOfDay;
  label: string;
  skyGradient: [string, string];   // 하늘 그라데이션 (상→하)
  groundColor: string;              // 바닥 색상
  starOpacity: number;              // 별 표시 (밤에만)
  ambientColor: string;             // 분위기 조명 색상
  greeting: string;                 // 인사말
}

const TIME_THEMES: Record<TimeOfDay, TimeOfDayTheme> = {
  dawn: {
    period: 'dawn',
    label: '새벽',
    skyGradient: ['#1A1040', '#E88B96'],
    groundColor: '#1A2030',
    starOpacity: 0.3,
    ambientColor: '#E88B9620',
    greeting: '이른 아침부터 대단해요',
  },
  morning: {
    period: 'morning',
    label: '아침',
    skyGradient: ['#4A90B8', '#F0C060'],
    groundColor: '#162E1E',
    starOpacity: 0,
    ambientColor: '#F0C06020',
    greeting: '좋은 아침이에요!',
  },
  afternoon: {
    period: 'afternoon',
    label: '낮',
    skyGradient: ['#3A7CC0', '#5DADE2'],
    groundColor: '#1A3520',
    starOpacity: 0,
    ambientColor: '#5DADE220',
    greeting: '오늘 시장은 어떨까요?',
  },
  evening: {
    period: 'evening',
    label: '저녁',
    skyGradient: ['#2E1A4A', '#E87040'],
    groundColor: '#1A1520',
    starOpacity: 0.15,
    ambientColor: '#E8704020',
    greeting: '오늘 하루 수고했어요',
  },
  night: {
    period: 'night',
    label: '밤',
    skyGradient: ['#0A1028', '#162040'],
    groundColor: '#0D1520',
    starOpacity: 0.8,
    ambientColor: '#5DADE210',
    greeting: '늦은 밤까지 열심이시네요',
  },
};

function getKSTHour(): number {
  const now = new Date();
  // KST = UTC + 9
  const utcHour = now.getUTCHours();
  return (utcHour + 9) % 24;
}

function getPeriod(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 19) return 'evening';
  return 'night';
}

export function useTimeOfDay(): TimeOfDayTheme {
  const [period, setPeriod] = useState<TimeOfDay>(() => getPeriod(getKSTHour()));

  useEffect(() => {
    // 1분마다 시간대 체크 (시간대 전환 감지)
    const interval = setInterval(() => {
      const newPeriod = getPeriod(getKSTHour());
      setPeriod(prev => {
        if (prev !== newPeriod) return newPeriod;
        return prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return TIME_THEMES[period];
}
