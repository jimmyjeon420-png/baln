/**
 * 부동산 자산 관련 타입 정의
 * 카카오 주소 검색 → 국토부 실거래가 → 포트폴리오 등록 흐름에서 사용
 */

/** 아파트 단지 검색 결과 (카카오 주소 API 또는 Mock) */
export interface ApartmentComplex {
  /** 법정동코드 (5자리, 예: '11680') */
  lawdCd: string;
  /** 법정동 주소 (예: '서울특별시 강남구 대치동') */
  address: string;
  /** 단지명 (예: '래미안대치팰리스') */
  complexName: string;
  /** 대표 전용면적 목록 (㎡) */
  areas: number[];
  /** 세대수 (참고 정보) */
  totalUnits?: number;
  /** 준공년도 */
  buildYear?: number;
}

/** 실거래 내역 1건 (국토부 API 또는 Mock) */
export interface RealEstateTransaction {
  /** 거래 날짜 (YYYY-MM-DD) */
  dealDate: string;
  /** 거래 금액 (만원 단위) */
  dealAmountMan: number;
  /** 전용면적 (㎡) */
  area: number;
  /** 층 */
  floor: number;
  /** 단지명 */
  complexName: string;
  /** 법정동 */
  dongName: string;
}

/** 면적별 시세 요약 */
export interface AreaPriceSummary {
  /** 전용면적 (㎡) */
  area: number;
  /** 평형 표시 (예: '34평') */
  pyeongLabel: string;
  /** 최근 3건 평균가 (원) */
  avgPrice: number;
  /** 최신 거래가 (원) */
  latestPrice: number;
  /** 전년 대비 변동률 (%) */
  changeRate: number;
  /** 거래 건수 */
  transactionCount: number;
}

/** DB 캐시 (realestate_price_cache 테이블) */
export interface RealEstatePriceCache {
  id: string;
  lawdCd: string;
  complexName: string;
  unitArea: number;
  latestPrice: number;
  avgPrice3: number;
  priceChangeRate: number;
  lastTransactionDate: string | null;
  transactionCount: number;
  rawTransactions: RealEstateTransaction[];
  updatedAt: string;
}

/** 포트폴리오 저장용 입력 데이터 */
export interface RealEstatePortfolioInput {
  /** 법정동코드 */
  lawdCd: string;
  /** 단지명 */
  complexName: string;
  /** 전용면적 (㎡) */
  unitArea: number;
  /** 동호수 (선택) */
  unitDetail?: string;
  /** 매입가 (원) */
  purchasePrice: number;
  /** 현재 시세 (원, 최근 3건 평균) */
  currentPrice: number;
}

/** ㎡ → 평 변환 (3.3058로 나눔) */
export function sqmToPyeong(sqm: number): number {
  return Math.round(sqm / 3.3058 * 10) / 10;
}

/** 부동산 ticker 생성 규칙: RE_{lawdCd}_{약칭}_{면적} */
export function makeRealEstateTicker(
  lawdCd: string,
  complexName: string,
  area: number,
): string {
  // 단지명에서 공백/특수문자 제거, 최대 10자
  const shortName = complexName.replace(/[^가-힣a-zA-Z0-9]/g, '').slice(0, 10);
  const areaStr = Math.round(area).toString();
  return `RE_${lawdCd}_${shortName}_${areaStr}`;
}
