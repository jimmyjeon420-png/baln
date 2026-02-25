/**
 * 라운드테이블 서비스 — Gemini 연동 + 세션 저장/로드
 *
 * 역할: "회의 운영 팀" — 거장 토론을 AI로 생성하고 기록을 보관
 * - generateRoundtable: 주제 + 참석자 → Gemini → 전체 토론 생성
 * - askFollowUp: 기존 토론 + 사용자 질문 → 추가 답변
 * - saveSession / getRecentSessions: AsyncStorage에 히스토리 관리
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';
import { getPromptLanguageInstruction, getLangParam } from '../utils/promptLanguage';
import type {
  RoundtableSession,
  RoundtableTurn,
  UserQuestion,
  RoundtableGeminiResponse,
  FollowUpGeminiResponse,
} from '../types/roundtable';

const STORAGE_KEY = '@baln:roundtable_sessions';
const MAX_SESSIONS = 10;

// ============================================================================
// Gemini 호출 (gemini-proxy Edge Function 경유)
// ============================================================================

async function callRoundtableGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const { default: supabase } = await import('./supabase');

  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: {
      prompt: userPrompt,
      systemPrompt,
      type: 'roundtable',
      lang: getLangParam(),
    },
  });

  if (error) throw new Error(`Gemini 호출 실패: ${error.message}`);
  if (!data?.result) throw new Error('빈 응답');
  return typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
}

function parseJsonResponse<T>(text: string): T {
  // markdown 코드 블록 제거
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  return JSON.parse(cleaned);
}

// ============================================================================
// 거장 정보 생성 (프롬프트용)
// ============================================================================

const GURU_PHILOSOPHIES: Record<string, string> = {
  buffett: '가치 투자, 장기 보유, "남들이 두려울 때 탐욕적이 되라", 해자(moat) 중시',
  dalio: 'All Weather 전략, 분산 투자, 원칙(Principles) 기반 의사결정, 경제 기계(Economic Machine)',
  cathie_wood: '파괴적 혁신(Disruptive Innovation), 5년 장기 전망, AI/로봇/유전체/블록체인 집중',
  druckenmiller: '매크로 트레이딩, 집중 투자, 트렌드 전환점 포착, "볼이 있는 곳으로 달려가라"',
  saylor: '비트코인 극대주의, 디지털 자산 장기 보유, 화폐 가치 하락 헤지',
  dimon: '전통 금융 안정성, 리스크 관리, 은행 시스템 중심, 규제 준수',
  musk: '기술 혁신 투자, 첫 원칙(First Principles) 사고, 우주/AI/에너지 혁명',
  lynch: '일상에서 투자 아이디어 발굴, 숨은 성장주 발굴, PEG 비율 중시',
  marks: '시장 사이클 이해, 2차적 사고(Second-Level Thinking), 리스크 중심 투자',
  rogers: '글로벌 매크로, 원자재 슈퍼사이클, 신흥시장 장기 투자, 현장 탐방',
};

function getParticipantInfo(guruIds: string[]): string {
  return guruIds.map(id => {
    const config = GURU_CHARACTER_CONFIGS[id];
    const philosophy = GURU_PHILOSOPHIES[id] || '';
    return `- ${config?.guruName || id} (${config?.guruNameEn || id}): ${philosophy}`;
  }).join('\n');
}

// ============================================================================
// 라운드테이블 토론 생성
// ============================================================================

export async function generateRoundtable(
  topic: string,
  participantIds: string[]
): Promise<RoundtableSession> {
  const participantInfo = getParticipantInfo(participantIds);

  const systemPrompt = `당신은 투자 거장 라운드테이블 사회자입니다.
주어진 주제에 대해 참석자들이 자연스럽게 토론하는 대화를 생성하세요.

참석자 정보:
${participantInfo}

규칙:
- 5~7턴으로 구성
- 서로 반박/동의하며 자연스러운 토론 (실제 그 거장이 말할 법한 어투)
- 각 발언 2-3문장. ${getPromptLanguageInstruction()}
- 거장의 투자 철학에 맞는 관점으로 발언
- sentiment는 BULLISH/BEARISH/NEUTRAL/CAUTIOUS 중 하나
- speaker는 반드시 다음 ID 중 하나: ${participantIds.join(', ')}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "topic_summary": "주제 한 줄 요약",
  "turns": [
    { "speaker": "guruId", "message": "발언 내용", "sentiment": "NEUTRAL" }
  ],
  "conclusion": "토론 종합 요약 1-2문장"
}`;

  const userPrompt = `오늘의 토론 주제: "${topic}"`;

  try {
    const responseText = await callRoundtableGemini(systemPrompt, userPrompt);
    const parsed = parseJsonResponse<RoundtableGeminiResponse>(responseText);

    const session: RoundtableSession = {
      id: generateId(),
      topic,
      topicSummary: parsed.topic_summary || topic,
      participants: participantIds,
      turns: parsed.turns.map(t => ({
        speaker: t.speaker,
        message: t.message,
        sentiment: t.sentiment,
      })),
      conclusion: parsed.conclusion || '',
      userQuestions: [],
      createdAt: new Date().toISOString(),
    };

    await saveSession(session);
    return session;
  } catch (err) {
    if (__DEV__) console.error('[Roundtable] 생성 실패:', err);
    Sentry.captureException(err, { tags: { service: 'roundtable', action: 'generate' } });
    throw err;
  }
}

// ============================================================================
// 추가 질문 처리
// ============================================================================

export async function askFollowUp(
  session: RoundtableSession,
  question: string
): Promise<UserQuestion> {
  const participantInfo = getParticipantInfo(session.participants);

  const previousContext = session.turns
    .map(t => {
      const config = GURU_CHARACTER_CONFIGS[t.speaker];
      return `${config?.guruName || t.speaker}: "${t.message}"`;
    })
    .join('\n');

  const systemPrompt = `이전 라운드테이블 토론 맥락:
주제: ${session.topic}
${previousContext}

참석자 정보:
${participantInfo}

사용자가 추가 질문을 했습니다. 각 거장이 자신의 투자 철학에 맞게 1문장씩 답변하세요.
speaker는 반드시 다음 ID 중 하나: ${session.participants.join(', ')}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "responses": [
    { "speaker": "guruId", "message": "답변", "sentiment": "NEUTRAL" }
  ]
}`;

  const userPrompt = `사용자 질문: "${question}"`;

  try {
    const responseText = await callRoundtableGemini(systemPrompt, userPrompt);
    const parsed = parseJsonResponse<FollowUpGeminiResponse>(responseText);

    const userQ: UserQuestion = {
      question,
      responses: parsed.responses.map(r => ({
        speaker: r.speaker,
        message: r.message,
        sentiment: r.sentiment,
      })),
    };

    // 세션에 질문 추가 후 저장
    session.userQuestions.push(userQ);
    await saveSession(session);

    return userQ;
  } catch (err) {
    if (__DEV__) console.error('[Roundtable] 추가 질문 실패:', err);
    Sentry.captureException(err, { tags: { service: 'roundtable', action: 'follow_up' } });
    throw err;
  }
}

// ============================================================================
// 세션 저장/로드 (AsyncStorage)
// ============================================================================

export async function saveSession(session: RoundtableSession): Promise<void> {
  try {
    const existing = await getRecentSessions();
    const filtered = existing.filter(s => s.id !== session.id);
    const updated = [session, ...filtered].slice(0, MAX_SESSIONS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    if (__DEV__) console.error('[Roundtable] 저장 실패:', err);
  }
}

export async function getRecentSessions(): Promise<RoundtableSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RoundtableSession[];
  } catch {
    return [];
  }
}

export async function getSessionById(sessionId: string): Promise<RoundtableSession | null> {
  const sessions = await getRecentSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

// ============================================================================
// 유틸
// ============================================================================

function generateId(): string {
  return `rt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
