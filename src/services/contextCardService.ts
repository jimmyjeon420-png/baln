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
import type {
  ContextCard,
  ContextCardSentiment,
  ContextCardWithImpact,
  UserContextImpact,
} from '../types/contextCard';

// Re-export types for convenience
export type {
  ContextCard,
  ContextCardSentiment,
  ContextCardWithImpact,
  UserContextImpact,
};

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
      if (__DEV__) console.log('[맥락 카드] 오늘의 카드 없음 → 최근 카드로 폴백');

      // 폴백: 가장 최근 맥락 카드 조회 (어제 또는 그 이전)
      const { data: latestCard, error: latestError } = await supabase
        .from('context_cards')
        .select('*')
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError || !latestCard) {
        if (__DEV__) console.log('[맥락 카드] 최근 카드도 없음 → null 반환 (데이터 없음)');
        return null;
      }

      // 최근 카드의 유저 영향도 조회
      const { data: latestImpact } = await supabase
        .from('user_context_impacts')
        .select('*')
        .eq('user_id', userId)
        .eq('context_card_id', latestCard.id)
        .maybeSingle();

      const fallbackCard: ContextCard = {
        id: latestCard.id,
        date: latestCard.date,
        headline: latestCard.headline,
        historical_context: latestCard.historical_context,
        macro_chain: latestCard.macro_chain || [],
        institutional_behavior: latestCard.institutional_behavior,
        sentiment: latestCard.sentiment as ContextCardSentiment,
        is_premium_only: latestCard.is_premium_only,
        market_data: latestCard.market_data || {},
        created_at: latestCard.created_at,
      };

      const fallbackImpact: UserContextImpact | null = latestImpact
        ? {
            id: latestImpact.id,
            user_id: latestImpact.user_id,
            context_card_id: latestImpact.context_card_id,
            percent_change: latestImpact.percent_change,
            health_score_change: latestImpact.health_score_change,
            impact_message: latestImpact.impact_message,
            created_at: latestImpact.created_at,
          }
        : null;

      if (__DEV__) console.log(`[맥락 카드] 최근 카드 폴백 성공 (${latestCard.date})`);
      return { card: fallbackCard, userImpact: fallbackImpact };
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

    if (__DEV__) console.log('[맥락 카드] 오늘의 카드 조회 성공 (빠른 경로)');
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
      if (__DEV__) console.log('[맥락 카드] 최근 카드 조회 실패 또는 데이터 없음');
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

    if (__DEV__) console.log(`[맥락 카드] 최근 ${days}일 카드 조회 성공 (${results.length}개)`);
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

// ============================================================================
// 유틸: DB 데이터 → UI 컴포넌트 데이터 변환
// ============================================================================

/**
 * DB 맥락 카드 → UI 컴포넌트 props 변환
 *
 * snake_case (DB) → camelCase (UI) 변환
 * null 처리 및 기본값 설정
 *
 * @param data - DB에서 조회한 ContextCardWithImpact
 * @returns ContextCardData (ContextCard.tsx prop)
 */
export function convertToContextCardData(
  data: ContextCardWithImpact
): {
  date: string;
  headline: string;
  historicalContext: string;
  macroChain: string[];
  institutionalBehavior: string;
  portfolioImpact: {
    percentChange: number;
    healthScoreChange: number;
    message: string;
    isCalculating: boolean;
  };
  sentiment: ContextCardSentiment;
  isPremiumContent: boolean;
} {
  const { card, userImpact } = data;

  return {
    date: card.date,
    headline: card.headline,
    historicalContext: card.historical_context || '역사적 맥락 데이터가 없습니다.',
    macroChain: card.macro_chain || [],
    institutionalBehavior: card.institutional_behavior || '기관 행동 데이터가 없습니다.',
    portfolioImpact: {
      percentChange: userImpact?.percent_change ?? 0,
      healthScoreChange: userImpact?.health_score_change ?? 0,
      message: userImpact?.impact_message || '포트폴리오 영향도를 분석 중입니다',
      isCalculating: userImpact != null && (userImpact.percent_change == null || userImpact.impact_message == null),
    },
    sentiment: card.sentiment,
    isPremiumContent: card.is_premium_only,
  };
}
