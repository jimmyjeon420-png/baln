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
  {
    name: '비트코인매거진',
    url: 'https://bitcoinmagazine.com/.rss/full/',
    maxItems: 15,
  },
];

function isAllowedSourceLink(rawLink: string): boolean {
  try {
    const url = new URL(rawLink);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const SOURCE_TRUST_SCORE: Record<string, number> = {
  한국경제: 88,
  연합뉴스: 92,
  매일경제: 87,
  'Google News': 80,
  코인데스크: 84,
  비트코인매거진: 82,
};

const NEWS_FRESHNESS_WINDOW_MS = 6 * 60 * 60 * 1000; // 6시간
const MAX_NEWS_CANDIDATES = 18; // 품질 우선: 과도한 적재 방지
const MAX_AI_ANALYSIS_ITEMS = 12; // 토큰 상한

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

type StrictNewsCategory = 'crypto' | 'stock' | 'macro';

const STRICT_NEWS_CATEGORIES: StrictNewsCategory[] = ['crypto', 'stock', 'macro'];

function isStrictNewsCategory(value: unknown): value is StrictNewsCategory {
  return typeof value === 'string' && STRICT_NEWS_CATEGORIES.includes(value as StrictNewsCategory);
}

interface PreTagResult {
  tags: string[];
  category: StrictNewsCategory | null;
}

/**
 * 뉴스 제목+설명에서 STOCK_LIST 기반 자동 태그/카테고리 추출
 * AI 호출 없이 기계적으로 판단 → 토큰 절약
 */
function preTagNews(title: string, description?: string): PreTagResult {
  const text = `${title} ${description || ''}`.toLowerCase();
  const tags: string[] = [];
  let category: PreTagResult['category'] = null;
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

  // 카테고리 결정: crypto > stock > macro
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
  thumbnailUrl: string | null;
  normalizedTitle: string;
}

const GOOGLE_NEWS_BASE_URL = 'https://news.google.com';
const GOOGLE_NEWS_LOCALE_QUERY = 'hl=ko&gl=KR&ceid=KR:ko';
const GOOGLE_NEWS_DECODE_ENDPOINT = `${GOOGLE_NEWS_BASE_URL}/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je`;
const googleNewsResolveCache = new Map<string, string | null>();

function decodeXmlEntities(raw: string): string {
  return raw
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
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
    if (absolute.protocol === 'http:') absolute.protocol = 'https:';
    return absolute.toString();
  } catch {
    return null;
  }
}

function isGoogleNewsArticleLink(rawLink: string): boolean {
  try {
    const parsed = new URL(rawLink);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'news.google.com') return false;
    return parsed.pathname.startsWith('/rss/articles/')
      || parsed.pathname.startsWith('/articles/')
      || parsed.pathname.startsWith('/read/');
  } catch {
    return false;
  }
}

function extractGoogleNewsArticleToken(rawLink: string): string | null {
  try {
    const parsed = new URL(rawLink);
    if (parsed.hostname.toLowerCase() !== 'news.google.com') return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    if (segments[0] === 'rss' && segments[1] === 'articles' && segments[2]) {
      return decodeURIComponent(segments[2]);
    }
    if ((segments[0] === 'articles' || segments[0] === 'read') && segments[1]) {
      return decodeURIComponent(segments[1]);
    }
    return null;
  } catch {
    return null;
  }
}

async function getGoogleNewsDecodingParams(articleToken: string): Promise<{ timestamp: string; signature: string } | null> {
  const decodePages = [
    `${GOOGLE_NEWS_BASE_URL}/articles/${articleToken}?${GOOGLE_NEWS_LOCALE_QUERY}`,
    `${GOOGLE_NEWS_BASE_URL}/rss/articles/${articleToken}?${GOOGLE_NEWS_LOCALE_QUERY}`,
  ];

  for (const pageUrl of decodePages) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.7',
        },
      });
      if (!res.ok) continue;

      const html = await res.text();
      const tsFirst = html.match(/data-n-a-ts="([^"]+)"\s+data-n-a-sg="([^"]+)"/);
      if (tsFirst) {
        return { timestamp: tsFirst[1], signature: tsFirst[2] };
      }

      const sgFirst = html.match(/data-n-a-sg="([^"]+)"\s+data-n-a-ts="([^"]+)"/);
      if (sgFirst) {
        return { timestamp: sgFirst[2], signature: sgFirst[1] };
      }
    } catch {
      // 다음 fallback URL 시도
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

async function decodeGoogleNewsArticleUrl(articleToken: string, timestamp: string, signature: string): Promise<string | null> {
  if (!/^\d+$/.test(timestamp)) return null;
  if (!signature) return null;

  // Google News 내부 RPC 요청 형식
  const batchedReq = [[
    'Fbv4je',
    `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${articleToken}",${timestamp},"${signature}"]`,
    null,
    'generic',
  ]];

  const body = `f.req=${encodeURIComponent(JSON.stringify([batchedReq]))}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(GOOGLE_NEWS_DECODE_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': `${GOOGLE_NEWS_BASE_URL}/`,
      },
      body,
    });

    if (!res.ok) return null;

    const rawText = await res.text();
    const payloadBlock = rawText
      .split('\n\n')
      .find((block) => block.trim().startsWith('[["wrb.fr","Fbv4je"'));
    if (!payloadBlock) return null;

    const parsed = JSON.parse(payloadBlock);
    const row = parsed.find((entry: any) => Array.isArray(entry) && entry[0] === 'wrb.fr' && entry[1] === 'Fbv4je');
    if (!row) return null;

    const rpcPayload = typeof row[2] === 'string' ? JSON.parse(row[2]) : row[2];
    const decodedUrl = typeof rpcPayload?.[1] === 'string' ? rpcPayload[1] : null;
    if (!decodedUrl) return null;
    if (!isAllowedSourceLink(decodedUrl)) return null;
    if (isGoogleNewsArticleLink(decodedUrl)) return null;
    return decodedUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveGoogleNewsArticleUrl(rawLink: string): Promise<string | null> {
  if (!isGoogleNewsArticleLink(rawLink)) return null;

  const token = extractGoogleNewsArticleToken(rawLink);
  if (!token) return null;

  if (googleNewsResolveCache.has(token)) {
    return googleNewsResolveCache.get(token) ?? null;
  }

  const params = await getGoogleNewsDecodingParams(token);
  if (!params) {
    googleNewsResolveCache.set(token, null);
    return null;
  }

  const decoded = await decodeGoogleNewsArticleUrl(token, params.timestamp, params.signature);
  googleNewsResolveCache.set(token, decoded);
  return decoded;
}

function isLikelyLogoThumbnail(url: string | null | undefined, articleUrl?: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();

  if (
    lower.includes('favicon')
    || lower.includes('/logo')
    || lower.includes('logo_')
    || lower.includes('_logo')
    || lower.includes('logotype')
    || lower.includes('brandmark')
    || lower.includes('masthead')
    || lower.includes('icon')
    || lower.includes('/ci/')
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
    if (host === 'news.google.com') return true;
    if (host.endsWith('gstatic.com')) return true;
    if (host.endsWith('googleusercontent.com') && articleUrl && isGoogleNewsArticleLink(articleUrl)) return true;

    const width = Number(parsed.searchParams.get('w') ?? parsed.searchParams.get('width') ?? parsed.searchParams.get('sz') ?? '');
    const height = Number(parsed.searchParams.get('h') ?? parsed.searchParams.get('height') ?? '');
    if (Number.isFinite(width) && width > 0 && width <= 200) {
      if (!Number.isFinite(height) || (height > 0 && height <= 200)) return true;
    }

    const path = parsed.pathname.toLowerCase();
    if (path.includes('/favicon') || path.includes('/touch-icon') || path.includes('apple-touch-icon')) {
      return true;
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

  const candidates: Array<string | undefined> = [
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
      if (candidates.length >= 40) return candidates;
    }
  }
  return candidates;
}

async function fetchArticleHeroImage(articleUrl: string): Promise<string | null> {
  if (!isAllowedSourceLink(articleUrl)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.7',
      },
    });

    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }

    const html = (await res.text()).slice(0, 350000);
    const baseUrl = res.url || articleUrl;
    const candidates = collectHtmlImageCandidates(html);

    for (const candidate of candidates) {
      const normalized = normalizeThumbnailUrl(candidate, baseUrl);
      if (!normalized) continue;
      if (isLikelyLogoThumbnail(normalized, articleUrl)) continue;
      return normalized;
    }
  } catch {
    // 사이트별 봇 차단/타임아웃은 무시하고 기존 썸네일 유지
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

async function enrichArticleThumbnails(items: RawNewsItem[]): Promise<RawNewsItem[]> {
  if (items.length === 0) return items;

  const enriched = items.map((item) => ({ ...item }));
  const CONCURRENCY = 4;
  let resolvedCount = 0;
  let heroCount = 0;
  let heroTargetCount = 0;

  const indexed = enriched.map((item, index) => ({ item, index }));

  for (let i = 0; i < indexed.length; i += CONCURRENCY) {
    const chunk = indexed.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async ({ item, index }) => ({
        index,
        originalLink: item.link,
        resolvedLink: isGoogleNewsArticleLink(item.link)
          ? (await resolveGoogleNewsArticleUrl(item.link) || item.link)
          : item.link,
      }))
    );

    const heroResults = await Promise.all(
      results.map(async (row) => {
        let nextThumbnail = enriched[row.index].thumbnailUrl;
        if (nextThumbnail && isLikelyLogoThumbnail(nextThumbnail, row.resolvedLink)) {
          nextThumbnail = null;
        }

        if (!nextThumbnail) {
          heroTargetCount += 1;
          nextThumbnail = await fetchArticleHeroImage(row.resolvedLink);
        }

        return {
          ...row,
          thumbnail: nextThumbnail,
        };
      })
    );

    for (const result of heroResults) {
      if (result.resolvedLink !== result.originalLink) {
        enriched[result.index].link = result.resolvedLink;
        resolvedCount += 1;
      }

      if (result.thumbnail) {
        if (result.thumbnail !== enriched[result.index].thumbnailUrl) {
          heroCount += 1;
        }
        enriched[result.index].thumbnailUrl = result.thumbnail;
      } else {
        enriched[result.index].thumbnailUrl = null;
      }
    }
  }

  console.log(`[Task J] Google 원문 URL 복원: ${resolvedCount}건, 기사 대표이미지 보강: ${heroCount}/${heroTargetCount}건`);
  return enriched;
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
    const rssSourceMatch = itemXml.match(/<source(?:\s+url=["'][^"']+["'])?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/source>/i);

    if (!titleMatch || !linkMatch) continue;

    const title = titleMatch[1].trim();
    const link = linkMatch[1].trim();
    const sourceFromItem = rssSourceMatch?.[1]?.trim();
    const normalizedSourceName = sourceName === 'Google News' && sourceFromItem
      ? sourceFromItem
      : sourceName;

    const cleanLink = link;

    if (!title || !cleanLink) continue;
    if (!isAllowedSourceLink(cleanLink)) continue;

    const safeDescription = descMatch?.[1]?.trim().substring(0, 200) || undefined;

    items.push({
      title,
      link: cleanLink,
      pubDate: pubDateMatch?.[1] || new Date().toISOString(),
      source: normalizedSourceName,
      description: safeDescription,
      thumbnailUrl: extractThumbnailFromItemXml(itemXml, cleanLink),
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

interface ScoredNewsItem extends RawNewsItem {
  preTag: PreTagResult;
  freshnessScore: number;
  assetRelevanceScore: number;
  sourceTrustScore: number;
  newsQualityScore: number;
  topicKey: string;
}

interface TaggedNews {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  summary?: string;
  tags: string[];
  category: StrictNewsCategory;
  thumbnail_url?: string | null;
  is_pick: boolean;
  pick_reason?: string;
  /** 투자자 관점 영향 분석 (예: "BTC 보유자 주의. 기관 매도세로 단기 하락 가능") */
  impact_summary?: string;
  /** -2(매우부정) ~ +2(매우긍정), 0=중립 */
  impact_score?: number;
  news_quality_score?: number;
  freshness_score?: number;
  asset_relevance_score?: number;
  source_trust_score?: number;
}

function toSafeISOString(dateLike: string): string {
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSourceTrustScore(source: string): number {
  return SOURCE_TRUST_SCORE[source] ?? 75;
}

function getFreshnessScore(pubDate: string, nowMs: number): number {
  const pubTime = new Date(pubDate).getTime();
  if (Number.isNaN(pubTime)) return 50;
  const ageMs = Math.max(0, nowMs - pubTime);
  const ratio = 1 - (ageMs / NEWS_FRESHNESS_WINDOW_MS);
  return Math.round(clamp(ratio, 0, 1) * 100);
}

function getAssetRelevanceScore(
  preTag: PreTagResult,
  title: string,
  description?: string
): number {
  const text = `${title} ${description || ''}`.toLowerCase();
  const signalKeywords = [
    'etf',
    '금리',
    '연준',
    'cpi',
    '환율',
    '관세',
    '실적',
    '승인',
    '규제',
    '비트코인',
    '이더리움',
    '나스닥',
    '코스피',
  ];

  let score = 0;
  if (preTag.category === 'crypto') score += 55;
  else if (preTag.category === 'stock') score += 50;
  else if (preTag.category === 'macro') score += 42;
  else score += 20;

  score += Math.min(25, preTag.tags.length * 8);

  const keywordHits = signalKeywords.reduce((count, kw) => (text.includes(kw) ? count + 1 : count), 0);
  score += Math.min(20, keywordHits * 5);

  return Math.round(clamp(score, 0, 100));
}

function toTopicKey(item: RawNewsItem): string {
  const tokens = item.normalizedTitle
    .replace(/\d+/g, '')
    .split(/[^a-z0-9가-힣]+/i)
    .filter((token) => token.length >= 2)
    .slice(0, 3);
  return tokens.join('-') || item.normalizedTitle.slice(0, 20);
}

function scoreNewsItems(items: RawNewsItem[]): ScoredNewsItem[] {
  const now = Date.now();
  return items.map((item) => {
    const preTag = preTagNews(item.title, item.description);
    const freshnessScore = getFreshnessScore(item.pubDate, now);
    const sourceTrustScore = getSourceTrustScore(item.source);
    const assetRelevanceScore = getAssetRelevanceScore(preTag, item.title, item.description);
    const newsQualityScore = Math.round(
      (freshnessScore * 0.5) + (assetRelevanceScore * 0.3) + (sourceTrustScore * 0.2)
    );

    return {
      ...item,
      preTag,
      freshnessScore,
      sourceTrustScore,
      assetRelevanceScore,
      newsQualityScore,
      topicKey: toTopicKey(item),
    };
  });
}

function selectDiverseTopNews(items: ScoredNewsItem[], limit: number): ScoredNewsItem[] {
  const sorted = [...items].sort((a, b) => b.newsQualityScore - a.newsQualityScore);
  const topicCounter = new Map<string, number>();
  const selected: ScoredNewsItem[] = [];

  for (const item of sorted) {
    if (selected.length >= limit) break;
    const topicCount = topicCounter.get(item.topicKey) || 0;
    if (topicCount >= 2) continue;
    selected.push(item);
    topicCounter.set(item.topicKey, topicCount + 1);
  }

  return selected;
}

function resolveStrictCategory(
  rawCategory: unknown,
  fallbackCategory: PreTagResult['category'],
  title: string,
  description?: string,
  tags: string[] = []
): StrictNewsCategory | null {
  const normalizedCategory = typeof rawCategory === 'string'
    ? rawCategory.toLowerCase()
    : rawCategory;

  if (isStrictNewsCategory(normalizedCategory)) return normalizedCategory;
  if (fallbackCategory) return fallbackCategory;

  const mergedDescription = `${description || ''} ${tags.join(' ')}`.trim();
  return preTagNews(title, mergedDescription).category;
}

function fallbackTagging(scoredItems: ScoredNewsItem[]): TaggedNews[] {
  return scoredItems
    .map((item) => {
      const category = resolveStrictCategory(
        item.preTag.category,
        item.preTag.category,
        item.title,
        item.description,
        item.preTag.tags
      );
      if (!category) return null;

      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        source: item.source,
        summary: item.description,
        tags: item.preTag.tags,
        category,
        thumbnail_url: item.thumbnailUrl,
        is_pick: false,
        impact_score: 0,
        news_quality_score: item.newsQualityScore,
        freshness_score: item.freshnessScore,
        asset_relevance_score: item.assetRelevanceScore,
        source_trust_score: item.sourceTrustScore,
      } satisfies TaggedNews;
    })
    .filter((item): item is TaggedNews => item !== null);
}

function rebalancePickFlags(items: TaggedNews[]): TaggedNews[] {
  if (items.length === 0) return items;

  const ranked = [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const scoreA = (a.item.news_quality_score ?? 0) + (Math.abs(a.item.impact_score ?? 0) * 4) + (a.item.is_pick ? 5 : 0);
      const scoreB = (b.item.news_quality_score ?? 0) + (Math.abs(b.item.impact_score ?? 0) * 4) + (b.item.is_pick ? 5 : 0);
      return scoreB - scoreA;
    });

  const pickIndexes = new Set(ranked.slice(0, Math.min(3, ranked.length)).map((row) => row.index));
  return items.map((item, idx) => ({
    ...item,
    is_pick: pickIndexes.has(idx),
  }));
}

/**
 * Phase 1 최적화 — Gemini 뉴스 배치 태깅
 *
 * [최적화 전] 배치 10개, 긴 프롬프트(~1200토큰), Google Search 사용
 * [최적화 후] 배치 20개, 짧은 프롬프트(~400토큰), Google Search 제거, 선태깅 포함
 *
 * 비유: 이전엔 "이 편지들 전부 읽고 분류해줘" → 이제는 "봉투에 적힌 부서명은 이미 읽었어, 중요도만 판단해줘"
 */
async function tagNewsWithGemini(items: ScoredNewsItem[]): Promise<TaggedNews[]> {
  if (items.length === 0) return [];

  const BATCH_SIZE = 20; // ← 10에서 20으로 (API 호출 50% 절감)
  const results: TaggedNews[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // ── Step 1: 기계적 선태깅 (AI 호출 없이 자동 분류) ──
    const preTags = batch.map(item => item.preTag);

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
- category: "crypto"|"stock"|"macro" 중 1개
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

        // 태그: AI 결과와 선태깅 결과 병합 (중복 제거)
        const aiTags = Array.isArray(tag.tags) ? tag.tags : [];
        const mergedTags = [...new Set([...aiTags, ...pt.tags])].slice(0, 5);
        const category = resolveStrictCategory(tag.category, pt.category, item.title, item.description, mergedTags);
        if (!category) continue;

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
          thumbnail_url: item.thumbnailUrl,
          is_pick: !!tag.is_pick,
          pick_reason: tag.pick_reason || undefined,
          impact_summary: tag.impact_summary || undefined,
          impact_score: impactScore,
          news_quality_score: item.newsQualityScore,
          freshness_score: item.freshnessScore,
          asset_relevance_score: item.assetRelevanceScore,
          source_trust_score: item.sourceTrustScore,
        });
      }

      console.log(`[Task J] Gemini 태깅 완료: ${parsed.length}/${batch.length}건 (배치 ${Math.floor(i / BATCH_SIZE) + 1})`);
    } catch (err) {
      console.warn(`[Task J] Gemini 실패 (배치 ${Math.floor(i / BATCH_SIZE) + 1}), 선태깅 결과로 저장:`, err);

      // ★ AI 실패 시에도 선태깅 결과로 저장 (단, 허용 카테고리 기사만 유지)
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const pt = preTags[j];
        if (!pt.category) continue;
        results.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: item.source,
          summary: item.description,
          tags: pt.tags,
          category: pt.category,
          thumbnail_url: item.thumbnailUrl,
          is_pick: false,
          impact_score: 0,
          news_quality_score: item.newsQualityScore,
          freshness_score: item.freshnessScore,
          asset_relevance_score: item.assetRelevanceScore,
          source_trust_score: item.sourceTrustScore,
        });
      }
    }
  }

  return results;
}

// ============================================================================
// DB UPSERT + 정리
// ============================================================================

let recentUpsertErrors: string[] = [];

async function writeBatchWithRecovery(rows: Record<string, any>[]): Promise<number> {
  let successCount = 0;

  for (const row of rows) {
    // 1) source_url 기준 업데이트 (이미 존재하는 기사면 갱신)
    const updateBySource = await supabase
      .from('market_news')
      .update(row)
      .eq('source_url', row.source_url)
      .select('id');

    if (!updateBySource.error && (updateBySource.data?.length || 0) > 0) {
      successCount += 1;
      continue;
    }

    // 2) 신규 insert 시도
    const insertResult = await supabase
      .from('market_news')
      .insert(row)
      .select('id');

    if (!insertResult.error) {
      successCount += 1;
      continue;
    }

    // 3) title unique 충돌 환경 대비: title 기준 update
    if (/duplicate key value violates unique constraint/i.test(insertResult.error.message || '')) {
      const updateByTitle = await supabase
        .from('market_news')
        .update(row)
        .eq('title', row.title)
        .select('id');
      if (!updateByTitle.error && (updateByTitle.data?.length || 0) > 0) {
        successCount += 1;
      }
    }
  }

  return successCount;
}

/**
 * market_news 테이블에 UPSERT (source_url 기준 중복 방지)
 */
async function upsertNews(taggedItems: TaggedNews[]): Promise<number> {
  if (taggedItems.length === 0) return 0;

  recentUpsertErrors = [];
  let upsertedCount = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < taggedItems.length; i += BATCH_SIZE) {
    const batch = taggedItems.slice(i, i + BATCH_SIZE);

    const fullRows = batch.map(item => ({
      title: item.title.substring(0, 500),
      source: item.source, // legacy 호환 컬럼
      content: item.summary?.substring(0, 300) || item.title.substring(0, 300), // legacy 호환 컬럼
      summary: item.summary?.substring(0, 300) || null,
      source_name: item.source,
      source_url: item.link,
      thumbnail_url: item.thumbnail_url || null,
      published_at: toSafeISOString(item.pubDate),
      tags: item.tags,
      category: item.category,
      is_pick: item.is_pick,
      pick_reason: item.pick_reason || null,
      impact_summary: item.impact_summary?.substring(0, 200) || null,
      impact_score: item.impact_score ?? 0,
      news_quality_score: item.news_quality_score ?? null,
      freshness_score: item.freshness_score ?? null,
      asset_relevance_score: item.asset_relevance_score ?? null,
      source_trust_score: item.source_trust_score ?? null,
    }));

    let rowsForRecovery: Record<string, any>[] = fullRows;
    let { error } = await supabase
      .from('market_news')
      .upsert(fullRows, { onConflict: 'source_url' });

    // 1차 호환: 품질 컬럼 없는 환경
    if (error && /column .* (news_quality_score|freshness_score|asset_relevance_score|source_trust_score)/i.test(error.message)) {
      const compatibilityRows = batch.map(item => ({
        title: item.title.substring(0, 500),
        source: item.source,
        content: item.summary?.substring(0, 300) || item.title.substring(0, 300),
        summary: item.summary?.substring(0, 300) || null,
        source_name: item.source,
        source_url: item.link,
        thumbnail_url: item.thumbnail_url || null,
        published_at: toSafeISOString(item.pubDate),
        tags: item.tags,
        category: item.category,
        is_pick: item.is_pick,
        pick_reason: item.pick_reason || null,
        impact_summary: item.impact_summary?.substring(0, 200) || null,
        impact_score: item.impact_score ?? 0,
      }));

      rowsForRecovery = compatibilityRows;
      const retry = await supabase
        .from('market_news')
        .upsert(compatibilityRows, { onConflict: 'source_url' });
      error = retry.error;
    }

    // 2차 호환: source/content/impact 컬럼 자체가 없는 아주 구버전 스키마
    if (error && /column .* (source|content|impact_summary|impact_score)/i.test(error.message)) {
      const minimalRows = batch.map((item) => ({
        title: item.title.substring(0, 500),
        summary: item.summary?.substring(0, 300) || null,
        source_name: item.source,
        source_url: item.link,
        thumbnail_url: item.thumbnail_url || null,
        published_at: toSafeISOString(item.pubDate),
        tags: item.tags,
        category: item.category,
        is_pick: item.is_pick,
        pick_reason: item.pick_reason || null,
      }));

      rowsForRecovery = minimalRows;
      const fallbackRetry = await supabase
        .from('market_news')
        .upsert(minimalRows, { onConflict: 'source_url' });
      error = fallbackRetry.error;
    }

    if (error) {
      console.warn(`[Task J] UPSERT 실패 (배치 ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
      if (recentUpsertErrors.length < 5) {
        recentUpsertErrors.push(error.message);
      }
      const recovered = await writeBatchWithRecovery(rowsForRecovery);
      if (recovered > 0) {
        console.log(`[Task J] 배치 ${Math.floor(i / BATCH_SIZE) + 1} 복구 저장 성공: ${recovered}/${rowsForRecovery.length}`);
        upsertedCount += recovered;
      }
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

/**
 * 금지 소스(브랜드/법적 리스크 가능성) 잔존 데이터 정리
 */
async function purgeDisallowedSources(): Promise<number> {
  let { data, error } = await supabase
    .from('market_news')
    .delete()
    .or('source_url.ilike.%bloomingbit%,source_name.ilike.%코인속보%,source.ilike.%블루밍비트%')
    .select('id');

  if (error && /column .*source/i.test(error.message)) {
    const retry = await supabase
      .from('market_news')
      .delete()
      .or('source_url.ilike.%bloomingbit%,source_name.ilike.%코인속보%')
      .select('id');
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.warn('[Task J] 금지 소스 정리 실패:', error.message);
    return 0;
  }

  const purged = data?.length || 0;
  if (purged > 0) {
    console.log(`[Task J] 금지 소스 데이터 ${purged}건 정리 완료`);
  }
  return purged;
}

// ============================================================================
// Task J 통합 실행
// ============================================================================

export interface NewsCollectionResult {
  totalFetched: number;
  totalUpserted: number;
  totalDeleted: number;
  totalPurged: number;
  aiTagged: number;
  fallbackTagged: number;
  avgQualityScore: number;
  upsertErrorSample?: string[];
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

    // ── 최근 6시간 이내 뉴스 우선 (신선도 중심) ──
    const now = Date.now();
    const freshItems = allItems.filter((item) => {
      const pubTime = new Date(item.pubDate).getTime();
      const age = now - pubTime;
      if (isNaN(pubTime)) return true;
      return age <= NEWS_FRESHNESS_WINDOW_MS;
    });
    const freshnessHours = NEWS_FRESHNESS_WINDOW_MS / (60 * 60 * 1000);
    console.log(`[Task J] ${freshnessHours}시간 이내 뉴스: ${freshItems.length}/${allItems.length}건`);

    const baseItems = freshItems.length > 0
      ? freshItems
      : [...allItems]
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
        .slice(0, 12);
    if (freshItems.length === 0) {
      console.warn('[Task J] 최신 뉴스 부족으로 최근 기사 일부를 임시 사용합니다');
    }

    // ── 제목 기반 중복 제거 (RSS 소스 간 동일 기사 필터링) ──
    const seenTitles = new Set<string>();
    const dedupedItems: RawNewsItem[] = [];
    for (const item of baseItems) {
      if (!seenTitles.has(item.normalizedTitle)) {
        seenTitles.add(item.normalizedTitle);
        dedupedItems.push(item);
      }
    }
    console.log(`[Task J] 제목 중복 제거: ${baseItems.length} → ${dedupedItems.length}건`);

    const scoredItems = scoreNewsItems(dedupedItems);
    const financeItems = scoredItems.filter((item) => item.preTag.category !== null);
    const selectedItems = selectDiverseTopNews(financeItems, MAX_NEWS_CANDIDATES);
    const candidateItems = await enrichArticleThumbnails(selectedItems);

    console.log(
      `[Task J] 품질 선별 완료: scored=${scoredItems.length}, classified=${financeItems.length}, selected=${candidateItems.length}`
    );

    // ── DB 기존 제목 체크 (최근 3일 뉴스의 제목과 비교) ──
    const existingByTitle = new Map<string, { hasUsableThumbnail: boolean; hasGoogleSourceUrl: boolean }>();
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { data: existing } = await supabase
        .from('market_news')
        .select('title,thumbnail_url,source_url')
        .gte('published_at', threeDaysAgo.toISOString());
      if (existing) {
        for (const row of existing as Array<{ title: string; thumbnail_url?: string | null; source_url?: string | null }>) {
          const key = normalizeTitle(row.title);
          const hasUsableThumbnail = !!row.thumbnail_url && !isLikelyLogoThumbnail(row.thumbnail_url);
          const hasGoogleSourceUrl = typeof row.source_url === 'string' && isGoogleNewsArticleLink(row.source_url);
          const prev = existingByTitle.get(key);
          if (!prev) {
            existingByTitle.set(key, { hasUsableThumbnail, hasGoogleSourceUrl });
            continue;
          }

          existingByTitle.set(key, {
            hasUsableThumbnail: prev.hasUsableThumbnail || hasUsableThumbnail,
            hasGoogleSourceUrl: prev.hasGoogleSourceUrl || hasGoogleSourceUrl,
          });
        }
      }
    } catch (err) {
      console.warn('[Task J] 기존 뉴스 조회 실패, 전체 upsert 진행:', err);
    }

    let thumbnailBackfillCount = 0;
    let googleCanonicalUpgradeCount = 0;
    const newItems = candidateItems.filter((item) => {
      const existing = existingByTitle.get(item.normalizedTitle);
      if (!existing) return true;
      if (existing.hasGoogleSourceUrl) {
        googleCanonicalUpgradeCount += 1;
        return true;
      }
      if (!existing.hasUsableThumbnail && item.thumbnailUrl) {
        thumbnailBackfillCount += 1;
        return true;
      }
      return false;
    });
    const cappedNewItems = newItems.slice(0, MAX_NEWS_CANDIDATES);
    console.log(
      `[Task J] DB 중복 제거 후: ${newItems.length}건 (기존 ${existingByTitle.size}건 비교, 썸네일 보강 ${thumbnailBackfillCount}건, Google 원문치환 ${googleCanonicalUpgradeCount}건), 처리 대상 ${cappedNewItems.length}건`
    );

    if (cappedNewItems.length === 0) {
      const elapsed = Date.now() - startTime;
      await logTaskResult('news_collection', 'SUCCESS', elapsed, {
        totalFetched: 0,
        totalUpserted: 0,
        message: '허용 카테고리(주식/암호화폐/거시경제) 조건을 만족하는 신규 뉴스가 없습니다',
      });
      return {
        totalFetched: 0,
        totalUpserted: 0,
        totalDeleted: 0,
        totalPurged: 0,
        aiTagged: 0,
        fallbackTagged: 0,
        avgQualityScore: 0,
        upsertErrorSample: recentUpsertErrors.slice(0, 3),
        sources: sourceCount,
      };
    }

    const aiTargets = cappedNewItems.slice(0, MAX_AI_ANALYSIS_ITEMS);
    const fallbackTargets = cappedNewItems.slice(MAX_AI_ANALYSIS_ITEMS);

    // 2. Gemini AI 태깅 (상위 품질 뉴스만) + 나머지는 저비용 폴백
    const aiTagged = await tagNewsWithGemini(aiTargets);
    const lowCostTagged = fallbackTagging(fallbackTargets);
    const taggedItems = rebalancePickFlags([...aiTagged, ...lowCostTagged]);
    const avgQualityScore = taggedItems.length > 0
      ? Math.round(
        taggedItems.reduce((sum, item) => sum + (item.news_quality_score ?? 0), 0) / taggedItems.length
      )
      : 0;
    console.log(
      `[Task J] AI 태깅 완료: ai=${aiTagged.length}건, low_cost=${lowCostTagged.length}건, total=${taggedItems.length}건`
    );

    // 3. DB UPSERT
    const upsertedCount = await upsertNews(taggedItems);
    console.log(`[Task J] DB 저장 완료: ${upsertedCount}건`);

    // 4. 오래된 뉴스 정리
    const deletedCount = await cleanupOldNews();
    const purgedCount = await purgeDisallowedSources();

    const elapsed = Date.now() - startTime;
    await logTaskResult('news_collection', 'SUCCESS', elapsed, {
      totalFetched: allItems.length,
      totalUpserted: upsertedCount,
      totalDeleted: deletedCount,
      totalPurged: purgedCount,
      aiTagged: aiTagged.length,
      fallbackTagged: lowCostTagged.length,
      avgQualityScore,
      upsertErrorSample: recentUpsertErrors.slice(0, 3),
      sources: sourceCount,
    });

    return {
      totalFetched: allItems.length,
      totalUpserted: upsertedCount,
      totalDeleted: deletedCount,
      totalPurged: purgedCount,
      aiTagged: aiTagged.length,
      fallbackTagged: lowCostTagged.length,
      avgQualityScore,
      upsertErrorSample: recentUpsertErrors.slice(0, 3),
      sources: sourceCount,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('news_collection', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
