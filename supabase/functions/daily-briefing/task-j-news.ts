// @ts-nocheck
// ============================================================================
// Task J: 실시간 뉴스 수집 (News Collection) — Phase 1 토큰 최적화
//
// [최적화 포인트]
// 1. 기계적 선태깅: STOCK_LIST 37종목 기반 자동 태그/카테고리 (AI 전 선처리)
// 2. 배치 크기 10→20 (API 호출 50% 절감)
// 3. Google Search 비활성화 (뉴스 태깅에 불필요 → 그라운딩 토큰 절약)
// 4. responseMimeType: 'application/json' (JSON 예시 프롬프트 제거)
// 5. 프롬프트 길이 ~60% 단축
// ============================================================================

import {
  supabase,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  STOCK_LIST,
  sleep,
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
// Phase 1: 기계적 선태깅 (AI 호출 전 자동 분류)
// 비유: 우체부가 봉투에 적힌 부서명 보고 먼저 분류 → 애매한 것만 사장님(AI)한테
// ============================================================================

/** 매크로 경제 키워드 — 이 키워드가 제목에 있으면 category='macro' */
const MACRO_KEYWORDS = [
  '금리', 'cpi', '연준', 'fed', 'fomc', '기준금리', 'gdp', '실업률',
  '환율', '달러', '인플레이션', '물가', '국채', '채권', '경기', '무역',
  '관세', '재정', '통화정책', '양적', 'pce', '고용', '제조업', 'pmi',
];

interface PreTagResult {
  tags: string[];
  category: 'crypto' | 'stock' | 'macro' | 'general';
}

/**
 * 뉴스 제목+설명에서 STOCK_LIST 기반 자동 태그/카테고리 추출
 * AI 호출 없이 기계적으로 판단 → 토큰 절약
 */
function preTagNews(title: string, description?: string): PreTagResult {
  const text = `${title} ${description || ''}`.toLowerCase();
  const tags: string[] = [];
  let category: PreTagResult['category'] = 'general';
  let hasCrypto = false;
  let hasStock = false;

  // STOCK_LIST 37종목 매칭
  for (const stock of STOCK_LIST) {
    // 티커 매칭 (대소문자 무시, .KS 제거)
    const tickerClean = stock.ticker.replace('.KS', '').toLowerCase();
    // 한국어 이름 매칭
    const nameLower = stock.name.toLowerCase();

    if (text.includes(tickerClean) || text.includes(nameLower)) {
      // 태그는 보기 좋은 형태로 (BTC, 삼성전자 등)
      const displayTag = stock.sector === 'Crypto'
        ? stock.ticker
        : stock.ticker.includes('.KS')
          ? stock.name  // 한국 주식은 한국어 이름
          : stock.ticker; // 미국 주식/ETF는 티커

      if (!tags.includes(displayTag)) tags.push(displayTag);

      if (stock.sector === 'Crypto') hasCrypto = true;
      else hasStock = true;
    }
  }

  // 카테고리 결정: crypto > stock > macro > general
  if (hasCrypto) category = 'crypto';
  else if (hasStock) category = 'stock';
  else {
    // 매크로 키워드 체크
    for (const kw of MACRO_KEYWORDS) {
      if (text.includes(kw)) {
        category = 'macro';
        break;
      }
    }
  }

  return { tags: tags.slice(0, 5), category };
}

// ============================================================================
// Phase 1: Gemini 직접 호출 (Google Search 제거 + JSON 강제)
// 비유: 기존엔 "검색도 해봐" 시켰는데, 뉴스 분류엔 검색이 불필요 → 비용 절약
// ============================================================================

/**
 * Gemini API 직접 호출 (Google Search 없이, JSON 출력 강제)
 * - Google Search 그라운딩 제거 → 그라운딩 토큰 0
 * - responseMimeType: 'application/json' → 프롬프트에서 JSON 예시 제거 가능
 * - temperature 0.3 (태깅은 창의성 불필요, 일관성 중요)
 */
async function callGeminiDirect(prompt: string): Promise<string> {
  await sleep(1000);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    // ★ Google Search 도구 없음 → 그라운딩 토큰 절약
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json', // ★ JSON 출력 강제 → 파싱 에러 제거
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90초 (20개 배치 처리 시간 확보)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 에러 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts) {
      throw new Error('Gemini API 빈 응답');
    }

    return data.candidates[0].content.parts.map((p: any) => p.text || '').join('');
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Gemini API 90초 타임아웃');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
 * Phase 1 최적화 — Gemini 뉴스 배치 태깅
 *
 * [최적화 전] 배치 10개, 긴 프롬프트(~1200토큰), Google Search 사용
 * [최적화 후] 배치 20개, 짧은 프롬프트(~400토큰), Google Search 제거, 선태깅 포함
 *
 * 비유: 이전엔 "이 편지들 전부 읽고 분류해줘" → 이제는 "봉투에 적힌 부서명은 이미 읽었어, 중요도만 판단해줘"
 */
async function tagNewsWithGemini(items: RawNewsItem[]): Promise<TaggedNews[]> {
  if (items.length === 0) return [];

  const BATCH_SIZE = 20; // ← 10에서 20으로 (API 호출 50% 절감)
  const results: TaggedNews[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // ── Step 1: 기계적 선태깅 (AI 호출 없이 자동 분류) ──
    const preTags = batch.map(item => preTagNews(item.title, item.description));

    // 뉴스 목록 (선태깅 결과 포함 → AI가 확인만 하면 됨)
    const newsList = batch.map((item, idx) => {
      const pt = preTags[idx];
      const tagStr = pt.tags.length > 0 ? pt.tags.join(',') : '미감지';
      return `[${idx}] ${item.title} | 태그:${tagStr} | 분류:${pt.category}`;
    }).join('\n');

    // ── Step 2: 다이어트 프롬프트 (기존 대비 ~60% 짧음) ──
    const prompt = `금융뉴스 ${batch.length}건 분석. 태그·분류는 사전감지됨. 확인·보완 후 영향도 추가.
${newsList}
각 항목 JSON 배열:
- index: 번호
- tags: 사전태그 확인/보완 (누락 추가, 오류 수정)
- category: "crypto"|"stock"|"macro"|"general" (사전분류 확인/수정)
- summary: 한국어 50자 요약
- is_pick: 핵심뉴스 여부 (배치당 최대 2개)
- impact_summary: "~보유자" 관점 영향+전망 80자
- impact_score: -2(매우부정)~+2(매우긍정)`;

    try {
      // ★ callGeminiDirect: Google Search 없음 + JSON 출력 강제
      const response = await callGeminiDirect(prompt);
      const parsed = JSON.parse(response) as Array<{
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
        const pt = preTags[tag.index];

        const validCategories = ['crypto', 'stock', 'macro', 'general'];
        // AI 결과 우선, 실패 시 선태깅 결과 사용
        const category = validCategories.includes(tag.category)
          ? tag.category as TaggedNews['category']
          : pt.category;

        // 태그: AI 결과와 선태깅 결과 병합 (중복 제거)
        const aiTags = Array.isArray(tag.tags) ? tag.tags : [];
        const mergedTags = [...new Set([...aiTags, ...pt.tags])].slice(0, 5);

        // impact_score 범위 검증 (-2 ~ +2)
        let impactScore = typeof tag.impact_score === 'number' ? tag.impact_score : 0;
        impactScore = Math.max(-2, Math.min(2, Math.round(impactScore)));

        results.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: item.source,
          summary: tag.summary || item.description,
          tags: mergedTags,
          category,
          is_pick: !!tag.is_pick,
          pick_reason: tag.pick_reason || undefined,
          impact_summary: tag.impact_summary || undefined,
          impact_score: impactScore,
        });
      }

      console.log(`[Task J] Gemini 태깅 완료: ${parsed.length}/${batch.length}건 (배치 ${Math.floor(i / BATCH_SIZE) + 1})`);
    } catch (err) {
      console.warn(`[Task J] Gemini 실패 (배치 ${Math.floor(i / BATCH_SIZE) + 1}), 선태깅 결과로 저장:`, err);

      // ★ AI 실패 시에도 선태깅 결과로 저장 (기존: 빈 태그/general)
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const pt = preTags[j];
        results.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: item.source,
          summary: item.description,
          tags: pt.tags,
          category: pt.category,
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
      source: item.source, // ★ 원본 컬럼 (NOT NULL)
      content: item.summary?.substring(0, 300) || item.title, // ★ 원본 컬럼 (NOT NULL)
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

    // ── 3시간 이내 뉴스만 통과 (30분 수집 주기에 맞춘 실시간성) ──
    const FRESHNESS_MS = 3 * 60 * 60 * 1000; // 3시간
    const now = Date.now();
    const freshItems = allItems.filter(item => {
      const pubTime = new Date(item.pubDate).getTime();
      const age = now - pubTime;
      if (isNaN(pubTime)) return true;
      return age <= FRESHNESS_MS;
    });
    console.log(`[Task J] 3시간 이내 뉴스: ${freshItems.length}/${allItems.length}건`);

    // ── 금융 뉴스만 통과 (crypto/stock/macro — general 제외) ──
    const financeItems = freshItems.filter(item => {
      const pt = preTagNews(item.title, item.description);
      return pt.category !== 'general'; // crypto, stock, macro만 통과
    });
    console.log(`[Task J] 금융뉴스 필터: ${freshItems.length} → ${financeItems.length}건 (general ${freshItems.length - financeItems.length}건 제외)`);

    // ── 제목 기반 중복 제거 (RSS 소스 간 동일 기사 필터링) ──
    const seenTitles = new Set<string>();
    const dedupedItems: RawNewsItem[] = [];
    for (const item of financeItems) {
      if (!seenTitles.has(item.normalizedTitle)) {
        seenTitles.add(item.normalizedTitle);
        dedupedItems.push(item);
      }
    }
    console.log(`[Task J] 제목 중복 제거: ${financeItems.length} → ${dedupedItems.length}건`);

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
