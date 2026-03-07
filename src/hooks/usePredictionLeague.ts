/**
 * usePredictionLeague — 예측 리그 시스템 관리 훅
 *
 * 역할: "리그 사무국" — 예측 적중률 기반 레이팅/티어/순위 관리
 * 비유: 축구 프리미어리그 승강제
 *       매주 적중하면 레이팅 상승 → 티어 승급 → 주간 보상
 *       틀리면 레이팅 하락 → 강등 위험
 *
 * 데이터 흐름:
 * - 예측 투표 결과 → recordPrediction(correct) → 레이팅 변동
 * - AsyncStorage에 레이팅/주간 기록 저장
 * - 29명 시뮬레이션 플레이어로 순위 생성 (결정적 — 주차 기반)
 *
 * 사용처:
 * - PredictionLeagueCard: 오늘 탭 미니 카드
 * - LeagueStandingModal: 전체 순위표 모달
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LEAGUE_TIERS,
  LEAGUE_PLAYER_COUNT,
  PROMOTION_ZONE,
  RELEGATION_ZONE,
  RATING_GAIN_CORRECT,
  RATING_LOSS_WRONG,
  RATING_FLOOR,
  getTierForRating,
  getNextTier,
  getTierProgress,
  type LeagueTier,
} from '../data/leagueConfig';

// ============================================================================
// 상수
// ============================================================================

const LEAGUE_STORAGE_KEY = 'baln_prediction_league';

interface LeagueStorageData {
  rating: number;
  weeklyCorrect: number;
  weeklyTotal: number;
  weekStartDate: string; // YYYY-MM-DD (월요일 기준)
  previousTierId: string;
}

// ============================================================================
// 시뮬레이션 플레이어
// ============================================================================

export interface SimulatedPlayer {
  id: string;
  nameKo: string;
  nameEn: string;
  rating: number;
  isUser: boolean;
}

/** 결정적 시드 기반 시뮬레이션 플레이어 생성 (주차 기반) */
function generateSimulatedPlayers(
  weekSeed: number,
  userRating: number,
): SimulatedPlayer[] {
  const names = [
    { ko: '현명한 올빼미', en: 'Wise Owl' },
    { ko: '용감한 사슴', en: 'Brave Deer' },
    { ko: '빠른 여우', en: 'Swift Fox' },
    { ko: '날카로운 치타', en: 'Sharp Cheetah' },
    { ko: '강한 늑대', en: 'Strong Wolf' },
    { ko: '당당한 사자', en: 'Proud Lion' },
    { ko: '신비한 카멜레온', en: 'Mystic Chameleon' },
    { ko: '느긋한 곰', en: 'Chill Bear' },
    { ko: '신중한 거북이', en: 'Careful Turtle' },
    { ko: '탐험가 호랑이', en: 'Explorer Tiger' },
    { ko: '투자자_1234', en: 'Investor_1234' },
    { ko: '투자자_5678', en: 'Investor_5678' },
    { ko: '투자자_9012', en: 'Investor_9012' },
    { ko: '분석가_3456', en: 'Analyst_3456' },
    { ko: '분석가_7890', en: 'Analyst_7890' },
    { ko: '트레이더_2468', en: 'Trader_2468' },
    { ko: '트레이더_1357', en: 'Trader_1357' },
    { ko: '예측왕_4321', en: 'PredKing_4321' },
    { ko: '예측왕_8765', en: 'PredKing_8765' },
    { ko: '초보_1111', en: 'Rookie_1111' },
    { ko: '초보_2222', en: 'Rookie_2222' },
    { ko: '고수_3333', en: 'Expert_3333' },
    { ko: '고수_4444', en: 'Expert_4444' },
    { ko: '리서처_5555', en: 'Researcher_5555' },
    { ko: '리서처_6666', en: 'Researcher_6666' },
    { ko: '장기투자_7777', en: 'LongTerm_7777' },
    { ko: '단기매매_8888', en: 'DayTrader_8888' },
    { ko: '가치투자_9999', en: 'ValueInv_9999' },
    { ko: '성장투자_0000', en: 'GrowthInv_0000' },
  ];

  // 결정적 유사 랜덤 생성 (시드 기반)
  const seededRandom = (idx: number): number => {
    const x = Math.sin(weekSeed * 1000 + idx * 137.5) * 10000;
    return x - Math.floor(x);
  };

  const players: SimulatedPlayer[] = names.map((name, idx) => {
    // 유저 레이팅 기준 +-300 범위에서 분포
    const baseRating = Math.max(0, userRating - 150 + seededRandom(idx) * 300);
    const jitter = (seededRandom(idx + 100) - 0.5) * 200;
    const rating = Math.max(0, Math.round(baseRating + jitter));

    return {
      id: `sim_${idx}`,
      nameKo: name.ko,
      nameEn: name.en,
      rating,
      isUser: false,
    };
  });

  return players;
}

// ============================================================================
// 유틸
// ============================================================================

/** 이번 주 월요일 날짜 (YYYY-MM-DD) */
function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0=일요일
  const diff = day === 0 ? 6 : day - 1; // 월요일까지의 차이
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

/** 주차 시드 (연도 + 주차 번호 → 결정적 값) */
function getWeekSeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const weekNum = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  return now.getFullYear() * 100 + weekNum;
}

/** 기본 리그 데이터 */
function createDefaultLeagueData(): LeagueStorageData {
  return {
    rating: 0,
    weeklyCorrect: 0,
    weeklyTotal: 0,
    weekStartDate: getWeekStartDate(),
    previousTierId: 'bronze',
  };
}

// ============================================================================
// 반환 타입
// ============================================================================

export interface UsePredictionLeagueReturn {
  /** 현재 티어 */
  currentTier: LeagueTier;
  /** 현재 레이팅 */
  rating: number;
  /** 이번 주 적중 수 */
  weeklyCorrect: number;
  /** 이번 주 총 예측 수 */
  weeklyTotal: number;
  /** 이번 주 순위 (1-based) */
  weeklyRank: number;
  /** 다음 티어까지 진행률 (0~100) */
  tierProgress: number;
  /** 다음 티어 정보 (최고 티어면 null) */
  nextTier: LeagueTier | null;
  /** 이번 주 승급했는지 (이전 티어 대비) */
  isPromoted: boolean;
  /** 이번 주 강등 위험인지 */
  isDemoted: boolean;
  /** 승급 존 안에 있는지 (상위 5위) */
  inPromotionZone: boolean;
  /** 강등 존 안에 있는지 (하위 5위) */
  inRelegationZone: boolean;
  /** 전체 순위표 (30명, 유저 포함) */
  standings: SimulatedPlayer[];
  /** 예측 결과 기록 */
  recordPrediction: (correct: boolean) => Promise<void>;
  /** 로딩 상태 */
  isLoading: boolean;
}

// ============================================================================
// 훅
// ============================================================================

export function usePredictionLeague(): UsePredictionLeagueReturn {
  const [data, setData] = useState<LeagueStorageData>(createDefaultLeagueData());
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  // ── AsyncStorage 로드 ──
  useEffect(() => {
    isMountedRef.current = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(LEAGUE_STORAGE_KEY);
        if (raw) {
          const stored: LeagueStorageData = JSON.parse(raw);
          const currentWeek = getWeekStartDate();

          // 주간 리셋 체크
          if (stored.weekStartDate !== currentWeek) {
            const resetData: LeagueStorageData = {
              ...stored,
              weeklyCorrect: 0,
              weeklyTotal: 0,
              weekStartDate: currentWeek,
              previousTierId: getTierForRating(stored.rating).id,
            };
            if (isMountedRef.current) setData(resetData);
            await AsyncStorage.setItem(LEAGUE_STORAGE_KEY, JSON.stringify(resetData));
          } else {
            if (isMountedRef.current) setData(stored);
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('[usePredictionLeague] 로드 에러:', err);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    load();
    return () => { isMountedRef.current = false; };
  }, []);

  // ── 저장 ──
  const save = useCallback(async (newData: LeagueStorageData) => {
    try {
      await AsyncStorage.setItem(LEAGUE_STORAGE_KEY, JSON.stringify(newData));
    } catch (err) {
      if (__DEV__) console.warn('[usePredictionLeague] 저장 에러:', err);
    }
  }, []);

  // ── 예측 결과 기록 ──
  const recordPrediction = useCallback(async (correct: boolean) => {
    setData(prev => {
      const ratingDelta = correct ? RATING_GAIN_CORRECT : -RATING_LOSS_WRONG;
      const newRating = Math.max(RATING_FLOOR, prev.rating + ratingDelta);

      const newData: LeagueStorageData = {
        ...prev,
        rating: newRating,
        weeklyCorrect: prev.weeklyCorrect + (correct ? 1 : 0),
        weeklyTotal: prev.weeklyTotal + 1,
      };

      if (__DEV__) {
        const tier = getTierForRating(newRating);
        if (__DEV__) console.log(
          `[usePredictionLeague] ${correct ? 'correct' : 'wrong'} → rating ${newRating} (${tier.nameEn})`
        );
      }

      save(newData);
      return newData;
    });
  }, [save]);

  // ── 파생 상태 ──
  const currentTier = getTierForRating(data.rating);
  const nextTier = getNextTier(currentTier.id);
  const tierProgress = getTierProgress(data.rating);
  const previousTier = LEAGUE_TIERS.find(t => t.id === data.previousTierId) || LEAGUE_TIERS[0];
  const isPromoted = LEAGUE_TIERS.indexOf(currentTier) > LEAGUE_TIERS.indexOf(previousTier);
  const isDemoted = LEAGUE_TIERS.indexOf(currentTier) < LEAGUE_TIERS.indexOf(previousTier);

  // ── 시뮬레이션 순위 ──
  const standings = useMemo<SimulatedPlayer[]>(() => {
    const weekSeed = getWeekSeed();
    const simPlayers = generateSimulatedPlayers(weekSeed, data.rating);

    // 유저 추가
    const userPlayer: SimulatedPlayer = {
      id: 'user',
      nameKo: '나',
      nameEn: 'Me',
      rating: data.rating,
      isUser: true,
    };

    const all = [...simPlayers, userPlayer];

    // 레이팅 내림차순 정렬
    all.sort((a, b) => b.rating - a.rating);

    return all;
  }, [data.rating]);

  // 유저 순위 (1-based)
  const weeklyRank = standings.findIndex(p => p.isUser) + 1;
  const inPromotionZone = weeklyRank <= PROMOTION_ZONE;
  const inRelegationZone = weeklyRank > LEAGUE_PLAYER_COUNT - RELEGATION_ZONE;

  return {
    currentTier,
    rating: data.rating,
    weeklyCorrect: data.weeklyCorrect,
    weeklyTotal: data.weeklyTotal,
    weeklyRank,
    tierProgress,
    nextTier,
    isPromoted,
    isDemoted,
    inPromotionZone,
    inRelegationZone,
    standings,
    recordPrediction,
    isLoading,
  };
}
