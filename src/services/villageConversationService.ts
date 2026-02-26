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

// ============================================================================
// 대화 배치 생성 (Gemini 1회 호출로 5~8개 대화 생성)
// ============================================================================

export async function generateVillageConversations(
  marketContext?: string
): Promise<VillageBatch> {
  const activeGurus = Object.keys(GURU_PERSONAS).slice(0, 8); // 최대 8명
  const guruInfo = activeGurus
    .map(id => GURU_PERSONAS[id])
    .join('\n');

  const systemPrompt = `당신은 투자 거장들이 모여 사는 마을의 AI 시나리오 작가입니다.
마을에서 거장들이 자연스럽게 대화하는 장면을 만들어주세요.

[등장인물]
${guruInfo}

[규칙]
1. 5~8개의 독립적인 대화 장면을 만들어주세요
2. 각 장면은 2~4개의 대사로 구성
3. 대사는 1-2문장 (자연스러운 구어체). ${getPromptLanguageInstruction()}
4. 독백도 가능 (혼자 중얼거리기)
5. 서로 반박/동의/놀리기 등 자연스러운 인간 관계
6. 각 캐릭터의 개성과 말투를 확실히 구분
7. speaker는 반드시 guruId 사용: ${activeGurus.join(', ')}
8. 뉴스/시장 상황을 각자의 관점으로 해석
9. 재미있고 기억에 남는 대사 (밈 될 만한 한 줄)

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
    ? `오늘의 시장 상황:\n${marketContext}\n\n이 상황에서 거장들이 마을에서 나누는 대화를 만들어주세요. 트럼프 관세, 금리, AI 같은 핫이슈가 있으면 거장들이 각자 반응하게 해주세요.`
    : '거장들이 마을에서 평소처럼 투자에 대해 이야기하는 장면을 만들어주세요. 최근 글로벌 시장 트렌드를 반영해주세요.';

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
    const resultText = typeof rawResult === 'string'
      ? rawResult
      : JSON.stringify(rawResult || '');

    const cleaned = resultText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const batch: VillageBatch = {
      conversations: (parsed.conversations || []).map((conv: any) => ({
        trigger: conv.trigger || '',
        messages: (conv.messages || []).map((m: any, idx: number) => ({
          id: `vm_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          speaker: m.speaker,
          message: m.message,
          sentiment: m.sentiment || 'NEUTRAL',
          replyTo: m.replyTo || undefined,
          newsTrigger: conv.trigger,
        })),
      })),
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
    if (__DEV__) console.error('[Village] 대화 생성 실패:', err);
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
    const text = typeof rawChat === 'string' ? rawChat : JSON.stringify(rawChat || '');
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      id: `vm_${Date.now()}_reply`,
      speaker: guruId,
      message: parsed.message || '음... 잠깐만요.',
      sentiment: parsed.sentiment || 'NEUTRAL',
    };
  } catch (err) {
    if (__DEV__) console.error('[Village] 구루 답변 실패:', err);
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
      {
        trigger: '시장 일반 토론',
        messages: [
          { id: 'fb1', speaker: 'buffett', message: '오늘도 코카콜라 주가는 안정적이군. 이래서 해자가 있는 기업이 좋아.', sentiment: 'BULLISH' },
          { id: 'fb2', speaker: 'cathie_wood', message: '할아버지, 코카콜라 말고 AI 좀 보세요! 세상이 바뀌고 있다고요!', sentiment: 'BULLISH', replyTo: 'buffett' },
          { id: 'fb3', speaker: 'buffett', message: '허허, 젊은이. 나는 이해 못 하는 건 안 산다네.', sentiment: 'NEUTRAL', replyTo: 'cathie_wood' },
        ],
      },
      {
        trigger: '비트코인 토론',
        messages: [
          { id: 'fb4', speaker: 'saylor', message: '비트코인이 또 올랐어! 아직도 안 산 사람?!', sentiment: 'BULLISH' },
          { id: 'fb5', speaker: 'dimon', message: '세일러 씨, 그건 사기예요... 제발...', sentiment: 'BEARISH', replyTo: 'saylor' },
          { id: 'fb6', speaker: 'saylor', message: '다이먼! 당신네 JP모건도 비트코인 ETF 팔잖아!', sentiment: 'BULLISH', replyTo: 'dimon' },
        ],
      },
      {
        trigger: '달리오의 명상',
        messages: [
          { id: 'fb7', speaker: 'dalio', message: '시장은 기계와 같아요. 감정을 빼고 원칙대로 행동하면...', sentiment: 'NEUTRAL' },
          { id: 'fb8', speaker: 'musk', message: '원칙? 저는 그냥 만들면 되는데? 화성에 거래소 하나 세울까?', sentiment: 'BULLISH', replyTo: 'dalio' },
        ],
      },
      {
        trigger: '가치 투자 vs 성장 투자',
        messages: [
          { id: 'fb9', speaker: 'lynch', message: '여러분, 투자 아이디어는 슈퍼마켓에도 있어요. 어떤 물건이 잘 팔리는지 보세요.', sentiment: 'NEUTRAL' },
          { id: 'fb10', speaker: 'marks', message: '린치 선생 말이 맞아요. 하지만 2차적 사고가 필요합니다. 모두가 아는 건 투자가 아니에요.', sentiment: 'CAUTIOUS', replyTo: 'lynch' },
        ],
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
