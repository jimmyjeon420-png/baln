/**
 * AI Marketplace Orchestrator - 마켓플레이스 "지휘관"
 * 크레딧 차감 → AI 호출 → 결과 DB 저장을 통합 관리
 * AI 실패 시 자동 환불, 24시간 캐시 (Central Kitchen 패턴)
 */

import supabase from './supabase';
import { spendCredits, refundCredits, getDiscountedCost } from './creditService';
import {
  generateDeepDive,
  generateWhatIf,
  generateTaxReport,
  generateAICFOResponse,
} from './gemini';
import type {
  AIFeatureType,
  DeepDiveInput,
  DeepDiveResult,
  WhatIfInput,
  WhatIfResult,
  TaxReportInput,
  TaxReportResult,
  CFOChatInput,
} from '../types/marketplace';
import type { UserTier } from '../types/database';

// ============================================================================
// 유틸: 입력 해시 생성 (캐시 키)
// ============================================================================

function hashInput(input: any): string {
  const str = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 32-bit 정수 변환
  }
  return Math.abs(hash).toString(36);
}

// ============================================================================
// 유틸: 캐시 조회 (24시간 내 동일 입력)
// ============================================================================

async function getCachedResult<T>(
  userId: string,
  featureType: AIFeatureType,
  inputHash: string
): Promise<T | null> {
  const { data } = await supabase
    .from('ai_feature_results')
    .select('result')
    .eq('user_id', userId)
    .eq('feature_type', featureType)
    .eq('input_hash', inputHash)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data?.result as T | null;
}

// ============================================================================
// 유틸: 결과 DB 저장
// ============================================================================

async function saveResult(
  userId: string,
  featureType: AIFeatureType,
  inputHash: string,
  result: any,
  creditsCharged: number
): Promise<string> {
  const { data, error } = await supabase
    .from('ai_feature_results')
    .insert({
      user_id: userId,
      feature_type: featureType,
      input_hash: inputHash,
      result,
      credits_charged: creditsCharged,
    })
    .select('id')
    .single();

  if (error) console.error('결과 저장 실패:', error);
  return data?.id || '';
}

// ============================================================================
// AI 종목 딥다이브 실행
// ============================================================================

export async function executeDeepDive(
  input: DeepDiveInput,
  userTier: UserTier
): Promise<DeepDiveResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const inputHash = hashInput({ type: 'deep_dive', ticker: input.ticker });

  // 1. 캐시 확인 (24시간 내 동일 종목)
  const cached = await getCachedResult<DeepDiveResult>(user.id, 'deep_dive', inputHash);
  if (cached) return cached;

  // 2. 크레딧 차감 (1C/회)
  const { discountedCost } = getDiscountedCost('deep_dive', userTier);
  const spendResult = await spendCredits(discountedCost, 'deep_dive');
  if (!spendResult.success) {
    throw new Error(spendResult.errorMessage || '크레딧이 부족합니다');
  }

  // 3. AI 호출
  try {
    const result = await generateDeepDive(input);

    // 4. 결과 저장
    await saveResult(user.id, 'deep_dive', inputHash, result, discountedCost);

    return result;
  } catch (error) {
    // AI 실패 → 자동 환불
    await refundCredits(discountedCost, 'deep_dive', 'AI 분석 실패');
    throw error;
  }
}

// ============================================================================
// What-If 시뮬레이션 실행
// ============================================================================

export async function executeWhatIf(
  input: WhatIfInput,
  userTier: UserTier
): Promise<WhatIfResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const inputHash = hashInput({
    type: 'what_if',
    scenario: input.scenario,
    description: input.description,
    portfolioTickers: input.portfolio.map(p => p.ticker).sort(),
  });

  // 1. 캐시 확인
  const cached = await getCachedResult<WhatIfResult>(user.id, 'what_if', inputHash);
  if (cached) return cached;

  // 2. 크레딧 차감 (1C/회)
  const { discountedCost } = getDiscountedCost('what_if', userTier);
  const spendResult = await spendCredits(discountedCost, 'what_if');
  if (!spendResult.success) {
    throw new Error(spendResult.errorMessage || '크레딧이 부족합니다');
  }

  // 3. AI 호출
  try {
    const result = await generateWhatIf(input);
    await saveResult(user.id, 'what_if', inputHash, result, discountedCost);
    return result;
  } catch (error) {
    await refundCredits(discountedCost, 'what_if', 'AI 분석 실패');
    throw error;
  }
}

// ============================================================================
// 세금 최적화 리포트 실행
// ============================================================================

export async function executeTaxReport(
  input: TaxReportInput,
  userTier: UserTier
): Promise<TaxReportResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const inputHash = hashInput({
    type: 'tax_report',
    residency: input.residency,
    income: input.annualIncome,
    tickers: input.portfolio.map(p => p.ticker).sort(),
  });

  // 1. 캐시 확인
  const cached = await getCachedResult<TaxReportResult>(user.id, 'tax_report', inputHash);
  if (cached) return cached;

  // 2. 크레딧 차감 (1C/회)
  const { discountedCost } = getDiscountedCost('tax_report', userTier);
  const spendResult = await spendCredits(discountedCost, 'tax_report');
  if (!spendResult.success) {
    throw new Error(spendResult.errorMessage || '크레딧이 부족합니다');
  }

  // 3. AI 호출
  try {
    const result = await generateTaxReport(input);
    await saveResult(user.id, 'tax_report', inputHash, result, discountedCost);
    return result;
  } catch (error) {
    await refundCredits(discountedCost, 'tax_report', 'AI 분석 실패');
    throw error;
  }
}

// ============================================================================
// AI 버핏과 티타임 채팅 메시지 전송
// ============================================================================

export async function sendCFOMessage(
  input: CFOChatInput,
  userTier: UserTier
): Promise<{ userMessage: string; assistantMessage: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  // 1. 크레딧 차감 (1C/회)
  const { discountedCost } = getDiscountedCost('ai_cfo_chat', userTier);
  const spendResult = await spendCredits(discountedCost, 'ai_cfo_chat');
  if (!spendResult.success) {
    throw new Error(spendResult.errorMessage || '크레딧이 부족합니다');
  }

  // 2. 대화 히스토리 조회
  const { data: history } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('user_id', user.id)
    .eq('session_id', input.sessionId)
    .order('created_at', { ascending: true })
    .limit(20);

  // 3. 사용자 메시지 DB 저장
  await supabase.from('ai_chat_messages').insert({
    session_id: input.sessionId,
    user_id: user.id,
    role: 'user',
    content: input.message,
    credits_charged: discountedCost,
  });

  // 4. AI 응답 생성
  try {
    const response = await generateAICFOResponse(
      input,
      (history || []) as { role: string; content: string }[]
    );

    // 5. AI 응답 DB 저장
    await supabase.from('ai_chat_messages').insert({
      session_id: input.sessionId,
      user_id: user.id,
      role: 'assistant',
      content: response,
      credits_charged: 0,
    });

    return { userMessage: input.message, assistantMessage: response };
  } catch (error) {
    // AI 실패 → 자동 환불
    await refundCredits(discountedCost, 'ai_cfo_chat', 'AI 응답 실패');
    throw error;
  }
}

// ============================================================================
// 과거 분석 결과 조회
// ============================================================================

export async function getFeatureHistory(
  featureType?: AIFeatureType,
  limit: number = 10
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('ai_feature_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (featureType) {
      query = query.eq('feature_type', featureType);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[Marketplace] 히스토리 조회 실패 (빈 배열 반환):', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[Marketplace] 히스토리 조회 실패 (빈 배열 반환):', err);
    return [];
  }
}

// ============================================================================
// 채팅 세션 목록 조회
// ============================================================================

export async function getChatSessions(): Promise<
  { sessionId: string; lastMessage: string; createdAt: string }[]
> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 세션별 마지막 메시지 조회 (최근 10개 세션)
  const { data } = await supabase
    .from('ai_chat_messages')
    .select('session_id, content, created_at')
    .eq('user_id', user.id)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!data) return [];

  // 세션별 그룹핑 (최신 메시지 기준)
  const sessions = new Map<string, { lastMessage: string; createdAt: string }>();
  for (const msg of data) {
    if (!sessions.has(msg.session_id)) {
      sessions.set(msg.session_id, {
        lastMessage: msg.content,
        createdAt: msg.created_at,
      });
    }
  }

  return Array.from(sessions.entries())
    .map(([sessionId, info]) => ({ sessionId, ...info }))
    .slice(0, 10);
}

/** 특정 세션의 채팅 메시지 조회 */
export async function getChatMessages(sessionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
