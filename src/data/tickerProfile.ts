/**
 * tickerProfile.ts — 티커 섹터·스타일·지역 태깅 데이터
 * ─────────────────────────────────────────────────────
 * Phase 1: 주식 세부 분류 (성장주/가치주/배당주/투기주/인덱스)
 * Phase 2에서 calcPhilosophyAlignment가 이 데이터를 활용합니다.
 *
 * 확장 원칙:
 * - 새 티커 추가 시 이 파일에만 추가 (다른 파일 수정 불필요)
 * - 미분류 티커 → 기본적으로 'growth' 처리
 */

// ============================================================================
// 타입 정의
// ============================================================================

/** 투자 스타일 (버핏/달리오 철학 정합도 계산용) */
export type TickerStyle = 'growth' | 'value' | 'dividend' | 'speculative' | 'index';

/** 섹터 분류 */
export type TickerSector =
  | 'tech' | 'finance' | 'consumer' | 'healthcare' | 'energy'
  | 'materials' | 'telecom' | 'industrial' | 'etf_blend' | 'crypto' | 'commodity';

/** 지역 분류 */
export type TickerGeo = 'us' | 'kr' | 'global' | 'em';

/** 티커 프로파일 */
export interface TickerProfile {
  ticker: string;
  name: string;
  sector: TickerSector;
  style: TickerStyle;
  geo: TickerGeo;
}

// ============================================================================
// 티커 데이터베이스
// ============================================================================

export const TICKER_PROFILES: Record<string, TickerProfile> = {
  // ── 미국 성장주 (기술) ──
  'NVDA':  { ticker: 'NVDA',  name: '엔비디아',       sector: 'tech',      style: 'growth',      geo: 'us' },
  'TSLA':  { ticker: 'TSLA',  name: '테슬라',         sector: 'consumer',  style: 'growth',      geo: 'us' },
  'AAPL':  { ticker: 'AAPL',  name: '애플',           sector: 'tech',      style: 'value',       geo: 'us' },
  'MSFT':  { ticker: 'MSFT',  name: '마이크로소프트',  sector: 'tech',      style: 'value',       geo: 'us' },
  'AMZN':  { ticker: 'AMZN',  name: '아마존',         sector: 'consumer',  style: 'growth',      geo: 'us' },
  'GOOGL': { ticker: 'GOOGL', name: '알파벳',         sector: 'tech',      style: 'value',       geo: 'us' },
  'GOOG':  { ticker: 'GOOG',  name: '알파벳 C',       sector: 'tech',      style: 'value',       geo: 'us' },
  'META':  { ticker: 'META',  name: '메타',           sector: 'tech',      style: 'growth',      geo: 'us' },
  'AMD':   { ticker: 'AMD',   name: 'AMD',            sector: 'tech',      style: 'growth',      geo: 'us' },
  'PLTR':  { ticker: 'PLTR',  name: '팔란티어',       sector: 'tech',      style: 'speculative', geo: 'us' },
  'COIN':  { ticker: 'COIN',  name: '코인베이스',     sector: 'finance',   style: 'speculative', geo: 'us' },
  'MSTR':  { ticker: 'MSTR',  name: '마이크로스트래티지', sector: 'tech',  style: 'speculative', geo: 'us' },
  'SNOW':  { ticker: 'SNOW',  name: '스노우플레이크', sector: 'tech',      style: 'growth',      geo: 'us' },
  'NET':   { ticker: 'NET',   name: '클라우드플레어', sector: 'tech',      style: 'growth',      geo: 'us' },
  'CRWD':  { ticker: 'CRWD',  name: '크라우드스트라이크', sector: 'tech',  style: 'growth',      geo: 'us' },
  'SHOP':  { ticker: 'SHOP',  name: '쇼피파이',       sector: 'consumer',  style: 'growth',      geo: 'us' },
  'UBER':  { ticker: 'UBER',  name: '우버',           sector: 'consumer',  style: 'growth',      geo: 'us' },
  'ABNB':  { ticker: 'ABNB',  name: '에어비앤비',     sector: 'consumer',  style: 'growth',      geo: 'us' },

  // ── 미국 가치주 ──
  'BRK.B': { ticker: 'BRK.B', name: '버크셔B',        sector: 'finance',   style: 'value',       geo: 'us' },
  'BRK.A': { ticker: 'BRK.A', name: '버크셔A',        sector: 'finance',   style: 'value',       geo: 'us' },
  'JPM':   { ticker: 'JPM',   name: 'JP모건',         sector: 'finance',   style: 'value',       geo: 'us' },
  'BAC':   { ticker: 'BAC',   name: '뱅크오브아메리카', sector: 'finance', style: 'value',       geo: 'us' },
  'WFC':   { ticker: 'WFC',   name: '웰스파고',       sector: 'finance',   style: 'value',       geo: 'us' },
  'GS':    { ticker: 'GS',    name: '골드만삭스',     sector: 'finance',   style: 'value',       geo: 'us' },

  // ── 미국 배당주 ──
  'JNJ':   { ticker: 'JNJ',   name: '존슨앤존슨',     sector: 'healthcare', style: 'dividend',   geo: 'us' },
  'PG':    { ticker: 'PG',    name: 'P&G',            sector: 'consumer',  style: 'dividend',    geo: 'us' },
  'KO':    { ticker: 'KO',    name: '코카콜라',       sector: 'consumer',  style: 'dividend',    geo: 'us' },
  'PEP':   { ticker: 'PEP',   name: '펩시코',         sector: 'consumer',  style: 'dividend',    geo: 'us' },
  'XOM':   { ticker: 'XOM',   name: '엑슨모빌',       sector: 'energy',    style: 'dividend',    geo: 'us' },
  'CVX':   { ticker: 'CVX',   name: '쉐브론',         sector: 'energy',    style: 'dividend',    geo: 'us' },
  'MCD':   { ticker: 'MCD',   name: '맥도날드',       sector: 'consumer',  style: 'dividend',    geo: 'us' },
  'T':     { ticker: 'T',     name: 'AT&T',           sector: 'telecom',   style: 'dividend',    geo: 'us' },
  'VZ':    { ticker: 'VZ',    name: '버라이즌',       sector: 'telecom',   style: 'dividend',    geo: 'us' },

  // ── 미국 인덱스/블렌드 ETF ──
  'VTI':   { ticker: 'VTI',   name: '뱅가드 전체시장',  sector: 'etf_blend', style: 'index',     geo: 'us' },
  'VOO':   { ticker: 'VOO',   name: 'S&P500 ETF',    sector: 'etf_blend', style: 'index',       geo: 'us' },
  'SPY':   { ticker: 'SPY',   name: 'S&P500 ETF',    sector: 'etf_blend', style: 'index',       geo: 'us' },
  'IVV':   { ticker: 'IVV',   name: 'iShares S&P500', sector: 'etf_blend', style: 'index',      geo: 'us' },
  'QQQ':   { ticker: 'QQQ',   name: '나스닥100',      sector: 'etf_blend', style: 'growth',      geo: 'us' },
  'VEA':   { ticker: 'VEA',   name: '선진국 ETF',     sector: 'etf_blend', style: 'index',       geo: 'global' },
  'VWO':   { ticker: 'VWO',   name: '신흥국 ETF',     sector: 'etf_blend', style: 'index',       geo: 'em' },

  // ── ARK 혁신 ETF (캐시우드) ──
  'ARKK':  { ticker: 'ARKK',  name: 'ARK Innovation', sector: 'etf_blend', style: 'growth',     geo: 'us' },
  'ARKG':  { ticker: 'ARKG',  name: 'ARK Genomic',   sector: 'healthcare', style: 'speculative', geo: 'us' },
  'ARKW':  { ticker: 'ARKW',  name: 'ARK Next Gen',  sector: 'tech',       style: 'speculative', geo: 'us' },

  // ── 한국 주식 ──
  '005930':     { ticker: '005930',    name: '삼성전자',   sector: 'tech',      style: 'value',    geo: 'kr' },
  '005930.KS':  { ticker: '005930.KS', name: '삼성전자',   sector: 'tech',      style: 'value',    geo: 'kr' },
  '000660':     { ticker: '000660',    name: 'SK하이닉스', sector: 'tech',      style: 'growth',   geo: 'kr' },
  '000660.KS':  { ticker: '000660.KS', name: 'SK하이닉스', sector: 'tech',      style: 'growth',   geo: 'kr' },
  '035720':     { ticker: '035720',    name: '카카오',     sector: 'tech',      style: 'growth',   geo: 'kr' },
  '035720.KQ':  { ticker: '035720.KQ', name: '카카오',     sector: 'tech',      style: 'growth',   geo: 'kr' },
  '035420':     { ticker: '035420',    name: '네이버',     sector: 'tech',      style: 'growth',   geo: 'kr' },
  '035420.KS':  { ticker: '035420.KS', name: '네이버',     sector: 'tech',      style: 'growth',   geo: 'kr' },
  '068270':     { ticker: '068270',    name: '셀트리온',   sector: 'healthcare', style: 'growth',  geo: 'kr' },
  '068270.KS':  { ticker: '068270.KS', name: '셀트리온',   sector: 'healthcare', style: 'growth',  geo: 'kr' },
  '207940':     { ticker: '207940',    name: '삼성바이오', sector: 'healthcare', style: 'growth',  geo: 'kr' },
  '207940.KS':  { ticker: '207940.KS', name: '삼성바이오', sector: 'healthcare', style: 'growth',  geo: 'kr' },
  '006400':     { ticker: '006400',    name: '삼성SDI',    sector: 'materials', style: 'growth',   geo: 'kr' },
  '006400.KS':  { ticker: '006400.KS', name: '삼성SDI',    sector: 'materials', style: 'growth',   geo: 'kr' },
  '051910':     { ticker: '051910',    name: 'LG화학',     sector: 'materials', style: 'value',    geo: 'kr' },
  '051910.KS':  { ticker: '051910.KS', name: 'LG화학',     sector: 'materials', style: 'value',    geo: 'kr' },
  '000270':     { ticker: '000270',    name: '기아차',     sector: 'consumer',  style: 'value',    geo: 'kr' },
  '000270.KS':  { ticker: '000270.KS', name: '기아차',     sector: 'consumer',  style: 'value',    geo: 'kr' },
  '005380':     { ticker: '005380',    name: '현대차',     sector: 'consumer',  style: 'value',    geo: 'kr' },
  '005380.KS':  { ticker: '005380.KS', name: '현대차',     sector: 'consumer',  style: 'value',    geo: 'kr' },
  '055550':     { ticker: '055550',    name: '신한지주',   sector: 'finance',   style: 'dividend', geo: 'kr' },
  '055550.KS':  { ticker: '055550.KS', name: '신한지주',   sector: 'finance',   style: 'dividend', geo: 'kr' },
  '105560':     { ticker: '105560',    name: 'KB금융',     sector: 'finance',   style: 'dividend', geo: 'kr' },
  '105560.KS':  { ticker: '105560.KS', name: 'KB금융',     sector: 'finance',   style: 'dividend', geo: 'kr' },

  // ── 글로벌/신흥국 ──
  'BABA':  { ticker: 'BABA',  name: '알리바바',       sector: 'consumer',  style: 'value',       geo: 'em' },
  'TSM':   { ticker: 'TSM',   name: 'TSMC',           sector: 'tech',      style: 'value',       geo: 'em' },
  'ASML':  { ticker: 'ASML',  name: 'ASML',           sector: 'tech',      style: 'growth',      geo: 'global' },
  'SAP':   { ticker: 'SAP',   name: 'SAP',            sector: 'tech',      style: 'value',       geo: 'global' },
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 티커로 프로파일 조회 (대소문자 무관)
 * 없으면 null 반환
 */
export function getTickerProfile(ticker: string): TickerProfile | null {
  if (!ticker) return null;
  return TICKER_PROFILES[ticker] ?? TICKER_PROFILES[ticker.toUpperCase()] ?? null;
}

/**
 * 주식/ETF 자산의 스타일 구성비 계산 (0~100%)
 *
 * @param stockAssets - large_cap으로 분류된 자산 배열 (Asset 타입 서브셋)
 * @returns 각 스타일별 비중 (%)
 */
export function getStockComposition(
  stockAssets: { ticker?: string; currentValue?: number; avgPrice?: number; quantity?: number }[],
): {
  growth: number;
  value: number;
  dividend: number;
  speculative: number;
  index: number;
} {
  const empty = { growth: 0, value: 0, dividend: 0, speculative: 0, index: 0 };
  if (stockAssets.length === 0) return empty;

  const weights: Record<TickerStyle, number> = { growth: 0, value: 0, dividend: 0, speculative: 0, index: 0 };
  let total = 0;

  for (const a of stockAssets) {
    const v = a.currentValue ?? ((a.avgPrice ?? 0) * (a.quantity ?? 1));
    if (v <= 0) continue;
    total += v;
    const profile = getTickerProfile(a.ticker ?? '');
    // 미분류 티커 → 기본 'growth' 처리 (성장주 가정)
    const style: TickerStyle = profile?.style ?? 'growth';
    weights[style] += v;
  }

  if (total === 0) return empty;

  return {
    growth:     (weights.growth     / total) * 100,
    value:      (weights.value      / total) * 100,
    dividend:   (weights.dividend   / total) * 100,
    speculative:(weights.speculative / total) * 100,
    index:      (weights.index      / total) * 100,
  };
}

// ============================================================================
// 동적 캐시 (런타임에 Gemini가 분류한 미등록 티커 저장)
// ============================================================================

const DYNAMIC_PROFILES_KEY = '@baln:ticker_profiles_dynamic';

/** 인메모리 동적 캐시 (앱 세션 동안 AsyncStorage 재접근 최소화) */
const _dynamicCache: Record<string, TickerProfile> = {};
let _cacheLoaded = false;

/**
 * AsyncStorage → 인메모리 캐시 초기화 (앱 시작 시 1회 호출)
 * React Native AsyncStorage를 동적 임포트로 사용
 */
export async function initDynamicCache(): Promise<void> {
  if (_cacheLoaded) return;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(DYNAMIC_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, TickerProfile>;
      Object.assign(_dynamicCache, parsed);
    }
    _cacheLoaded = true;
  } catch {
    _cacheLoaded = true; // 실패해도 이후 재시도 방지
  }
}

/**
 * 동적 분류 결과 저장 (AsyncStorage + 인메모리)
 */
export async function saveDynamicProfile(profile: TickerProfile): Promise<void> {
  try {
    const key = profile.ticker.toUpperCase();
    _dynamicCache[key] = profile;
    _dynamicCache[profile.ticker] = profile; // 원본 케이스도 저장
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(DYNAMIC_PROFILES_KEY, JSON.stringify(_dynamicCache));
  } catch {
    // 캐시 저장 실패해도 인메모리는 유지
  }
}

/**
 * 티커 프로파일 조회 (정적 DB → 동적 캐시 순서로 탐색)
 * getTickerProfile의 캐시 포함 버전
 */
export function getCachedTickerProfile(ticker: string): TickerProfile | null {
  if (!ticker) return null;
  return (
    TICKER_PROFILES[ticker] ??
    TICKER_PROFILES[ticker.toUpperCase()] ??
    _dynamicCache[ticker] ??
    _dynamicCache[ticker.toUpperCase()] ??
    null
  );
}
