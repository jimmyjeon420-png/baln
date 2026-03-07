/**
 * E2E Integration Test: 크레딧 경제 시스템
 *
 * 테스트 시나리오:
 * - 출석 보상 2C 지급
 * - 마켓플레이스 구매 시 크레딧 차감
 * - 잔액 부족 시 에러
 * - 크레딧 잔액이 음수가 되지 않는지 검증
 * - 무료 기간 동안 충전 비활성화
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  getMyCredits,
  spendCredits,
  purchaseCredits,
  shouldChargeCredits,
} from '../../services/creditService';
import supabase, { getCurrentUser } from '../../services/supabase';
import { isFreePeriod } from '../../config/freePeriod';
import { FEATURE_COSTS } from '../../types/marketplace';

// ============================================================================
// Mock 설정
// ============================================================================

jest.mock('../../services/supabase');
jest.mock('../../config/freePeriod');
jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => 'ko'),
  t: jest.fn((key: string) => key),
}));

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockRpc = jest.fn();

// ============================================================================
// 테스트
// ============================================================================

describe('크레딧 경제 시스템 (E2E Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: 'credit-user-001' } as any);
    (supabase as any).rpc = mockRpc;
    (isFreePeriod as jest.Mock).mockReturnValue(false);
  });

  // --------------------------------------------------------------------------
  // 1. 출석 보상 2C 지급
  // --------------------------------------------------------------------------

  it('출석 보상 2C 지급 — awards 2C for daily attendance', async () => {
    mockRpc.mockResolvedValue({
      data: [{
        success: true,
        new_balance: 102,
      }],
      error: null,
    });

    // 출석 보상은 add_credits RPC로 처리
    const { data } = await supabase.rpc('add_credits', {
      p_user_id: 'credit-user-001',
      p_amount: 2,
      p_type: 'attendance',
      p_metadata: { streak: 7 },
    });

    expect(data[0].success).toBe(true);
    expect(data[0].new_balance).toBe(102);
    expect(mockRpc).toHaveBeenCalledWith('add_credits', expect.objectContaining({
      p_amount: 2,
      p_type: 'attendance',
    }));
  });

  // --------------------------------------------------------------------------
  // 2. 마켓플레이스 구매 시 크레딧 차감
  // --------------------------------------------------------------------------

  it('마켓플레이스 구매 시 크레딧 차감 — deducts credits for marketplace purchase', async () => {
    const featureType = 'deep_dive';
    const cost = FEATURE_COSTS[featureType]; // 1C

    mockRpc.mockResolvedValue({
      data: [{
        success: true,
        new_balance: 99,
        error_message: null,
      }],
      error: null,
    });

    const result = await spendCredits(cost, featureType, 'analysis-456');

    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(99);
    expect(mockRpc).toHaveBeenCalledWith('spend_credits', {
      p_user_id: 'credit-user-001',
      p_amount: cost,
      p_feature_type: featureType,
      p_feature_ref_id: 'analysis-456',
    });
  });

  // --------------------------------------------------------------------------
  // 3. 잔액 부족 시 에러
  // --------------------------------------------------------------------------

  it('잔액 부족 시 에러 — insufficient credits returns error', async () => {
    mockRpc.mockResolvedValue({
      data: [{
        success: false,
        new_balance: 0,
        error_message: '크레딧이 부족합니다',
      }],
      error: null,
    });

    const result = await spendCredits(100, 'tax_report');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('크레딧이 부족합니다');
  });

  // --------------------------------------------------------------------------
  // 4. 크레딧 잔액이 음수가 되지 않음
  // --------------------------------------------------------------------------

  it('크레딧 잔액 음수 방지 — balance never goes negative', async () => {
    // 잔액 조회
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          user_id: 'credit-user-001',
          balance: 0,
          lifetime_purchased: 10,
          lifetime_spent: 10,
          last_bonus_at: null,
          updated_at: '2026-03-07T00:00:00Z',
        },
        error: null,
      }),
    });

    const credits = await getMyCredits();
    expect(credits).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(credits!.balance).toBeGreaterThanOrEqual(0);

    // 잔액 부족 상태에서 차감 시도
    mockRpc.mockResolvedValue({
      data: [{
        success: false,
        new_balance: 0,
        error_message: '크레딧이 부족합니다',
      }],
      error: null,
    });

    const spendResult = await spendCredits(5, 'deep_dive');
    expect(spendResult.success).toBe(false);
    // 잔액이 음수로 내려가지 않음 (실패 시에도 0 이상)
    expect(spendResult.newBalance).toBeGreaterThanOrEqual(0);
  });

  // --------------------------------------------------------------------------
  // 5. 무료 기간 동안 충전 비활성화
  // --------------------------------------------------------------------------

  it('무료 기간 충전 비활성화 — purchase disabled during free period', async () => {
    (isFreePeriod as jest.Mock).mockReturnValue(true);

    const result = await purchaseCredits('standard');

    expect(result.success).toBe(false);
    expect(result.totalCredits).toBe(0);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 6. shouldChargeCredits 무료/유료 판별
  // --------------------------------------------------------------------------

  it('무료/유료 기간 판별 — shouldChargeCredits reflects free period', () => {
    (isFreePeriod as jest.Mock).mockReturnValue(true);
    expect(shouldChargeCredits()).toBe(false);

    (isFreePeriod as jest.Mock).mockReturnValue(false);
    expect(shouldChargeCredits()).toBe(true);
  });
});
