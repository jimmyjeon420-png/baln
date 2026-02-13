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
import supabase, { getCurrentUser } from './supabase';
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

    const prompt = `당신은 baln(발른) 앱의 투자 퀴즈 AI입니다.
"${categoryLabel}" 카테고리의 4지선다 퀴즈를 1개 만들어주세요.

[퀴즈 설계 원칙]
- 초보 투자자(20~30대, 투자 경험 1년 미만)도 풀 수 있는 수준으로 작성한다.
- 실생활에서 바로 쓸 수 있는 실용적 지식을 묻는다.
- 정답이 아닌 보기도 그럴듯해야 한다 (너무 뻔한 오답 금지).
- 하지만 보기끼리 너무 비슷하면 안 된다 (명확한 구분 필요).
- 해설은 "왜 정답인지"와 "왜 오답인지"를 모두 설명한다.
- 한국어로 자연스럽게 작성한다.
- 오늘 날짜: ${getTodayDate()}

[난이도 기준]
- difficulty 1 (쉬움): 기본 용어, 상식 수준. 투자 입문자도 맞힐 수 있음.
- difficulty 2 (보통): 약간의 배경지식 필요. 뉴스를 가끔 보는 사람이 맞힐 수 있음.
- difficulty 3 (어려움): 전문 지식 필요. 투자 경험자도 고민이 필요한 수준.

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운, 코드블록 금지.]
{
  "question": "질문 내용 (한 줄, 명확하게)",
  "options": [
    {"id": "A", "text": "선택지 A"},
    {"id": "B", "text": "선택지 B"},
    {"id": "C", "text": "선택지 C"},
    {"id": "D", "text": "선택지 D"}
  ],
  "correct_option": "A",
  "explanation": "정답 해설 2~3문장. 정답인 이유와 오답인 이유를 모두 간단히 설명.",
  "difficulty": 1
}

[좋은 퀴즈 예시]
{
  "question": "주식시장에서 '시가총액'이란 무엇인가요?",
  "options": [
    {"id": "A", "text": "회사의 총 매출액"},
    {"id": "B", "text": "주가 x 발행주식 총수"},
    {"id": "C", "text": "회사가 보유한 현금"},
    {"id": "D", "text": "회사의 순이익 합계"}
  ],
  "correct_option": "B",
  "explanation": "시가총액은 현재 주가에 발행주식 총수를 곱한 값으로, 시장이 평가하는 기업의 전체 가치입니다. 매출액(A)이나 순이익(D)은 손익계산서 항목이고, 보유 현금(C)은 재무상태표 항목이므로 시가총액과 다릅니다.",
  "difficulty": 1
}`;

    // ★ 30초 타임아웃 — Gemini 무한 대기 방지
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const result = await model.generateContent(prompt, { signal: controller.signal });
    clearTimeout(timer);
    const text = result.response.text().trim();

    // JSON 파싱 (```json 래핑 제거 + 안전한 JSON 추출)
    let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // Gemini가 가끔 JSON 앞뒤에 불필요한 텍스트를 붙이는 경우 대비
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const parsed = JSON.parse(jsonStr);

    // 필수 필드 검증
    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4 || !parsed.correct_option) {
      console.warn('[Quiz] Gemini 응답 필수 필드 누락 — 폴백 사용');
      return getFallbackQuiz();
    }

    // correct_option 유효성 검증 (A, B, C, D 중 하나)
    const validOptions = ['A', 'B', 'C', 'D'];
    if (!validOptions.includes(parsed.correct_option)) {
      console.warn(`[Quiz] 잘못된 correct_option: ${parsed.correct_option} — 폴백 사용`);
      return getFallbackQuiz();
    }

    return {
      category,
      question: parsed.question,
      options: parsed.options,
      correct_option: parsed.correct_option,
      explanation: parsed.explanation || '해설을 불러오지 못했습니다.',
      difficulty: [1, 2, 3].includes(parsed.difficulty) ? parsed.difficulty : 1,
    };
  } catch (err) {
    console.error('[Quiz] Gemini 퀴즈 생성 실패:', err);
    return getFallbackQuiz();
  }
}

// ============================================================================
// 폴백 퀴즈 (Gemini 사용 불가 시)
// ============================================================================

/**
 * 내장 폴백 퀴즈 풀 (18개)
 * - Easy (difficulty: 1) — 6문제: 기초 용어/개념
 * - Medium (difficulty: 2) — 6문제: 투자 전략/분석
 * - Hard (difficulty: 3) — 6문제: 고급 거시경제/파생상품/퀀트
 * - 날짜 기반으로 해당일 난이도의 퀴즈 1개를 선택 (getDailyFallbackQuiz)
 */
const FALLBACK_QUIZZES = [
  // ══════════════════════════════════════════════════════════════
  // Easy (difficulty: 1) — 기초 용어/개념 (6문제)
  // ══════════════════════════════════════════════════════════════
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
    category: 'stock_basics' as QuizCategory,
    question: '시가총액이란?',
    options: [
      { id: 'A', text: '회사의 총 부채 금액' },
      { id: 'B', text: '주가 x 발행주식 총수' },
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

  // ══════════════════════════════════════════════════════════════
  // Medium (difficulty: 2) — 투자 전략/분석 (6문제)
  // ══════════════════════════════════════════════════════════════
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
  {
    category: 'stock_basics' as QuizCategory,
    question: 'PBR(주가순자산비율)이 1 미만이면 의미하는 것은?',
    options: [
      { id: 'A', text: '주가가 순자산 가치보다 낮게 거래되고 있다' },
      { id: 'B', text: '회사의 부채가 자본보다 많다' },
      { id: 'C', text: '배당금을 지급하지 않는 기업이다' },
      { id: 'D', text: '매출이 감소하고 있다' },
    ],
    correct_option: 'A',
    explanation: 'PBR(Price-to-Book Ratio)은 주가를 주당 순자산가치(BPS)로 나눈 비율입니다. PBR < 1이면 시장이 기업을 청산 가치보다 낮게 평가한다는 의미로, 저평가 또는 시장의 비관적 전망을 나타낼 수 있습니다.',
    difficulty: 2,
  },
  {
    category: 'investing_terms' as QuizCategory,
    question: '샤프 비율(Sharpe Ratio)이 높을수록 의미하는 것은?',
    options: [
      { id: 'A', text: '위험 대비 초과 수익이 크다' },
      { id: 'B', text: '변동성이 크다' },
      { id: 'C', text: '절대 수익률이 높다' },
      { id: 'D', text: '거래량이 많다' },
    ],
    correct_option: 'A',
    explanation: '샤프 비율은 (포트폴리오 수익률 - 무위험 수익률) / 표준편차로 계산합니다. 같은 위험을 감수하면서 더 높은 초과 수익을 내는 투자가 효율적이라는 뜻이며, 펀드 성과 비교의 핵심 지표입니다.',
    difficulty: 2,
  },
  {
    category: 'market_news' as QuizCategory,
    question: '미국 고용보고서에서 비농업 고용(Non-Farm Payrolls)이 예상보다 강하면 일반적으로?',
    options: [
      { id: 'A', text: '금리 인하 기대가 후퇴하여 주식에 부정적' },
      { id: 'B', text: '경기 호조로 주식에 무조건 긍정적' },
      { id: 'C', text: '달러가 약세로 전환된다' },
      { id: 'D', text: '채권 가격이 상승한다' },
    ],
    correct_option: 'A',
    explanation: '강한 고용은 경기 과열 → 인플레이션 지속 → 연준 금리 인하 지연으로 해석됩니다. "좋은 뉴스가 나쁜 뉴스"인 역설적 상황이 현재 시장의 특징입니다. 달러는 강세, 채권은 하락 압력을 받습니다.',
    difficulty: 2,
  },
  {
    category: 'risk_management' as QuizCategory,
    question: '리밸런싱(Rebalancing)의 가장 중요한 목적은?',
    options: [
      { id: 'A', text: '수익률이 높은 자산에 더 집중 투자하기 위해' },
      { id: 'B', text: '원래 설정한 자산 배분 비율을 유지하기 위해' },
      { id: 'C', text: '세금을 줄이기 위해' },
      { id: 'D', text: '거래 비용을 줄이기 위해' },
    ],
    correct_option: 'B',
    explanation: '리밸런싱은 시장 변동으로 변한 자산 비율을 원래 목표 비율로 되돌리는 것입니다. 자연스럽게 "고평가 자산 매도, 저평가 자산 매수" 효과가 있어 장기적으로 위험 대비 수익률을 개선합니다.',
    difficulty: 2,
  },
  {
    category: 'investing_terms' as QuizCategory,
    question: '"밸류 트랩(Value Trap)"이란?',
    options: [
      { id: 'A', text: '가치주가 시장 대비 초과 수익을 내는 현상' },
      { id: 'B', text: '저평가로 보이지만 실제로는 합당한 이유가 있어 회복하지 못하는 종목' },
      { id: 'C', text: '고평가 성장주가 계속 상승하는 현상' },
      { id: 'D', text: '배당수익률이 높아 매력적으로 보이는 우량주' },
    ],
    correct_option: 'B',
    explanation: '밸류 트랩은 PER, PBR 등이 낮아 저평가처럼 보이지만, 구조적 문제(사양 산업, 경영 리스크)로 주가가 회복되지 않는 종목입니다. 저평가 지표만 보고 투자하면 빠지기 쉬운 함정입니다.',
    difficulty: 2,
  },

  // ══════════════════════════════════════════════════════════════
  // Hard (difficulty: 3) — 고급 거시경제/파생상품/퀀트 (6문제)
  // ══════════════════════════════════════════════════════════════
  {
    category: 'risk_management' as QuizCategory,
    question: '듀레이션(Duration)이 긴 채권의 금리 상승 시 특성은?',
    options: [
      { id: 'A', text: '가격 하락폭이 크다' },
      { id: 'B', text: '가격 변동이 거의 없다' },
      { id: 'C', text: '이자 수익이 증가한다' },
      { id: 'D', text: '만기가 짧아진다' },
    ],
    correct_option: 'A',
    explanation: '듀레이션은 금리 변동에 대한 채권 가격 민감도를 나타냅니다. 듀레이션이 10년이면 금리 1%p 상승 시 채권 가격은 약 10% 하락합니다. 장기채일수록 듀레이션이 길어 금리 리스크가 큽니다.',
    difficulty: 3,
  },
  {
    category: 'market_news' as QuizCategory,
    question: 'VIX 지수가 30을 넘을 때 역사적으로 가장 효과적이었던 전략은?',
    options: [
      { id: 'A', text: '전량 매도 후 현금 보유' },
      { id: 'B', text: '변동성이 높을 때 분할 매수 (공포에 매수)' },
      { id: 'C', text: '레버리지 ETF로 추세 추종' },
      { id: 'D', text: '금만 매수' },
    ],
    correct_option: 'B',
    explanation: 'VIX 30 이상은 극도의 공포 구간입니다. 역사적으로 VIX 30+ 시점에 S&P 500을 매수하면 12개월 후 평균 +20% 이상 수익을 기록했습니다. "남들이 두려워할 때 탐욕적이 되라"는 워렌 버핏의 원칙이 데이터로 증명됩니다.',
    difficulty: 3,
  },
  {
    category: 'market_news' as QuizCategory,
    question: '역이율드커브(Inverted Yield Curve)가 발생한 후 평균적으로 경기침체까지 걸리는 기간은?',
    options: [
      { id: 'A', text: '약 1~3개월' },
      { id: 'B', text: '약 6~18개월' },
      { id: 'C', text: '약 3~5년' },
      { id: 'D', text: '경기침체와 무관하다' },
    ],
    correct_option: 'B',
    explanation: '역이율드커브(장단기 금리 역전)는 경기침체의 가장 신뢰도 높은 선행지표입니다. 1960년 이후 8번의 경기침체 중 7번을 사전에 예고했으며, 역전 후 평균 12~18개월 뒤 침체가 시작되었습니다. 단, 타이밍이 부정확할 수 있어 즉각적 매도 신호는 아닙니다.',
    difficulty: 3,
  },
  {
    category: 'investing_terms' as QuizCategory,
    question: '옵션에서 "내재변동성(Implied Volatility)"이 급등하면 의미하는 것은?',
    options: [
      { id: 'A', text: '시장 참여자들이 향후 큰 가격 변동을 예상한다' },
      { id: 'B', text: '기초자산 가격이 반드시 하락한다' },
      { id: 'C', text: '옵션 매도가 유리하다' },
      { id: 'D', text: '거래량이 감소한다' },
    ],
    correct_option: 'A',
    explanation: '내재변동성은 옵션 가격에 반영된 시장의 미래 변동성 기대치입니다. IV 급등은 불확실성 증가를 의미하며, 옵션 프리미엄이 비싸집니다. VIX도 S&P 500 옵션의 내재변동성으로 계산되며, 공포지수로 불립니다.',
    difficulty: 3,
  },
  {
    category: 'stock_basics' as QuizCategory,
    question: 'ROE(자기자본이익률)가 15%이고 배당성향이 40%일 때, 지속가능 성장률(Sustainable Growth Rate)은?',
    options: [
      { id: 'A', text: '6%' },
      { id: 'B', text: '9%' },
      { id: 'C', text: '15%' },
      { id: 'D', text: '21%' },
    ],
    correct_option: 'B',
    explanation: '지속가능 성장률 = ROE x (1 - 배당성향) = 15% x (1 - 0.4) = 15% x 0.6 = 9%. 기업이 외부 자금 조달 없이 내부 유보금만으로 달성 가능한 성장률입니다. 이 수치를 초과하는 성장은 부채 증가나 유상증자가 필요합니다.',
    difficulty: 3,
  },
  {
    category: 'risk_management' as QuizCategory,
    question: '포트폴리오의 99% VaR(Value at Risk)가 -5%라면 의미하는 것은?',
    options: [
      { id: 'A', text: '99%의 확률로 최대 손실이 5%를 넘지 않는다' },
      { id: 'B', text: '매일 5%씩 손실이 발생한다' },
      { id: 'C', text: '1년에 5% 이상 하락할 확률이 99%다' },
      { id: 'D', text: '최대 손실이 5%로 제한된다' },
    ],
    correct_option: 'A',
    explanation: 'VaR는 주어진 신뢰수준(여기서 99%)에서 특정 기간 동안 발생할 수 있는 최대 예상 손실입니다. 99% VaR -5%는 "100거래일 중 99일은 손실이 5% 이내"라는 뜻입니다. 다만 나머지 1%의 꼬리 위험(Tail Risk)은 훨씬 클 수 있어 CVaR로 보완합니다.',
    difficulty: 3,
  },
];

/**
 * 오늘 날짜 기반 폴백 퀴즈 선택
 * - 날짜(1~31)를 3으로 나눈 나머지로 난이도 결정: 0→Easy, 1→Medium, 2→Hard
 * - 해당 난이도 퀴즈 중에서 날짜 기반으로 1개 선택
 * - 같은 날에는 항상 같은 퀴즈가 선택됨 (일관성)
 */
function getFallbackQuiz() {
  const today = new Date();
  const dayOfMonth = today.getDate(); // 1~31

  // 난이도 순환: 1일→Easy, 2일→Medium, 3일→Hard, 4일→Easy, ...
  const difficulties = [1, 2, 3];
  const todayDifficulty = difficulties[(dayOfMonth - 1) % 3];

  // 해당 난이도 퀴즈 필터링
  const filtered = FALLBACK_QUIZZES.filter(q => q.difficulty === todayDifficulty);

  // 날짜 기반으로 퀴즈 선택 (연중 일수를 시드로 활용)
  const dayOfYear = Math.floor(
    (Date.now() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % filtered.length;

  return filtered[index];
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
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
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
