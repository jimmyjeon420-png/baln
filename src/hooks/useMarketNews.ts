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
  category: MarketNewsCategory;
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

export const ALLOWED_NEWS_CATEGORIES = ['stock', 'crypto', 'macro'] as const;
export type MarketNewsCategory = typeof ALLOWED_NEWS_CATEGORIES[number];
export type NewsCategoryFilter = 'all' | MarketNewsCategory;

const NEWS_COLLECTION_COOLDOWN_KEY = '@baln:news_collection_last_trigger';
const NEWS_COLLECTION_COOLDOWN_MS = 20 * 60 * 1000; // 20분
const FALLBACK_PAGE_SIZE = 6;
const FALLBACK_FRESHNESS_MS = 6 * 60 * 60 * 1000; // 6시간
const NEWS_STALE_THRESHOLD_MS = 90 * 60 * 1000; // 90분

interface FallbackFeedSource {
  name: string;
  url: string;
}

const CRYPTO_CATEGORY_KEYWORDS = [
  'bitcoin', 'btc', '비트코인', 'ethereum', 'eth', '이더리움',
  'xrp', '리플', 'sol', '솔라나', '코인', '암호화폐', '가상자산', '블록체인',
];

const STOCK_CATEGORY_KEYWORDS = [
  '코스피', '코스닥', 'kospi', 'kosdaq', '나스닥', 'nasdaq', 's&p', 's&p500',
  '다우', 'dow', '주식', '증시', '기업', '실적', 'ipo', '상장',
  '삼성전자', '엔비디아', '애플', '테슬라',
];

const MACRO_CATEGORY_KEYWORDS = [
  '금리', '기준금리', '연준', 'fed', 'fomc', 'cpi', 'pce', 'gdp', 'pmi',
  '실업률', '고용', '환율', '달러', '인플레이션', '물가', '국채', '채권',
  '무역', '관세', '재정', '통화정책', '거시경제',
];

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function isAllowedNewsCategory(value: unknown): value is MarketNewsCategory {
  return typeof value === 'string'
    && (ALLOWED_NEWS_CATEGORIES as readonly string[]).includes(value);
}

function classifyNewsCategory(title: string, summary?: string | null): MarketNewsCategory | null {
  const text = `${title} ${summary || ''}`.toLowerCase();
  if (includesAnyKeyword(text, CRYPTO_CATEGORY_KEYWORDS)) return 'crypto';
  if (includesAnyKeyword(text, STOCK_CATEGORY_KEYWORDS)) return 'stock';
  if (includesAnyKeyword(text, MACRO_CATEGORY_KEYWORDS)) return 'macro';
  return null;
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
  ],
  stock: [
    { name: '한국경제', url: 'https://www.hankyung.com/feed/all-news' },
    { name: '연합뉴스', url: 'https://www.yna.co.kr/rss/economy.xml' },
    { name: '매일경제', url: 'https://www.mk.co.kr/rss/30100041/' },
  ],
  macro: [
    { name: '연합뉴스', url: 'https://www.yna.co.kr/rss/economy.xml' },
    { name: '매일경제', url: 'https://www.mk.co.kr/rss/30100041/' },
    { name: '한국경제', url: 'https://www.hankyung.com/feed/all-news' },
  ],
};

function safeDateISO(value?: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeThumbnailUrl(raw: string, baseLink: string): string | null {
  if (!raw) return null;
  const unescaped = decodeXmlEntities(raw.trim())
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim();

  if (!unescaped) return null;

  try {
    const absolute = new URL(unescaped, baseLink);
    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') return null;
    if (absolute.protocol === 'http:') {
      absolute.protocol = 'https:';
    }
    return absolute.toString();
  } catch {
    return null;
  }
}

function isGoogleNewsLink(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.hostname.toLowerCase() === 'news.google.com';
  } catch {
    return false;
  }
}

function isLikelyLogoThumbnail(url: string | null | undefined, articleLink?: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();

  if (
    lower.includes('favicon')
    || lower.includes('/logo')
    || lower.includes('logo_')
    || lower.includes('_logo')
    || lower.includes('logotype')
    || lower.includes('icon')
    || lower.includes('symbol')
    || lower.includes('google.com/s2/favicons')
    || lower.includes('gstatic.com')
    || lower.endsWith('.ico')
  ) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host === 'news.google.com') return true;
    if (host.endsWith('gstatic.com')) return true;
    if (articleLink && isGoogleNewsLink(articleLink) && host.endsWith('googleusercontent.com')) return true;
    if (path.includes('/favicon') || path.includes('/touch-icon') || path.includes('apple-touch-icon')) return true;

    const width = Number(parsed.searchParams.get('w') ?? parsed.searchParams.get('width') ?? parsed.searchParams.get('sz') ?? '');
    const height = Number(parsed.searchParams.get('h') ?? parsed.searchParams.get('height') ?? '');
    if (Number.isFinite(width) && width > 0 && width <= 200) {
      if (!Number.isFinite(height) || (height > 0 && height <= 200)) return true;
    }
  } catch {
    return true;
  }

  return false;
}

function extractThumbnailFromItemXml(itemXml: string, articleLink: string): string | null {
  const encodedContent = itemXml.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i)?.[1] || '';
  const encodedDescription = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] || '';
  const decodedHtml = decodeXmlEntities(`${encodedContent}\n${encodedDescription}`);

  const candidates: (string | undefined)[] = [
    itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1],
    itemXml.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i)?.[1],
    itemXml.match(/<enclosure[^>]*type=["']image\/[^"']*["'][^>]*url=["']([^"']+)["'][^>]*>/i)?.[1],
    itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image\/[^"']*["'][^>]*>/i)?.[1],
    decodedHtml.match(/<img[^>]*src=["']([^"']+)["']/i)?.[1],
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeThumbnailUrl(candidate, articleLink);
    if (!normalized) continue;
    if (isLikelyLogoThumbnail(normalized, articleLink)) continue;
    return normalized;
  }

  return null;
}

function parseRssItems(
  xml: string
): { title: string; link: string; pubDate?: string; summary?: string; thumbnailUrl: string | null }[] {
  const items: { title: string; link: string; pubDate?: string; summary?: string; thumbnailUrl: string | null }[] = [];
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
    if (!isAllowedFallbackLink(link)) continue;

    items.push({
      title,
      link,
      pubDate: pubDateMatch?.[1],
      summary: descMatch?.[1]?.trim(),
      thumbnailUrl: extractThumbnailFromItemXml(itemXml, link),
    });
  }

  return items;
}

function collectHtmlImageCandidates(html: string): string[] {
  const patterns = [
    /<meta[^>]*property=["']og:image(?::secure_url|:url)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url|:url)?["'][^>]*>/gi,
    /<meta[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["'][^>]*>/gi,
    /<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<img[^>]*src=["']([^"']+)["'][^>]*>/gi,
  ];

  const candidates: string[] = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = match[1]?.trim();
      if (!raw) continue;
      candidates.push(raw);
      if (candidates.length >= 30) return candidates;
    }
  }
  return candidates;
}

async function fetchFallbackHeroImage(articleUrl: string): Promise<string | null> {
  if (!isAllowedFallbackLink(articleUrl)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }

    const html = (await res.text()).slice(0, 320000);
    const baseUrl = res.url || articleUrl;
    const candidates = collectHtmlImageCandidates(html);

    for (const candidate of candidates) {
      const normalized = normalizeThumbnailUrl(candidate, baseUrl);
      if (!normalized) continue;
      if (isLikelyLogoThumbnail(normalized, articleUrl)) continue;
      return normalized;
    }
  } catch {
    // 폴백 경로에서는 썸네일 보강 실패를 무시
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

async function enrichFallbackThumbnails(items: MarketNewsItem[]): Promise<MarketNewsItem[]> {
  if (items.length === 0) return items;

  const enriched = items.map((item) => ({ ...item }));
  const targets = enriched
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.thumbnail_url || isLikelyLogoThumbnail(item.thumbnail_url, item.source_url))
    .slice(0, 8); // 폴백 경로 과부하 방지

  if (targets.length === 0) return enriched;

  const CONCURRENCY = 3;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async ({ item, index }) => ({
        index,
        hero: await fetchFallbackHeroImage(item.source_url),
      }))
    );

    for (const result of results) {
      if (!result.hero) continue;
      enriched[result.index].thumbnail_url = result.hero;
    }
  }

  return enriched;
}

function dedupeAndSortNews(items: MarketNewsItem[]): MarketNewsItem[] {
  const deduped = new Map<string, MarketNewsItem>();
  for (const item of items) {
    const key = `${item.title.trim().toLowerCase()}|${item.source_url.trim().toLowerCase()}`;
    const prev = deduped.get(key);
    if (!prev) {
      deduped.set(key, item);
      continue;
    }
    const prevTime = new Date(prev.published_at).getTime();
    const curTime = new Date(item.published_at).getTime();
    if (Number.isFinite(curTime) && (!Number.isFinite(prevTime) || curTime > prevTime)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
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
      const mapped = parsed
        .map((item, idx): MarketNewsItem | null => {
          const strictCategory = classifyNewsCategory(item.title, item.summary);
          if (!strictCategory) return null;
          if (category !== 'all' && strictCategory !== category) return null;

          return {
            id: `fallback-${feed.name}-${idx}-${item.link}`,
            title: item.title,
            summary: item.summary?.slice(0, 280) || null,
            source_name: feed.name,
            source_url: item.link,
            thumbnail_url: item.thumbnailUrl,
            published_at: safeDateISO(item.pubDate),
            tags: [] as string[],
            category: strictCategory,
            is_pick: false,
            pick_reason: null,
            impact_summary: null,
            impact_score: 0,
            created_at: new Date().toISOString(),
          };
        })
        .filter((item): item is MarketNewsItem => item !== null);
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

  const fresh = Array.from(deduped.values())
    .filter((item) => (Date.now() - new Date(item.published_at).getTime()) <= FALLBACK_FRESHNESS_MS)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, FALLBACK_PAGE_SIZE);

  return enrichFallbackThumbnails(fresh);
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
      } else {
        query = query.in('category', [...ALLOWED_NEWS_CATEGORIES]);
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

      const rows = (data || []) as (MarketNewsItem & { category: unknown })[];
      const strictRows = rows.filter((row): row is MarketNewsItem => isAllowedNewsCategory(row.category));
      if (strictRows.length > 0) {
        // DB에 데이터가 있어도 너무 오래됐다면 RSS fallback을 합쳐서 신선도 복구
        if (pageParam === 0) {
          const latestPublishedAt = strictRows[0]?.published_at;
          const latestMs = latestPublishedAt ? new Date(latestPublishedAt).getTime() : NaN;
          const isStale = !Number.isFinite(latestMs) || (Date.now() - latestMs) > NEWS_STALE_THRESHOLD_MS;

          if (isStale) {
            const fallbackRows = await fetchFallbackMarketNews(category);
            if (fallbackRows.length > 0) {
              return dedupeAndSortNews([...strictRows, ...fallbackRows]);
            }
          }
        }

        return strictRows;
      }

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
        .in('category', [...ALLOWED_NEWS_CATEGORIES])
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) {
        throw new Error(error.message || 'AI PiCK 조회에 실패했습니다.');
      }

      const rows = (data || []) as (MarketNewsItem & { category: unknown })[];
      return rows.filter((row): row is MarketNewsItem => isAllowedNewsCategory(row.category));
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

    await AsyncStorage.setItem(NEWS_COLLECTION_COOLDOWN_KEY, String(now));

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
