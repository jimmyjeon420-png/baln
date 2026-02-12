/**
 * quizService.ts - 일일 투자 퀴즈 서비스
 *
 * 역할: "퀴즈 출제 부서"
 * - 오늘의 퀴즈 조회 (DB 우선 → Gemini 생성 폴백)
 * - 퀴즈 답안 제출 (submit_quiz_answer RPC)
 * - 내 퀴즈 기록 조회
 *
 * Central Kitchen 패턴:
 * 1. DB에서 오늘 퀴즈 조회 (< 100ms)
 * 2. 없으면 → Gemini로 생성 → insert_daily_quiz RPC로 저장
 * 3. 첫 유저가 생성, 이후 유저는 DB 캐시 사용
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from './supabase';
import type { DailyQuiz, QuizAttempt, SubmitQuizResult, QuizCategory } from '../types/quiz';

// ⚠️ 보안: EXPO_PUBLIC_ 키는 클라이언트 번들에 포함됩니다. 프로덕션에서는 서버 프록시 권장.
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';

// ============================================================================
// 오늘의 퀴즈 조회
// ============================================================================

/** 오늘 날짜 키 (YYYY-MM-DD) */
function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 오늘의 퀴즈 조회 (DB 우선 → Gemini 생성 → 폴백) */
export async function getTodayQuiz(): Promise<DailyQuiz | null> {
  const today = getTodayDate();

  // 1단계: DB에서 오늘 퀴즈 조회
  try {
    const { data, error } = await supabase
      .from('daily_quizzes')
      .select('*')
      .eq('quiz_date', today)
      .single();

    if (data && !error) {
      return data as DailyQuiz;
    }
  } catch (dbErr) {
    console.warn('[Quiz] DB 조회 실패 (테이블 미존재 가능):', dbErr);
  }

  // 2단계: Gemini 또는 폴백으로 퀴즈 생성
  const generated = await generateQuizWithGemini();
  if (!generated) return null;

  // 3단계: DB 저장 시도 (실패해도 퀴즈는 반환)
  try {
    const { data: insertResult } = await supabase.rpc('insert_daily_quiz', {
      p_quiz_date: today,
      p_category: generated.category,
      p_question: generated.question,
      p_options: generated.options,
      p_correct_option: generated.correct_option,
      p_explanation: generated.explanation,
      p_difficulty: generated.difficulty,
    });

    // 저장 성공 → DB에서 다시 조회 (id 포함)
    const { data: saved } = await supabase
      .from('daily_quizzes')
      .select('*')
      .eq('quiz_date', today)
      .single();

    if (saved) return saved as DailyQuiz;
  } catch (saveErr) {
    console.warn('[Quiz] DB 저장 실패 (RPC 미존재 가능), 로컬 퀴즈로 진행:', saveErr);
  }

  // 4단계: DB 저장 실패해도 로컬 퀴즈 반환 (표시는 가능, 제출은 불가)
  return {
    id: -1,
    quiz_date: today,
    category: generated.category,
    question: generated.question,
    options: generated.options,
    correct_option: generated.correct_option,
    explanation: generated.explanation,
    difficulty: generated.difficulty,
    created_at: new Date().toISOString(),
  } as DailyQuiz;
}

// ============================================================================
// Gemini 퀴즈 생성
// ============================================================================

/** 카테고리 랜덤 선택 */
function getRandomCategory(): QuizCategory {
  const categories: QuizCategory[] = ['stock_basics', 'market_news', 'investing_terms', 'risk_management'];
  return categories[Math.floor(Math.random() * categories.length)];
}

const CATEGORY_LABEL: Record<QuizCategory, string> = {
  stock_basics: '주식 기초',
  market_news: '시장/경제 뉴스',
  investing_terms: '투자 용어',
  risk_management: '리스크 관리',
};

/** Gemini로 퀴즈 1개 생성 */
async function generateQuizWithGemini(): Promise<{
  category: QuizCategory;
  question: string;
  options: { id: string; text: string }[];
  correct_option: string;
  explanation: string;
  difficulty: number;
} | null> {
  if (!API_KEY) {
    console.warn('[Quiz] Gemini API 키 없음 → 폴백 퀴즈 사용');
    return getFallbackQuiz();
  }

  const category = getRandomCategory();
  const categoryLabel = CATEGORY_LABEL[category];

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `당신은 한국 투자 교육 전문가입니다. "${categoryLabel}" 카테고리의 4지선다 퀴즈를 1개 만들어주세요.

요구사항:
- 한국어로 작성
- 초~중급 투자자 대상
- 실용적이고 재미있는 문제
- 오늘 날짜: ${getTodayDate()}

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "question": "질문 내용",
  "options": [
    {"id": "A", "text": "선택지 A"},
    {"id": "B", "text": "선택지 B"},
    {"id": "C", "text": "선택지 C"},
    {"id": "D", "text": "선택지 D"}
  ],
  "correct_option": "A",
  "explanation": "정답 해설 (2-3문장)",
  "difficulty": 1
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON 파싱 (```json 래핑 제거 + 안전한 JSON 추출)
    let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // Gemini가 가끔 JSON 앞뒤에 불필요한 텍스트를 붙이는 경우 대비
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const parsed = JSON.parse(jsonStr);

    return {
      category,
      question: parsed.question,
      options: parsed.options,
      correct_option: parsed.correct_option,
      explanation: parsed.explanation,
      difficulty: parsed.difficulty || 1,
    };
  } catch (err) {
    console.error('[Quiz] Gemini 퀴즈 생성 실패:', err);
    return getFallbackQuiz();
  }
}

// ============================================================================
// 폴백 퀴즈 (Gemini 사용 불가 시)
// ============================================================================

/** 내장 폴백 퀴즈 풀 */
const FALLBACK_QUIZZES = [
  {
    category: 'stock_basics' as QuizCategory,
    question: 'PER(주가수익비율)이 낮을수록 의미하는 것은?',
    options: [
      { id: 'A', text: '주가가 이익 대비 저평가되어 있다' },
      { id: 'B', text: '회사의 부채비율이 높다' },
      { id: 'C', text: '배당수익률이 높다' },
      { id: 'D', text: '매출 성장률이 빠르다' },
    ],
    correct_option: 'A',
    explanation: 'PER(Price-to-Earnings Ratio)은 주가를 주당순이익(EPS)으로 나눈 것입니다. PER이 낮으면 이익 대비 주가가 싸다는 의미로, 상대적 저평가 상태를 나타냅니다.',
    difficulty: 1,
  },
  {
    category: 'investing_terms' as QuizCategory,
    question: '분산투자의 주된 목적은?',
    options: [
      { id: 'A', text: '수익률을 극대화하기 위해' },
      { id: 'B', text: '포트폴리오 위험을 줄이기 위해' },
      { id: 'C', text: '세금을 절감하기 위해' },
      { id: 'D', text: '거래 수수료를 절약하기 위해' },
    ],
    correct_option: 'B',
    explanation: '분산투자는 여러 자산에 나눠 투자하여 특정 자산의 하락이 전체 포트폴리오에 미치는 영향을 줄이는 것이 주된 목적입니다. "달걀을 한 바구니에 담지 마라"는 투자 격언과 같은 맥락입니다.',
    difficulty: 1,
  },
  {
    category: 'risk_management' as QuizCategory,
    question: '주식시장에서 "손절매"란?',
    options: [
      { id: 'A', text: '이익이 난 주식을 파는 것' },
      { id: 'B', text: '손실이 커지기 전에 주식을 파는 것' },
      { id: 'C', text: '주식을 추가로 매수하는 것' },
      { id: 'D', text: '배당금을 재투자하는 것' },
    ],
    correct_option: 'B',
    explanation: '손절매(Stop-Loss)는 주가가 일정 수준 이하로 하락했을 때 더 큰 손실을 방지하기 위해 보유 주식을 매도하는 것입니다. 리스크 관리의 핵심 전략 중 하나입니다.',
    difficulty: 1,
  },
  {
    category: 'market_news' as QuizCategory,
    question: '기준금리를 인하하면 일반적으로 주식시장에 어떤 영향을 미칠까요?',
    options: [
      { id: 'A', text: '주식시장에 긍정적 (상승 요인)' },
      { id: 'B', text: '주식시장에 부정적 (하락 요인)' },
      { id: 'C', text: '주식시장과 무관하다' },
      { id: 'D', text: '채권시장에만 영향을 미친다' },
    ],
    correct_option: 'A',
    explanation: '기준금리 인하는 기업의 차입 비용을 줄이고, 은행 예금 대비 주식의 상대적 매력도를 높여 일반적으로 주식시장에 긍정적인 영향을 미칩니다.',
    difficulty: 1,
  },
  {
    category: 'stock_basics' as QuizCategory,
    question: '시가총액이란?',
    options: [
      { id: 'A', text: '회사의 총 부채 금액' },
      { id: 'B', text: '주가 × 발행주식 총수' },
      { id: 'C', text: '연간 매출액의 합계' },
      { id: 'D', text: '회사의 순자산 가치' },
    ],
    correct_option: 'B',
    explanation: '시가총액(Market Capitalization)은 현재 주가에 발행주식 총수를 곱한 값으로, 시장이 평가하는 기업의 전체 가치를 나타냅니다.',
    difficulty: 1,
  },
  {
    category: 'investing_terms' as QuizCategory,
    question: 'ETF(상장지수펀드)의 장점이 아닌 것은?',
    options: [
      { id: 'A', text: '분산투자가 쉽다' },
      { id: 'B', text: '실시간 매매가 가능하다' },
      { id: 'C', text: '원금이 보장된다' },
      { id: 'D', text: '운용보수가 비교적 낮다' },
    ],
    correct_option: 'C',
    explanation: 'ETF는 분산투자, 실시간 거래, 낮은 보수 등 장점이 있지만, 주식처럼 가격이 변동하므로 원금이 보장되지 않습니다. 모든 투자 상품에는 원금 손실 위험이 있습니다.',
    difficulty: 1,
  },
  {
    category: 'risk_management' as QuizCategory,
    question: '다음 중 "체계적 위험(시장 위험)"에 해당하는 것은?',
    options: [
      { id: 'A', text: '특정 기업의 CEO 사임' },
      { id: 'B', text: '글로벌 금융 위기' },
      { id: 'C', text: '제품 리콜 사태' },
      { id: 'D', text: '회계 부정 스캔들' },
    ],
    correct_option: 'B',
    explanation: '체계적 위험은 시장 전체에 영향을 미치는 위험으로, 분산투자로도 제거할 수 없습니다. 금융 위기, 전쟁, 팬데믹 등이 해당합니다. 나머지는 개별 기업의 비체계적 위험입니다.',
    difficulty: 2,
  },
];

/** 오늘 날짜 기반 폴백 퀴즈 선택 */
function getFallbackQuiz() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % FALLBACK_QUIZZES.length;
  return FALLBACK_QUIZZES[index];
}

// ============================================================================
// 답안 제출
// ============================================================================

/** 퀴즈 답안 제출 (submit_quiz_answer RPC) */
export async function submitQuizAnswer(quizId: number, selectedOption: string): Promise<SubmitQuizResult> {
  const { data, error } = await supabase.rpc('submit_quiz_answer', {
    p_quiz_id: quizId,
    p_selected: selectedOption,
  });

  if (error) {
    console.error('[Quiz] 답안 제출 실패:', error);
    return { success: false, reason: error.message };
  }

  return data as SubmitQuizResult;
}

// ============================================================================
// 내 퀴즈 기록 조회
// ============================================================================

/** 오늘 퀴즈 답안 조회 (이미 풀었는지 확인) */
export async function getMyTodayAttempt(quizId: number): Promise<QuizAttempt | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .single();

  if (error || !data) return null;
  return data as QuizAttempt;
}

/** 내 퀴즈 통계 */
export async function getMyQuizStats(): Promise<{
  total: number;
  correct: number;
  streak: number;
  accuracy: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, correct: 0, streak: 0, accuracy: 0 };

  const { data } = await supabase
    .from('user_investor_levels')
    .select('total_quizzes_attempted, total_quizzes_correct, quiz_streak')
    .eq('user_id', user.id)
    .single();

  if (!data) return { total: 0, correct: 0, streak: 0, accuracy: 0 };

  const total = data.total_quizzes_attempted || 0;
  const correct = data.total_quizzes_correct || 0;

  return {
    total,
    correct,
    streak: data.quiz_streak || 0,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}
