/**
 * useVillageWorld — 마을 세계 통합 마스터 훅
 *
 * 역할: "마을 시장(市長)" — 날씨·감정·활동·우정·번영·편지 모든 서브시스템을
 *       하나의 통합된 API로 조합해 Village 탭이 실제로 사용하는 단일 진입점 제공
 *
 * 비유: 오케스트라 지휘자 — 각 파트(날씨/감정/활동/우정)가 따로 연주하지만
 *       이 훅이 전체를 통합해 하나의 아름다운 마을 세계를 만들어 냄
 *
 * 사용처:
 * - app/(tabs)/village.tsx (마을 탭 메인)
 * - src/components/village/VillageMap.tsx
 */

import { useMemo, useCallback } from 'react';
import { useWeather } from './useWeather';
import { useGuruMood } from './useGuruMood';
import { useGuruActivity, type GuruActivityState } from './useGuruActivity';
import { useGuruFriendship } from './useGuruFriendship';
import { useVillageProsperity } from './useVillageProsperity';
import { useVillageLetters } from './useVillageLetters';
import { useGuruVillage, type GuruPosition } from './useGuruVillage';
import { useVillageReactions, type ActiveReaction } from './useVillageReactions';
import { useVillageAnalytics } from './useVillageAnalytics';
import type { VillageReactionType } from '../services/villageReactionService';
import type { GuruMood, GuruActivity, FriendshipTier, GuruFriendship, ProsperityContribution, GuruLetter, VillageWeather, ClothingLevel } from '../types/village';
import type { CharacterExpression } from '../types/character';
import type { VillageConversation, VillageMessage } from '../services/villageConversationService';

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

/**
 * 구루 1명의 모든 상태를 통합한 객체
 * Village 탭에서 각 구루 NPC를 렌더링할 때 이것 하나만 참조하면 됨
 */
export interface GuruFullState {
  guruId: string;
  /** 마을 내 위치 (0~1 비율) */
  position: { x: number; y: number };
  /** 현재 기분 상태 */
  mood: GuruMood;
  /** 기분 이모지 (예: "😊", "😤") */
  moodEmoji: string;
  /** 현재 활동 */
  activity: GuruActivity;
  /** 활동 이모지 (예: "📖", "🚶") */
  activityEmoji: string;
  /** 활동 설명 (한국어/영어) */
  activityDescription: { ko: string; en: string };
  /** CharacterExpression (기존 4표정 체계 호환) */
  expression: CharacterExpression;
  /** 우정 티어 */
  friendshipTier: FriendshipTier;
  /** 우정 점수 (0~200+) */
  friendshipScore: number;
  /** 현재 말풍선 메시지 (있으면) */
  bubble?: string;
}

// ---------------------------------------------------------------------------
// 반환 타입
// ---------------------------------------------------------------------------

export interface UseVillageWorldReturn {
  // 날씨
  weather: VillageWeather | null;
  clothingLevel: ClothingLevel;

  // 통합 구루 상태 (Map: guruId → GuruFullState)
  guruStates: Map<string, GuruFullState>;
  /** 특정 구루의 통합 상태 조회 (null = 아직 로딩 안 됨) */
  getGuruFullState: (guruId: string) => GuruFullState | null;

  // 액션
  /** 구루에게 말 걸기 — 대화 전송 + 우정 포인트 + 번영 포인트 동시 적립 */
  chatWithGuru: (guruId: string, message: string) => Promise<void>;
  /** 구루 채팅 창 열기 */
  openGuruChat: (guruId: string) => void;
  /** 구루 채팅 창 닫기 */
  closeGuruChat: () => void;

  // 마을 위치/대화
  positions: GuruPosition[];
  conversations: VillageConversation[];
  userChatGuru: string | null;
  userChatMessages: VillageMessage[];
  isUserChatLoading: boolean;
  userChatError: boolean;
  sendMessageToGuru: (message: string) => Promise<void>;
  retryLastMessage: () => void;

  // 번영도
  prosperityLevel: number;
  prosperityProgress: number;
  todayPoints: number;
  addContribution: (source: ProsperityContribution['source']) => Promise<{
    pointsAdded: number;
    leveledUp: boolean;
    newLevel: number;
  }>;

  // 편지
  letters: GuruLetter[];
  unreadCount: number;
  openLetter: (id: string) => Promise<void>;

  // 우정
  friendships: Record<string, GuruFriendship>;
  addInteraction: (guruId: string, type: string) => Promise<void>;
  getTopFriends: (n: number) => GuruFriendship[];

  // 리액션
  /** 현재 활성 구루 반응 (축하/인사 등). null이면 없음 */
  activeReaction: ActiveReaction | null;
  /** 구루 반응 트리거 (예측 적중, 스트릭, 맥락카드 읽기 등) */
  triggerReaction: (type: VillageReactionType, closestGuruId?: string) => void;

  // 분석
  /** 마을 이벤트 트래킹 (예: trackEvent('guru_chat', { guruId: 'buffett' })) */
  trackEvent: (eventName: string, data?: Record<string, string | number | boolean>) => Promise<void>;
  /** 참여 점수 (0~100, 기능 다양성 기준) */
  getEngagementScore: () => number;

  // 로딩
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// 훅
// ---------------------------------------------------------------------------

/**
 * useVillageWorld
 *
 * @param marketSentiment — 현재 시장 센티먼트 (-100~100 스케일).
 *        undefined이면 0(보합)으로 취급.
 */
export function useVillageWorld(marketSentiment?: number): UseVillageWorldReturn {
  const sentiment = marketSentiment ?? 0;

  // ── 서브시스템 훅 ─────────────────────────────────────────────────────────

  const { weather, clothingLevel } = useWeather();

  const {
    moods,
    getMood,
    getMoodEmojiForGuru,
    getExpression,
  } = useGuruMood(sentiment, weather);

  // useGuruActivity는 Map<string, GuruMood>을 받으므로 Record → Map 변환
  const moodsMap = useMemo<Map<string, GuruMood> | null>(() => {
    if (!moods || Object.keys(moods).length === 0) return null;
    return new Map(Object.entries(moods));
  }, [moods]);

  const { activities: _activities, getActivity } = useGuruActivity(moodsMap, weather);

  const {
    friendships,
    addInteraction,
    getTier,
    getTopFriends,
  } = useGuruFriendship();

  const {
    addContribution,
    level: prosperityLevel,
    progress: prosperityProgress,
    todayPoints,
  } = useVillageProsperity();

  // useVillageLetters는 Map<string, { tier, score }>를 받으므로 변환
  const friendshipsMap = useMemo<Map<string, { tier: FriendshipTier; score: number }>>(() => {
    const m = new Map<string, { tier: FriendshipTier; score: number }>();
    for (const [id, f] of Object.entries(friendships)) {
      m.set(id, { tier: f.tier, score: f.score });
    }
    return m;
  }, [friendships]);

  const { letters, unreadCount, openLetter } = useVillageLetters(friendshipsMap);

  const village = useGuruVillage({ layoutMode: 'full' });

  // 가장 친한 구루 ID (리액션 대표 구루용)
  const topFriend = getTopFriends(1)[0];
  const closestGuruId = topFriend?.guruId;

  // 구루 반응 시스템 (축하/인사/이벤트)
  const { activeReaction, triggerReaction } = useVillageReactions(closestGuruId);

  // 마을 분석 (참여 지표 추적)
  const { trackEvent, getEngagementScore } = useVillageAnalytics();

  // ── 통합 구루 상태 맵 (useMemo로 캐싱) ───────────────────────────────────

  const guruStates = useMemo<Map<string, GuruFullState>>(() => {
    const result = new Map<string, GuruFullState>();

    for (const position of village.positions) {
      const { guruId } = position;

      // 감정 (weather/moods가 아직 없으면 기본값)
      const mood: GuruMood = getMood(guruId);
      const moodEmoji = getMoodEmojiForGuru(guruId);
      const expression = getExpression(guruId);

      // 활동 (아직 결정 안 됐으면 기본값)
      const activityState: GuruActivityState | null = getActivity(guruId);
      const activity: GuruActivity = activityState?.activity ?? 'walking';
      const activityEmoji = activityState?.emoji ?? '🚶';
      const activityDescription = activityState?.description ?? { ko: '산책 중', en: 'Walking' };

      // 우정
      const friendshipData = friendships[guruId];
      const friendshipTier: FriendshipTier = getTier(guruId);
      const friendshipScore = friendshipData?.score ?? 0;

      // 말풍선 (useGuruVillage의 positions에서)
      const bubble = position.bubble;

      result.set(guruId, {
        guruId,
        position: { x: position.x, y: position.y },
        mood,
        moodEmoji,
        activity,
        activityEmoji,
        activityDescription,
        expression,
        friendshipTier,
        friendshipScore,
        bubble,
      });
    }

    return result;
  }, [
    village.positions,
    getMood,
    getMoodEmojiForGuru,
    getExpression,
    getActivity,
    friendships,
    getTier,
  ]);

  // ── 편의 메서드 ──────────────────────────────────────────────────────────

  /** 특정 구루 통합 상태 조회 */
  const getGuruFullState = useCallback(
    (guruId: string): GuruFullState | null => {
      return guruStates.get(guruId) ?? null;
    },
    [guruStates],
  );

  /**
   * 구루에게 말 걸기
   * - village.sendMessageToGuru: 실제 AI 응답 생성
   * - addInteraction: 우정 포인트 +2
   * - addContribution: 번영 포인트 +3 (guru_chat)
   */
  const chatWithGuru = useCallback(
    async (guruId: string, message: string) => {
      try {
        // 1. 실제 대화 전송 (AI 응답)
        await village.sendMessageToGuru(message);

        // 2. 우정 포인트 적립 (best-effort)
        addInteraction(guruId, 'chat').catch(() => {
          if (__DEV__) console.warn('[useVillageWorld] 우정 포인트 적립 실패 (무시)');
        });

        // 3. 번영 포인트 적립 (best-effort)
        addContribution('guru_chat').catch(() => {
          if (__DEV__) console.warn('[useVillageWorld] 번영 포인트 적립 실패 (무시)');
        });

        // 4. 분석 이벤트 기록 (best-effort)
        trackEvent('guru_chat', { guruId }).catch(() => {});

        if (__DEV__) {
          if (__DEV__) console.log(`[useVillageWorld] chatWithGuru: ${guruId} → "${message.slice(0, 30)}..."`);
        }
      } catch (err) {
        if (__DEV__) console.error('[useVillageWorld] chatWithGuru 에러:', err);
        // 에러를 throw하지 않음 — UI가 조용히 처리
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [village, addInteraction, addContribution],
  );

  // ── 로딩 상태 통합 ───────────────────────────────────────────────────────

  const isLoading = village.isLoading || Object.keys(friendships).length === 0;

  // ── 반환 ─────────────────────────────────────────────────────────────────

  return {
    // 날씨
    weather,
    clothingLevel,

    // 통합 구루 상태
    guruStates,
    getGuruFullState,

    // 액션
    chatWithGuru,
    openGuruChat: village.openGuruChat,
    closeGuruChat: village.closeGuruChat,

    // 마을 위치/대화
    positions: village.positions,
    conversations: village.conversations,
    userChatGuru: village.userChatGuru,
    userChatMessages: village.userChatMessages,
    isUserChatLoading: village.isUserChatLoading,
    userChatError: village.userChatError,
    sendMessageToGuru: village.sendMessageToGuru,
    retryLastMessage: village.retryLastMessage,

    // 번영도
    prosperityLevel,
    prosperityProgress,
    todayPoints,
    addContribution,

    // 편지
    letters,
    unreadCount,
    openLetter,

    // 우정
    friendships,
    addInteraction,
    getTopFriends,

    // 리액션
    activeReaction,
    triggerReaction,

    // 분석
    trackEvent,
    getEngagementScore,

    // 로딩
    isLoading,
  };
}
