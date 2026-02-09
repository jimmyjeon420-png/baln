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
  const today = new Date().toISOString().split('T')[0];

  // 중복 생성 방지: 오늘 이미 생성된 투표 확인
  const { data: existing } = await supabase
    .from('prediction_polls')
    .select('id')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`);

  if (existing && existing.length >= 3) {
    console.log(`[Task E-1] 오늘(${today}) 이미 ${existing.length}개 질문 존재 — 스킵`);
    return { created: 0, skipped: true };
  }

  const todayDate = new Date();
  const dateStr = `${todayDate.getFullYear()}년 ${todayDate.getMonth() + 1}월 ${todayDate.getDate()}일`;

  const prompt = `
당신은 투자 예측 게임 MC입니다. 오늘(${dateStr}) 투자/경제 예측 질문 3개를 만드세요.

**[중요] Google Search로 최신 시장 뉴스를 검색하세요:**
- "stock market news today ${todayDate.getMonth() + 1}월"
- "cryptocurrency price today"
- "경제 뉴스 오늘 ${dateStr}"

**질문 규칙:**
1. YES/NO로 명확히 답할 수 있는 질문만 (애매한 질문 금지)
2. 24~48시간 내 결과 확인 가능한 단기 예측
3. 카테고리 배분: stocks 1개, crypto 1개, macro 또는 event 1개
4. 구체적 수치/기준 포함 (예: "나스닥이 오늘 종가 기준 1% 이상 상승할까?")
5. 한국어로 작성

**출력 형식 (JSON만, 마크다운 금지):**
{
  "questions": [
    {
      "question": "오늘 S&P 500이 전일 종가 대비 상승 마감할까요?",
      "description": "어제 미국 고용지표가 예상을 상회하며 시장 낙관론이 확산",
      "category": "stocks",
      "yes_label": "상승 마감",
      "no_label": "하락 마감",
      "deadline_hours": 24
    },
    {
      "question": "비트코인이 내일까지 $100,000를 돌파할까요?",
      "description": "BTC ETF 순유입이 3일 연속 증가하며 매수세 강화",
      "category": "crypto",
      "yes_label": "돌파한다",
      "no_label": "못한다",
      "deadline_hours": 48
    },
    {
      "question": "이번 주 원/달러 환율이 1,400원 아래로 내려갈까요?",
      "description": "한은 개입 가능성과 달러 약세 흐름 주목",
      "category": "macro",
      "yes_label": "내려간다",
      "no_label": "유지/상승",
      "deadline_hours": 48
    }
  ]
}
`;

  console.log('[Task E-1] 예측 질문 생성 시작...');
  const responseText = await callGeminiWithSearch(prompt);
  const cleanJson = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleanJson);

  const questions: PredictionQuestion[] = parsed.questions || [];
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
      });

    if (error) {
      console.error(`[Task E-1] 질문 삽입 실패:`, error);
    } else {
      created++;
    }
  }

  console.log(`[Task E-1] 예측 질문 ${created}개 생성 완료`);
  return { created, skipped: false };
}
