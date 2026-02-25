/**
 * useGuruVillage — 구루 마을 상태 관리 훅
 *
 * 역할: "마을 시장(촌장)" — 구루들의 위치, 대화, 관계를 총괄
 * - 구루 위치 랜덤 배정 + 천천히 이동
 * - 대화 배치 로드 + 자동 재생
 * - 마음 맞는 구루끼리 그룹 (파벌 시스템)
 * - 사용자 말 걸기 처리
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  generateVillageConversations,
  getCachedBatch,
  askGuruDirectly,
} from '../services/villageConversationService';
import type { VillageBatch, VillageConversation, VillageMessage } from '../services/villageConversationService';

// ============================================================================
// 타입
// ============================================================================

export interface GuruPosition {
  guruId: string;
  x: number;           // 0~1 (화면 비율)
  y: number;           // 0~1 (화면 비율)
  targetX: number;     // 이동 목표 x
  targetY: number;     // 이동 목표 y
  /** 현재 표시 중인 말풍선 메시지 */
  bubble?: string;
  /** 말풍선 센티먼트 */
  bubbleSentiment?: string;
  /** 대화 상대 (누구 옆으로 가는 중인지) */
  talkingTo?: string;
}

/** 구루 파벌 (마음 맞는 애들끼리 그룹) */
export const GURU_FACTIONS: Record<string, string[]> = {
  // 가치투자파 — 같이 다님
  value: ['buffett', 'lynch', 'marks'],
  // 혁신파 — 같이 다님
  innovation: ['cathie_wood', 'musk', 'saylor'],
  // 매크로파 — 같이 다님
  macro: ['dalio', 'druckenmiller', 'rogers'],
  // 전통 금융파
  traditional: ['dimon', 'marks'],
};

/** 구루 간 관계 (서로 싸우거나 친한 관계) */
const GURU_RELATIONS: Record<string, Record<string, 'ally' | 'rival' | 'neutral'>> = {
  buffett: { cathie_wood: 'rival', saylor: 'rival', dalio: 'ally', lynch: 'ally' },
  cathie_wood: { buffett: 'rival', musk: 'ally', saylor: 'ally', dimon: 'rival' },
  saylor: { buffett: 'rival', dimon: 'rival', musk: 'ally', cathie_wood: 'ally' },
  dalio: { buffett: 'ally', rogers: 'ally', druckenmiller: 'ally' },
  musk: { cathie_wood: 'ally', saylor: 'ally', dimon: 'rival', marks: 'rival' },
  dimon: { saylor: 'rival', musk: 'rival', marks: 'ally', buffett: 'ally' },
};

// ============================================================================
// 기본 구루 8명 (화면에 표시할 수)
// ============================================================================

const VILLAGE_GURUS = ['buffett', 'dalio', 'cathie_wood', 'saylor', 'musk', 'dimon', 'druckenmiller', 'lynch', 'marks', 'rogers'];

// ============================================================================
// 훅
// ============================================================================

export function useGuruVillage() {
  const [positions, setPositions] = useState<GuruPosition[]>([]);
  const [conversations, setConversations] = useState<VillageConversation[]>([]);
  const [currentConvIndex, setCurrentConvIndex] = useState(0);
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userChatGuru, setUserChatGuru] = useState<string | null>(null);
  const [userChatMessages, setUserChatMessages] = useState<VillageMessage[]>([]);
  const [isUserChatLoading, setIsUserChatLoading] = useState(false);
  const convTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 초기 위치 배정 (파벌별 그룹으로)
  const initPositions = useCallback(() => {
    const pos: GuruPosition[] = VILLAGE_GURUS.map((guruId, i) => {
      // 파벌 찾기
      const factionEntry = Object.entries(GURU_FACTIONS).find(([, members]) => members.includes(guruId));
      const factionIndex = factionEntry
        ? Object.keys(GURU_FACTIONS).indexOf(factionEntry[0])
        : i;

      // 파벌별 기본 위치 (4구역으로 나눔)
      const zoneX = (factionIndex % 2) * 0.45 + 0.1;
      const zoneY = Math.floor(factionIndex / 2) * 0.3 + 0.2;

      // 파벌 내 개별 오프셋
      const memberIndex = factionEntry ? factionEntry[1].indexOf(guruId) : 0;
      const offsetX = (memberIndex * 0.12) - 0.06;
      const offsetY = (memberIndex % 2) * 0.08;

      const x = Math.max(0.05, Math.min(0.85, zoneX + offsetX + (Math.random() * 0.1 - 0.05)));
      const y = Math.max(0.15, Math.min(0.65, zoneY + offsetY + (Math.random() * 0.08 - 0.04)));

      return { guruId, x, y, targetX: x, targetY: y };
    });
    setPositions(pos);
  }, []);

  // 대화 배치 로드
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      // 캐시 먼저
      let batch = await getCachedBatch();
      if (!batch) {
        batch = await generateVillageConversations();
      }
      setConversations(batch.conversations);
      setCurrentConvIndex(0);
      setCurrentMsgIndex(0);
    } catch {
      // 폴백은 서비스에서 처리됨
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기화
  useEffect(() => {
    initPositions();
    loadConversations();
  }, [initPositions, loadConversations]);

  // 구루 위치 천천히 이동 (3초마다 약간씩)
  useEffect(() => {
    moveTimerRef.current = setInterval(() => {
      setPositions(prev => prev.map(p => {
        // 대화 상대가 있으면 그쪽으로 이동
        if (p.talkingTo) {
          const partner = prev.find(pp => pp.guruId === p.talkingTo);
          if (partner) {
            const dx = partner.x - p.x;
            const dy = partner.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.12) {
              return {
                ...p,
                x: p.x + dx * 0.05,
                y: p.y + dy * 0.05,
              };
            }
          }
        }

        // 랜덤 산책 (아주 느리게)
        const newX = p.x + (Math.random() - 0.5) * 0.02;
        const newY = p.y + (Math.random() - 0.5) * 0.015;
        return {
          ...p,
          x: Math.max(0.05, Math.min(0.85, newX)),
          y: Math.max(0.15, Math.min(0.65, newY)),
        };
      }));
    }, 3000);

    return () => {
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
    };
  }, []);

  // 대화 자동 재생 (8초마다 다음 메시지)
  useEffect(() => {
    if (conversations.length === 0) return;

    const playNextMessage = () => {
      const conv = conversations[currentConvIndex];
      if (!conv) {
        // 모든 대화 끝 → 처음으로 또는 새 배치 요청
        setCurrentConvIndex(0);
        setCurrentMsgIndex(0);
        return;
      }

      const msg = conv.messages[currentMsgIndex];
      if (!msg) {
        // 현재 대화 끝 → 다음 대화
        setCurrentConvIndex(prev => (prev + 1) % conversations.length);
        setCurrentMsgIndex(0);
        return;
      }

      // 말풍선 표시
      setPositions(prev => prev.map(p => {
        if (p.guruId === msg.speaker) {
          return {
            ...p,
            bubble: msg.message,
            bubbleSentiment: msg.sentiment,
            talkingTo: msg.replyTo || undefined,
          };
        }
        // 이전 말풍선 제거 (2개 이전 것만)
        if (p.bubble && p.guruId !== msg.replyTo) {
          return { ...p, bubble: undefined, bubbleSentiment: undefined, talkingTo: undefined };
        }
        return p;
      }));

      setCurrentMsgIndex(prev => prev + 1);
    };

    convTimerRef.current = setTimeout(playNextMessage, 6000 + Math.random() * 4000);

    return () => {
      if (convTimerRef.current) clearTimeout(convTimerRef.current);
    };
  }, [conversations, currentConvIndex, currentMsgIndex]);

  // 사용자가 구루를 탭했을 때
  const openGuruChat = useCallback((guruId: string) => {
    setUserChatGuru(guruId);
    setUserChatMessages([]);
  }, []);

  const closeGuruChat = useCallback(() => {
    setUserChatGuru(null);
    setUserChatMessages([]);
  }, []);

  // 사용자가 구루에게 질문
  const sendMessageToGuru = useCallback(async (question: string) => {
    if (!userChatGuru) return;
    setIsUserChatLoading(true);

    // 사용자 메시지 추가
    const userMsg: VillageMessage = {
      id: `user_${Date.now()}`,
      speaker: 'user',
      message: question,
      sentiment: 'NEUTRAL',
    };
    setUserChatMessages(prev => [...prev, userMsg]);

    try {
      const reply = await askGuruDirectly(userChatGuru, question);
      setUserChatMessages(prev => [...prev, reply]);
    } catch {
      // 에러 처리는 서비스에서
    } finally {
      setIsUserChatLoading(false);
    }
  }, [userChatGuru]);

  // 새 대화 생성 요청 (수동 리프레시)
  const refreshConversations = useCallback(async (marketContext?: string) => {
    setIsLoading(true);
    try {
      const batch = await generateVillageConversations(marketContext);
      setConversations(batch.conversations);
      setCurrentConvIndex(0);
      setCurrentMsgIndex(0);
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 관계 조회
  const getRelation = useCallback((guru1: string, guru2: string): 'ally' | 'rival' | 'neutral' => {
    return GURU_RELATIONS[guru1]?.[guru2] || GURU_RELATIONS[guru2]?.[guru1] || 'neutral';
  }, []);

  return {
    positions,
    isLoading,
    conversations,
    // 사용자 채팅
    userChatGuru,
    userChatMessages,
    isUserChatLoading,
    openGuruChat,
    closeGuruChat,
    sendMessageToGuru,
    // 리프레시
    refreshConversations,
    // 관계
    getRelation,
  };
}
