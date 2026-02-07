/**
 * 카카오 로컬 검색 서비스
 * 장소 키워드 검색 → 좌표 + 주소 반환
 * (모임 생성 시 장소 자동완성에 사용)
 */

import axios from 'axios';

// 카카오 API에서 받는 원본 장소 데이터
interface KakaoPlace {
  place_name: string;
  address_name: string;       // 지번 주소
  road_address_name: string;  // 도로명 주소
  x: string;                  // 경도 (longitude)
  y: string;                  // 위도 (latitude)
  category_group_name: string;
}

// 앱에서 사용하는 정제된 장소 데이터
export interface ParsedPlace {
  name: string;
  address: string;       // 도로명 우선, 없으면 지번
  latitude: number;
  longitude: number;
  category: string;
}

const KAKAO_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
const BASE_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

/**
 * 카카오 키워드 장소 검색
 * @param query 검색어 (예: "판교역", "강남 스타벅스")
 * @param size 결과 개수 (기본 5개, 최대 15)
 * @returns 정제된 장소 배열 (API 실패 시 빈 배열)
 */
export async function searchPlaces(query: string, size: number = 5): Promise<ParsedPlace[]> {
  // API 키가 없거나 플레이스홀더면 빈 배열 반환 (수동 입력 가능)
  if (!KAKAO_API_KEY || KAKAO_API_KEY === '여기에_카카오_REST_API_키_입력') {
    return [];
  }

  // 검색어가 너무 짧으면 스킵
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await axios.get(BASE_URL, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`,
      },
      params: {
        query: query.trim(),
        size,
      },
      timeout: 5000,
    });

    const documents: KakaoPlace[] = response.data?.documents || [];

    return documents.map((doc) => ({
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name,
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
      category: doc.category_group_name || '',
    }));
  } catch {
    // API 실패 시 빈 배열 → 사용자는 수동 입력 가능
    return [];
  }
}
