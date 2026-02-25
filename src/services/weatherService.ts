/**
 * 마을 날씨 서비스 — 실시간 날씨 + 시장 분위기 블렌딩
 *
 * 역할: "마을 기상청" — 실제 날씨를 가져와서 마을 날씨로 변환
 * - OpenWeather API로 사용자 위치 기반 실제 날씨 수집
 * - 시장 무드와 블렌딩: 실제 날씨 70% + 시장 무드 30%
 * - 기온에 따라 구루 옷차림(ClothingLevel) 결정
 * - AsyncStorage 30분 캐시 (API 호출 절약)
 *
 * 비용: OpenWeather 무료 티어 (60 calls/min, 1,000,000 calls/month)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import type { VillageWeather, ClothingLevel, WeatherCondition } from '../types/village';

// ============================================================================
// 상수
// ============================================================================

/** OpenWeather API 키 (추후 .env에서 설정) */
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '';
const DEFAULT_CITY = 'Seoul';
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

/** 캐시 키 & 유효 기간 (30분) */
const CACHE_KEY = '@baln:village_weather';
const CACHE_DURATION = 30 * 60 * 1000;

// ============================================================================
// OpenWeather → VillageWeather 매핑
// ============================================================================

/**
 * OpenWeather 날씨 코드 → 마을 날씨 상태 매핑
 * https://openweathermap.org/weather-conditions
 */
function mapWeatherCondition(code: number): WeatherCondition {
  // 2xx: Thunderstorm
  if (code >= 200 && code < 300) return 'storm';
  // 3xx: Drizzle
  if (code >= 300 && code < 400) return 'rain';
  // 5xx: Rain
  if (code >= 500 && code < 600) return 'rain';
  // 6xx: Snow
  if (code >= 600 && code < 700) return 'snow';
  // 7xx: Atmosphere (fog, mist, haze, etc.)
  if (code >= 700 && code < 800) return 'fog';
  // 800: Clear
  if (code === 800) return 'clear';
  // 801-804: Clouds
  if (code > 800 && code <= 804) return 'clouds';

  return 'clear'; // 기본값
}

/**
 * 기온(섭씨) → 옷차림 레벨
 *
 * 비유: "기온 온도계" — 기온에 따라 구루가 어떤 옷을 입을지 결정
 * - arctic: 영하 5도 이하, 풀 방한 장비
 * - winter: 영하~5도, 패딩 + 목도리
 * - warm: 5~15도, 재킷 + 긴팔
 * - normal: 15~24도, 기본 의상
 * - light: 24~30도, 반팔 + 선글라스
 * - summer: 30도 이상, 민소매 + 부채
 */
export function getClothingLevel(tempCelsius: number): ClothingLevel {
  if (tempCelsius >= 30) return 'summer';
  if (tempCelsius >= 24) return 'light';
  if (tempCelsius >= 15) return 'normal';
  if (tempCelsius >= 5) return 'warm';
  if (tempCelsius >= -5) return 'winter';
  return 'arctic';
}

/**
 * 현재 계절 계산 (북반구 기준, 한국)
 */
function getCurrentSeason(): VillageWeather['season'] {
  const month = new Date().getMonth() + 1; // 1~12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

// ============================================================================
// API 호출
// ============================================================================

/**
 * 실제 날씨 가져오기 (OpenWeather API)
 *
 * @param city 도시 이름 (기본값: Seoul)
 * @returns VillageWeather 객체 (시장 무드 미반영 — 순수 날씨)
 */
export async function fetchWeather(city?: string): Promise<VillageWeather> {
  const targetCity = city || DEFAULT_CITY;

  // API 키 없으면 시뮬레이션 폴백
  if (!OPENWEATHER_API_KEY) {
    if (__DEV__) console.log('[Weather] API 키 없음 → 시뮬레이션 날씨 사용');
    return getSimulatedWeather();
  }

  try {
    const url = `${API_BASE_URL}?q=${encodeURIComponent(targetCity)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`OpenWeather API 응답 실패: ${response.status}`);
    }

    const data = await response.json();

    const weatherCode: number = data.weather?.[0]?.id ?? 800;
    const condition = mapWeatherCondition(weatherCode);
    const tempCelsius: number = Math.round(data.main?.temp ?? 20);
    const humidity: number = data.main?.humidity ?? 50;
    const windSpeed: number = data.wind?.speed ?? 0;
    const description: string = data.weather?.[0]?.description ?? '';

    const weather: VillageWeather = {
      condition,
      temperature: tempCelsius,
      humidity,
      windSpeed,
      description,
      clothingLevel: getClothingLevel(tempCelsius),
      season: getCurrentSeason(),
      emoji: getWeatherEmoji(condition),
      updatedAt: new Date().toISOString(),
    };

    // 캐시에 저장
    await cacheWeather(weather);

    return weather;
  } catch (err) {
    if (__DEV__) console.error('[Weather] API 호출 실패:', err);
    Sentry.captureException(err, { tags: { service: 'weather', action: 'fetch' } });
    // 폴백
    return getSimulatedWeather();
  }
}

// ============================================================================
// 날씨 이모지 & 시각 유틸
// ============================================================================

/**
 * 날씨 상태 → 이모지
 */
export function getWeatherEmoji(condition: WeatherCondition): string {
  switch (condition) {
    case 'clear': return '☀️';
    case 'clouds': return '⛅';
    case 'rain': return '🌧️';
    case 'snow': return '❄️';
    case 'fog': return '🌫️';
    case 'storm': return '⛈️';
    case 'rainbow': return '🌈';
    default: return '☀️';
  }
}

/**
 * 날씨 상태 → 한국어/영어 설명
 */
export function getWeatherDescription(condition: WeatherCondition): { ko: string; en: string } {
  switch (condition) {
    case 'clear': return { ko: '맑음', en: 'Clear' };
    case 'clouds': return { ko: '구름 조금', en: 'Partly Cloudy' };
    case 'rain': return { ko: '비', en: 'Rainy' };
    case 'snow': return { ko: '눈', en: 'Snowy' };
    case 'fog': return { ko: '안개', en: 'Foggy' };
    case 'storm': return { ko: '폭풍', en: 'Stormy' };
    case 'rainbow': return { ko: '무지개', en: 'Rainbow' };
    default: return { ko: '맑음', en: 'Clear' };
  }
}

/**
 * 날씨 상태 → 배경색 (UI 힌트용)
 */
export function getWeatherBackgroundTint(condition: WeatherCondition): string {
  switch (condition) {
    case 'clear': return '#87CEEB';    // 맑은 하늘색
    case 'clouds': return '#B0BEC5';   // 회색빛 하늘
    case 'rain': return '#78909C';     // 비 오는 어두운 하늘
    case 'snow': return '#E3F2FD';     // 눈 오는 밝은 하늘
    case 'fog': return '#CFD8DC';      // 안개 낀 하늘
    case 'storm': return '#455A64';    // 폭풍 어두운 하늘
    case 'rainbow': return '#CE93D8';  // 무지개빛
    default: return '#87CEEB';
  }
}

// ============================================================================
// 시뮬레이션 날씨 (API 키 없거나 호출 실패 시)
// ============================================================================

/**
 * 시뮬레이션 날씨 — 시간/계절 기반으로 그럴듯한 날씨 생성
 * API 키가 없을 때 또는 네트워크 오류 시 사용
 */
export function getSimulatedWeather(): VillageWeather {
  const now = new Date();
  const hour = now.getHours();
  const season = getCurrentSeason();

  // 계절별 기본 기온
  const seasonBaseTemp: Record<string, number> = {
    spring: 15,
    summer: 28,
    autumn: 13,
    winter: -2,
  };
  const baseTemp = seasonBaseTemp[season] ?? 15;

  // 시간대별 변화 (낮 +5, 밤 -3)
  const hourModifier = hour >= 10 && hour <= 16 ? 5 : hour >= 22 || hour <= 5 ? -3 : 0;
  const temperature = baseTemp + hourModifier + Math.round((Math.random() - 0.5) * 4);

  // 계절별 날씨 확률
  const weatherPool: WeatherCondition[] = (() => {
    switch (season) {
      case 'spring': return ['clear', 'clear', 'clouds', 'rain'];
      case 'summer': return ['clear', 'clear', 'clouds', 'rain', 'storm'];
      case 'autumn': return ['clear', 'clouds', 'clouds', 'fog'];
      case 'winter': return ['clear', 'clouds', 'snow', 'snow'];
      default: return ['clear', 'clouds'];
    }
  })();

  // 일자(날짜) 기반 의사 난수 (같은 날 같은 결과 — 깜빡임 방지)
  const daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const hourBucket = Math.floor(hour / 3); // 3시간 단위
  const pseudoIndex = (daySeed + hourBucket) % weatherPool.length;
  const condition = weatherPool[pseudoIndex];

  return {
    condition,
    temperature,
    humidity: 40 + Math.round(Math.random() * 40),
    windSpeed: Math.round(Math.random() * 8),
    description: getWeatherDescription(condition).ko,
    clothingLevel: getClothingLevel(temperature),
    season,
    emoji: getWeatherEmoji(condition),
    updatedAt: now.toISOString(),
  };
}

// ============================================================================
// 시장 무드 블렌딩
// ============================================================================

/**
 * 시장 무드를 날씨에 블렌딩
 *
 * WORLD_DESIGN.md 규칙:
 * - 기본: 실제 날씨 70% + 시장 무드 30%
 * - 시장 급변 시 (-3%+ or +3%+): 시장 무드 70% + 실제 날씨 30%
 *
 * @param realWeather 실제 날씨
 * @param marketChange 시장 등락률 (-1~1 범위, 예: -0.05 = -5%)
 * @returns 블렌딩된 마을 날씨
 */
export function blendWeatherWithMarket(
  realWeather: VillageWeather,
  marketChange: number,
): VillageWeather {
  const isExtreme = Math.abs(marketChange) >= 0.03; // 3% 이상 급변

  // 시장 무드 → 날씨 조건
  let marketWeather: WeatherCondition;
  if (marketChange >= 0.03) {
    marketWeather = 'rainbow';    // 급등 → 무지개
  } else if (marketChange >= 0.01) {
    marketWeather = 'clear';      // 상승 → 맑음
  } else if (marketChange >= -0.01) {
    marketWeather = realWeather.condition; // 보합 → 실제 날씨 유지
  } else if (marketChange >= -0.03) {
    marketWeather = 'rain';       // 소폭 하락 → 비
  } else {
    marketWeather = 'storm';      // 급락 → 폭풍
  }

  // 블렌딩 결정: 시장이 극단적이면 시장 무드 우선, 아니면 실제 날씨 우선
  const finalCondition = isExtreme ? marketWeather : realWeather.condition;

  return {
    ...realWeather,
    condition: finalCondition,
    emoji: getWeatherEmoji(finalCondition),
    description: getWeatherDescription(finalCondition).ko,
  };
}

// ============================================================================
// 캐시 관리 (AsyncStorage, 30분 유효)
// ============================================================================

/**
 * 캐시된 날씨 가져오기 (30분 유효)
 */
export async function getCachedWeather(): Promise<VillageWeather | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const weather = JSON.parse(raw) as VillageWeather;
    const age = Date.now() - new Date(weather.updatedAt).getTime();

    if (age > CACHE_DURATION) {
      if (__DEV__) console.log('[Weather] 캐시 만료됨 (30분 초과)');
      return null;
    }

    return weather;
  } catch {
    return null;
  }
}

/**
 * 날씨를 캐시에 저장
 */
export async function cacheWeather(weather: VillageWeather): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(weather));
  } catch {
    // 저장 실패 무시
  }
}

/**
 * 날씨 가져오기 (캐시 우선 → API → 시뮬레이션)
 * 일반적으로 이 함수를 사용
 */
export async function getVillageWeather(city?: string): Promise<VillageWeather> {
  // 1. 캐시 확인
  const cached = await getCachedWeather();
  if (cached) return cached;

  // 2. API 호출
  return fetchWeather(city);
}
