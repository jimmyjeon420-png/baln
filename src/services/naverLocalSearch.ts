/**
 * 네이버 지역 검색 서비스
 * 장소 키워드 검색 → 좌표 + 주소 반환
 * (카카오 API 대체용 - 부동산 검색에 사용)
 */

import axios from 'axios';

// 네이버 API에서 받는 원본 장소 데이터
interface NaverPlace {
  title: string;          // 장소명 (HTML 태그 포함 가능: <b>검색어</b>)
  address: string;        // 지번 주소
  roadAddress: string;    // 도로명 주소
  mapx: string;          // 경도 (KATECH 좌표계, 100000 곱해진 값)
  mapy: string;          // 위도 (KATECH 좌표계, 100000 곱해진 값)
  category: string;       // 카테고리 (예: "부동산>아파트")
}

// 앱에서 사용하는 정제된 장소 데이터 (카카오 API와 동일 인터페이스)
export interface ParsedPlace {
  name: string;
  address: string;       // 도로명 우선, 없으면 지번
  latitude: number;
  longitude: number;
  category: string;
}

const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET;
const BASE_URL = 'https://openapi.naver.com/v1/search/local.json';

/**
 * HTML 태그 제거 (네이버는 검색어를 <b>태그로 감쌈)
 * @param text "<b>판교</b>역 맛집" → "판교역 맛집"
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<\/?[^>]+(>|$)/g, '');
}

/**
 * 네이버 키워드 장소 검색
 * @param query 검색어 (예: "판교역", "강남 스타벅스", "서울 아파트")
 * @param size 결과 개수 (기본 5개, 최대 5)
 * @returns 정제된 장소 배열 (API 실패 시 빈 배열)
 */
export async function searchPlaces(query: string, size: number = 5): Promise<ParsedPlace[]> {
  // API 키가 없거나 플레이스홀더면 빈 배열 반환 (수동 입력 가능)
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.log('[NaverSearch] API 키 미설정. EXPO_PUBLIC_NAVER_CLIENT_ID/SECRET를 .env에 설정하세요.');
    return [];
  }

  // 검색어가 너무 짧으면 스킵
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await axios.get(BASE_URL, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
      params: {
        query: query.trim(),
        display: Math.min(size, 5), // 네이버는 최대 5개
      },
      timeout: 5000,
    });

    const items: NaverPlace[] = response.data?.items || [];

    return items.map((item) => ({
      name: stripHtmlTags(item.title),
      address: item.roadAddress || item.address,
      // 네이버 좌표는 KATECH 좌표계 (100000 곱해진 값)를 WGS84로 변환
      latitude: parseInt(item.mapy) / 1000000,
      longitude: parseInt(item.mapx) / 1000000,
      category: item.category || '',
    }));
  } catch (error: any) {
    // API 실패 시 원인 로깅 → 사용자는 수동 입력 가능
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      console.warn('[NaverSearch] 인증 실패. 네이버 개발자 센터에서 Client ID/Secret를 확인하세요.');
    } else {
      console.warn('[NaverSearch] API 호출 실패:', status || error?.message);
    }
    return [];
  }
}
