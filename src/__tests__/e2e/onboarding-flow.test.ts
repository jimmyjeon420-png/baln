/**
 * E2E Integration Test: 온보딩 → 자산 등록 → 건강 점수 흐름
 *
 * 테스트 시나리오:
 * - 신규 유저 가입 후 첫 자산 등록
 * - 포트폴리오에 자산 추가 및 저장
 * - 건강 점수 계산 검증
 * - 유효하지 않은 입력 에러 처리
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { savePortfolioAsset } from '../../features/assets/portfolioPersistence';
import { calculateHealthScore } from '../../services/rebalanceScore';
import { Asset, AssetType } from '../../types/asset';

// ============================================================================
// Mock 설정
// ============================================================================

jest.mock('../../services/supabase');
jest.mock('../../locales', () => ({
  getCurrentLanguage: jest.fn(() => 'ko'),
  t: jest.fn((key: string) => key),
}));

// ============================================================================
// Helper: Supabase 클라이언트 Mock (portfolioPersistence 패턴 재사용)
// ============================================================================

function createQuery(response: any, calls: any[]) {
  const query: any = {
    update(payload: any) { calls.push({ type: 'update', payload }); return query; },
    insert(payload: any) { calls.push({ type: 'insert', payload }); return query; },
    select(value: string) { calls.push({ type: 'select', value }); return query; },
    eq(field: string, value: any) { calls.push({ type: 'eq', field, value }); return query; },
    limit(value: number) { calls.push({ type: 'limit', value }); return query; },
    then(resolve: (v: any) => unknown, reject?: (r?: any) => unknown) {
      return Promise.resolve(response).then(resolve, reject);
    },
  };
  return query;
}

function createClient(responses: any[]) {
  const calls: any[] = [];
  return {
    calls,
    client: {
      from(_table: string) {
        calls.push({ type: 'from', table: _table });
        const response = responses.shift();
        if (!response) throw new Error('No mock response configured');
        return createQuery(response, calls);
      },
    },
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('온보딩 → 자산 등록 → 건강 점수 (E2E Integration)', () => {
  const mockUserId = 'onboarding-test-user-001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 첫 자산 등록 성공
  // --------------------------------------------------------------------------

  it('첫 자산 등록 성공 — first asset registration after signup', async () => {
    const { client } = createClient([
      // 티커 조회 → 기존 없음
      { data: [], error: null },
      // insert 결과
      {
        data: [{
          id: 'new-asset-001',
          user_id: mockUserId,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          quantity: 10,
          avg_price: 180,
          current_value: 1950,
        }],
        error: null,
      },
    ]);

    const result = await savePortfolioAsset(
      client as any,
      {
        userId: mockUserId,
        ticker: 'AAPL',
        name: 'Apple Inc.',
        quantity: 10,
        avgPrice: 180,
        currentValue: 1950,
        currency: 'USD' as const,
      },
      'timeout'
    );

    expect(result).toEqual(expect.objectContaining({
      id: 'new-asset-001',
      ticker: 'AAPL',
      user_id: mockUserId,
    }));
  });

  // --------------------------------------------------------------------------
  // 2. 건강 점수 계산 검증
  // --------------------------------------------------------------------------

  it('건강 점수 0-100 범위 — health score returns valid range', () => {
    const assets: Asset[] = [
      {
        id: 'asset-1', name: 'Apple Inc.', ticker: 'AAPL',
        currentValue: 4000, targetAllocation: 40,
        assetType: AssetType.LIQUID, createdAt: Date.now(),
        quantity: 20, avgPrice: 180, currentPrice: 200,
      },
      {
        id: 'asset-2', name: 'NVIDIA', ticker: 'NVDA',
        currentValue: 3000, targetAllocation: 30,
        assetType: AssetType.LIQUID, createdAt: Date.now(),
        quantity: 5, avgPrice: 500, currentPrice: 600,
      },
      {
        id: 'asset-3', name: 'Samsung', ticker: '005930',
        currentValue: 3000, targetAllocation: 30,
        assetType: AssetType.LIQUID, createdAt: Date.now(),
        quantity: 40, avgPrice: 70000, currentPrice: 75000,
      },
    ];

    const totalAssets = 10000;
    const result = calculateHealthScore(assets, totalAssets);

    expect(typeof result.totalScore).toBe('number');
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.grade).toBeDefined();
    expect(['S', 'A', 'B', 'C', 'D']).toContain(result.grade);
    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // 3. 음수 수량 거부
  // --------------------------------------------------------------------------

  it('음수 수량 거부 — rejects negative quantity', async () => {
    const { client } = createClient([]);

    await expect(
      savePortfolioAsset(
        client as any,
        {
          userId: mockUserId,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          quantity: -5,
          avgPrice: 180,
          currentValue: 1950,
          currency: 'USD' as const,
        },
        'timeout'
      )
    ).rejects.toThrow();
  });

  // --------------------------------------------------------------------------
  // 4. 기존 자산 업데이트 (중복 등록 방지)
  // --------------------------------------------------------------------------

  it('기존 자산 업데이트 — updates existing asset instead of duplicating', async () => {
    const { client, calls } = createClient([
      // 티커 조회 → 기존 있음
      {
        data: [{
          id: 'existing-001',
          user_id: mockUserId,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          quantity: 10,
          avg_price: 180,
          current_value: 1950,
        }],
        error: null,
      },
      // update 결과
      {
        data: [{
          id: 'existing-001',
          user_id: mockUserId,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          quantity: 15,
          avg_price: 185,
          current_value: 2925,
        }],
        error: null,
      },
    ]);

    const result = await savePortfolioAsset(
      client as any,
      {
        userId: mockUserId,
        ticker: 'AAPL',
        name: 'Apple Inc.',
        quantity: 15,
        avgPrice: 185,
        currentValue: 2925,
        currency: 'USD' as const,
      },
      'timeout'
    );

    expect(result).toEqual(expect.objectContaining({ id: 'existing-001' }));
    // insert가 호출되지 않았음을 확인
    expect(calls.some((c) => c.type === 'insert')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 5. DB 오류 시 에러 전파
  // --------------------------------------------------------------------------

  it('DB 오류 시 에러 전파 — propagates lookup errors', async () => {
    const { client } = createClient([
      { data: null, error: { message: 'Connection refused' } },
    ]);

    await expect(
      savePortfolioAsset(
        client as any,
        {
          userId: mockUserId,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          quantity: 10,
          avgPrice: 180,
          currentValue: 1950,
          currency: 'USD' as const,
        },
        'timeout'
      )
    ).rejects.toEqual(expect.objectContaining({ message: 'Connection refused' }));
  });
});
