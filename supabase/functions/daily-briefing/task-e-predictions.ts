// @ts-nocheck
// ============================================================================
// Task E-1: 예측 질문 생성 (Prediction Question Generation)
// MAU 성장을 위한 게임형 인게이지먼트 — 습관 루프의 핵심
//
// [습관 루프]
// 맥락 카드 읽기 → 예측 투표 → 복기 & 정답 확인 → 크레딧 보상 → 패닉셀 방지
//
// [목표]
// - Gemini + Google Search로 오늘의 예측 질문 3개 생성
// - 카테고리 자동 배분 (stocks 1개, crypto 1개, macro/event 1개)
// - 24~48시간 내 결과 확인 가능한 단기 예측
// - prediction_polls 테이블 INSERT
// ============================================================================

import {
  supabase,
  callGeminiWithSearch,
  cleanJsonResponse,
  logTaskResult,
} from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

export interface PredictionQuestion {
  question: string;
  description: string;
  category: string;
  yes_label: string;
  no_label: string;
  deadline_hours: number;  // 마감까지 시간
  difficulty?: string;     // easy / medium / hard
  context_hint?: string;   // 복기 시 보여줄 맥락 힌트
  related_ticker?: string; // 관련 종목 티커
  up_reason?: string;      // [NEW] 오를 근거 (뉴스 기반)
  down_reason?: string;    // [NEW] 내릴 근거 (뉴스 기반)
}

export interface PredictionGenerationResult {
  created: number;
  skipped: boolean;
}

// ============================================================================
// E-1: 예측 질문 3개 생성
// ============================================================================

/**
 * Task E-1: 오늘의 예측 질문 3개 생성
 *
 * [카테고리 배분]
 * - stocks: 1개 (주식 시장 예측)
 * - crypto: 1개 (암호화폐 가격 예측)
 * - macro/event: 1개 (경제 지표, 정치 이벤트)
 *
 * [중복 방지]
 * - 오늘 이미 생성된 질문이 3개 이상 있으면 스킵
 * - created_at 기준으로 판단 (UTC 기준 오늘)
 *
 * [질문 규칙]
 * 1. YES/NO로 명확히 답할 수 있는 질문만
 * 2. 24~48시간 내 결과 확인 가능
 * 3. 구체적 수치/기준 포함 (예: "나스닥 1% 이상 상승")
 * 4. 한국어로 작성
 *
 * [Gemini Prompt]
 * - Google Search로 최신 시장 뉴스 검색
 * - 실시간 데이터 기반 질문 생성
 * - JSON 형식으로 반환
 *
 * @returns { created, skipped }
 */
export async function generatePredictionPolls(): Promise<PredictionGenerationResult> {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 중복 생성 방지: 오늘 이미 생성된 투표 확인
    const { data: existing } = await supabase
      .from('prediction_polls')
      .select('id')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);

    if (existing && existing.length >= 3) {
      console.log(`[Task E-1] 오늘(${today}) 이미 ${existing.length}개 질문 존재 — 스킵`);
      const elapsed = Date.now() - startTime;
      await logTaskResult('predictions', 'SKIPPED', elapsed, { existing: existing.length });
      return { created: 0, skipped: true };
    }

  const todayDate = new Date();
  const dateStr = `${todayDate.getFullYear()}년 ${todayDate.getMonth() + 1}월 ${todayDate.getDate()}일`;
  const todayISO = todayDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const prompt = `당신은 baln(발른) 앱의 예측 게임 AI입니다.
**오늘 날짜: ${dateStr} (${todayISO})**

투자 예측 질문 3개를 생성하세요.

[핵심 원칙]
- 초보 투자자도 재미있게 참여할 수 있는 질문을 만든다.
- YES/NO로 명확히 답할 수 있어야 한다 (애매한 질문 금지).
- 24~48시간 내 객관적으로 결과를 확인할 수 있어야 한다.
- 한국어로 자연스럽게 작성한다.

[CRITICAL - Google Search 필수]
다음 검색어로 **오늘(${todayISO})의 실시간 시장 데이터를 반드시 검색**하세요:
- "KOSPI 200 price ${todayISO}" (한국 주식)
- "S&P 500 current price" (미국 주식)
- "Bitcoin price today" (암호화폐)
- "USD KRW exchange rate" (환율)

**주의**: 과거 데이터(1주일 전 등)를 사용하면 안 됩니다. 반드시 최신 종가를 확인하세요.
예시: 만약 코스피가 현재 2,600이라면, "2,500 돌파" 질문은 이미 의미가 없습니다. 현재 가격 기준으로 적절한 목표치를 설정하세요.

[질문 설계 규칙]
- 카테고리 배분: stocks 1개, crypto 1개, macro 1개
- 난이도 배분: easy 1개, medium 1개, hard 1개
- 구체적 수치/기준 포함 (예: "전일 대비 1% 이상 상승", "심리적 저항선 돌파")
- 맥락 힌트(context_hint): 결과 복기 시 학습이 되는 배경 설명 2~3문장
- up_reason / down_reason: 각각 뉴스 기반 근거 한 줄씩

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운, 코드블록 금지.]
{
  "questions": [
    {
      "question": "S&P 500이 오늘 전일 종가 대비 상승 마감할까요?",
      "description": "어제 고용지표 호조로 시장 낙관론 확산. CPI 발표를 앞두고 관망세도 있음.",
      "category": "stocks",
      "yes_label": "상승 마감",
      "no_label": "하락 마감",
      "deadline_hours": 24,
      "difficulty": "easy",
      "context_hint": "고용지표가 좋으면 단기적으로 주가 상승 요인이지만, 금리 인상 우려로 이어질 수 있어요. 이런 '좋은 뉴스가 나쁜 뉴스'인 역설이 최근 시장의 특징입니다.",
      "related_ticker": "SPY",
      "up_reason": "고용지표 호조로 경기 낙관론 확산 (Bloomberg)",
      "down_reason": "금리 인상 우려로 기술주 매도 압력 (WSJ)"
    },
    {
      "question": "비트코인이 내일까지 $105,000를 돌파할까요?",
      "description": "BTC ETF 순유입 3일 연속 증가. 기관 매수세 강화 흐름. (현재가: $102,340)",
      "category": "crypto",
      "yes_label": "돌파한다",
      "no_label": "못한다",
      "deadline_hours": 48,
      "difficulty": "medium",
      "context_hint": "ETF 유입은 기관 매수 신호이지만, 심리적 저항선에서는 차익 실현 매물이 나오기 쉬워요. 큰 숫자(10만 달러 같은) 앞에서 시장은 한 번 쉬어가는 경우가 많습니다.",
      "related_ticker": "BTC",
      "up_reason": "BTC ETF 3일 연속 순유입, 기관 매수세 (CoinDesk)",
      "down_reason": "심리적 저항선에서 차익 실현 우려 (Bloomberg)"
    },
    {
      "question": "이번 주 원/달러 환율이 1,350원 아래로 내려갈까요?",
      "description": "한은 개입 가능성과 달러 약세 흐름이 주목받는 상황. (현재: 1,372원)",
      "category": "macro",
      "yes_label": "내려간다",
      "no_label": "유지/상승",
      "deadline_hours": 48,
      "difficulty": "hard",
      "context_hint": "환율은 금리차, 경상수지, 자본흐름이 복합적으로 작용합니다. 한국 수출 호조는 원화 강세, 미국 고금리는 원화 약세 요인이에요.",
      "related_ticker": "KRW=X",
      "up_reason": "미 국채 금리 하락, 원화 강세 요인 (연합뉴스)",
      "down_reason": "무역 갈등 심화, 달러 수요 증가 (WSJ)"
    }
  ]
}

[CRITICAL] 위 예시는 구조 참고용입니다. 반드시:
1. Google Search로 **오늘(${todayISO})의 실시간 시장 데이터**를 검색
2. 현재 가격을 description에 명시 (예: "현재가: $102,340")
3. 현재 가격 대비 **의미 있는 목표치**를 질문에 사용
4. 질문 텍스트에 "오늘(${dateStr})" 같은 절대 날짜를 넣지 말 것 (상대 표현 사용: "오늘", "내일", "이번 주")
`;

  console.log('[Task E-1] 예측 질문 생성 시작...');
  let questions: PredictionQuestion[] = [];
  try {
    const responseText = await callGeminiWithSearch(prompt);
    const cleanJson = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleanJson);
    questions = parsed.questions || [];
  } catch (parseErr) {
    console.error('[Task E-1] Gemini 응답 파싱 실패 — 기본 질문 사용:', parseErr);
    questions = [
      {
        question: 'S&P 500이 오늘 전일 대비 상승 마감할까요?',
        description: '시장 데이터를 자동으로 불러오지 못해 기본 질문이 생성되었습니다.',
        category: 'stocks',
        yes_label: '상승 마감',
        no_label: '하락 마감',
        deadline_hours: 24,
        difficulty: 'easy',
        context_hint: '미국 증시는 장기적으로 우상향 추세를 보여왔습니다. 하루하루의 등락보다 큰 흐름을 보는 눈을 기르는 것이 중요해요.',
        related_ticker: 'SPY',
      },
    ];
  }

  if (!questions || questions.length === 0) {
    console.warn('[Task E-1] 생성된 질문이 0개 — 기본 질문으로 대체');
    questions = [
      {
        question: '나스닥이 오늘 전일 대비 상승 마감할까요?',
        description: '기본 질문입니다.',
        category: 'stocks',
        yes_label: '상승',
        no_label: '하락',
        deadline_hours: 24,
        difficulty: 'easy',
        related_ticker: 'QQQ',
      },
    ];
  }
  let created = 0;

  for (const q of questions.slice(0, 3)) {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + (q.deadline_hours || 24));

    const { error } = await supabase
      .from('prediction_polls')
      .insert({
        question: q.question,
        description: q.description || null,
        category: q.category || 'macro',
        yes_label: q.yes_label || '네',
        no_label: q.no_label || '아니오',
        deadline: deadline.toISOString(),
        status: 'active',
        reward_credits: 2,
        difficulty: q.difficulty || 'medium',
        context_hint: q.context_hint || null,
        related_ticker: q.related_ticker || null,
        up_reason: q.up_reason || null,
        down_reason: q.down_reason || null,
      });

    if (error) {
      console.error(`[Task E-1] 질문 삽입 실패:`, error);
    } else {
      created++;
    }
  }

  console.log(`[Task E-1] 예측 질문 ${created}개 생성 완료`);

  const elapsed = Date.now() - startTime;
  await logTaskResult('predictions', 'SUCCESS', elapsed, { created });

  return { created, skipped: false };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    await logTaskResult('predictions', 'FAILED', elapsed, null, error.message);
    throw error;
  }
}
