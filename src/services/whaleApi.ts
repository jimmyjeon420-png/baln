/**
 * Whale API Service - "Pace Maker" 벤치마크
 *
 * 변경: 억만장자(Warren Buffett) 대신 "다음 단계 상위 20%" 페르소나 사용
 * 예: 자산 5억~10억원 구간의 상위 20% 투자자 포트폴리오
 *
 * 이 벤치마크는 더 현실적이고 달성 가능한 목표를 제시합니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 목표 페르소나 정보
export interface TargetPersona {
  tierName: string;           // "5억~10억원 구간"
  targetPercentile: number;   // 상위 20%
  timeframeYears: number;     // 목표 달성 기간 (년)
  description: string;        // 설명
}

// 고래 배분 데이터 타입
export interface WhaleAllocation {
  stock: number;      // 주식 비중 (%)
  bond: number;       // 채권 비중 (%)
  realEstate: number; // 부동산 비중 (%)
  crypto: number;     // 암호화폐 비중 (%)
  cash: number;       // 현금 비중 (%)
  updatedAt: string;  // 마지막 업데이트 시간
}

// 상위 펀드 데이터 타입
export interface TopFundData {
  name: string;
  aum: number;          // 운용 자산 (백만 달러)
  topHoldings: string[]; // 상위 보유 종목
  allocation: WhaleAllocation;
}

// 캐시 키
const CACHE_KEY = 'whale_benchmark_data';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

// ============================================================
// "Pace Maker" 벤치마크 데이터
// 목표: 다음 단계 상위 20% (5억~10억원 구간)
// ============================================================

// 기본 목표 페르소나
export const DEFAULT_TARGET_PERSONA: TargetPersona = {
  tierName: '5억~10억원',
  targetPercentile: 20,         // 상위 20%
  timeframeYears: 3,            // 3년 내 달성 목표
  description: '다음 단계 상위 20%의 자산 배분',
};

// 벤치마크 데이터: 다음 단계 상위 20% 포트폴리오
// 연구 기반 현실적인 배분 (한국 고액자산가 평균 참고)
export const PACE_MAKER_ALLOCATION: WhaleAllocation = {
  stock: 45,       // 주식 45% (성장 중심, Tech 비중 높음)
  bond: 0,         // 채권 0% (공격적 성장 단계)
  realEstate: 30,  // 부동산 30% (안정성 확보)
  crypto: 10,      // 암호화폐 10% (알파 추구)
  cash: 15,        // 현금 15% (기회 포착 대기)
  updatedAt: new Date().toISOString(),
};

// 폴백 데이터 (API 실패 시 사용) - Pace Maker 배분 사용
export const WHALE_BENCHMARK_FALLBACK: WhaleAllocation = PACE_MAKER_ALLOCATION;

// 자산 구간별 추천 배분 (사용자 자산에 따라 동적 변경 가능)
export const TIER_ALLOCATIONS: { [key: string]: WhaleAllocation } = {
  // 1억~5억 구간 상위 20%
  'tier_1_5': {
    stock: 50,
    bond: 0,
    realEstate: 20,
    crypto: 15,
    cash: 15,
    updatedAt: new Date().toISOString(),
  },
  // 5억~10억 구간 상위 20% (기본)
  'tier_5_10': PACE_MAKER_ALLOCATION,
  // 10억~30억 구간 상위 20%
  'tier_10_30': {
    stock: 40,
    bond: 10,
    realEstate: 35,
    crypto: 5,
    cash: 10,
    updatedAt: new Date().toISOString(),
  },
};

// 상위 헤지펀드 목록 (참고용 - 제거하지 않고 유지)
export const TOP_HEDGE_FUNDS: TopFundData[] = [
  {
    name: 'Bridgewater Associates',
    aum: 124000,
    topHoldings: ['SPY', 'EEM', 'GLD', 'TLT'],
    allocation: { stock: 35, bond: 30, realEstate: 10, crypto: 5, cash: 20, updatedAt: '' },
  },
  {
    name: 'Renaissance Technologies',
    aum: 68000,
    topHoldings: ['AAPL', 'NVDA', 'MSFT', 'GOOGL'],
    allocation: { stock: 70, bond: 10, realEstate: 5, crypto: 5, cash: 10, updatedAt: '' },
  },
  {
    name: 'Citadel Advisors',
    aum: 57000,
    topHoldings: ['TSLA', 'AMZN', 'META', 'NVDA'],
    allocation: { stock: 55, bond: 15, realEstate: 10, crypto: 10, cash: 10, updatedAt: '' },
  },
  {
    name: 'DE Shaw',
    aum: 55000,
    topHoldings: ['NVDA', 'AAPL', 'MSFT', 'GOOGL'],
    allocation: { stock: 60, bond: 15, realEstate: 8, crypto: 7, cash: 10, updatedAt: '' },
  },
  {
    name: 'Two Sigma',
    aum: 38000,
    topHoldings: ['AAPL', 'AMZN', 'NVDA', 'SPY'],
    allocation: { stock: 50, bond: 20, realEstate: 10, crypto: 8, cash: 12, updatedAt: '' },
  },
];

// 캐시에서 데이터 로드
const loadFromCache = async (): Promise<WhaleAllocation | null> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const cachedTime = new Date(data.updatedAt).getTime();
    const now = Date.now();

    // 캐시가 유효한지 확인 (24시간 이내)
    if (now - cachedTime < CACHE_DURATION) {
      return data;
    }

    return null;
  } catch (error) {
    console.error('Cache load error:', error);
    return null;
  }
};

// 캐시에 데이터 저장
const saveToCache = async (data: WhaleAllocation): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Cache save error:', error);
  }
};

/**
 * SEC 13F 파일링에서 평균 배분 계산 (Simulated)
 * 실제 구현 시 SEC EDGAR API 사용
 */
const fetchSEC13FData = async (): Promise<WhaleAllocation | null> => {
  try {
    // SEC EDGAR API 엔드포인트 (실제 사용 시)
    // const response = await fetch('https://data.sec.gov/submissions/...');

    // 시뮬레이션: 상위 5개 헤지펀드 평균 배분 계산
    const avgAllocation: WhaleAllocation = {
      stock: 0,
      bond: 0,
      realEstate: 0,
      crypto: 0,
      cash: 0,
      updatedAt: new Date().toISOString(),
    };

    TOP_HEDGE_FUNDS.forEach((fund) => {
      avgAllocation.stock += fund.allocation.stock;
      avgAllocation.bond += fund.allocation.bond;
      avgAllocation.realEstate += fund.allocation.realEstate;
      avgAllocation.crypto += fund.allocation.crypto;
      avgAllocation.cash += fund.allocation.cash;
    });

    const count = TOP_HEDGE_FUNDS.length;
    avgAllocation.stock = Math.round(avgAllocation.stock / count);
    avgAllocation.bond = Math.round(avgAllocation.bond / count);
    avgAllocation.realEstate = Math.round(avgAllocation.realEstate / count);
    avgAllocation.crypto = Math.round(avgAllocation.crypto / count);
    avgAllocation.cash = Math.round(avgAllocation.cash / count);

    return avgAllocation;
  } catch (error) {
    console.error('SEC 13F fetch error:', error);
    return null;
  }
};

/**
 * Whale Alert API에서 대형 크립토 거래 동향
 * 실제 구현 시 Whale Alert API 키 필요
 */
const fetchWhaleAlertData = async (): Promise<{ cryptoTrend: 'bullish' | 'bearish' | 'neutral' } | null> => {
  try {
    // Whale Alert API 엔드포인트 (실제 사용 시)
    // const response = await fetch(`https://api.whale-alert.io/v1/transactions?api_key=${API_KEY}`);

    // 시뮬레이션: 중립 트렌드 반환
    return { cryptoTrend: 'neutral' };
  } catch (error) {
    console.error('Whale Alert fetch error:', error);
    return null;
  }
};

/**
 * Pace Maker 배분 데이터 가져오기
 * 변경: 상위 헤지펀드 평균 → "다음 단계 상위 20%" 페르소나
 * 캐시 → Pace Maker 데이터 반환
 */
export const fetchWhaleAllocation = async (): Promise<WhaleAllocation> => {
  try {
    // 1. 캐시 확인
    const cached = await loadFromCache();
    if (cached) {
      console.log('Pace Maker data loaded from cache');
      return cached;
    }

    // 2. Pace Maker 벤치마크 데이터 사용 (현실적인 목표)
    const paceMakerData = { ...PACE_MAKER_ALLOCATION, updatedAt: new Date().toISOString() };

    // 3. Whale Alert 트렌드로 크립토 비중 미세 조정 (선택적)
    const whaleAlert = await fetchWhaleAlertData();
    if (whaleAlert) {
      if (whaleAlert.cryptoTrend === 'bullish') {
        paceMakerData.crypto = Math.min(paceMakerData.crypto + 2, 15);
        paceMakerData.cash = Math.max(paceMakerData.cash - 2, 10);
      } else if (whaleAlert.cryptoTrend === 'bearish') {
        paceMakerData.crypto = Math.max(paceMakerData.crypto - 2, 5);
        paceMakerData.cash = paceMakerData.cash + 2;
      }
    }

    // 캐시에 저장
    await saveToCache(paceMakerData);
    console.log('Pace Maker benchmark data ready');
    return paceMakerData;

  } catch (error) {
    console.error('fetchWhaleAllocation error:', error);
    return WHALE_BENCHMARK_FALLBACK;
  }
};

/**
 * 사용자 포트폴리오와 고래 배분 비교
 */
export interface AllocationComparison {
  category: string;
  label: string;
  userAllocation: number;
  whaleAllocation: number;
  difference: number;
  recommendation: string;
}

/**
 * Pace Maker 추천 메시지 생성
 * 구체적이고 실행 가능한 조언 제공
 */
const getActionableRecommendation = (
  key: string,
  label: string,
  diff: number,
  targetVal: number
): string => {
  const absDiff = Math.abs(diff);

  // 차이가 5% 미만이면 적정
  if (absDiff <= 5) {
    return '✓ 목표 수준 달성';
  }

  // 구체적인 추천 메시지
  if (diff > 0) {
    // 사용자 비중이 높음 → 줄이기 권장
    switch (key) {
      case 'stock':
        return `주식 ${absDiff}%p 축소 → 부동산/현금으로 분산`;
      case 'crypto':
        return `암호화폐 ${absDiff}%p 축소 → 변동성 관리`;
      case 'cash':
        return `유휴 현금 ${absDiff}%p 활용 → 성장자산 투자`;
      case 'realEstate':
        return `부동산 ${absDiff}%p 축소 → 유동성 확보`;
      default:
        return `${label} ${absDiff}%p 축소 권장`;
    }
  } else {
    // 사용자 비중이 낮음 → 늘리기 권장
    switch (key) {
      case 'stock':
        return `Tech 주식 ${absDiff}%p 확대 → 성장 가속`;
      case 'crypto':
        return `암호화폐 ${absDiff}%p 추가 → 알파 확보`;
      case 'realEstate':
        return `부동산 ${absDiff}%p 확대 → 안정성 강화`;
      case 'cash':
        return `현금 ${absDiff}%p 확보 → 기회 포착 대기`;
      default:
        return `${label} ${absDiff}%p 확대 권장`;
    }
  }
};

export const compareWithWhale = (
  userAllocation: WhaleAllocation,
  whaleAllocation: WhaleAllocation
): AllocationComparison[] => {
  const categories: { key: keyof Omit<WhaleAllocation, 'updatedAt'>; label: string }[] = [
    { key: 'stock', label: '주식' },
    { key: 'bond', label: '채권' },
    { key: 'realEstate', label: '부동산' },
    { key: 'crypto', label: '암호화폐' },
    { key: 'cash', label: '현금' },
  ];

  return categories.map(({ key, label }) => {
    const userVal = userAllocation[key] as number;
    const whaleVal = whaleAllocation[key] as number;
    const diff = userVal - whaleVal;

    // 구체적이고 실행 가능한 추천 메시지
    const recommendation = getActionableRecommendation(key, label, diff, whaleVal);

    return {
      category: key,
      label,
      userAllocation: userVal,
      whaleAllocation: whaleVal,
      difference: diff,
      recommendation,
    };
  });
};

/**
 * 포트폴리오에서 자산 유형별 배분 계산
 */
export interface PortfolioItem {
  ticker: string;
  name: string;
  currentValue: number;
  assetType?: string;
}

export const calculateUserAllocation = (portfolio: PortfolioItem[]): WhaleAllocation => {
  const totalValue = portfolio.reduce((sum, item) => sum + item.currentValue, 0);

  if (totalValue === 0) {
    return { stock: 0, bond: 0, realEstate: 0, crypto: 0, cash: 0, updatedAt: new Date().toISOString() };
  }

  // 자산 유형별 분류 (티커 패턴 기반)
  let stock = 0, bond = 0, realEstate = 0, crypto = 0, cash = 0;

  portfolio.forEach((item) => {
    const ticker = item.ticker.toUpperCase();
    const name = item.name.toLowerCase();
    const value = item.currentValue;

    // 암호화폐 식별
    if (['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC', 'LINK'].includes(ticker) ||
        name.includes('비트코인') || name.includes('이더리움') || name.includes('coin') || name.includes('crypto')) {
      crypto += value;
    }
    // 채권 ETF 식별
    else if (['TLT', 'BND', 'AGG', 'LQD', 'HYG', 'IEF', 'SHY'].includes(ticker) ||
             name.includes('채권') || name.includes('bond')) {
      bond += value;
    }
    // 부동산 REIT 식별
    else if (['VNQ', 'SCHH', 'IYR', 'XLRE'].includes(ticker) ||
             name.includes('부동산') || name.includes('리츠') || name.includes('reit')) {
      realEstate += value;
    }
    // 현금/MMF 식별
    else if (['BIL', 'SHV', 'SGOV'].includes(ticker) ||
             name.includes('현금') || name.includes('mmf') || name.includes('money market')) {
      cash += value;
    }
    // 나머지는 주식으로 분류
    else {
      stock += value;
    }
  });

  return {
    stock: Math.round((stock / totalValue) * 100),
    bond: Math.round((bond / totalValue) * 100),
    realEstate: Math.round((realEstate / totalValue) * 100),
    crypto: Math.round((crypto / totalValue) * 100),
    cash: Math.round((cash / totalValue) * 100),
    updatedAt: new Date().toISOString(),
  };
};
