/**
 * E2E Integration Test: 맥락 카드 읽기 흐름
 *
 * 테스트 시나리오:
 * - 오늘의 맥락 카드 조회 (유효 구조 검증)
 * - 필수 필드 존재 확인
 * - Stale 카드 감지 (3시간 기준)
 * - DB 없을 때 폴백 카드 반환
 * - 시간대 슬롯 계산
 */

import {
  getFallbackContextCard,
  isCardStale,
  getCurrentContextTimeSlot,
  getCachedCard,
  setCachedCard,
} from '../../services/contextCardService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Mock 설정
// ============================================================================

jest.mock('../../services/supabase');
jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => 'ko'),
  t: jest.fn((key: string) => key),
}));
jest.mock('../../context/LocaleContext', () => ({
  getCurrentDisplayLanguage: jest.fn(() => 'ko'),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// ============================================================================
// 테스트
// ============================================================================

describe('맥락 카드 읽기 흐름 (E2E Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-07T06:00:00Z')); // KST 15:00
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 1. 폴백 카드 유효 구조
  // --------------------------------------------------------------------------

  it('폴백 카드 유효 구조 — fallback card has valid structure', () => {
    const fallback = getFallbackContextCard();

    expect(fallback).toBeDefined();
    expect(fallback.card).toBeDefined();
    expect(fallback.userImpact).toBeNull();

    // 필수 필드 검증
    const { card } = fallback;
    expect(card.id).toBe('fallback-static');
    expect(card.date).toBeDefined();
    expect(typeof card.headline).toBe('string');
    expect(card.headline.length).toBeGreaterThan(0);
    expect(Array.isArray(card.macro_chain)).toBe(true);
    expect(card.macro_chain.length).toBe(4);
    expect(card.sentiment).toBe('calm');
    expect(card.is_premium_only).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 2. 필수 필드 타입 검증
  // --------------------------------------------------------------------------

  it('필수 필드 타입 검증 — required fields have correct types', () => {
    const fallback = getFallbackContextCard();
    const { card } = fallback;

    expect(typeof card.id).toBe('string');
    expect(typeof card.date).toBe('string');
    expect(card.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
    expect(typeof card.headline).toBe('string');
    expect(typeof card.historical_context).toBe('string');
    expect(typeof card.sentiment).toBe('string');
    expect(['calm', 'caution', 'alert']).toContain(card.sentiment);
    expect(typeof card.is_premium_only).toBe('boolean');
    expect(typeof card.created_at).toBe('string');
  });

  // --------------------------------------------------------------------------
  // 3. Stale 카드 감지 (3시간 기준)
  // --------------------------------------------------------------------------

  it('Stale 카드 감지 — detects stale card older than 3 hours', () => {
    // 현재 시각: 2026-03-07T06:00:00Z
    // 4시간 전 카드 → stale
    const oldCard = '2026-03-07T02:00:00Z';
    expect(isCardStale(oldCard, 3)).toBe(true);

    // 2시간 전 카드 → fresh
    const freshCard = '2026-03-07T04:00:00Z';
    expect(isCardStale(freshCard, 3)).toBe(false);

    // 정확히 3시간 전 → stale (>= threshold)
    const borderCard = '2026-03-07T03:00:00Z';
    expect(isCardStale(borderCard, 3)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 4. 잘못된 날짜 입력 시 안전하게 처리
  // --------------------------------------------------------------------------

  it('잘못된 날짜 입력 시 안전 처리 — handles invalid date gracefully', () => {
    expect(isCardStale('not-a-date', 3)).toBe(false);
    expect(isCardStale('', 3)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 5. 시간대 슬롯 계산 (3시간 간격)
  // --------------------------------------------------------------------------

  it('시간대 슬롯 계산 — calculates correct 3h time slot', () => {
    // UTC 06:00 → KST 15:00 → slot h15
    const slot = getCurrentContextTimeSlot(new Date('2026-03-07T06:00:00Z'));
    expect(slot).toBe('h15');

    // UTC 00:00 → KST 09:00 → slot h09
    const morningSlot = getCurrentContextTimeSlot(new Date('2026-03-07T00:00:00Z'));
    expect(morningSlot).toBe('h09');

    // UTC 21:00 → KST 06:00 (next day) → slot h06
    const earlySlot = getCurrentContextTimeSlot(new Date('2026-03-06T21:00:00Z'));
    expect(earlySlot).toBe('h06');
  });

  // --------------------------------------------------------------------------
  // 6. AsyncStorage 캐시 읽기/쓰기
  // --------------------------------------------------------------------------

  it('AsyncStorage 캐시 동작 — cache read/write works correctly', async () => {
    const mockCard = getFallbackContextCard();

    // 캐시 쓰기
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    await setCachedCard(mockCard);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@baln_context_card_cache',
      JSON.stringify(mockCard)
    );

    // 캐시 읽기
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCard));
    const cached = await getCachedCard();
    expect(cached).toEqual(mockCard);

    // 캐시 없을 때
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const empty = await getCachedCard();
    expect(empty).toBeNull();
  });
});
