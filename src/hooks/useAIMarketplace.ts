/**
 * useAIMarketplace - AI 마켓플레이스 TanStack Query 훅
 * 각 AI 기능의 실행/조회를 화면에서 쉽게 사용
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  executeDeepDive,
  executeWhatIf,
  executeTaxReport,
  sendCFOMessage,
  getFeatureHistory,
  getChatMessages,
  getChatSessions,
} from '../services/aiMarketplace';
import type {
  AIFeatureType,
  DeepDiveInput,
  WhatIfInput,
  TaxReportInput,
  CFOChatInput,
} from '../types/marketplace';
import type { UserTier } from '../types/database';

// 쿼리 키
const CREDITS_KEY = ['credits', 'balance'];
const CREDIT_HISTORY_KEY = ['credits', 'history'];

/** AI 종목 딥다이브 실행 */
export function useDeepDive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, userTier }: { input: DeepDiveInput; userTier: UserTier }) =>
      executeDeepDive(input, userTier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      queryClient.invalidateQueries({ queryKey: CREDIT_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'history'] });
    },
  });
}

/** What-If 시뮬레이션 실행 */
export function useWhatIf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, userTier }: { input: WhatIfInput; userTier: UserTier }) =>
      executeWhatIf(input, userTier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      queryClient.invalidateQueries({ queryKey: CREDIT_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'history'] });
    },
  });
}

/** 세금 최적화 리포트 실행 */
export function useTaxReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, userTier }: { input: TaxReportInput; userTier: UserTier }) =>
      executeTaxReport(input, userTier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      queryClient.invalidateQueries({ queryKey: CREDIT_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'history'] });
    },
  });
}

/** AI 버핏과 티타임 채팅 메시지 전송 */
export function useAICFOChat(sessionId: string) {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: ({ input, userTier }: { input: CFOChatInput; userTier: UserTier }) =>
      sendCFOMessage(input, userTier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      queryClient.invalidateQueries({ queryKey: CREDIT_HISTORY_KEY });
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', sessionId] });
    },
  });

  const messages = useQuery({
    queryKey: ['chat', 'messages', sessionId],
    queryFn: () => getChatMessages(sessionId),
    enabled: !!sessionId,
  });

  return { sendMessage, messages };
}

/** 과거 분석 결과 조회 */
export function useFeatureHistory(featureType?: AIFeatureType, limit: number = 10) {
  return useQuery({
    queryKey: ['marketplace', 'history', featureType, limit],
    queryFn: () => getFeatureHistory(featureType, limit),
    staleTime: 1000 * 60, // 1분
  });
}

/** 채팅 세션 목록 조회 */
export function useChatSessions() {
  return useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: getChatSessions,
    staleTime: 1000 * 60,
  });
}
