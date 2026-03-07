/**
 * useMarketSentiment — 시장 센티먼트 집계 훅
 *
 * 역할: "시장 심리 온도계" — 주가, 암호화폐, 변동성, 모멘텀 데이터를
 *       하나의 감정 점수(-1 ~ +1)로 변환해 마을 무드 엔진에 공급
 *
 * 비유: 여러 뉴스 채널을 동시에 보면서 "오늘 시장 분위기가 어때?"를
 *       한 마디로 요약해 주는 해설 위원
 *
 * 사용처:
 * - moodEngine.ts의 calculateGuruMood() 입력값
 * - app/(tabs)/village.tsx 에서 useVillageWorld()에 전달
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const SENTIMENT_CACHE_KEY = 'market_sentiment_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30분

/**
 * 가중치 (합계 = 1.0)
 * stockMarket 40% + crypto 20% + volatility 20% + momentum 20%
 */
const WEIGHTS = {
  stockMarket: 0.40,
  crypto:      0.20,
  volatility:  0.20,
  momentum:    0.20,
} as const;

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export interface MarketSentimentData {
  /** 종합 센티먼트 (-1 극도 공포 ~ +1 극도 탐욕) */
  overall: number;
  components: {
    /** 주요 지수 변동률 기반 (-1 ~ 1) */
    stockMarket: number;
    /** BTC/ETH 변동률 기반 (-1 ~ 1) */
    crypto: number;
    /** VIX 스타일 공포 게이지 (높은 변동성 = 음수) */
    volatility: number;
    /** 다일(多日) 추세 (-1 ~ 1) */
    momentum: number;
  };
  /** 한국어 레이블 */
  label: string;
  /** 영어 레이블 */
  labelEn: string;
  /** 감정 이모지 */
  emoji: string;
  /** 마지막 업데이트 (ISO 8601) */
  lastUpdated: string;
}

interface CachedSentiment {
  data: MarketSentimentData;
  savedAt: number; // Date.now()
}

/** 외부에서 컨텍스트 카드 파싱 결과를 주입할 때 사용하는 포맷 */
export interface SentimentContext {
  /** 주가 지수 당일 변동률 (%), 없으면 undefined */
  stockChangePercent?: number;
  /** BTC 24h 변동률 (%), 없으면 undefined */
  btcChangePercent?: number;
  /** ETH 24h 변동률 (%), 없으면 undefined */
  ethChangePercent?: number;
  /** 내 포트폴리오 총 변동률 (%), 없으면 undefined */
  portfolioChangePercent?: number;
}

// ---------------------------------------------------------------------------
// 순수 계산 유틸
// ---------------------------------------------------------------------------

/** 값을 min~max 범위로 제한 */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 퍼센트 변동률 → -1 ~ 1 센티먼트 스코어
 * 선형 매핑: -10% → -1, 0% → 0, +10% → 1
 */
function percentToSentiment(percent: number, scale = 10): number {
  return clamp(percent / scale, -1, 1);
}

/**
 * 종합 점수 → 레이블 + 이모지
 */
function scoreToLabel(overall: number): { label: string; labelEn: string; emoji: string } {
  if (overall <= -0.6) return { label: '극도의 공포', labelEn: 'Extreme Fear',  emoji: '😱' };
  if (overall <= -0.2) return { label: '공포',        labelEn: 'Fear',          emoji: '😰' };
  if (overall <   0.2) return { label: '중립',        labelEn: 'Neutral',       emoji: '😐' };
  if (overall <   0.6) return { label: '탐욕',        labelEn: 'Greed',         emoji: '😊' };
  return                      { label: '극도의 탐욕', labelEn: 'Extreme Greed', emoji: '🤑' };
}

/**
 * 컴포넌트 값들로 MarketSentimentData 객체를 조립
 */
function buildSentimentData(components: MarketSentimentData['components']): MarketSentimentData {
  const overall = clamp(
    components.stockMarket * WEIGHTS.stockMarket +
    components.crypto      * WEIGHTS.crypto      +
    components.volatility  * WEIGHTS.volatility  +
    components.momentum    * WEIGHTS.momentum,
    -1,
    1,
  );

  const { label, labelEn, emoji } = scoreToLabel(overall);

  return {
    overall,
    components,
    label,
    labelEn,
    emoji,
    lastUpdated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// AsyncStorage 캐시 I/O
// ---------------------------------------------------------------------------

async function loadCachedSentiment(): Promise<MarketSentimentData | null> {
  try {
    const raw = await AsyncStorage.getItem(SENTIMENT_CACHE_KEY);
    if (!raw) return null;

    const cached: CachedSentiment = JSON.parse(raw);
    const isExpired = Date.now() - cached.savedAt > CACHE_DURATION;
    if (isExpired) return null;

    return cached.data;
  } catch (err) {
    if (__DEV__) console.warn('[useMarketSentiment] 캐시 로드 실패:', err);
    return null;
  }
}

async function saveSentimentCache(data: MarketSentimentData): Promise<void> {
  try {
    const payload: CachedSentiment = { data, savedAt: Date.now() };
    await AsyncStorage.setItem(SENTIMENT_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    if (__DEV__) console.warn('[useMarketSentiment] 캐시 저장 실패:', err);
  }
}

// ---------------------------------------------------------------------------
// 기본 센티먼트 (데이터 없을 때의 낙관적 기본값 — 버핏 철학)
// ---------------------------------------------------------------------------

function getOptimisticDefault(): MarketSentimentData {
  return buildSentimentData({
    stockMarket: 0.1,  // 약간 긍정적
    crypto:      0.1,
    volatility:  0.0,  // 중립
    momentum:    0.0,
  });
}

// ---------------------------------------------------------------------------
// 훅
// ---------------------------------------------------------------------------

export function useMarketSentiment() {
  const [sentiment, setSentiment] = useState<MarketSentimentData>(getOptimisticDefault);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // 캐시에서 초기 데이터 로드
  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      const cached = await loadCachedSentiment();
      if (mountedRef.current) {
        setSentiment(cached ?? getOptimisticDefault());
        setIsLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * 컨텍스트 카드 파싱 결과 또는 포트폴리오 변동 데이터를 주입
   *
   * 사용 예:
   * ```
   * setSentimentFromContext({ stockChangePercent: -2.5, btcChangePercent: 3.1 });
   * ```
   * 주입된 값으로 센티먼트를 재계산하고 캐시에 저장합니다.
   */
  const setSentimentFromContext = useCallback((ctx: SentimentContext) => {
    const stockRaw = ctx.stockChangePercent ?? ctx.portfolioChangePercent ?? 0;
    const btcRaw   = ctx.btcChangePercent   ?? 0;
    const ethRaw   = ctx.ethChangePercent   ?? 0;

    const stockScore = percentToSentiment(stockRaw, 5);  // 주가: ±5% = 풀 스코어
    const cryptoRaw  = (btcRaw + ethRaw) / (btcRaw !== 0 && ethRaw !== 0 ? 2 : 1);
    const cryptoScore = percentToSentiment(cryptoRaw, 10); // 암호화폐: ±10% = 풀 스코어

    // 변동성: 절대 변동률이 클수록 공포 증가 (음수 방향)
    const avgAbsChange = (Math.abs(stockRaw) + Math.abs(cryptoRaw)) / 2;
    const volatilityScore = clamp(-avgAbsChange / 8, -1, 0.2);

    // 모멘텀: 주가와 암호화폐의 평균 방향
    const momentumScore = clamp((stockScore + cryptoScore) / 2, -1, 1);

    const newData = buildSentimentData({
      stockMarket: stockScore,
      crypto:      cryptoScore,
      volatility:  volatilityScore,
      momentum:    momentumScore,
    });

    if (mountedRef.current) {
      setSentiment(newData);
    }

    saveSentimentCache(newData).catch(() => {});

    if (__DEV__) {
      if (__DEV__) console.log('[useMarketSentiment] 컨텍스트 주입 →', {
        overall: newData.overall.toFixed(2),
        label: newData.label,
      });
    }
  }, []);

  /**
   * 포트폴리오 총 자산 변동률(%)만으로 센티먼트 추정
   * useSharedPortfolio에서 totalAssets 변화를 감지했을 때 사용
   */
  const setSentimentFromPortfolio = useCallback((portfolioChangePercent: number) => {
    setSentimentFromContext({ portfolioChangePercent });
  }, [setSentimentFromContext]);

  /**
   * 캐시를 비우고 기본값으로 재설정
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await AsyncStorage.removeItem(SENTIMENT_CACHE_KEY);
    if (mountedRef.current) {
      setSentiment(getOptimisticDefault());
      setIsLoading(false);
    }
  }, []);

  return {
    sentiment,
    isLoading,
    /** 컨텍스트 카드 파싱 결과 주입 (권장) */
    setSentimentFromContext,
    /** 포트폴리오 변동률만으로 간편 주입 */
    setSentimentFromPortfolio,
    /** 캐시 초기화 */
    refresh,
  };
}
