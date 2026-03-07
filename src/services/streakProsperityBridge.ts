/**
 * streakProsperityBridge.ts — 스트릭 ↔ 마을 번영도 연결 서비스
 *
 * 역할: "출석부와 마을 번영 관리국을 연결하는 전령"
 * - 스트릭 유지 시 → 번영도 +5 포인트
 * - 3일+ 미접속 후 복귀 시 → 번영도 -1 레벨 + 구루 편지
 * - 스트릭 체크 결과를 받아 AsyncStorage에 직접 반영
 *
 * 이 서비스는 훅이 아닌 순수 함수로 구현하여
 * useStreak에서 직접 호출할 수 있게 함
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProsperityContribution } from '../types/village';

const PROSPERITY_KEY = 'village_prosperity';
const LETTERS_KEY = 'village_letters';

/** 번영도 레벨 임계값 (useVillageProsperity와 동일) */
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3100, 4200, 5500];

function pointsToLevel(totalPoints: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/** 일일 포인트 상한 체크 키 */
const DAILY_TRACKER_KEY = 'village_prosperity_daily';

interface DailyTracker {
  date: string;
  totalPoints: number;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 스트릭 유지 시 번영도 포인트 추가
 * useVillageProsperity 훅 없이 AsyncStorage에 직접 기록
 */
export async function addStreakProsperityPoints(): Promise<void> {
  try {
    const STREAK_POINTS = 5;

    // 일일 상한 체크
    const dailyRaw = await AsyncStorage.getItem(DAILY_TRACKER_KEY);
    let daily: DailyTracker = { date: getTodayKey(), totalPoints: 0 };
    if (dailyRaw) {
      const parsed: DailyTracker = JSON.parse(dailyRaw);
      if (parsed.date === getTodayKey()) daily = parsed;
    }
    if (daily.totalPoints >= 100) return; // 일일 상한

    const actualPoints = Math.min(STREAK_POINTS, 100 - daily.totalPoints);
    if (actualPoints <= 0) return;

    // 번영도 데이터 로드
    const stored = await AsyncStorage.getItem(PROSPERITY_KEY);
    const data = stored ? JSON.parse(stored) : {
      level: 1,
      score: 0,
      dailyContributions: [],
      milestones: [],
    };

    // 포인트 추가
    data.score += actualPoints;
    data.level = pointsToLevel(data.score);

    const contribution: ProsperityContribution = {
      source: 'streak_maintained',
      points: actualPoints,
      timestamp: new Date().toISOString(),
    };
    data.dailyContributions = [...(data.dailyContributions || []), contribution].slice(-50);

    // 저장
    await AsyncStorage.setItem(PROSPERITY_KEY, JSON.stringify(data));

    // 일일 포인트 업데이트
    daily.totalPoints += actualPoints;
    await AsyncStorage.setItem(DAILY_TRACKER_KEY, JSON.stringify(daily));

    if (__DEV__) {
      if (__DEV__) console.log(`[streakProsperityBridge] +${actualPoints}pts (streak_maintained) → total ${data.score}`);
    }
  } catch (err) {
    if (__DEV__) console.warn('[streakProsperityBridge] addStreakProsperityPoints 에러:', err);
  }
}

/**
 * 3일+ 미접속 후 복귀 시 번영도 감소 + 구루 편지 생성
 *
 * @param daysMissed - 빠진 일수 (lastVisit → today)
 */
export async function handleStreakBreak(daysMissed: number): Promise<void> {
  if (daysMissed < 3) return; // 2일 이하 공백은 무시

  try {
    // 번영도 감소 (빠진 일수에 비례, 최대 -30)
    const penaltyPoints = Math.min(daysMissed * 3, 30);

    const stored = await AsyncStorage.getItem(PROSPERITY_KEY);
    if (!stored) return;

    const data = JSON.parse(stored);
    data.score = Math.max(0, (data.score || 0) - penaltyPoints);
    data.level = pointsToLevel(data.score);

    await AsyncStorage.setItem(PROSPERITY_KEY, JSON.stringify(data));

    if (__DEV__) {
      if (__DEV__) console.log(`[streakProsperityBridge] -${penaltyPoints}pts (${daysMissed}일 미접속) → total ${data.score}`);
    }

    // 구루 편지 생성 (복귀를 환영하는 편지)
    await generateReturnLetter(daysMissed);
  } catch (err) {
    if (__DEV__) console.warn('[streakProsperityBridge] handleStreakBreak 에러:', err);
  }
}

/**
 * 복귀 구루 편지 생성
 * 매일 다른 구루가 "다시 돌아와서 반갑다"는 편지를 보냄
 */
async function generateReturnLetter(daysMissed: number): Promise<void> {
  const WELCOME_BACK_GURUS = [
    {
      guruId: 'buffett',
      subject: '다시 만나서 반갑네요',
      subjectEn: 'Welcome back, friend',
      body: `${daysMissed}일 만이네요. 시장은 매일 새로운 이야기를 합니다. 함께 읽어볼까요? 지식에도 복리가 적용됩니다.`,
      bodyEn: `${daysMissed} days away. Markets tell a new story every day. Shall we read together? Knowledge compounds too.`,
    },
    {
      guruId: 'dalio',
      subject: '마을이 그리웠어요',
      subjectEn: 'The village missed you',
      body: `${daysMissed}일 동안 마을이 조금 조용했어요. 시장에 많은 변화가 있었는데, 같이 분석해봐요.`,
      bodyEn: `The village was quiet for ${daysMissed} days. Lots of market changes happened. Let's analyze together.`,
    },
    {
      guruId: 'lynch',
      subject: '잘 지냈어요?',
      subjectEn: 'How have you been?',
      body: `${daysMissed}일이나 지났네요! 그동안 흥미로운 종목을 발견했어요. 마을에서 이야기 나눠요.`,
      bodyEn: `${daysMissed} days passed! I found some interesting picks. Let's chat in the village.`,
    },
    {
      guruId: 'marks',
      subject: '천천히 다시 시작해요',
      subjectEn: 'Let\'s start again slowly',
      body: `${daysMissed}일 쉬었으니 충분히 재충전했겠죠. 사이클은 항상 돌아옵니다. 우리도 다시 시작해요.`,
      bodyEn: `${daysMissed} days off means you're recharged. Cycles always return. Let's begin again.`,
    },
    {
      guruId: 'cathie_wood',
      subject: '혁신은 기다려주지 않아요!',
      subjectEn: 'Innovation doesn\'t wait!',
      body: `${daysMissed}일 사이에 세상이 많이 바뀌었어요. 새로운 트렌드를 함께 살펴봐요!`,
      bodyEn: `The world changed a lot in ${daysMissed} days. Let's explore the new trends together!`,
    },
  ];

  const today = new Date();
  const idx = (today.getFullYear() * 100 + today.getDate()) % WELCOME_BACK_GURUS.length;
  const template = WELCOME_BACK_GURUS[idx];

  const newLetter = {
    id: `return_${Date.now()}`,
    fromGuruId: template.guruId,
    subject: template.subject,
    subjectEn: template.subjectEn,
    body: template.body,
    bodyEn: template.bodyEn,
    timestamp: new Date().toISOString(),
    isRead: false,
    friendshipRequired: 'stranger' as const,
  };

  try {
    const storedLetters = await AsyncStorage.getItem(LETTERS_KEY);
    const letters = storedLetters ? JSON.parse(storedLetters) : [];
    letters.unshift(newLetter);
    // 최대 20개 유지
    await AsyncStorage.setItem(LETTERS_KEY, JSON.stringify(letters.slice(0, 20)));

    if (__DEV__) {
      if (__DEV__) console.log(`[streakProsperityBridge] 복귀 편지 생성: ${template.guruId}`);
    }
  } catch (err) {
    if (__DEV__) console.warn('[streakProsperityBridge] generateReturnLetter 에러:', err);
  }
}
