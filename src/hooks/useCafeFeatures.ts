/**
 * useCafeFeatures — 구루 카페 기능 통합 훅
 *
 * 역할: "카페 운영 총괄" — 방문 구루, 등급, 동물 리액션을
 *       한 곳에서 묶어 라운지 탭에 제공
 * 비유: 카페 매니저가 손님 등급, 게스트 구루, 리액션 현황을 한 화면에서 보는 대시보드
 *
 * 사용처:
 * - app/(tabs)/lounge.tsx 라운지 탭에서 호출
 * - src/components/lounge/GuruVisitBanner.tsx 구루 방문 배너
 * - src/components/lounge/AnimalReactions.tsx 리액션 버튼
 * - src/components/lounge/CafeRankBadge.tsx 등급 배지
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTodayVisitingGurus,
  isGuruCurrentlyPresent,
  type VisitingGuru,
} from '../services/cafeGuruVisitService';
import {
  calculateCafeRank,
  ANIMAL_REACTIONS,
  type CafeRank,
  type AnimalReaction,
} from '../data/cafeConfig';

// =============================================================================
// AsyncStorage Keys
// =============================================================================

const STORAGE_KEY_REACTIONS = '@baln:cafe_reactions';
const STORAGE_KEY_POST_COUNT = '@baln:cafe_post_count';
const STORAGE_KEY_COMMENT_COUNT = '@baln:cafe_comment_count';

// =============================================================================
// 타입
// =============================================================================

/** 게시글별 리액션 맵 { postId: { reactionId: count } } */
type ReactionMap = Record<string, Record<string, number>>;

/** 사용자별 리액션 { postId: reactionId } */
type UserReactionMap = Record<string, string>;

export interface CafeFeaturesResult {
  /** 오늘 방문 예정/진행 중인 구루 목록 */
  visitingGurus: VisitingGuru[];
  /** 지금 카페에 있는 구루만 */
  presentGurus: VisitingGuru[];
  /** 특정 구루가 지금 카페에 있는지 확인 */
  checkGuruPresent: (guruId: string) => boolean;
  /** 사용자 카페 등급 */
  cafeRank: CafeRank;
  /** 사용 가능한 리액션 목록 */
  availableReactions: AnimalReaction[];
  /** 게시글에 리액션 추가/변경 */
  addReaction: (postId: string, reactionType: string) => void;
  /** 게시글의 리액션 집계 가져오기 */
  getReactions: (postId: string) => Record<string, number>;
  /** 사용자가 해당 게시글에 남긴 리액션 ID (없으면 null) */
  getUserReaction: (postId: string) => string | null;
  /** 사용자 게시글/댓글 수 갱신 */
  updateActivityCounts: (posts: number, comments: number) => void;
}

// =============================================================================
// 훅 구현
// =============================================================================

export function useCafeFeatures(): CafeFeaturesResult {
  // --- 구루 방문 ---
  const [visitingGurus, setVisitingGurus] = useState<VisitingGuru[]>([]);

  useEffect(() => {
    setVisitingGurus(getTodayVisitingGurus());
    // 5분마다 갱신 (방문 시간 경계 대응)
    const interval = setInterval(() => {
      setVisitingGurus(getTodayVisitingGurus());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const presentGurus = useMemo(
    () => visitingGurus.filter((g) => g.isPresent),
    [visitingGurus],
  );

  const checkGuruPresent = useCallback(
    (guruId: string) => isGuruCurrentlyPresent(guruId),
    [],
  );

  // --- 카페 등급 ---
  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [posts, comments] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_POST_COUNT),
          AsyncStorage.getItem(STORAGE_KEY_COMMENT_COUNT),
        ]);
        setPostCount(posts ? parseInt(posts, 10) : 0);
        setCommentCount(comments ? parseInt(comments, 10) : 0);
      } catch {
        // AsyncStorage 실패 시 기본값 유지
      }
    })();
  }, []);

  const cafeRank = useMemo(
    () => calculateCafeRank(postCount, commentCount),
    [postCount, commentCount],
  );

  const updateActivityCounts = useCallback(
    (posts: number, comments: number) => {
      setPostCount(posts);
      setCommentCount(comments);
      AsyncStorage.setItem(STORAGE_KEY_POST_COUNT, String(posts)).catch(() => {});
      AsyncStorage.setItem(STORAGE_KEY_COMMENT_COUNT, String(comments)).catch(() => {});
    },
    [],
  );

  // --- 동물 리액션 ---
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [userReactions, setUserReactions] = useState<UserReactionMap>({});

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_REACTIONS);
        if (stored) {
          const parsed = JSON.parse(stored);
          setReactions(parsed.reactions ?? {});
          setUserReactions(parsed.userReactions ?? {});
        }
      } catch {
        // 파싱 실패 시 기본값
      }
    })();
  }, []);

  /** 리액션 상태를 AsyncStorage에 저장 */
  const persistReactions = useCallback(
    (nextReactions: ReactionMap, nextUserReactions: UserReactionMap) => {
      AsyncStorage.setItem(
        STORAGE_KEY_REACTIONS,
        JSON.stringify({ reactions: nextReactions, userReactions: nextUserReactions }),
      ).catch(() => {});
    },
    [],
  );

  const addReaction = useCallback(
    (postId: string, reactionType: string) => {
      setReactions((prev) => {
        const postReactions = { ...(prev[postId] ?? {}) };
        const currentUserReaction = userReactions[postId];

        // 같은 리액션을 다시 누르면 토글 (제거)
        if (currentUserReaction === reactionType) {
          postReactions[reactionType] = Math.max(0, (postReactions[reactionType] ?? 0) - 1);
          const nextUserReactions = { ...userReactions };
          delete nextUserReactions[postId];
          setUserReactions(nextUserReactions);

          const nextReactions = { ...prev, [postId]: postReactions };
          persistReactions(nextReactions, nextUserReactions);
          return nextReactions;
        }

        // 기존 리액션이 있으면 감소
        if (currentUserReaction) {
          postReactions[currentUserReaction] = Math.max(
            0,
            (postReactions[currentUserReaction] ?? 0) - 1,
          );
        }

        // 새 리액션 증가
        postReactions[reactionType] = (postReactions[reactionType] ?? 0) + 1;

        const nextUserReactions = { ...userReactions, [postId]: reactionType };
        setUserReactions(nextUserReactions);

        const nextReactions = { ...prev, [postId]: postReactions };
        persistReactions(nextReactions, nextUserReactions);
        return nextReactions;
      });
    },
    [userReactions, persistReactions],
  );

  const getReactions = useCallback(
    (postId: string): Record<string, number> => reactions[postId] ?? {},
    [reactions],
  );

  const getUserReaction = useCallback(
    (postId: string): string | null => userReactions[postId] ?? null,
    [userReactions],
  );

  return {
    visitingGurus,
    presentGurus,
    checkGuruPresent,
    cafeRank,
    availableReactions: ANIMAL_REACTIONS,
    addReaction,
    getReactions,
    getUserReaction,
    updateActivityCounts,
  };
}
