/**
 * 구루 마을 대화 생성 서비스
 *
 * 역할: "마을 방송국" — 구루들의 자동 대화를 생성하고 관리
 * - 실시간 뉴스/시장 상황을 구루 캐릭터가 자기 철학에 맞게 해석
 * - 구루들끼리 서로 반응하는 대화 체인
 * - 3시간마다 새 대화 배치 생성 (맥락카드와 동기화)
 * - 사용자 질문에 개별 구루가 답변
 *
 * 비용: gemini-proxy Edge Function 경유, 배치당 1회 호출 (~₩5)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';
import { getPromptLanguageInstruction, getLangParam } from '../utils/promptLanguage';
import {
  getFreshnessPromptSuffix,
  markSeen,
  hashContent,
} from './contentFreshnessService';
import { getRandomQuote } from '../data/guruQuoteBank';

// guruDebateTopics는 다른 에이전트가 병렬 생성 중 — 없으면 graceful fallback
let getRandomDebate: (() => any) | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const debateModule = require('../data/guruDebateTopics');
  getRandomDebate = debateModule.getRandomDebate;
} catch {
  // 파일 미존재 시 무시 — 폴백으로 동작
}

const STORAGE_KEY = '@baln:village_conversations';
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3시간

// ============================================================================
// 타입
// ============================================================================

export interface VillageMessage {
  id: string;
  speaker: string;        // guruId
  message: string;         // 대사 (1-2문장)
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS';
  /** 누구에게 말하는 건지 (null이면 독백) */
  replyTo?: string;        // guruId
  /** 뉴스 트리거 (어떤 뉴스에 반응하는 대화인지) */
  newsTrigger?: string;
}

export interface VillageConversation {
  /** 대화 주제/트리거 */
  trigger: string;
  /** 대화 메시지들 (시간순) */
  messages: VillageMessage[];
}

export interface VillageBatch {
  conversations: VillageConversation[];
  generatedAt: string;
}

// ============================================================================
// 구루 철학 (프롬프트용)
// ============================================================================

const GURU_PERSONAS: Record<string, string> = {
  buffett: '워렌 버핏: 할아버지 같은 말투, 가치 투자, "남들이 두려울 때 탐욕" 자주 인용, 코카콜라 비유 좋아함',
  dalio: '레이 달리오: 차분하고 원칙적, "경제 기계" 비유, All Weather 전략, 명상가 느낌',
  cathie_wood: '캐시 우드: 열정적이고 미래 지향적, "5년 후를 봐야 해요!", AI/로봇/유전체에 흥분',
  druckenmiller: '드러킨밀러: 날카롭고 직설적, 매크로 관점, "돈 냄새를 맡는" 트레이더',
  saylor: '마이클 세일러: 비트코인 광신도, 모든 걸 BTC로 연결, "비트코인은 디지털 에너지"',
  dimon: '제이미 다이먼: 보수적 은행가, 전통 금융 수호, 리스크 관리 중시',
  musk: '일론 머스크: 장난기 많고 파괴적, "제가 그냥 하면 되는데?", 트위터/X 식 한 줄',
  lynch: '피터 린치: 일상적이고 교수님 느낌, "슈퍼마켓에서 투자 아이디어를", 쉬운 설명',
  marks: '하워드 막스: 사려깊은 작가, "2차적 사고가 필요합니다", 리스크 강조',
  rogers: '짐 로저스: 탐험가 느낌, 글로벌 시각, "중국과 아시아를 봐야 합니다"',
};

const ALLOWED_SENTIMENTS: VillageMessage['sentiment'][] = ['BULLISH', 'BEARISH', 'NEUTRAL', 'CAUTIOUS'];

function normalizeSentiment(value: unknown): VillageMessage['sentiment'] {
  if (typeof value === 'string' && ALLOWED_SENTIMENTS.includes(value as VillageMessage['sentiment'])) {
    return value as VillageMessage['sentiment'];
  }
  return 'NEUTRAL';
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json|javascript)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/```json\s*/gi, '')
    .replace(/```javascript\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

function balanceJsonDelimiters(input: string): string {
  let output = input;
  const stack: Array<'{' | '['> = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{' || char === '[') {
      stack.push(char);
      continue;
    }
    if (char === '}' || char === ']') {
      const last = stack[stack.length - 1];
      if ((char === '}' && last === '{') || (char === ']' && last === '[')) {
        stack.pop();
      }
    }
  }

  if (inString) {
    output += '"';
  }
  while (stack.length > 0) {
    const open = stack.pop();
    output += open === '{' ? '}' : ']';
  }
  return output;
}

function parseModelJsonResponse<T = any>(rawText: string): T {
  const base = stripCodeFences(rawText);
  if (!base) throw new Error('빈 JSON 응답');

  const candidates: string[] = [];
  const addCandidate = (candidate: string) => {
    const text = candidate.trim();
    if (text && !candidates.includes(text)) candidates.push(text);
  };

  addCandidate(base);

  const normalized = base
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/^#+\s*/gm, '')
    .trim();
  addCandidate(normalized);

  const objStart = normalized.indexOf('{');
  const objEnd = normalized.lastIndexOf('}');
  if (objStart !== -1) {
    addCandidate(objEnd > objStart ? normalized.slice(objStart, objEnd + 1) : normalized.slice(objStart));
  }

  const arrStart = normalized.indexOf('[');
  const arrEnd = normalized.lastIndexOf(']');
  if (arrStart !== -1) {
    addCandidate(arrEnd > arrStart ? normalized.slice(arrStart, arrEnd + 1) : normalized.slice(arrStart));
  }

  const attempts: string[] = [];
  for (const candidate of candidates) {
    attempts.push(candidate);
    attempts.push(candidate.replace(/,\s*([\]}])/g, '$1'));
    attempts.push(balanceJsonDelimiters(candidate));
    attempts.push(balanceJsonDelimiters(candidate.replace(/,\s*([\]}])/g, '$1')));
  }

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('JSON 파싱 실패');
}

function normalizeConversationsPayload(parsed: any): VillageConversation[] {
  const rawConversations = Array.isArray(parsed?.conversations)
    ? parsed.conversations
    : Array.isArray(parsed)
      ? parsed
      : [];

  return rawConversations
    .map((conv: any) => {
      const trigger = typeof conv?.trigger === 'string' ? conv.trigger.trim() : '';
      const messages = (Array.isArray(conv?.messages) ? conv.messages : [])
        .map((m: any, idx: number) => {
          const speaker = typeof m?.speaker === 'string' ? m.speaker.trim() : '';
          const message = typeof m?.message === 'string' ? m.message.trim() : '';
          if (!speaker || !message) return null;
          return {
            id: `vm_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            speaker,
            message,
            sentiment: normalizeSentiment(m?.sentiment),
            replyTo: typeof m?.replyTo === 'string' ? m.replyTo : undefined,
            newsTrigger: trigger,
          } as VillageMessage;
        })
        .filter((m: VillageMessage | null): m is VillageMessage => m !== null);

      if (messages.length === 0) return null;
      return {
        trigger: trigger || messages[0].message.slice(0, 24),
        messages,
      } satisfies VillageConversation;
    })
    .filter((conv: VillageConversation | null): conv is VillageConversation => conv !== null);
}

// ============================================================================
// 대화 배치 생성 (Gemini 1회 호출로 5~8개 대화 생성)
// ============================================================================

export async function generateVillageConversations(
  marketContext?: string
): Promise<VillageBatch> {
  const activeGurus = Object.keys(GURU_PERSONAS); // 전원 10명
  const guruInfo = activeGurus
    .map(id => GURU_PERSONAS[id])
    .join('\n');

  // 랜덤 명언 3~5개를 대화 씨앗으로 제공
  const seedQuotes = Array.from({ length: 5 }, () => getRandomQuote());
  const seedText = seedQuotes.map(q => `- ${q.guruId}: "${q.quote}"`).join('\n');

  // 토론 주제 (guruDebateTopics 존재 시)
  let debateText = '';
  if (getRandomDebate) {
    try {
      const debate1 = getRandomDebate();
      const debate2 = getRandomDebate();
      if (debate1 && debate2) {
        const formatDebate = (d: any) => {
          const parts = (d.participants || []).map((p: any) => `${p.guruId}(${p.stance}): "${p.line}"`);
          return `- ${d.topic}: ${parts.join(' vs ')}`;
        };
        debateText = `\n[오늘의 토론 주제 — 이 주제로 구루들의 논쟁을 만들어주세요]\n${formatDebate(debate1)}\n${formatDebate(debate2)}`;
      }
    } catch {
      // 무시 — debateText 빈 문자열 유지
    }
  }

  const systemPrompt = `당신은 투자 거장들이 모여 사는 마을의 AI 시나리오 작가입니다.
마을에서 거장들이 자연스럽게 대화하는 장면을 만들어주세요.

[등장인물]
${guruInfo}

[구루 간 관계 — 반드시 반영하세요]
- 버핏 vs 세일러: 비트코인 논쟁 (적대적 라이벌)
- 버핏 vs 캐시우드: 가치투자 vs 혁신 (가벼운 놀림)
- 다이먼 vs 세일러: 은행 vs 크립토 (적대적 라이벌)
- 머스크 vs 버핏: 장난+도발 (머스크가 놀림)
- 머스크 + 세일러: 비트코인 동맹
- 캐시우드 + 머스크: 혁신 동맹
- 달리오 + 드러킨밀러: 매크로 동료 (서로 존경)
- 린치 + 막스: 가치투자 동맹
- 로저스: 원자재/중국/모험 (독립적, 아시아 탐험가)

[오늘의 씨앗 명언 — 이 발언에서 영감을 받아 대화를 확장하세요]
${seedText}
${debateText}

[필수 규칙 — 이전과 다른 점]
1. 6~8개의 독립적인 대화 장면을 만들어주세요
2. 각 장면은 2~4개의 대사로 구성
3. 대사는 1-2문장 (자연스러운 구어체). ${getPromptLanguageInstruction()}
4. **독백 금지** — 각 대화는 반드시 2명 이상이 참여해야 합니다
5. 6~8개 대화 중 **최소 3개는 구루 간 토론/반박**이어야 합니다
6. 단순 동의보다 **갈등, 놀림, 반박**이 재미있습니다
7. 각 캐릭터의 개성과 말투를 확실히 구분
8. speaker는 반드시 guruId 사용: ${activeGurus.join(', ')}
9. 뉴스/시장 상황을 각자의 관점으로 해석
10. 재미있고 기억에 남는 대사 (밈 될 만한 한 줄)
11. 위 씨앗 명언의 내용을 자연스럽게 대화에 녹여주세요 (그대로 복사 금지, 변형 사용)

[JSON 형식으로만 응답]
{
  "conversations": [
    {
      "trigger": "대화 주제/상황 설명",
      "messages": [
        { "speaker": "guruId", "message": "대사", "sentiment": "NEUTRAL", "replyTo": null },
        { "speaker": "guruId", "message": "반응 대사", "sentiment": "BEARISH", "replyTo": "guruId" }
      ]
    }
  ]
}`;

  // 중복 방지: 최근 본 대화 해시를 프롬프트에 추가
  const freshnessSuffix = await getFreshnessPromptSuffix().catch(() => '');

  const basePrompt = marketContext
    ? `오늘의 시장 상황:\n${marketContext}\n\n이 상황에서 거장들이 서로 토론하세요. 특히 의견이 다른 구루들 사이의 갈등과 반박을 생생하게 만들어주세요. 트럼프 관세, 금리, AI 같은 핫이슈가 있으면 라이벌 구루들이 정면 충돌하게 하세요.`
    : '거장들이 마을에서 최근 시장에 대해 열띤 토론을 벌이는 장면을 만들어주세요. 동의보다 반박이, 독백보다 대화가 재미있습니다. 라이벌 관계의 구루들이 충돌하는 장면을 반드시 포함하세요.';

  const userPrompt = freshnessSuffix ? `${basePrompt}\n\n${freshnessSuffix}` : basePrompt;

  try {
    const { default: supabase } = await import('./supabase');

    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: {
        prompt: userPrompt,
        systemPrompt,
        type: 'village_conversation',
        lang: getLangParam(),
      },
    });

    if (error) throw new Error(`Gemini 호출 실패: ${error.message}`);

    // Edge Function 응답: { success, data: { result: text } }
    const rawResult = data?.data?.result ?? data?.result;
    const parsed = (typeof rawResult === 'object' && rawResult !== null)
      ? rawResult
      : parseModelJsonResponse(rawResult ? String(rawResult) : '');
    const normalizedConversations = normalizeConversationsPayload(parsed);
    if (normalizedConversations.length === 0) {
      throw new Error('생성된 대화가 비어 있습니다');
    }
    const batch: VillageBatch = {
      conversations: normalizedConversations,
      generatedAt: new Date().toISOString(),
    };

    await saveBatch(batch);

    // 생성된 대화를 "이미 봤음"으로 기록 (다음 생성 시 중복 방지)
    for (const conv of batch.conversations) {
      const triggerHash = hashContent(conv.trigger);
      markSeen('conversations', triggerHash).catch(() => {});
    }

    return batch;
  } catch (err) {
    if (__DEV__) console.warn('[Village] 대화 생성 실패(폴백 사용):', err);
    Sentry.captureException(err, { tags: { service: 'village', action: 'generate' } });
    // 폴백: 기본 대화
    return getFallbackBatch();
  }
}

// ============================================================================
// 사용자 → 개별 구루 대화
// ============================================================================

export async function askGuruDirectly(
  guruId: string,
  question: string,
  recentContext?: string
): Promise<VillageMessage> {
  const persona = GURU_PERSONAS[guruId];
  const config = GURU_CHARACTER_CONFIGS[guruId];

  const systemPrompt = `당신은 ${config?.guruName || guruId}입니다.
캐릭터: ${persona}

사용자가 말을 걸었습니다. 캐릭터의 성격과 말투에 맞게 1-2문장으로 답변하세요.
${getPromptLanguageInstruction()} 자연스러운 구어체로 답변하세요.
${recentContext ? `\n최근 시장 상황: ${recentContext}` : ''}

JSON으로만 응답:
{ "message": "답변", "sentiment": "NEUTRAL" }`;

  try {
    const { default: supabase } = await import('./supabase');

    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: {
        prompt: `사용자: "${question}"`,
        systemPrompt,
        type: 'guru_chat',
        lang: getLangParam(),
      },
    });

    if (error) throw error;

    const rawChat = data?.data?.result ?? data?.result;
    const parsed = (typeof rawChat === 'object' && rawChat !== null)
      ? rawChat
      : parseModelJsonResponse(rawChat ? String(rawChat) : '');
    const safeMessage = typeof parsed?.message === 'string' ? parsed.message.trim() : '';
    if (!safeMessage) throw new Error('빈 구루 답변');

    return {
      id: `vm_${Date.now()}_reply`,
      speaker: guruId,
      message: safeMessage,
      sentiment: normalizeSentiment(parsed?.sentiment),
    };
  } catch (err) {
    if (__DEV__) console.warn('[Village] 구루 답변 실패(폴백 사용):', err);
    Sentry.captureException(err, { tags: { service: 'village', action: 'guru_chat', guruId } });

    // 구루별 맞춤 폴백 메시지 — 캐릭터 성격 유지
    const guruFallbacks: Record<string, string> = {
      buffett: '허허, 지금 시장이 좀 복잡하네. 잠시 코카콜라 한 잔 하고 다시 생각해보겠네.',
      dalio: '시스템에 일시적 이상이 감지되었습니다. 데이터를 재분석하겠습니다.',
      cathie_wood: '앗, 잠시 기술적 이슈가 있어요! 곧 돌아올게요!',
      druckenmiller: '잠깐, 시장 데이터를 다시 확인하고 있어.',
      saylor: '네트워크 지연... 비트코인 블록처럼 곧 확인될 거야!',
      dimon: '잠시 시스템 점검 중입니다. 곧 준비됩니다.',
      musk: '서버 재시작 중... 화성에서 오는 신호라 좀 느려요 😅',
      lynch: '슈퍼마켓 계산대가 좀 밀렸나 봐요. 잠시만 기다려주세요!',
      marks: '2차적 사고를 위해 잠시 시간이 필요합니다. 곧 돌아오겠습니다.',
      rogers: '글로벌 네트워크 연결이 좀 불안정하군요. 잠시 후 다시 시도해주세요.',
    };

    const fallbackMsg = guruFallbacks[guruId] || '잠시 후 다시 시도해주세요...';

    return {
      id: `vm_${Date.now()}_fallback`,
      speaker: guruId,
      message: fallbackMsg,
      sentiment: 'NEUTRAL',
    };
  }
}

// ============================================================================
// 캐시 관리
// ============================================================================

async function saveBatch(batch: VillageBatch): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(batch));
  } catch {
    // 무시
  }
}

export async function getCachedBatch(): Promise<VillageBatch | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const batch = JSON.parse(raw) as VillageBatch;

    // 캐시 유효 시간 체크
    const age = Date.now() - new Date(batch.generatedAt).getTime();
    if (age > CACHE_DURATION) return null;

    return batch;
  } catch {
    return null;
  }
}

// ============================================================================
// 폴백 대화 (API 실패 시)
// ============================================================================

function getFallbackBatch(): VillageBatch {
  return {
    conversations: [
      // 1. 가치투자 vs 혁신 (버핏 vs 캐시우드)
      {
        trigger: '가치투자 vs 혁신 투자 논쟁',
        messages: [
          { id: 'fb1', speaker: 'buffett', message: '코카콜라는 70년째 배당을 준다네. 이게 진짜 해자지.', sentiment: 'BULLISH' },
          { id: 'fb2', speaker: 'cathie_wood', message: '할아버지, AI가 코카콜라 배당 70년치를 5년 만에 만들어요!', sentiment: 'BULLISH', replyTo: 'buffett' },
          { id: 'fb3', speaker: 'buffett', message: '허허, 젊은이. 나는 이해 못 하는 건 안 산다네. 근데 AI가 뭐하는 건가?', sentiment: 'NEUTRAL', replyTo: 'cathie_wood' },
          { id: 'fb4', speaker: 'cathie_wood', message: '바로 그 질문이 기회예요! 이해하려고 노력하면 5년 뒤가 보여요!', sentiment: 'BULLISH', replyTo: 'buffett' },
        ],
      },
      // 2. 비트코인 전쟁 (세일러 vs 다이먼)
      {
        trigger: '비트코인 논쟁 — 은행 vs 크립토',
        messages: [
          { id: 'fb5', speaker: 'saylor', message: '비트코인이 또 올랐어! 아직도 안 산 사람?!', sentiment: 'BULLISH' },
          { id: 'fb6', speaker: 'dimon', message: '세일러 씨, 규제가 올 거요. 중앙은행 없는 통화는 환상이에요.', sentiment: 'BEARISH', replyTo: 'saylor' },
          { id: 'fb7', speaker: 'saylor', message: '다이먼! 당신네 JP모건도 비트코인 ETF 팔잖아! 환상을 파는 건 누구?', sentiment: 'BULLISH', replyTo: 'dimon' },
          { id: 'fb8', speaker: 'musk', message: '두 분 싸우는 거 재밌네요. 도지코인은 어때요? 농담이에요... 아닌가?', sentiment: 'NEUTRAL', replyTo: 'saylor' },
        ],
      },
      // 3. 매크로 동료 토론 (달리오 + 드러킨밀러)
      {
        trigger: '매크로 전망 교환',
        messages: [
          { id: 'fb9', speaker: 'dalio', message: '경제 기계가 신호를 보내고 있어요. 부채 사이클 후반부 징후가 보입니다.', sentiment: 'CAUTIOUS' },
          { id: 'fb10', speaker: 'druckenmiller', message: '동의합니다, 달리오. 연준의 다음 수가 핵심이에요. 변곡점이 가깝다고 봅니다.', sentiment: 'CAUTIOUS', replyTo: 'dalio' },
          { id: 'fb11', speaker: 'dalio', message: '맞아요. 다각화만이 살길입니다. 상관관계 낮은 자산 15개 이상 갖추세요.', sentiment: 'NEUTRAL', replyTo: 'druckenmiller' },
        ],
      },
      // 4. 머스크 도발 (머스크 vs 버핏)
      {
        trigger: '머스크의 장난',
        messages: [
          { id: 'fb12', speaker: 'musk', message: '버핏 할아버지, 테슬라 시가총액이 버크셔를 넘긴 거 아세요?', sentiment: 'BULLISH' },
          { id: 'fb13', speaker: 'buffett', message: '허허, 시총은 인기 투표지. 기업 가치는 미래 현금흐름이라네.', sentiment: 'NEUTRAL', replyTo: 'musk' },
          { id: 'fb14', speaker: 'musk', message: '현금흐름? 화성에 도시 세우면 현금흐름이 몇 조가 될까요?', sentiment: 'BULLISH', replyTo: 'buffett' },
        ],
      },
      // 5. 가치투자 동맹 (린치 + 막스)
      {
        trigger: '일상 속 투자 아이디어',
        messages: [
          { id: 'fb15', speaker: 'lynch', message: '어제 마트에서 줄이 엄청 길었어요. 그 브랜드 주식을 확인해봐야겠어요.', sentiment: 'BULLISH' },
          { id: 'fb16', speaker: 'marks', message: '린치 선생, 좋은 관찰이에요. 하지만 2차적 사고가 필요합니다 — 그 인기가 이미 주가에 반영됐을 수도 있어요.', sentiment: 'CAUTIOUS', replyTo: 'lynch' },
          { id: 'fb17', speaker: 'lynch', message: '맞아요 막스. 그래서 PEG를 봐야죠. 성장성 대비 아직 저평가라면 기회예요.', sentiment: 'NEUTRAL', replyTo: 'marks' },
        ],
      },
      // 6. 혁신 동맹 (캐시우드 + 머스크 + 세일러)
      {
        trigger: '혁신파 수다',
        messages: [
          { id: 'fb18', speaker: 'cathie_wood', message: 'AI, 로봇, 유전체, 블록체인 — 이 4개가 동시에 터지고 있어요!', sentiment: 'BULLISH' },
          { id: 'fb19', speaker: 'musk', message: '여기에 우주 추가요! 스타링크가 전 세계를 연결하면 게임 체인저예요.', sentiment: 'BULLISH', replyTo: 'cathie_wood' },
          { id: 'fb20', speaker: 'saylor', message: '그리고 이 모든 혁신의 기반 통화가 비트코인이 될 겁니다!', sentiment: 'BULLISH', replyTo: 'musk' },
        ],
      },
      // 7. 로저스의 글로벌 시각 (로저스 vs 다이먼)
      {
        trigger: '글로벌 시장 관점 충돌',
        messages: [
          { id: 'fb21', speaker: 'rogers', message: '미국에만 집중하면 안 됩니다. 아시아, 특히 중국과 인도를 봐야 해요.', sentiment: 'BULLISH' },
          { id: 'fb22', speaker: 'dimon', message: '로저스 씨, 중국의 규제 리스크가 너무 큽니다. 안정적인 미국 시장이 최선이에요.', sentiment: 'CAUTIOUS', replyTo: 'rogers' },
          { id: 'fb23', speaker: 'rogers', message: '그 "안정적"이라는 확신이 가장 위험합니다. 오토바이 타고 직접 가보세요, 세상이 달라요!', sentiment: 'NEUTRAL', replyTo: 'dimon' },
        ],
      },
      // 8. 리스크 논쟁 (드러킨밀러 vs 세일러)
      {
        trigger: '올인 vs 리스크 관리',
        messages: [
          { id: 'fb24', speaker: 'druckenmiller', message: '확신이 있을 때 크게 베팅하라. 하지만 틀렸을 때 빠르게 빠져야 한다.', sentiment: 'NEUTRAL' },
          { id: 'fb25', speaker: 'saylor', message: '비트코인에 확신 있으면 빠질 필요 없어요. 평생 HODL!', sentiment: 'BULLISH', replyTo: 'druckenmiller' },
          { id: 'fb26', speaker: 'druckenmiller', message: '세일러, 한 자산에 올인하는 건 투자가 아니라 도박이야. 소로스가 가르쳐줬지.', sentiment: 'CAUTIOUS', replyTo: 'saylor' },
          { id: 'fb27', speaker: 'marks', message: '드러킨밀러 말이 맞아요. 리스크란 더 많은 일이 일어날 수 있다는 뜻이에요.', sentiment: 'CAUTIOUS', replyTo: 'druckenmiller' },
        ],
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
