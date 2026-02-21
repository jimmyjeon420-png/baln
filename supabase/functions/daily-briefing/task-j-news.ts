// @ts-nocheck
// ============================================================================
// Task J: 실시간 뉴스 수집 (News Collection)
// 한국경제 RSS + Google News RSS → Gemini AI 태깅 → market_news UPSERT
//
// [흐름]
// 1. RSS 피드 파싱 (한국경제, Google News 한국어 비즈니스)
// 2. Gemini로 각 뉴스에 티커 태그 + 카테고리 + PiCK 여부 판별
// 3. market_news 테이블에 UPSERT (source_url 기준 중복 방지)
// 4. 30일 이상 된 뉴스 자동 삭제
// ============================================================================

import {
  supabase,
  callGeminiWithSearch,
  cleanJsonResponse,
  logTaskResult,
} from './_shared.ts';

// ============================================================================
// RSS 피드 소스 정의
// ============================================================================

const RSS_SOURCES = [
  {
    name: '한국경제',
    url: 'https://www.hankyung.com/feed/all-news',
    maxItems: 20,
  },
  {
    name: 'Google News',
    url: 'https://news.google.com/rss/search?q=주식+OR+비트코인+OR+경제+OR+금리&hl=ko&gl=KR&ceid=KR:ko',
    maxItems: 15,
  },
];

// ============================================================================
// RSS 파싱 (외부 라이브러리 없음, regex 기반)
// ============================================================================

interface RawNewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
}

/**
 * RSS XML에서 뉴스 아이템 추출 (regex 기반)
 * _shared.ts 패턴 따름 — 외부 의존성 없이 순수 텍스트 파싱
 */
function parseRSSItems(xml: string, sourceName: string, maxItems: number): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s);

    if (!titleMatch || !linkMatch) continue;

    const title = titleMatch[1].trim();
    const link = linkMatch[1].trim();

    // Google News 리다이렉트 URL에서 실제 URL 추출 시도
    const cleanLink = link.startsWith('https://news.google.com/rss/articles/')
      ? link // Google News URL 그대로 사용 (리다이렉트는 앱에서 처리)
      : link;

    if (!title || !cleanLink) continue;

    items.push({
      title,
      link: cleanLink,
      pubDate: pubDateMatch?.[1] || new Date().toISOString(),
      source: sourceName,
      description: descMatch?.[1]?.trim().substring(0, 200) || undefined,
    });
  }

  return items;
}

/**
 * RSS 피드 가져오기 + 파싱
 */
async function fetchRSSFeed(source: typeof RSS_SOURCES[number]): Promise<RawNewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'baln-news-bot/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Task J] RSS 실패 (${source.name}): HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items = parseRSSItems(xml, source.name, source.maxItems);
    console.log(`[Task J] ${source.name}: ${items.length}건 파싱 완료`);
    return items;
  } catch (err) {
    console.warn(`[Task J] RSS 가져오기 실패 (${source.name}):`, err);
    return [];
  }
}

// ============================================================================
// Gemini AI 태깅 (배치)
// ============================================================================

interface TaggedNews {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  summary?: string;
  tags: string[];
  category: 'crypto' | 'stock' | 'macro' | 'general';
  is_pick: boolean;
  pick_reason?: string;
}

/**
 * Gemini로 뉴스 배치 태깅
 * 10개씩 묶어서 한 번에 요청 (API 비용 절약)
 */
async function tagNewsWithGemini(items: RawNewsItem[]): Promise<TaggedNews[]> {
  if (items.length === 0) return [];

  const BATCH_SIZE = 10;
  const results: TaggedNews[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const newsList = batch.map((item, idx) =>
      `[${idx}] 제목: ${item.title}\n    설명: ${item.description || '없음'}\n    출처: ${item.source}`
    ).join('\n');

    const prompt = `당신은 금융 뉴스 분류 AI입니다.
아래 ${batch.length}개 뉴스를 분석하고 JSON 배열로 응답하세요.

[뉴스 목록]
${newsList}

[분류 기준]
- tags: 관련 티커/키워드 배열 (예: ["BTC","ETH"], ["삼성전자","SK하이닉스"], ["금리","CPI"])
  - 암호화폐: BTC, ETH, SOL, XRP, DOGE 등
  - 한국 주식: 삼성전자, SK하이닉스, 카카오, 네이버 등 (한국어 이름)
  - 미국 주식: NVDA, TSLA, AAPL, MSFT 등 (티커)
  - 비관련이면 빈 배열 []
- category: "crypto" | "stock" | "macro" | "general"
  - crypto: 암호화폐 관련
  - stock: 개별 종목/ETF 관련
  - macro: 금리/환율/GDP/CPI 등 거시경제
  - general: 기타
- summary: 1~2문장 한국어 요약 (50자 이내)
- is_pick: 투자자가 반드시 읽어야 할 핵심 뉴스인지 (true/false, 배치당 최대 2개)
- pick_reason: is_pick이 true일 때 이유 (20자 이내)

[응답 형식 — JSON 배열만 출력. 설명문·마크다운 절대 금지.]
[
  { "index": 0, "tags": ["BTC"], "category": "crypto", "summary": "비트코인...", "is_pick": false },
  ...
]
`;

    try {
      const response = await callGeminiWithSearch(prompt);
      const cleaned = cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned) as Array<{
        index: number;
        tags: string[];
        category: string;
        summary?: string;
        is_pick?: boolean;
        pick_reason?: string;
      }>;

      for (const tag of parsed) {
        const item = batch[tag.index];
        if (!item) continue;

        const validCategories = ['crypto', 'stock', 'macro', 'general'];
        const category = validCategories.includes(tag.category)
          ? tag.category as TaggedNews['category']
          : 'general';

        results.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: item.source,
          summary: tag.summary || item.description,
          tags: Array.isArray(tag.tags) ? tag.tags.slice(0, 5) : [],
          category,
          is_pick: !!tag.is_pick,
          pick_reason: tag.pick_reason || undefined,
        });
      }

      console.log(`[Task J] Gemini 태깅 완료: ${parsed.length}/${batch.length}건 (배치 ${Math.floor(i / BATCH_SIZE) + 1})`);
    } catch (err) {
      console.warn(`[Task J] Gemini 태깅 실패 (배치 ${Math.floor(i / BATCH_SIZE) + 1}), 기본값 적용:`, err);

      // 태깅 실패 시 기본값으로 삽입
      for (const item of batch) {
        results.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: item.source,
          summary: item.description,
          tags: [],
          category: 'general',
          is_pick: false,
        });
      }
    }
  }

  return results;
}

// ============================================================================
// DB UPSERT + 정리
// ============================================================================

/**
 * market_news 테이블에 UPSERT (source_url 기준 중복 방지)
 */
async function upsertNews(taggedItems: TaggedNews[]): Promise<number> {
  if (taggedItems.length === 0) return 0;

  let upsertedCount = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < taggedItems.length; i += BATCH_SIZE) {
    const batch = taggedItems.slice(i, i + BATCH_SIZE);

    const rows = batch.map(item => ({
      title: item.title.substring(0, 500),
      summary: item.summary?.substring(0, 300) || null,
      source_name: item.source,
      source_url: item.link,
      thumbnail_url: null,
      published_at: new Date(item.pubDate).toISOString(),
      tags: item.tags,
      category: item.category,
      is_pick: item.is_pick,
      pick_reason: item.pick_reason || null,
    }));

    const { error } = await supabase
      .from('market_news')
      .upsert(rows, { onConflict: 'source_url' });

    if (error) {
      console.warn(`[Task J] UPSERT 실패 (배치 ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
    } else {
      upsertedCount += batch.length;
    }
  }

  return upsertedCount;
}

/**
 * 30일 이상 된 뉴스 삭제 (스토리지 절약)
 */
async function cleanupOldNews(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('market_news')
    .delete()
    .lt('published_at', thirtyDaysAgo.toISOString())
    .select('id');

  if (error) {
    console.warn('[Task J] 오래된 뉴스 삭제 실패:', error.message);
    return 0;
  }

  const deleted = data?.length || 0;
  if (deleted > 0) {
    console.log(`[Task J] ${deleted}건 오래된 뉴스 삭제 완료`);
  }
  return deleted;
}

// ============================================================================
// Task J 통합 실행
// ============================================================================

export interface NewsCollectionResult {
  totalFetched: number;
  totalUpserted: number;
  totalDeleted: number;
  sources: Record<string, number>;
}

/**
 * Task J 메인 함수
 * 1. RSS 피드 수집 → 2. Gemini AI 태깅 → 3. DB UPSERT → 4. 오래된 뉴스 정리
 */
export async function runNewsCollection(): Promise<NewsCollectionResult> {
  const startTime = Date.now();

  try {
    console.log('[Task J] 뉴스 수집 시작...');

    // 1. 모든 RSS 소스에서 뉴스 수집 (병렬)
    const feedResults = await Promise.allSettled(
      RSS_SOURCES.map(source => fetchRSSFeed(source))
    );

    const allItems: RawNewsItem[] = [];
    const sourceCount: Record<string, number> = {};

    for (let i = 0; i < feedResults.length; i++) {
      const result = feedResults[i];
      const sourceName = RSS_SOURCES[i].name;

      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
        sourceCount[sourceName] = result.value.length;
      } else {
        console.warn(`[Task J] ${sourceName} 수집 실패:`, result.reason);
        sourceCount[sourceName] = 0;
      }
    }

    console.log(`[Task J] RSS 수집 완료: ${allItems.length}건`);

    if (allItems.length === 0) {
      const elapsed = Date.now() - startTime;
      await logTaskResult('news_collection', 'SUCCESS', elapsed, {
        totalFetched: 0,
        totalUpserted: 0,
        message: 'RSS 피드에서 뉴스를 가져오지 못했습니다',
      });
      return { totalFetched: 0, totalUpserted: 0, totalDeleted: 0, sources: sourceCount };
    }

    // 2. Gemini AI 태깅
    const taggedItems = await tagNewsWithGemini(allItems);
    console.log(`[Task J] AI 태깅 완료: ${taggedItems.length}건`);

    // 3. DB UPSERT
    const upsertedCount = await upsertNews(taggedItems);
    console.log(`[Task J] DB 저장 완료: ${upsertedCount}건`);

    // 4. 오래된 뉴스 정리
    const deletedCount = await cleanupOldNews();

    const elapsed = Date.now() - startTime;
    await logTaskResult('news_collection', 'SUCCESS', elapsed, {
      totalFetched: allItems.length,
      totalUpserted: upsertedCount,
      totalDeleted: deletedCount,
      sources: sourceCount,
    });

    return {
      totalFetched: allItems.length,
      totalUpserted: upsertedCount,
      totalDeleted: deletedCount,
      sources: sourceCount,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('news_collection', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
