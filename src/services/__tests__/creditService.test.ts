/**
 * creditService.ts 테스트
 *
 * 크레딧 서비스의 주요 기능을 테스트합니다.
 * - 잔액 조회 (getMyCredits)
 * - 크레딧 차감 (spendCredits)
 * - 크레딧 충전 (purchaseCredits)
 * - 크레딧 환불 (refundCredits)
 * - 티어 할인 계산 (getDiscountedCost)
 * - 무료 기간 로직 (isFreePeriod)
 */

import {
  getMyCredits,
  spendCredits,
  purchaseCredits,
  refundCredits,
  getDiscountedCost,
  shouldChargeCredits,
  getCreditHistory,
} from '../creditService';
import supabase from '../supabase';
import { isFreePeriod } from '../../config/freePeriod';
import { FEATURE_COSTS, TIER_DISCOUNTS } from '../../types/marketplace';

// Mock 모듈
jest.mock('../supabase');
jest.mock('../../config/freePeriod');

// Mock RPC 함수
const mockRpc = jest.fn();

describe('creditService', () => {
  // 각 테스트 전 Mock 초기화
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockClear();

    // supabase.rpc Mock 설정
    (supabase as any).rpc = mockRpc;
  });

  // ============================================================================
  // getMyCredits - 잔액 조회
  // ============================================================================

  describe('getMyCredits', () => {
    it('1. [Success] 정상적으로 크레딧 잔액을 조회한다', async () => {
      // Mock 사용자 인증
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: { id: 'test-user-123' },
        },
        error: null,
      });

      // Mock 크레딧 데이터
      const mockCredits = {
        user_id: 'test-user-123',
        balance: 150,
        lifetime_purchased: 200,
        lifetime_spent: 50,
        last_bonus_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-11T00:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCredits,
          error: null,
        }),
      });

      const result = await getMyCredits();

      expect(result).toEqual(mockCredits);
      expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
      expect(supabase.from).toHaveBeenCalledWith('user_credits');
    });

    it('2. [Error - No User] 로그인하지 않은 경우 null을 반환한다', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getMyCredits();

      expect(result).toBeNull();
    });

    it('3. [Error - DB Error] DB 조회 실패 시 기본값(잔액 0)을 반환한다', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      });

      const result = await getMyCredits();

      // 기본값 반환 확인 (화면 로딩 차단 방지)
      expect(result).toEqual({
        user_id: 'test-user-123',
        balance: 0,
        lifetime_purchased: 0,
        lifetime_spent: 0,
        last_bonus_at: null,
        updated_at: expect.any(String),
      });
    });
  });

  // ============================================================================
  // spendCredits - 크레딧 차감
  // ============================================================================

  describe('spendCredits', () => {
    it('4. [Success] 정상적으로 크레딧을 차감한다', async () => {
      // 무료 기간 아님 (유료 모드)
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      // Mock RPC 응답
      const mockRpcResponse = {
        data: [
          {
            success: true,
            new_balance: 140,
            error_message: null,
          },
        ],
        error: null,
      };

      mockRpc.mockResolvedValue(mockRpcResponse);

      const result = await spendCredits(10, 'deep_dive', 'analysis-123');

      expect(result).toEqual({
        success: true,
        newBalance: 140,
        errorMessage: undefined,
      });

      expect(mockRpc).toHaveBeenCalledWith('spend_credits', {
        p_user_id: 'test-user-123',
        p_amount: 10,
        p_feature_type: 'deep_dive',
        p_feature_ref_id: 'analysis-123',
      });
    });

    it('5. [Free Period] 무료 기간 중에는 크레딧을 차감하지 않는다', async () => {
      // 무료 기간 활성화
      (isFreePeriod as jest.Mock).mockReturnValue(true);

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      // getMyCredits Mock (무료 기간 중에는 현재 잔액만 조회)
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { balance: 100 },
          error: null,
        }),
      });

      const result = await spendCredits(10, 'deep_dive');

      // 무료 기간에는 RPC 호출 없이 성공 반환
      expect(result.success).toBe(true);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('6. [Error - Insufficient Balance] 잔액 부족 시 실패를 반환한다', async () => {
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      const mockRpcResponse = {
        data: [
          {
            success: false,
            new_balance: 5,
            error_message: '크레딧이 부족합니다',
          },
        ],
        error: null,
      };

      mockRpc.mockResolvedValue(mockRpcResponse);

      const result = await spendCredits(100, 'tax_report');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('크레딧이 부족합니다');
    });

    it('7. [Error - No User] 로그인하지 않은 경우 에러를 반환한다', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await spendCredits(10, 'deep_dive');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('로그인이 필요합니다.');
    });
  });

  // ============================================================================
  // getDiscountedCost - 티어별 할인 계산
  // ============================================================================

  describe('getDiscountedCost', () => {
    it('8. [Tier Discount] 티어별로 정확한 할인율을 적용한다', () => {
      const featureType = 'deep_dive'; // 원가 5C = ₩500
      const originalCost = FEATURE_COSTS[featureType]; // 5

      // 무료 기간 아님
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      // SILVER: 할인 없음 (0%)
      const silverResult = getDiscountedCost(featureType, 'SILVER');
      expect(silverResult).toEqual({
        originalCost: 5,
        discountedCost: 5, // 할인 없음
        discountPercent: 0,
        isFree: false,
      });

      // GOLD: 10% 할인
      const goldResult = getDiscountedCost(featureType, 'GOLD');
      expect(goldResult.discountedCost).toBe(Math.round(5 * 0.9)); // 4.5 → 5 (반올림)

      // PLATINUM: 20% 할인
      const platinumResult = getDiscountedCost(featureType, 'PLATINUM');
      expect(platinumResult.discountedCost).toBe(Math.round(5 * 0.8)); // 4

      // DIAMOND: 30% 할인
      const diamondResult = getDiscountedCost(featureType, 'DIAMOND');
      expect(diamondResult.discountedCost).toBe(Math.round(5 * 0.7)); // 3.5 → 4
    });

    it('9. [Free Period] 무료 기간 중에는 모든 기능이 0원이다', () => {
      // 무료 기간 활성화
      (isFreePeriod as jest.Mock).mockReturnValue(true);

      const result = getDiscountedCost('tax_report', 'SILVER');

      expect(result.discountedCost).toBe(0);
      expect(result.discountPercent).toBe(100);
      expect(result.isFree).toBe(true);
    });

    it('10. [Exchange Rate] 크레딧 환율 (1C = ₩100) 계산이 정확하다', () => {
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      // 1C = ₩100 기준
      // deep_dive: 5C = ₩500
      const deepDiveResult = getDiscountedCost('deep_dive', 'SILVER');
      expect(deepDiveResult.originalCost).toBe(5); // ₩500

      // tax_report: 10C = ₩1,000
      const taxReportResult = getDiscountedCost('tax_report', 'SILVER');
      expect(taxReportResult.originalCost).toBe(10); // ₩1,000

      // ai_cfo_chat: 1C = ₩100
      const chatResult = getDiscountedCost('ai_cfo_chat', 'SILVER');
      expect(chatResult.originalCost).toBe(1); // ₩100
    });
  });

  // ============================================================================
  // purchaseCredits - 크레딧 충전
  // ============================================================================

  describe('purchaseCredits', () => {
    it('11. [Success] 정상적으로 크레딧을 충전한다 (유료 기간)', async () => {
      // 유료 기간 (무료 기간 종료)
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      const mockRpcResponse = {
        data: [
          {
            success: true,
            new_balance: 250,
          },
        ],
        error: null,
      };

      mockRpc.mockResolvedValue(mockRpcResponse);

      const result = await purchaseCredits('standard', 'iap-receipt-456');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(250);
      expect(result.totalCredits).toBe(110); // 100 + 10 보너스

      expect(mockRpc).toHaveBeenCalledWith('add_credits', {
        p_user_id: 'test-user-123',
        p_amount: 110,
        p_type: 'purchase',
        p_metadata: expect.objectContaining({
          package_id: 'standard',
          credits: 100,
          bonus: 10,
          iap_receipt_id: 'iap-receipt-456',
        }),
      });
    });

    it('12. [Free Period Block] 무료 기간 중에는 충전이 비활성화된다', async () => {
      // 무료 기간 활성화
      (isFreePeriod as jest.Mock).mockReturnValue(true);

      const result = await purchaseCredits('premium');

      // 무료 기간에는 결제 비활성화
      expect(result.success).toBe(false);
      expect(result.totalCredits).toBe(0);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // refundCredits - 크레딧 환불
  // ============================================================================

  describe('refundCredits', () => {
    it('13. [Success] AI 실패 시 크레딧을 환불한다', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      const mockRpcResponse = {
        data: [
          {
            success: true,
            new_balance: 115,
          },
        ],
        error: null,
      };

      mockRpc.mockResolvedValue(mockRpcResponse);

      const result = await refundCredits(5, 'deep_dive', 'AI 분석 타임아웃');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(115);

      expect(mockRpc).toHaveBeenCalledWith('add_credits', {
        p_user_id: 'test-user-123',
        p_amount: 5,
        p_type: 'refund',
        p_metadata: {
          feature_type: 'deep_dive',
          reason: 'AI 분석 타임아웃',
        },
      });
    });

    it('14. [Error - No User] 로그인하지 않은 경우 환불이 실패한다', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await refundCredits(5, 'deep_dive');

      expect(result.success).toBe(false);
      expect(result.newBalance).toBe(0);
    });
  });

  // ============================================================================
  // getCreditHistory - 거래 내역 조회
  // ============================================================================

  describe('getCreditHistory', () => {
    it('15. [Success] 크레딧 거래 내역을 조회한다', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      const mockTransactions = [
        {
          id: 'tx-1',
          user_id: 'test-user-123',
          type: 'purchase',
          amount: 110,
          balance_after: 210,
          created_at: '2026-02-10T00:00:00Z',
        },
        {
          id: 'tx-2',
          user_id: 'test-user-123',
          type: 'spend',
          amount: -5,
          balance_after: 205,
          created_at: '2026-02-11T00:00:00Z',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      });

      const result = await getCreditHistory(20);

      expect(result).toEqual(mockTransactions);
      expect(supabase.from).toHaveBeenCalledWith('credit_transactions');
    });

    it('16. [Error] 조회 실패 시 빈 배열을 반환한다', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      });

      const result = await getCreditHistory();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // shouldChargeCredits - 무료 기간 판별
  // ============================================================================

  describe('shouldChargeCredits', () => {
    it('17. [Free Period] 무료 기간 중에는 false를 반환한다', () => {
      (isFreePeriod as jest.Mock).mockReturnValue(true);

      const result = shouldChargeCredits();

      expect(result).toBe(false);
    });

    it('18. [Paid Period] 유료 기간에는 true를 반환한다', () => {
      (isFreePeriod as jest.Mock).mockReturnValue(false);

      const result = shouldChargeCredits();

      expect(result).toBe(true);
    });
  });
});
