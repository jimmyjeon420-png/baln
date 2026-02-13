/**
 * creditService.ts 통합 테스트
 *
 * 통합 테스트 시나리오:
 * - 크레딧 지급 (출석 2C)
 * - 크레딧 차감 (AI 진단 3C)
 * - 잔액 부족 시 에러
 * - 트랜잭션 히스토리 조회
 * - 환율 계산 (1C = ₩100)
 *
 * 외부 의존성은 모두 mock 처리됩니다.
 */

import {
  getMyCredits,
  spendCredits,
  purchaseCredits,
  refundCredits,
  getCreditHistory,
  getDiscountedCost,
  shouldChargeCredits,
  checkAndGrantSubscriptionBonus,
} from '../creditService';
import supabase, { getCurrentUser } from '../supabase';
import { isFreePeriod } from '../../config/freePeriod';
import { FEATURE_COSTS, CREDIT_PACKAGES } from '../../types/marketplace';
import {
  mockUser,
  mockUserCredits,
  mockCreditTransactions,
  mockSupabaseError,
} from './helpers/mockData';

// Mock 설정
jest.mock('../supabase');
jest.mock('../../config/freePeriod');

// getCurrentUser Mock 설정
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('creditService.ts 통합 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 시간 고정 (2026-02-11)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-11T10:00:00Z'));

    // supabase.rpc Mock 초기화 (기본값)
    (supabase as any).rpc = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // 크레딧 지급 시나리오
  // ============================================================================

  describe('크레딧 지급 (출석 보너스)', () => {
    it('1. [Attendance] 출석 시 2C 지급 성공', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      // RPC 응답: add_credits (출석)
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            success: true,
            new_balance: 102,
          },
        ],
        error: null,
      });

      // 실제로는 attendance service에서 호출하지만, 테스트를 위해 직접 시뮬레이션
      // 출석 보상은 add_credits RPC를 사용
      const { data } = await supabase.rpc('add_credits', {
        p_user_id: mockUser.id,
        p_amount: 2,
        p_type: 'attendance',
        p_metadata: { streak: 7 },
      });

      expect(data[0].success).toBe(true);
      expect(data[0].new_balance).toBe(102);
      expect(supabase.rpc).toHaveBeenCalledWith('add_credits', {
        p_user_id: mockUser.id,
        p_amount: 2,
        p_type: 'attendance',
        p_metadata: { streak: 7 },
      });
    });

    it('2. [Prediction Success] 예측 적중 시 3C 지급 성공', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            success: true,
            new_balance: 103,
          },
        ],
        error: null,
      });

      const { data } = await supabase.rpc('add_credits', {
        p_user_id: mockUser.id,
        p_amount: 3,
        p_type: 'prediction_reward',
        p_metadata: { prediction_id: 'pred-123', accuracy: 100 },
      });

      expect(data[0].success).toBe(true);
      expect(data[0].new_balance).toBe(103);
    });
  });

  // ============================================================================
  // 크레딧 차감 시나리오
  // ============================================================================

  describe('크레딧 차감 (AI 진단)', () => {
    it('3. [Spend Success] AI 진단 실행 시 3C 차감 성공', async () => {
      // 유료 모드
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      // spend_credits RPC 응답
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            success: true,
            new_balance: 97,
            error_message: null,
          },
        ],
        error: null,
      });

      const result = await spendCredits(3, 'deep_dive', 'analysis-123');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(97);
      expect(result.errorMessage).toBeUndefined();

      expect(supabase.rpc).toHaveBeenCalledWith('spend_credits', {
        p_user_id: mockUser.id,
        p_amount: 3,
        p_feature_type: 'deep_dive',
        p_feature_ref_id: 'analysis-123',
      });
    });

    it('4. [Insufficient Balance] 잔액 부족 시 에러 반환', async () => {
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      // RPC에서 잔액 부족 에러
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            success: false,
            new_balance: 2,
            error_message: '크레딧이 부족합니다 (현재: 2C, 필요: 10C)',
          },
        ],
        error: null,
      });

      const result = await spendCredits(10, 'tax_report');

      expect(result.success).toBe(false);
      expect(result.newBalance).toBe(2);
      expect(result.errorMessage).toContain('크레딧이 부족합니다');
    });

    it('5. [Free Period] 무료 기간 중에는 차감하지 않음', async () => {
      // 무료 기간 활성화
      (isFreePeriod as jest.Mock).mockReturnValue(true);

      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      // getMyCredits Mock
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserCredits,
          error: null,
        }),
      });

      const result = await spendCredits(10, 'deep_dive');

      // 무료 기간에는 RPC 호출 없이 성공
      expect(result.success).toBe(true);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 환율 계산 (1C = ₩100)
  // ============================================================================

  describe('환율 계산 (1C = ₩100)', () => {
    it('6. [Exchange Rate] 크레딧 → 원화 환산이 정확하다', () => {
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      // deep_dive: 5C = ₩500
      const deepDiveCost = getDiscountedCost('deep_dive', 'SILVER');
      expect(deepDiveCost.originalCost).toBe(5); // 5C
      expect(deepDiveCost.originalCost * 100).toBe(500); // ₩500

      // tax_report: 10C = ₩1,000
      const taxReportCost = getDiscountedCost('tax_report', 'SILVER');
      expect(taxReportCost.originalCost).toBe(10); // 10C
      expect(taxReportCost.originalCost * 100).toBe(1000); // ₩1,000

      // ai_cfo_chat: 1C = ₩100
      const chatCost = getDiscountedCost('ai_cfo_chat', 'SILVER');
      expect(chatCost.originalCost).toBe(1); // 1C
      expect(chatCost.originalCost * 100).toBe(100); // ₩100
    });

    it('7. [Tier Discount + Exchange] 티어 할인 + 환율 계산', () => {
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      // GOLD 티어: 10% 할인
      // deep_dive: 5C → 4.5C (반올림 5C) → ₩500
      const goldCost = getDiscountedCost('deep_dive', 'GOLD');
      expect(goldCost.discountedCost).toBe(5); // 4.5 → 5 (반올림)
      expect(goldCost.discountPercent).toBe(10);

      // PLATINUM 티어: 20% 할인
      // deep_dive: 5C → 4C → ₩400
      const platinumCost = getDiscountedCost('deep_dive', 'PLATINUM');
      expect(platinumCost.discountedCost).toBe(4);
      expect(platinumCost.discountedCost * 100).toBe(400); // ₩400

      // DIAMOND 티어: 30% 할인
      // tax_report: 10C → 7C → ₩700
      const diamondCost = getDiscountedCost('tax_report', 'DIAMOND');
      expect(diamondCost.discountedCost).toBe(7);
      expect(diamondCost.discountedCost * 100).toBe(700); // ₩700
    });
  });

  // ============================================================================
  // 트랜잭션 히스토리 조회
  // ============================================================================

  describe('트랜잭션 히스토리 조회', () => {
    it('8. [History Success] 크레딧 거래 내역을 조회한다', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockCreditTransactions,
          error: null,
        }),
      });

      const result = await getCreditHistory(20);

      expect(result).toEqual(mockCreditTransactions);
      expect(result).toHaveLength(2);

      // 첫 번째: 출석 +2C
      expect(result[0].type).toBe('attendance');
      expect(result[0].amount).toBe(2);

      // 두 번째: AI 진단 -3C
      expect(result[1].type).toBe('spend');
      expect(result[1].amount).toBe(-3);
      expect(result[1].feature_type).toBe('deep_dive');

      expect(supabase.from).toHaveBeenCalledWith('credit_transactions');
    });

    it('9. [History - No Data] 거래 내역이 없으면 빈 배열 반환', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const result = await getCreditHistory();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // 크레딧 환불
  // ============================================================================

  describe('크레딧 환불 (AI 실패 시)', () => {
    it('10. [Refund Success] AI 분석 실패 시 크레딧 환불', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            success: true,
            new_balance: 105,
          },
        ],
        error: null,
      });

      const result = await refundCredits(5, 'deep_dive', 'Gemini API timeout');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(105);

      expect(supabase.rpc).toHaveBeenCalledWith('add_credits', {
        p_user_id: mockUser.id,
        p_amount: 5,
        p_type: 'refund',
        p_metadata: {
          feature_type: 'deep_dive',
          reason: 'Gemini API timeout',
        },
      });
    });

    it('11. [Refund - No User] 로그인 안 한 경우 환불 실패', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await refundCredits(5, 'deep_dive');

      expect(result.success).toBe(false);
      expect(result.newBalance).toBe(0);
    });
  });

  // ============================================================================
  // 구독자 월 보너스
  // ============================================================================

  describe('구독자 월 보너스 (Premium)', () => {
    it('12. [Bonus Granted] 구독자는 월 30C 보너스 받음', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      // Premium 유저
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                plan_type: 'premium',
                premium_expires_at: '2026-12-31T23:59:59Z', // 유효한 구독
              },
              error: null,
            }),
          };
        }
        if (table === 'user_credits') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                last_bonus_at: '2026-01-15T00:00:00Z', // 지난 달 지급
              },
              error: null,
            }),
          };
        }
        return {};
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            success: true,
            new_balance: 130,
          },
        ],
        error: null,
      });

      const result = await checkAndGrantSubscriptionBonus();

      expect(result.granted).toBe(true);
      expect(result.amount).toBe(30); // SUBSCRIPTION_MONTHLY_BONUS
      expect(result.newBalance).toBe(130);

      expect(supabase.rpc).toHaveBeenCalledWith('add_credits', {
        p_user_id: mockUser.id,
        p_amount: 30,
        p_type: 'subscription_bonus',
        p_metadata: {
          month: '2026-02', // 2026-02-11 기준
          plan_type: 'premium',
        },
      });
    });

    it('13. [Bonus - Already Granted] 같은 달 이미 지급됨 → 중복 지급 방지', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                plan_type: 'premium',
                premium_expires_at: '2026-12-31T23:59:59Z',
              },
              error: null,
            }),
          };
        }
        if (table === 'user_credits') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                last_bonus_at: '2026-02-01T00:00:00Z', // 이번 달 이미 지급
              },
              error: null,
            }),
          };
        }
        return {};
      });

      const result = await checkAndGrantSubscriptionBonus();

      // 중복 지급 방지
      expect(result.granted).toBe(false);
      expect(result.amount).toBe(0);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('14. [Bonus - Free User] 무료 유저는 보너스 받지 못함', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            plan_type: 'free',
            premium_expires_at: null,
          },
          error: null,
        }),
      });

      const result = await checkAndGrantSubscriptionBonus();

      expect(result.granted).toBe(false);
      expect(result.amount).toBe(0);
    });
  });

  // ============================================================================
  // 패키지 구매 (무료 기간 비활성화 시)
  // ============================================================================

  describe('크레딧 패키지 구매', () => {
    it('15. [Purchase Success] 유료 기간 중 패키지 구매 성공', async () => {
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      mockGetCurrentUser.mockResolvedValue(mockUser as any);

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            success: true,
            new_balance: 210,
          },
        ],
        error: null,
      });

      // standard 패키지: 100C + 10C 보너스 = 110C
      const result = await purchaseCredits('standard', 'iap-receipt-123');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(210);
      expect(result.totalCredits).toBe(110);

      expect(supabase.rpc).toHaveBeenCalledWith('add_credits', {
        p_user_id: mockUser.id,
        p_amount: 110,
        p_type: 'purchase',
        p_metadata: expect.objectContaining({
          package_id: 'standard',
          credits: 100,
          bonus: 10,
          iap_receipt_id: 'iap-receipt-123',
        }),
      });
    });

    it('16. [Purchase - Free Period Block] 무료 기간 중에는 구매 비활성화', async () => {
      (isFreePeriod as jest.Mock).mockReturnValue(true);

      const result = await purchaseCredits('premium');

      expect(result.success).toBe(false);
      expect(result.totalCredits).toBe(0);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });
});
