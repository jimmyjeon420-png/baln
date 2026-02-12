/**
 * Mock 시장 데이터 및 뉴스 피드
 * 실제 API 연동 전 테스트/개발용
 */

import { MarketFeedItem, MarketDriver } from '../types/kostolany';

/**
 * Mock 시장 뉴스 피드
 * 현재 자산들의 가격 변동 이유를 시뮬레이션
 */
export const getMockMarketFeed = (): MarketFeedItem[] => [
  {
    asset: 'Bitcoin',
    movement: 'Down',
    reason: 'SEC 규제 뉴스 - 스팟 이더리움 ETF 승인 지연',
    source: 'YouTube: CoinBureau',
    timestamp: Date.now() - 3600000, // 1시간 전
    impact: 'HIGH',
  },
  {
    asset: 'Nasdaq',
    movement: 'Up',
    reason: 'AI 반도체 기업 실적 호조 - NVIDIA, TSMC 어닝 서프라이즈',
    source: 'Bloomberg',
    timestamp: Date.now() - 7200000, // 2시간 전
    impact: 'HIGH',
  },
  {
    asset: 'Gold',
    movement: 'Up',
    reason: '달러 약세 및 안전자산 선호 - 지정학적 불안감',
    source: 'Reuters',
    timestamp: Date.now() - 10800000, // 3시간 전
    impact: 'MEDIUM',
  },
  {
    asset: 'US Treasury (10Y)',
    movement: 'Down',
    reason: '경기 둔화 신호 - 인플레이션 데이터 약함',
    source: 'CNBC',
    timestamp: Date.now() - 14400000, // 4시간 전
    impact: 'MEDIUM',
  },
  {
    asset: 'Ethereum',
    movement: 'Stable',
    reason: '암호화폐 시장 횡보 - 매크로 신호 대기',
    source: 'Crypto Twitter',
    timestamp: Date.now() - 18000000, // 5시간 전
    impact: 'LOW',
  },
];

/**
 * 시장을 움직이는 Top 3 요인 (Mock)
 */
export const getMockMarketDrivers = (): MarketDriver[] => [
  {
    rank: 1,
    title: '연준 금리 경로 불확실성',
    description:
      '인플레이션 둔화로 금리 인하 가능성 제시. 향후 3개월간 금리 추이가 주식시장 방향성 결정.',
    affectedAssets: ['Nasdaq', 'US Treasury', 'Dollar'],
    impactLevel: 'HIGH',
    emoji: '📊',
  },
  {
    rank: 2,
    title: 'AI 산업 실적 호조 지속',
    description:
      'NVIDIA, Broadcom 등 AI 칩 업체들의 매출 성장. 기술주 랠리의 주요 동력.',
    affectedAssets: ['Nasdaq', 'Tech Stocks'],
    impactLevel: 'HIGH',
    emoji: '🤖',
  },
  {
    rank: 3,
    title: '중동 지정학적 긴장',
    description:
      '이란-이스라엘 긴장 고조로 유가 상승 가능성. 안전자산(금, 달러) 수요 증가.',
    affectedAssets: ['Gold', 'Oil', 'USD'],
    impactLevel: 'MEDIUM',
    emoji: '🌍',
  },
];

/**
 * 교육용 Egg 단계별 Market Drivers
 * (사용자의 현재 Egg 단계에 맞는 맞춤형 정보)
 */
export const getMarketDriversByPhase = (phase: string): MarketDriver[] => {
  // 기본값: 위의 Top 3 사용
  return getMockMarketDrivers();
};

/**
 * 날씨처럼 변하는 Mock 감정 지수 (실시간 시뮬레이션)
 * 시간에 따라 달라지는 시장 심리 표현
 */
export const getRandomMarketSentiment = () => {
  const sentiments = ['FEAR', 'CAUTIOUS', 'NEUTRAL', 'OPTIMISTIC', 'GREED'];
  const weights = [15, 25, 30, 20, 10]; // 중립에 더 높은 가중치

  const random = Math.random() * 100;
  let cumulativeWeight = 0;

  for (let i = 0; i < sentiments.length; i++) {
    cumulativeWeight += weights[i];
    if (random <= cumulativeWeight) {
      return sentiments[i];
    }
  }

  return 'NEUTRAL';
};

/**
 * Mock 거래량 (일중 변동)
 */
export const getRandomVolumeCondition = () => {
  const hour = new Date().getHours();

  // 뉴욕 오픈 (9:30 ~ 16:00) = 9:30 = 21:30 KST
  // 시가 (21:30 ~ 23:00) = 높은 거래량
  // 중간 (23:00 ~ 03:30) = 중간 거래량
  // 종가 (03:30 ~ 04:00) = 높은 거래량
  // 아시아 시간 (04:00 ~ 21:30) = 낮은 거래량

  if ((hour >= 21 && hour <= 23) || (hour >= 3 && hour <= 4)) {
    return 'HIGH';
  } else if (hour >= 23 || hour <= 3) {
    return 'MEDIUM';
  }
  return 'LOW';
};

/**
 * Mock 주식 가격 데이터
 * 실제 주식 API가 없을 때 사용할 테스트 가격
 */
const MOCK_STOCK_PRICES: Record<string, number> = {
  // Tech stocks
  AAPL: 182.5,
  MSFT: 378.9,
  GOOGL: 142.3,
  NVDA: 875.4,
  TSLA: 245.6,
  META: 501.2,
  AMZN: 178.9,

  // Finance stocks
  JPM: 197.3,
  BAC: 39.2,
  WFC: 54.8,
  GS: 411.2,
  'BRK-B': 418.5,
  'BRK.B': 418.5,

  // Other stocks
  VTI: 232.4, // S&P 500 ETF
  VOO: 458.9, // S&P 500 ETF
  QQQ: 376.2, // Nasdaq ETF
  AGG: 98.5,  // Bond ETF
};

/**
 * Mock 가격 조회 함수
 * @param ticker - 티커 심볼
 * @returns 가격 또는 null
 */
export const getPrice = (ticker: string): number | null => {
  const upperTicker = ticker.toUpperCase();
  return MOCK_STOCK_PRICES[upperTicker] || null;
};

/**
 * Mock 데이터 생성 헬퍼
 */
export const generateMockMarketSnapshot = () => {
  return {
    sentiment: getRandomMarketSentiment(),
    volume: getRandomVolumeCondition(),
    timestamp: Date.now(),
    feedItems: getMockMarketFeed(),
    drivers: getMockMarketDrivers(),
  };
};
