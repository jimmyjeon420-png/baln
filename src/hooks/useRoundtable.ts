/**
 * useRoundtable — 라운드테이블 토론 상태 관리 훅
 *
 * 역할: "회의 진행자" — 세션 생성, 턴 재생 진행, 사용자 질문 처리
 * - 토론 시작 → Gemini 호출 → 턴별 순차 재생
 * - 사용자 질문 → 추가 Gemini 호출 → 답변 표시
 * - 히스토리 관리
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { RoundtableSession, UserQuestion } from '../types/roundtable';
import {
  generateRoundtable,
  askFollowUp,
  getRecentSessions,
} from '../services/roundtableService';

interface UseRoundtableReturn {
  /** 현재 세션 */
  session: RoundtableSession | null;
  /** 현재 재생 중인 턴 인덱스 (-1이면 미시작) */
  currentTurnIndex: number;
  /** Gemini 호출 중 */
  isGenerating: boolean;
  /** 턴 재생 중 (타자기 효과 진행 중) */
  isPlaying: boolean;
  /** 토론 시작 */
  startRoundtable: (topic: string, participantIds: string[]) => Promise<void>;
  /** 기존 세션 로드 */
  loadSession: (session: RoundtableSession) => void;
  /** 사용자 질문 */
  askQuestion: (question: string) => Promise<void>;
  /** 현재 턴 타자기 완료 → 다음 턴으로 */
  advanceToNextTurn: () => void;
  /** 최근 세션 히스토리 */
  recentSessions: RoundtableSession[];
  /** 히스토리 로드 */
  loadRecentSessions: () => Promise<void>;
  /** 에러 메시지 */
  error: string | null;
  /** 추가 질문 중 */
  isAskingQuestion: boolean;
}

export function useRoundtable(): UseRoundtableReturn {
  const [session, setSession] = useState<RoundtableSession | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(-1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RoundtableSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 히스토리 로드
  const loadRecentSessions = useCallback(async () => {
    const sessions = await getRecentSessions();
    setRecentSessions(sessions);
  }, []);

  // 자동 로드
  useEffect(() => {
    loadRecentSessions();
  }, [loadRecentSessions]);

  // 토론 시작
  const startRoundtable = useCallback(async (topic: string, participantIds: string[]) => {
    setError(null);
    setIsGenerating(true);
    setSession(null);
    setCurrentTurnIndex(-1);

    try {
      const newSession = await generateRoundtable(topic, participantIds);
      setSession(newSession);
      // 첫 턴 재생 시작
      setCurrentTurnIndex(0);
      setIsPlaying(true);
    } catch (err: any) {
      setError(err.message || '토론 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // 기존 세션 로드 (히스토리에서)
  const loadSession = useCallback((existingSession: RoundtableSession) => {
    setSession(existingSession);
    setCurrentTurnIndex(existingSession.turns.length - 1);
    setIsPlaying(false);
    setError(null);
  }, []);

  // 다음 턴으로 진행 (타자기 효과 완료 콜백)
  const advanceToNextTurn = useCallback(() => {
    if (!session) return;
    const totalTurns = session.turns.length;
    setCurrentTurnIndex(prev => {
      const next = prev + 1;
      if (next >= totalTurns) {
        setIsPlaying(false);
        return prev;
      }
      return next;
    });
  }, [session]);

  // 사용자 질문
  const askQuestion = useCallback(async (question: string) => {
    if (!session) return;
    setError(null);
    setIsAskingQuestion(true);

    try {
      const userQ = await askFollowUp(session, question);
      // 세션 업데이트
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          userQuestions: [...prev.userQuestions, userQ],
        };
      });
    } catch (err: any) {
      setError(err.message || '질문 처리에 실패했습니다.');
    } finally {
      setIsAskingQuestion(false);
    }
  }, [session]);

  // cleanup
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  return {
    session,
    currentTurnIndex,
    isGenerating,
    isPlaying,
    startRoundtable,
    loadSession,
    askQuestion,
    advanceToNextTurn,
    recentSessions,
    loadRecentSessions,
    error,
    isAskingQuestion,
  };
}
