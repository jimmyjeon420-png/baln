// ============================================================================
// 맥락 카드 서비스 (Context Card Service)
// Central Kitchen 패턴: DB 우선 조회 → AsyncStorage 캐시 → 정적 폴백
//
// 역할:
//   - 오늘의 맥락 카드 조회 (4겹 레이어)
//   - 유저별 포트폴리오 영향도 병합
//   - 최근 N일 맥락 카드 목록 조회
//   - AsyncStorage 캐시로 오프라인/에러 시에도 의미 있는 카드 표시
//   - 데이터 신선도(staleness) 체크
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
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
// AsyncStorage 캐시 키
// ============================================================================

const CACHE_KEY = '@baln_context_card_cache';
const CACHE_TIMESTAMP_KEY = '@baln_context_card_cache_ts';

// ============================================================================
// 정적 폴백 카드 (API/DB 모두 실패 시 표시)
// ============================================================================

/**
 * FALLBACK_CONTEXT_CARD
 *
 * DB에도 카드가 없고, 캐시에도 없을 때 보여주는 정적 카드.
 * "안심을 판다, 불안을 팔지 않는다" 원칙에 따라 투자 원칙을 교육하는 콘텐츠.
 */
export const FALLBACK_CONTEXT_CARD: ContextCardWithImpact = {
  card: {
    id: 'fallback-static',
    date: new Date().toISOString().split('T')[0],
    headline: '시장은 늘 변동합니다',
    historical_context:
      '역사적으로 S&P 500은 연평균 약 10% 수익을 기록했습니다. 1987년 블랙먼데이(-22.6%), 2008년 금융위기(-38.5%), 2020년 팬데믹(-33.9%) 이후에도 시장은 매번 회복했습니다. 단기 변동에 흔들리지 않는 것이 장기 수익의 핵심입니다.',
    macro_chain: [
      '금리, 인플레이션, 고용 — 세 가지가 시장 방향을 결정합니다',
      '중앙은행 정책이 금리를 좌우합니다',
      '금리 변동이 기업 가치 평가에 영향을 줍니다',
      '매일 맥락을 읽으면 공포가 이해로 바뀝니다',
    ],
    institutional_behavior:
      '기관 투자자들은 패닉에 빠지지 않습니다. 그들은 정해진 규칙에 따라 리밸런싱할 뿐입니다. 우리도 자기만의 기준이 있으면 흔들리지 않습니다.',
    sentiment: 'calm' as ContextCardSentiment,
    is_premium_only: false,
    market_data: {},
    created_at: new Date().toISOString(),
  },
  userImpact: null,
};

// ============================================================================
// AsyncStorage 캐시 함수
// ============================================================================

/**
 * 캐시에서 마지막으로 성공한 맥락 카드를 읽어옵니다.
 * 앱 재시작 후에도 이전 카드를 즉시 보여주기 위해 사용합니다.
 */
export async function getCachedCard(): Promise<ContextCardWithImpact | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * 성공적으로 조회한 맥락 카드를 AsyncStorage에 저장합니다.
 * 다음 앱 실행 시 빠르게 보여줄 수 있도록 캐시합니다.
 */
export async function setCachedCard(card: ContextCardWithImpact): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(card));
    await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, JSON.stringify(Date.now()));
  } catch {
    /* 캐시 실패는 무시 - 핵심 기능에 영향 없음 */
  }
}

/**
 * 캐시된 카드의 저장 시각(ms timestamp)을 조회합니다.
 * 데이터 신선도 판단에 사용합니다.
 */
export async function getCachedCardTimestamp(): Promise<number | null> {
  try {
    const ts = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    return ts ? JSON.parse(ts) : null;
  } catch {
    return null;
  }
}

// ============================================================================
// 데이터 신선도 유틸
// ============================================================================

/** 카드 데이터가 N시간 이상 오래됐는지 확인 */
export function isCardStale(cardDate: string, hoursThreshold: number = 12): boolean {
  try {
    const cardTime = new Date(cardDate).getTime();
    const now = Date.now();
    const diffHours = (now - cardTime) / (1000 * 60 * 60);
    return diffHours >= hoursThreshold;
  } catch {
    return false;
  }
}

/** 카드의 날짜가 오늘이 아닌 경우 "어제의 분석" 라벨을 반환 */
export function getCardFreshnessLabel(cardDate: string): string | null {
  const today = new Date().toISOString().split('T')[0];
  if (cardDate === today) return null;

  // 어제인지 확인
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (cardDate === yesterdayStr) return '어제의 분석';
  return '이전 분석';
}

// ============================================================================
// null/빈값 보정 유틸
// ============================================================================

/**
 * 개별 레이어 콘텐츠가 null/빈 문자열인 경우 의미 있는 플레이스홀더로 대체합니다.
 * "빈 칸보다 교육적 콘텐츠가 낫다" 원칙.
 */
function sanitizeCardContent(card: ContextCard): ContextCard {
  return {
    ...card,
    headline: card.headline?.trim() || '오늘의 시장 맥락을 분석 중입니다',
    historical_context:
      card.historical_context?.trim() ||
      '역사적으로 시장은 단기 충격 후에도 장기적으로 회복하는 경향을 보였습니다. 매일 맥락을 읽는 습관이 패닉셀을 방지하는 힘입니다.',
    macro_chain:
      card.macro_chain && card.macro_chain.length > 0
        ? card.macro_chain
        : ['거시경제 데이터 수집 중'],
    institutional_behavior:
      card.institutional_behavior?.trim() ||
      '기관 투자자 행동 데이터를 수집하고 있습니다. 기관은 규칙에 따라 리밸런싱하며, 패닉 매도는 하지 않습니다.',
  };
}

/** 유저 영향도의 null 필드를 의미 있는 기본값으로 대체 */
function sanitizeImpact(impact: UserContextImpact | null): UserContextImpact | null {
  if (!impact) return null;

  return {
    ...impact,
    impact_message: impact.impact_message?.trim() || '오늘의 시장 변동에 따른 영향을 분석했습니다.',
  };
}

// ============================================================================
// 핵심 함수: 맥락 카드 조회
// ============================================================================

/**
 * 오늘의 맥락 카드 + 유저 영향도 조회
 *
 * 조회 우선순위:
 *   1. DB에서 오늘의 카드 조회 (< 100ms)
 *   2. DB에서 가장 최근 카드 조회 (어제 또는 이전)
 *   3. null 반환 (훅에서 캐시/폴백 처리)
 *
 * 성공 시 AsyncStorage에 캐시 저장 (다음 실행 시 빠르게 표시)
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
      if (__DEV__) console.log('[맥락 카드] 오늘의 카드 없음 -> 최근 카드로 폴백');

      // 폴백: 가장 최근 맥락 카드 조회 (어제 또는 그 이전)
      const { data: latestCard, error: latestError } = await supabase
        .from('context_cards')
        .select('*')
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError || !latestCard) {
        if (__DEV__) console.log('[맥락 카드] 최근 카드도 없음 -> null 반환 (데이터 없음)');
        return null;
      }

      // 최근 카드의 유저 영향도 조회
      const { data: latestImpact } = await supabase
        .from('user_context_impacts')
        .select('*')
        .eq('user_id', userId)
        .eq('context_card_id', latestCard.id)
        .maybeSingle();

      const fallbackCard: ContextCard = sanitizeCardContent({
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
      });

      const fallbackImpact: UserContextImpact | null = sanitizeImpact(
        latestImpact
          ? {
              id: latestImpact.id,
              user_id: latestImpact.user_id,
              context_card_id: latestImpact.context_card_id,
              percent_change: latestImpact.percent_change,
              health_score_change: latestImpact.health_score_change,
              impact_message: latestImpact.impact_message,
              calculated_at: latestImpact.calculated_at,
            }
          : null
      );

      const result: ContextCardWithImpact = {
        card: fallbackCard,
        userImpact: fallbackImpact,
        dataTimestamp: latestCard.created_at || new Date().toISOString(),
        dataSource: 'baln.logic AI 분석 · Google Search 그라운딩',
        confidenceNote: '이전 분석 데이터 (캐시)',
      };

      // 캐시 저장 (비동기, 에러 무시)
      setCachedCard(result);

      if (__DEV__) console.log(`[맥락 카드] 최근 카드 폴백 성공 (${latestCard.date})`);
      return result;
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

    // 3단계: 맥락 카드 + 영향도 병합 (null/빈값 보정 적용)
    const card: ContextCard = sanitizeCardContent({
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
    });

    const userImpact: UserContextImpact | null = sanitizeImpact(
      impactData
        ? {
            id: impactData.id,
            user_id: impactData.user_id,
            context_card_id: impactData.context_card_id,
            percent_change: impactData.percent_change,
            health_score_change: impactData.health_score_change,
            impact_message: impactData.impact_message,
            calculated_at: impactData.calculated_at,
          }
        : null
    );

    const result: ContextCardWithImpact = {
      card,
      userImpact,
      dataTimestamp: cardData.created_at || new Date().toISOString(),
      dataSource: 'baln.logic AI 분석 · Google Search 그라운딩',
      confidenceNote: '실시간 데이터 기반 분석',
    };

    // 캐시 저장 (비동기, 에러 무시)
    setCachedCard(result);

    if (__DEV__) console.log('[맥락 카드] 오늘의 카드 조회 성공 (빠른 경로)');
    return result;
  } catch (err) {
    console.error('[맥락 카드] 조회 실패:', err);
    // 네트워크 에러 시 캐시 fallback
    try {
      const cached = await getCachedCard();
      if (cached) {
        if (__DEV__) console.log('[맥락 카드] 네트워크 에러 → 캐시 fallback');
        return cached;
      }
    } catch { /* ignore */ }
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
        calculated_at: impact.calculated_at,
      });
    });

    // 4단계: 최종 결과 병합 (null/빈값 보정 적용)
    const results: ContextCardWithImpact[] = cardsData.map((cardData) => {
      const card: ContextCard = sanitizeCardContent({
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
      });

      const userImpact = sanitizeImpact(impactsMap.get(card.id) || null);

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
  try {
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
  } catch (err) {
    console.warn('[맥락 카드] 빠른 심리 상태 조회 실패:', err);
    return null;
  }
}

// ============================================================================
// 유틸: DB 데이터 -> UI 컴포넌트 데이터 변환
// ============================================================================

/**
 * DB 맥락 카드 -> UI 컴포넌트 props 변환
 *
 * snake_case (DB) -> camelCase (UI) 변환
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
    headline: card.headline || '오늘의 시장 맥락을 분석 중입니다',
    historicalContext: card.historical_context || '역사적 맥락 데이터가 없습니다.',
    macroChain: card.macro_chain || [],
    institutionalBehavior: card.institutional_behavior || '기관 행동 데이터가 없습니다.',
    portfolioImpact: {
      percentChange: userImpact?.percent_change ?? 0,
      healthScoreChange: userImpact?.health_score_change ?? 0,
      message: userImpact?.impact_message || '오늘의 시장 변동에 따른 영향을 분석했습니다.',
      isCalculating: false,
    },
    sentiment: card.sentiment,
    isPremiumContent: card.is_premium_only,
  };
}
