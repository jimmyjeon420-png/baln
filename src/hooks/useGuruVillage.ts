/**
 * useGuruVillage — 구루 마을 상태 관리 훅
 *
 * 역할: "마을 시장(촌장)" — 구루들의 위치, 대화, 관계를 총괄
 * - 10명 구루 항상 전원 등장 (파벌별 구역 배치)
 * - 대화 배치 로드 + 빠른 자동 재생 (3~5초)
 * - 동시에 2~3쌍 대화 유지 (이전 말풍선 보존)
 * - 파벌 동료끼리 자연스럽게 모여다님
 * - 대화 없는 구루 혼잣말/리액션 표시
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  generateVillageConversations,
  getCachedBatch,
  askGuruDirectly,
} from '../services/villageConversationService';
import type { VillageBatch, VillageConversation, VillageMessage } from '../services/villageConversationService';
import { VILLAGE_ZONES, getZonesForGuru } from '../data/villageZoneConfig';
import { getRandomQuote } from '../data/guruQuoteBank';

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
  /** 말풍선 생성 시각 (ms) — 자동 소멸용 */
  bubbleCreatedAt?: number;
  /** 리액션 이모지 (근처 구루 말풍선에 대한 반응) */
  reaction?: string;
  /** 리액션 생성 시각 (ms) — 3초 후 자동 소멸 */
  reactionCreatedAt?: number;
}

interface UseGuruVillageOptions {
  /** full: 마을 탭 전체 화면 / compact: 광장 미니 카드 */
  layoutMode?: 'full' | 'compact';
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
export const GURU_RELATIONS: Record<string, Record<string, 'ally' | 'rival' | 'neutral'>> = {
  buffett: { cathie_wood: 'rival', saylor: 'rival', dalio: 'ally', lynch: 'ally' },
  cathie_wood: { buffett: 'rival', musk: 'ally', saylor: 'ally', dimon: 'rival' },
  saylor: { buffett: 'rival', dimon: 'rival', musk: 'ally', cathie_wood: 'ally' },
  dalio: { buffett: 'ally', rogers: 'ally', druckenmiller: 'ally' },
  musk: { cathie_wood: 'ally', saylor: 'ally', dimon: 'rival', marks: 'rival' },
  dimon: { saylor: 'rival', musk: 'rival', marks: 'ally', buffett: 'ally' },
};

/** 구루별 파벌 역산 맵 */
const GURU_TO_FACTION: Record<string, string> = {};
Object.entries(GURU_FACTIONS).forEach(([faction, members]) => {
  members.forEach(m => { GURU_TO_FACTION[m] = faction; });
});

// ============================================================================
// 전체 10명 구루 목록
// ============================================================================

const ALL_VILLAGE_GURUS = [
  'buffett', 'dalio', 'cathie_wood', 'saylor', 'musk',
  'dimon', 'druckenmiller', 'lynch', 'marks', 'rogers',
];

// ============================================================================
// 혼잣말/리액션 — 명언 DB에서 랜덤 선택 (구루당 8~10개 풀)
// ============================================================================

/** 명언이 너무 길면 말풍선에 맞게 자르기 (최대 30자) */
function trimQuoteForBubble(text: string, maxLen = 30): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026'; // '…'
}

/** 말풍선 최대 유지 시간 (ms) — 한 명만 말하므로 다음 발화 전까지 유지 */
const BUBBLE_LIFETIME_MS = 5000;

/** 리액션 이모지 자동 소멸 시간 (ms) */
const REACTION_LIFETIME_MS = 3000;

/** 관계별 리액션 이모지 풀 */
const REACTION_EMOJIS: Record<'ally' | 'rival' | 'neutral', string[]> = {
  ally: ['👍', '💡', '😊', '❤️', '🤝', '💪'],
  rival: ['🙄', '😤', '🤨', '❌', '😒', '💢'],
  neutral: ['🤔', '👀', '❓', '😶', '🧐'],
};

/** 인사 리액션 (거리 0.04~0.08 도달 시) */
const GREETING_EMOJIS: Record<'ally' | 'rival' | 'neutral', string> = {
  ally: '👋',
  rival: '😏',
  neutral: '👋',
};

const LAYOUT_BOUNDS: Record<'full' | 'compact', { minX: number; maxX: number; minY: number; maxY: number }> = {
  full: {
    minX: 0.07,
    maxX: 0.92,
    minY: 0.5,
    maxY: 0.88,
  },
  compact: {
    minX: 0.08,
    maxX: 0.9,
    minY: 0.2,
    maxY: 0.58,
  },
};

const LAYOUT_KEEP_OUT_ZONES: Record<'full' | 'compact', Array<{ x: number; y: number; r: number }>> = {
  full: [
    { x: 0.5, y: 0.2, r: 0.18 },  // 집/메인 오브젝트(텐트) 주변
    { x: 0.5, y: 0.96, r: 0.08 }, // 탭바 바로 위 과밀 방지
  ],
  compact: [
    { x: 0.5, y: 0.78, r: 0.14 },
  ],
};

// ============================================================================
// 훅
// ============================================================================

export function useGuruVillage(options: UseGuruVillageOptions | boolean = false) {
  const layoutMode = typeof options === 'boolean'
    ? 'full'
    : (options.layoutMode ?? 'full');
  const bounds = useMemo(() => LAYOUT_BOUNDS[layoutMode], [layoutMode]);
  const keepOutZones = useMemo(() => LAYOUT_KEEP_OUT_ZONES[layoutMode], [layoutMode]);

  // ★ 항상 10명 전원 등장
  const visibleGuruIds = useMemo(() => [...ALL_VILLAGE_GURUS], []);
  const isFullVillage = true;

  const [positions, setPositions] = useState<GuruPosition[]>([]);
  const [conversations, setConversations] = useState<VillageConversation[]>([]);
  const [currentConvIndex, setCurrentConvIndex] = useState(0);
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userChatGuru, setUserChatGuru] = useState<string | null>(null);
  const [userChatMessages, setUserChatMessages] = useState<VillageMessage[]>([]);
  const [isUserChatLoading, setIsUserChatLoading] = useState(false);
  const [userChatError, setUserChatError] = useState(false);
  const lastQuestionRef = useRef<string | null>(null);
  const convTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 직전 발화 구루 — 연속 발화 방지용 */
  const lastSpeakerRef = useRef<string | null>(null);

  // 파벌별 구역 중심점 — 하드코딩 (4구역 분산 보장)
  // full 모드(마을 탭)는 "하단부터 분포"를 기본으로 두고 상단 오브젝트와 겹침을 피한다.
  const ZONE_CENTERS: Record<string, { x: number; y: number }> = useMemo(() => {
    const isFull = layoutMode === 'full';
    return {
      value:       { x: 0.2, y: isFull ? 0.64 : 0.38 },  // 좌중하단 — 가치
      innovation:  { x: 0.78, y: isFull ? 0.64 : 0.38 }, // 우중하단 — 혁신
      macro:       { x: 0.2, y: isFull ? 0.82 : 0.58 },  // 좌하단 — 매크로
      traditional: { x: 0.78, y: isFull ? 0.82 : 0.58 }, // 우하단 — 전통금융
    };
  }, [layoutMode]);

  const pushOutFromKeepOutZones = useCallback((x: number, y: number) => {
    let nx = x;
    let ny = y;
    for (const zone of keepOutZones) {
      const dx = nx - zone.x;
      const dy = ny - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < zone.r && dist > 0.0001) {
        const push = (zone.r - dist) * 0.25;
        nx += (dx / dist) * push;
        ny += (dy / dist) * push;
      }
    }
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, nx)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, ny)),
    };
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, keepOutZones]);

  const getAnchorForGuru = useCallback((guruId: string) => {
    const factionEntry = Object.entries(GURU_FACTIONS).find(([, members]) => members.includes(guruId));
    const factionName = factionEntry?.[0] || 'value';
    const zone = ZONE_CENTERS[factionName] || ZONE_CENTERS.value;
    const memberIndex = factionEntry ? factionEntry[1].indexOf(guruId) : 0;
    const memberCount = Math.max(1, factionEntry?.[1].length ?? 1);
    const angle = (2 * Math.PI * memberIndex) / memberCount - Math.PI / 2;
    const radius = layoutMode === 'full' ? 0.09 : 0.075;
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, zone.x + Math.cos(angle) * radius)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, zone.y + Math.sin(angle) * radius * 0.7)),
    };
  }, [ZONE_CENTERS, bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, layoutMode]);

  // 초기 위치 배정 — 파벌별 구역 + 삼각형 배치로 겹침 방지
  const initPositions = useCallback(() => {
    const pos: GuruPosition[] = ALL_VILLAGE_GURUS.map((guruId) => {
      const anchor = getAnchorForGuru(guruId);
      const rawX = Math.max(bounds.minX, Math.min(bounds.maxX, anchor.x + (Math.random() - 0.5) * 0.02));
      const rawY = Math.max(bounds.minY, Math.min(bounds.maxY, anchor.y + (Math.random() - 0.5) * 0.02));
      const adjusted = pushOutFromKeepOutZones(rawX, rawY);

      return { guruId, x: adjusted.x, y: adjusted.y, targetX: adjusted.x, targetY: adjusted.y };
    });

    setPositions(pos);
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, getAnchorForGuru, pushOutFromKeepOutZones]);

  // 대화 배치 로드
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      // 캐시 먼저
      let batch: VillageBatch | null = await getCachedBatch();
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

  // 구루 위치 이동 (3초마다)
  // - 대화 상대에게 빠르게 다가감
  // - 같은 파벌 동료끼리 명확하게 모여다님
  // - 너무 가까운 캐릭터는 반발력으로 밀어냄
  // - 랜덤 산책으로 자연스러운 NPC 느낌
  useEffect(() => {
    moveTimerRef.current = setInterval(() => {
      setPositions(prev => prev.map(p => {
        const now = Date.now();
        // 만료된 리액션 제거
        if (p.reaction && p.reactionCreatedAt && (now - p.reactionCreatedAt > REACTION_LIFETIME_MS)) {
          p = { ...p, reaction: undefined, reactionCreatedAt: undefined };
        }

        let newX = p.x;
        let newY = p.y;

        // ① 대화 상대에게 빠르게 접근
        if (p.talkingTo) {
          const partner = prev.find(pp => pp.guruId === p.talkingTo);
          if (partner) {
            const dx = partner.x - p.x;
            const dy = partner.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.1) {
              return {
                ...p,
                x: Math.max(bounds.minX, Math.min(bounds.maxX, p.x + dx * 0.1)),
                y: Math.max(bounds.minY, Math.min(bounds.maxY, p.y + dy * 0.1)),
              };
            }
            if (dist <= 0.08 && dist >= 0.04 && !p.reaction) {
              const relation = GURU_RELATIONS[p.guruId]?.[partner.guruId]
                || GURU_RELATIONS[partner.guruId]?.[p.guruId]
                || 'neutral';
              return { ...p, reaction: GREETING_EMOJIS[relation], reactionCreatedAt: now };
            }
          }
        }

        // ② 파벌 동료 중심점으로 끌림 (50% 확률, 강도 0.04)
        const myFaction = GURU_TO_FACTION[p.guruId];
        if (myFaction && Math.random() < 0.5) {
          const allies = prev.filter(
            pp => pp.guruId !== p.guruId && GURU_TO_FACTION[pp.guruId] === myFaction
          );
          if (allies.length > 0) {
            const cx = allies.reduce((s, a) => s + a.x, 0) / allies.length;
            const cy = allies.reduce((s, a) => s + a.y, 0) / allies.length;
            newX += (cx - p.x) * 0.04;
            newY += (cy - p.y) * 0.04;
          }
        }

        // ②-2 구루별 앵커 포인트로 약하게 회귀 (중앙 몰림 완화)
        const anchor = getAnchorForGuru(p.guruId);
        newX += (anchor.x - p.x) * 0.035;
        newY += (anchor.y - p.y) * 0.035;

        // ③ 겹침 방지 — 너무 가까운 캐릭터를 밀어냄 (거리 0.12 이내)
        for (const other of prev) {
          if (other.guruId === p.guruId) continue;
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.12 && dist > 0.001) {
            // 가까울수록 강하게 밀어냄
            const force = (0.12 - dist) * 0.22;
            newX += (dx / dist) * force;
            newY += (dy / dist) * force;
          }
        }

        // ④ 랜덤 산책 (보폭 축소 — 겹침 및 하단 몰림 완화)
        newX += (Math.random() - 0.5) * 0.016;
        newY += (Math.random() - 0.5) * 0.012;

        const adjusted = pushOutFromKeepOutZones(newX, newY);

        return {
          ...p,
          x: adjusted.x,
          y: adjusted.y,
        };
      }));
    }, 3000);

    return () => {
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
    };
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, getAnchorForGuru, pushOutFromKeepOutZones]);

  // 대화 자동 재생 (5~7초마다 다음 메시지)
  // ★ 한 번에 한 명만 말함 — 새 발화 시 기존 말풍선 전부 제거
  // ★ 직전 발화자는 건너뜀 (연속 발화 방지)
  // ★ 대화 끝 → 즉시 다음 대화로 이어감 (끊김 방지)
  useEffect(() => {
    if (conversations.length === 0) return;

    const playNextMessage = () => {
      // 유효한 대화/메시지 찾기 (끊김 방지: 빈 대화 건너뛰기)
      let convIdx = currentConvIndex;
      let msgIdx = currentMsgIndex;
      let attempts = 0;
      let skippedSameSpeaker = false;

      while (attempts < conversations.length * 3) {
        const conv = conversations[convIdx];
        if (conv && conv.messages && conv.messages[msgIdx]) {
          // 직전 발화자와 같으면 건너뛰기 (연속 발화 방지)
          if (conv.messages[msgIdx].speaker === lastSpeakerRef.current && !skippedSameSpeaker) {
            skippedSameSpeaker = true;
            // 같은 대화 내 다음 메시지 또는 다음 대화로
            const nextMsg = msgIdx + 1;
            if (conv.messages[nextMsg]) {
              msgIdx = nextMsg;
            } else {
              convIdx = (convIdx + 1) % conversations.length;
              msgIdx = 0;
            }
            attempts++;
            continue;
          }
          break;
        }
        // 이 대화는 끝남/없음 → 다음 대화 첫 메시지로
        convIdx = (convIdx + 1) % conversations.length;
        msgIdx = 0;
        attempts++;
      }

      const conv = conversations[convIdx];
      if (!conv || !conv.messages[msgIdx]) {
        // 모든 대화 소진 → 강제 리셋
        setCurrentConvIndex(0);
        setCurrentMsgIndex(0);
        lastSpeakerRef.current = null;
        return;
      }

      // 인덱스가 변경되었으면 상태 업데이트
      if (convIdx !== currentConvIndex) {
        setCurrentConvIndex(convIdx);
      }
      if (msgIdx !== currentMsgIndex) {
        setCurrentMsgIndex(msgIdx);
      }

      const msg = conv.messages[msgIdx];
      lastSpeakerRef.current = msg.speaker;

      const now = Date.now();

      // ★ 한 명만 말하기: 기존 말풍선 전부 제거 → 새 발화자만 표시
      setPositions(prev => {
        const speakerPos = prev.find(pp => pp.guruId === msg.speaker);

        return prev.map(p => {
          if (p.guruId === msg.speaker) {
            return {
              ...p,
              bubble: msg.message,
              bubbleSentiment: msg.sentiment,
              talkingTo: msg.replyTo || undefined,
              bubbleCreatedAt: now,
              // 리액션 제거 (말하는 중이니)
              reaction: undefined,
              reactionCreatedAt: undefined,
            };
          }

          // ★ 다른 구루: 말풍선 즉시 제거 (한 명만 보이게)
          let updated: typeof p = {
            ...p,
            bubble: undefined,
            bubbleSentiment: undefined,
            talkingTo: undefined,
            bubbleCreatedAt: undefined,
          };

          // 만료된 리액션 제거
          if (updated.reaction && updated.reactionCreatedAt && (now - updated.reactionCreatedAt > REACTION_LIFETIME_MS)) {
            updated = { ...updated, reaction: undefined, reactionCreatedAt: undefined };
          }

          // ★ 리액션 이모지: 가까운 구루 1명만 (30% 확률, 너무 많으면 산만)
          if (speakerPos && !updated.reaction && Math.random() < 0.3) {
            const dx = speakerPos.x - updated.x;
            const dy = speakerPos.y - updated.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.20) {
              const relation = GURU_RELATIONS[updated.guruId]?.[msg.speaker]
                || GURU_RELATIONS[msg.speaker]?.[updated.guruId]
                || 'neutral';
              const pool = REACTION_EMOJIS[relation];
              const emoji = pool[Math.floor(Math.random() * pool.length)];
              updated = { ...updated, reaction: emoji, reactionCreatedAt: now };
            }
          }

          return updated;
        });
      });

      // 다음 메시지 인덱스 설정
      const nextMsgIdx = msgIdx + 1;
      if (conv.messages[nextMsgIdx]) {
        setCurrentMsgIndex(nextMsgIdx);
      } else {
        setCurrentConvIndex((convIdx + 1) % conversations.length);
        setCurrentMsgIndex(0);
      }
    };

    // 5~7초 간격 (한 명씩이니 충분히 읽을 시간)
    convTimerRef.current = setTimeout(playNextMessage, 5000 + Math.random() * 2000);

    return () => {
      if (convTimerRef.current) clearTimeout(convTimerRef.current);
    };
  }, [conversations, currentConvIndex, currentMsgIndex]);

  // 혼잣말 — 아무도 말 안 할 때 1명만 (15초마다, 직전 발화자 제외)
  // ★ 명언 DB에서 랜덤 선택 (구루당 8~10개 풀 → 매번 다른 혼잣말)
  useEffect(() => {
    idleTimerRef.current = setInterval(() => {
      setPositions(prev => {
        // ★ 누군가 이미 말하고 있으면 혼잣말 안 함 (한 명만 원칙)
        const anyoneTalking = prev.some(p => p.bubble);
        if (anyoneTalking) return prev;

        // 직전 발화자 제외하고 후보 선택
        const candidates = prev.filter(p => p.guruId !== lastSpeakerRef.current);
        if (candidates.length === 0) return prev;

        // 1명만 선택
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];

        // 명언 DB에서 해당 구루의 랜덤 명언 가져오기
        const quoteObj = getRandomQuote(chosen.guruId);
        const line = trimQuoteForBubble(quoteObj.quote);

        lastSpeakerRef.current = chosen.guruId;

        return prev.map(p => {
          if (p.guruId !== chosen.guruId) return p;
          return {
            ...p,
            bubble: line,
            bubbleCreatedAt: Date.now(),
            talkingTo: undefined,
          };
        });
      });
    }, 15000);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, []);

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
    setUserChatError(false);
    lastQuestionRef.current = question;

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
      // 폴백 메시지인지 확인 (id에 _fallback 포함)
      if (reply.id.includes('_fallback')) {
        setUserChatError(true);
      }
      setUserChatMessages(prev => [...prev, reply]);
    } catch {
      setUserChatError(true);
    } finally {
      setIsUserChatLoading(false);
    }
  }, [userChatGuru]);

  const retryLastMessage = useCallback(() => {
    if (!lastQuestionRef.current || !userChatGuru) return;
    // 마지막 폴백 메시지 제거 후 재시도
    setUserChatMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.id.includes('_fallback')) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    setUserChatError(false);
    sendMessageToGuru(lastQuestionRef.current);
  }, [userChatGuru, sendMessageToGuru]);

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
    // 노출 구루 정보
    visibleGuruIds,
    isFullVillage,
    // 사용자 채팅
    userChatGuru,
    userChatMessages,
    isUserChatLoading,
    userChatError,
    openGuruChat,
    closeGuruChat,
    sendMessageToGuru,
    retryLastMessage,
    // 리프레시
    refreshConversations,
    // 관계
    getRelation,
  };
}
