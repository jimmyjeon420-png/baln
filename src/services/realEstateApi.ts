/**
 * 부동산 API 서비스 (Mock/실제 API 전환 가능)
 *
 * 비유: "부동산 정보 데스크"
 * - searchApartments: 아파트 단지 검색 (카카오 주소 API → 현재 Mock)
 * - getRecentTransactions: 실거래가 조회 (국토부 API → 현재 Mock)
 * - calculateEstimatedPrice: 면적별 예상 시세 계산 (순수 로직)
 *
 * API 키가 설정되면 자동으로 실제 API로 전환됩니다.
 */

import type {
  ApartmentComplex,
  RealEstateTransaction,
  AreaPriceSummary,
} from '../types/realestate';
import { sqmToPyeong } from '../types/realestate';

// ============================================================================
// API 키 확인 → Mock/실제 전환 플래그
// ============================================================================
const KAKAO_API_KEY = ''; // 나중에 환경변수로 교체
const MOLIT_API_KEY = ''; // 국토부 API 키
const USE_MOCK = !KAKAO_API_KEY || !MOLIT_API_KEY;

// ============================================================================
// Mock 데이터: 서울 주요 아파트 단지 20개
// ============================================================================
const MOCK_COMPLEXES: ApartmentComplex[] = [
  { lawdCd: '11680', address: '서울 강남구 대치동', complexName: '래미안대치팰리스', areas: [59, 84, 114], totalUnits: 1608, buildYear: 2015 },
  { lawdCd: '11680', address: '서울 강남구 도곡동', complexName: '도곡렉슬', areas: [59, 84, 122], totalUnits: 2486, buildYear: 2003 },
  { lawdCd: '11680', address: '서울 강남구 개포동', complexName: '래미안블레스티지', areas: [59, 84, 114], totalUnits: 1957, buildYear: 2020 },
  { lawdCd: '11650', address: '서울 서초구 반포동', complexName: '래미안원베일리', areas: [59, 84, 114], totalUnits: 2990, buildYear: 2023 },
  { lawdCd: '11650', address: '서울 서초구 반포동', complexName: '아크로리버파크', areas: [59, 84, 112], totalUnits: 1612, buildYear: 2016 },
  { lawdCd: '11650', address: '서울 서초구 잠원동', complexName: '래미안잠원리더스원', areas: [49, 59, 84], totalUnits: 1280, buildYear: 2024 },
  { lawdCd: '11710', address: '서울 송파구 잠실동', complexName: '잠실엘스', areas: [59, 84, 119], totalUnits: 5678, buildYear: 2008 },
  { lawdCd: '11710', address: '서울 송파구 잠실동', complexName: '잠실리센츠', areas: [59, 84, 112], totalUnits: 5563, buildYear: 2008 },
  { lawdCd: '11710', address: '서울 송파구 신천동', complexName: '파크리오', areas: [59, 84, 119], totalUnits: 6864, buildYear: 2008 },
  { lawdCd: '11560', address: '서울 영등포구 여의도동', complexName: '래미안에스티움', areas: [59, 84, 114], totalUnits: 1056, buildYear: 2022 },
  { lawdCd: '11440', address: '서울 마포구 아현동', complexName: '마포래미안푸르지오', areas: [59, 84, 114], totalUnits: 3885, buildYear: 2014 },
  { lawdCd: '11440', address: '서울 마포구 대흥동', complexName: '마포프레스티지자이', areas: [59, 84, 112], totalUnits: 1120, buildYear: 2018 },
  { lawdCd: '11500', address: '서울 강서구 마곡동', complexName: '마곡엠밸리7단지', areas: [59, 74, 84], totalUnits: 1274, buildYear: 2017 },
  { lawdCd: '11350', address: '서울 노원구 상계동', complexName: '상계주공5단지', areas: [49, 59, 72], totalUnits: 4260, buildYear: 1988 },
  { lawdCd: '11200', address: '서울 성동구 성수동', complexName: '서울숲트리마제', areas: [59, 84, 120], totalUnits: 648, buildYear: 2010 },
  { lawdCd: '11305', address: '서울 강북구 미아동', complexName: '래미안미아역', areas: [59, 74, 84], totalUnits: 1028, buildYear: 2020 },
  { lawdCd: '11590', address: '서울 동작구 흑석동', complexName: '흑석뉴타운롯데캐슬', areas: [59, 84, 114], totalUnits: 1450, buildYear: 2022 },
  { lawdCd: '11620', address: '서울 관악구 봉천동', complexName: '관악푸르지오', areas: [59, 76, 84], totalUnits: 964, buildYear: 2016 },
  { lawdCd: '41135', address: '경기 성남시 분당구 정자동', complexName: '파크뷰', areas: [59, 84, 114], totalUnits: 1230, buildYear: 2010 },
  { lawdCd: '41135', address: '경기 성남시 분당구 야탑동', complexName: '매화마을래미안', areas: [59, 84, 100], totalUnits: 1800, buildYear: 2002 },
];

/** 면적별 Mock 시세 (만원) - 강남권 기준 */
function getMockPriceMan(lawdCd: string, area: number): number {
  // 지역별 기본 단가 (만원/㎡)
  const basePricePerSqm: Record<string, number> = {
    '11680': 350, // 강남구
    '11650': 380, // 서초구
    '11710': 280, // 송파구
    '11560': 250, // 영등포구
    '11440': 220, // 마포구
    '11500': 180, // 강서구
    '11350': 100, // 노원구
    '11200': 270, // 성동구
    '11305': 130, // 강북구
    '11590': 200, // 동작구
    '11620': 160, // 관악구
    '41135': 180, // 분당구
  };

  const pricePerSqm = basePricePerSqm[lawdCd] || 150;
  // 약간의 랜덤 변동 (±5%) - 시드 기반으로 일관성 유지
  const hash = (lawdCd.charCodeAt(0) + area) % 10;
  const variance = 1 + (hash - 5) * 0.01;
  return Math.round(pricePerSqm * area * variance);
}

// ============================================================================
// 아파트 단지 검색
// ============================================================================

/**
 * 아파트 단지 검색
 * @param query - 검색어 (예: '래미안', '잠실')
 * @returns 매칭된 아파트 단지 목록
 */
export async function searchApartments(
  query: string,
): Promise<ApartmentComplex[]> {
  if (!query || query.length < 2) return [];

  if (USE_MOCK) {
    return searchApartmentsMock(query);
  }

  // TODO: 실제 카카오 주소 API 연동
  return searchApartmentsMock(query);
}

function searchApartmentsMock(query: string): ApartmentComplex[] {
  const q = query.toLowerCase().trim();
  return MOCK_COMPLEXES.filter(c =>
    c.complexName.toLowerCase().includes(q) ||
    c.address.toLowerCase().includes(q)
  );
}

// ============================================================================
// 실거래가 조회
// ============================================================================

/**
 * 특정 단지의 최근 실거래 내역 조회
 * @param lawdCd - 법정동코드
 * @param complexName - 단지명
 * @returns 최근 실거래 내역 (날짜 내림차순)
 */
export async function getRecentTransactions(
  lawdCd: string,
  complexName: string,
): Promise<RealEstateTransaction[]> {
  if (USE_MOCK) {
    return getRecentTransactionsMock(lawdCd, complexName);
  }

  // TODO: 실제 국토부 API 연동
  return getRecentTransactionsMock(lawdCd, complexName);
}

function getRecentTransactionsMock(
  lawdCd: string,
  complexName: string,
): RealEstateTransaction[] {
  const complex = MOCK_COMPLEXES.find(
    c => c.lawdCd === lawdCd && c.complexName === complexName,
  );
  if (!complex) return [];

  const transactions: RealEstateTransaction[] = [];
  const now = new Date();

  // 면적별 3~5건 Mock 거래 생성
  for (const area of complex.areas) {
    const basePrice = getMockPriceMan(lawdCd, area);
    const count = 3 + (area % 3); // 3~5건

    for (let i = 0; i < count; i++) {
      // 최근 1~12개월 랜덤 거래일
      const monthsAgo = i * 2 + 1;
      const dealDate = new Date(now);
      dealDate.setMonth(dealDate.getMonth() - monthsAgo);
      const dateStr = dealDate.toISOString().split('T')[0];

      // 가격 약간 변동 (최근일수록 비쌈)
      const priceVariance = 1 - i * 0.02;
      const dealPrice = Math.round(basePrice * priceVariance);

      transactions.push({
        dealDate: dateStr,
        dealAmountMan: dealPrice,
        area,
        floor: 5 + (i * 3) % 20,
        complexName,
        dongName: complex.address.split(' ').pop() || '',
      });
    }
  }

  // 날짜 내림차순 정렬
  return transactions.sort((a, b) =>
    new Date(b.dealDate).getTime() - new Date(a.dealDate).getTime()
  );
}

// ============================================================================
// 시세 계산 (순수 로직, API 불필요)
// ============================================================================

/**
 * 실거래 내역에서 면적별 시세 요약 계산
 * @param transactions - 실거래 내역
 * @param targetArea - 특정 면적만 필터 (선택)
 * @returns 면적별 시세 요약
 */
export function calculateEstimatedPrice(
  transactions: RealEstateTransaction[],
  targetArea?: number,
): AreaPriceSummary[] {
  // 면적별 그룹핑
  const areaGroups = new Map<number, RealEstateTransaction[]>();

  for (const tx of transactions) {
    if (targetArea && Math.abs(tx.area - targetArea) > 2) continue;

    const key = Math.round(tx.area);
    if (!areaGroups.has(key)) {
      areaGroups.set(key, []);
    }
    areaGroups.get(key)!.push(tx);
  }

  const summaries: AreaPriceSummary[] = [];

  for (const [area, txs] of areaGroups) {
    // 날짜 내림차순 정렬
    const sorted = txs.sort((a, b) =>
      new Date(b.dealDate).getTime() - new Date(a.dealDate).getTime()
    );

    const latestPrice = sorted[0].dealAmountMan * 10000; // 만원 → 원
    const recent3 = sorted.slice(0, 3);
    const avgPrice = Math.round(
      (recent3.reduce((s, t) => s + t.dealAmountMan, 0) / recent3.length) * 10000,
    );

    // 변동률: 최신 vs 가장 오래된 거래
    const oldestPrice = sorted[sorted.length - 1].dealAmountMan;
    const changeRate =
      oldestPrice > 0
        ? Math.round(((sorted[0].dealAmountMan - oldestPrice) / oldestPrice) * 1000) / 10
        : 0;

    const pyeong = sqmToPyeong(area);

    summaries.push({
      area,
      pyeongLabel: `${Math.round(pyeong)}평`,
      avgPrice,
      latestPrice,
      changeRate,
      transactionCount: sorted.length,
    });
  }

  // 면적 오름차순 정렬
  return summaries.sort((a, b) => a.area - b.area);
}

/**
 * 금액 포맷 (억/만원 단위)
 * @param amount - 원 단위 금액
 * @returns 포맷된 문자열 (예: '15억 2,000만')
 */
export function formatPrice(amount: number): string {
  const man = Math.round(amount / 10000);
  if (man >= 10000) {
    const eok = Math.floor(man / 10000);
    const rest = man % 10000;
    if (rest === 0) return `${eok}억`;
    return `${eok}억 ${rest.toLocaleString()}만`;
  }
  return `${man.toLocaleString()}만원`;
}
