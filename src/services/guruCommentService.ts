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

/** 구루 페르소나 (프롬프트용) */
const GURU_COMMENT_PERSONAS: Record<string, string> = {
  buffett: '워렌 버핏(🦉): 가치 투자 관점, 장기적 시각, 침착한 할아버지 톤.',
  dalio: '레이 달리오(🦌): 거시경제 기계론, 원칙 기반, 차분한 교수 톤.',
  cathie_wood: '캐시 우드(🦊): 혁신 투자, 5년 미래 지향, 열정적.',
  druckenmiller: '드러킨밀러(🐆): 매크로 트레이더, 날카로운 분석, 직설적.',
  saylor: '마이클 세일러(🐺): 비트코인 맥시멀리스트, 모든 걸 BTC로 연결, 열광적.',
  dimon: '제이미 다이먼(🦁): 은행장, 보수적 리스크 관리, 위엄 있는 톤.',
  musk: '일론 머스크(🦎): 장난기, 파괴적 사고, 트위터식 한 줄.',
  lynch: '피터 린치(🐻): 일상 투자, 슈퍼마켓 관점, 친근한 이웃 톤.',
  marks: '하워드 막스(🐢): 사이클 분석, 2차 사고, 신중한 작가 톤.',
  rogers: '짐 로저스(🐯): 글로벌 탐험가, 이머징 마켓, 원자재 관점.',
};

// ============================================================================
// 유틸리티
// ============================================================================

/** 오늘 날짜 키 (KST) */
function getTodayKey(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 카테고리에 맞는 구루 2명 선택 (랜덤) */
function selectTwoGurus(category: CommunityCategory): string[] {
  const gurus = COMMUNITY_CATEGORY_GURU_MAP[category] || COMMUNITY_CATEGORY_GURU_MAP.stocks;
  // 셔플 후 2명 선택
  const shuffled = [...gurus].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
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

    // 구루 2명 선택
    const guruIds = selectTwoGurus(category);
    const personaText = guruIds
      .map(id => GURU_COMMENT_PERSONAS[id])
      .filter(Boolean)
      .join('\n');

    const langInstruction = getPromptLanguageInstruction();

    // Gemini 프롬프트 구성
    const systemPrompt = `당신은 투자 거장들이 커뮤니티 게시물에 반응하는 AI입니다.
게시물 내용을 읽고, 각 거장의 관점에서 자연스럽게 1~2문장 댓글을 작성하세요.

[등장인물]
${personaText}

[규칙]
1. 각 거장의 성격과 투자 철학에 맞는 자연스러운 반응
2. 1~2문장, 구어체. ${langInstruction}
3. sentiment: BULLISH(낙관), BEARISH(비관), NEUTRAL(중립), CAUTIOUS(주의) 중 하나
4. 영어 번역도 함께 제공

[JSON 형식으로만 응답]
{
  "comments": [
    {
      "guruId": "구루ID",
      "content": "한국어 댓글",
      "contentEn": "English comment",
      "sentiment": "NEUTRAL"
    }
  ]
}`;

    const userPrompt = `게시물 카테고리: ${category}\n게시물 내용: ${content}\n\n위 게시물에 대해 ${guruIds.join(', ')} 구루의 댓글을 생성해주세요.`;

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

      const { error: insertError } = await supabase
        .from('community_guru_comments')
        .insert({
          post_id: postId,
          guru_id: guruId,
          content: comment.content,
          content_en: comment.contentEn || comment.content_en || null,
          sentiment,
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
