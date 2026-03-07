/**
 * E2E Integration Test: 오프라인 복원력
 *
 * 테스트 시나리오:
 * - 캐시된 데이터가 오프라인에서 제공됨
 * - AsyncStorage 읽기/쓰기 안전성 (JSON.parse 오류 방어)
 * - 손상된 캐시 데이터 안전 처리
 * - 오프라인 → 온라인 복귀 시 데이터 갱신
 * - 빈 캐시 처리
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedCard,
  setCachedCard,
  getCachedCardTimestamp,
  getFallbackContextCard,
} from '../../services/contextCardService';
import { getMyCredits } from '../../services/creditService';
import supabase, { getCurrentUser } from '../../services/supabase';

// ============================================================================
// Mock 설정
// ============================================================================

jest.mock('../../services/supabase');
jest.mock('../../config/freePeriod', () => ({
  isFreePeriod: jest.fn(() => false),
}));
jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => 'ko'),
  t: jest.fn((key: string) => key),
}));
jest.mock('../../context/LocaleContext', () => ({
  getCurrentDisplayLanguage: jest.fn(() => 'ko'),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

// ============================================================================
// 테스트
// ============================================================================

describe('오프라인 복원력 (E2E Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 캐시된 맥락 카드 오프라인 제공
  // --------------------------------------------------------------------------

  it('캐시된 맥락 카드 오프라인 제공 — serves cached context card when offline', async () => {
    const mockCard = getFallbackContextCard();

    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCard));

    const cached = await getCachedCard();

    expect(cached).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(cached!.card.id).toBe('fallback-static');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(cached!.card.headline).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 2. JSON.parse 오류 방어 (손상된 캐시)
  // --------------------------------------------------------------------------

  it('손상된 캐시 안전 처리 — handles corrupted AsyncStorage data safely', async () => {
    // 손상된 JSON
    mockAsyncStorage.getItem.mockResolvedValue('{invalid json!!!');

    const cached = await getCachedCard();

    // 에러 대신 null 반환
    expect(cached).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 3. AsyncStorage 자체 에러 방어
  // --------------------------------------------------------------------------

  it('AsyncStorage 에러 방어 — handles AsyncStorage exceptions gracefully', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage not available'));

    const cached = await getCachedCard();
    expect(cached).toBeNull();

    const timestamp = await getCachedCardTimestamp();
    expect(timestamp).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 4. 빈 캐시 처리
  // --------------------------------------------------------------------------

  it('빈 캐시 처리 — returns null when no cache exists', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    const cached = await getCachedCard();
    expect(cached).toBeNull();

    const timestamp = await getCachedCardTimestamp();
    expect(timestamp).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 5. 캐시 타임스탬프 정상 동작
  // --------------------------------------------------------------------------

  it('캐시 타임스탬프 정상 동작 — cache timestamp read/write works', async () => {
    const now = Date.now();

    // 쓰기: setCachedCard가 timestamp도 함께 저장
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    const mockCard = getFallbackContextCard();
    await setCachedCard(mockCard);

    // setItem이 2번 호출됨 (카드 + 타임스탬프)
    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@baln_context_card_cache',
      JSON.stringify(mockCard)
    );
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@baln_context_card_cache_ts',
      expect.any(String) // JSON.stringify(Date.now())
    );

    // 읽기
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(now));
    const timestamp = await getCachedCardTimestamp();
    expect(timestamp).toBe(now);
  });

  // --------------------------------------------------------------------------
  // 6. 네트워크 오류 시 크레딧 기본값 반환
  // --------------------------------------------------------------------------

  it('네트워크 오류 시 크레딧 기본값 — returns default credits on network error', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'offline-user-001' } as any);

    // DB 조회 실패 시뮬레이션
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'NETWORK_ERROR', message: 'Network request failed' },
      }),
    });

    const credits = await getMyCredits();

    // null이 아닌 기본값 반환 (화면 로딩 차단 방지)
    expect(credits).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(credits!.balance).toBe(0);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(credits!.user_id).toBe('offline-user-001');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(credits!.lifetime_purchased).toBe(0);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(credits!.lifetime_spent).toBe(0);
  });
});
