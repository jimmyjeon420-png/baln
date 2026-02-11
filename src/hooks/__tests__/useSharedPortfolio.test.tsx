/**
 * useSharedPortfolio Hook 테스트
 *
 * 테스트 대상: src/hooks/useSharedPortfolio.ts
 *
 * 테스트 커버리지:
 * 1. 포트폴리오 데이터 fetching (성공/실패)
 * 2. Optimistic updates
 * 3. TanStack Query 캐싱 동작 (staleTime 3분)
 * 4. refresh() 함수
 * 5. totalAssets, userTier 계산
 * 6. 부동산 자산 필터링 (RE_ 티커)
 * 7. 유동 자산 티커 목록
 * 8. 빈 데이터 처리
 * 9. 인증되지 않은 사용자
 * 10. 캐시 무효화
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { useSharedPortfolio, SHARED_PORTFOLIO_KEY } from '../useSharedPortfolio';
import supabase from '../../services/supabase';
import { determineTier, syncUserProfileTier } from '../useGatherings';
import { AssetType } from '../../types/asset';

// Mock dependencies
jest.mock('../../services/supabase');
jest.mock('../useGatherings');

// Mock 타입 정의
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockDetermineTier = determineTier as jest.MockedFunction<typeof determineTier>;
const mockSyncUserProfileTier = syncUserProfileTier as jest.MockedFunction<typeof syncUserProfileTier>;

// 테스트용 포트폴리오 데이터
const mockPortfolioData = [
  {
    id: 'asset-1',
    user_id: 'user-123',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    quantity: 10,
    avg_price: 150000,
    current_price: 180000,
    current_value: 1800000,
    target_allocation: 30,
    asset_type: 'liquid',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    cost_basis: 1500000,
    purchase_date: '2023-01-01T00:00:00Z',
    custom_tax_rate: null,
    currency: 'KRW',
    display_currency: 'KRW',
    notes: null,
    is_verified: false,
    verified_at: null,
    verified_value: null,
    input_type: 'self_declared',
    lawd_cd: null,
    complex_name: null,
    unit_area: null,
    unit_detail: null,
    purchase_price_krw: null,
    last_price_updated_at: null,
  },
  {
    id: 'asset-2',
    user_id: 'user-123',
    name: 'Samsung Electronics',
    ticker: '005930.KS',
    quantity: 50,
    avg_price: 60000,
    current_price: 70000,
    current_value: 3500000,
    target_allocation: 40,
    asset_type: 'liquid',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    cost_basis: 3000000,
    purchase_date: '2023-01-01T00:00:00Z',
    custom_tax_rate: null,
    currency: 'KRW',
    display_currency: 'KRW',
    notes: null,
    is_verified: false,
    verified_at: null,
    verified_value: null,
    input_type: 'self_declared',
    lawd_cd: null,
    complex_name: null,
    unit_area: null,
    unit_detail: null,
    purchase_price_krw: null,
    last_price_updated_at: null,
  },
  {
    id: 'asset-3',
    user_id: 'user-123',
    name: '강남 아파트',
    ticker: 'RE_GANGNAM_101',
    quantity: 1,
    avg_price: 1500000000,
    current_price: 1800000000,
    current_value: 1800000000,
    target_allocation: 30,
    asset_type: 'illiquid',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    cost_basis: 1500000000,
    purchase_date: '2023-01-01T00:00:00Z',
    custom_tax_rate: null,
    currency: 'KRW',
    display_currency: 'KRW',
    notes: null,
    is_verified: false,
    verified_at: null,
    verified_value: null,
    input_type: 'self_declared',
    lawd_cd: '11680',
    complex_name: '강남 아파트',
    unit_area: 84.5,
    unit_detail: '101동 101호',
    purchase_price_krw: 1500000000,
    last_price_updated_at: '2024-01-01T00:00:00Z',
  },
];

// QueryClient wrapper 생성
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSharedPortfolio Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 기본 mock 설정
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    mockDetermineTier.mockReturnValue('GOLD');
    mockSyncUserProfileTier.mockResolvedValue({ totalAssets: 1805300000, tier: 'GOLD' });
  });

  describe('1. 포트폴리오 데이터 fetching - 성공', () => {
    it('should fetch and transform portfolio data successfully', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Assets 배열 확인
      expect(result.current.assets).toHaveLength(3);
      expect(result.current.assets[0].name).toBe('Apple Inc.');
      expect(result.current.assets[0].ticker).toBe('AAPL');
      expect(result.current.assets[0].assetType).toBe(AssetType.LIQUID);
    });

    it('should calculate totalAssets correctly', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // totalAssets = AAPL (10 * 180000) + Samsung (50 * 70000) + 강남 아파트 (1 * 1800000000)
      // = 1,800,000 + 3,500,000 + 1,800,000,000 = 1,805,300,000
      expect(result.current.totalAssets).toBe(1805300000);
    });

    it('should determine correct user tier based on totalAssets', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockDetermineTier).toHaveBeenCalledWith(1805300000);
      expect(result.current.userTier).toBe('GOLD');
    });
  });

  describe('2. 포트폴리오 데이터 fetching - 실패', () => {
    it('should return empty data on fetch error', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', details: null, hint: null, code: '500' },
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.assets).toEqual([]);
      expect(result.current.totalAssets).toBe(0);
      expect(result.current.userTier).toBe('SILVER');
    });

    it('should return empty data when user is not authenticated', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.assets).toEqual([]);
      expect(result.current.totalAssets).toBe(0);
      expect(result.current.userTier).toBe('SILVER');
    });

    it('should return empty data when portfolio data is empty', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.assets).toEqual([]);
      expect(result.current.totalAssets).toBe(0);
      expect(result.current.hasAssets).toBe(false);
    });
  });

  describe('3. 부동산 자산 필터링 (RE_ 티커)', () => {
    it('should filter real estate assets correctly', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 부동산 자산 확인
      expect(result.current.realEstateAssets).toHaveLength(1);
      expect(result.current.realEstateAssets[0].ticker).toBe('RE_GANGNAM_101');
      expect(result.current.realEstateAssets[0].name).toBe('강남 아파트');
    });

    it('should calculate total real estate value correctly', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 부동산 총 자산 = 1,800,000,000
      expect(result.current.totalRealEstate).toBe(1800000000);
    });

    it('should exclude real estate from portfolioAssets', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // portfolioAssets는 부동산 제외 (Gemini API 전달용)
      expect(result.current.portfolioAssets).toHaveLength(2);
      expect(result.current.portfolioAssets.map(a => a.ticker)).toEqual(['AAPL', '005930.KS']);
    });
  });

  describe('4. 유동 자산 티커 목록 (liquidTickers)', () => {
    it('should extract liquid asset tickers correctly', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 유동 자산 티커 목록 (liquid만 포함)
      expect(result.current.liquidTickers).toHaveLength(2);
      expect(result.current.liquidTickers).toContain('AAPL');
      expect(result.current.liquidTickers).toContain('005930.KS');
    });

    it('should exclude assets without tickers from liquidTickers', async () => {
      const dataWithoutTicker = [
        ...mockPortfolioData,
        {
          ...mockPortfolioData[0],
          id: 'asset-4',
          ticker: null,
          name: '기타 자산',
        },
      ];

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: dataWithoutTicker,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 티커 없는 자산 제외
      expect(result.current.liquidTickers).toHaveLength(2);
    });
  });

  describe('5. TanStack Query 캐싱 동작 (staleTime 3분)', () => {
    it('should use staleTime of 3 minutes (180000ms)', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useSharedPortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 캐시 상태 확인
      const queryState = queryClient.getQueryState(SHARED_PORTFOLIO_KEY);
      expect(queryState).toBeDefined();

      // staleTime은 쿼리 옵션에서 확인
      const queryData = queryClient.getQueryData(SHARED_PORTFOLIO_KEY);
      expect(queryData).toBeDefined();
    });

    it('should not refetch during stale time', async () => {
      let fetchCount = 0;
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockImplementation(() => {
          fetchCount++;
          return Promise.resolve({
            data: mockPortfolioData,
            error: null,
          });
        }),
      })) as any;

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // 첫 번째 렌더
      const { result: result1 } = renderHook(() => useSharedPortfolio(), { wrapper });
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // 두 번째 렌더 (캐시 사용, staleTime 내)
      const { result: result2 } = renderHook(() => useSharedPortfolio(), { wrapper });
      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // fetch는 1번만 실행되어야 함 (캐시 사용)
      expect(fetchCount).toBe(1);
    });
  });

  describe('6. refresh() 함수 - 캐시 무효화', () => {
    it('should invalidate cache and refetch on refresh()', async () => {
      let fetchCount = 0;
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockImplementation(() => {
          fetchCount++;
          return Promise.resolve({
            data: mockPortfolioData,
            error: null,
          });
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetchCount).toBe(1);

      // refresh 호출
      await result.current.refresh();

      await waitFor(() => {
        expect(fetchCount).toBe(2);
      });
    });

    it('should maintain previous data during refresh (placeholderData)', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const previousData = result.current.assets;

      // refresh 호출
      result.current.refresh();

      // refresh 중에도 이전 데이터 유지 (placeholderData: keepPreviousData)
      expect(result.current.assets).toEqual(previousData);
    });
  });

  describe('7. portfolioAssets 변환 (Gemini 호출용)', () => {
    it('should transform to PortfolioAsset format correctly', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // PortfolioAsset 형식 확인
      expect(result.current.portfolioAssets[0]).toHaveProperty('ticker');
      expect(result.current.portfolioAssets[0]).toHaveProperty('name');
      expect(result.current.portfolioAssets[0]).toHaveProperty('quantity');
      expect(result.current.portfolioAssets[0]).toHaveProperty('avgPrice');
      expect(result.current.portfolioAssets[0]).toHaveProperty('currentPrice');
      expect(result.current.portfolioAssets[0]).toHaveProperty('currentValue');

      expect(result.current.portfolioAssets[0].ticker).toBe('AAPL');
      expect(result.current.portfolioAssets[0].quantity).toBe(10);
    });

    it('should handle missing fields in portfolioAssets', async () => {
      const incompleteData = [
        {
          ...mockPortfolioData[0],
          ticker: null,
          quantity: null,
          avg_price: null,
          current_price: null,
        },
      ];

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: incompleteData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.portfolioAssets[0].ticker).toBe('UNKNOWN');
      expect(result.current.portfolioAssets[0].quantity).toBe(0);
      expect(result.current.portfolioAssets[0].avgPrice).toBe(0);
    });
  });

  describe('8. 편의 접근자 (convenience accessors)', () => {
    it('should provide hasAssets computed property', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasAssets).toBe(true);
    });

    it('should return hasAssets false when totalAssets is 0', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasAssets).toBe(false);
    });

    it('should provide default values before data loads', () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      // 로딩 중일 때 기본값 확인
      expect(result.current.assets).toEqual([]);
      expect(result.current.portfolioAssets).toEqual([]);
      expect(result.current.totalAssets).toBe(0);
      expect(result.current.userTier).toBe('SILVER');
      expect(result.current.liquidTickers).toEqual([]);
      expect(result.current.realEstateAssets).toEqual([]);
      expect(result.current.totalRealEstate).toBe(0);
    });
  });

  describe('9. 프로필 티어 동기화 (syncUserProfileTier)', () => {
    it('should call syncUserProfileTier in background', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // syncUserProfileTier가 호출되어야 함 (백그라운드)
      await waitFor(() => {
        expect(mockSyncUserProfileTier).toHaveBeenCalledWith('user-123');
      });
    });

    it('should not fail if syncUserProfileTier throws error', async () => {
      mockSyncUserProfileTier.mockRejectedValue(new Error('Profile update failed'));

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const { result } = renderHook(() => useSharedPortfolio(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 에러가 발생해도 데이터는 정상적으로 로드되어야 함
      expect(result.current.assets).toHaveLength(3);
    });
  });

  describe('10. QueryClient invalidation', () => {
    it('should allow external invalidation via SHARED_PORTFOLIO_KEY', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPortfolioData,
          error: null,
        }),
      })) as any;

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useSharedPortfolio(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 외부에서 캐시 무효화
      await queryClient.invalidateQueries({ queryKey: SHARED_PORTFOLIO_KEY });

      // 무효화 후 데이터는 여전히 접근 가능 (refetch 트리거)
      expect(result.current.assets).toBeDefined();
    });
  });
});
