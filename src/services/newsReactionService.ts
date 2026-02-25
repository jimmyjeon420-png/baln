/**
 * 구루 뉴스 리액션 서비스 (Guru News Reaction Service)
 *
 * 역할: "마을 신문사" — 뉴스에 대한 구루들의 반응을 생성
 * - "같은 뉴스를 10명이 다르게 해석한다" — 투자의 핵심을 체험
 * - Gemini API(gemini-proxy Edge Function)로 구루별 반응 생성
 * - 3시간 캐시 (맥락 카드와 동일 주기)
 * - 카테고리별 가장 관련 있는 3~5명 구루를 자동 선택
 *
 * 비유: "마을 편집국" — 뉴스가 들어오면 각 구루의 코멘트를 받아 기사 완성
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';
import { getPromptLanguageInstruction, getLangParam } from '../utils/promptLanguage';
import type { GuruNewsReaction, NewspaperArticle, NewspaperCategory, ReactionSentiment } from '../types/village';

// ============================================================================
// 상수
// ============================================================================

const CACHE_KEY = '@baln:village_news_reactions';
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3시간

// ============================================================================
// 구루 전문 분야 (뉴스 카테고리별 반응 구루 선택에 사용)
// ============================================================================

/**
 * 카테고리별 반응할 구루 목록 (앞쪽일수록 더 적극적으로 반응)
 *
 * 각 구루가 강한 의견을 가진 분야에 매핑:
 * - 시장/경제 → 버핏, 달리오, 드러킨밀러, 막스, 다이먼
 * - 암호화폐 → 세일러, 머스크, 캐시우드, 다이먼(회의적), 로저스
 * - 기술/혁신 → 머스크, 캐시우드, 세일러, 린치
 * - 정치/지정학 → 로저스, 달리오, 다이먼, 드러킨밀러
 * - 글로벌 → 로저스, 달리오, 드러킨밀러, 막스
 * - 소비재 → 린치, 버핏, 막스
 */
const CATEGORY_GURU_MAP: Record<string, string[]> = {
  market: ['buffett', 'dalio', 'druckenmiller', 'marks', 'dimon', 'lynch'],
  economy: ['dalio', 'druckenmiller', 'dimon', 'marks', 'buffett', 'rogers'],
  crypto: ['saylor', 'musk', 'cathie_wood', 'dimon', 'rogers', 'druckenmiller'],
  tech: ['musk', 'cathie_wood', 'saylor', 'lynch', 'druckenmiller'],
  politics: ['rogers', 'dalio', 'dimon', 'druckenmiller', 'marks'],
  global: ['rogers', 'dalio', 'druckenmiller', 'marks', 'buffett'],
  consumer: ['lynch', 'buffett', 'marks', 'rogers'],
};

/**
 * 뉴스 카테고리에 맞는 반응 구루 3~5명 선택
 */
export function selectReactingGurus(category: string): string[] {
  const gurus = CATEGORY_GURU_MAP[category] || CATEGORY_GURU_MAP['market'] || [];
  // 3~5명 반환 (카테고리에 따라 다르지만 최소 3명)
  const count = Math.min(5, Math.max(3, gurus.length));
  return gurus.slice(0, count);
}

// ============================================================================
// 구루 페르소나 (프롬프트용)
// ============================================================================

const GURU_REACTION_PERSONAS: Record<string, string> = {
  buffett: '워렌 버핏(🦉 올빼미): 가치 투자, 장기적 관점, 침착한 할아버지 톤. "해자가 있는 기업을" 류의 관점.',
  dalio: '레이 달리오(🦌 사슴): 거시경제 기계론, 원칙 기반, 차분한 교수 톤. "경제 사이클 관점에서..."',
  cathie_wood: '캐시 우드(🦊 여우): 혁신 투자, 5년 미래 지향, 열정적. "장기적으로 보면 이건 오히려..."',
  druckenmiller: '드러킨밀러(🐆 치타): 매크로 트레이더, 날카로운 분석, 직설적. "추세의 변곡점을 봐야 해."',
  saylor: '마이클 세일러(🐺 늑대): 비트코인 맥시멀리스트, 모든 걸 BTC로 연결, 열광적. "이게 바로 비트코인이 필요한 이유야!"',
  dimon: '제이미 다이먼(🦁 사자): 은행장, 보수적 리스크 관리, 위엄 있는 톤. "기본에 충실해야 합니다."',
  musk: '일론 머스크(🦎 카멜레온): 장난기, 파괴적 사고, 트위터식 한 줄. "ㅋㅋ 제가 그냥 하면 되는데?"',
  lynch: '피터 린치(🐻 곰): 일상 투자, 슈퍼마켓 관점, 친근한 이웃 톤. "마트에서 보면 알 수 있어."',
  marks: '하워드 막스(🐢 거북이): 사이클 분석, 2차 사고, 신중한 작가 톤. "모두가 낙관할 때가 가장 위험합니다."',
  rogers: '짐 로저스(🐯 호랑이): 글로벌 탐험가, 이머징 마켓, 원자재 관점. "아시아와 원자재를 봐야 합니다."',
};

// ============================================================================
// 뉴스 리액션 생성 (Gemini API)
// ============================================================================

/**
 * 뉴스 헤드라인에 대한 구루 반응 생성
 *
 * Gemini 1회 호출로 3~5개 뉴스 × 3~5명 구루 반응을 한꺼번에 생성
 * 비용: ~₩5/호출
 *
 * @param headlines 오늘의 뉴스 헤드라인 목록
 * @param marketContext 추가 시장 맥락 (선택적)
 */
export async function generateNewsReactions(
  headlines: { headline: string; headlineEn: string; category: string }[],
  marketContext?: string,
): Promise<NewspaperArticle[]> {
  if (headlines.length === 0) {
    if (__DEV__) console.log('[NewsReaction] 뉴스 없음 → 폴백 반환');
    return getFallbackReactions();
  }

  // 각 뉴스에 반응할 구루 선정
  const newsWithGurus = headlines.map(h => ({
    ...h,
    reactingGurus: selectReactingGurus(h.category),
  }));

  // 구루 페르소나 목록 (중복 제거 후)
  const allGuruIds = [...new Set(newsWithGurus.flatMap(n => n.reactingGurus))];
  const personaText = allGuruIds
    .map(id => GURU_REACTION_PERSONAS[id])
    .filter(Boolean)
    .join('\n');

  const headlinesText = newsWithGurus.map((n, i) =>
    `${i + 1}. [${n.category}] ${n.headline} (EN: ${n.headlineEn})\n   반응 구루: ${n.reactingGurus.join(', ')}`,
  ).join('\n');

  const systemPrompt = `당신은 투자 거장들이 모여 사는 마을의 뉴스 편집자입니다.
오늘의 뉴스에 대해 각 거장의 관점으로 1~2문장 반응을 생성하세요.

[등장인물]
${personaText}

[규칙]
1. 각 거장의 성격과 투자 철학에 맞는 반응
2. 같은 뉴스에 대해 서로 다른 관점 (이것이 핵심!)
3. 반응은 1~2문장, 자연스러운 구어체. ${getPromptLanguageInstruction()}
4. sentiment는 해당 거장의 관점에서의 감정: JOY, EXCITED, CALM, THINKING, WORRIED, SAD, ANGRY 중 하나
5. speaker는 반드시 guruId 사용: ${allGuruIds.join(', ')}

${marketContext ? `[오늘 시장 맥락]\n${marketContext}\n` : ''}

[JSON 형식으로만 응답]
{
  "articles": [
    {
      "headline": "뉴스 제목",
      "headlineEn": "News headline in English",
      "category": "카테고리",
      "reactions": [
        { "guruId": "buffett", "sentiment": "CALM", "reaction": "반응 대사", "reactionEn": "English reaction" }
      ]
    }
  ]
}`;

  const userPrompt = `오늘의 뉴스:\n${headlinesText}\n\n각 뉴스에 대해 지정된 구루들의 반응을 생성해주세요.`;

  try {
    const { default: supabase } = await import('./supabase');

    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: {
        prompt: userPrompt,
        systemPrompt,
        type: 'news_reaction',
        lang: getLangParam(),
      },
    });

    if (error) throw new Error(`Gemini 호출 실패: ${error.message}`);

    const resultText = typeof data?.result === 'string'
      ? data.result
      : JSON.stringify(data?.result || '');

    const cleaned = resultText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const now = new Date().toISOString();
    const articles: NewspaperArticle[] = (parsed.articles || []).map((article: any, idx: number) => {
      const reactions: GuruNewsReaction[] = (article.reactions || []).map((r: any) => ({
        guruId: r.guruId || r.speaker || '',
        sentiment: mapSentimentToMood(r.sentiment),
        reaction: r.reaction || '',
        reactionEn: r.reactionEn || '',
        emoji: GURU_CHARACTER_CONFIGS[r.guruId || r.speaker]?.emoji || '🐾',
      }));

      return {
        id: `news_${Date.now()}_${idx}`,
        headline: article.headline || '',
        headlineEn: article.headlineEn || '',
        category: (article.category || 'market') as NewspaperCategory,
        reactions,
        guruReactions: reactions, // 두 필드 모두 설정 (호환성)
        createdAt: now,
        publishedAt: now,
      };
    });

    // 캐시 저장
    await cacheReactions(articles);

    return articles;
  } catch (err) {
    if (__DEV__) console.error('[NewsReaction] 생성 실패:', err);
    Sentry.captureException(err, { tags: { service: 'news_reaction', action: 'generate' } });
    return getFallbackReactions();
  }
}

/**
 * API 반환 센티먼트 문자열 → ReactionSentiment로 정규화
 */
function mapSentimentToMood(sentiment: string): ReactionSentiment {
  const upper = (sentiment || '').toUpperCase();
  switch (upper) {
    case 'JOY': return 'joy';
    case 'EXCITED': return 'excited';
    case 'CALM': return 'calm';
    case 'THINKING': return 'thinking';
    case 'WORRIED': return 'worried';
    case 'SAD': return 'sad';
    case 'ANGRY': return 'angry';
    // 기존 4-감정 호환
    case 'BULLISH': return 'excited';
    case 'BEARISH': return 'worried';
    case 'CAUTIOUS': return 'thinking';
    case 'NEUTRAL': return 'calm';
    default: return 'calm';
  }
}

// ============================================================================
// 캐시 관리
// ============================================================================

/**
 * 캐시된 뉴스 리액션 가져오기 (3시간 유효)
 */
export async function getCachedReactions(): Promise<NewspaperArticle[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as { articles: NewspaperArticle[]; cachedAt: string };
    const age = Date.now() - new Date(cached.cachedAt).getTime();

    if (age > CACHE_DURATION) {
      if (__DEV__) console.log('[NewsReaction] 캐시 만료 (3시간 초과)');
      return null;
    }

    return cached.articles;
  } catch {
    return null;
  }
}

/**
 * 뉴스 리액션을 캐시에 저장
 */
async function cacheReactions(articles: NewspaperArticle[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      articles,
      cachedAt: new Date().toISOString(),
    }));
  } catch {
    // 저장 실패 무시
  }
}

// ============================================================================
// 폴백 리액션 (API 실패 시)
// ============================================================================

/**
 * 폴백 뉴스 리액션 — API 실패 시 미리 작성된 반응 제공
 * 실시간 뉴스가 아닌 일반적인 시장 주제에 대한 반응
 */
export function getFallbackReactions(): NewspaperArticle[] {
  const now = new Date().toISOString();

  return [
    {
      id: `fb_news_1_${Date.now()}`,
      headline: '글로벌 시장, 혼조세로 마감',
      headlineEn: 'Global markets close mixed',
      category: 'market',
      reactions: [
        {
          guruId: 'buffett',
          sentiment: 'calm',
          reaction: '시장은 매일 오르내리지. 중요한 건 기업의 가치야. 오늘 코카콜라 주가는 괜찮나?',
          reactionEn: 'Markets go up and down daily. What matters is the value of the business.',
          emoji: '🦉',
        },
        {
          guruId: 'dalio',
          sentiment: 'thinking',
          reaction: '혼조세는 경제 기계의 기어가 바뀌는 신호일 수 있습니다. 채권과 주식의 상관관계를 주시하세요.',
          reactionEn: 'Mixed signals may indicate the economic machine is shifting gears.',
          emoji: '🦌',
        },
        {
          guruId: 'druckenmiller',
          sentiment: 'thinking',
          reaction: '혼조세에서 추세를 읽는 게 진짜 실력이야. 어디에 돈이 몰리는지 봐.',
          reactionEn: 'Reading trends in mixed markets is where real skill shows.',
          emoji: '🐆',
        },
        {
          guruId: 'marks',
          sentiment: 'calm',
          reaction: '시장이 확신을 잃은 순간이 기회입니다. 2차 사고를 하세요.',
          reactionEn: 'When the market loses conviction, opportunity arises. Think at the second level.',
          emoji: '🐢',
        },
      ],
      createdAt: now,
    },
    {
      id: `fb_news_2_${Date.now()}`,
      headline: '비트코인, 변동성 확대 속 거래량 증가',
      headlineEn: 'Bitcoin sees increased volume amid rising volatility',
      category: 'crypto',
      reactions: [
        {
          guruId: 'saylor',
          sentiment: 'excited',
          reaction: '변동성이 크다고? 그건 비트코인이 살아있다는 증거야! 더 사!',
          reactionEn: 'Volatility? That just proves Bitcoin is alive! Buy more!',
          emoji: '🐺',
        },
        {
          guruId: 'dimon',
          sentiment: 'worried',
          reaction: '또 변동성이요? 이래서 규제가 필요하다는 겁니다. 기본에 충실하세요.',
          reactionEn: 'More volatility? This is exactly why regulation is needed.',
          emoji: '🦁',
        },
        {
          guruId: 'musk',
          sentiment: 'joy',
          reaction: 'ㅋㅋ 비트코인 롤러코스터 재밌다. 도지코인은요?',
          reactionEn: 'Lol Bitcoin rollercoaster is fun. What about Doge?',
          emoji: '🦎',
        },
        {
          guruId: 'cathie_wood',
          sentiment: 'excited',
          reaction: '거래량 증가는 기관 채택이 가속되고 있다는 신호예요! 장기적으로 봐야 합니다.',
          reactionEn: 'Increased volume signals accelerating institutional adoption!',
          emoji: '🦊',
        },
      ],
      createdAt: now,
    },
    {
      id: `fb_news_3_${Date.now()}`,
      headline: '아시아 신흥국 경제 성장 전망 상향',
      headlineEn: 'Asian emerging market growth outlook upgraded',
      category: 'global',
      reactions: [
        {
          guruId: 'rogers',
          sentiment: 'excited',
          reaction: '내가 뭐랬어! 아시아가 미래야! 오토바이 타고 직접 봤다고. 베트남, 인도 주목!',
          reactionEn: "What did I tell you! Asia is the future! I saw it riding my motorcycle.",
          emoji: '🐯',
        },
        {
          guruId: 'dalio',
          sentiment: 'calm',
          reaction: '경제 기계의 장기 트렌드가 동쪽으로 이동하고 있습니다. 분산 투자의 원칙에 부합하죠.',
          reactionEn: 'The long-term trend of the economic machine is shifting east.',
          emoji: '🦌',
        },
        {
          guruId: 'marks',
          sentiment: 'thinking',
          reaction: '모두가 신흥국을 이야기하기 시작하면... 이미 가격에 반영된 건 아닌지 생각해볼 필요가 있어요.',
          reactionEn: "When everyone starts talking about emerging markets... has it already been priced in?",
          emoji: '🐢',
        },
      ],
      createdAt: now,
    },
  ];
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 카테고리 → 이모지 매핑
 */
export function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    market: '📈',
    economy: '🏦',
    crypto: '₿',
    tech: '💻',
    politics: '🏛️',
    global: '🌍',
    consumer: '🛒',
  };
  return emojiMap[category] || '📰';
}

/**
 * 카테고리 → 한국어/영어 이름
 */
export function getCategoryLabel(category: string): { ko: string; en: string } {
  const labels: Record<string, { ko: string; en: string }> = {
    market: { ko: '주식', en: 'Stocks' },
    economy: { ko: '경제', en: 'Economy' },
    crypto: { ko: '암호화폐', en: 'Crypto' },
    tech: { ko: '기술', en: 'Tech' },
    politics: { ko: '정치', en: 'Politics' },
    global: { ko: '글로벌', en: 'Global' },
    consumer: { ko: '소비재', en: 'Consumer' },
  };
  return labels[category] || { ko: '뉴스', en: 'News' };
}
