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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  /** AI 투자 영향 분석 (예: "BTC 보유자 주의. 기관 매도세로 단기 하락 가능") */
  impact_summary: string | null;
  /** -2(매우부정) ~ +2(매우긍정), 0=중립 */
  impact_score: number | null;
  /** 신선도(50) + 자산관련도(30) + 출처신뢰도(20) 기반 품질 점수 */
  news_quality_score?: number | null;
  freshness_score?: number | null;
  asset_relevance_score?: number | null;
  source_trust_score?: number | null;
  created_at: string;
}

export type NewsCategoryFilter = 'all' | 'crypto' | 'stock' | 'macro';

const NEWS_COLLECTION_COOLDOWN_KEY = '@baln:news_collection_last_trigger';
const NEWS_COLLECTION_COOLDOWN_MS = 20 * 60 * 1000; // 20분
const FALLBACK_PAGE_SIZE = 6;
const FALLBACK_FRESHNESS_MS = 6 * 60 * 60 * 1000; // 6시간

interface FallbackFeedSource {
  name: string;
  url: string;
}

function isAllowedFallbackLink(rawLink: string): boolean {
  try {
    const url = new URL(rawLink);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const FALLBACK_FEEDS: Record<NewsCategoryFilter, FallbackFeedSource[]> = {
  all: [
    { name: '한국경제', url: 'https://www.hankyung.com/feed/all-news' },
    { name: '연합뉴스', url: 'https://www.yna.co.kr/rss/economy.xml' },
    { name: '매일경제', url: 'https://www.mk.co.kr/rss/30100041/' },
  ],
  crypto: [
    { name: '코인데스크', url: 'https://www.coindeskkorea.com/rss' },
    { name: '비트코인매거진', url: 'https://bitcoinmagazine.com/.rss/full/' },
    { name: 'Google News', url: 'https://news.google.com/rss/search?q=비트코인+OR+이더리움+OR+가상자산&hl=ko&gl=KR&ceid=KR:ko' },
  ],
  stock: [
    { name: '한국경제', url: 'https://www.hankyung.com/feed/all-news' },
    { name: 'Google News', url: 'https://news.google.com/rss/search?q=코스피+OR+나스닥+OR+미국증시+OR+주식&hl=ko&gl=KR&ceid=KR:ko' },
  ],
  macro: [
    { name: '연합뉴스', url: 'https://www.yna.co.kr/rss/economy.xml' },
    { name: 'Google News', url: 'https://news.google.com/rss/search?q=금리+OR+연준+OR+CPI+OR+환율+OR+경기&hl=ko&gl=KR&ceid=KR:ko' },
  ],
};

function safeDateISO(value?: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseRssItems(xml: string): { title: string; link: string; pubDate?: string; summary?: string }[] {
  const items: { title: string; link: string; pubDate?: string; summary?: string }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null = null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < FALLBACK_PAGE_SIZE) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s);

    if (!titleMatch || !linkMatch) continue;
    const title = titleMatch[1].trim();
    const link = linkMatch[1].trim();
    if (!title || !link) continue;

    items.push({
      title,
      link,
      pubDate: pubDateMatch?.[1],
      summary: descMatch?.[1]?.trim(),
    });
  }

  return items;
}

async function fetchFallbackMarketNews(category: NewsCategoryFilter): Promise<MarketNewsItem[]> {
  const feeds = FALLBACK_FEEDS[category] ?? FALLBACK_FEEDS.all;
  const collected: MarketNewsItem[] = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'baln-news-fallback/1.0',
        },
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const parsed = parseRssItems(xml);
      const fallbackCategory: MarketNewsItem['category'] = category === 'all' ? 'general' : category;
      const mapped = parsed
        .filter((item) => isAllowedFallbackLink(item.link))
        .map((item, idx) => ({
        id: `fallback-${feed.name}-${idx}-${item.link}`,
        title: item.title,
        summary: item.summary?.slice(0, 280) || null,
        source_name: feed.name,
        source_url: item.link,
        thumbnail_url: null,
        published_at: safeDateISO(item.pubDate),
        tags: [] as string[],
        category: fallbackCategory,
        is_pick: false,
        pick_reason: null,
        impact_summary: null,
        impact_score: 0,
        created_at: new Date().toISOString(),
      }));
      collected.push(...mapped);
    } catch {
      // fallback fetch 실패는 무시
    }
  }

  const deduped = new Map<string, MarketNewsItem>();
  for (const item of collected) {
    const key = `${item.title.trim().toLowerCase()}|${item.source_url.trim().toLowerCase()}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return Array.from(deduped.values())
    .filter((item) => (Date.now() - new Date(item.published_at).getTime()) <= FALLBACK_FRESHNESS_MS)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, FALLBACK_PAGE_SIZE);
}

// ============================================================================
// 뉴스 목록 (무한 스크롤)
// ============================================================================

const NEWS_PAGE_SIZE = 20;

export const useMarketNews = (category: NewsCategoryFilter = 'all') => {
  return useInfiniteQuery({
    queryKey: ['marketNews', category],
    queryFn: async ({ pageParam = 0 }) => {
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
        // 테이블/권한/일시 오류 시 1페이지에서만 RSS fallback 시도
        if (pageParam === 0) {
          return fetchFallbackMarketNews(category);
        }
        throw new Error(error.message || '뉴스 조회에 실패했습니다.');
      }

      const rows = (data || []) as MarketNewsItem[];
      if (rows.length > 0) return rows;

      // DB가 비었을 때 1페이지 fallback
      if (pageParam === 0) {
        return fetchFallbackMarketNews(category);
      }
      return [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < NEWS_PAGE_SIZE) return undefined;
      return allPages.length * NEWS_PAGE_SIZE;
    },
    staleTime: 30000, // 30초 캐시 (실시간성 강화)
  });
};

// ============================================================================
// AI PiCK 뉴스 (상위 5개)
// ============================================================================

export const usePickNews = () => {
  return useQuery({
    queryKey: ['pickNews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_news')
        .select('*')
        .eq('is_pick', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) {
        throw new Error(error.message || 'AI PiCK 조회에 실패했습니다.');
      }

      return (data || []) as MarketNewsItem[];
    },
    staleTime: 30000,
  });
};

// ============================================================================
// 뉴스 자동 복구 (Task J 트리거)
// ============================================================================

export async function triggerNewsCollectionIfNeeded(reason: 'empty' | 'stale'): Promise<{
  triggered: boolean;
  skippedByCooldown: boolean;
  error?: string;
}> {
  try {
    const now = Date.now();
    const raw = await AsyncStorage.getItem(NEWS_COLLECTION_COOLDOWN_KEY);
    const lastTriggeredAt = raw ? Number(raw) : 0;

    if (Number.isFinite(lastTriggeredAt) && now - lastTriggeredAt < NEWS_COLLECTION_COOLDOWN_MS) {
      return { triggered: false, skippedByCooldown: true };
    }

    await AsyncStorage.setItem(NEWS_COLLECTION_COOLDOWN_KEY, String(now));

    const { error } = await supabase.functions.invoke('daily-briefing', {
      body: {
        tasks: 'J',
        reason: `news_tab_${reason}`,
      },
    });

    if (error) {
      return {
        triggered: false,
        skippedByCooldown: false,
        error: error.message || '뉴스 수집 호출 실패',
      };
    }

    return { triggered: true, skippedByCooldown: false };
  } catch (err) {
    return {
      triggered: false,
      skippedByCooldown: false,
      error: err instanceof Error ? err.message : '알 수 없는 오류',
    };
  }
}

// ============================================================================
// 시간 포맷 유틸리티
// ============================================================================

/**
 * 뉴스 피드 스타일 시간 표시
 * - 1시간 이내: "32분 전"
 * - 오늘: "10:34"
 * - 어제~7일: "3일 전"
 * - 그 이상: "2월 13일"
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

  // 오늘이면 시간만 표시 (실시간 뉴스 스타일)
  const isToday = now.getDate() === date.getDate()
    && now.getMonth() === date.getMonth()
    && now.getFullYear() === date.getFullYear();
  if (isToday) {
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}월 ${d}일`;
}

/**
 * 30분 이내 뉴스인지 판별 (초록색 하이라이트 기준)
 */
export function isRecentNews(dateString: string): boolean {
  const diffMs = Date.now() - new Date(dateString).getTime();
  return diffMs < 30 * 60 * 1000; // 30분
}

/**
 * "HH:MM" 형식 시간 반환 (마지막 업데이트 시간 표시용)
 */
export function formatUpdateTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
