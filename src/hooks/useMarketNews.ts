/**
 * useMarketNews Hook — 실시간 뉴스 피드
 *
 * 역할: 뉴스 데이터 수집 부서
 * - market_news 테이블에서 뉴스를 무한 스크롤로 가져옴
 * - AI PiCK 뉴스 상위 5개 별도 조회
 * - 카테고리 필터 (전체/크립토/주식/매크로)
 *
 * 비유: 신문사의 편집 데스크 — 뉴스를 카테고리별로 정리하고 중요 뉴스를 선별
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import supabase from '../services/supabase';

// ============================================================================
// 타입 정의
// ============================================================================

export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string | null;
  source_name: string;
  source_url: string;
  thumbnail_url: string | null;
  published_at: string;
  tags: string[];
  category: 'crypto' | 'stock' | 'macro' | 'general';
  is_pick: boolean;
  pick_reason: string | null;
  created_at: string;
}

export type NewsCategoryFilter = 'all' | 'crypto' | 'stock' | 'macro';

// ============================================================================
// 뉴스 목록 (무한 스크롤)
// ============================================================================

const NEWS_PAGE_SIZE = 20;

export const useMarketNews = (category: NewsCategoryFilter = 'all') => {
  return useInfiniteQuery({
    queryKey: ['marketNews', category],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        let query = supabase
          .from('market_news')
          .select('*')
          .order('published_at', { ascending: false });

        if (category !== 'all') {
          query = query.eq('category', category);
        }

        query = query.range(pageParam, pageParam + NEWS_PAGE_SIZE - 1);

        const { data, error } = await query;

        if (error) {
          console.warn('[MarketNews] 조회 실패 (빈 배열 반환):', error.message);
          return [] as MarketNewsItem[];
        }

        return (data || []) as MarketNewsItem[];
      } catch (err) {
        console.warn('[MarketNews] 조회 예외:', err);
        return [] as MarketNewsItem[];
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < NEWS_PAGE_SIZE) return undefined;
      return allPages.length * NEWS_PAGE_SIZE;
    },
    staleTime: 60000, // 60초 캐시
  });
};

// ============================================================================
// AI PiCK 뉴스 (상위 5개)
// ============================================================================

export const usePickNews = () => {
  return useQuery({
    queryKey: ['pickNews'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('market_news')
          .select('*')
          .eq('is_pick', true)
          .order('published_at', { ascending: false })
          .limit(5);

        if (error) {
          console.warn('[MarketNews] PiCK 조회 실패:', error.message);
          return [] as MarketNewsItem[];
        }

        return (data || []) as MarketNewsItem[];
      } catch (err) {
        console.warn('[MarketNews] PiCK 조회 예외:', err);
        return [] as MarketNewsItem[];
      }
    },
    staleTime: 60000,
  });
};

// ============================================================================
// 시간 포맷 유틸리티
// ============================================================================

/**
 * "N분 전", "N시간 전", "N일 전" 형식으로 변환
 */
export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  // 7일 이상이면 날짜 표시
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}
