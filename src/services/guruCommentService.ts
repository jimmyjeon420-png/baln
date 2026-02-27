/**
 * guruCommentService.ts - 구루 AI 댓글 생성 서비스
 *
 * 역할: "구루 편집국" — 게시물 카테고리에 맞는 구루 2명을 골라 AI 댓글 생성
 * - 게시물 작성 시 fire-and-forget으로 호출
 * - 실패해도 게시물에 영향 없음
 * - 일 5회/유저 제한 (AsyncStorage)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabase';
import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';
import { getPromptLanguageInstruction, getLangParam } from '../utils/promptLanguage';
import type { CommunityCategory } from '../types/community';
import type { GuruCommentSentiment } from '../types/guruComment';

// ============================================================================
// 상수
// ============================================================================

/** 일일 구루 댓글 생성 제한 */
const DAILY_LIMIT = 5;

/** AsyncStorage 키 접두사 */
const DAILY_COUNT_KEY_PREFIX = '@baln:guru_comment_count_';

// ============================================================================
// 카테고리별 구루 매핑 (커뮤니티 카테고리 → 구루 ID)
// ============================================================================

const COMMUNITY_CATEGORY_GURU_MAP: Record<CommunityCategory, string[]> = {
  stocks: ['buffett', 'dalio', 'druckenmiller', 'marks', 'dimon', 'lynch'],
  crypto: ['saylor', 'musk', 'cathie_wood', 'dimon', 'rogers', 'druckenmiller'],
  realestate: ['lynch', 'buffett', 'marks', 'rogers', 'dalio'],
};

/** 구루 페르소나 (프롬프트용 — 성격과 말투를 구체적으로 묘사) */
const GURU_COMMENT_PERSONAS: Record<string, string> = {
  buffett: `워렌 버핏: 오마하의 현자. "내가 이해하지 못하는 건 사지 않는다." 가치 투자 신봉자.
    말투: 여유롭고 유머러스한 할아버지. 코카콜라, 시즈캔디 같은 일상 비유를 즐겨 쓴다.
    특징: 투기적인 글에는 "그건 투자가 아니라 도박이지" 식으로 살짝 꼬집는다.`,
  dalio: `레이 달리오: 브릿지워터 창업자. 거시경제를 기계처럼 분석하는 원칙주의자.
    말투: 차분하고 논리적인 교수 톤. "역사적으로 보면..." "사이클 관점에서..." 로 시작.
    특징: 감정적인 글에 "원칙을 세워야 합니다" 하고 냉정하게 조언한다.`,
  cathie_wood: `캐시 우드: ARK Invest CEO. 파괴적 혁신에 올인하는 미래 신봉자.
    말투: 열정적이고 확신에 찬 톤. "5년 후를 보세요!" "이건 시작에 불과합니다."
    특징: 전통 가치주 이야기에 "그건 과거의 비즈니스" 하고 도발적으로 반론한다.`,
  druckenmiller: `스탠리 드러킨밀러: 소로스의 오른팔이었던 매크로 전설.
    말투: 날카롭고 직설적. 군더더기 없이 핵심만. "타이밍이 핵심이다."
    특징: 장기 투자 이야기에 "시장은 기다려주지 않아" 하고 현실적으로 지적한다.`,
  saylor: `마이클 세일러: MicroStrategy CEO. 비트코인 맥시멀리스트.
    말투: 선교사처럼 열광적. 모든 주제를 비트코인으로 연결. "결국 답은 BTC입니다."
    특징: 법정화폐나 금 이야기에 "인플레이션이 다 먹어치웁니다" 하고 즉시 반박한다.`,
  dimon: `제이미 다이먼: JP모건 CEO. 월스트리트의 왕. 보수적 리스크 관리자.
    말투: 위엄 있고 단호한 은행장 톤. "리스크를 먼저 보세요." "은행은 다릅니다."
    특징: 코인이나 고위험 투자에 "그건 프랜켄슈타인 자산" 식으로 회의적이다.`,
  musk: `일론 머스크: 테슬라·스페이스X CEO. 트롤링의 천재.
    말투: 트위터식 한 줄. 밈, 유머, 파괴적 한마디. "ㅋㅋ" 도 쓸 수 있다.
    특징: 진지한 분석에 장난기 섞인 한 줄로 분위기를 바꾼다.`,
  lynch: `피터 린치: 마젤란 펀드 전설. "내 주변에서 투자 아이디어를 찾아라."
    말투: 친근한 이웃 아저씨 톤. 마트, 식당, 일상에서 투자 기회를 찾는다.
    특징: 복잡한 분석에 "슈퍼에서 줄 서는 곳을 보세요" 식으로 쉽게 풀어준다.`,
  marks: `하워드 막스: 오크트리 캐피탈 공동창업자. 2차적 사고의 대가.
    말투: 신중하고 깊이 있는 작가 톤. "모두가 알고 있다면 이미 가격에 반영됐습니다."
    특징: 낙관적인 글에 "2차적 사고가 필요합니다" 하고 리스크를 환기시킨다.`,
  rogers: `짐 로저스: 월드 투어 투자가. 이머징 마켓과 원자재의 달인.
    말투: 모험가 톤. "난 전 세계를 돌아다니며 투자 기회를 찾았습니다."
    특징: 미국 중심 시각에 "세계를 넓게 보세요. 기회는 바깥에 있습니다" 하고 시야를 넓혀준다.`,
};

// ============================================================================
// 유틸리티
// ============================================================================

/** 오늘 날짜 키 (KST) */
function getTodayKey(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 카테고리에 맞는 구루 2~3명 랜덤 선택 */
function selectRandomGurus(category: CommunityCategory): string[] {
  const gurus = COMMUNITY_CATEGORY_GURU_MAP[category] || COMMUNITY_CATEGORY_GURU_MAP.stocks;
  const shuffled = [...gurus].sort(() => Math.random() - 0.5);
  // 2명 또는 3명 랜덤 선택
  const count = Math.random() < 0.5 ? 2 : 3;
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 구루의 라이벌 찾기 */
const GURU_RIVAL_MAP: Record<string, string[]> = {
  buffett: ['cathie_wood', 'saylor'],
  cathie_wood: ['buffett', 'dimon'],
  saylor: ['buffett', 'dimon'],
  dalio: [],
  musk: ['dimon', 'marks'],
  dimon: ['saylor', 'musk', 'cathie_wood'],
  druckenmiller: [],
  lynch: [],
  marks: ['musk'],
  rogers: [],
};

function findRival(guruId: string, excluded: string[]): string | null {
  const rivals = GURU_RIVAL_MAP[guruId] || [];
  const available = rivals.filter(r => !excluded.includes(r));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/** 일일 사용량 체크 + 증가 */
async function checkAndIncrementDailyLimit(): Promise<boolean> {
  const key = `${DAILY_COUNT_KEY_PREFIX}${getTodayKey()}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= DAILY_LIMIT) return false;
    await AsyncStorage.setItem(key, (count + 1).toString());
    return true;
  } catch {
    return true; // AsyncStorage 실패 시 허용
  }
}

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * 게시물에 구루 AI 댓글 생성
 *
 * fire-and-forget: 실패해도 게시물에 영향 없음
 * 일 5회/유저 제한 적용
 */
export async function generateGuruCommentsForPost(
  postId: string,
  content: string,
  category: CommunityCategory,
): Promise<void> {
  try {
    // 일일 제한 체크
    const allowed = await checkAndIncrementDailyLimit();
    if (!allowed) {
      if (__DEV__) console.log('[GuruComment] 일일 제한 초과, 건너뜀');
      return;
    }

    // 구루 2~3명 랜덤 선택
    const guruIds = selectRandomGurus(category);
    const allGuruIds = [...guruIds];

    const personaText = allGuruIds
      .map(id => GURU_COMMENT_PERSONAS[id])
      .filter(Boolean)
      .join('\n');

    const langInstruction = getPromptLanguageInstruction();

    // 라이벌 지시문 (구루 간 의견 차이를 자연스럽게 표현)
    const rivalInstruction = allGuruIds.length >= 2
      ? `\n5. 구루들은 서로 의견이 다를 수 있습니다. 같은 주제에 대해 각자의 철학에 맞게 자연스럽게 반응하세요. 반박 시 replyToGuruId에 대상 구루 ID를 넣으세요.`
      : '';

    // Gemini 프롬프트 구성
    const systemPrompt = `당신은 투자 거장들이 커뮤니티 게시물에 반응하는 AI입니다.
게시물 내용을 읽고, 각 거장의 관점에서 자연스럽게 1~2문장 댓글을 작성하세요.

[등장인물]
${personaText}

[규칙]
1. 각 거장의 성격과 투자 철학에 맞는 자연스러운 반응
2. 1~2문장, 구어체. ${langInstruction}
3. sentiment: BULLISH(낙관), BEARISH(비관), NEUTRAL(중립), CAUTIOUS(주의) 중 하나
4. 영어 번역도 함께 제공${rivalInstruction}

[JSON 형식으로만 응답]
{
  "comments": [
    {
      "guruId": "구루ID",
      "content": "한국어 댓글",
      "contentEn": "English comment",
      "sentiment": "NEUTRAL",
      "replyToGuruId": null
    }
  ]
}`;

    const userPrompt = `게시물 카테고리: ${category}\n게시물 내용: ${content}\n\n위 게시물에 대해 ${allGuruIds.join(', ')} 구루의 댓글을 생성해주세요. 각 구루의 독특한 성격과 말투를 반드시 반영하세요.`;

    // Gemini 호출 (gemini-proxy Edge Function)
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: {
        prompt: userPrompt,
        systemPrompt,
        type: 'guru_chat',
        lang: getLangParam(),
      },
    });

    if (error) {
      console.warn('[GuruComment] Gemini 호출 실패:', error.message);
      return;
    }

    // 응답 파싱
    const rawResult = data?.data?.result ?? data?.result;
    const resultText = typeof rawResult === 'string'
      ? rawResult
      : JSON.stringify(rawResult || '');

    const cleaned = resultText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const comments = parsed.comments || [];

    // DB 저장 (각 구루 댓글을 개별 INSERT)
    for (const comment of comments) {
      const guruId = comment.guruId || comment.guru_id;
      if (!guruId || !comment.content) continue;

      // 유효한 구루 ID인지 확인
      if (!GURU_CHARACTER_CONFIGS[guruId]) continue;

      const sentiment: GuruCommentSentiment =
        ['BULLISH', 'BEARISH', 'NEUTRAL', 'CAUTIOUS'].includes(comment.sentiment)
          ? comment.sentiment
          : 'NEUTRAL';

      // 반박 대상 구루 ID
      const replyToGuruId = comment.replyToGuruId || comment.reply_to_guru_id || null;

      const { error: insertError } = await supabase
        .from('community_guru_comments')
        .insert({
          post_id: postId,
          guru_id: guruId,
          content: comment.content,
          content_en: comment.contentEn || comment.content_en || null,
          sentiment,
          ...(replyToGuruId ? { reply_to_guru_id: replyToGuruId } : {}),
        });

      if (insertError) {
        console.warn(`[GuruComment] INSERT 실패 (${guruId}):`, insertError.message);
      }
    }

    if (__DEV__) {
      console.log(`[GuruComment] ${comments.length}개 구루 댓글 생성 완료 (post: ${postId})`);
    }
  } catch (err) {
    // fire-and-forget: 어떤 에러든 무시
    console.warn('[GuruComment] 구루 댓글 생성 실패 (무시):', err);
  }
}
