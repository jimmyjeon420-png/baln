/**
 * 부동산 API 서비스 (카카오 검색 + 국토부 실거래가)
 *
 * 비유: "부동산 정보 데스크"
 * - searchApartments: 카카오 키워드 검색 API → 전국 모든 아파트 검색
 * - getRecentTransactions: 국토부 실거래가 API → 실제 거래 내역 조회
 * - calculateEstimatedPrice: 면적별 예상 시세 계산 (순수 로직)
 *
 * API 키가 비어있으면 자동으로 Mock 모드로 전환됩니다.
 */

import type {
  ApartmentComplex,
  RealEstateTransaction,
  AreaPriceSummary,
} from '../types/realestate';
import { sqmToPyeong } from '../types/realestate';
import { extractLawdCd } from './lawdCodeMap';

// ============================================================================
// API 키 설정 — 환경변수에서 로드 (.env 파일에 설정)
// ⚠️ 보안 경고: API 키를 절대 소스 코드에 하드코딩하지 마세요.
//    반드시 .env 파일 또는 환경변수를 통해 주입하세요.
// ============================================================================
const KAKAO_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '';
const MOLIT_API_KEY = process.env.EXPO_PUBLIC_MOLIT_API_KEY || '';
const USE_MOCK = !KAKAO_API_KEY || !MOLIT_API_KEY;

// ============================================================================
// 카카오 키워드 검색 API
// ============================================================================

interface KakaoPlace {
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
  x: string; // 경도
  y: string; // 위도
}

interface KakaoSearchResponse {
  documents: KakaoPlace[];
  meta: { total_count: number; is_end: boolean };
}

/**
 * 카카오 키워드 검색으로 아파트 단지 찾기
 * - 검색어에 "아파트"가 없으면 자동 추가
 * - 결과에서 아파트/부동산 카테고리만 필터
 * - 주소에서 법정동코드 자동 추출
 */
async function searchApartmentsKakao(query: string): Promise<ApartmentComplex[]> {
  // 검색어 변형: 원본 + "아파트" 붙인 버전 병렬 검색 (결과 극대화)
  const queries: string[] = [query];
  if (!query.includes('아파트')) {
    queries.push(`${query} 아파트`);
  }

  // 각 검색어 × 3페이지 병렬 조회 (카카오 최대 size=45, page=1~3)
  const fetchPage = async (q: string, page: number): Promise<KakaoPlace[]> => {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=45&page=${page}`;
    try {
      const response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return [];
      const data: KakaoSearchResponse = await response.json();
      return data.documents;
    } catch {
      return [];
    }
  };

  // 검색어별 페이지 1~2 병렬 요청 (총 최대 4개 요청)
  const allRequests = queries.flatMap(q => [fetchPage(q, 1), fetchPage(q, 2)]);
  const pageResults = await Promise.all(allRequests);
  const allDocuments = pageResults.flat();

  if (allDocuments.length === 0) {
    console.warn('[부동산] 카카오 API 결과 없음');
    return searchApartmentsMock(query);
  }

  // 아파트 브랜드 정규식 (최대한 넓게)
  const BRAND_REGEX = /래미안|자이|힐스테이트|롯데캐슬|e편한|푸르지오|아크로|엘리|더샵|파크리오|리센츠|엘스|트리마제|SK뷰|현대|대림|한화|두산위브|쌍용|동아|우방|금호|한신|삼성|대우|코오롱|LG|포스코|위브|센트럴|삼환|벽산|동부|한라|우성|신동아|주공|호반|중흥|부영|계룡|태영|동원|일신|극동|경남|유림|세영|청구|장미|동문|아이파크|더프라임|꿈에그린|한양|미래|대방|대성|태왕|남양|진흥|동진|럭키|한일|쌍떼빌|이편한|피렌체|프레스티지|메이저|그랑시티|하이츠|빌리브|디에이치/;

  // 아파트/부동산 관련 결과 필터 (최대한 관대하게)
  const apartmentPlaces = allDocuments.filter(doc => {
    // 카테고리 기반 (가장 정확)
    if (doc.category_name.includes('아파트')) return true;
    if (doc.category_name.includes('부동산')) return true;
    if (doc.category_name.includes('주거')) return true;
    if (doc.category_name.includes('주택')) return true;

    // 장소명 기반
    if (doc.place_name.includes('아파트')) return true;
    if (doc.place_name.includes('단지')) return true;
    if (doc.place_name.includes('타운')) return true;
    if (doc.place_name.includes('빌라')) return true;
    if (doc.place_name.includes('맨션')) return true;

    // 브랜드명 매칭
    if (BRAND_REGEX.test(doc.place_name)) return true;

    return false;
  });

  // 중복 제거 (같은 단지명 + 같은 구/군)
  const seen = new Set<string>();
  const results: ApartmentComplex[] = [];

  for (const place of apartmentPlaces) {
    // address_name과 road_address_name 모두 시도
    let lawdCd = extractLawdCd(place.address_name);
    if (!lawdCd && place.road_address_name) {
      lawdCd = extractLawdCd(place.road_address_name);
    }
    if (!lawdCd) {
      if (__DEV__) console.log('[부동산] lawdCd 매칭 실패 (건너뜀):', place.address_name, place.place_name);
      continue;
    }

    const cleanName = place.place_name
      .replace(/\s*아파트\s*$/, '')
      .replace(/\s*\d+단지\s*아파트\s*$/, '')
      .trim() || place.place_name;

    const dedupeKey = `${lawdCd}-${cleanName}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    results.push({
      lawdCd,
      address: place.address_name,
      complexName: cleanName,
      areas: [],
    });
  }

  return results;
}

// ============================================================================
// 국토부 아파트매매 실거래 상세 자료 API
// ============================================================================

/**
 * 국토부 API 응답 XML에서 거래 내역 파싱
 * - 정규식 기반 경량 파서 (XML 파서 패키지 불필요)
 */
function parseMolitXml(xml: string, filterComplexName?: string): RealEstateTransaction[] {
  const transactions: RealEstateTransaction[] = [];

  // <item>...</item> 블록 추출
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    // 각 필드 추출 (태그 안의 값)
    const getValue = (tag: string): string => {
      const r = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*<\\/${tag}>`);
      const m = block.match(r);
      return m ? m[1].trim() : '';
    };

    const aptName = getValue('아파트');
    const dealAmount = getValue('거래금액').replace(/,/g, '');
    const area = getValue('전용면적');
    const floor = getValue('층');
    const year = getValue('년');
    const month = getValue('월');
    const day = getValue('일');
    const dong = getValue('법정동');
    const lawdCd = getValue('지역코드');

    // 단지명 필터 (지정된 경우)
    if (filterComplexName && !aptName.includes(filterComplexName)) continue;

    // 필수 값 검증
    if (!dealAmount || !area || !year || !month) continue;

    const dealDate = `${year}-${month.padStart(2, '0')}-${(day || '1').padStart(2, '0')}`;

    transactions.push({
      dealDate,
      dealAmountMan: parseInt(dealAmount, 10), // 만원 단위
      area: parseFloat(area),
      floor: parseInt(floor, 10) || 0,
      complexName: aptName,
      dongName: dong,
    });
  }

  return transactions;
}

/**
 * 국토부 실거래가 API로 최근 거래 내역 조회
 * - 최근 6개월 병렬 조회 (Promise.allSettled)
 * - 단지명 필터링
 */
async function getRecentTransactionsMolit(
  lawdCd: string,
  complexName: string,
): Promise<RealEstateTransaction[]> {
  const now = new Date();
  const months: string[] = [];

  // 최근 6개월의 YYYYMM 생성
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(ym);
  }

  // 6개월 병렬 조회 (월별 2페이지씩 — 거래 500건 초과 지역 대응)
  const fetchMolitPage = async (ym: string, pageNo: number): Promise<RealEstateTransaction[]> => {
    const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(MOLIT_API_KEY)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${pageNo}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[부동산] 국토부 API 에러 (${ym}, p${pageNo}):`, response.status);
      return [];
    }

    const xml = await response.text();
    return parseMolitXml(xml, complexName);
  };

  const results = await Promise.allSettled(
    months.map(ym => fetchMolitPage(ym, 1))
  );

  // 성공한 결과만 합치기
  const allTransactions: RealEstateTransaction[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allTransactions.push(...result.value);
    }
  }

  // 날짜 내림차순 정렬
  return allTransactions.sort(
    (a, b) => new Date(b.dealDate).getTime() - new Date(a.dealDate).getTime()
  );
}

// ============================================================================
// Mock 데이터 (API 키 없을 때 폴백)
// ============================================================================

const MOCK_COMPLEXES: ApartmentComplex[] = [
  { lawdCd: '11680', address: '서울 강남구 대치동', complexName: '래미안대치팰리스', areas: [59, 84, 114], totalUnits: 1608, buildYear: 2015 },
  { lawdCd: '11680', address: '서울 강남구 도곡동', complexName: '도곡렉슬', areas: [59, 84, 122], totalUnits: 2486, buildYear: 2003 },
  { lawdCd: '11680', address: '서울 강남구 개포동', complexName: '래미안블레스티지', areas: [59, 84, 114], totalUnits: 1957, buildYear: 2020 },
  { lawdCd: '11680', address: '서울 강남구 대치동', complexName: '은마아파트', areas: [76, 84], totalUnits: 4424, buildYear: 1979 },
  { lawdCd: '11680', address: '서울 강남구 압구정동', complexName: '현대아파트', areas: [84, 109, 145], totalUnits: 5400, buildYear: 1987 },
  { lawdCd: '11680', address: '서울 강남구 삼성동', complexName: '래미안라클래시', areas: [59, 84, 114], totalUnits: 1304, buildYear: 2020 },
  { lawdCd: '11650', address: '서울 서초구 반포동', complexName: '래미안원베일리', areas: [59, 84, 114], totalUnits: 2990, buildYear: 2023 },
  { lawdCd: '11650', address: '서울 서초구 반포동', complexName: '아크로리버파크', areas: [59, 84, 112], totalUnits: 1612, buildYear: 2016 },
  { lawdCd: '11650', address: '서울 서초구 잠원동', complexName: '래미안잠원리더스원', areas: [49, 59, 84], totalUnits: 1280, buildYear: 2024 },
  { lawdCd: '11650', address: '서울 서초구 서초동', complexName: '래미안서초에스티지S', areas: [59, 84, 114], totalUnits: 600, buildYear: 2024 },
  { lawdCd: '11710', address: '서울 송파구 잠실동', complexName: '잠실엘스', areas: [59, 84, 119], totalUnits: 5678, buildYear: 2008 },
  { lawdCd: '11710', address: '서울 송파구 잠실동', complexName: '잠실리센츠', areas: [59, 84, 112], totalUnits: 5563, buildYear: 2008 },
  { lawdCd: '11710', address: '서울 송파구 신천동', complexName: '파크리오', areas: [59, 84, 119], totalUnits: 6864, buildYear: 2008 },
  { lawdCd: '11710', address: '서울 송파구 가락동', complexName: '헬리오시티', areas: [59, 84, 99], totalUnits: 9510, buildYear: 2018 },
  { lawdCd: '11560', address: '서울 영등포구 여의도동', complexName: '래미안에스티움', areas: [59, 84, 114], totalUnits: 1056, buildYear: 2022 },
  { lawdCd: '11560', address: '서울 영등포구 여의도동', complexName: '시범아파트', areas: [79, 92, 108], totalUnits: 1584, buildYear: 1971 },
  { lawdCd: '11440', address: '서울 마포구 아현동', complexName: '마포래미안푸르지오', areas: [59, 84, 114], totalUnits: 3885, buildYear: 2014 },
  { lawdCd: '11440', address: '서울 마포구 대흥동', complexName: '마포프레스티지자이', areas: [59, 84, 112], totalUnits: 1120, buildYear: 2018 },
  { lawdCd: '11440', address: '서울 마포구 상암동', complexName: '상암월드컵파크', areas: [59, 84, 101], totalUnits: 2380, buildYear: 2014 },
  { lawdCd: '11500', address: '서울 강서구 마곡동', complexName: '마곡엠밸리7단지', areas: [59, 74, 84], totalUnits: 1274, buildYear: 2017 },
  { lawdCd: '11350', address: '서울 노원구 상계동', complexName: '상계주공5단지', areas: [49, 59, 72], totalUnits: 4260, buildYear: 1988 },
  { lawdCd: '11350', address: '서울 노원구 중계동', complexName: '중계무지개', areas: [59, 76, 84], totalUnits: 2274, buildYear: 1993 },
  { lawdCd: '11200', address: '서울 성동구 성수동', complexName: '서울숲트리마제', areas: [59, 84, 120], totalUnits: 648, buildYear: 2010 },
  { lawdCd: '11200', address: '서울 성동구 행당동', complexName: '서울숲더샵', areas: [59, 84, 114], totalUnits: 1127, buildYear: 2020 },
  { lawdCd: '11305', address: '서울 강북구 미아동', complexName: '래미안미아역', areas: [59, 74, 84], totalUnits: 1028, buildYear: 2020 },
  { lawdCd: '11590', address: '서울 동작구 흑석동', complexName: '흑석뉴타운롯데캐슬', areas: [59, 84, 114], totalUnits: 1450, buildYear: 2022 },
  { lawdCd: '11620', address: '서울 관악구 봉천동', complexName: '관악푸르지오', areas: [59, 76, 84], totalUnits: 964, buildYear: 2016 },
  { lawdCd: '11170', address: '서울 용산구 한남동', complexName: '한남더힐', areas: [120, 170, 244], totalUnits: 600, buildYear: 2011 },
  { lawdCd: '11170', address: '서울 용산구 이촌동', complexName: '래미안첼리투스', areas: [59, 84, 114], totalUnits: 1080, buildYear: 2015 },
  { lawdCd: '11740', address: '서울 강동구 고덕동', complexName: '고덕그라시움', areas: [59, 84, 102], totalUnits: 4932, buildYear: 2019 },
  { lawdCd: '11470', address: '서울 양천구 목동', complexName: '목동신시가지7단지', areas: [63, 79, 95], totalUnits: 2040, buildYear: 1986 },
  { lawdCd: '11215', address: '서울 광진구 광장동', complexName: '광장현대', areas: [59, 84, 105], totalUnits: 3360, buildYear: 1981 },
  // 경기도
  { lawdCd: '41135', address: '경기 성남시 분당구 정자동', complexName: '파크뷰', areas: [59, 84, 114], totalUnits: 1230, buildYear: 2010 },
  { lawdCd: '41135', address: '경기 성남시 분당구 야탑동', complexName: '매화마을래미안', areas: [59, 84, 100], totalUnits: 1800, buildYear: 2002 },
  { lawdCd: '41135', address: '경기 성남시 분당구 수내동', complexName: '파크타운', areas: [49, 66, 84], totalUnits: 3200, buildYear: 1992 },
  { lawdCd: '41117', address: '경기 수원시 영통구 매탄동', complexName: '매탄위브하늘채', areas: [59, 84, 101], totalUnits: 2560, buildYear: 2012 },
  { lawdCd: '41465', address: '경기 용인시 수지구 성복동', complexName: '성복역롯데캐슬', areas: [59, 84, 119], totalUnits: 1050, buildYear: 2016 },
  { lawdCd: '41285', address: '경기 고양시 일산동구 장항동', complexName: '킨텍스꿈에그린', areas: [59, 84, 101], totalUnits: 1800, buildYear: 2010 },
  { lawdCd: '41360', address: '경기 남양주시 다산동', complexName: '다산자이', areas: [59, 84, 99], totalUnits: 3200, buildYear: 2020 },
  { lawdCd: '41590', address: '경기 화성시 동탄동', complexName: '동탄역시범더샵', areas: [59, 84, 101], totalUnits: 2000, buildYear: 2017 },
  { lawdCd: '41190', address: '경기 부천시 중동', complexName: '중동신도시푸르지오', areas: [59, 84, 101], totalUnits: 1650, buildYear: 2009 },
  { lawdCd: '41450', address: '경기 하남시 감일동', complexName: '감일스위첸', areas: [59, 84, 99], totalUnits: 1800, buildYear: 2021 },
  // 광역시
  { lawdCd: '26350', address: '부산 해운대구 우동', complexName: '해운대엘시티', areas: [84, 101, 162], totalUnits: 4092, buildYear: 2019 },
  { lawdCd: '26350', address: '부산 해운대구 재송동', complexName: '해운대자이', areas: [59, 84, 101], totalUnits: 3500, buildYear: 2014 },
  { lawdCd: '27260', address: '대구 수성구 범어동', complexName: '범어자이', areas: [84, 101, 134], totalUnits: 550, buildYear: 2012 },
  { lawdCd: '28185', address: '인천 연수구 송도동', complexName: '송도더샵퍼스트파크', areas: [59, 84, 114], totalUnits: 1200, buildYear: 2018 },
  { lawdCd: '30200', address: '대전 유성구 도룡동', complexName: '도룡SK리더스뷰', areas: [84, 101, 134], totalUnits: 800, buildYear: 2015 },
  { lawdCd: '29200', address: '광주 광산구 수완동', complexName: '수완호반베르디움', areas: [59, 84, 101], totalUnits: 1400, buildYear: 2012 },
];

/** 면적별 Mock 시세 (만원) */
function getMockPriceMan(lawdCd: string, area: number): number {
  const basePricePerSqm: Record<string, number> = {
    '11680': 350, '11650': 380, '11710': 280, '11560': 250,
    '11440': 220, '11500': 180, '11350': 100, '11200': 270,
    '11305': 130, '11590': 200, '11620': 160, '11170': 400,
    '11740': 200, '11470': 200, '11215': 180,
    '41135': 180, '41117': 120, '41465': 130, '41285': 100,
    '41360': 110, '41590': 120, '41190': 100, '41450': 130,
    '26350': 150, '27260': 130, '28185': 100, '30200': 80,
    '29200': 60,
  };
  const pricePerSqm = basePricePerSqm[lawdCd] || 100;
  const hash = (lawdCd.charCodeAt(0) + area) % 10;
  const variance = 1 + (hash - 5) * 0.01;
  return Math.round(pricePerSqm * area * variance);
}

function searchApartmentsMock(query: string): ApartmentComplex[] {
  const q = query.toLowerCase().trim();
  return MOCK_COMPLEXES.filter(c =>
    c.complexName.toLowerCase().includes(q) ||
    c.address.toLowerCase().includes(q)
  );
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

  for (const area of complex.areas) {
    const basePrice = getMockPriceMan(lawdCd, area);
    const count = 3 + (area % 3);

    for (let i = 0; i < count; i++) {
      const monthsAgo = i * 2 + 1;
      const dealDate = new Date(now);
      dealDate.setMonth(dealDate.getMonth() - monthsAgo);
      const dateStr = dealDate.toISOString().split('T')[0];

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

  return transactions.sort((a, b) =>
    new Date(b.dealDate).getTime() - new Date(a.dealDate).getTime()
  );
}

// ============================================================================
// 공개 API: 검색 + 실거래가 조회
// ============================================================================

/**
 * 아파트 단지 검색
 * - API 키 있음 → 카카오 키워드 검색 (전국 모든 아파트)
 * - API 키 없음 → Mock 데이터 (~48개 단지)
 */
export async function searchApartments(
  query: string,
): Promise<ApartmentComplex[]> {
  if (!query || query.length < 2) return [];

  if (USE_MOCK) {
    return searchApartmentsMock(query);
  }

  try {
    return await searchApartmentsKakao(query);
  } catch (error) {
    console.warn('[부동산] 카카오 검색 실패, Mock 폴백:', error);
    return searchApartmentsMock(query);
  }
}

/**
 * 특정 단지의 최근 실거래 내역 조회
 * - API 키 있음 → 국토부 실거래가 API (최근 6개월)
 * - API 키 없음 → Mock 거래 생성
 */
export async function getRecentTransactions(
  lawdCd: string,
  complexName: string,
): Promise<RealEstateTransaction[]> {
  if (USE_MOCK) {
    return getRecentTransactionsMock(lawdCd, complexName);
  }

  try {
    return await getRecentTransactionsMolit(lawdCd, complexName);
  } catch (error) {
    console.warn('[부동산] 국토부 API 실패, Mock 폴백:', error);
    return getRecentTransactionsMock(lawdCd, complexName);
  }
}

// ============================================================================
// 시세 계산 (순수 로직, API 불필요)
// ============================================================================

/**
 * 실거래 내역에서 면적별 시세 요약 계산
 */
export function calculateEstimatedPrice(
  transactions: RealEstateTransaction[],
  targetArea?: number,
): AreaPriceSummary[] {
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
    const sorted = txs.sort((a, b) =>
      new Date(b.dealDate).getTime() - new Date(a.dealDate).getTime()
    );

    const latestPrice = sorted[0].dealAmountMan * 10000;
    const recent3 = sorted.slice(0, 3);
    const avgPrice = Math.round(
      (recent3.reduce((s, t) => s + t.dealAmountMan, 0) / recent3.length) * 10000,
    );

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

  return summaries.sort((a, b) => a.area - b.area);
}

/**
 * 금액 포맷 (억/만원 단위)
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
