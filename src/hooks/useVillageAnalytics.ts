/**
 * useVillageAnalytics — 마을 참여 지표 추적 훅
 *
 * 역할: "마을 통계청" — 사용자가 마을에서 어떤 기능을 얼마나 쓰는지
 *       조용히 기록해서 "어느 기능이 가장 인기 있는가"를 알려줌
 *
 * 비유: 편의점 CCTV + 방문객 카운터 — 방문자는 신경 쓰지 않지만
 *       운영자(개발자)는 "냉장고 칸이 인기 없다"는 걸 알 수 있음
 *
 * 설계 원칙:
 *   - 모든 데이터는 AsyncStorage에만 저장 (서버 전송 없음, 개인정보 보호)
 *   - 언마운트 시 자동 저장 (사용자 개입 불필요)
 *   - 참여 점수는 시간이 아닌 기능 다양성 기준 (달리오: "다양성이 리스크를 줄인다")
 *
 * 사용처:
 * - app/(tabs)/village.tsx 에서 마운트 시 자동 세션 시작
 * - app/(tabs)/profile.tsx 에서 engagementScore 표시
 */

import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const ANALYTICS_KEY = 'village_analytics';

/** 탐험 점수 계산에 쓰이는 전체 기능 목록 (다양성 기준) */
const ALL_FEATURES = [
  'guru_chat',
  'letter_read',
  'event_join',
  'brand_view',
  'newspaper_read',
  'weather_check',
  'tutorial_complete',
  'prediction_vote',
  'context_card_read',
  'prosperity_check',
] as const;

type FeatureName = typeof ALL_FEATURES[number];

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export interface VillageAnalytics {
  // 세션 지표
  totalVisits: number;
  totalTimeSpent: number;       // 누적 체류 시간 (초)
  averageSessionLength: number; // 평균 세션 길이 (초)

  // 참여 지표
  guruChats: Record<string, number>; // guruId → 채팅 횟수
  favoriteGuru: string;              // 가장 많이 채팅한 구루 ID
  lettersRead: number;
  eventsParticipated: number;
  brandsViewed: number;
  newspaperReads: number;
  weatherChecks: number;

  // 기능 탐험
  featuresDiscovered: string[]; // 사용해 본 기능 목록

  // 날짜
  firstVisit: string;              // ISO 8601
  lastVisit: string;               // ISO 8601
  consecutiveVisitDays: number;    // 연속 방문 일수
}

/** 기본 초기값 */
const DEFAULT_ANALYTICS: VillageAnalytics = {
  totalVisits: 0,
  totalTimeSpent: 0,
  averageSessionLength: 0,
  guruChats: {},
  favoriteGuru: '',
  lettersRead: 0,
  eventsParticipated: 0,
  brandsViewed: 0,
  newspaperReads: 0,
  weatherChecks: 0,
  featuresDiscovered: [],
  firstVisit: '',
  lastVisit: '',
  consecutiveVisitDays: 0,
};

// ---------------------------------------------------------------------------
// AsyncStorage I/O
// ---------------------------------------------------------------------------

async function loadAnalytics(): Promise<VillageAnalytics> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
    if (!raw) return { ...DEFAULT_ANALYTICS };
    return { ...DEFAULT_ANALYTICS, ...JSON.parse(raw) };
  } catch (err) {
    if (__DEV__) console.warn('[useVillageAnalytics] 로드 실패:', err);
    return { ...DEFAULT_ANALYTICS };
  }
}

async function saveAnalytics(data: VillageAnalytics): Promise<void> {
  try {
    await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch (err) {
    if (__DEV__) console.warn('[useVillageAnalytics] 저장 실패:', err);
  }
}

// ---------------------------------------------------------------------------
// 날짜 유틸
// ---------------------------------------------------------------------------

/** 날짜 문자열에서 "YYYY-MM-DD" 형태의 날짜만 추출 */
function toDateString(isoDate: string): string {
  return isoDate.slice(0, 10);
}

/**
 * 연속 방문 일수 계산
 * lastVisit이 어제면 +1, 오늘이면 유지, 그 외면 1로 리셋
 */
function calcConsecutiveDays(prev: string, current: string): number {
  if (!prev) return 1;

  const prevDate   = new Date(toDateString(prev));
  const curDate    = new Date(toDateString(current));
  const diffMs     = curDate.getTime() - prevDate.getTime();
  const diffDays   = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 1;     // 같은 날 재방문
  if (diffDays === 1) return 2;     // 어제 방문 → 연속 2일 (호출 전 기존 값에 +1 필요)
  return 1;                         // 하루 이상 공백 → 리셋
}

// ---------------------------------------------------------------------------
// 훅
// ---------------------------------------------------------------------------

export function useVillageAnalytics() {
  /** 인메모리 스냅샷 — 빈번한 AsyncStorage I/O 방지 */
  const analyticsRef = useRef<VillageAnalytics | null>(null);
  /** 세션 시작 타임스탬프 (ms) */
  const sessionStartRef = useRef<number>(Date.now());
  const mountedRef = useRef(true);

  // ── 초기화: 마운트 시 세션 시작 기록 ────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    sessionStartRef.current = Date.now();

    (async () => {
      const data = await loadAnalytics();
      if (!mountedRef.current) return;

      const now = new Date().toISOString();
      const isFirstVisit = !data.firstVisit;

      // 연속 방문 일수 업데이트
      const prevConsecutive = data.consecutiveVisitDays;
      const consecutiveVisitDays = isFirstVisit
        ? 1
        : (() => {
            const diff = calcConsecutiveDays(data.lastVisit, now);
            // diff가 2이면 "어제도 방문" → 기존 일수에 +1
            return diff === 2 ? prevConsecutive + 1 : 1;
          })();

      const updated: VillageAnalytics = {
        ...data,
        totalVisits: data.totalVisits + 1,
        firstVisit: isFirstVisit ? now : data.firstVisit,
        lastVisit: now,
        consecutiveVisitDays,
      };

      analyticsRef.current = updated;
      await saveAnalytics(updated);

      if (__DEV__) {
        if (__DEV__) console.log(
          `[useVillageAnalytics] 세션 시작 — 총 방문: ${updated.totalVisits}회, 연속: ${consecutiveVisitDays}일`,
        );
      }
    })();

    // ── 언마운트: 세션 종료 시 체류 시간 저장 ─────────────────────────────
    return () => {
      mountedRef.current = false;

      const sessionSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      if (!analyticsRef.current) return;

      const prev = analyticsRef.current;
      const totalTimeSpent = prev.totalTimeSpent + sessionSeconds;
      const averageSessionLength =
        prev.totalVisits > 0 ? Math.round(totalTimeSpent / prev.totalVisits) : sessionSeconds;

      const final: VillageAnalytics = {
        ...prev,
        totalTimeSpent,
        averageSessionLength,
      };

      // 비동기이지만 언마운트 후라 ref는 사용 못 함 — fire-and-forget
      saveAnalytics(final).catch(() => {});

      if (__DEV__) {
        if (__DEV__) console.log(
          `[useVillageAnalytics] 세션 종료 — 체류 ${sessionSeconds}초, 평균 ${averageSessionLength}초`,
        );
      }
    };
  }, []);

  // ── 이벤트 트래킹 ─────────────────────────────────────────────────────────

  /**
   * 마을 이벤트 기록
   *
   * @param eventName 이벤트 종류 (예: 'guru_chat', 'letter_read')
   * @param data 추가 데이터 (예: { guruId: 'buffett' })
   *
   * 사용 예:
   * ```
   * trackEvent('guru_chat', { guruId: 'dalio' });
   * trackEvent('letter_read');
   * trackEvent('brand_view', { brandId: 'nike_village' });
   * ```
   */
  const trackEvent = useCallback(
    async (eventName: string, data?: Record<string, string | number | boolean>) => {
      if (!analyticsRef.current) {
        analyticsRef.current = await loadAnalytics();
      }

      const prev = analyticsRef.current;
      let updated = { ...prev };

      // 이벤트별 카운터 업데이트
      switch (eventName as FeatureName | string) {
        case 'guru_chat': {
          const guruId = (data?.guruId as string) ?? 'unknown';
          const guruChats = { ...prev.guruChats, [guruId]: (prev.guruChats[guruId] ?? 0) + 1 };
          const favoriteGuru = Object.entries(guruChats).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '';
          updated = { ...updated, guruChats, favoriteGuru };
          break;
        }
        case 'letter_read':
          updated = { ...updated, lettersRead: prev.lettersRead + 1 };
          break;
        case 'event_join':
          updated = { ...updated, eventsParticipated: prev.eventsParticipated + 1 };
          break;
        case 'brand_view':
          updated = { ...updated, brandsViewed: prev.brandsViewed + 1 };
          break;
        case 'newspaper_read':
          updated = { ...updated, newspaperReads: prev.newspaperReads + 1 };
          break;
        case 'weather_check':
          updated = { ...updated, weatherChecks: prev.weatherChecks + 1 };
          break;
        default:
          break;
      }

      // 기능 탐험 기록 (중복 제거)
      if (!prev.featuresDiscovered.includes(eventName)) {
        updated = {
          ...updated,
          featuresDiscovered: [...prev.featuresDiscovered, eventName],
        };
      }

      analyticsRef.current = updated;
      // 배경 저장 (UI 블로킹 없음)
      saveAnalytics(updated).catch(() => {});

      if (__DEV__) {
        if (__DEV__) console.log(`[useVillageAnalytics] 이벤트: ${eventName}`, data ?? '');
      }
    },
    [],
  );

  /**
   * 현재 분석 데이터 반환 (비동기)
   */
  const getAnalytics = useCallback(async (): Promise<VillageAnalytics> => {
    if (analyticsRef.current) return analyticsRef.current;
    const loaded = await loadAnalytics();
    analyticsRef.current = loaded;
    return loaded;
  }, []);

  /**
   * 가장 많이 대화한 구루 ID 반환 (동기 — 인메모리 기준)
   */
  const getMostPopularGuru = useCallback((): string | null => {
    const data = analyticsRef.current;
    if (!data || Object.keys(data.guruChats).length === 0) return null;

    return Object.entries(data.guruChats).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  }, []);

  /**
   * 참여 점수 (0 ~ 100)
   *
   * 기준: 시간 체류가 아닌 "기능 다양성"
   * - 발견한 기능 수 / 전체 기능 수 × 60점 (탐험 다양성)
   * - 구루 채팅 수 (최대 20점)
   * - 연속 방문 일수 (최대 20점)
   */
  const getEngagementScore = useCallback((): number => {
    const data = analyticsRef.current;
    if (!data) return 0;

    // 기능 다양성 (최대 60점)
    const knownFeatures = data.featuresDiscovered.filter(f =>
      ALL_FEATURES.includes(f as FeatureName),
    );
    const diversityScore = Math.min((knownFeatures.length / ALL_FEATURES.length) * 60, 60);

    // 구루 채팅 활성도 (최대 20점): 총 채팅 수, 30회 = 20점 상한
    const totalChats = Object.values(data.guruChats).reduce((s, n) => s + n, 0);
    const chatScore = Math.min((totalChats / 30) * 20, 20);

    // 연속 방문 일수 (최대 20점): 20일 = 20점 상한
    const streakScore = Math.min((data.consecutiveVisitDays / 20) * 20, 20);

    return Math.round(diversityScore + chatScore + streakScore);
  }, []);

  return {
    trackEvent,
    getAnalytics,
    getMostPopularGuru,
    getEngagementScore,
  };
}
