/**
 * 편지 답장 서비스 (Letter Reply Service)
 *
 * 역할: "마을 우체국 직원" — 구루에게 보내는 답장 관리
 * - sendReply: 답장을 AsyncStorage 큐에 저장
 * - getPendingReplies: 미발송 답장 조회
 * - getGuruResponse: 구루 보이스로 사전작성된 응답 반환 (AI 호출 없음)
 * - getRemainingReplies: 이번 주 남은 무료 답장 횟수
 *
 * 무료: 주 2회, Premium: 무제한
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GURU_CHARACTER_CONFIGS } from '../data/guruCharacterConfig';

// ============================================================================
// Constants
// ============================================================================

const REPLIES_KEY = '@baln:guru_letter_replies';
const REPLY_COUNT_KEY = '@baln:guru_letter_reply_count';
const FREE_WEEKLY_LIMIT = 2;

// ============================================================================
// Types
// ============================================================================

interface LetterReply {
  id: string;
  guruId: string;
  message: string;
  sentAt: string;
  guruResponse?: string;
  guruResponseEn?: string;
  responded: boolean;
}

interface ReplyCount {
  count: number;
  weekStart: string; // ISO date of Monday
}

// ============================================================================
// Pre-written guru responses (deterministic, no AI)
// ============================================================================

const GURU_RESPONSES: Record<string, string[]> = {
  buffett: [
    '자네의 편지를 읽었네. 참 좋은 생각이야. 매일 조금씩 배우는 게 복리의 핵심이지.',
    '코카콜라 한 잔 마시면서 자네 편지를 읽었어. 인내심을 가지게. 좋은 일이 올 거야.',
    '자네 말에 공감하네. 시장은 인내심 없는 사람의 돈을 인내심 있는 사람에게 옮기는 장치야.',
  ],
  dalio: [
    '편지 감사합니다. 고통 + 반성 = 발전, 이 원칙을 기억하세요.',
    '좋은 질문이에요. 모든 것은 사이클로 움직입니다. 지금 어디에 있는지 생각해보세요.',
    '명상하며 당신의 편지를 생각했습니다. 감정과 판단을 분리하는 연습을 해보세요.',
  ],
  cathie_wood: [
    '와, 재밌는 생각이에요! 5년 뒤를 같이 상상해봐요!',
    '혁신은 항상 의심받아요. 하지만 결국 세상을 바꾸죠. 같이 미래를 봐요!',
    '편지 고마워요! 지수함수적 성장이 뭔지 아시죠? 지금 우리가 그 시작점에 있어요.',
  ],
  druckenmiller: [
    '추세를 읽는 감각이 생기고 있군. 계속 관찰해.',
    '큰 그림을 봐. 작은 것에 매몰되지 마.',
    '편지 잘 받았어. 확신이 있으면 크게 베팅하되, 틀리면 바로 손절해.',
  ],
  saylor: [
    'ㅋㅋ 편지 잘 받았어! 비트코인 샀어? 아직이면 늦지 않았어!',
    'HODL! 디지털 에너지의 미래를 같이 만들어가자!',
    '비트코인은 2100만 개뿐이야. 시간은 우리 편이야. 존버!',
  ],
  dimon: [
    '기본에 충실한 편지를 보내주셨군요. 리스크 관리를 잊지 마세요.',
    '좋은 의견입니다. 분산 투자와 위기 관리 매뉴얼을 준비하세요.',
    '당신의 포트폴리오는 당신이 이끄는 회사입니다. 책임감을 가지세요.',
  ],
  musk: [
    'ㅋㅋㅋ 재밌는 편지! 화성 티켓 예약해놨어. 아마도. 어쩌면.',
    '불가능이라고? 그냥 하면 되는데? SpaceX도 다들 안 된다고 했잖아.',
    '밈의 힘을 과소평가하지 마. 아이디어가 퍼지는 속도가 가치를 만들어.',
  ],
  lynch: [
    '오늘 마트에서 뭐 봤어? 그게 투자 아이디어야!',
    '같이 마트 갈 친구가 생겨서 기뻐! 일상에서 종목을 찾아봐.',
    '10배 주식은 모두가 무시하는 곳에 있어. 눈을 크게 떠!',
  ],
  marks: [
    '2차적 사고를 하고 있군요. 좋은 방향입니다.',
    '사이클을 기억하세요. 영원한 것은 없습니다.',
    '리스크가 없다고 느껴지는 순간이 가장 위험합니다. 경계를 늦추지 마세요.',
  ],
  rogers: [
    '세계를 넓게 봐! 한 곳에만 있으면 안 보이는 것들이 있어.',
    '오토바이 타고 86개국 돌면서 배웠지. 길이 험할수록 보물이 크다!',
    '원자재를 봐. 구리 가격이 오르면 경기 회복 신호야.',
  ],
};

// ============================================================================
// Public API
// ============================================================================

/**
 * 구루에게 답장 보내기
 */
export async function sendReply(guruId: string, message: string): Promise<void> {
  try {
    const replies = await loadReplies();
    const newReply: LetterReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      guruId,
      message,
      sentAt: new Date().toISOString(),
      responded: false,
    };
    replies.push(newReply);
    await saveReplies(replies);
    await incrementReplyCount();
  } catch {
    // Best effort
  }
}

/**
 * 미응답 답장 목록
 */
export async function getPendingReplies(): Promise<LetterReply[]> {
  try {
    const replies = await loadReplies();
    return replies.filter(r => !r.responded);
  } catch {
    return [];
  }
}

/**
 * 구루 응답 생성 (사전작성된 응답 반환, deterministic)
 */
export function getGuruResponse(
  guruId: string,
  _originalMessage: string,
): { response: string; responseEn: string } {
  const responses = GURU_RESPONSES[guruId] || GURU_RESPONSES.buffett;
  // Deterministic selection based on message length
  const index = _originalMessage.length % responses.length;
  const response = responses[index];
  const config = GURU_CHARACTER_CONFIGS[guruId];
  const guruName = config?.guruNameEn || guruId;
  return {
    response,
    responseEn: `[${guruName}] Thank you for your letter. Keep learning every day!`,
  };
}

/**
 * 이번 주 남은 무료 답장 횟수
 */
export async function getRemainingReplies(isPremium: boolean): Promise<number> {
  if (isPremium) return 999;
  try {
    const count = await loadReplyCount();
    return Math.max(0, FREE_WEEKLY_LIMIT - count.count);
  } catch {
    return FREE_WEEKLY_LIMIT;
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

async function loadReplies(): Promise<LetterReply[]> {
  try {
    const raw = await AsyncStorage.getItem(REPLIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveReplies(replies: LetterReply[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REPLIES_KEY, JSON.stringify(replies));
  } catch {
    // ignore
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

async function loadReplyCount(): Promise<ReplyCount> {
  try {
    const raw = await AsyncStorage.getItem(REPLY_COUNT_KEY);
    if (!raw) return { count: 0, weekStart: getWeekStart() };
    const data = JSON.parse(raw) as ReplyCount;
    // Reset if new week
    if (data.weekStart !== getWeekStart()) {
      return { count: 0, weekStart: getWeekStart() };
    }
    return data;
  } catch {
    return { count: 0, weekStart: getWeekStart() };
  }
}

async function incrementReplyCount(): Promise<void> {
  try {
    const current = await loadReplyCount();
    const updated: ReplyCount = {
      count: current.count + 1,
      weekStart: getWeekStart(),
    };
    await AsyncStorage.setItem(REPLY_COUNT_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
