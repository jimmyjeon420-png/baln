// ============================================================================
// 맥락 카드 서비스 (Context Card Service)
// Central Kitchen 패턴: DB 우선 조회, 라이브 폴백 없음
//
// 역할:
//   - 오늘의 맥락 카드 조회 (4겹 레이어)
//   - 유저별 포트폴리오 영향도 병합
//   - 최근 N일 맥락 카드 목록 조회
// ============================================================================

import supabase from './supabase';

// ============================================================================
// 타입 정의 (src/types/contextCard.ts가 생성되기 전 임시)
// ============================================================================

/** 맥락 카드 감정 상태 */
export type ContextCardSentiment = 'calm' | 'caution' | 'alert';

/** 맥락 카드 (context_cards 테이블) */
export interface ContextCard {
  id: string;
  date: string;                         // YYYY-MM-DD
  headline: string;                     // "오늘 당신의 자산이 -1.2% 빠진 이유"
  historical_context: string | null;    // 역사적 맥락 (레이어 1)
  macro_chain: string[];                // 거시경제 체인 (레이어 2)
  institutional_behavior: string | null; // 기관 행동 (레이어 3, Premium)
  sentiment: ContextCardSentiment;      // 심리 상태
  is_premium_only: boolean;             // 프리미엄 잠금 여부
  market_data: Record<string, any>;     // 추가 시장 데이터
  created_at: string;
}

/** 유저별 영향도 (user_context_impacts 테이블) */
export interface UserContextImpact {
  id: string;
  user_id: string;
  context_card_id: string;
  percent_change: number | null;        // 수익률 변화 (예: -1.2)
  health_score_change: number | null;   // 건강 점수 변화 (예: -5.0)
  impact_message: string | null;        // "당신의 포트폴리오는 -1.2% 영향"
  created_at: string;
}

/** 맥락 카드 + 유저 영향도 통합 결과 */
export interface ContextCardWithImpact {
  card: ContextCard;
  userImpact: UserContextImpact | null; // 영향도 없으면 null
}

// ============================================================================
// 핵심 함수: 맥락 카드 조회
// ============================================================================

/**
 * 오늘의 맥락 카드 + 유저 영향도 조회
 *
 * Central Kitchen 패턴:
 *   - DB 조회만 수행 (< 100ms)
 *   - 데이터 없으면 null 반환 (라이브 폴백 없음)
 *   - Edge Function이 매일 07:00에 생성한 카드를 조회
 *
 * @param userId - 유저 UUID
 * @returns ContextCardWithImpact 또는 null (데이터 없음)
 */
export async function getTodayContextCard(
  userId: string
): Promise<ContextCardWithImpact | null> {
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1단계: 오늘의 맥락 카드 조회
    const { data: cardData, error: cardError } = await supabase
      .from('context_cards')
      .select('*')
      .eq('date', today)
      .single();

    if (cardError || !cardData) {
      console.log('[맥락 카드] 오늘의 카드 없음 (Edge Function 실행 전 또는 생성 실패)');
      return null;
    }

    // 2단계: 유저별 영향도 조회
    const { data: impactData, error: impactError } = await supabase
      .from('user_context_impacts')
      .select('*')
      .eq('user_id', userId)
      .eq('context_card_id', cardData.id)
      .maybeSingle(); // 없어도 에러 아님

    if (impactError) {
      console.warn('[맥락 카드] 영향도 조회 실패 (카드만 반환):', impactError.message);
    }

    // 3단계: 맥락 카드 + 영향도 병합
    const card: ContextCard = {
      id: cardData.id,
      date: cardData.date,
      headline: cardData.headline,
      historical_context: cardData.historical_context,
      macro_chain: cardData.macro_chain || [],
      institutional_behavior: cardData.institutional_behavior,
      sentiment: cardData.sentiment as ContextCardSentiment,
      is_premium_only: cardData.is_premium_only,
      market_data: cardData.market_data || {},
      created_at: cardData.created_at,
    };

    const userImpact: UserContextImpact | null = impactData
      ? {
          id: impactData.id,
          user_id: impactData.user_id,
          context_card_id: impactData.context_card_id,
          percent_change: impactData.percent_change,
          health_score_change: impactData.health_score_change,
          impact_message: impactData.impact_message,
          created_at: impactData.created_at,
        }
      : null;

    console.log('[맥락 카드] 오늘의 카드 조회 성공 (빠른 경로)');
    return { card, userImpact };
  } catch (err) {
    console.error('[맥락 카드] 조회 실패:', err);
    return null;
  }
}

/**
 * 최근 N일 맥락 카드 목록 조회 (유저 영향도 포함)
 *
 * 사용처:
 *   - 예측 복기: 어제/그저께 카드 확인
 *   - 트렌드 분석: 최근 7일 맥락 히스토리
 *
 * @param userId - 유저 UUID
 * @param days - 조회할 일수 (기본 7일)
 * @returns ContextCardWithImpact 배열 (최신순)
 */
export async function getRecentContextCards(
  userId: string,
  days: number = 7
): Promise<ContextCardWithImpact[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  try {
    // 1단계: 최근 N일 맥락 카드 조회
    const { data: cardsData, error: cardsError } = await supabase
      .from('context_cards')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: false });

    if (cardsError || !cardsData) {
      console.log('[맥락 카드] 최근 카드 조회 실패 또는 데이터 없음');
      return [];
    }

    if (cardsData.length === 0) {
      return [];
    }

    // 2단계: 해당 카드들의 유저 영향도 조회
    const cardIds = cardsData.map((c) => c.id);
    const { data: impactsData, error: impactsError } = await supabase
      .from('user_context_impacts')
      .select('*')
      .eq('user_id', userId)
      .in('context_card_id', cardIds);

    if (impactsError) {
      console.warn('[맥락 카드] 영향도 조회 실패 (카드만 반환):', impactsError.message);
    }

    // 3단계: 카드별 영향도 매핑
    const impactsMap = new Map<string, UserContextImpact>();
    (impactsData || []).forEach((impact) => {
      impactsMap.set(impact.context_card_id, {
        id: impact.id,
        user_id: impact.user_id,
        context_card_id: impact.context_card_id,
        percent_change: impact.percent_change,
        health_score_change: impact.health_score_change,
        impact_message: impact.impact_message,
        created_at: impact.created_at,
      });
    });

    // 4단계: 최종 결과 병합
    const results: ContextCardWithImpact[] = cardsData.map((cardData) => {
      const card: ContextCard = {
        id: cardData.id,
        date: cardData.date,
        headline: cardData.headline,
        historical_context: cardData.historical_context,
        macro_chain: cardData.macro_chain || [],
        institutional_behavior: cardData.institutional_behavior,
        sentiment: cardData.sentiment as ContextCardSentiment,
        is_premium_only: cardData.is_premium_only,
        market_data: cardData.market_data || {},
        created_at: cardData.created_at,
      };

      const userImpact = impactsMap.get(card.id) || null;

      return { card, userImpact };
    });

    console.log(`[맥락 카드] 최근 ${days}일 카드 조회 성공 (${results.length}개)`);
    return results;
  } catch (err) {
    console.error('[맥락 카드] 최근 카드 조회 실패:', err);
    return [];
  }
}

/**
 * 빠른 심리 상태 조회 (위젯/배지용)
 *
 * 오늘의 맥락 카드 sentiment만 빠르게 조회
 * DB 조회만 하므로 초고속 (< 50ms)
 *
 * @returns { sentiment, headline } 또는 null
 */
export async function getQuickContextSentiment(): Promise<{
  sentiment: ContextCardSentiment;
  headline: string;
} | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('context_cards')
    .select('sentiment, headline')
    .eq('date', today)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    sentiment: data.sentiment as ContextCardSentiment,
    headline: data.headline,
  };
}
