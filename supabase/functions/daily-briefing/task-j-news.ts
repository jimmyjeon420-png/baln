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
    maxItems: 20,
  },
  {
    name: '연합뉴스',
    url: 'https://www.yna.co.kr/rss/economy.xml',
    maxItems: 15,
  },
  {
    name: '매일경제',
    url: 'https://www.mk.co.kr/rss/30100041/',
    maxItems: 15,
  },
  {
    name: '코인데스크',
    url: 'https://www.coindeskkorea.com/rss',
    maxItems: 15,
  },
];

// ============================================================================
// 제목 정규화 (중복 제거용)
// ============================================================================

/**
 * 뉴스 제목을 정규화하여 중복 비교에 사용
 * - 공백/특수문자 제거
 * - 소문자 변환 (영어)
 * - 출처 접미사 제거 (예: " - 한국경제", " | 조선일보")
 */
function normalizeTitle(title: string): string {
  return title
    .replace(/\s*[-–|·].*?(경제|일보|뉴스|신문|타임스|투데이|데일리|미디어|뉴시스|연합).*$/g, '')
    .replace(/[\s\u200B\u00A0]+/g, '') // 공백·제로폭·NBSP 제거
    .replace(/[^\w가-힣]/g, '')         // 특수문자 제거
    .toLowerCase();
}

// ============================================================================
// RSS 파싱 (외부 라이브러리 없음, regex 기반)
// ============================================================================

interface RawNewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
  normalizedTitle: string;
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
      normalizedTitle: normalizeTitle(title),
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
  /** 투자자 관점 영향 분석 (예: "BTC 보유자 주의. 기관 매도세로 단기 하락 가능") */
  impact_summary?: string;
  /** -2(매우부정) ~ +2(매우긍정), 0=중립 */
  impact_score?: number;
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

    const prompt = `당신은 금융 뉴스 분석 AI입니다. 개인 투자자의 관점에서 뉴스를 분석합니다.
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
- summary: 1~2문장 한국어 요약 (50자 이내)
- is_pick: 투자자가 반드시 읽어야 할 핵심 뉴스인지 (true/false, 배치당 최대 2개)
- pick_reason: is_pick이 true일 때 이유 (20자 이내)
- impact_summary: 이 뉴스가 관련 자산 보유자에게 미치는 영향 + 향후 전망을 한국어 1~2문장으로 작성 (80자 이내)
  - 반드시 "~보유자" 관점으로 작성
  - 단기(1~3일) 방향성과 이유를 포함
  - 예: "BTC 보유자 주의. 기관 매도세 확대로 단기 하락 압력, 9만달러 지지선 주목"
  - 예: "삼성전자 보유자 긍정. HBM 수주 확대로 실적 기대감 상승, 단기 상승 모멘텀"
  - 예: "전체 포트폴리오 주의. CPI 상승으로 금리 인상 우려, 성장주 중심 조정 가능"
- impact_score: 관련 자산 보유자 입장에서 영향 점수
  - -2: 매우 부정적 (급락 가능성)
  - -1: 부정적 (하락 압력)
  - 0: 중립 (방향성 불명확)
  - +1: 긍정적 (상승 기대)
  - +2: 매우 긍정적 (급등 가능성)

[응답 형식 — JSON 배열만 출력. 설명문·마크다운 절대 금지.]
[
  { "index": 0, "tags": ["BTC"], "category": "crypto", "summary": "...", "is_pick": false, "impact_summary": "...", "impact_score": -1 },
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
        impact_summary?: string;
        impact_score?: number;
      }>;

      for (const tag of parsed) {
        const item = batch[tag.index];
        if (!item) continue;

        const validCategories = ['crypto', 'stock', 'macro', 'general'];
        const category = validCategories.includes(tag.category)
          ? tag.category as TaggedNews['category']
          : 'general';

        // impact_score 범위 검증 (-2 ~ +2)
        let impactScore = typeof tag.impact_score === 'number' ? tag.impact_score : 0;
        impactScore = Math.max(-2, Math.min(2, Math.round(impactScore)));

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
          impact_summary: tag.impact_summary || undefined,
          impact_score: impactScore,
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
      impact_summary: item.impact_summary?.substring(0, 200) || null,
      impact_score: item.impact_score ?? 0,
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
 * 3일 이상 된 뉴스 삭제 (DB 과부하 방지)
 */
async function cleanupOldNews(): Promise<number> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data, error } = await supabase
    .from('market_news')
    .delete()
    .lt('published_at', threeDaysAgo.toISOString())
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

    console.log(`[Task J] RSS 수집 완료 (원본): ${allItems.length}건`);

    // ── 1시간 이내 뉴스만 통과 (실시간성 보장) ──
    const FRESHNESS_MS = 60 * 60 * 1000; // 1시간
    const now = Date.now();
    const freshItems = allItems.filter(item => {
      const pubTime = new Date(item.pubDate).getTime();
      const age = now - pubTime;
      if (isNaN(pubTime)) return true;
      return age <= FRESHNESS_MS;
    });
    console.log(`[Task J] 1시간 이내 뉴스: ${freshItems.length}/${allItems.length}건`);

    // ── 제목 기반 중복 제거 (RSS 소스 간 동일 기사 필터링) ──
    const seenTitles = new Set<string>();
    const dedupedItems: RawNewsItem[] = [];
    for (const item of freshItems) {
      if (!seenTitles.has(item.normalizedTitle)) {
        seenTitles.add(item.normalizedTitle);
        dedupedItems.push(item);
      }
    }
    console.log(`[Task J] 제목 중복 제거: ${freshItems.length} → ${dedupedItems.length}건`);

    // ── DB 기존 제목 체크 (최근 3일 뉴스의 제목과 비교) ──
    let existingTitles = new Set<string>();
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { data: existing } = await supabase
        .from('market_news')
        .select('title')
        .gte('published_at', threeDaysAgo.toISOString());
      if (existing) {
        existingTitles = new Set(existing.map((r: any) => normalizeTitle(r.title)));
      }
    } catch (err) {
      console.warn('[Task J] 기존 뉴스 조회 실패, 전체 upsert 진행:', err);
    }

    const newItems = dedupedItems.filter(item => !existingTitles.has(item.normalizedTitle));
    console.log(`[Task J] DB 중복 제거 후: ${newItems.length}건 (기존 ${existingTitles.size}건 스킵)`);

    if (newItems.length === 0) {
      const elapsed = Date.now() - startTime;
      await logTaskResult('news_collection', 'SUCCESS', elapsed, {
        totalFetched: 0,
        totalUpserted: 0,
        message: 'RSS 피드에서 뉴스를 가져오지 못했습니다',
      });
      return { totalFetched: 0, totalUpserted: 0, totalDeleted: 0, sources: sourceCount };
    }

    // 2. Gemini AI 태깅 (새 뉴스만)
    const taggedItems = await tagNewsWithGemini(newItems);
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
